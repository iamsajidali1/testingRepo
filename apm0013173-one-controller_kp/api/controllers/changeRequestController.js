/* eslint-disable no-magic-numbers, max-lines-per-function */

const { check, validationResult, query } = require("express-validator");
const { createCrForLmac } = require("./lmacDbController");
const { createCrForGPS } = require("./gpsController");
const {
    created,
    internalServerError,
    noContent,
    ok,
    unprocessableEntity
} = require("../statuses");
const logger = require("../helpers/loggerHelper");
const ax = require("axios");
const { CONFIG } = require("../config/configuration");
const { ormUrl } = CONFIG;
const { getLogger } = require("../../utils/logging");
const { "stringify": str } = JSON;

class ResponseError extends Error {}
class NotFoundError extends Error {}
class TooManyItemsError extends Error {}

/**
 * To get Auto CR Create Config by Service and Customer Ids
 * @param {*} customerId
 * @param {*} serviceId
 * @returns Object with Config
 */
const getAutoCrCreateConfig = async (customerId, serviceId) => {
    const { ServiceToCustomer } = require("../models/serviceToCustomerModel");
    const {
        AutoCrToServiceToCustomer
    } = require("../models/autoCrToServiceToCustomerModel");
    const results = await ServiceToCustomer.findOne({
        "attributes": ["ID"],
        "where": { "SERVICE_ID": serviceId, "CUSTOMER_ID": customerId },
        "include": [
            {
                "model": AutoCrToServiceToCustomer,
                "required": true
            }
        ]
    });
    logger.info("Successfully fetched CR config.");
    let response = {};
    if (results && results.dataValues.AutoCrToServiceToCustomers[0].dataValues) {
        response = results.dataValues.AutoCrToServiceToCustomers[0].dataValues;
    }
    return response;
};

const getCrCreateConfig = [
    [
        query("customerId").trim(),
        check("customerId").isNumeric(),
        query("serviceId").trim(),
        check("serviceId").isNumeric()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(unprocessableEntity).json({ errors });
        }
        try {
            const { customerId, serviceId } = req.query;
            const results = await getAutoCrCreateConfig(customerId, serviceId);
            return res.status(ok).json(results);
        } catch (err) {
            logger.info("Failed to get the CR Config!");
            logger.error(err);
            return res.status(internalServerError).json({
                "status": internalServerError,
                "message": "Failed to get the CR Config!"
            });
        }
    }
];

const updateCrCreateConfig = [
    [
        query("customerId").trim(),
        check("customerId").isNumeric(),
        query("serviceId").trim(),
        check("serviceId").isNumeric()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(unprocessableEntity).json({ errors });
        }
        const { customerId, serviceId } = req.query;
        const { ID, SHOULD_AUTO_CREATE_CR, SERVICE_TO_CUSTOMER_ID } = req.body;
        try {
            const {
                AutoCrToServiceToCustomer
            } = require("../models/autoCrToServiceToCustomerModel");
            if (!SERVICE_TO_CUSTOMER_ID) {
                // Get service to customer Id
                logger.info("Service to Customer Id not Present, Fetching ...");
                const { ServiceToCustomer } = require("../models/serviceToCustomerModel");
                const srvToCus = await ServiceToCustomer.findOne({
                    "attributes": ["ID"],
                    "where": { "SERVICE_ID": serviceId, "CUSTOMER_ID": customerId }
                });
                if (!(srvToCus && srvToCus.dataValues && "ID" in srvToCus.dataValues)) {
                    throw new Error("No Customer to Service Relationship Exists!");
                }
                const srvToCustId = srvToCus.dataValues.ID;
                logger.info(
                    `Successfully fetch Service to Customer Id: ${srvToCustId}`
                );

                const result = await AutoCrToServiceToCustomer.create({
                    SHOULD_AUTO_CREATE_CR,
                    "SERVICE_TO_CUSTOMER_ID": srvToCustId
                });
                logger.info(
                    `Successfully created config with Id: ${result.dataValues.ID}`
                );
                return res.status(ok).json({ ...result.dataValues, "CREATED": true });
            }
            // Update the Table
            logger.info("Service to Customer Id Present, Updating Config ...");
            await AutoCrToServiceToCustomer.update(
                { SHOULD_AUTO_CREATE_CR },
                { "where": { SERVICE_TO_CUSTOMER_ID } }
            );
            logger.info(`Successfully updated config with Id: ${str(ID)}`);
            return res.status(ok).json({
                ID,
                SHOULD_AUTO_CREATE_CR,
                SERVICE_TO_CUSTOMER_ID,
                "CREATED": false
            });
        } catch (error) {
            logger.info("Failed to update the CR Config!");
            logger.error(error.message);
            return res.status(internalServerError).json({
                "status": internalServerError,
                "message": "Failed to update the CR Config!"
            });
        }
    }
];

