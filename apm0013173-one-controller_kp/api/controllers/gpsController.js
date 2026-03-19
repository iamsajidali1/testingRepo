/* eslint-disable max-len, max-lines-per-function, no-magic-numbers, max-statements, max-lines */
const axios = require("axios");
const btoa = require("btoa");
const sqlString = require('sqlstring');
const { HttpsProxyAgent } = require("https-proxy-agent");
const { CONFIG } = require("../config/configuration");
const { getLogger } = require("../../utils/logging");
const { executeQueryInEdf } = require("./cacheDevicesController");
const { bizApiGwProd, proxyAttPxy } = require("../constants");
const { ok, created, internalServerError, noContent } = require("../statuses");
const { "stringify": str } = JSON;

const proxyServer = process.env.http_proxy || proxyAttPxy;

/**
 * To get the CR Web Id that users saves againsts Company
 * @param {*} companyName
 * @returns crWebId in string
 */
const getCrWebId = async (companyName) => {
    const { ormUrl } = CONFIG;
    const log = getLogger();
    const queryString = new URLSearchParams({ "name": companyName }).toString();
    const resp = await axios.get(`${ormUrl}/api/customers/?${queryString}`);
    const { data, status } = resp;

    if (status !== ok) {
        log.info(`Error in ORM response: ${str(data)}`);
        throw new Error("Error in ORM response!");
    }

    if (!data || !data.results || data.results.length <= 0) {
        log.info(`Not found: ${str(data)}`);
        throw new Error(`No Customer found named ${companyName}!`);
    }
    return data.results;
};

/**
 * To get the gemsCompanyId from company name #ATGEMSCOID
 * @param {*} companyName
 * @returns queryPromise
 */
const getGemsCompanyId = (companyName) => {
    // SetUp the Query
    const query = `
    SELECT swcustomerid,
        swname,
        atgemscoid
    FROM   swbapps.sw_customer
    WHERE  swname = '${companyName}'
        AND swaccttype LIKE '%MRS%'`;

    // Execute the Query on EDF and return queryPromise
    return executeQueryInEdf(query);
};

/**
 * To get requestorGemsContactid & gemsContactId from companyID #ATGEMSCNTCT_ID
 * @param {*} companyId
 * @returns queryPromise
 */
const getGemsContactDetails = (companyId) => {
    // SetUp the Query
    const query = `
    SELECT DISTINCT apr.swpersonid,
        atct.atdefaultassign,
        per.swfirstname,
        per.swlastname,
        per.atattuid,
        arc.atrole,
        atct.swcustomerid,
        atct.swcreatedby AS created_by,
        cu.swname
    FROM   gps.at_client_team atct
    left join gps.sw_customer cu
    ON cu.swcustomerid = atct.swcustomerid
    left join gps.at_person_role apr
    ON apr.atpersonroleid = atct.atpersonroleid
    left join gps.sw_person per
    ON per.swpersonid = apr.swpersonid
    left join gps.at_role_catalog arc
    ON arc.atrolecatalogid = apr.atrolecatalogid
    WHERE  atct.swcustomerid = ? 
    AND atrole LIKE 'Project Imp Manager'`;

    const formattedQuery = sqlString.format(query, [companyId]);
    // Execute the Query on EDF and return queryPromise
    return executeQueryInEdf(formattedQuery);
};

/**
 * To get gemsLocId by hostname #atspecassetname
 * @param {*} hostname
 * @returns queryPromise
 */
const getGemsLocId = (hostname) => {
    // SetUp the Query
    const query = `
    SELECT swcustomerid,
        swsitename,
        atgemslocid
    FROM   gps.sw_site
    WHERE  swsiteid = (SELECT swsiteid
                    FROM   gps.sw_inst_product
                    WHERE  sw_inst_product.atspecassetname = '${hostname}')`;

    // Execute the Query on EDF and return queryPromise
    return executeQueryInEdf(query);
};

/**
 * To get the prerequisites to call GPS CR Api
 * @param {*} data
 * @returns prerequisites object
 */
