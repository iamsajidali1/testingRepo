/* eslint-disable no-magic-numbers, camelcase, max-len, max-lines-per-function */
/* eslint-disable max-statements, no-await-in-loop, max-lines */

const { CONFIG } = require("../config/configuration");
const vcoConfig = CONFIG.vcoJS;
const loggerPino = require("../helpers/loggerHelper");
const btoa = require("btoa");
const axios = require("axios");
const { HttpsProxyAgent } = require("https-proxy-agent");
const { check, validationResult, body, header } = require("express-validator");
const schedulerController = require("../controllers/schedulerController");
const carcheGCC = require("../controllers/carcheGeneratedConfigController");
const constants = require("../constants");
const { OrchestratorList } = require('../models/orchestratorListModel');
const {
    ok,
    internalServerError,
    unprocessableEntity
} = require("../statuses");

const proxyServer = process.env.http_proxy || constants.proxyAttPxy;

exports.createVCOEdge = [
    [
        body("VCO_USERNAME").trim(),
        check("VCO_USERNAME").isLength({ "min": 1, "max": 500 }),
        body("VCO_PASSWORD").trim(),
        check("VCO_PASSWORD").isLength({ "min": 1, "max": 500 }),
        header(constants.header_one_type).trim(),
        header(constants.header_one_type).notEmpty().equals(constants.one_type)
    ], async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(unprocessableEntity).json({ errors });
        }
        try {
            const response = await exports.callCreateVCOEdgeAsPromise(req);
            return res.status(ok).json(response);
        } catch (error) {
            loggerPino.error(error);
            return res.status(internalServerError).json(error);
        }
    }
];

exports.callCreateVCOEdgeAsPromise = async (req) => {
    const credentials = {
        "VCO_USERNAME": req.body.VCO_USERNAME,
        "VCO_PASSWORD": req.body.VCO_PASSWORD
    };
    const transactionData = req.body.actionData.data;
    const { uuid } = transactionData;
    const sessionID = req.body.actionData.sessionId;
    const transactionDataHelper = require("../helpers/transactionDataHelper");
    const results = [];
    const carcheTemplate = await transactionDataHelper
        .getCarcheTemplateForActionTemplate(
            transactionData.actionId
        );
    const data = {
        "sessionId": sessionID,
        "templateId": carcheTemplate.id,
        "templateUUID": uuid
    };

    const configFromDB = await carcheGCC.getTemplateByIds(data)
        .catch((error) => {
            loggerPino.error(error);
            throw new Error("Database error");
        });
    const configurationDB = configFromDB.GENERATED_TEMPLATE
        .toString("utf8").trim();
    const toJson = JSON.parse(configurationDB);

    try {
        const result = await exports.createVCOEdgeAsPromise(
            toJson,
            credentials,
            transactionData.vcoUrl
        );
        results.push(result.resp);
    } catch (error) {
        loggerPino.error(error);
        throw error;
    }
    return results;
};

exports.bulkCreateVCOEdge = [
    [
        body("VCO_USERNAME").trim(),
        check("VCO_USERNAME").isLength({ "min": 1, "max": 500 }),
        body("VCO_PASSWORD").trim(),
        check("VCO_PASSWORD").isLength({ "min": 1, "max": 500 }),
        header(constants.header_one_type).trim(),
        header(constants.header_one_type).notEmpty().equals(constants.one_type)
    ], async (req) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            schedulerController.updateStatusAndResult(req.body.pid, "Error", "422", errors);
            throw new Error("Internal error - input validation!");
        }
        try {
            const response = await exports.callBulkCreateVCOEdgeAsPromise(req);
            schedulerController.updateStatusAndResult(req.body.pid, "OK", "200", response);
            return;
        } catch (error) {
            loggerPino.error(error);
            schedulerController.updateStatusAndResult(req.body.pid, "Error", "500", error);
            throw new Error("Internal error - function result!");
        }
    }
];

