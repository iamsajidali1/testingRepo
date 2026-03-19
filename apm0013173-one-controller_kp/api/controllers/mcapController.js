/* eslint-disable max-len, no-magic-numbers, sort-keys, max-lines-per-function */
const { check, validationResult, query, body, header } = require("express-validator");
const { CTVendorTypes } = require("../models/cTVendorTypes");
const { ServiceToCustomer } = require('../models/serviceToCustomerModel');
const schedulerController = require("../controllers/schedulerController");
const { CONFIG } = require("../config/configuration");
const configPassPhrase = CONFIG.mCapPassPhrase;
const loggerPino = require("../helpers/loggerHelper");
const carcheGCC = require("../controllers/carcheGeneratedConfigController");
const transactionDataHelper = require("../helpers/transactionDataHelper");
const constants = require("../../api/constants");
const axios = require("axios");
const { HttpsProxyAgent } = require("https-proxy-agent");
const Sequelize = require("sequelize");
const QueryTypes = require("sequelize");
const steps = require("../../api/steps");
const transactionStatuses = require("../../api/transactionStatuses");
const numberOfRetries = 3;
const statuses = require("../statuses.js")
const proxyServer = process.env.http_proxy || constants.proxyAttPxy;
const GateWayTimeOut = require("../errors/gateWayTimeOutError");
const ServiceUnavailable = require("../errors/serviceUnavailableError");
const BadRequest = require("../errors/badRequestError");
const InternalServerError = require("../errors/internalServerError");
const { Customers } = require("../models/customerOneModel");
const { McapErrorMessage } = require("../models/mcapErrorMessageModel");
const { mcapUrlTask, mcapUrlData, restApiId } = require("../../api/constants");
const mcapUsername = CONFIG.mcapUsername;
const mcapUserpwd = CONFIG.mcapUserpwd;


class UnexpectedError extends Error {
    constructor(status, message) {
        super(status);
        super(message);
    }
}

class ConfigurationFailedError extends Error {
    constructor(message, failedConfigData) {
        super(message);
        this._failedConfigData = failedConfigData;
    }

    get failedConfigData() {
        return this._failedConfigData;
    }
}

/*
 * Options suitable for `http(s).request`. These are used to make the request to
 * the proxy server.
 */
exports.getHttpsAgent = () => new HttpsProxyAgent(proxyServer);


exports.getListOfScripts = async (req, res) => {
    loggerPino.info("****************************GETLISTOFSCRIPTS************************");

    try {
        const result = await exports.getListOfScriptsFromMcapAsPromise();
        if (result) {
            const resultFinal = JSON.parse(result);
            const filteredArray = await exports.filterSripts(resultFinal);
            const filteredArrayFinal = await exports.formatResult(filteredArray);
            schedulerController.updateStatusAndResult(req.body.pid, "OK", statuses.ok, filteredArrayFinal);
            return;
        }
        schedulerController.updateStatusAndResult(req.body.pid, "Error", "500", "No result from getListOfScript function");
        loggerPino.error("No result from getListOfScript function");
    } catch (err) {
        loggerPino.error(err);
        if (err instanceof InternalServerError) {
            schedulerController.updateStatusAndResult(req.body.pid, "Error", statuses.internalServerError, err.message);
        }
        if (err instanceof GateWayTimeOut) {
            schedulerController.updateStatusAndResult(req.body.pid, "Error", statuses.gateWayTimeOut, err.message);
        }
        if (err instanceof BadRequest) {
            schedulerController.updateStatusAndResult(req.body.pid, "Error", statuses.badRequest, err.message);
        }
        if (err instanceof ServiceUnavailable) {
            schedulerController.updateStatusAndResult(req.body.pid, "Error", statuses.serviceUnavailable, err.message);
        }
        if (err instanceof UnexpectedError) {
            schedulerController.updateStatusAndResult(req.body.pid, "Error", err.status, err.message);
        }
    }
};

exports.formatResult = async function (scriptsArray) {
    const array = [];
    if (scriptsArray.length > 0) {
        for (scriptArray of scriptsArray) {
            if (scriptArray.name && scriptArray._id) {
                array.push({ "label": scriptArray.name, "value": scriptArray._id });
            }
        }
    }
    return array;
};

exports.filterSripts = async function (scriptsArray) {
    const array = [];
    if (scriptsArray.length > 0) {
        for (scriptArray of scriptsArray) {
            // Local compare if two things are identical returning 0
            if (scriptArray.name &&
                scriptArray.name.split("_")[0].localeCompare("ONE") === 0) {
                array.push(scriptArray);
            }
        }
    }
    return array;
};

exports.getListOfScriptsFromMcapAsPromise = async function () {
    const options = {
        "headers": { "Content-Type": "application/json", "username": `${mcapUsername}`, "userpwd": `${mcapUserpwd}` },
        "proxy": false,
        "httpsAgent": exports.getHttpsAgent(),
    };
    const listOfMcapScripts = await axios.post(
        mcapUrlData,
        {
            "command": "infoDocuments",
            "listScripts": true,
            "restApiId": restApiId
        },
        options
    );

    if (listOfMcapScripts.status == statuses.gateWayTimeOut) {
        throw new GateWayTimeOut("Connection closed without response");
    }

    if (listOfMcapScripts.status == statuses.serviceUnavailable) {
        throw new ServiceUnavailable("MCAP is not available");
    }

    if (listOfMcapScripts.status == statuses.internalServerError) {
        throw new InternalServerError("Internal error on MCAP");
    }

    if (listOfMcapScripts.status == statuses.badRequest) {
        throw new BadRequest("Request to MCAP failed");
    }
    if (listOfMcapScripts.status <= 299 && listOfMcapScripts.status >= 200) {
        return JSON.stringify(listOfMcapScripts.data);
    } else {
        loggerPino.error(listOfMcapScripts.status);
        loggerPino.error(listOfMcapScripts.message);
        throw new UnexpectedError(listOfMcapScripts.status, listOfMcapScripts.message);
    }

};

// START RUN SCRIPTS FROM MCAP //
exports.runMcapScript = [
    [
        query("scriptId").trim(),
        check("scriptId").isLength({ "min": 1, "max": 255 }),
        header(constants.header_one_type).trim(),
        header(constants.header_one_type).notEmpty().equals(constants.one_type)
    ], async (req, res) => {
        loggerPino.info("****************************RUNMCAPSCRIPT************************");
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            schedulerController.updateStatusAndResult(req.body.pid, "Error", statuses.unprocessableEntity, errors);
            throw new Error("Internal error - run mcap script!");
        }
        const scriptName = req.query.scriptId.split(":")[1];
        if (scriptName.split("_")[0].localeCompare("ONE") !== 0) {
            schedulerController.updateStatusAndResult(req.body.pid, "Error", statuses.unprocessableEntity, "Unprocessable entity!");
        } else {
            try {
                const response = await exports.callrunMcapScriptAsPromise(req);
                schedulerController.updateStatusAndResult(req.body.pid, "OK", statuses.ok, response);
                return;
            } catch (err) {
                loggerPino.error(err);
                if (err instanceof InternalServerError) {
                    schedulerController.updateStatusAndResult(req.body.pid, "Error", statuses.internalServerError, err.message);
                }
                if (err instanceof GateWayTimeOut) {
                    schedulerController.updateStatusAndResult(req.body.pid, "Error", statuses.gateWayTimeOut, err.message);
                }
                if (err instanceof BadRequest) {
                    schedulerController.updateStatusAndResult(req.body.pid, "Error", statuses.badRequest, err.message);
                }
                if (err instanceof ServiceUnavailable) {
                    schedulerController.updateStatusAndResult(req.body.pid, "Error", statuses.serviceUnavailable, err.message);
                }
                if (err instanceof UnexpectedError) {
                    schedulerController.updateStatusAndResult(req.body.pid, "Error", err.status, err.message);
                }
            }
        }
    }
];

exports.callrunMcapScriptAsPromise = async function (req) {
    const { data } = req.body.actionData;
    let result;
    try {
        for (i = 1; i <= numberOfRetries; i++) {
            result = await exports.runMcapScriptAsPromise(data, req);
            if (result && result.length > 0) {
                return result;
            }
            if (i == numberOfRetries && result.m_status != "Success" && result.msg != "Completed") {
                throw new Error("All attempts failed to connect MCAP server");
            }
        }
    } catch (err) {
        loggerPino.error(err);
        if (err.status == statuses.gateWayTimeOut) {
            throw new GateWayTimeOut("Connection closed without response");
        }

        if (err.status == statuses.serviceUnavailable) {
            throw new ServiceUnavailable("MCAP is not available");
        }

        if (err.status == statuses.internalServerError) {
            throw new InternalServerError("Internal error on MCAP");
        }

        if (err.status == statuses.badRequest) {
            throw new BadRequest("Request to MCAP failed");
        }
    }
};

