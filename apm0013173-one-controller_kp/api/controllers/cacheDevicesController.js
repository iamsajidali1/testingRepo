/* eslint-disable max-classes-per-file, max-len, max-lines, max-lines-per-function */
/* eslint-disable no-magic-numbers, sort-keys, no-await-in-loop */

const ax = require("axios");
const sqlString = require('sqlstring');
const { Op } = require("sequelize");
const { callOCSAPIasPromise } = require("../controllers/ocsController");
const { getLogger } = require("../../utils/logging");
const { CONFIG } = require("../config/configuration");
const { "v4": uuidv4 } = require("uuid");
const {
    ok,
    notFound,
    serviceUnavailable,
    internalServerError
} = require("../statuses");
const { infinity } = require("../constants");

const oneConnection = require("../models/databaseOne").Database.getInstance();
const edfCred = CONFIG.edfConDetails;

const { "stringify": str } = JSON;

class ResponseError extends Error { }
class NotFoundError extends Error { }
class InvalidInputError extends Error { }

const getDevicesQueryForAvpn = (list) => {
    const orgAccounts = list.map(account => `${account}_GA`);
    const query = `
    SELECT DISTINCT eq.common_name AS HOSTNAME,
        'Hardware' AS TYPE,
        eqref.eqp_category AS CATEGORY,
        eqref.MODEL AS PARTNUM,
        manuf.name AS VENDOR,
        eq.service_name AS SERVICE,
        nc3_site.ADDRESS_LINE1 as ADDRESS,
        nc3_site.CITY as CITY,
        nc3_site.STATE AS STATE,
        nc3_site.POSTAL_CODE AS ZIP,
        nc3_site.COUNTRY_CODE as COUNTRY,
        REPLACE(org.ORG_ACCT, '_GA', '') AS GRUA, 
        CASE
            WHEN eq.service_name = 'NB-IPVPN' THEN 'AVPN'
        END as SERVICE_NAME
    FROM NC3_MAT.ORG org
        INNER JOIN NC3_MAT.ORG_ORG orgorg ON orgorg.odbid_second_org = org.odbid
        INNER JOIN NC3_MAT.LOCATION loc ON loc.odbid_org = orgorg.odbid_first_org
        INNER JOIN NC3_MAT.EQP_LOC eqLoc ON loc.odbid = eqLoc.odbid_loc
        INNER JOIN NC3_MAT.EQP eq ON eqloc.odbid_eqp = eq.ODBID
        INNER JOIN nc3_mat.eqp_ref eqref ON eq.odbid_eqp_ref = eqref.odbid
        INNER JOIN NC3_MAT_GG.SITE nc3_site ON nc3_site.ODBID = loc.ODBID_SITE
        INNER JOIN nc3_mat.org manuf ON eqref.odbid_manufacturer = manuf.odbid
    WHERE org.ORG_ACCT IN (?) 
        AND eqLoc.status = 'Started'
        AND eq.status = 'Useable'
        AND UPPER(eqref.eqp_category) = 'ROUTER'`;

    const formattedQuery = sqlString.format(query, [orgAccounts]);
    // Send the formatted query string
    return formattedQuery;
};

