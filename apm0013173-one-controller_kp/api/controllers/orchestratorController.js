const loggerPino = require("../helpers/loggerHelper");
const { check, validationResult, body, query } = require("express-validator");

exports.getOrchestratorListByServiceToCustomerId = async (req, res) => {
    const data = req.body.actionData.data;
    try {
        const response = await exports.getOrchestratorListHelper(data.serviceToCustomerId);
        return res.status(200).send({ result: response, message: 'Successful!' });
    } catch (err) {
        loggerPino.error(err);
        return res.status(500).send("Internal server error");
    }
};

exports.getOrchestratorListHelper = async function (serviceToCustomerId) {
    const { OrchestratorList } = require('../models/orchestratorListModel');
    const { OrchestratorListToServiceToCustomer } = require('../models/orchestratorlistToServiceToCustomer');
    try {
        const oToSToCustomer = await OrchestratorListToServiceToCustomer.findAll({
            where: {
                SERVICE_TO_CUSTOMER_ID: serviceToCustomerId
            }
        });
        let orchestratorUrls = [];
        let orchestratorUrl;
        if (oToSToCustomer && oToSToCustomer.length > 0) {
            for (let index = 0; index < oToSToCustomer.length; index++) {
                orchestratorUrl = await OrchestratorList.findOne({
                    where: {
                        ID: oToSToCustomer[index]["ORCHESTRATOR_LIST_ID"]
                    }
                });
                if (orchestratorUrl) {
                    orchestratorUrls.push({
                        id: orchestratorUrl["ID"],
                        url: orchestratorUrl["URL"],
                        tenantId: orchestratorUrl["TENANT_ID"],
                        tags: orchestratorUrl["TAGS"],
                        configYaml: orchestratorUrl["CONFIG_YAML"]
                    });
                }
            }
        }
        return orchestratorUrls;
    } catch (err) {
        loggerPino.error(err);
        throw new Error("Database error");
    }
}


exports.getOrchestratorTags = [[
    query("orchestratorId").trim(),
    check("orchestratorId").isLength({ min: 1, max: 6 })
], async (req, res) => {
    const { OrchestratorList } = require('../models/orchestratorListModel');
    try {
        const orchestratorList = await OrchestratorList.findOne({
            where: {
                ID: req.query["orchestratorId"]
            }
        });
        let orchestratorTags;
        if (orchestratorList) {
                const orchestrator = await OrchestratorList.findOne({
                    where: {
                        ID: orchestratorList['dataValues']["ID"]
                    }
                });
                if (orchestrator) {
                    orchestratorTags = {
                        id: orchestrator["ID"],
                        tags: orchestrator["TAGS"]
                    };
                }
                else {
                    return res.status(500).send("Orchestrator is not in DB");
                }

        }
        else {
            return res.status(500).send("Orchestrator is not in DB");
        }
        return res.status(200).send({ result: orchestratorTags, message: 'Successful!' });
    } catch (err) {
        loggerPino.error(err);
        return res.status(500).send("Database error");
    }
}]


exports.updateOrchestratorTags = [[
    query("orchestratorId").trim(),
    check("orchestratorId").isLength({ min: 1, max: 6 })
], async (req, res) => {

    const { OrchestratorList } = require('../models/orchestratorListModel');
    try {
        const orchestrator = await OrchestratorList.findOne(
            {
                where: { ID: req.query["orchestratorId"] },
            }
        );
        if (!orchestrator) {
            throw new Error("There is no orchestrator with that ID!");
        }
        const orchestratorList = await OrchestratorList.update(
            {
                TAGS: req.body["tags"].toString(),
            },
            {
                where: {
                    ID: req.query["orchestratorId"],
                },
            }
        );

        return res.status(200).send({ message: 'Successful!' });
    } catch (err) {
        loggerPino.error(err);
        return res.status(500).send(err.message);
    }
}]

exports.updateOrchestratorConfig = [[
    query("orchestratorId").trim(),
    check("orchestratorId").isLength({ min: 1, max: 6 })
], async(req, res) => {
    const { OrchestratorList } = require('../models/orchestratorListModel');
    try {
        const orchestratorList = await OrchestratorList.update(
            {
                CONFIG_YAML: req.body["configYaml"]
            },
            {
                where: {
                    ID: req.query["orchestratorId"],
                }
            }
        );
        return res.status(200).send({ message: 'Successful!', data: orchestratorList});
    } catch (err) {
        loggerPino.error(err);
        return res.status(500).send(err.message);
    }
}]