exports.runMcapScriptAsPromise = async function (data, req) {
    loggerPino.info("****************************RUNMCAPSCRIPT************************");
    const { scriptId } = req.query;
    const { hostname } = data;
    const { dms_server } = data;
    const credentialId = data.mcapCredentialId;

    const options = {
        "headers": { "Content-Type": "application/json", "username": `${mcapUsername}`, "userpwd": `${mcapUserpwd}` },
        "proxy": false,
        "httpsAgent": exports.getHttpsAgent(),
    };
    const runMcapScripts = await axios.post(
        mcapUrlTask, {
        "command": "run",
        dms_server,
        hostname,
        "msg": "request sent",
        scriptId,
        "retryLogin": true,
        "connectWithSSH": true,
        "connectWithTelnet": true,
        "restApiId": restApiId,
        credentialId,
        "credentialPassphrase": configPassPhrase
    }, options
    );

    if (runMcapScripts.status == statuses.gateWayTimeOut) {
        throw new GateWayTimeOut("Connection closed without response");
    }

    if (runMcapScripts.status == statuses.serviceUnavailable) {
        throw new ServiceUnavailable("MCAP is not available");
    }

    if (runMcapScripts.status == statuses.internalServerError) {
        throw new InternalServerError("Internal error on MCAP");
    }

    if (runMcapScripts.status == statuses.badRequest) {
        throw new BadRequest("Request to MCAP failed");
    }

    if (runMcapScripts.status <= 299 && runMcapScripts.status >= 200) {
        const rawOutput = (runMcapScripts.data.worklistObj || {}).worklistRowsSelectedAr || "error in output";
        return rawOutput;
    } else {
        loggerPino.error(runMcapScripts.status);
        loggerPino.error(runMcapScripts.message);
        throw new UnexpectedError(runMcapScripts.status, runMcapScripts.message);
    }
};
// END RUN SCRIPTS FROM MCAP //

// START GET HOSTNAMES BY ACTION ID //
exports.callGetHostnameAsPromise = async (queryHostname) => {

    try {
        const result = await exports.getHostnameAsPromise(queryHostname);
        if (result && result.length > 0) {
            return result;
        }
    } catch (error) {
        loggerPino.error(error);
        throw new Error("Error while executing get hostnames function!");
    }
};

exports.getHostnameAsPromise = async (queryHostname) => {
    loggerPino.info(
        "****************************GETHOSTNAMESBYCUSTOMERASPROMISE************************"
    );

    /*
     * Add regex to substring customer name replace all character after special character
     * becuase in query is the regex, which can not work with it
     * added the wildcard .*
     */
    try {
        const options = {
            "headers": { "Content-Type": "application/json", "username": `${mcapUsername}`, "userpwd": `${mcapUserpwd}` },
            "proxy": false,
            "httpsAgent": exports.getHttpsAgent(),
        };
        const response = await axios.post(
            mcapUrlData,
            {
                "mysqlCommand": "getHostnameDetails",
                "command": "mysqlCommand",
                "retryLogin": true,
                "connectWithSSH": true,
                "connectWithTelnet": true,
                "credentialId": "default",
                "restApiId": restApiId
            },
            options
        );
        if (response.status !== statuses.ok) {
            return new Error("Error in getting hostnames from Action DB, MCAP call failed!");
        }

        let db2sequelize;
        try {
            // TODO: Action DB has moved to Azure on action-eastus2-prod-app-action-mysql.mysql.database.azure.com
            // Add an Alias of att.com and change the below code accordingly

            const { host, port } = CONFIG.actionDB;
            const { dbName, dbUser, dbPassword } = response.data;

            db2sequelize = new Sequelize(dbName, dbUser, dbPassword,
                {
                    "host": host,
                    "port": port,
                    "dialect": "mysql"
                }
            );

            // Define the query template locally
            const HOSTNAME_QUERY_TEMPLATE = `
                SELECT a.hostname, a.ip, a.dms_server
                FROM info_current as a 
                LEFT OUTER JOIN action_db.variable_table v 
                ON (a.act_map = v.var_customer) 
                WHERE a.hostname = ? 
                AND a.is_active = '1'
                LIMIT 100000
            `;

            // Use exact matching instead of REGEXP
            const data = await db2sequelize.query(HOSTNAME_QUERY_TEMPLATE, {
                "replacements": [queryHostname],
                "nest": true,
                "type": QueryTypes.SELECT,
            });
            loggerPino.info(`Recieved Poler and IP for ${data.length} Hosts`);
            return data;
        } catch (error) {
            loggerPino.error(error);
            throw new Error("Connection to Action DB failed!");
        } finally {
            db2sequelize.close();
        }
    } catch (err) {
        loggerPino.error(err);
        throw new Error("Internal server error!");
    }
};
// END GET HOSTNAMES BY ACTION ID //

// START RUN VALIDATION COMMANDS //
exports.runValidation = [
    [
        header(constants.header_one_type).trim(),
        header(constants.header_one_type).notEmpty().equals(constants.one_type)
    ], async (req, res) => {
        loggerPino.info("****************************RUNVALIDATION************************");
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            schedulerController.updateStatusAndResult(req.body.pid, "Error", statuses.unprocessableEntity, errors);
            throw new Error("Internal error - validation!");
        }
        try {
            const response = await exports.callRunValidationAsPromise(req);
            schedulerController.updateStatusAndResult(req.body.pid, "OK", statuses.ok, response);
            return;
        } catch (err) {
            loggerPino.error(err);
            if (err instanceof InternalServerError) {
                schedulerController.updateStatusAndResult(req.body.pid, "Error", statuses.internalServerError, err.message);
            }
            if (err instanceof GateWayTimeOut) {
                schedulerController.updateStatusAndResult(req.body.pid, "Error", statuses.gateWayTimeOut, err.message);
            }
            if (err instanceof BadRequest) {
                schedulerController.updateStatusAndResult(req.body.pid, "Error", statuses.badRequest, err.message);
            }
            if (err instanceof ServiceUnavailable) {
                schedulerController.updateStatusAndResult(req.body.pid, "Error", statuses.serviceUnavailable, err.message);
            }
            if (err instanceof UnexpectedError) {
                schedulerController.updateStatusAndResult(req.body.pid, "Error", err.status, err.message);
            }
        }
    }
];

exports.callRunValidationAsPromise = async (req) => {
    const reqBody = req.body;
    const [
        data, pId, validationData, sessionId
    ] = [
            reqBody.actionData.data,
            reqBody.pid,
            reqBody.validationData,
            reqBody.actionData.sessionId
        ];
    const updatedData = { ...data };
    updatedData.status = transactionStatuses.changeNotCompleted;
    if (data.step === steps.configuration) {
        updatedData.step = steps.postValidation;
    } else {
        updatedData.step = steps.validation;
    }
    await transactionDataHelper.updateTransactionData(sessionId, updatedData);
    try {
        const validationCommands = await transactionDataHelper
            .getValidationCommands(data.actionId, validationData);
        for (i = 1; i <= numberOfRetries; i++) {
            const validationResults = await exports.runValidationAsPromise(data, validationCommands, pId)
            if (i == numberOfRetries) {
                throw new Error("All attempts failed to connect MCAP server");
            }
            return validationResults;
        }
    } catch (error) {
        loggerPino.error(error);
        if (error.status == statuses.gateWayTimeOut) {
            throw new GateWayTimeOut("Connection closed without response");
        }

        if (error.status == statuses.serviceUnavailable) {
            throw new ServiceUnavailable("MCAP is not available");
        }

        if (error.status == statuses.internalServerError) {
            throw new InternalServerError("Internal error on MCAP");
        }

        if (error.status == statuses.badRequest) {
            throw new BadRequest("Request to MCAP failed");
        }

    }
};

