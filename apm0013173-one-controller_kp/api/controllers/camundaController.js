const { CONFIG } = require("../config/configuration");
const axios = require("axios");
const schedulerController = require("../controllers/schedulerController");
const logger = require("../helpers/loggerHelper");
const { header_one_type, one_type } = require("../constants");
const { header, validationResult } = require("express-validator");
const { internalServerError, unprocessableEntity } = require("../statuses");

/**
 * To call Camunda an create a process
 * @param {String} urlFragment
 * @param {Object} requestBody
 * @returns
 */
exports.callCamundaService = async (urlFragment, requestBody) => {
    try {
        const { camundaUrl, camundaBasicAuth } = CONFIG;
        const options = {
            "headers": {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": `Basic ${camundaBasicAuth}`
            }
        };
        logger.info("Calling Camunda Process Manager");
        logger.info(`${camundaUrl}process-definition/key/${urlFragment}`);
        logger.info(`Camunda body: ${JSON.stringify(requestBody)}`);
        const response = await axios.post(
            `${camundaUrl}process-definition/key/${urlFragment}`,
            requestBody,
            options
        );

        if (response) {
            if (response.status > 299 && response.status < 599) {
                return {
                    "status": "Error",
                    "statusCode": response.status,
                    "statusText": response.statusText
                };
            } else if (response.status <= 299 && response.status >= 200) {
                return {
                    "status": "OK",
                    "statusCode": response.status,
                    "userMessage": response.data.id
                };
            }
        } else {
            throw new Error("No response provided");
        }
    } catch (error) {
        const errorMessage = error.message || "Something went wrong while calling camunda!";
        logger.error(errorMessage);
        return {
            "status": "Error",
            "statusCode": error.status || internalServerError,
            "statusText": errorMessage
        };
    }
};

exports.camundaLongPollingTaskHandler = [
    [
        header(header_one_type).trim(),
        header(header_one_type).notEmpty().equals(one_type)
    ], async (req) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            schedulerController.updateStatusAndResult(
                req.body.pid, "Error", unprocessableEntity, errors
            );
            logger.error("Required header missing! Validation Failed!");
        }
        try {
            const { urlFragment, requestBody } = req.body;
            // Add the pid in the Request Body
            requestBody['variables']['process'] = {
                "value": req.body.processKey,
                "type": "string"
            };
            const response = await exports.callCamundaService(urlFragment, requestBody);
            if (response.status === "Error") {
                schedulerController.updateStatusAndResult(
                    req.body.pid,
                    "Error",
                    response.statusCode || internalServerError,
                    response.statusText
                );
            }
            return;
        } catch (error) {
            logger.error(error);
            schedulerController.updateStatusAndResult(
                req.body.pid, "Error", internalServerError, error?.message
            );
        }
    }
];