exports.callBulkCreateVCOEdgeAsPromise = async (req) => {
    const credentials = {
        "VCO_USERNAME": req.body.VCO_USERNAME,
        "VCO_PASSWORD": req.body.VCO_PASSWORD
    };
    const transactionData = req.body.actionData.data;
    const { uuid } = transactionData;
    const sessionID = req.body.actionData.sessionId;
    const transactionDataHelper = require("../helpers/transactionDataHelper");
    const carcheTemplate = await transactionDataHelper
        .getCarcheTemplateForActionTemplate(transactionData.actionId);
    const data = {
        "sessionId": sessionID,
        "templateId": carcheTemplate.id,
        "templateUUID": uuid
    };
    const configFromDB = await carcheGCC.getTemplateByIds(data).catch((error) => {
        loggerPino.error(error);
        throw new Error("Database error");
    });
    const configurationDB = configFromDB.GENERATED_TEMPLATE.toString("utf8").trim();
    const edges = JSON.parse(configurationDB);
    try {
        const promisesArray = [];
        edges.forEach((edge) => {
            promisesArray.push(exports.createVCOEdgeAsPromise(
                edge,
                credentials,
                transactionData.vcoUrl
            ));
        });
        const results = await Promise.all(promisesArray);
        const response = [];
        results.forEach((result) => {
            if (result.status) {
                response.push(result.resp);
            }
        });
        return response;
    } catch (error) {
        loggerPino.error(error);
        throw error;
    }
};

exports.createVCOEdgeAsPromise = async (config, credentials, vco_url) => {
    const auth = btoa(`${CONFIG.MECH_ID}:${CONFIG.MECH_ID_PASS}`);
    const requestConfig = {
        "url": `${vcoConfig.VELOWRAPTOR_URL}${vcoConfig.VCO_EDGES}`,
        "method": "post",
        "data": config,
        "headers": {
            "Accept": "application/json",
            "Content-Type": "application/json",
            // Velowraptor creds to VCO
            "Vco-Authentication": `${credentials.VCO_USERNAME}:${credentials.VCO_PASSWORD}`,
            "Vco-URL": vco_url.url,
            "Vco-Version": vcoConfig.VCO_VERSION,
            "Authorization": `Basic ${auth}`
        },
        "proxy": false,
        "httpsAgent": new HttpsProxyAgent(proxyServer)
    };
    const response = await axios(requestConfig).catch((error) => {
        loggerPino.error(error);
        throw new Error("Unable to call velowraptor api - edge provising");
    });
    const responseObj = {};
    const edgeName = config.name;
    if (response) {
        const VCOresponse = response.data;
        if (response.status <= 299 && response.status >= 200) {
            responseObj[edgeName] = VCOresponse;
            return { "status": "OK", "statusCode": response.status, "resp": responseObj };
        }
        if (response.status > 299 && response.status < 599) {
            loggerPino.error("Error when creating vco edge!");

            if (VCOresponse.data && VCOresponse.data.error) {
                const VCOresponseErrors = VCOresponse.data.error;
                const errors = [];
                for (const error of VCOresponseErrors) {
                    errors.push({ "error": { "message": error.message } });
                }
                responseObj[edgeName] = errors;
            } else {
                responseObj[edgeName] = VCOresponse.message;
            }

            return { "status": "error", "statusCode": response.status, "resp": responseObj };
        }
        loggerPino.error("Incorect api status velowraptor");
        responseObj[edgeName] = VCOresponse;
        return { "status": "error", "statusCode": response.status, "resp": responseObj };
    }
    loggerPino.error("Response missing from velowraptor!");
    loggerPino.info("Whole response of the request");
    loggerPino.info(response);
    return { "status": "error", "resp": "Error when creating voc edge!" };
};