exports.runValidationAsPromise = async (data, commands, pid) => {
    loggerPino.info("********Run validation Promise**********");
    let scriptId = null;
    if (data && data.deviceType) {
        const vendor = await exports.findVendorById(data.deviceType);
        const vendorType = (vendor || {}).vendorType || "";
        if (vendorType.toUpperCase().includes(constants.deviceCisco)) {
            loggerPino.info("Run validation cisco");
            scriptId = "tv8985:validation_wrapper:Network:Cisco:IOS";
        } else if (vendorType.toUpperCase().includes(constants.deviceJuniper)) {
            loggerPino.info("Run validation juniper");
            scriptId = "tv8985:junos.validation:Network:Juniper:JunOS";
        } else {
            throw new Error("Vendor type not provided correctly");
        }
    } else {
        throw new Error("Missing vendor information!");
    }
    loggerPino.info("Validation using script:");
    loggerPino.info(scriptId);
    const { hostname } = data;
    const { dms_server } = data;
    const validationCommands = commands;
    const credentialId = data.mcapCredentialId;
    const results = {};


    const options = {
        "headers": { "Content-Type": "application/json", "username": `${mcapUsername}`, "userpwd": `${mcapUserpwd}` },
        "proxy": false,
        "httpsAgent": exports.getHttpsAgent(),
    };
    const validationResults = await axios.post(
        mcapUrlTask,
        {
            "command": "run",
            dms_server,
            hostname,
            "msg": "request sent",
            scriptId,
            "retryLogin": true,
            "connectWithSSH": true,
            "connectWithTelnet": true,
            "restApiId": restApiId,
            credentialId,
            "credentialPassphrase": configPassPhrase,
            "commands": validationCommands
        },
        options
    );

    if (validationResults) {
        if (validationResults.status == statuses.gateWayTimeOut) {
            throw new GateWayTimeOut("Connection closed without response");
        }

        if (validationResults.status == statuses.serviceUnavailable) {
            throw new ServiceUnavailable("MCAP is not available");
        }

        if (validationResults.status == statuses.internalServerError) {
            throw new InternalServerError("Internal error on MCAP");
        }

        if (validationResults.status == statuses.badRequest) {
            throw new BadRequest("Request to MCAP failed");
        }

        if (validationResults.status <= 299 && validationResults.status >= 200) {
            if (validationResults.data) {
                // If mcap return error there is not var_result object
                if ("worklistObj" in validationResults.data && "worklistRowsSelectedAr" in validationResults.data["worklistObj"]) {
                    for (let result of validationResults.data["worklistObj"]["worklistRowsSelectedAr"]) {
                        let output = JSON.stringify({
                            "command": result.command,
                            "output": result.output || "error in output",
                            "id": validationResults.data.id || "empty",
                            "status": validationResults.data.status || "Error",
                            "m_status": result.status || "Error",
                            "message": result.msg || "Internal error"
                        });
                        results[result.command] = output;
                    }
                }

                loggerPino.info("Validation ouput");
                return results
            }
        } else {
            loggerPino.error(validationResults.status);
            loggerPino.error(validationResults.message);
            throw new UnexpectedError(validationResults.status, validationResults.message);
        }
    } else {
        throw new Error("No result from validation")
    }
};
// END RUN VALIDATION COMMANDS //

// START PUSH CONFIG //
exports.pushConfig = [
    [
        header(constants.header_one_type).trim(),
        header(constants.header_one_type).notEmpty().equals(constants.one_type)
    ], async (req, res) => {
        loggerPino.info("****************************PUSHCONFIG************************");
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            loggerPino.error("Unprocessable entity")
            schedulerController.updateStatusAndResult(req.body.pid, "Error", statuses.unprocessableEntity, errors);
        }
        try {
            const response = await exports.callPushConfigAsPromise(req);
            schedulerController.updateStatusAndResult(req.body.pid, "OK", statuses.ok, response);
            return;
        } catch (err) {
            loggerPino.error(err);
            if (err instanceof InternalServerError) {
                schedulerController.updateStatusAndResult(req.body.pid, "Error", statuses.internalServerError, err.message);
            }
            if (err instanceof GateWayTimeOut) {
                schedulerController.updateStatusAndResult(req.body.pid, "Error", statuses.gateWayTimeOut, err.message);
            }
            if (err instanceof BadRequest) {
                schedulerController.updateStatusAndResult(req.body.pid, "Error", statuses.badRequest, err.message);
            }
            if (err instanceof ServiceUnavailable) {
                schedulerController.updateStatusAndResult(req.body.pid, "Error", statuses.serviceUnavailable, err.message);
            }
            if (err instanceof UnexpectedError) {
                schedulerController.updateStatusAndResult(req.body.pid, "Error", err.status, err.message);
            }
            if (err instanceof ConfigurationFailedError) {
                schedulerController.updateStatusAndResult(req.body.pid, "Error", statuses.internalServerError, err);
            }
        }
    }
];

exports.callPushConfigAsPromise = async (req) => {
    const { data } = req.body.actionData;
    const { uuid } = data;
    const sessionID = req.body.actionData.sessionId;
    let carcheTemplateDB;
    const updatedData = { ...data };
    updatedData.step = steps.configuration;
    try {
        const carcheTemplate = await transactionDataHelper
            .getCarcheTemplateForActionTemplate(
                data.actionId
            );
        const actionTemplateData = {
            "sessionId": sessionID,
            "actionId": carcheTemplate.id,
            "templateUUID": uuid
        };
        const carcheGeneratedTemplate = await carcheGCC.getTemplateByIds(actionTemplateData);
        // Validate if the tempalte is not found
        if (carcheGeneratedTemplate && carcheGeneratedTemplate.GENERATED_TEMPLATE) {
            carcheTemplateDB = carcheGeneratedTemplate.GENERATED_TEMPLATE.toString("utf8");
        } else {
            throw new Error("Carche template not found");
        }
    } catch (err) {
        loggerPino.error(err);
        updatedData.status = transactionStatuses.configurationFailed;
        await transactionDataHelper.updateTransactionData(sessionID, updatedData);
        throw new Error("Internal error call push config");
    }
    let result;
    for (i = 1; i <= numberOfRetries; i++) {
        try {
            if (data && data.deviceType) {
                const vendor = await exports.findVendorById(data.deviceType);
                const vendorType = (vendor || {}).vendorType || "";
                if (vendorType.toUpperCase().includes(constants.deviceCisco)) {
                    loggerPino.info("Push config cisco");
                    try {
                        result = await exports.pushConfigAsPromiseCisco(data, carcheTemplateDB);
                    } catch (error) {
                        if (error._failedConfigData) {
                            updatedData.status = transactionStatuses.configurationFailed;
                            updatedData.result = error._failedConfigData;
                            await transactionDataHelper.updateTransactionData(sessionID, updatedData);
                            loggerPino.error(error);
                            throw new ConfigurationFailedError("Error in configuration script", error._failedConfigData);
                        } else {
                            loggerPino.error(error);
                            if (error.status == statuses.gateWayTimeOut) {
                                throw new GateWayTimeOut("Connection closed without response");
                            }

                            if (error.status == statuses.serviceUnavailable) {
                                throw new ServiceUnavailable("MCAP is not available");
                            }

                            if (error.status == statuses.internalServerError) {
                                throw new InternalServerError("Internal error on MCAP");
                            }

                            if (error.status == statuses.badRequest) {
                                throw new BadRequest("Request to MCAP failed");
                            }
                        }
                    }
                } else if (vendorType.toUpperCase().includes(constants.deviceJuniper)) {
                    loggerPino.info("Push config juniper");
                    result = await exports.pushConfigAsPromiseJuniper(data, carcheTemplateDB);
                } else {
                    throw new Error("Vendor type not provided correctly");
                }
            } else {
                throw new Error("Missing vendor information!");
            }
            loggerPino.info("Push config result");
            loggerPino.info(result);
            result = JSON.parse(result);
            if (result.m_status == "Success" && result.msg == "Completed") {
                updatedData.configurationMcapId = result.id;
                updatedData.status = transactionStatuses.configuration;
                await transactionDataHelper.updateTransactionData(sessionID, updatedData);
                return result;
            }
            if (i == numberOfRetries && result.m_status != "Success" && result.msg != "Completed") {
                throw new Error("Internal error call push config");
            }
        } catch (error) {
            if (error._failedConfigData) {
                updatedData.status = transactionStatuses.configurationFailed;
                updatedData.result = error._failedConfigData;
                await transactionDataHelper.updateTransactionData(sessionID, updatedData);
                loggerPino.error(error);
                throw new ConfigurationFailedError("Error in configuration script", error._failedConfigData);
            } else {
                updatedData.status = transactionStatuses.configurationFailed;
                await transactionDataHelper.updateTransactionData(sessionID, updatedData);
                loggerPino.error(error);
                if (error.status == statuses.gateWayTimeOut) {
                    throw new GateWayTimeOut("Connection closed without response");
                }

                if (error.status == statuses.serviceUnavailable) {
                    throw new ServiceUnavailable("MCAP is not available");
                }

                if (error.status == statuses.internalServerError) {
                    throw new InternalServerError("Internal error on MCAP");
                }

                if (error.status == statuses.badRequest) {
                    throw new BadRequest("Request to MCAP failed");
                }
                if (error.status != statuses.badRequest || error.status != statuses.internalServerError || error.status != statuses.serviceUnavailable || error.status != statuses.gateWayTimeOut) {
                    throw new Error("Internal error call push config");
                }
            }
        }
    }
};

