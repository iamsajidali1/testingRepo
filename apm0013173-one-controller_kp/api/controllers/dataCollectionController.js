/* eslint-disable max-len, max-lines-per-function, max-statements */

const { getLogger } = require("../../utils/logging");
const { check, query, validationResult } = require("express-validator");
const { postDataCollection } = require("./snowController");
const { ok, serviceUnavailable, unprocessableEntity, badRequest,
    internalServerError, notFound, 
    forbidden} = require("../statuses");
const { CONFIG } = require("../config/configuration");

const { "stringify": str } = JSON;

exports.createDataCollectionRecord = [
    [check("formData").isLength({ "min": 1 })],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(unprocessableEntity).send({ "message": errors });
        }
        const oneConnection = require("../models/databaseOne").Database.getInstance();
        const { DataCollection } = require("../models/dataCollectionModel");
        const { TDCData } = require("../models/tdcDataModel");
        const log = getLogger();

        // Check if TDC id is Passed
        const { tdcId, transactionId, options } = req.body.collectedFor;
        if (!tdcId) {
            return res.status(badRequest).json({
                "message": "TDC Id is missing in the Data Collection Record!"
            });
        }
        try {
            const isDraft = options && "draft" in options && options.draft;
            // If it is not for Draft then Push it SNOW
            if (!isDraft) {
                // Get Callback Url for TdcID
                log.info("Draft mode is disabled, pushing the data to SNOW inventory");
                const tdcRecord = await TDCData.findOne({ "where": { "ID": tdcId } });
                const snowData = {
                    "jsonBlob": req.body.formData,
                    "deviceId": tdcRecord.dataValues.DEVICE,
                    transactionId,
                    "url": `https://${CONFIG.cssHost}/config/data-collection?transactionId=${transactionId}`
                };
                const isPosted = await postDataCollection(tdcRecord.dataValues.CALLBACK_URL, snowData);
                if (!isPosted) {
                    return res.status(internalServerError).json({
                        "message": "Unable to save data to the inventory!"
                    });
                }
            }

            const result = await oneConnection.transaction(
                { "autocommit": true },
                async (transaction) => {
                    const data = {
                        "COLLECTED_DATA": str(req.body.formData),
                        "TDC_ID": tdcId,
                        "TRANSACTION_ID": transactionId,
                        "STATUS": isDraft ? "Draft" : "Complete"
                    };
                    log.info("Creating or Updating the data collection record");
                    const [updatedRow] = await DataCollection.upsert(data,
                        { "where": { "TRANSACTION_ID": transactionId }, transaction });

                    if (!updatedRow.dataValues) {
                        throw new Error("There was a problem saving the data, please retry!");
                    }

                    log.info("Updating the TDC Data table with correct status");
                    // Change the status of the TDC Data Table accordingly
                    await TDCData.update(
                        { "STATUS": isDraft ? "In Progress" : "Completed" },
                        { "where": { "ID": tdcId }, transaction }
                    );
                    return updatedRow.dataValues;
                }
            );
            return res.status(ok).send({ result, "message": "Data collection Successful!" });
        } catch (error) {
            log.error(error);
            return res.status(serviceUnavailable).send({
                "message": "There was a problem saving the data, please retry!"
            });
        }
    }
];


exports.getCollectedDataByTdcId = [
    [query("tdcId").isInt()],
    async (req, res) => {
        const validationErrors = validationResult(req);
        if (!validationErrors.isEmpty()) {
            return res.status(badRequest).send(validationErrors.errors);
        }
        // Check if the request id coming from a BC User, if yes then it's forbidden
        if (req.isBcUser) {
            return res.status(forbidden).send({
                "status": "Forbidden",
                "statusCode": forbidden,
                "message": "You are not allowed to access this resource!"
            })
        }
        const log = getLogger();
        const { tdcId } = req.query;
        try {
            const { DataCollection } = require("../models/dataCollectionModel");
            log.info(`Finding the data collection for TDC id: ${str(tdcId)}`);
            const data = await DataCollection.findAll({
                "where": { "TDC_ID": tdcId },
                "limit": 1,
                "order": [["createdAt", "DESC"]]
            });
            let collectedData = {};
            if (data && data.length) {
                const [rec] = data;
                collectedData = { ...rec.dataValues, "COLLECTED_DATA": JSON.parse(rec.dataValues.COLLECTED_DATA.toString()) };
            }
            log.info("Colleted data: ");
            log.info(str(collectedData));
            return res.status(ok).send({ "result": collectedData, "message": "Collected data fetched Successful!" });
        } catch (error) {
            log.error(error);
            return res.status(internalServerError).send({
                "message": "Something went wrong while looking for data collection!"
            });
        }
    }
];