const createChangeRequest = async (req, res) => {
    const { serviceName, serviceId } = req.body;
    const { isBcUser, cookies, userDetails, "sessionID": ses } = req;

    let bcContext = {};
    let customerIdFromBc;
    if(isBcUser) {
        bcContext = JSON.parse(req["cookies"]["bcSession"]);
        customerIdFromBc = await getBcCustomerId(ses, bcContext["ebizCompanyId"])
    }

    const customerId = isBcUser ? customerIdFromBc : req.body["customerId"]
    const data = { ...req.body, isBcUser, cookies, userDetails };
    // Check if the CR should be created
    try {
        const config = await getAutoCrCreateConfig(customerId, serviceId);
        if (!(config && "SHOULD_AUTO_CREATE_CR" in config && config.SHOULD_AUTO_CREATE_CR)) {
            logger.info("Auto CR Creation config is either disabled or does not exists!");
            return res.status(ok).json({
                "status": noContent,
                "message": "Auto CR Creation config is either disabled or does not exists!"
            });
        }
    } catch (error) {
        logger.info(`Unable to fetch CR Config for CustomerID ${
            str(customerId)
        } and ServiceID: ${serviceId}`);
        logger.error(error.message);
        return res.status(internalServerError).json({
            "status": internalServerError,
            "message": "Unable to fecth CR Config, Change Request creation Failed!!!"
        });
    }
    // Make a hashmap for all offered Service Lines
    const crFunctionMap = {
        "AVPN": createCrForLmac,
        "MRS": createCrForGPS
    };
    // Get the function to be called
    if (serviceName in crFunctionMap) {
        logger.info(`Creating change request for ${str(serviceName)}.`);
        const result = await crFunctionMap[serviceName](data);
        if (!result) {
            logger.error("Change Request creation Failed!!!");
            return res.status(internalServerError).json({
                "status": internalServerError,
                "message": "Change Request creation Failed!!!"
            });
        }
        return res.status(created).json(result);
    }
    logger.info("Flow for the service line does not exist, no CR created!");
    return res.status(ok).json({
        "status": noContent,
        "message": "Flow for the service line does not exist, no CR created!"
    });
};

const getBcCustomerId = async (ses, ebizCompanyId) =>{
    const log = getLogger();
    const resp = await ax.get(`${ormUrl}/api/customers?bc_company_id=${ebizCompanyId}`);
    const { data, status } = resp;
    if (status !== ok) {
        log.info(`${ses}: [Get BC customer ID] Error in ORM response: ${str(data)}`);
        throw new ResponseError(data);
    }

    if (!data || !data.results || data.results.length <= 0) {
        log.info(`${ses}: [Get BC customer ID] Not found: ${str(data)}`);
        throw new NotFoundError(data);
    }

    if (data.results.length > 1) {
        log.info(`${ses}: [Get BC customer ID]] Too many items: ${str(data)}`);
        throw new TooManyItemsError(data);
    }

    const [customer] = data.results;
    log.info(`${ses}: [Get BC customer ID]] Found customer: ${str(customer)}`);
    return customer["id"];
}

module.exports = {
    getAutoCrCreateConfig,
    getCrCreateConfig,
    updateCrCreateConfig,
    createChangeRequest
};