exports.pushConfigAsPromiseCisco = async (data, carcheTemplateDB) => {
    loggerPino.info("****************************PUSHCONFIG AS PROMISE************************");
    const scriptId = "tv8985:config:Network:Cisco:IOS";
    const { hostname } = data;
    const { dms_server } = data;
    let commands = carcheTemplateDB;
    const credentialId = data.mcapCredentialId;

    const options = {
        "headers": { "Content-Type": "application/json", "username": `${mcapUsername}`, "userpwd": `${mcapUserpwd}` },
        "proxy": false,
        "httpsAgent": exports.getHttpsAgent(),
    };
    commands = commands.replace(/\t/g, " ");
    commands = commands.replace(/^!.*/gm, "")
    const pushConfigResult = await axios.post(
        mcapUrlTask,
        {
            "command": "run",
            dms_server,
            hostname,
            "msg": "request sent",
            scriptId,
            "retryLogin": true,
            "connectWithSSH": true,
            "connectWithTelnet": true,
            "restApiId": restApiId,
            credentialId,
            "credentialPassphrase": configPassPhrase,
            commands
        },
        options
    );

    if (pushConfigResult.status == statuses.gateWayTimeOut) {
        throw new GateWayTimeOut("Connection closed without response");
    }

    if (pushConfigResult.status == statuses.serviceUnavailable) {
        throw new ServiceUnavailable("MCAP is not available");
    }

    if (pushConfigResult.status == statuses.internalServerError) {
        throw new InternalServerError("Internal error on MCAP");
    }

    if (pushConfigResult.status == statuses.badRequest) {
        throw new BadRequest("Request to MCAP failed");
    }
    if (pushConfigResult.status <= 299 && pushConfigResult.status >= 200) {
        let mcapErrorMessages = [];
        try {
            const mcapErrorMessagesDb = await McapErrorMessage.findAll({
                attributes: ["MESSAGE"],
            })
            for (errorMessage of mcapErrorMessagesDb) {
                mcapErrorMessages.push({ message: errorMessage["dataValues"]["MESSAGE"] })
            }

        } catch (error) {
            throw new Error(error);
        }
        if (pushConfigResult.data) {
            if (pushConfigResult.data.worklistObj && pushConfigResult.data.worklistObj.worklistRowsSelectedAr) {
                pushConfigResult.data.worklistObj.worklistRowsSelectedAr.forEach(
                    (output) => {
                        for (errorMessage of mcapErrorMessages) {
                            if (output.output && (output.output.includes(errorMessage))) {
                                const failedConfigData = {
                                    command: output.command,
                                    commandOutput: output.output,
                                    errorMessage: errorMessage
                                };
                                throw new ConfigurationFailedError(
                                    "Error in configuration script",
                                    failedConfigData
                                );
                            }
                        }
                    }
                );
            }
            if (pushConfigResult.data.worklistObj && pushConfigResult.data.worklistObj.worklistRowsSelectedAr) {
                pushConfigResult.data.worklistObj.worklistRowsSelectedAr.forEach(
                    (output) => {
                        if (
                            output.output && output.output.includes("All protocols attempted and failed.")
                        ) {
                            return;
                        }
                    }
                );
            }

            const pushConfig =
                ((pushConfigResult.data.worklistObj || {}).worklistRowsSelectedAr ||
                    [])[0] || {};
            const output = {
                command: pushConfig.command,
                commandOutput: pushConfig.output,
                m_status: pushConfig.status || "Error",
                msg: pushConfig.msg || "Internal error",
                id: pushConfigResult.data.id || "empty",
                status: pushConfigResult.data.status || "Error",
            };

            return JSON.stringify(output);
        }
    } else {
        loggerPino.error(pushConfigResult.status);
        loggerPino.error(pushConfigResult.message);
        throw new UnexpectedError(pushConfigResult.status, pushConfigResult.message);
    }
};

exports.pushConfigAsPromiseJuniper = async (data, carcheTemplateDB) => {
    loggerPino.info("****************************PUSHCONFIG AS PROMISE************************");
    const scriptId = "tv8985:junos.configuration:Network:Juniper:JunOS";
    const { hostname } = data;
    const { dms_server } = data;
    const commands = carcheTemplateDB;
    const rollbackTime = "10";
    const credentialId = data.mcapCredentialId;

    try {
        const options = {
            "headers": { "Content-Type": "application/json", "username": `${mcapUsername}`, "userpwd": `${mcapUserpwd}` },
            "proxy": false,
            "httpsAgent": exports.getHttpsAgent(),
        };

        const response = await axios.post(
            mcapUrlTask,
            {
                "command": "run",
                dms_server,
                hostname,
                "msg": "request sent",
                scriptId,
                "retryLogin": true,
                "connectWithSSH": true,
                "connectWithTelnet": true,
                "restApiId": restApiId,
                credentialId,
                "credentialPassphrase": configPassPhrase,
                commands,
                rollbackTime
            },
            options
        );
        if (response) {
            const pushConfigResult = response.data;
            if (response.status <= 299 && response.status >= 200) {
                if (pushConfigResult) {
                    const pushConfig = ((pushConfigResult.worklistObj || {}).worklistRowsSelectedAr || [])[0] || {};
                    const output = JSON.stringify({
                        "commandOutput": pushConfig.var_results || "error in output",
                        "m_status": pushConfig.status || "Error",
                        "msg": pushConfig.msg || "Internal error",
                        "id": pushConfigResult.id || "empty",
                        "status": pushConfigResult.status || "Error"
                    });
                    return output;
                }
                throw new Error("Fatal error");
            }
            if (response.status > 299 && response.status < 599) {
                loggerPino.error("Push config juniper script error!");
                loggerPino.info("Whole response of the request");
                loggerPino.info(response.status);
                loggerPino.info(str(pushConfigResult));
                throw new Error("Push config juniper script error!");
            } else {
                loggerPino.error("Push config juniperscript error!");
                loggerPino.info("Whole response of the request");
                loggerPino.info(response.status);
                loggerPino.info(str(pushConfigResult));
                throw new Error("Push config juniper script error!");
            }
        } else {
            loggerPino.error("Response missing from push config juniper!");
            loggerPino.info("Whole response of the request");
            loggerPino.info(response);
            throw new Error("Push config juniper script error!");
        }
    } catch (err) {
        loggerPino.error(err);
        throw new Error("Internal server error!");
    }
};
// END PUSH CONFIG //

// START SET ROLLBACK //
exports.setRollback = [
    [
        header(constants.header_one_type).trim(),
        header(constants.header_one_type).notEmpty().equals(constants.one_type)
    ], async (req, res) => {
        loggerPino.info("************************SETROLLBACK**GETARCHIVENAME***********************");
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            loggerPino.error("Unprocessable entity error");
            schedulerController.updateStatusAndResult(req.body.pid, "Error", statuses.unprocessableEntity, errors);
        }
        try {
            const response = await exports.callSetRollbackAsPromise(req);
            schedulerController.updateStatusAndResult(req.body.pid, "OK", statuses.ok, response);
            return;
        } catch (err) {
            loggerPino.error(err);
            if (err instanceof InternalServerError) {
                schedulerController.updateStatusAndResult(req.body.pid, "Error", statuses.internalServerError, err.message);
            }
            if (err instanceof GateWayTimeOut) {
                schedulerController.updateStatusAndResult(req.body.pid, "Error", statuses.gateWayTimeOut, err.message);
            }
            if (err instanceof BadRequest) {
                schedulerController.updateStatusAndResult(req.body.pid, "Error", statuses.badRequest, err.message);
            }
            if (err instanceof ServiceUnavailable) {
                schedulerController.updateStatusAndResult(req.body.pid, "Error", statuses.serviceUnavailable, err.message);
            }
            if (err instanceof UnexpectedError) {
                schedulerController.updateStatusAndResult(req.body.pid, "Error", err.status, err.message);
            }
        }
    }
];

exports.callSetRollbackAsPromise = async (req) => {
    const reqBody = req.body.actionData;
    const [data, sessionId] = [reqBody.data, reqBody.sessionId];
    let result;
    const updatedData = { ...data };
    updatedData.step = steps.setCheckPoint;
    for (i = 1; i <= numberOfRetries; i++) {
        try {
            if (data && data.deviceType) {
                const vendor = await exports.findVendorById(data.deviceType);
                const vendorType = (vendor || {}).vendorType || "";
                if (vendorType.toUpperCase().includes(constants.deviceCisco)) {
                    loggerPino.info("Set rollback cisco");
                    result = await exports.setRollbackAsPromise(data);
                } else {
                    throw new Error("Vendor type not provided correctly");
                }
            } else {
                throw new Error("Missing vendor information!");
            }
            loggerPino.info("Set rollback result");
            loggerPino.info(result);
            result = JSON.parse(result);
            if (result.m_status == "Success" && result.msg == "Completed") {
                updatedData.status = transactionStatuses.setCheckpoint;
                await transactionDataHelper.updateTransactionData(sessionId, updatedData);
                return result;
            }
            if (i == numberOfRetries && result.m_status != "Success" && result.msg != "Completed") {
                throw new Error("Internal error call push config");
            }
        } catch (e) {
            updatedData.status = transactionStatuses.setCheckpointFailed;
            await transactionDataHelper.updateTransactionData(sessionId, updatedData);
            loggerPino.error(e);
            if (e.status == statuses.gateWayTimeOut) {
                throw new GateWayTimeOut("Connection closed without response");
            }

            if (e.status == statuses.serviceUnavailable) {
                throw new ServiceUnavailable("MCAP is not available");
            }

            if (e.status == statuses.internalServerError) {
                throw new InternalServerError("Internal error on MCAP");
            }

            if (e.status == statuses.badRequest) {
                throw new BadRequest("Request to MCAP failed");
            }
        }
    }
};