const getDevicesQueryForMrs = async (acronyms) => {
    const query = `
    SELECT DISTINCT SW_INST_PRODUCT.ATSPECASSETNAME AS HOSTNAME,
        PRODUCT.SWTYPE AS TYPE,
        PRODUCT.SWSUBTYPE AS CATEGORY,
        PRODUCT.SWPARTNUMBER AS PARTNUM,
        VENDOR.SWNAME AS VENDOR,
        ATGEMSORGSERVICELINE AS SERVICE,
        sw_address.swaddress1 as ADDRESS,
        sw_address.swcity as CITY,
        sw_address.swstate as STATE,
        sw_address.swzip as ZIP,
        sw_address.swcountry as COUNTRY,
        at_network.atnetworkacronym as GRUA,
        CASE
            WHEN ATGEMSORGSERVICELINE = 'MRS' THEN 'MRS'
            WHEN ATGEMSORGSERVICELINE = 'uCPE-VMS' THEN 'SD-WAN OTT'
            WHEN ATGEMSORGSERVICELINE = 'Managed Edge' THEN 'SD-WAN OTT'
            WHEN ATGEMSORGSERVICELINE = 'MLAN' THEN 'MLAN'
        END as SERVICE_NAME
    FROM GPS.SW_INST_PRODUCT
        LEFT join GPS.SW_CUSTOMER ON SW_CUSTOMER.swcustomerid = sw_inst_product.swcustomerid
        LEFT JOIN GPS.SW_PROD_RELEASE PRODUCT ON SW_INST_PRODUCT.SWPRODRELEASEID = PRODUCT.SWPRODRELEASEID
        LEFT JOIN GPS.SW_CUSTOMER VENDOR ON PRODUCT.SWCUSTOMERID = VENDOR.SWCUSTOMERID
        LEFT JOIN GPS.at_gems_coorg ON SW_INST_PRODUCT.atgemsorgid = GPS.at_gems_coorg.atgemsorgid
        LEFT JOIN GPS.SW_SITE ON SW_INST_PRODUCT.swsiteid = GPS.SW_SITE.swsiteid
        LEFT JOIN GPS.sw_address on SW_INST_PRODUCT.swsiteid = sw_address.swobjectid
        LEFT JOIN GPS.at_network on sw_inst_product.swcustomerid = at_network.atcustomerid
    WHERE SW_INST_PRODUCT.SWSTATUS = 'Installed'
        AND at_network.atnetworkacronym IN (?) AND SW_INST_PRODUCT.atassetprimaryflag = 1`;

    const formattedQuery = sqlString.format(query, [acronyms]);
    return formattedQuery;
};

const getDevicesQueryForAvts = async (acronyms) => {
    const query = `
    SELECT asset_name AS HOSTNAME,
        'Hardware' AS TYPE,
        'Router' AS CATEGORY,
        device_model AS PARTNUM,
        CASE
            WHEN device_type = 'IOS' THEN 'CISCO SYSTEMS'
        END AS VENDOR,
        'AVTS' AS SERVICE,
        Concat(locations.street1, locations.street2) AS ADDRESS,
        locations.city,
        locations.stprv AS STATE,
        locations.postal AS ZIP,
        locations.country,
        devices.co_abbr AS GRUA
    FROM platinum.devices
        LEFT JOIN platinum.locations ON platinum.locations.loc_id = platinum.devices.loc_id
    WHERE status LIKE 'INS'
        AND device_type LIKE 'IOS'
        AND devices.co_abbr IN (${acronyms})`;

    const formattedQuery = sqlString.format(query, [acronyms]);
    return formattedQuery;
};

exports.executeQueryInEdf = async (query) => {
    // Check if query is null or not a string
    if (query === null || typeof query !== 'string') {
        throw new ResponseError("Query parameter cannot be null or non-string!");
    }
    
    const trimmedQuery = query.replace(/^\s+|\s+$/g, "").replace(/\n/g, "");
    const tns = `(DESCRIPTION = (ADDRESS_LIST = (ADDRESS = (PROTOCOL = TCP)(HOST = ${edfCred.HOST})(PORT = ${edfCred.PORT})))(CONNECT_DATA = (SERVICE_NAME = ${edfCred.SID})))`
    const requestData = { tns: tns, username: edfCred.USER, password: edfCred.PASSWORD, query: trimmedQuery, debug: true }
    // Call EDF to execute Query
    const queryResponse = await callOCSAPIasPromise(requestData);
    // A little Error Handling
    if (!(queryResponse.status === "OK" && queryResponse.statusCode === ok)) {
        throw new ResponseError("An Error Occured Querying EDF DB!");
    }
    if (
        !queryResponse ||
        !queryResponse.result ||
        queryResponse.result.length <= 0
    ) {
        throw new NotFoundError("No Records found for the Query!");
    }
    // Transform Data, remove Leading and Trailing Spaces
    const data = queryResponse.result.data.map((obj) => {
        Object.keys(obj).forEach((key) => {
            if (obj[key] && isNaN(obj[key])) {
                obj[key] = obj[key].trim();
            }
        });
        return obj;
    });
    // Return Transformed Data
    return data;
};