exports.createVCOUser = [
    [
        body("credentials.VCO_USERNAME").trim(),
        check("credentials.VCO_USERNAME").isLength({ "min": 1, "max": 500 }),
        body("credentials.VCO_PASSWORD").trim(),
        check("credentials.VCO_PASSWORD").isLength({ "min": 1, "max": 500 }),
        body("credentials.usersProvisioiningSwitch").trim(),
        body("credentials.usersProvisioiningSwitch").isLength({ "min": 1, "max": 500 }),
        header(constants.header_one_type).trim(),
        header(constants.header_one_type).notEmpty().equals(constants.one_type)
    ], async (req) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            schedulerController.updateStatusAndResult(req.body.pid, "Error", "422", errors);
            throw new Error("Internal error - input validation!");
        }
        try {
            const response = await exports.callCreateVCOUsersAsPromise(req);
            schedulerController.updateStatusAndResult(req.body.pid, "OK", "200", response);
            return;
        } catch (error) {
            loggerPino.error(error);
            schedulerController.updateStatusAndResult(req.body.pid, "Error", "500", error);
            throw new Error("Internal error - function result!");
        }
    }
];

exports.callCreateVCOUsersAsPromise = async (req) => {
    const transactionData = req.body.actionData.data;
    let results = [];
    let users = [];
    try {
        const data = {
            "templateUUID": transactionData.templateUuid
        };
        const configFromDB = await carcheGCC.getTemplateByIds(data).catch((error) => {
            loggerPino.error(error);
            throw new Error("Database error");
        });
        const configurationDB = configFromDB.GENERATED_TEMPLATE.toString("utf8").trim();
        users = JSON.parse(configurationDB);
        let orchestrator;
        try {
            orchestrator = await OrchestratorList.findOne({
                where: { URL: transactionData.vcoUrl.url }
            })
        } catch (error) {
            loggerPino.error(error);
            throw new Error("Database error");
        }
        const tenantId = orchestrator["dataValues"]["TENANT_ID"];
        // If creating users array bigger then 10
        if (users.length > 10) {
            for (let itr = 0; itr < users.length; itr += 10) {
                const result = await exports.createVCOUsersAsPromis(
                    users.slice(itr, itr + 10),
                    req.body.credentials,
                    transactionData.vcoUrl,
                    tenantId
                );
                results.push(result);
            }
        } else {
            results = await exports.createVCOUsersAsPromis(
                users,
                req.body.credentials,
                transactionData.vcoUrl,
                tenantId
            );
        }
    } catch (error) {
        loggerPino.error(error);
        throw error;
    }
    return results;
};

exports.createVCOUsersAsPromis = async (users, credentials, vco_url, tenantId) => {
    const auth = btoa(`${CONFIG.MECH_ID}:${CONFIG.MECH_ID_PASS}`);
    const requestConfig = {
        "url": `${vcoConfig.VELOWRAPTOR_URL}${vcoConfig.VCO_USERS}`,
        "method": "post",
        "data": {
            params: [{
                type: "json",
                name: "user_list",
                value: [
                    users
                ]
            }],
            "devices": []
        },
        "headers": {
            "Accept": "application/json",
            "Content-Type": "application/json",
            // Velowraptor creds to VCO
            "X-PASSWORD": credentials.VCO_PASSWORD,
            "X-Username": credentials.VCO_USERNAME,
            "X-URL": vco_url.url,
            "X-TENANT-ID": tenantId,
            "Vco-Proxy-User": credentials.usersProvisioiningSwitch,
            "Authorization": `Basic ${auth}`
        },
        "proxy": false,
        "httpsAgent": new HttpsProxyAgent(proxyServer)
    };
    const response = await axios(requestConfig).catch((error) => {
        loggerPino.error(error);
        throw new Error("Unable to call velowraptor api - bulk user creation");
    });

    if (response) {
        const VCOresponse = response.data;
        if (response.status <= 299 && response.status >= 200) {
            return { "status": "OK", "statusCode": response.status, "resp": VCOresponse };
        }
        if (response.status > 299 && response.status < 599) {
            loggerPino.error("Error when creating vco user!");
            throw new Error("Error when creating voc user!");
        } else {
            loggerPino.error("Incorect api status velowraptor");
            throw new Error("Error when creating voc user!");
        }
    } else {
        loggerPino.error("Response missing from velowraptor!");
        loggerPino.info("Whole response of the request");
        loggerPino.info(response);
        throw new Error("Error when creating voc user!");
    }
};
