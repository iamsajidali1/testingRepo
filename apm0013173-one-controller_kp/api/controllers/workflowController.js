const { Workflow } = require("../models/workflowModel");
const { ServiceName } = require("../models/serviceNameModel");
const { Templates } = require("../models/templatesDataModel")
const { ServiceToCustomer } = require("../models/serviceToCustomerModel");
const { WorkFlowToTemplate } = require("../models/workflowToTemplateModel");
const { WorkFlowToService } = require("../models/workflowToServiceModel");
const { WorkflowAttributes } = require("../models/workflowAttributesModel");
const { WorkflowToWorkflowAttributes } = require("../models/workflowToWorkflowAttributesModel");
const { TemplateToService } = require("../models/templateToServiceModel");
const { TemplateToServiceToCustomer } = require("../models/templateToServiceToCustomerModel");
const { check, validationResult, query, body } = require("express-validator");
const oneConnection = require("../models/databaseOne");
const loggerPino = require("../helpers/loggerHelper");
const { ok, internalServerError, unprocessableEntity } = require("../statuses");

exports.getAvailableWorkflowsForServiceCustomerUser = [[
    query("serviceId").trim(),
    check("serviceId").isLength({ min: 1, max: 255 }),
    query("customerId").trim(),
    check("customerId").isLength({ min: 1, max: 255 }),
    query("attuid").trim(),
    check("attuid").isLength({ min: 1, max: 255 })
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).send({ message: errors });
    }
    let serviceToCustomerId = 0;
    //find service to customer id relation in service to customer table
    ServiceToCustomer.findOne({
        where: {
            SERVICE_ID: req.query.serviceId,
            CUSTOMER_ID: req.query.customerId
        }
    }).then((result) => {
        const resultFinal = [];
        serviceToCustomerId = result["dataValues"]["ID"];
        //find all available workflows with actions(templates) based on service to customer id relation
        WorkFlowToTemplate.findAll(
            {
                include: [
                    {
                        model: Templates,
                        required: true,
                        include: [{
                            model: TemplateToServiceToCustomer,
                            required: true,
                            where: { SERVICE_TO_CUSTOMER_ID: serviceToCustomerId }
                        }]
                    },
                    {
                        model: Workflow,
                        required: true,
                        include: [{
                            model: WorkFlowToService,
                            required: true,
                            where: { SERVICE_ID: req.query.serviceId },
                            include: [{
                                model: ServiceName
                            }]
                        }]
                    }
                ],
            }
        ).then((partResult) => {
            partResult.forEach(result => {
                if (result["dataValues"]["Template"] !== null) {
                    result["dataValues"]["Workflow"]["WorkFlowToServices"].forEach((services) => {
                        resultFinal.push({
                            name: result["dataValues"]["Workflow"]["NAME"],
                            service: services["dataValues"]["ServiceName"]["dataValues"]["SERVICE_NAME"]
                        });
                    });
                }
            });

            //find all available actions(templates) based on their relation to service id
            WorkFlowToTemplate.findAll({
                include: [
                    {
                        model: Templates,
                        required: true,
                        include: [{
                            model: TemplateToService,
                            required: true,
                            include: [{
                                model: ServiceName,
                                required: true,
                                where: { ID: req.query.serviceId }
                            }]
                        }]
                    },
                    {
                        model: Workflow,
                        required: true,
                        include: [{
                            model: WorkFlowToService,
                            required: true,
                            where: { SERVICE_ID: req.query.serviceId },
                            include: [{
                                model: ServiceName
                            }]
                        }]
                    }
                ]
            }).then((partResult) => {
                partResult.forEach(result => {
                    if (result["dataValues"]["Template"] !== null) {
                        result["dataValues"]["Workflow"]["WorkFlowToServices"].forEach((services) => {
                            resultFinal.push({
                                name: result["dataValues"]["Workflow"]["NAME"],
                                service: services["dataValues"]["ServiceName"]["dataValues"]["SERVICE_NAME"]
                            });
                        });
                    }
                });
                //filter all not unique workflows
                const uniqueResult = [...new Map(resultFinal.map(item => [item["name"], item])).values()];
                return res.status(200).send({ result: uniqueResult, message: "Successful!" });
            }).catch(error => {
                loggerPino.error(error);
                return res.status(500).send({ message: "WorkflowToTemplate for service error!" });
            });
        }).catch(error => {
            loggerPino.error(error);
            return res.status(500).send({ message: "WorkflowToTemplate for customer service relation error!" });
        });
    }).catch(error => {
        loggerPino.error(error);
        return res.status(500).send({ message: "ServiceToCustomer error!" });
    });
}];

