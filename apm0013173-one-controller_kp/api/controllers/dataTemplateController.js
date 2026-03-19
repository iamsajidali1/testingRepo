const ax = require("axios");
const { CONFIG } = require("../config/configuration");
const { validationResult, body, query } = require("express-validator");
const {
    badRequest,
    ok,
    internalServerError,
    serviceUnavailable,
    created
} = require("../statuses");
const { getLogger } = require("../../utils/logging");
const { DataTemplate } = require("../models/dataTemplateModel");
const { ServiceName } = require("../models/serviceNameModel");
const { Customers } = require("../models/customerOneModel");
const { "stringify": str } = JSON;

class ResponseError extends Error {}

exports.loadDataTemplate = [
    [query("actionId").isInt()], async (req, res) => {
        const validationErrors = validationResult(req);
        if (!validationErrors.isEmpty()) {
            return res.status(badRequest).send(validationErrors.errors);
        }
        const log = getLogger();
        const { actionId, customerId, serviceId } = req.query;
        const queryParams = { "ACTION_ID": actionId };
        if (customerId) {
            queryParams.CUSTOMER_ID = customerId;
        }
        if (serviceId) {
            queryParams.SERVICE_ID = serviceId;
        }
        try {
            const results = await DataTemplate.findAll({
                "where": { ...queryParams },
                "include": [
                    {
                        "model": ServiceName,
                        "as": "service",
                        "attributes": [["ID", "id"], ["SERVICE_NAME", "name"]]
                    }, {
                        "model": Customers,
                        "as": "customer",
                        "attributes": [["ID", "id"], ["NAME", "name"], ["BC_NAME", "bcName"]]
                    }
                ],
                "attributes": [
                    ["ID", "id"], ["ACTION_ID", "actionId"], ["NAME", "name"], ["DATA", "data"]
                ],
                "order": [["ID", "DESC"]]
            });

            return res.status(ok).json(results);
        } catch (err) {
            const { message } = err;
            log.error(message);
            return res.status(serviceUnavailable).json({
                "message": "Data templates can't be loaded!"
            });
        }
    }
];

exports.saveDataTemplate = [
    [
        body("actionId").isInt(),
        body("name").isString().trim(),
        body("data").trim().isJSON()
    ], async (req, res) => {
        const validationErrors = validationResult(req);
        if (!validationErrors.isEmpty()) {
            return res.status(badRequest).send(validationErrors.errors);
        }
        const log = getLogger();
        try {
            const { ormUrl } = CONFIG;
            const resp = await ax.post(`${ormUrl}/api/datatemplates/`, {
                "action_id": req.body.actionId,
                "customer_id": req.body.customerId || null,
                "service_id": req.body.serviceId || null,
                "name": req.body.name,
                "data": req.body.data,
                "createdat": new Date().toISOString(),
                "updatedat": new Date().toISOString(),
            });
            const { data, status } = resp;

            if (status !== created) {
                log.info(`Error in ORM response: ${str(data)}`);
                throw new ResponseError("Error in ORM response!");
            }
            return res.status(ok).json(data);
        } catch (err) {
            const { message } = err;
            log.error(message);
            if (err instanceof ResponseError) {
                return res.status(internalServerError).json({ message });
            }
            return res.status(serviceUnavailable).json({
                "message": "Data Template can't be saved!"
            });
        }
    }
];