exports.fetchDistinctGruaList = async () => {
    const { ormUrl } = CONFIG;
    const log = getLogger();
    const resp = await ax.get(`${ormUrl}/api/gruadata/?limit=${infinity}`);
    const { data, status } = resp;

    if (status !== ok) {
        log.info(`Error in ORM response: ${str(data)}`);
        throw new ResponseError("Error in ORM response!");
    }

    if (!data || !data.results || data.results.length <= 0) {
        log.info(`Not found: ${str(data)}`);
        throw new NotFoundError("No GRUAs found!");
    }

    return [...new Set(data.results.map((obj) => obj.grua))];
};

exports.fetchGruaByCustomer = async (custId) => {
    const { ormUrl } = CONFIG;
    const log = getLogger();
    if (isNaN(custId)) {
        log.info(`Error in Input: ${str(custId)} Not a Number!`);
        throw new InvalidInputError("Invalid Customer Id Provided!");
    }

    const validateInput = /^[a-zA-Z0-9-_]+$/; // Adjust the regex as needed for your use case
    if (!validateInput.test(custId)) {
        loggerPino.error(`${ses}: Invalid serviceToCustomerId value: ${str(custId)}`);
        throw new Error("Invalid serviceToCustomerId value");
    }
    // Define allowed hosts
    const allowedHosts = ormUrl;   
    const urlObject = new URL(allowedHosts);
    urlObject.pathname = `${urlObject.pathname}api/gruadatatocustomer`;
    urlObject.searchParams.append('customer__id', custId);
    
    if (!allowedHosts.includes(urlObject.hostname)) {
        loggerPino.error(`${ses}: Host ${JSON.stringify(urlObject.hostname)} is not allowed`);
        throw new Error("Host not allowed");
    }

    const resp = await ax.get(
        urlObject.toString()
    );
    const { data, status } = resp;

    if (status !== ok) {
        log.info(`Error in ORM response: ${str(data)}`);
        throw new ResponseError("Error in ORM response!");
    }

    if (!data || !data.results || data.results.length <= 0) {
        log.info(`Not found: ${str(data)}`);
        throw new NotFoundError("No Customers/GRUA found!");
    }

    return data.results.map((obj) => obj.grua);
};

exports.saveCachedDevices = async (data, src, caller) => {
    const log = getLogger();
    let transaction = null;
    const preText = `Device Caching (${caller})`;
    try {
        // Check if there is data to push
        if (!data.length) {
            log.info(`Error in Input: ||${str(data)}|| No Data!`);
            throw new InvalidInputError("No Data Passed to be Saved!");
        }

        const { CachedDevicesData } = require("../models/cacheDeviceModel");

        /*
         * Save the response as cache to the database
         * Get transaction
         */
        log.info(`${preText} - Importing the Devices into Cache Table`);
        transaction = await oneConnection.transaction();

        // /*
        // * Truncate the Cache Table
        // * (Delete All for the same GRUAs because, Truncate cannot be Rolled Back!)
        // */
        const gruas = data.map((record) => record.GRUA);
        await CachedDevicesData.destroy({
            "where": { "DATA_SRC": src, "CACHING_FN": caller, "GRUA": gruas },
            transaction
        });
        // Insert bulk of the results
        await CachedDevicesData.bulkCreate(data, { transaction });
        // Commit the Changes
        await transaction.commit();
        log.info(`${preText} - Imported ${data.length} Devices`);
        return data;
    } catch (err) {
        const { message } = err;
        log.error(message);
        // Rollback transaction only if the transaction object is defined
        if (transaction) {
            await transaction.rollback();
        }
        log.info(`${preText} - Caching Failed!!!`);
        return [];
    }
};