exports.getAllWorkflows = [[
], (req, res) => {
    exports.getAllWorkflowsAsync().then(result => {
        return res.status(200).send({ result: result, message: "Successful!" });
    }).catch(error => {
        loggerPino.error(error);
        return res.status(500).send({ message: "Internal server error!" });
    });
}];

exports.getAllWorkflowsAsync = async () =>{
    let result = [];
    // load all services and workflow
    let workflowToServices = await WorkFlowToService.findAll({
        include: [{
            model: Workflow,
            required: true,
        }, {
            model: ServiceName,
            required: true,
        }]
    }).catch(error => {
        loggerPino.error(error);
        throw new Error("Database error");
    });
    if (workflowToServices && workflowToServices.length > 0) {
        workflowToServices.forEach(wToS =>{
            result.push({
                workflow: wToS["dataValues"]["Workflow"],
                service: wToS["dataValues"]["ServiceName"]
            });
        });
    }
    return result;
}

exports.getWorkflowsByActionId = [[
    check("id").isNumeric()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors : errors });
    }
    exports.getWorkflowsByActionIdAsync(req.query).then(result => {
        return res.status(200).send({ result: result, message: "Successful!" });
    }).catch(error => {
        loggerPino.error(error);
        return res.status(500).send({ message: "Internal server error!" });
    });
}];

exports.getWorkflowsByActionIdAsync = async (query) => {
    let result = {};
    const workflowToTemplate = await WorkFlowToTemplate.findOne({
        where: { TEMPLATE_ID: query["id"] }
    }).catch(error => {
        loggerPino.error(error);
        throw new Error("Database error");
    });
    if (workflowToTemplate.dataValues && workflowToTemplate.dataValues["ID"]) {
        const workflow = await Workflow.findOne({
            where: { ID: workflowToTemplate.dataValues["WORKFLOW_ID"] }
        }).catch(error => {
            loggerPino.error(error);
            throw new Error("Database error");
        });

        if (workflow && workflow.dataValues) {
            result = workflow.dataValues;
        }
    }
    return result;
};

exports.getWorkflowAttributes = async (req, res) => {
    try{
        const workflowAttributes = await WorkflowAttributes.findAll();
        result = [];
        for(const attribute of workflowAttributes){
            result.push({
                id: attribute["dataValues"]["ID"],
                name: attribute["dataValues"]["NAME"]
            });
        }
        return res.status(200).send(result);
    } catch(error){
        loggerPino.error(error);
        return res.status(500).send({ message: "Internal server error!" });
    }
}

exports.getAssignedAttributes = [[
    check("id").isNumeric()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).send({ errors : errors });
    }
    try {
        const result = await exports.getAssignedAttributesHelper(req.query);
        return res.status(200).send(result);
    } catch(error){
        loggerPino.error(error);
        if(error.message == "Client error!"){
            return res.status(404).send({ message: "Not found!" });
        } else {
            return res.status(500).send({ message: "Internal server error!" });
        }
    }
}];

exports.getAssignedAttributesHelper = async(query) =>{
    const workflowToWorkflowAttributes = await WorkflowToWorkflowAttributes.findAll({
        where: { WORKFLOW_ID: query["id"] }
    });
    if(workflowToWorkflowAttributes){
            const result = [];
            for(const obj of workflowToWorkflowAttributes){
                const workflowAttributes = await WorkflowAttributes.findOne({
                    where: { ID: obj["WORKFLOW_ATTRIBUTE_ID"] }
                });
                if(workflowAttributes && workflowAttributes["dataValues"]){
                    result.push({
                        id: workflowAttributes["dataValues"]["ID"],
                        name: workflowAttributes["dataValues"]["NAME"],
                        status: obj["STATUS"]
                    });
                }
            }
            return result;
    } else {
        throw new Error("Client error!");
    }
}

exports.assigneAttributeToWorkflow = [[
    check("workflowId").isNumeric(),
    check("attributeId").isNumeric(),
    body("status").trim(),
    check("status").isLength({ min: 4, max: 8 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).send({ errors : errors });
    }
    try {
        const id = req.body["workflowId"];
        const existingAttributes = await  exports.getAssignedAttributesHelper({ id: id });
        const check = existingAttributes.find(attribute => attribute["id"] == req.body["attributeId"]);
        if(!check){
            const result = await exports.assigneAttributeToWorkflowHelper(req.body);
            return res.status(200).send(result);
        } else {
          return res.status(400).send({ message: "Bad request!" });
        }
    } catch(error){
        loggerPino.error(error);
        return res.status(500).send({ message: "Internal server error!" });
    }
}];