const getPrerequisitesForGpsCr = async (data) => {
    const { customerName, hostname } = data;
    const prerequisites = {};
    const log = getLogger();
    // Get CR Web ID, gemsCompanyId and getGemsLocId
    try {
        const [crWebIdRes, gemsCompanyIdRes, gemsLocIdRes] = await Promise.allSettled([
            getCrWebId(customerName),
            getGemsCompanyId(customerName),
            getGemsLocId(hostname)
        ]);
        if (crWebIdRes.status === "rejected") {
            throw new Error(`Unable to fetch CRWeb Id! Reason: ${crWebIdRes.reason}`);
        } else {
            // Do other Checks and/or Assign
            const { value } = crWebIdRes;
            const [firstRow] = value;
            if (firstRow && firstRow.cr_web_id) {
                prerequisites.crWebId = firstRow.cr_web_id;
            } else {
                throw new Error(`Unable to find CR WebID for customer: ${customerName}`);
            }
        }
        if (gemsCompanyIdRes.status === "rejected") {
            throw new Error(`Unable to fetch Gems Company Id! Reason: ${gemsCompanyIdRes.reason}`);
        } else {
            const { value } = gemsCompanyIdRes;
            if (value && value.length) {
                // Pick the first element
                const [firstRow] = value;
                prerequisites.gemsCompanyId = firstRow.SWCUSTOMERID;
            } else {
                throw new Error(`Unable to find Gems Company Id for customer: ${customerName}`);
            }
        }
        if (gemsLocIdRes.status === "rejected") {
            throw new Error(`Unable to fetch Gems Location Id! Reason: ${gemsLocIdRes.reason}`);
        } else {
            const { value } = gemsLocIdRes;
            if (value && value.length) {
                // Pick the first element
                const [firstRow] = value;
                prerequisites.gemsLocId = firstRow.ATGEMSLOCID;
            } else {
                throw new Error(`Unable to find Gems Location Id for customer: ${customerName}`);
            }
        }


        // Get Gems Contact details By gemsComapnyId
        const { gemsCompanyId } = prerequisites;
        if (!gemsCompanyId) {
            throw new Error("The gemsCompanyId is not Valid!");
        }
        const gemsContactDetailsRes = await getGemsContactDetails(gemsCompanyId);
        if (!gemsContactDetailsRes || !gemsContactDetailsRes.length) {
            throw new Error(`Unable to find Gems Contact Details for customer: ${customerName}`);
        }
        // Scan through the list of MSIMs and find the default one, if not assign the first one
        const defaultGemsContact = gemsContactDetailsRes.find((msim) => msim.ATDEFAULTASSIGN);
        if (defaultGemsContact) {
            prerequisites.gemsContactId = defaultGemsContact.SWPERSONID;
        } else {
            prerequisites.gemsContactId = gemsContactDetailsRes[0].SWPERSONID;
        }
        // Return the collected prequisites
        return {
            "status": ok,
            "message": "All prerequisites collected!",
            "data": prerequisites
        };
    } catch (error) {
        log.error(error)
        return {
            "status": internalServerError,
            "message": error.message,
            "data": error
        };
    }
};

/**
 * Get the Body for making GPS Cr Create Call to BizOps ApiGW
 * @param {*} params
 * @returns JSON of API POST Body
 */