exports.cacheDevicesForAvpn = async (grua) => {
    const log = getLogger();
    const dataSrc = "EDF";
    const caller = "cacheDevicesForAvpn()";
    const preText = `Device Caching (${caller})`;
    // Step 2: Get the Devices using the GRUA List for AVPN service from EDF
    log.info(`${preText} - Getting the Devices from ${dataSrc}`);
    const chunk = 50;
    let countSoFar = 0;
    for (let index = 0; index < grua.length; index += chunk) {
        const gruaChunk = grua.slice(index, index + chunk);
        // Execute in sequence for the chunk
        log.info(`${preText} - Executing for GRUA: ${str(gruaChunk)}`);
        try {
            const results = await exports.executeQueryInEdf(
                getDevicesQueryForAvpn(gruaChunk)
            );
            // Step 2.5 removing "." character from address if it is on last position, causing bing maps API to fail
            const changedAddress = results.map((result) =>
                result["ADDRESS"] && result["ADDRESS"].slice(-1) === "."
                    ? {
                        ...result,
                        ADDRESS: result["ADDRESS"].substring(0,
                            result["ADDRESS"].length - 1
                        ),
                    }
                    : result
            );
            // Step 3: Transform the data accordingly the Model
            const data = changedAddress.map((edfResult) => ({
                "ID": uuidv4(),
                ...edfResult,
                "DATA_SRC": dataSrc,
                "CACHING_FN": caller
            }));
            // Step 4: Save the response as cache to the database
            await exports.saveCachedDevices(data, dataSrc, caller);
            countSoFar += data.length;
        } catch (err) {
            const { message } = err;
            log.error(message);
        }
    }
    log.info(`${preText} - Cached a total of ${countSoFar} records from EDF`);
    return countSoFar;
};

exports.cacheDevicesForMrs = async (grua) => {
    const log = getLogger();
    const dataSrc = "EDF";
    const caller = "cacheDevicesForMrs()";
    const preText = `Device Caching (${caller})`;
    // Step 2: Get the Devices using the GRUA List for AVPN service from EDF
    log.info(`${preText} - Getting the Devices from ${dataSrc}`);
    const chunk = 50;
    let countSoFar = 0;
    for (let index = 0; index < grua.length; index += chunk) {
        const gruaChunk = grua.slice(index, index + chunk);
        // Execute in sequence for the chunk
        log.info(`${preText} - Executing for GRUA: ${str(gruaChunk)}`);
        try {
            const results = await exports.executeQueryInEdf(
                getDevicesQueryForMrs(gruaChunk)
            );
            // Step 2.5 removing "." character from address if it is on last position, causing bing maps API to fail
            const changedAddress = results.map((result) =>
                result["ADDRESS"] && result["ADDRESS"].slice(-1) === "."
                    ? {
                        ...result,
                        ADDRESS: result["ADDRESS"].substring(0,
                            result["ADDRESS"].length - 1
                        ),
                    }
                    : result
            );
            // Step 3: Transform the data accordingly the Model
            const data = changedAddress.map((edfResult) => ({
                "ID": uuidv4(),
                ...edfResult,
                "DATA_SRC": dataSrc,
                "CACHING_FN": caller
            }));
            // Step 4: Save the response as cache to the database
            await exports.saveCachedDevices(data, dataSrc, caller);
            countSoFar += data.length;
        } catch (err) {
            const { message } = err;
            log.error(message);
        }
    }
    log.info(`${preText} - Cached a total of ${countSoFar} records from EDF`);
    return countSoFar;
};

exports.cacheDevicesForAvts = async (grua) => {
    const log = getLogger();
    const dataSrc = "EDF";
    const caller = "cacheDevicesForAvts()";
    const preText = `Device Caching (${caller})`;
    // Step 2: Get the Devices using the GRUA List for AVPN service from EDF
    log.info(`${preText} - Getting the Devices from ${dataSrc}`);
    const chunk = 50;
    let countSoFar = 0;
    for (let index = 0; index < grua.length; index += chunk) {
        const gruaChunk = grua.slice(index, index + chunk);
        // Execute in sequence for the chunk
        log.info(`${preText} - Executing for GRUA: ${str(gruaChunk)}`);
        try {
            const results = await exports.executeQueryInEdf(
                getDevicesQueryForAvts(gruaChunk)
            );
            // Step 2.5 removing "." character from address if it is on last position, causing bing maps API to fail
            const changedAddress = results.map((result) =>
                result["ADDRESS"] && result["ADDRESS"].slice(-1) === "."
                    ? {
                        ...result,
                        ADDRESS: result["ADDRESS"].substring(0,
                            result["ADDRESS"].length - 1
                        ),
                    }
                    : result
            );
            // Step 3: Transform the data accordingly the Model
            const data = changedAddress.map((edfResult) => ({
                "ID": uuidv4(),
                ...edfResult,
                "DATA_SRC": dataSrc,
                "CACHING_FN": caller
            }));
            // Step 4: Save the response as cache to the database
            await exports.saveCachedDevices(data, dataSrc, caller);
            countSoFar += data.length;
        } catch (err) {
            const { message } = err;
            log.error(message);
        }
    }
    log.info(`${preText} - Cached a total of ${countSoFar} records from EDF`);
    return countSoFar;
};

