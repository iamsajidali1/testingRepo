/* eslint-disable max-len */

const axios = require("axios");
const qs = require("qs");
const { HttpsProxyAgent } = require("https-proxy-agent");

const { getLogger } = require("../../utils/logging");
const { proxyAttSub } = require("../constants");
const { CONFIG } = require("../config/configuration");
const { getCustomerGRUAsById } = require("./customerController");

const { "stringify": str } = JSON;

const TDC_WORKFLOW_ID = 2;

/**
 * Get a https proxy agent over http proxy
 * @returns { HttpsProxyAgent } Https Agent
 */
const getHttpsAgent = () => new HttpsProxyAgent(
    process.env.http_proxy || process.env.HTTP_PROXY || proxyAttSub
);

/**
 * Get the access, refresh Tokens for oAuth to SNOW
 * @returns response object with token in it
 */
const fetchAuthTokens = async () => {
    const log = getLogger();
    try {
        const data = qs.stringify({
            "grant_type": "password",
            "client_id": CONFIG.snowOauth.clientId,
            "client_secret": CONFIG.snowOauth.clientSecret,
            "username": CONFIG.snowOauth.username,
            "password": CONFIG.snowOauth.password
        });
        const config = {
            "method": "POST",
            "url": `https://${CONFIG.snowOauth.instance}.service-now.com/oauth_token.do`,
            "headers": {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            data,
            "proxy": false,
            "httpsAgent": getHttpsAgent()
        };
        log.info("Fetching oAuth tokens from SNOW");
        log.info(`SNOW Call: ${config.method} ${config.url}`);
        const response = await axios.request(config);
        log.info(str(response.data));
        return response.data;
    } catch (error) {
        if (error.isAxiosError) {
            log.error(`SNOW Error: ${error.response.data}`);
        }
        log.error(error.message);
        log.error("Unable to fetch Auth Token!");
        return null;
    }
};

/**
 * Create or Update Existing Templates in SNOW
 * This should be triggered whenever there is a change in Action Template for Data Collection
 * @param { Object } template :object contains all key, value pairs for template
 * @returns { Object } response object saying success/failed
 */
const createOrUpdateTemplate = async (template) => {
    const log = getLogger();
    try {
        log.info("Perform oAuth to SNOW");
        const tokens = await fetchAuthTokens();
        const config = {
            "method": "POST",
            "url": `https://${CONFIG.snowOauth.instance}.service-now.com/api/x_att12_tdc/att_meng_tdc_gateway/update_form_definition`,
            "headers": {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${tokens.access_token}`
            },
            "data": template,
            "proxy": false,
            "httpsAgent": getHttpsAgent()
        };
        log.info("Posting template update to Snow");
        log.info(`SNOW Call: ${config.method} ${config.url}`);
        log.info(str(template));
        const response = await axios.request(config);
        log.info(
            `Template created/updated successfully! Status: ${response.status}`
        );
    } catch (error) {
        if (error.isAxiosError) {
            log.error(`SNOW Error: ${str(error.response.data)}`);
        }
        log.error(error.message);
        log.error("Unable to create/update the template on SNOW");
    }
};

/**
 * To delete the template from SNOW
 * This should be triggered when the template is deleted
 * @param { Number } templateId from css/snow
 * @returns { Object } results whether operation is success/failed
 */
const deleteTemplate = async (templateId) => {
    const log = getLogger();
    try {
        log.info("Perform oAuth to SNOW");
        const tokens = await fetchAuthTokens();
        const config = {
            "method": "DELETE",
            "url": `https://${CONFIG.snowOauth.instance}.service-now.com/api/x_att12_tdc/att_meng_tdc_gateway/remove_form_definition`,
            "params": { "templateID": templateId },
            "headers": {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${tokens.access_token}`
            },
            "proxy": false,
            "httpsAgent": getHttpsAgent()
        };
        log.info(`Deleting template with Id: ${str(templateId)} from SNOW`);
        log.info(`SNOW Call: ${config.method} ${config.url}`);
        const response = await axios.request(config);
        log.info(`Template deleted successfully! Status: ${response.status}`);
    } catch (error) {
        if (error.isAxiosError) {
            log.error(`SNOW Error: ${str(error.response.data)}`);
        }
        log.error(error.message);
        log.error("Unable to delete the template on SNOW");
    }
};

/**
 * Process the the data coming for template/ deal with the actions
 * @param {*} action create/update/delete
 * @param {*} template template data
 * @returns
 */
const processTemplate = async (action, template) => {
    const log = getLogger();
    if (template.workflowId === TDC_WORKFLOW_ID) {
        // Transform and push it to snow
        if (action === "delete") {
            deleteTemplate(template.id);
        }
        if (action === "create" || action === "update") {
            try {
                let data = [
                    {
                        "Template ID": template.id,
                        "Template Name": template.name,
                        "Description": template.description,
                        "Customer ID": "",
                        "Service": template.serviceId.map((ser) => ser.serviceName).join(", "),
                        "Vendor": template.vendorType || "N/A"
                    }
                ];
                // Find out if Customer Id and Customer deatils is passed
                if (template && "customerId" in template && template.customerId) {
                    log.info(`Fetching the GRUA for customer with ID: ${str(template.customerId)}`);
                    const gruaData = await getCustomerGRUAsById(template.customerId);
                    data = gruaData.map((grua) => ({
                        "Template ID": template.id,
                        "Template Name": template.name,
                        "Description": template.description,
                        "Customer ID": grua,
                        "Service": template.serviceId.map((ser) => ser.serviceName).join(", "),
                        "Vendor": template.vendorType || "N/A"
                    }));
                }
                createOrUpdateTemplate(data);
            } catch (error) {
                log.error(error.message);
                log.error("Something went wrong with the SNOW update of template!");
            }
        }
    }
};


/**
 * Post Data Collection to the Snow
 * @param { String } callbackUrl: the url to which POST will be done
 * @param { Object } data : object containing collected data
 * @returns { Boolean } true/ false based on the api response
 */
const postDataCollection = async (callbackUrl, data) => {
    const log = getLogger();
    try {
        log.info("Perform oAuth to SNOW");
        const tokens = await fetchAuthTokens();
        const config = {
            "method": "POST",
            "url": callbackUrl,
            "headers": {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${tokens.access_token}`
            },
            data,
            "proxy": false,
            "httpsAgent": getHttpsAgent()
        };
        log.info("Posting Collected Data to Snow");
        log.info(`SNOW Call: ${config.method} ${config.url}`);
        log.info(str(data));
        const response = await axios.request(config);
        log.info(
            `Data posted to Snow successfully! Status: ${response.status}`
        );
        return true;
    } catch (error) {
        if (error.isAxiosError) {
            log.error(`SNOW Error: ${str(error.response.data)}`);
        }
        log.error(error.message);
        log.error("Unable to post the collected data on SNOW!");
        return false;
    }
};

module.exports = { createOrUpdateTemplate, deleteTemplate, processTemplate, postDataCollection };