exports.setRollbackAsPromise = async function (data) {
    loggerPino.info("***********Set Rollback as Promise********");
    const scriptId = "tv8985:setRollbackPrefix:Network:Cisco:IOS";
    const { hostname } = data;
    const { dms_server } = data;
    const credentialId = data.mcapCredentialId;
    const rollbackTime = "10";

    const body = {
        "command": "run",
        dms_server,
        hostname,
        "msg": "request sent",
        scriptId,
        "retryLogin": true,
        "connectWithSSH": true,
        "connectWithTelnet": true,
        "restApiId": restApiId,
        credentialId,
        "credentialPassphrase": configPassPhrase
    };
    const options = {
        "headers": { "Content-Type": "application/json", "username": `${mcapUsername}`, "userpwd": `${mcapUserpwd}` },
        "proxy": false,
        "httpsAgent": exports.getHttpsAgent(),
    };
    const response = await axios.post(
        mcapUrlTask,
        body,
        options
    );

    if (response != null) {
        if (response.status == statuses.gateWayTimeOut) {
            throw new GateWayTimeOut("Connection closed without response");
        }

        if (response.status == statuses.serviceUnavailable) {
            throw new ServiceUnavailable("MCAP is not available");
        }

        if (response.status == statuses.internalServerError) {
            throw new InternalServerError("Internal error on MCAP");
        }

        if (response.status == statuses.badRequest) {
            throw new BadRequest("Request to MCAP failed");
        }

        if (response.status <= 299 && response.status >= 200) {
            const setRollbackOutput = response.data;
            if (response.status <= 299 && response.status >= 200) {
                if (setRollbackOutput) {
                    const setRollback = ((setRollbackOutput.worklistObj || {}).worklistRowsSelectedAr || [])[0] || {};
                    const rawout = setRollback.var_result || "error in output";
                    const status = setRollback.status || "Error";
                    const message = setRollback.msg || "Internal error";

                    if (status != "Success" && message != "Completed") {
                        const resultFromSetRollback1 = JSON.stringify({ "m_status": "Error", "msg": "Error" });
                        return resultFromSetRollback1;
                    }
                    // Only if success check newarchive
                    const regex = /flash:(.*?) <- Most Recent/gm;
                    const match = regex.exec(rawout);
                    // Check if archive is exist

                    if (!match || !match[1]) {
                        const resultFromSetRollback = JSON.stringify({ "m_status": "Error", "msg": "Error" });
                        return resultFromSetRollback;
                    }
                    loggerPino.info("******CALL_START_ROLLBACK");
                    try {
                        const output = await exports.startRollback(data, match[1], rollbackTime);
                        return output;
                    } catch (err) {
                        loggerPino.error(err);
                        if (err instanceof InternalServerError) {
                            throw new InternalServerError("Internal error on MCAP");
                        }
                        if (err instanceof GateWayTimeOut) {
                            throw new GateWayTimeOut("Connection closed without response");
                        }
                        if (err instanceof BadRequest) {
                            throw new BadRequest("Request to MCAP failed");
                        }
                        if (err instanceof ServiceUnavailable) {
                            throw new ServiceUnavailable("MCAP is not available");
                        }
                        if (err instanceof UnexpectedError) {
                            throw new UnexpectedError(err.status, err.message);
                        }
                    }
                } else {
                    throw new Error("Fatal error");
                }
            }
        } else {
            loggerPino.error(response.status);
            loggerPino.error(response.message);
            throw new UnexpectedError(response.status, response.message);
        }
    } else {
        loggerPino.error("Response missing from set rollback!");
        loggerPino.info("Whole response of the request");
        loggerPino.info(response);
        throw new Error("Set rollback script error!");

    }
};

exports.startRollback = async function (data, match, timmer) {
    loggerPino.info("******START_ROLLBACK_FROM_PROMISE");
    const scriptId_set_rollback_timer = "tv8985:startRollbackTimer:Network:Cisco:IOS";
    const { hostname } = data;
    const { dms_server } = data;
    const credentialId = data.mcapCredentialId;

    const body = {
        "command": "run",
        dms_server,
        hostname,
        "msg": "request sent",
        "scriptId": scriptId_set_rollback_timer,
        "retryLogin": true,
        "connectWithSSH": true,
        "connectWithTelnet": true,
        "restApiId": restApiId,
        credentialId,
        "credentialPassphrase": configPassPhrase,
        "msg": "request sent",
        "archiveName": match,
        "rollbackTime": timmer
    };
    const options = {
        "headers": { "Content-Type": "application/json", "username": `${mcapUsername}`, "userpwd": `${mcapUserpwd}` },
        "proxy": false,
        "httpsAgent": exports.getHttpsAgent(),
    };
    const response = await axios.post(
        mcapUrlTask,
        body,
        options
    );

    if (response.status == statuses.gateWayTimeOut) {
        throw new GateWayTimeOut("Connection closed without response");
    }

    if (response.status == statuses.serviceUnavailable) {
        throw new ServiceUnavailable("MCAP is not available");
    }

    if (response.status == statuses.internalServerError) {
        throw new InternalServerError("Internal error on MCAP");
    }

    if (response.status == statuses.badRequest) {
        throw new BadRequest("Request to MCAP failed");
    }

    if (response.status <= 299 && response.status >= 200) {
        if (response) {
            const startRollbackOutput = response.data;
            if (response.status <= 299 && response.status >= 200) {
                if (startRollbackOutput) {
                    const startRollback = ((startRollbackOutput.worklistObj || {}).worklistRowsSelectedAr || [])[0] || {};
                    const output = JSON.stringify({
                        "m_status": startRollback.status || "Error",
                        "msg": startRollback.msg || "Internal error",
                        "result": startRollback.var_result || "error in output"
                    });
                    return output;
                }
                throw new Error("Fatal error");
            }
            if (response.status > 299 && response.status < 599) {
                loggerPino.error("Start rollback script error!");
                loggerPino.info("Whole response of the request");
                loggerPino.info(response.status);
                loggerPino.info(str(startRollbackOutput));
                throw new Error("Start rollback script error!");
            } else {
                loggerPino.error("Start rollback script error!");
                loggerPino.info("Whole response of the request");
                loggerPino.info(response.status);
                loggerPino.info(str(startRollbackOutput));
                throw new Error("Start rollback script error!");
            }
        } else {
            loggerPino.error("Response missing from start rollback!");
            loggerPino.info("Whole response of the request");
            loggerPino.info(response);
            throw new Error("Start rollback script error!");
        }
    } else {
        loggerPino.error(response.status);
        loggerPino.error(response.message);
        throw new UnexpectedError(response.status, response.message);
    }
};

// END SET ROLLBACK //

// STAR ROLLBACK //
exports.rollbackNow = [
    [
        header(constants.header_one_type).trim(),
        header(constants.header_one_type).notEmpty().equals(constants.one_type)
    ], async (req, res) => {
        loggerPino.info("***********ROLBACK NOW *********");
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            schedulerController.updateStatusAndResult(req.body.pid, "Error", "422", errors);
            throw new Error("Internal error - rollback now!");
        }
        try {
            const response = await exports.callRollbackNowAsPromise(req);
            schedulerController.updateStatusAndResult(req.body.pid, "OK", "200", response);
            return;
        } catch (err) {
            loggerPino.error(err);
            if (err instanceof InternalServerError) {
                schedulerController.updateStatusAndResult(req.body.pid, "Error", statuses.internalServerError, err.message);
            }
            if (err instanceof GateWayTimeOut) {
                schedulerController.updateStatusAndResult(req.body.pid, "Error", statuses.gateWayTimeOut, err.message);
            }
            if (err instanceof BadRequest) {
                schedulerController.updateStatusAndResult(req.body.pid, "Error", statuses.badRequest, err.message);
            }
            if (err instanceof ServiceUnavailable) {
                schedulerController.updateStatusAndResult(req.body.pid, "Error", statuses.serviceUnavailable, err.message);
            }
        }
    }
];