// Function to Execute the caching for all Services
exports.executeCaching = async (forGruaInParam = []) => {
    const log = getLogger();
    try {
        // Step 1: Get the list of GRUAs from CSS_GRUA_DATA Table
        log.info("Device Caching - Get the list of GRUAs");

        /*
         * Check if the grua is passed for caching or for all
         * Grua's it neeeds to be done
         */
        let grua = [...forGruaInParam];
        if (!grua.length) {
            grua = await exports.fetchDistinctGruaList();
        }
        log.info(`Device Caching - Recieved total ${grua.length} GRUAs`);
        // Cache devices for AVPN
        const avpn = await exports.cacheDevicesForAvpn(grua);
        // Cache devices for MRS
        const mrs = await exports.cacheDevicesForMrs(grua);
        // // Cache devices for AVTS
        const avts = await exports.cacheDevicesForAvts(grua);
        // If we are here, then all good
        log.info("Device Caching - Caching Successful!");
        return {
            "status": ok,
            "message": "Device Caching Completed Successfully!",
            "statistics": [
                { "service": "AVPN", "count": avpn },
                { "service": "MRS", "count": mrs },
                { "service": "AVTS", "count": avts }
            ]
        };
    } catch (err) {
        const { message } = err;
        log.error("There is a problem while caching the devices!");
        log.error(message);
        return {
            "status": internalServerError,
            "message": "There is a problem while caching the devices!"
        };
    }
};

// Function to trigger the caching for all Services
exports.triggerDeviceCaching = (req, res) => {
    const log = getLogger();
    exports.executeCaching().then((response) => {
        log.info(response.message);
        if (response.status !== ok) {
            return;
        }
        log.info("**********************");
        log.info("CACHING SUMMARY");
        log.info("**********************");
        response.statistics.forEach((stat) => {
            log.info(`${stat.service}: ${stat.count}`);
        });
        log.info("**********************");
    });
    return res.status(ok).json({
        "status": ok,
        "message": "Caching for devices from EDF has been triggered successfully!"
    });
};

exports.getDevicesHelper = async (req) => {
    const { Customers } = require("../models/customerOneModel");
    const { customerId } = req.query;

    /*
     * Check if customer is Business Center user
     * If yes, fetch the customer Id for the Customer
     */
    let custId = null;
    if (req.isBcUser && req.ebizCompanyId) {
        const customer = await Customers.findOne({
            "where": { "BC_COMPANY_ID": req.ebizCompanyId }
        });
        custId = customer.dataValues.ID;
    }
    // Check if customer id is passed
    if (customerId) {
        custId = customerId;
    }
    // Now fetch the GRUA for the Customer
    const grua = await exports.fetchGruaByCustomer(custId);
    const gruaStrArray = grua.map((gru) => gru.grua);

    // Use the gruaStrArray to find all the cached Devices
    const { CachedDevicesData } = require("../models/cacheDeviceModel");
    const devices = await CachedDevicesData.findAll({
        "where": { "GRUA": { [Op.in]: gruaStrArray } }
    });
    return devices;
};

// Serve from cached devices based on customerId, grua or service
exports.getCachedDevices = async (req, res) => {
    const log = getLogger();
    try {
        const devices = await exports.getDevicesHelper(req);
        if (!devices.length) {
            throw new NotFoundError("No devices found for the customer!");
        }
        return res.status(ok).json(devices);
    } catch (err) {
        const { message } = err;
        log.error(message);
        if (err instanceof NotFoundError) {
            return res.status(notFound).json({ message });
        }
        return res.status(serviceUnavailable).json({
            "message": "There is a problem fetching devices!"
        });
    }
};