const getGpsCrCreateBody = (params) => {
    const today = new Date();
    const tomorrow = new Date();
    // Add 1 Day
    tomorrow.setDate(today.getDate() + 1);

    return `{
        "serviceName": "gsdl.json.GPS",
        "targetEnv": "PROD",
        "endpointServiceName": "com.att.gps.clientrequestprovisioning",
        "methodName": "ebondcreatecr",
        "authenticate": {
            "userid": "",
            "credential": {    
                "password": ""         
            }
        },
        "inputs": {
            "gsdlUrlParameters": [
                {                 
                    "name": "dme2version",                 
                    "value": "1.0"             
                }
            ],
            "gsdlHttpHeaders": [
                {                 
                    "name": "X-ATT-OriginatorId",                 
                    "value": "${params.crWebId}"             
                }
            ],
            "gemsCompanyId": "${params.gemsCompanyId}",
            "referenceTicketNumber": "CIST_CR_RT_OPTIONAL",
            "requestedCompDate": "${tomorrow.toISOString().slice(0, -5)}Z",
            "requestorGemsContactid": "${params.gemsContactId}",
            "clientRequestLine": [
                {                 
                    "wfmSrLineTypeCode": "MNS_LG_CHNG",
                    "lineDescription": "Logical: Change CR submitted by CSS automation.; Service: ${params.serviceName}; ${params.actionName} || ${params.actionDescription} || ${params.transactionId}",
                    "asset": [
                        {
                            "assetName": "${params.hostname}"
                        }
                    ],
                    "attributes": [
                        {
                            "code": "MNS Prime Asset",
                            "value": "${params.hostname}"
                        },
                        {
                            "code": "MNS_SR_EXACT_TIME",
                            "value": "N"
                        },
                        {
                            "code": "MNS No ISDN/POTS Reqd",
                            "value": "Not Applicable"
                        },
                        {
                            "code": "MNS No Transport Reqd",
                            "value": "Not Applicable"
                        }    
                    ] 
                }
            ],
            "locationInformation": [
                {
                    "gemsLocId": "${params.gemsLocId}",
                    "siteContactInformation": [
                       {                         
                            "gemsContactId": "${params.gemsContactId}"                     
                        }
                    ]
                }
            ] 
        }
    }`
};

const createCrForGPS = async (data) => {
    // Prerequisites to call the API
    const log = getLogger();
    try {
        log.info("Checking the conditions for creating CR in GPS");
        const { changeType, isBcUser, userDetails } = data;
        // Find out if the user belongs to Robert Hutchinson Org (rh9892)
        const isUnderRhOrg = userDetails && userDetails.hierarchy.split("|").includes("rh9892");

        /*
         * Create CR only If
         * ActionType === Logical Change &&
         * (Requestor === From Business Center || ATTUid not in RH Org)
         */
        const shouldCreateCr = changeType === "Logical change" && (isBcUser || !isUnderRhOrg);
        if (!shouldCreateCr) {
            return {
                "status": noContent,
                "message": "Change Request is not created! Conditions do not match!"
            };
        }

        log.info("Getting the prequisites for GPS CR call!");
        const prereqRes = await getPrerequisitesForGpsCr(data);
        if (prereqRes.status !== ok) {
            throw new Error(prereqRes.message);
        }
        const prerequisites = prereqRes.data;
        log.info(`Collected Prerequisistes: ${str(prerequisites)}`);
        // Validate Prerequisites if all are there
        const preReqKeys = [
            "crWebId", "gemsCompanyId", "gemsLocId", "gemsContactId"
        ];
        const allPreReqExists = preReqKeys.every((key) => key in prerequisites && prerequisites[key]);
        if (!allPreReqExists) {
            throw new Error("Not all Required Prerequisites Exists for GPS CR Call!");
        }
        log.info("Creating the Change Request into GPS");
        // Create Axios Configuration for GPS via APIGW
        const auth = btoa(`${CONFIG.gduiAaf.username}:${CONFIG.gduiAaf.password}`);
        const options = {
            "headers": {
                "Content-Type": "application/json",
                "Authorization": `Basic ${auth}`
            },
            "proxy": false,
            "httpsAgent": new HttpsProxyAgent(proxyServer)
        };
        
        const bodyData = {...data, ...prerequisites};
        const gpsCrCreateRes = await axios.post(
            `https://${bizApiGwProd}/services/apigateway`,
            getGpsCrCreateBody(bodyData),
            options
        );

        const { outputs } = gpsCrCreateRes.data;
        log.info(`Response from GPS: ${str(outputs)}`);

        // Check if the response from GPS is Success
        if (!outputs || !("status" in outputs) || outputs.status !== "Success") {
            throw new Error("An error occured at the GPS end!");
        }

        return {
            "status": created,
            "message": "Change Request created Successfully!",
            "data": { "source": "GPS", "id": outputs.clientRequestNbr }
        };
    } catch (error) {
        log.error(error);
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            log.info(str(error.response.data));
            return {
                "status": error.response.status,
                "message": error.response.data?.outputs?.requestError?.serviceException.text || error.message
            };
        }
        return {
            "status": internalServerError,
            "message": error.message
        };
    }
};

module.exports = { getGemsCompanyId, getPrerequisitesForGpsCr, createCrForGPS };