exports.callRollbackNowAsPromise = async (req) => {
    const reqBody = req.body.actionData;
    const [data, sessionId] = [reqBody.data, reqBody.sessionId];
    let result;
    const updatedData = { ...data };
    updatedData.step = steps.rollback;
    for (i = 1; i <= numberOfRetries; i++) {
        try {
            if (data && data.deviceType) {
                const vendor = await exports.findVendorById(data.deviceType);
                const vendorType = (vendor || {}).vendorType || "";
                if (vendorType.toUpperCase().includes(constants.deviceCisco)) {
                    loggerPino.info("Rollback now cisco");
                    result = await exports.rollbackNowAsPromise(data);
                } else if (vendorType.toUpperCase().includes(constants.deviceJuniper)) {
                    loggerPino.info("Rollback now juniper");
                    const scriptId = "tv8985:junos.rollback_1:Network:Juniper:JunOS";
                    result = await exports.runScriptJuniper(data, scriptId);
                } else {
                    throw new Error("Vendor type not provided correctly");
                }
            } else {
                throw new Error("Missing vendor information!");
            }
            loggerPino.info("Rollback now result");
            loggerPino.info(result);
            result = JSON.parse(result);
            if (result.m_status == "Success" && result.msg == "Completed") {
                updatedData.status = transactionStatuses.rollback;
                await transactionDataHelper.updateTransactionData(sessionId, updatedData);
                return result;
            }
            if (i == numberOfRetries && result.m_status != "Success" && result.msg != "Completed") {
                throw new Error("All attempts failed to connect MCAP server");
            }
        } catch (error) {
            updatedData.status = transactionStatuses.rollbackFailed;
            await transactionDataHelper.updateTransactionData(sessionId, updatedData);
            loggerPino.error(err);
            if (err instanceof InternalServerError) {
                throw new InternalServerError("Internal error on MCAP");
            }
            if (err instanceof GateWayTimeOut) {
                throw new GateWayTimeOut("Connection closed without response");
            }
            if (err instanceof BadRequest) {
                throw new BadRequest("Request to MCAP failed");
            }
            if (err instanceof ServiceUnavailable) {
                throw new ServiceUnavailable("MCAP is not available");
            }
            if (err instanceof UnexpectedError) {
                throw new UnexpectedError(err.status, err.message);
            }
        }
    }
};

exports.rollbackNowAsPromise = async (data) => {
    loggerPino.info("*********ROLLBACK NOW AS PROMISE********");
    const scriptId = "tv8985:getArchiveName:Network:Cisco:IOS";
    const { hostname } = data;
    const { dms_server } = data;
    const credentialId = data.mcapCredentialId;


    const body = {
        "command": "run",
        dms_server,
        hostname,
        "msg": "request sent",
        scriptId,
        "retryLogin": true,
        "connectWithSSH": true,
        "connectWithTelnet": true,
        "restApiId": restApiId,
        credentialId,
        "credentialPassphrase": configPassPhrase,
        "msg": "request sent"
    };
    const options = {
        "headers": { "Content-Type": "application/json", "username": `${mcapUsername}`, "userpwd": `${mcapUserpwd}` },
        "proxy": false,
        "httpsAgent": exports.getHttpsAgent(),
    };
    const response = await axios.post(
        mcapUrlTask,
        body,
        options
    );

    if (response.status == statuses.gateWayTimeOut) {
        throw new GateWayTimeOut("Connection closed without response");
    }

    if (response.status == statuses.serviceUnavailable) {
        throw new ServiceUnavailable("MCAP is not available");
    }

    if (response.status == statuses.internalServerError) {
        throw new InternalServerError("Internal error on MCAP");
    }

    if (response.status == statuses.badRequest) {
        throw new BadRequest("Request to MCAP failed");
    }

    if (response.status <= 299 && response.status >= 200) {
        if (response) {
            const rollbackNowOutput = response.data;
            if (response.status <= 299 && response.status >= 200) {
                if (rollbackNowOutput) {
                    const rollbackNow = ((rollbackNowOutput.worklistObj || {}).worklistRowsSelectedAr || [])[0] || {};
                    const rawout = rollbackNow.var_result || "error in output";
                    const status = rollbackNow.status || "Error";
                    const message = rollbackNow.msg || "Internal error";


                    if (status != "Success" && message != "Completed") {
                        const resultFromRollbackNow1 = JSON.stringify({ "m_status": "Error", "msg": "Error" });
                        return resultFromRollbackNow1;
                    }
                    const regex = /flash:(.*?) <- Most Recent/gm;
                    const match = regex.exec(rawout);

                    if (!match || !match[1]) {
                        const resultFromSetRollback = JSON.stringify({ "m_status": "Error", "msg": "Error" });
                        return resultFromSetRollback;
                    }
                    loggerPino.info("******CALL_START_ROLLBACK_NOW");
                    try {
                        const output = await exports.startRollbackNow(data, match[1]);
                        return output;
                    } catch (err) {
                        loggerPino.error("Error in startRollbackNow function")
                        loggerPino.error(err);
                        if (err instanceof InternalServerError) {
                            throw new InternalServerError("Internal error on MCAP");
                        }
                        if (err instanceof GateWayTimeOut) {
                            throw new GateWayTimeOut("Connection closed without response");
                        }
                        if (err instanceof BadRequest) {
                            throw new BadRequest("Request to MCAP failed");
                        }
                        if (err instanceof ServiceUnavailable) {
                            throw new ServiceUnavailable("MCAP is not available");
                        }
                        if (err instanceof UnexpectedError) {
                            throw new UnexpectedError(err.status, err.message);
                        }
                    }
                } else {
                    throw new Error("Fatal error");
                }
            }
        } else {
            loggerPino.error("Response missing from rollback now!");
            loggerPino.info("Whole response of the request");
            loggerPino.info(response);
            throw new Error("Rollback now script error!");
        }
    } else {
        loggerPino.error(response.status);
        loggerPino.error(response.message);
        throw new UnexpectedError(response.status, response.message);
    }
};

exports.startRollbackNow = async function (data, match) {
    loggerPino.info("******START_ROLLBACKNOW_PROMISE");
    const scriptId_rollbackNow = "tv8985:rollbackNowPrefix:Network:Cisco:IOS";
    const { hostname } = data;
    const { dms_server } = data;
    const credentialId = data.mcapCredentialId;


    const body = {
        "command": "run",
        dms_server,
        hostname,
        "msg": "request sent",
        "scriptId": scriptId_rollbackNow,
        "retryLogin": true,
        "connectWithSSH": true,
        "connectWithTelnet": true,
        "restApiId": restApiId,
        credentialId,
        "credentialPassphrase": configPassPhrase,
        "msg": "request sent",
        "archiveName": match
    };
    const options = {
        "headers": { "Content-Type": "application/json", "username": `${mcapUsername}`, "userpwd": `${mcapUserpwd}` },
        "proxy": false,
        "httpsAgent": exports.getHttpsAgent(),
    };
    const response = await axios.post(
        mcapUrlTask,
        body,
        options
    );

    if (response) {
        if (response.status == statuses.gateWayTimeOut) {
            throw new GateWayTimeOut("Connection closed without response");
        }

        if (response.status == statuses.serviceUnavailable) {
            throw new ServiceUnavailable("MCAP is not available");
        }

        if (response.status == statuses.internalServerError) {
            throw new InternalServerError("Internal error on MCAP");
        }

        if (response.status == statuses.badRequest) {
            throw new BadRequest("Request to MCAP failed");
        }

        const startRollbackNowOutput = response.data;
        if (response.status <= 299 && response.status >= 200) {
            if (startRollbackNowOutput) {
                const startRollbackNow = ((startRollbackNowOutput.worklistObj || {}).worklistRowsSelectedAr || [])[0] || {};
                const output = JSON.stringify({
                    "m_status": startRollbackNow.status || "Error",
                    "msg": startRollbackNow.msg || "Internal error",
                    "result": startRollbackNow.var_result || "error in output"
                });
                return output;
            }
        } else {
            loggerPino.error(response.status);
            loggerPino.error(response.message);
            throw new UnexpectedError(response.status, response.message);
        }
    } else {
        loggerPino.error("Response missing from set rollback!");
        loggerPino.info("Whole response of the request");
        loggerPino.info(response);
        throw new Error("Start rollback now script error!");
    }

};


// END ROLLBACK //

// START CONFIRM CHANGE //
exports.confirmChange = [
    [
        header(constants.header_one_type).trim(),
        header(constants.header_one_type).notEmpty().equals(constants.one_type)
    ], async (req, res) => {
        loggerPino.info("***********CONFIRM CHANGE*********");
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            schedulerController.updateStatusAndResult(req.body.pid, "Error", "422", errors);
            throw new Error("Internal error - confirm change!");
        }
        try {
            const response = await exports.callConfirmChangeAsPromise(req);
            schedulerController.updateStatusAndResult(req.body.pid, "OK", "200", response);
            return;
        } catch (err) {
            loggerPino.error(err);
            if (err instanceof InternalServerError) {
                schedulerController.updateStatusAndResult(req.body.pid, "Error", statuses.internalServerError, err.message);
            }
            if (err instanceof GateWayTimeOut) {
                schedulerController.updateStatusAndResult(req.body.pid, "Error", statuses.gateWayTimeOut, err.message);
            }
            if (err instanceof BadRequest) {
                schedulerController.updateStatusAndResult(req.body.pid, "Error", statuses.badRequest, err.message);
            }
            if (err instanceof ServiceUnavailable) {
                schedulerController.updateStatusAndResult(req.body.pid, "Error", statuses.serviceUnavailable, err.message);
            }
        }
    }
];