exports.getCdcConfigAndDataByTransactionId = [
    [
        query("transactionId").isString().withMessage("Only standard UUIDv4 code is allowed!")
            .trim()
            .isLength({ "min": 36 })
            .withMessage("Not a standard UUIDv4 code!")
    ],
    async (req, res) => {
        const validationErrors = validationResult(req);
        if (!validationErrors.isEmpty()) {
            const { errors } = validationErrors;
            return res.status(badRequest).json({ "message": errors.map((err) => err.msg).join(","), errors });
        }
        const log = getLogger();
        const { transactionId } = req.query;
        try {
            const { DataCollection } = require("../models/dataCollectionModel");
            const { TDCData } = require("../models/tdcDataModel");
            const { GruaData } = require("../models/gruaDataModel");
            const { GruaDataToCustomer } = require("../models/gruaDataToCustomerModel");
            const { Customers } = require("../models/customerOneModel");
            log.info(`Using Transaction: ${str(transactionId)}`);
            log.info("Fetching the transaction details from data collection table");
            const dataCollection = await DataCollection.findOne({ "where": { "TRANSACTION_ID": transactionId }, "raw": true });
            log.info(`Data Collection: ${str(dataCollection)}`);
            if (!dataCollection) {
                return res.status(notFound).send({
                    "message": `Data Collection not found for transaction: ${transactionId}!`
                });
            }
            log.info(`Looking for TDC data for data collection with id: ${dataCollection.ID}`);
            const tdcData = await TDCData.findOne({
                "attributes": { "exclude": ["CALLBACK_URL"] },
                "where": { "ID": dataCollection.TDC_ID },
                "raw": true,
                include: {
                    "model": Organization,
                    "as": "ORGANIZATION",
                    "required": true,
                    "attributes": ["ID", "GRUA"]
                }
            });
            log.info(`TDC Data: ${str(tdcData)}`);
            if (!tdcData) {
                return res.status(notFound).send({
                    "message": `CDC Site not found for transaction: ${transactionId}!`
                });
            }
            log.info("Fetching the grua details from GruaData");
            // Get the customer details
            const gruaDetails = await GruaData.findOne({ "where": { "GRUA": tdcData.ORGANIZATION.GRUA }, "order": [["ID", "DESC"]], "raw": true });
            log.info(`GRUA Details: ${str(gruaDetails)}`);
            if (!gruaDetails) {
                return res.status(notFound).send({
                    "message": `Customer not found for transaction: ${transactionId}!`
                });
            }
            log.info("Fetching the grua to customer details from GruaDataToCustomer");
            const gruaToCustomerDetails = await GruaDataToCustomer.findOne({
                "where": { "ID": gruaDetails.ID },
                "raw": true
            });
            log.info(`GRUA to Customer Details: ${str(gruaToCustomerDetails)}`);
            log.info(`Looking for customer details for data collection with id: ${dataCollection.ID}`);
            const customer = await Customers.findOne({ "where": { "ID": gruaToCustomerDetails.CUSTOMER_ID }, "raw": true });
            log.info(`Customer Details: ${str(customer)}`);
            // Now convert the buffers to JSON
            dataCollection.COLLECTED_DATA = JSON.parse(dataCollection.COLLECTED_DATA.toString());
            return res.status(ok).json({
                "status": "Success",
                "statusCode": ok,
                "message": `Successfully fecthed all details, data and config for transaction: ${transactionId}`,
                "data": { dataCollection, tdcData, customer }
            });
        } catch (error) {
            log.error(error);
            return res.status(internalServerError).json({
                "message": error.message || `Something went wrong while looking for data collection for transaction: ${transactionId}!`
            });
        }
    }
];
