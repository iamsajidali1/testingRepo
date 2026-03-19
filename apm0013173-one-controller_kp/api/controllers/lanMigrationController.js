const mcapController = require("../controllers/mcapController");
const carcheController = require("../controllers/cArcheController");
const schedulerController = require("../controllers/schedulerController");
const constants = require("../../api/constants");
const { getLogger } = require("../../utils/logging");
const { ok, serviceUnavailable, unprocessableEntity } = require("../statuses");
const { header, validationResult } = require("express-validator");
const transactionMiddleware = require("../../middleware/transaction");

exports.lanMigration = [[
    header(constants.header_one_type).trim(),
    header(constants.header_one_type).notEmpty().equals(constants.one_type)
], async (req, res) => {
    const log = getLogger();
    log.info("*********Executing LAN migration**********");
    const pidId = req.body.pid;
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            schedulerController.updateStatusAndResult(pidId, "Error", unprocessableEntity, errors);
            throw new Error("LAN migration - Request validaton error!");
        }
        const sessionID = req.body.actionData["sessionId"];
        const prevalidation = await mcapController.callRunValidationAsPromise(req);
        log.info("LAN Migration - PRE validation");
        log.info(prevalidation);
        if (!prevalidation) {
            schedulerController.updateStatusAndResult(pidId, "Error",
                serviceUnavailable, "Pre validation result is empty");
            throw new Error("LAN migration - PRE validation!");
        }
        // reload the value for the action data 
        req.body.actionData = await transactionMiddleware.checkDataForTransaction(sessionID);
        // pre setting the globals and main data 
        req.body.globals = {};
        req.body.main_data = {};

        const generatedConfig = await carcheController.generateConfigInternalFunction(req);
        log.info("LAN migration - Generate config");
        log.info(generatedConfig);
        if (!generatedConfig || !generatedConfig["config"]) {
            schedulerController.updateStatusAndResult(pidId, "Error",
                serviceUnavailable, "Generate config result is empty");
            throw new Error("LAN migration - Generate config!");
        }


        // set rollback only cisco devices 
        const vendor = await mcapController.findVendorById(req.body.actionData.data["deviceType"]);
        const vendorType = (vendor || {})["vendorType"] || "";
        log.info("LAN Migration - vendor type");
        log.info(vendorType);
        let setRollback = "";
        if ((vendorType.toUpperCase()).includes(constants.deviceCisco)) {
            // reload the action data value 
            req.body.actionData = await transactionMiddleware.checkDataForTransaction(sessionID);
            setRollback = await mcapController.callSetRollbackAsPromise(req);
            log.info('LAN Migration - Set rollback');
            log.info(setRollback);
            if (!setRollback) {
                schedulerController.updateStatusAndResult(pidId, "Error",
                    serviceUnavailable, "Set rollback result is empty");
                throw new Error("LAN migration - Set rollback!");
            }
        }
        // reload the data 
        req.body.actionData = await transactionMiddleware.checkDataForTransaction(sessionID);
        const confirmChange = await mcapController.callPushConfigAsPromise(req);
        log.info("LAN Migration - Confirm change");
        log.info(confirmChange);
        if (!confirmChange) {
            schedulerController.updateStatusAndResult(pidId, "Error",
                serviceUnavailable, "Confirm change result is empty");
            throw new Error("LAN migration - Confirm change!");
        }
        // reload data 
        req.body.actionData = await transactionMiddleware.checkDataForTransaction(sessionID);
        const postValidation = await mcapController.callRunValidationAsPromise(req);
        log.info('LAN Migration - Post validation');
        log.info(postValidation);
        if (!postValidation) {
            schedulerController.updateStatusAndResult(pidId, "Error",
                serviceUnavailable, "Post validation result is empty");
            throw new Error("LAN migration - Post validation!");
        }
        
        schedulerController.updateStatusAndResult(pidId, "OK", ok, {
            prevalidation: prevalidation,
            generatedConfig: generatedConfig,
            setRollback: setRollback,
            confirmChange: confirmChange,
            postValidation: postValidation

        });
        return;
    } catch (err) {
        log.error(err);
        schedulerController.updateStatusAndResult(
            pidId,
            "Error",
            serviceUnavailable,
            err
        );
        throw new Error("Complex method for Lan migration can not be executed!");
    }
}];