exports.callConfirmChangeAsPromise = async (req) => {
    let result;
    const reqBody = req.body.actionData;
    const [data, sessionId] = [reqBody.data, reqBody.sessionId];
    const updatedData = { ...data };
    updatedData.step = steps.confirm;
    for (i = 1; i <= numberOfRetries; i++) {
        try {
            if (data && data.deviceType) {
                const vendor = await exports.findVendorById(data.deviceType);
                const vendorType = (vendor || {}).vendorType || "";
                if (vendorType.toUpperCase().includes(constants.deviceCisco)) {
                    loggerPino.info("Confirm change cisco");
                    result = await exports.confirmChangeAsPromise(data);
                } else if (vendorType.toUpperCase().includes(constants.deviceJuniper)) {
                    loggerPino.info("Confirm change juniper");
                    const scriptId = "tv8985:junos.commit:Network:Juniper:JunOS";
                    result = await exports.runScriptJuniper(data, scriptId);
                } else {
                    throw new Error("Vendor type not provided correctly");
                }
            } else {
                throw new Error("Missing vendor information!");
            }
            loggerPino.info("Confirm change result");
            loggerPino.info(result);
            result = JSON.parse(result);
            if (result.m_status == "Success" && result.msg == "Completed") {
                updatedData.status = transactionStatuses.confirmed;
                await transactionDataHelper.updateTransactionData(sessionId, updatedData);
                return result;
            }
            if (i == numberOfRetries && result.m_status != "Success" && result.msg != "Completed") {
                throw new Error("Internal error call set rollback");
            }
        } catch (err) {
            updatedData.status = transactionStatuses.confirmFailed;
            await transactionDataHelper.updateTransactionData(sessionId, updatedData);
            loggerPino.error(err);
            if (err instanceof InternalServerError) {
                throw new InternalServerError("Internal error on MCAP");
            }
            if (err instanceof GateWayTimeOut) {
                throw new GateWayTimeOut("Connection closed without response");
            }
            if (err instanceof BadRequest) {
                throw new BadRequest("Request to MCAP failed");
            }
            if (err instanceof ServiceUnavailable) {
                throw new ServiceUnavailable("MCAP is not available");
            }
            if (err instanceof UnexpectedError) {
                throw new UnexpectedError(err.status, err.message);
            };
        }
    }
};

exports.confirmChangeAsPromise = async (data) => {
    loggerPino.info("************CONFIRM CHANGE AS PROMISE*************");
    const scriptId = "tv8985:getArchiveName:Network:Cisco:IOS";
    const { hostname } = data;
    const { dms_server } = data;
    const credentialId = data.mcapCredentialId;

    const body = {
        "command": "run",
        dms_server,
        hostname,
        "msg": "request sent",
        scriptId,
        "retryLogin": true,
        "connectWithSSH": true,
        "connectWithTelnet": true,
        "restApiId": restApiId,
        credentialId,
        "credentialPassphrase": configPassPhrase,
        "msg": "request sent"
    };
    const options = {
        "headers": { "Content-Type": "application/json", "username": `${mcapUsername}`, "userpwd": `${mcapUserpwd}` },
        "proxy": false,
        "httpsAgent": exports.getHttpsAgent(),
    };
    const response = await axios.post(
        mcapUrlTask,
        body,
        options
    );

    if (response) {

        if (response.status == statuses.gateWayTimeOut) {
            throw new GateWayTimeOut("Connection closed without response");
        }

        if (response.status == statuses.serviceUnavailable) {
            throw new ServiceUnavailable("MCAP is not available");
        }

        if (response.status == statuses.internalServerError) {
            throw new InternalServerError("Internal error on MCAP");
        }

        if (response.status == statuses.badRequest) {
            throw new BadRequest("Request to MCAP failed");
        }

        const confirmChangeOutput = response.data;
        if (response.status <= 299 && response.status >= 200) {
            if (confirmChangeOutput) {
                const confirmChange = ((confirmChangeOutput.worklistObj || {}).worklistRowsSelectedAr || [])[0] || {};
                const rawout = confirmChange.var_result || "error in output";
                const status = confirmChange.status || "Error";
                const message = confirmChange.msg || "Internal error";


                if (status != "Success" && message != "Completed") {
                    const resultFromConfirmChange1 = JSON.stringify({ "m_status": "Error", "msg": "Error" });
                    return resultFromConfirmChange1;
                }
                const regex = /flash:(.*?) <- Most Recent/gm;
                const match = regex.exec(rawout);

                if (!match || !match[1]) {
                    const resultFromConfirmChange = JSON.stringify({ "m_status": "Error", "msg": "Error" });
                    return resultFromConfirmChange;
                }
                loggerPino.info("******CALL_DELETE_ROLLBACK");
                try {
                    const output = await exports.deleteRollback(data, match[1]);
                    return output;
                } catch (err) {
                    loggerPino.error(err);
                    loggerPino.error("Error in delete rollback function");
                    if (err instanceof InternalServerError) {
                        throw new InternalServerError("Internal error on MCAP");
                    }
                    if (err instanceof GateWayTimeOut) {
                        throw new GateWayTimeOut("Connection closed without response");
                    }
                    if (err instanceof BadRequest) {
                        throw new BadRequest("Request to MCAP failed");
                    }
                    if (err instanceof ServiceUnavailable) {
                        throw new ServiceUnavailable("MCAP is not available");
                    }
                    if (err instanceof UnexpectedError) {
                        throw new UnexpectedError(err.status, err.message);
                    }
                }
            } else {
                throw new Error("Fatal error");
            }
        } else {
            loggerPino.error(response.status);
            loggerPino.error(response.message);
            throw new UnexpectedError(response.status, response.message);
        }

    } else {
        loggerPino.error("Response missing from confrim change!");
        loggerPino.info("Whole response of the request");
        loggerPino.info(response);
        throw new Error("Confirm change as promise script error!");
    }
};

exports.deleteRollback = async function (data, match) {
    loggerPino.info("******DELETE_ROLLBACK_AS_PROMISE*******");
    const scriptId_delete_rollback = "tv8985:confirmPrefix:Network:Cisco:IOS";
    const { hostname } = data;
    const { dms_server } = data;
    const credentialId = data.mcapCredentialId;
    const body = {
        "command": "run",
        dms_server,
        hostname,
        "msg": "request sent",
        "scriptId": scriptId_delete_rollback,
        "retryLogin": true,
        "connectWithSSH": true,
        "connectWithTelnet": true,
        "restApiId": restApiId,
        credentialId,
        "credentialPassphrase": configPassPhrase,
        "msg": "request sent",
        "archiveName": match
    };
    const options = {
        "headers": { "Content-Type": "application/json", "username": `${mcapUsername}`, "userpwd": `${mcapUserpwd}` },
        "proxy": false,
        "httpsAgent": exports.getHttpsAgent(),
    };
    const response = await axios.post(
        mcapUrlTask,
        body,
        options
    );

    if (response) {

        if (response.status == statuses.gateWayTimeOut) {
            throw new GateWayTimeOut("Connection closed without response");
        }

        if (response.status == statuses.serviceUnavailable) {
            throw new ServiceUnavailable("MCAP is not available");
        }

        if (response.status == statuses.internalServerError) {
            throw new InternalServerError("Internal error on MCAP");
        }

        if (response.status == statuses.badRequest) {
            throw new BadRequest("Request to MCAP failed");
        }

        const deleteRollackOutput = response.data;
        if (response.status <= 299 && response.status >= 200) {
            if (deleteRollackOutput) {
                const deleteRollback = ((deleteRollackOutput.worklistObj || {}).worklistRowsSelectedAr || [])[0] || {};
                const output = JSON.stringify({
                    "m_status": deleteRollback.status || "Error",
                    "msg": deleteRollback.msg || "Internal error",
                    "result": deleteRollback.var_result || "error in output"
                });
                return output;
            }

        } else {
            loggerPino.error(response.status);
            loggerPino.error(response.message);
            throw new UnexpectedError(response.status, response.message);
        }

    } else {
        loggerPino.error("Response missing from delete rollback!");
        loggerPino.info("Whole response of the request");
        loggerPino.info(response);
        throw new Error("Delete rollback script error!");
    }

};

// JUNIPER generic script for rollback and confirm