exports.assigneAttributeToWorkflowHelper = async(body) =>{
    const result = await oneConnection.Database.getInstance()
    .transaction({ autocommit: true }, async function (t) {
      const workflowToWorkflowAttributes = await WorkflowToWorkflowAttributes.create({
        WORKFLOW_ID: body["workflowId"],
        WORKFLOW_ATTRIBUTE_ID: body["attributeId"],
        STATUS: body["status"]
      }, { transaction: t });
      return workflowToWorkflowAttributes;
    });
    return result;
}

exports.deleteAssignedAttributeToWorkflow = [[
    check("workflowId").isNumeric(),
    check("attributeId").isNumeric()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).send({ errors : errors });
    }
    try {
        await exports.deleteAssignedAttributeToWorkflowHelper(req.query);
        return res.status(200).send({ message: "Successfully!" });
    } catch(error){
        loggerPino.error(error);
        return res.status(500).send({ message: "Internal server error!" });
    }
}];

exports.deleteAssignedAttributeToWorkflowHelper = async(query) =>{
    const result = await oneConnection.Database.getInstance()
    .transaction({ autocommit: true }, async function (t) {
      const workflowToWorkflowAttributes = await WorkflowToWorkflowAttributes.destroy({
        where : {
            WORKFLOW_ID: query["workflowId"],
            WORKFLOW_ATTRIBUTE_ID: query["attributeId"]
        }
      }, { transaction: t });
      return workflowToWorkflowAttributes;
    });
    return result;
}


exports.setMaxAndMinRollbackTimerForWorkflow = [[
    body("workflowId").isNumeric(),
    check("workflowId").isLength({ min: 1, max: 255 }),
    body("maxTimer").isNumeric(),
    check("maxTimer").isLength({ min: 1, max: 999 }),
    body("minTimer").isNumeric(),
    check("minTimer").isLength({ min: 1, max: 99 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(unprocessableEntity).send({ message: errors });
    }
    const { WorkflowToRollbackTimer } = require('../models/workflowToRollbackTimerModel');
    const { body } = req;


    // check if workflow exist in DB
        try {
            await Workflow.findOne({
                where: { ID: body["workflowId"] }
            })
        } catch (error) { loggerPino.error(error); return res.status(internalServerError).send({ message: "Workflow is missing!" }); }

        const transaction = await oneConnection.Database.getInstance()
            .transaction({ autocommit: true }, async function (t) {
                await WorkflowToRollbackTimer.create({
                    WORKFLOW_ID: body["workflowId"],
                    MIN_ROLLBACK_TIMER: body["maxTimer"],
                    MAX_ROLLBACK_TIMER: body["minTimer"]
                }, { transaction: t });
                if (transaction) {
                    return res.status(ok).send({ message: "Rollback timer created" });
                } else {
                    return res.status(internalServerError).send({ message: "Rollback timer failed to create" })
                }
            });
}];

exports.getMaxAndMinRollbackTimerForWorkflow = [[
    query("workflowId").trim(),
    check("workflowId").isLength({ min: 1, max: 255 }),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(unprocessableEntity).send({ message: errors });
    }
    const { WorkflowToRollbackTimer } = require('../models/workflowToRollbackTimerModel');
    const { query } = req;

    // check if workflow exist in DB
    try {
        await Workflow.findOne({
            where: { ID: query["workflowId"] }
        })
    } catch (error) { loggerPino.error(error); return res.status(internalServerError).send({ message: "Workflow is missing!" }); }

    const workflowIdInt = parseInt(query["workflowId"]);
    const workflowAttributesTimer = await WorkflowToRollbackTimer.findOne({
        where: {
            WORKFLOW_ID: workflowIdInt
        }
    });
    let timers;
    if (workflowAttributesTimer && workflowAttributesTimer["dataValues"]) {
        timers = [workflowAttributesTimer["dataValues"]["MIN_ROLLBACK_TIMER"], workflowAttributesTimer["dataValues"]["MAX_ROLLBACK_TIMER"]]
    }
    return res.status(ok).send({ message: "Rollback timer sent", result: timers });
}];