exports.runScriptJuniper = async (data, scriptId) => {
    loggerPino.info("****************************Run script juniper************************");
    loggerPino.info("script name");
    loggerPino.info(scriptId);
    const { hostname } = data;
    const { dms_server } = data;
    const credentialId = data.mcapCredentialId;
    try {
        const options = {
            "headers": { "Content-Type": "application/json", "username": `${mcapUsername}`, "userpwd": `${mcapUserpwd}` },
            "proxy": false,
            "httpsAgent": exports.getHttpsAgent(),
        };

        const response = await axios.post(
            mcapUrlTask,
            {
                "command": "run",
                dms_server,
                hostname,
                "msg": "request sent",
                scriptId,
                "retryLogin": true,
                "connectWithSSH": true,
                "connectWithTelnet": true,
                "restApiId": restApiId,
                credentialId,
                "credentialPassphrase": configPassPhrase
            },
            options
        );
        if (response) {
            const runScriptResult = response.data;
            if (response.status <= 299 && response.status >= 200) {
                if (runScriptResult) {
                    const runScript = ((runScriptResult.worklistObj || {}).worklistRowsSelectedAr || [])[0] || {};
                    const output = JSON.stringify({
                        "commandOutput": runScript.var_results || "error in output",
                        "m_status": runScript.status || "Error",
                        "msg": runScript.msg || "Internal error",
                        "id": runScriptResult.id || "empty",
                        "status": runScriptResult.status || "Error"
                    });
                    return output;
                }
                throw new Error("Fatal error");
            }
            if (response.status > 299 && response.status < 599) {
                loggerPino.error("Run juniper script error!");
                loggerPino.info("Whole response of the request");
                loggerPino.info("Script name");
                loggerPino.info(scriptId);
                loggerPino.info(response.status);
                loggerPino.info(str(runScriptResult));
                throw new Error("Run juniper script error!");
            } else {
                loggerPino.error("Run juniper script error!");
                loggerPino.info("Whole response of the request");
                loggerPino.info("Script name");
                loggerPino.info(scriptId);
                loggerPino.info(response.status);
                loggerPino.info(str(runScriptResult));
                throw new Error("Run juniper script error!");
            }
        } else {
            loggerPino.error("Response missing from push config juniper!");
            loggerPino.info("Whole response of the request");
            loggerPino.info("Script name");
            loggerPino.info(scriptId);
            loggerPino.info(response);
            throw new Error("Run script juniper script error!");
        }
    } catch (err) {
        loggerPino.info("Script name");
        loggerPino.info(scriptId);
        loggerPino.error(err);
        throw new Error("Internal server error!");
    }
};

// END JUNIPER GENERIC SCRIPT rollback and confirm

// Check device type
exports.findVendorById = async (id) => {
    try {
        const vendorTypeId = await CTVendorTypes.findOne({
            "where": {
                "ID": id
            }
        });
        if (vendorTypeId && vendorTypeId.ID &&
            vendorTypeId.VENDOR_TYPE) {
            return {
                "id": vendorTypeId.ID,
                "vendorType": vendorTypeId.VENDOR_TYPE
            };
        }
        return false;
    } catch (err) {
        loggerPino.error(err);
        throw new Error("Error in returning the data for vendory type by Id.");
    }
};


exports.checkDeviceAvailability = async (req, res) => {
    loggerPino.info("****************************CHECKDEVICEAVAILABILITY************************");
    const { hostname, customerId, serviceId } = req.query;
    const isBcSession = req["isBcUser"];
    let bcContext = {}
    let customerIdBc;
    if (isBcSession) {
        bcContext = JSON.parse(req["cookies"]["bcSession"]);
        customerIdBc = await Customers.findOne({
            attributes: ["ID"],
            where: {
                BC_COMPANY_ID: bcContext["ebizCompanyId"]
            }
        })
    }
    const serviceToCustomer = await ServiceToCustomer.findOne({
        attributes: ["ID"],
        where: {
            CUSTOMER_ID: isBcSession ? customerIdBc["dataValues"]["ID"] : customerId,
            SERVICE_ID: serviceId
        }
    });
    const serviceToCustomerId = serviceToCustomer["dataValues"]["ID"];
    const credentialId = await transactionDataHelper.getMcapCredentials(serviceToCustomerId);;
    const hostnameAction = await exports.getHostnameAsPromise(hostname);
    try {
        const options = {
            "headers": { "Content-Type": "application/json", "username": `${mcapUsername}`, "userpwd": `${mcapUserpwd}` },
            "proxy": false,
            "httpsAgent": exports.getHttpsAgent(),
        };
        const [poler] = hostnameAction;
        usingDmsServer = poler["dms_server"];
        loggerPino.info("Using the DMS server: " + usingDmsServer);
        const result = await axios.post(
            mcapUrlTask,
            {
                "command": "run",
                "dms_server": usingDmsServer,
                "hostname": hostname,
                "scriptId": "tv8985:one_device_status:Network:Cisco:IOS",
                "retryLogin": true,
                "connectWithSSH": true,
                "connectWithTelnet": true,
                "credentialId": credentialId,
                "credentialPassphrase": configPassPhrase,
                "restApiId": "tv8985:ONE:Server:Rest:Api"
            },
            options
        );
        if (result) {
            if (result.status == statuses.gateWayTimeOut) {
                return res.status(statuses.gateWayTimeOut).send({ message: "Connection closed without response!" });
            }

            if (result.status == statuses.serviceUnavailable) {
                return res.status(statuses.serviceUnavailable).send({ message: "MCAP is not available!" });
            }

            if (result.status == statuses.internalServerError) {
                return res.status(statuses.internalServerError).send({ message: "Internal error on MCAP" });
            }

            if (result.status == statuses.badRequest) {
                return res.status(statuses.badRequest).send({ message: "Request to MCAP failed" });
            }
            if (result.status <= 299 && result.status >= 200) {
                const rawOutput = (result.data.worklistObj || {}).worklistRowsSelectedAr || "error in output";
                const [firstRawOutput] = rawOutput;
                if ("device_status" in firstRawOutput && firstRawOutput["device_status"] === "success") {
                    return res.status(statuses.ok).send({ result: "success" });
                } else {
                    return res.status(statuses.ok).send({ result: "failed" });
                }
            } else {
                return res.status(result.status).send({ message: result.message });
            }
        }
    } catch (err) {
        console.log(err);
        return res.status(statuses.internalServerError).send({ message: err.message });
    }
}


exports.startRollbackTimer = async (req, res) => {
    const reqBody = req.body.actionData;
    const [data] = [reqBody.data, reqBody.sessionId];
    loggerPino.info("******START_ROLLBACK_FROM_PROMISE");
    const scriptId_set_rollback_timer = "tv8985:startRollbackTimer:Network:Cisco:IOS";
    const { hostname } = data;
    const { dms_server } = data;
    const credentialId = data.mcapCredentialId;
    const { timer, match } = req.body;

    const body = {
        "command": "run",
        dms_server,
        hostname,
        "msg": "request sent",
        "scriptId": scriptId_set_rollback_timer,
        "retryLogin": true,
        "connectWithSSH": true,
        "connectWithTelnet": true,
        "restApiId": restApiId,
        credentialId,
        "credentialPassphrase": configPassPhrase,
        "runOnHostname": "one-controller",
        "msg": "request sent",
        "archiveName": match,
        "rollbackTime": timer
    };
    const options = {
        "headers": { "Content-Type": "application/json", "username": `${mcapUsername}`, "userpwd": `${mcapUserpwd}` },
        "proxy": false,
        "httpsAgent": exports.getHttpsAgent(),
    };
    const response = await axios.post(
        mcapUrlTask,
        body,
        options
    );

    if (response.status == statuses.gateWayTimeOut) {
        return res.status(statuses.gateWayTimeOut).send({ message: "Connection closed without response!" });
    }

    if (response.status == statuses.serviceUnavailable) {
        return res.status(statuses.gateWayTimeOut).send({ message: "Connection closed without response!" });
    }

    if (response.status == statuses.internalServerError) {
        return res.status(statuses.internalServerError).send({ message: "Internal error on MCAP" });
    }

    if (response.status == statuses.badRequest) {
        return res.status(statuses.badRequest).send({ message: "Request to MCAP failed" });
    }

    if (response.status <= 299 && response.status >= 200) {
        if (response) {
            const startRollbackOutput = response.data;
            if (response.status <= 299 && response.status >= 200) {
                if (startRollbackOutput) {
                    const startRollback = ((startRollbackOutput.worklistObj || {}).worklistRowsSelectedAr || [])[0] || {};
                    const output = JSON.stringify({
                        "m_status": startRollback.status || "Error",
                        "msg": startRollback.msg || "Internal error",
                        "result": startRollback.var_result || "error in output"
                    });
                    return res.status(statuses.ok).send({ result: output, message: "succes" });

                }
                return res.status(response.status).send({ message: response.message });
            }
            if (response.status > 299 && response.status < 599) {
                loggerPino.error("Start rollback script error!");
                loggerPino.info("Whole response of the request");
                loggerPino.info(response.status);
                loggerPino.info(str(startRollbackOutput));
                return res.status(response.status).send({ message: response.message });
            } else {
                loggerPino.error("Start rollback script error!");
                loggerPino.info("Whole response of the request");
                loggerPino.info(response.status);
                loggerPino.info(str(startRollbackOutput));
                return res.status(response.status).send({ message: response.message });
            }
        } else {
            loggerPino.error("Response missing from start rollback!");
            loggerPino.info("Whole response of the request");
            loggerPino.info(response);
            return res.status(response.status).send({ message: response.message });
        }
    } else {
        loggerPino.error(response.status);
        loggerPino.error(response.message);
        return res.status(response.status).send({ message: response.message });
    }
}