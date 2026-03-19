const { Templates } = require("../models/templatesDataModel");
const { TemplateToService } = require("../models/templateToServiceModel");
const {
    TemplateToServiceToCustomer
} = require("../models/templateToServiceToCustomerModel");
const {
    UserToServiceToCustomer
} = require("../models/userToServiceToCustomerModel");
const { UserToService } = require("../models/userToServiceModel");
const { Users } = require("../models/usersModel");
const { UsersTemplate } = require("../models/usersTemplateModel");
const { ServiceToCustomer } = require("../models/serviceToCustomerModel");
const { WorkFlowToTemplate } = require("../models/workflowToTemplateModel");
const { ServiceName } = require("../models/serviceNameModel");
const { Workflow } = require("../models/workflowModel");
const { TemplateToVendor } = require("../models/templateToVendorModel");
const { CTVendorTypes } = require("../models/cTVendorTypes");
const { RoleTemplates } = require("../models/roleTemplates");
const { Roles } = require("../models/rolesModel");
const {
    RoleToServiceToCustomer
} = require("../models/roleToServiceToCustomerModel");
const { RoleToService } = require("../models/roleToServiceModel");
const { check, validationResult, body, query } = require("express-validator");
const Sequelize = require("sequelize");
const oneConnection = require("../models/databaseOne").Database.getInstance();
const loggerPino = require("../helpers/loggerHelper");
const { unprocessableEntity, ok, internalServerError, created } = require("../statuses");
const { Customers } = require("../models/customerOneModel");
const snowController = require("./snowController");
const { FormRule } = require("../models/formRuleModel");

exports.loadActionById = [
    [check("id").isNumeric()],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(unprocessableEntity).json({ errors });
        }
        exports
            .loadActionByIdAsync(req.query)
            .then((template) => res
                .status(ok)
                .send({ "message": "Successful!", "result": template }))
            .catch((error) => {
                loggerPino.error(error);
                return res
                    .status(internalServerError)
                    .send({ "message": "Internal server error!", "errorId": "" });
            });
    }
];

exports.loadActionByIdAsync = async (query) => {
    const template = await Templates.findOne({
        "where": { "ID": query.id },
        include: {
            model: FormRule,
        }
    }).catch((error) => {
        loggerPino.error(error);
        throw new Error("Database error");
    });
    if (template && template.dataValues.ID) {
        questions = [];
        validation = null;
        staticHostname = null;
        if (template.dataValues.QUESTIONS) {
            questions = JSON.parse(template.dataValues.QUESTIONS.toString());
        }
        if (template.dataValues.VALIDATION) {
            validation = JSON.parse(template.dataValues.VALIDATION.toString());
        }
        if (template.dataValues.STATICHOSTNAME) {
            staticHostname = JSON.parse(
                template.dataValues.STATICHOSTNAME.toString()
            );
        }
        return {
            "id": template.dataValues.ID,
            "name": template.dataValues.NAME,
            questions,
            validation,
            "description": template.dataValues.DESCRIPTION,
            "staticHostnameCheckBox": template.dataValues.STATICHOSTNAMECHECKBOX,
            "carcheTemplate": template.dataValues.CARCHETEMPLATE,
            staticHostname,
            "apiEndpoint": template.dataValues.API_ENDPOINT,
            "enabled": template.dataValues.ENABLED,
            "minRollbackTimer": template.dataValues.MIN_ROLLBACK_TIMER,
            "maxRollbackTimer": template.dataValues.MAX_ROLLBACK_TIMER,
            "formRules": template.dataValues.FormRules ?? []
        };
    }
    return null;
};

exports.updateAction = [
    [
        check("id").isNumeric(),
        body("workflowId").isNumeric(),
        body("vendorTypeId").isNumeric(),
        body("enabled").optional().isBoolean()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(unprocessableEntity).json({ errors });
        }
        if (!(req.body.serviceId && req.body.serviceId.length > 0)) {
            return res.status(unprocessableEntity).send({ "message": "Service id array missing!" });
        }
        try {
            let updatedRecord = null;
            const data = JSON.parse(JSON.stringify(req.body));
            if (data.customerId) {
                updatedRecord = await exports.updateActionAsyncToServiceToCustomerAsync(data);
            } else {
                updatedRecord = await exports.updateActionAsyncToServiceAsync(data);
            }
            const { message } = updatedRecord;
            if (message === "Successful") {
                // Check if it is Data Collection Template/ If yes Put it to SNOW
                const { id, name, description, enabled, serviceId, customerId, workflowId, vendorTypeId, vendorType } = req.body;
                const templateData = { id, name, description, enabled, serviceId, customerId, workflowId, vendorTypeId, vendorType };
                snowController.processTemplate("update", templateData);
                return res.status(created).send({ message });
            }
            throw new Error("Unable to update the action template!");
        } catch (error) {
            loggerPino.error(error);
            return res
                .status(internalServerError)
                .send({ "message": error.message || "Internal server error!", "errorId": "" });
        }
    }
];

exports.updateActionAsyncToServiceAsync = async (body) => {
    try {
        const result = await oneConnection
            .transaction({ "autocommit": true }, async (t) => {
                const updateObject = {};
                if ("name" in body) {
                    updateObject.NAME = body.name;
                }
                if ("questions" in body) {
                    updateObject.QUESTIONS = JSON.stringify(body.questions);
                }
                if ("validation" in body) {
                    updateObject.VALIDATION = JSON.stringify(body.validation);
                }
                if ("staticHostname" in body) {
                    updateObject.STATICHOSTNAME = JSON.stringify(
                        body.staticHostname
                    );
                }
                if ("description" in body) {
                    updateObject.DESCRIPTION = body.description;
                }
                if ("staticHostnameCheckBox" in body) {
                    updateObject.STATICHOSTNAMECHECKBOX =
            body.staticHostnameCheckBox;
                }
                if ("carcheTemplate" in body) {
                    updateObject.CARCHETEMPLATE = body.carcheTemplate;
                }
                if ("apiEndpoint" in body) {
                    updateObject.API_ENDPOINT = body.apiEndpoint;
                }
                if ("enabled" in body) {
                    updateObject.ENABLED = body.enabled;
                }
                if ("minRollbackTimer" in body) {
                    updateObject.MIN_ROLLBACK_TIMER = body.minRollbackTimer;
                }
                if ("maxRollbackTimer" in body) {
                    updateObject.MAX_ROLLBACK_TIMER = body.maxRollbackTimer;
                }
                await Templates.update(
                    updateObject,
                    { "where": { "ID": body.id } },
                    { "transaction": t }
                ).catch((error) => {
                    loggerPino.error(error);
                    throw new Error("Database error on update!");
                });
                const updateWorkflow = await exports.checkAndUpdateWorkflowForAction(
                    body.id,
                    body.workflowId,
                    t
                );
                const updateVendorType =
          await exports.checkAndUpdateVendorTypeForAction(
              body.id,
              body.vendorTypeId,
              t
          );
                if (updateWorkflow && updateVendorType) {
                    const udpated = await exports.checkAndUpdateAssignedServicesToAction(
                        body.serviceId,
                        body.id,
                        t
                    );
                    if (udpated) {
                        return { "message": "Successful", "id": 1 };
                    }
                    return null;
                }
                return null;
            })
            .then((result) => result);
        return result;
    } catch (error) {
        loggerPino.error(error);
        return error;
    }
};

exports.updateActionAsyncToServiceToCustomerAsync = async (body) => {
    try {
        const result = await oneConnection
            .transaction({ "autocommit": true }, async (t) => {
                const updateObject = {};
                if ("name" in body) {
                    updateObject.NAME = body.name;
                }
                if ("questions" in body) {
                    updateObject.QUESTIONS = JSON.stringify(body.questions);
                }
                if ("validation" in body) {
                    updateObject.VALIDATION = JSON.stringify(body.validation);
                }
                if ("staticHostname" in body) {
                    updateObject.STATICHOSTNAME = JSON.stringify(
                        body.staticHostname
                    );
                }
                if ("description" in body) {
                    updateObject.DESCRIPTION = body.description;
                }
                if ("staticHostnameCheckBox" in body) {
                    updateObject.STATICHOSTNAMECHECKBOX =
            body.staticHostnameCheckBox;
                }
                if ("carcheTemplate" in body) {
                    updateObject.CARCHETEMPLATE = body.carcheTemplate;
                }
                if ("apiEndpoint" in body) {
                    updateObject.API_ENDPOINT = body.apiEndpoint;
                }
                if ("enabled" in body) {
                    updateObject.ENABLED = body.enabled;
                }
                if ("minRollbackTimer" in body) {
                    updateObject.MIN_ROLLBACK_TIMER = body.minRollbackTimer;
                }
                if ("maxRollbackTimer" in body) {
                    updateObject.MAX_ROLLBACK_TIMER = body.maxRollbackTimer;
                }
                await Templates.update(
                    updateObject,
                    { "where": { "ID": body.id } },
                    { "transaction": t }
                ).catch((error) => {
                    loggerPino.error(error);
                    throw new Error("Database error on update!");
                });
                const updateWorkflow = await exports.checkAndUpdateWorkflowForAction(
                    body.id,
                    body.workflowId,
                    t
                );
                const updateVendorType =
          await exports.checkAndUpdateVendorTypeForAction(
              body.id,
              body.vendorTypeId,
              t
          );
                if (updateWorkflow && updateVendorType) {
                    const updated =
            await exports.checkAndUpdateAssignedServicesToCustomerToAction(
                body.customerId,
                body.serviceId,
                body.id,
                t
            );
                    if (updated) {
                        return { "message": "Successful", "id": 1 };
                    }
                    return null;
                }
                return null;
            })
            .then((result) => result);
        return result;
    } catch (error) {
        loggerPino.error(error);
        return error;
    }
};

exports.checkAndUpdateWorkflowForAction = async (actionId, workflowId, t) => {
    const workFlowToTemplate = await WorkFlowToTemplate.findOne({
        "where": { "TEMPLATE_ID": actionId }
    }).catch((error) => {
        loggerPino.error(error);
        throw new Error("Database error");
    });
    if (workFlowToTemplate.dataValues && workFlowToTemplate.dataValues.ID) {
        if (!(workFlowToTemplate.dataValues.WORKFLOW_ID == workflowId)) {
            const updateWorkFlowToTemplate = await WorkFlowToTemplate.update(
                {
                    "WORKFLOW_ID": workflowId
                },
                {
                    "where": {
                        "ID": workFlowToTemplate.dataValues.ID
                    }
                },
                { "transaction": t }
            ).catch((error) => {
                loggerPino.error(error);
                throw new Error("Database error on update!");
            });
        }
        return true;
    }
    return false;
};

exports.checkAndUpdateVendorTypeForAction = async (
    actionId,
    vendorTypeId,
    t
) => {
    const vendorTypeToTemplate = await TemplateToVendor.findOne({
        "where": { "TEMPLATE_ID": actionId }
    }).catch((error) => {
        loggerPino.error(error);
        throw new Error("Database error");
    });
    if (
        vendorTypeToTemplate.dataValues &&
    vendorTypeToTemplate.dataValues.ID
    ) {
        if (!(vendorTypeToTemplate.dataValues.VENDOR_ID == vendorTypeId)) {
            const updateVendorTypeToTemplate = await TemplateToVendor.update(
                {
                    "VENDOR_ID": vendorTypeId
                },
                {
                    "where": {
                        "ID": vendorTypeToTemplate.dataValues.ID
                    }
                },
                { "transaction": t }
            ).catch((error) => {
                loggerPino.error(error);
                throw new Error("Database error on update!");
            });
        }
        return true;
    }
    return false;
};

exports.checkAndUpdateAssignedServicesToAction = async (
    services,
    actionId,
    t
) => {
    const searchTemplateToService = await TemplateToService.findAll({
        "where": { "TEMPLATE_ID": actionId }
    }).catch((error) => {
        loggerPino.error(error);
        throw new Error("Database error on findAll!");
    });
    if (searchTemplateToService) {
        for (element of searchTemplateToService) {
            searchedService = services.find(
                (service) => service.id == element.SERVICE_ID
            );
            if (searchedService) {
                const checkService = (service) => service.id == searchedService.id;
                const index = services.findIndex(checkService);
                services.splice(index, 1);
            } else {
                const deletedServiceRelation = await TemplateToService.destroy(
                    {
                        "where": { "TEMPLATE_ID": actionId, "SERVICE_ID": element.SERVICE_ID }
                    },
                    { "transaction": t }
                ).catch((error) => {
                    loggerPino.error(error);
                    throw new Error("Database error on destroy!");
                });
            }
        }
    }
    for (service of services) {
        const templateToService = await TemplateToService.create(
            {
                "TEMPLATE_ID": actionId,
                "SERVICE_ID": service.id
            },
            { "transaction": t }
        ).catch((error) => {
            loggerPino.error(error);
            throw new Error("Database error on create!");
        });
        if (!templateToService.dataValues) {
            return false;
        }
    }
    return true;
};

exports.checkAndUpdateAssignedServicesToCustomerToAction = async (
    customerId,
    services,
    actionId,
    t
) => {
    const searchTemplateToServiceToCustomer =
    await TemplateToServiceToCustomer.findAll({
        "where": { "TEMPLATE_ID": actionId }
    }).catch((error) => {
        loggerPino.error(error);
        throw new Error("Database error");
    });
    serviceToCustomerIds = await exports.loadAllServiceToCustomerIds(
        customerId,
        services
    );
    if (searchTemplateToServiceToCustomer) {
        for (element of searchTemplateToServiceToCustomer) {
            searchedService = serviceToCustomerIds.find((id) => id == element.ID);
            if (searchedService) {
                const checkService = (id) => id == searchedService.id;
                const index = serviceToCustomerIds.findIndex(checkService);
                serviceToCustomerIds.splice(index, 1);
            } else {
                const deletedServiceRelation =
          await TemplateToServiceToCustomer.destroy(
              {
                  "where": { "ID": element.ID }
              },
              { "transaction": t }
          ).catch((error) => {
              loggerPino.error(error);
              throw new Error("Database error on destroy!");
          });
            }
        }
    }

    for (id of serviceToCustomerIds) {
        const templateToServiceToCustomer =
      await TemplateToServiceToCustomer.create(
          {
              "TEMPLATE_ID": actionId,
              "SERVICE_TO_CUSTOMER_ID": id
          },
          { "transaction": t }
      ).catch((error) => {
          loggerPino.error(error);
          throw new Error("Database error on create!");
      });
        if (!templateToServiceToCustomer.dataValues) {
            return false;
        }
    }
    return true;
};

exports.loadAllServiceToCustomerIds = async (customerId, services) => {
    const result = [];
    for (const service of services) {
        const serviceToCustomer = await ServiceToCustomer.findOne({
            "where": {
                "CUSTOMER_ID": customerId,
                "SERVICE_ID": service.id
            }
        }).catch((error) => {
            loggerPino.error(error);
            throw new Error("Database error");
        });
        if (serviceToCustomer.dataValues) {
            result.push(serviceToCustomer.dataValues.ID);
        }
    }
    return result;
};

exports.addAction = [
    [
        body("name").trim(),
        check("workflowId").isNumeric(),
        check("vendorTypeId").isNumeric(),
        check("name").isLength({ "min": 0, "max": 120 }),
        body("description").trim(),
        check("staticHostnameCheckBox").optional().isBoolean(),
        body("carcheTemplate").trim(),
        body("apiEndpoint").trim(),
        body("enabled").trim()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(unprocessableEntity).json({ errors });
        }
        if (!(req.body.serviceId && req.body.serviceId.length > 0)) {
            return res.status(unprocessableEntity).send({ "message": "Service id array missing!" });
        }
        try {
            let insertedRecord = null;
            if (req.body.customerId) {
                insertedRecord = await exports.addActionToServiceToCustomerAsync(req.body);
            } else {
                insertedRecord = await exports.addActionToServiceAsync(req.body);
            }
            const { message, result } = insertedRecord;
            if (result && message === "Successful") {
                // Check if it is Data Collection Template/ If yes Put it to SNOW
                const { serviceId, customerId, workflowId, vendorTypeId, vendorType } = req.body;
                const { id, name, description, enabled } = result;
                const templateData = { id, name, description, enabled, serviceId, customerId, workflowId, vendorTypeId, vendorType };
                snowController.processTemplate("create", templateData);
                return res.status(created).send({ message, result });
            }
            throw new Error("Unable to create the action template!");
        } catch (error) {
            loggerPino.error(error);
            return res
                .status(internalServerError)
                .send({ "message": error.message || "Internal server error!", "errorId": "" });
        }
    }
];

exports.addActionToServiceAsync = async (body) => {
    try {
        const result = await oneConnection
            .transaction({ "autocommit": true }, async (t) => {
                questions = null;
                validation = null;
                staticHostname = null;
                if (body.questions) {
                    questions = JSON.stringify(body.questions);
                }
                if (body.validation) {
                    validation = JSON.stringify(body.validation);
                }
                if (body.staticHostname) {
                    staticHostname = JSON.stringify(body.staticHostname);
                }
                const template = await Templates.create(
                    {
                        "NAME": body.name,
                        "QUESTIONS": questions,
                        "VALIDATION": validation,
                        "DESCRIPTION": body.description,
                        "STATICHOSTNAMECHECKBOX": body.staticHostnameCheckBox,
                        "CARCHETEMPLATE": body.carcheTemplate,
                        "STATICHOSTNAME": staticHostname,
                        "API_ENDPOINT": body.apiEndpoint,
                        "ENABLED": body.enabled,
                        "MIN_ROLLBACK_TIMER": body.minRollbackTimer,
                        "MAX_ROLLBACK_TIMER": body.maxRollbackTimer
                    },
                    { "transaction": t }
                ).catch((error) => {
                    loggerPino.error(error);
                    throw new Error("Database error on create!");
                });
                if (template && template.dataValues.ID) {
                    const workFlowToTemplate = await WorkFlowToTemplate.create(
                        {
                            "WORKFLOW_ID": body.workflowId,
                            "TEMPLATE_ID": template.dataValues.ID
                        },
                        { "transaction": t }
                    );
                    // Add vendor type
                    const vendorToTemplate = await TemplateToVendor.create(
                        {
                            "VENDOR_ID": body.vendorTypeId,
                            "TEMPLATE_ID": template.dataValues.ID
                        },
                        { "transaction": t }
                    );
                    counter = 0;
                    for (service of body.serviceId) {
                        const templateToService = await TemplateToService.create(
                            {
                                "TEMPLATE_ID": template.dataValues.ID,
                                "SERVICE_ID": service.id
                            },
                            { "transaction": t }
                        );
                        if (templateToService && templateToService.dataValues.ID) {
                            counter++;
                        }
                    }
                    if (
                        counter == body.serviceId.length &&
            workFlowToTemplate.dataValues.ID &&
            vendorToTemplate.dataValues.ID
                    ) {
                        return {
                            "message": "Successful",
                            "id": 1,
                            "result": {
                                "id": template.dataValues.ID,
                                "name": template.dataValues.NAME,
                                "questions": template.dataValues.QUESTIONS,
                                "validation": template.dataValues.VALIDATION,
                                "description": template.dataValues.DESCRIPTION,
                                "staticHostnameCheckBox":
                  template.dataValues.STATICHOSTNAMECHECKBOX,
                                "carcheTemplate": template.dataValues.CARCHETEMPLATE,
                                "staticHostname": template.dataValues.STATICHOSTNAME,
                                "apiEndpoint": template.dataValues.API_ENDPOINT,
                                "enabled": template.dataValues.ENABLED,
                                "minRollbackTimer": template.dataValues.MIN_ROLLBACK_TIMER,
                                "maxRollbackTimer": template.dataValues.MAX_ROLLBACK_TIMER
                            }
                        };
                    }
                    return null;
                }
                return null;
            })
            .then((result) => result);
        return result;
    } catch (error) {
        loggerPino.error(error);
        return error;
    }
};

exports.addActionToServiceToCustomerAsync = async (body) => {
    questions = null;
    validation = null;
    staticHostname = null;
    if (body.questions) {
        questions = JSON.stringify(body.questions);
    }
    if (body.validation) {
        validation = JSON.stringify(body.validation);
    }
    if (body.staticHostname) {
        staticHostname = JSON.stringify(body.staticHostname);
    }
    try {
        const result = await oneConnection
            .transaction({ "autocommit": true }, async (t) => {
                const template = await Templates.create(
                    {
                        "NAME": body.name,
                        "QUESTIONS": questions,
                        "VALIDATION": validation,
                        "DESCRIPTION": body.description,
                        "STATICHOSTNAMECHECKBOX": body.staticHostnameCheckBox,
                        "CARCHETEMPLATE": body.carcheTemplate,
                        "STATICHOSTNAME": staticHostname,
                        "API_ENDPOINT": body.apiEndpoint,
                        "ENABLED": body.enabled,
                        "MIN_ROLLBACK_TIMER": body.minRollbackTimer,
                        "MAX_ROLLBACK_TIMER": body.maxRollbackTimer
                    },
                    { "transaction": t }
                ).catch((error) => {
                    loggerPino.error(error);
                    throw new Error("Database error on create!");
                });
                if (template && template.dataValues.ID) {
                    const workFlowToTemplate = await WorkFlowToTemplate.create(
                        {
                            "WORKFLOW_ID": body.workflowId,
                            "TEMPLATE_ID": template.dataValues.ID
                        },
                        { "transaction": t }
                    );
                    const vendorToTemplate = await TemplateToVendor.create(
                        {
                            "VENDOR_ID": body.vendorTypeId,
                            "TEMPLATE_ID": template.dataValues.ID
                        },
                        { "transaction": t }
                    );
                    serviceToCustomers = [];
                    for (service of body.serviceId) {
                        const serviceToCustomer = await ServiceToCustomer.findOne(
                            {
                                "where": {
                                    "CUSTOMER_ID": body.customerId,
                                    "SERVICE_ID": service.id
                                }
                            },
                            { "transaction": t }
                        );
                        if (serviceToCustomer && serviceToCustomer.dataValues.ID) {
                            serviceToCustomers.push(serviceToCustomer.dataValues.ID);
                        }
                    }
                    if (serviceToCustomers.length == body.serviceId.length) {
                        counter = 0;
                        for (serviceToCustomerId of serviceToCustomers) {
                            const templateToServiceToCustomer =
                await TemplateToServiceToCustomer.create(
                    {
                        "TEMPLATE_ID": template.dataValues.ID,
                        "SERVICE_TO_CUSTOMER_ID": serviceToCustomerId
                    },
                    { "transaction": t }
                );
                            if (
                                templateToServiceToCustomer &&
                templateToServiceToCustomer.dataValues.ID
                            ) {
                                counter++;
                            }
                        }
                        if (
                            counter == body.serviceId.length &&
              workFlowToTemplate.dataValues.ID &&
              vendorToTemplate.dataValues.ID
                        ) {
                            return {
                                "message": "Successful",
                                "id": 1,
                                "result": {
                                    "id": template.dataValues.ID,
                                    "name": template.dataValues.NAME,
                                    "questions": template.dataValues.QUESTIONS,
                                    "validation": template.dataValues.VALIDATION,
                                    "description": template.dataValues.DESCRIPTION,
                                    "staticHostnameCheckBox":
                    template.dataValues.STATICHOSTNAMECHECKBOX,
                                    "carcheTemplate": template.dataValues.CARCHETEMPLATE,
                                    "staticHostname": template.dataValues.STATICHOSTNAME,
                                    "apiEndpoint": template.dataValues.API_ENDPOINT,
                                    "enabled": template.dataValues.ENABLED,
                                    "minRollbackTimer": template.dataValues.MIN_ROLLBACK_TIMER,
                                    "maxRollbackTimer": template.dataValues.MAX_ROLLBACK_TIMER
                                }
                            };
                        }
                        return null;
                    }
                    return null;
                }
                return { "message": "Bad action id provided!", "id": 0 };
            })
            .then((result) => result);
        return result;
    } catch (error) {
        loggerPino.error(error);
        return error;
    }
};

exports.deleteAction = [
    [check("id").isNumeric()],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(unprocessableEntity).json({ errors });
        }
        try {
            const { id } = req.query;
            const { dataValues } = await WorkFlowToTemplate.findOne({ "where": { "TEMPLATE_ID": id } });
            const result = await exports.deleteActionAsync(req.query);
            if (result.message == "Successful!") {
                snowController.processTemplate("delete", { id, "workflowId": dataValues.WORKFLOW_ID });
                return res.status(ok).send({ "message": "Successful!" });
            }
        } catch (error) {
            loggerPino.error(error);
            return res
                .status(internalServerError)
                .send({ "message": "Internal server error!", "errorId": "" });
        }
    }
];

exports.deleteActionAsync = async (query) => {
    const result = await oneConnection
        .transaction({ "autocommit": true }, async (t) => {
            const templates = await Templates.destroy(
                {
                    "where": { "ID": query.id }
                },
                { "transaction": t }
            ).catch((error) => {
                loggerPino.error(error);
                throw new Error("Database error on destroy!");
            });
            if (templates) {
                return { "message": "Successful!" };
            }
            return { "message": "Client error!" };
        })
        .then((result) => result);
    return result;
};

exports.loadActionAssignedServices = [
    [check("id").isNumeric(), check("type").isLength({ "min": 7, "max": 8 })],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(unprocessableEntity).json({ errors });
        } else if (req.query.type == "service") {
            exports
                .loadActionAssignedServicesAsync(req.query)
                .then((result) => res
                    .status(ok)
                    .send({ "message": "Successful!", result }))
                .catch((error) => {
                    loggerPino.error(error);
                    return res
                        .status(internalServerError)
                        .send({ "message": "Internal server error!", "errorId": "" });
                });
        } else {
            exports
                .loadActionAssignedServicesToCustomerAsync(req.query)
                .then((result) => res
                    .status(ok)
                    .send({ "message": "Successful!", result }))
                .catch((error) => {
                    loggerPino.error(error);
                    return res
                        .status(internalServerError)
                        .send({ "message": "Internal server error!", "errorId": "" });
                });
        }
    }
];

exports.loadActionAssignedServicesAsync = async (query) => {
    const templateToService = await TemplateToService.findAll({
        "where": {
            "TEMPLATE_ID": query.id
        }
    }).catch((error) => {
        loggerPino.error(error);
        throw new Error("Database error");
    });
    const services = [];
    if (templateToService) {
        for (const element of templateToService) {
            const serviceName = await ServiceName.findOne({
                "where": { "ID": element.dataValues.SERVICE_ID }
            }).catch((error) => {
                loggerPino.error(error);
                throw new Error("Database error");
            });
            if (serviceName && serviceName.dataValues) {
                services.push({
                    "id": serviceName.dataValues.ID,
                    "serviceName": serviceName.dataValues.SERVICE_NAME
                });
            }
        }
    }
    return services;
};

exports.loadActionAssignedServicesToCustomerAsync = async (query) => {
    const templateToServiceToCustomer = await TemplateToServiceToCustomer.findAll(
        {
            "where": {
                "TEMPLATE_ID": query.id
            }
        }
    ).catch((error) => {
        loggerPino.error(error);
        throw new Error("Database error");
    });
    const services = [];
    if (templateToServiceToCustomer) {
        for (const element of templateToServiceToCustomer) {
            const serviceToCustomer = await ServiceToCustomer.findOne({
                "where": { "ID": element.dataValues.SERVICE_TO_CUSTOMER_ID }
            }).catch((error) => {
                loggerPino.error(error);
                throw new Error("Database error");
            });
            if (serviceToCustomer.dataValues) {
                const serviceName = await ServiceName.findOne({
                    "where": { "ID": serviceToCustomer.dataValues.SERVICE_ID }
                }).catch((error) => {
                    loggerPino.error(error);
                    throw new Error("Database error");
                });
                if (serviceName && serviceName.dataValues) {
                    services.push({
                        "id": serviceName.dataValues.ID,
                        "serviceName": serviceName.dataValues.SERVICE_NAME
                    });
                }
            }
        }
        return services;
    }
};

/**
 * Function for load the config template which is used in action
 */

exports.loadActionsByCarcheTemplate = [
    [
        query("name").trim(),
        check("name").isLength({ "min": 1, "max": 128 }),
        query("id").trim(),
        check("id").isNumeric()
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(unprocessableEntity).json({ errors });
        }
        const condition = {
            "name": req.query.name,
            "id": parseInt(req.query.id)
        };
        exports
            .getAllActionByCarcheTemp(condition)
            .then((result) => {
                /*
                 * Success also if there is not tempalte, in FE is check if the lenght of the result
                 * Is higher then 0, if yes it is not allow to delete tempalte
                 * If lower delete template
                 */
                if (result && result.length > 0) {
                    return res
                        .status(ok)
                        .send({ "message": "Successful!", result });
                }
                return res.status(ok).send({ "message": "Successful!", "result": [] });
            })
            .catch((error) => {
                loggerPino.error(error);
                return res
                    .status(internalServerError)
                    .send({ "message": "Internal server error!", "errorId": "" });
            });
    }
];

/*
 * Example of condtion '{"name":"sd_wan_ott_temp","id":2389}'
 * using like because object carche template is changed
 */
exports.getAllActionByCarcheTemp = async function(condition) {
    let result = [];
    try {
        const conditionAsString = JSON.stringify(condition);
        const templates = await Templates.findAll({
            "where": {
                "CARCHETEMPLATE": {
                    [Sequelize.Op.substring]: conditionAsString.substring(
                        1,
                        conditionAsString.length - 1
                    )
                }
            }
        });
        if (templates) {
            result = templates;
        }
        return result;
    } catch (error) {
        loggerPino.error(error);
        throw new Error("Database error");
    }
};

// { "name": "testing_first", "id": 2551, "contractid": "1", "services": "1", "deviceModel": "1", "version": 1, "templateType": "1", "vendorType": "1" }
/**
 * Function to update the changed id in actions
 */
exports.updateActionTriggeredByCarchTempChange = [
    [
        body("name").trim(),
        check("name").isLength({ "min": 1, "max": 128 }),
        body("id").trim(),
        check("id").isNumeric(),
        body("updatedId").trim(),
        check("updatedId").isNumeric(),
        check("contractid").optional().isLength({ "min": 1, "max": 11 }),
        check("services").optional().isLength({ "min": 1, "max": 11 }),
        body("deviceModel").trim(),
        check("deviceModel").isLength({ "min": 1, "max": 11 }),
        body("version").trim(),
        check("version").isNumeric(),
        body("templateType").trim(),
        check("templateType").isLength({ "min": 1, "max": 11 }),
        body("vendorType").trim(),
        check("vendorType").isLength({ "min": 1, "max": 11 })
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(unprocessableEntity).json({ errors });
        }
        exports
            .updateActionByCarcheTemp(req.body)
            .then((result) => {
                if (result.message == "Successful!") {
                    return res.status(ok).send({ "message": "Successful!" });
                }
                return res.status(400).send({ "message": result.message });
            })
            .catch((error) => {
                loggerPino.error(error);
                return res.status(internalServerError).send({ "message": "Internal server error!" });
            });
    }
];

exports.updateActionByCarcheTemp = async function(body) {
    const condition = {
        "name": body.name,
        "id": parseInt(body.id)
    };
    // { "name": "testing_first", "id": 2551, "contractid": "1", "services": "1", "deviceModel": "1", "version": 1, "templateType": "1", "vendorType": "1" }
    const carcheTempDetails = {
        "name": body.name,
        "id": parseInt(body.updatedId),
        "contractid": body.contractid || "",
        "services": body.services || "",
        "deviceModel": body.deviceModel,
        "version": body.version,
        "templateType": body.templateType,
        "vendorType": body.vendorType
    };
    try {
    // Check if template is used
        const usedTemplates = await exports.getAllActionByCarcheTemp(condition);
        // If no template then update not required
        if (usedTemplates.length <= 0) {
            return { "message": "Successful!" };
        }
        // Update template
        const conditionAsString = JSON.stringify(condition);
        const result = await oneConnection
            .transaction({ "autocommit": true }, async (t) => {
                const templates = await Templates.update(
                    {
                        "CARCHETEMPLATE": JSON.stringify(carcheTempDetails)
                    },
                    {
                        "where": {
                            "CARCHETEMPLATE": {
                                [Sequelize.Op.substring]: conditionAsString.substring(
                                    1,
                                    conditionAsString.length - 1
                                )
                            }
                        }
                    },
                    { "transaction": t }
                );
                if (templates[0] > 0) {
                    return { "message": "Successful!" };
                }
                return { "message": "Client error!" };
            })
            .then((result) => result);
        return result;
    } catch (error) {
        loggerPino.error(error);
        throw new Error("Internal error");
    }
};

exports.getAllTemplatesForServiceCustomer = [
    [
        query("serviceId").trim(),
        check("serviceId").isLength({ "min": 1, "max": 255 }),
        query("customerId").trim(),
        check("customerId").isLength({ "min": 1, "max": 255 })
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(unprocessableEntity).json({ errors });
        }
        const result = [];
        let serviceToCustomerId = 0;
        ServiceToCustomer.findOne({
            "where": {
                "SERVICE_ID": req.query.serviceId,
                "CUSTOMER_ID": req.query.customerId
            }
        })
            .then((resultId) => {
                serviceToCustomerId = resultId.dataValues.ID;
                Templates.findAll({
                    "include": [
                        {
                            "model": TemplateToServiceToCustomer,
                            "required": true,
                            "where": { "SERVICE_TO_CUSTOMER_ID": serviceToCustomerId }
                        }
                    ]
                })
                    .then((partResults) => {
                        partResults.forEach((partResult) => {
                            result.push(partResult);
                        });
                        return res
                            .status(ok)
                            .send({ result, "message": "Successful!" });
                    })
                    .catch((error) => res.status(internalServerError).send({ "message": "Template error!" }));
            })
            .catch((error) => {
                console.log(error);
                return res.status(internalServerError).send({ "message": "ServiceToCustomer error!" });
            });
    }
];

exports.getAllAvailableTemplatesForUser = [
    [
        query("serviceId").trim(),
        check("serviceId").isLength({ "min": 1, "max": 255 }),
        query("customerId").trim(),
        check("customerId").isLength({ "min": 1, "max": 255 }),
        query("attuid").trim(),
        check("attuid").isLength({ "min": 1, "max": 255 })
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(unprocessableEntity).send({ "message": errors });
        }
        const result = [];
        const { upmLevels } = req;
        let serviceToCustomerId = 0;
        // Find service to customer id relation in service to customer table
        let ServiceToCustomerResultId = [];
        try {
            ServiceToCustomerResultId = await ServiceToCustomer.findAll({
                "where": {
                    "SERVICE_ID": req.query.serviceId,
                    "CUSTOMER_ID": req.query.customerId
                },
                "include": [
                    {
                        "model": ServiceName
                    },

                    {
                        "model": UserToServiceToCustomer,
                        "required": true,
                        "include": [
                            {
                                "model": Users,
                                "where": { "ATTUID": req.query.attuid }
                            }
                        ]
                    }
                ]
            });
        } catch (error) {
            loggerPino.error(error);
            return res.status(internalServerError).send({ "message": "ServiceToCustomer error!" });
        }

        if (ServiceToCustomerResultId.length > 0) {
            serviceToCustomerId = ServiceToCustomerResultId[0].dataValues.ID;

            // Find all available actions(templates) based on service to customer id relation
            let serviceToCustomerTemplates = [];
            try {
                serviceToCustomerTemplates = await Templates.findAll({
                    "include": [
                        {
                            "model": TemplateToServiceToCustomer,
                            "required": true,
                            "where": { "SERVICE_TO_CUSTOMER_ID": serviceToCustomerId }
                        },
                        {
                            "model": TemplateToVendor,
                            "required": true,
                            "include": [
                                {
                                    "model": CTVendorTypes
                                }
                            ]
                        },
                        {
                            "model": WorkFlowToTemplate,
                            "include": [
                                {
                                    "model": Workflow
                                }
                            ]
                        }
                    ],
                    "where": {
                        "ENABLED": true
                    },
                    "order": [["ID", "DESC"]]
                });
            } catch (error) {
                loggerPino.error(error);
                return res.status(internalServerError).send({ "message": "Template error!" });
            }
            const services = [];
            services.push(
                ServiceToCustomerResultId[0].dataValues.ServiceName.dataValues.SERVICE_NAME
            );
            serviceToCustomerTemplates.forEach((template) => {
                let questions;
                let validation;
                let splitValidation;
                let carcheTemplate;
                let staticHostname;
                if (template.dataValues.QUESTIONS != null) {
                    questions = template.dataValues.QUESTIONS.toString();
                }
                if (template.dataValues.VALIDATION != null) {
                    validation = template.dataValues.VALIDATION.toString();
                    validation = validation.replace(/"/gi, "");
                    splitValidation = validation.split("\\n");
                }
                if (template.dataValues.CARCHETEMPLATE != null) {
                    carcheTemplate = template.dataValues.CARCHETEMPLATE.toString();
                }
                if (template.dataValues.STATICHOSTNAME != null) {
                    staticHostname = template.dataValues.STATICHOSTNAME.toString();
                }
                const templObj = {
                    "ID": template.dataValues.ID,
                    "NAME": template.dataValues.NAME,
                    "QUESTIONS": questions,
                    "VALIDATION": splitValidation,
                    "DESCRIPTION": template.dataValues.DESCRIPTION,
                    "STATICHOSTNAMECHECKBOX":
            template.dataValues.STATICHOSTNAMECHECKBOX,
                    "CARCHETEMPLATE": carcheTemplate,
                    "STATICHOSTNAME": staticHostname,
                    "VENDOR_TYPE":
            template.dataValues.TemplateToVendors[0].dataValues.CTVendorType.dataValues.VENDOR_TYPE,
                    "SERVICE_NAME": services,
                    "WORKFLOW":
            template.dataValues.WorkFlowToTemplates[0].dataValues.Workflow.NAME,
                    "WORKFLOW_ID":
            template.dataValues.WorkFlowToTemplates[0].dataValues.Workflow.ID,
                    "API_ENDPOINT": template.dataValues.API_ENDPOINT,
                    "ENABLED": template.dataValues.ENABLED,
                    "MIN_ROLLBACK_TIMER": template.dataValues.MIN_ROLLBACK_TIMER,
                    "MAX_ROLLBACK_TIMER": template.dataValues.MAX_ROLLBACK_TIMER
                };
                // Push found actions(templates) into result
                if (
                    !result.some((result) => result.ID === templObj.ID) ||
          result.length === 0
                ) {
                    result.push(templObj);
                }
            });
        }
        // Find all available actions(templates) based on their relation to service id
        let serviceTemplate = [];
        try {
            serviceTemplate = await Templates.findAll({
                "include": [
                    {
                        "model": TemplateToService,
                        "required": true,
                        "include": [
                            {
                                "model": ServiceName,
                                "required": true,
                                "include": [
                                    {
                                        "model": UserToService,
                                        "required": true,
                                        "include": [
                                            {
                                                "model": Users,
                                                "required": true,
                                                "where": { "ATTUID": req.query.attuid }
                                            }
                                        ]
                                    },
                                    {
                                        "model": ServiceToCustomer,
                                        "required": true,
                                        "where": { "CUSTOMER_ID": req.query.customerId }
                                    }
                                ],
                                "where": { "ID": req.query.serviceId }
                            }
                        ]
                    },
                    {
                        "model": TemplateToVendor,
                        "required": true,
                        "include": [
                            {
                                "model": CTVendorTypes
                            }
                        ]
                    },
                    {
                        "model": WorkFlowToTemplate,
                        "include": [
                            {
                                "model": Workflow
                            }
                        ]
                    }
                ],
                "where": {
                    "ENABLED": true
                },
                "order": [["ID", "DESC"]]
            });
        } catch (error) {
            loggerPino.error(error);
            return res.status(internalServerError).send({ "message": "ServiceToTemplate error!" });
        }

        serviceTemplate.forEach((template) => {
            let questions;
            let validation;
            let splitValidation;
            let carcheTemplate;
            let staticHostname;
            if (template.dataValues.QUESTIONS != null) {
                questions = template.dataValues.QUESTIONS.toString();
            }
            if (template.dataValues.VALIDATION != null) {
                validation = template.dataValues.VALIDATION.toString();
                validation = validation.replace(/"/gi, "");
                splitValidation = validation.split("\\n");
            }
            if (template.dataValues.CARCHETEMPLATE != null) {
                carcheTemplate = template.dataValues.CARCHETEMPLATE.toString();
            }
            if (template.dataValues.STATICHOSTNAME != null) {
                staticHostname = template.dataValues.STATICHOSTNAME.toString();
            }

            const services = [];
            template.dataValues.TemplateToServices.forEach(
                (templateServices) => {
                    services.push(
                        templateServices.dataValues.ServiceName.dataValues.SERVICE_NAME
                    );
                }
            );
            const templObj = {
                "ID": template.dataValues.ID,
                "NAME": template.dataValues.NAME,
                "QUESTIONS": questions,
                "VALIDATION": splitValidation,
                "DESCRIPTION": template.dataValues.DESCRIPTION,
                "STATICHOSTNAMECHECKBOX":
          template.dataValues.STATICHOSTNAMECHECKBOX,
                "CARCHETEMPLATE": carcheTemplate,
                "STATICHOSTNAME": staticHostname,
                "VENDOR_TYPE":
          template.dataValues.TemplateToVendors[0].dataValues.CTVendorType.dataValues.VENDOR_TYPE,
                "SERVICE_NAME": services,
                "WORKFLOW":
          template.dataValues.WorkFlowToTemplates[0].dataValues.Workflow.NAME,
                "WORKFLOW_ID":
          template.dataValues.WorkFlowToTemplates[0].dataValues.Workflow.ID,
                "API_ENDPOINT": template.dataValues.API_ENDPOINT,
                "ENABLED": template.dataValues.ENABLED,
                "MIN_ROLLBACK_TIMER": template.dataValues.MIN_ROLLBACK_TIMER,
                "MAX_ROLLBACK_TIMER": template.dataValues.MAX_ROLLBACK_TIMER
            };
            if (
                !result.some((result) => result.ID === templObj.ID) ||
        result.length === 0
            ) {
                result.push(templObj);
            }
        });
        let serviceIndividualTemplate = [];
        try {
            serviceIndividualTemplate = await Templates.findAll({
                "include": [
                    {
                        "model": TemplateToService,
                        "required": true,
                        "include": [
                            {
                                "model": ServiceName,
                                "required": true,
                                "include": [
                                    {
                                        "model": ServiceToCustomer,
                                        "required": true,
                                        "where": { "CUSTOMER_ID": req.query.customerId }
                                    }
                                ],
                                "where": { "ID": req.query.serviceId }
                            }
                        ]
                    },
                    {
                        "model": UsersTemplate,
                        "required": true,
                        "include": [
                            {
                                "model": Users,
                                "required": true,
                                "where": { "ATTUID": req.query.attuid }
                            }
                        ]
                    },
                    {
                        "model": TemplateToVendor,
                        "required": true,
                        "include": [
                            {
                                "model": CTVendorTypes
                            }
                        ]
                    },
                    {
                        "model": WorkFlowToTemplate,
                        "include": [
                            {
                                "model": Workflow
                            }
                        ]
                    }
                ],
                "where": {
                    "ENABLED": true
                },
                "order": [["ID", "DESC"]]
            });
        } catch (error) {
            loggerPino.error(error);
            return res.status(internalServerError).send({ "message": "ServiceToTemplate error!" });
        }

        serviceIndividualTemplate.forEach((template) => {
            let questions;
            let validation;
            let splitValidation;
            let carcheTemplate;
            let staticHostname;
            if (template.dataValues.QUESTIONS != null) {
                questions = template.dataValues.QUESTIONS.toString();
            }
            if (template.dataValues.VALIDATION != null) {
                validation = template.dataValues.VALIDATION.toString();
                validation = validation.replace(/"/gi, "");
                splitValidation = validation.split("\\n");
            }
            if (template.dataValues.CARCHETEMPLATE != null) {
                carcheTemplate = template.dataValues.CARCHETEMPLATE.toString();
            }
            if (template.dataValues.STATICHOSTNAME != null) {
                staticHostname = template.dataValues.STATICHOSTNAME.toString();
            }

            const services = [];
            template.dataValues.TemplateToServices.forEach(
                (templateServices) => {
                    services.push(
                        templateServices.dataValues.ServiceName.dataValues.SERVICE_NAME
                    );
                }
            );
            const templObj = {
                "ID": template.dataValues.ID,
                "NAME": template.dataValues.NAME,
                "QUESTIONS": questions,
                "VALIDATION": splitValidation,
                "DESCRIPTION": template.dataValues.DESCRIPTION,
                "STATICHOSTNAMECHECKBOX":
          template.dataValues.STATICHOSTNAMECHECKBOX,
                "CARCHETEMPLATE": carcheTemplate,
                "STATICHOSTNAME": staticHostname,
                "VENDOR_TYPE":
          template.dataValues.TemplateToVendors[0].dataValues.CTVendorType.dataValues.VENDOR_TYPE,
                "SERVICE_NAME": services,
                "WORKFLOW":
          template.dataValues.WorkFlowToTemplates[0].dataValues.Workflow.NAME,
                "WORKFLOW_ID":
          template.dataValues.WorkFlowToTemplates[0].dataValues.Workflow.ID,
                "API_ENDPOINT": template.dataValues.API_ENDPOINT,
                "ENABLED": template.dataValues.ENABLED,
                "MIN_ROLLBACK_TIMER": template.dataValues.MIN_ROLLBACK_TIMER,
                "MAX_ROLLBACK_TIMER": template.dataValues.MAX_ROLLBACK_TIMER
            };
            if (
                !result.some((result) => result.ID === templObj.ID) ||
        result.length === 0
            ) {
                result.push(templObj);
            }
        });

        // Find template based on their relation to user
        let templateUsers = [];
        try {
            templateUsers = await Templates.findAll({
                "include": [
                    {
                        "model": UsersTemplate,
                        "required": true,
                        "include": [
                            {
                                "model": Users,
                                "where": { "ATTUID": req.query.attuid }
                            }
                        ]
                    },
                    {
                        "model": TemplateToVendor,
                        "required": true,
                        "include": [
                            {
                                "model": CTVendorTypes
                            }
                        ]
                    },
                    {
                        "model": WorkFlowToTemplate,
                        "include": [
                            {
                                "model": Workflow
                            }
                        ]
                    },
                    {
                        "model": TemplateToServiceToCustomer,
                        "required": true,
                        "include": [
                            {
                                "model": ServiceToCustomer,
                                "where": {
                                    "SERVICE_ID": req.query.serviceId,
                                    "CUSTOMER_ID": req.query.customerId
                                },
                                "include": [
                                    {
                                        "model": ServiceName
                                    }
                                ]
                            }
                        ]
                    }
                ],
                "where": {
                    "ENABLED": true
                },
                "order": [["ID", "DESC"]]
            });
        } catch (error) {
            loggerPino.error(error);
            return res.status(internalServerError).send({ "message": "Template error!" });
        }
        templateUsers.forEach((template) => {
            const services = [];
            template.dataValues.TemplateToServiceToCustomers.forEach(
                (service) => {
                    services.push(
                        service.dataValues.ServiceToCustomer.dataValues.ServiceName.SERVICE_NAME
                    );
                }
            );
            let questions;
            let validation;
            let splitValidation;
            let carcheTemplate;
            let staticHostname;
            if (template.dataValues.QUESTIONS != null) {
                questions = template.dataValues.QUESTIONS.toString();
            }
            if (template.dataValues.VALIDATION != null) {
                validation = template.dataValues.VALIDATION.toString();
                validation = validation.replace(/"/gi, "");
                splitValidation = validation.split("\\n");
            }

            if (template.dataValues.CARCHETEMPLATE != null) {
                carcheTemplate = template.dataValues.CARCHETEMPLATE.toString();
            }
            if (template.dataValues.STATICHOSTNAME != null) {
                staticHostname = template.dataValues.STATICHOSTNAME.toString();
            }

            const templObj = {
                "ID": template.dataValues.ID,
                "NAME": template.dataValues.NAME,
                "QUESTIONS": questions,
                "VALIDATION": splitValidation,
                "DESCRIPTION": template.dataValues.DESCRIPTION,
                "STATICHOSTNAMECHECKBOX":
          template.dataValues.STATICHOSTNAMECHECKBOX,
                "CARCHETEMPLATE": carcheTemplate,
                "STATICHOSTNAME": staticHostname,
                "VENDOR_TYPE":
          template.dataValues.TemplateToVendors[0].dataValues.CTVendorType.dataValues.VENDOR_TYPE,
                "SERVICE_NAME": services,
                "WORKFLOW":
          template.dataValues.WorkFlowToTemplates[0].dataValues.Workflow.NAME,
                "WORKFLOW_ID":
          template.dataValues.WorkFlowToTemplates[0].dataValues.Workflow.ID,
                "API_ENDPOINT": template.dataValues.API_ENDPOINT,
                "ENABLED": template.dataValues.ENABLED,
                "MIN_ROLLBACK_TIMER": template.dataValues.MIN_ROLLBACK_TIMER,
                "MAX_ROLLBACK_TIMER": template.dataValues.MAX_ROLLBACK_TIMER
            };
            if (
                !result.some((result) => result.ID === templObj.ID) ||
        result.length === 0
            ) {
                result.push(templObj);
            }
        });

        // Find templates based on their relation to role
        if (upmLevels && upmLevels.length > 0) {
            for (const level of upmLevels) {
                let roleServiceCustomerTemplates = [];
                try {
                    roleServiceCustomerTemplates = await Templates.findAll({
                        "include": [
                            {
                                "model": TemplateToServiceToCustomer,
                                "required": true,
                                "include": [
                                    {
                                        "model": ServiceToCustomer,
                                        "required": true,
                                        "where": {
                                            "SERVICE_ID": req.query.serviceId,
                                            "CUSTOMER_ID": req.query.customerId
                                        },
                                        "include": [
                                            {
                                                "model": ServiceName,
                                                "required": true
                                            },
                                            {
                                                "model": RoleToServiceToCustomer,
                                                "required": true,
                                                "include": [
                                                    {
                                                        "model": Roles,
                                                        "required": true,
                                                        "where": { "IDENTIFICATOR": level.levelName }
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                "model": TemplateToVendor,
                                "required": true,
                                "include": [
                                    {
                                        "model": CTVendorTypes
                                    }
                                ]
                            },
                            {
                                "model": WorkFlowToTemplate,
                                "include": [
                                    {
                                        "model": Workflow
                                    }
                                ]
                            }
                        ],
                        "where": {
                            "ENABLED": true
                        },
                        "order": [["ID", "DESC"]]
                    });
                } catch (error) {
                    loggerPino.error(error);
                    return res.status(internalServerError).send({ "message": "Role error!" });
                }

                roleServiceCustomerTemplates.forEach((template) => {
                    let questions;
                    let validation;
                    let splitValidation;
                    let carcheTemplate;
                    let staticHostname;
                    if (template.dataValues.QUESTIONS != null) {
                        questions = template.dataValues.QUESTIONS.toString();
                    }
                    if (template.dataValues.VALIDATION != null) {
                        validation = template.dataValues.VALIDATION.toString();
                        validation = validation.replace(/"/gi, "");
                        splitValidation = validation.split("\\n");
                    }
                    if (template.dataValues.CARCHETEMPLATE != null) {
                        carcheTemplate =
              template.dataValues.CARCHETEMPLATE.toString();
                    }
                    if (template.dataValues.STATICHOSTNAME != null) {
                        staticHostname =
              template.dataValues.STATICHOSTNAME.toString();
                    }

                    const services = [];
                    template.dataValues.TemplateToServiceToCustomers.forEach(
                        (service) => {
                            services.push(
                                service.dataValues.ServiceToCustomer.dataValues.ServiceName.SERVICE_NAME
                            );
                        }
                    );
                    const templObj = {
                        "ID": template.dataValues.ID,
                        "NAME": template.dataValues.NAME,
                        "QUESTIONS": questions,
                        "VALIDATION": splitValidation,
                        "DESCRIPTION": template.dataValues.DESCRIPTION,
                        "STATICHOSTNAMECHECKBOX":
              template.dataValues.STATICHOSTNAMECHECKBOX,
                        "CARCHETEMPLATE": carcheTemplate,
                        "STATICHOSTNAME": staticHostname,
                        "VENDOR_TYPE":
              template.dataValues.TemplateToVendors[0].dataValues.CTVendorType.dataValues.VENDOR_TYPE,
                        "SERVICE_NAME": services,
                        "WORKFLOW":
              template.dataValues.WorkFlowToTemplates[0].dataValues.Workflow.NAME,
                        "WORKFLOW_ID":
              template.dataValues.WorkFlowToTemplates[0].dataValues.Workflow.ID,
                        "API_ENDPOINT": template.dataValues.API_ENDPOINT,
                        "ENABLED": template.dataValues.ENABLED,
                        "MIN_ROLLBACK_TIMER": template.dataValues.MIN_ROLLBACK_TIMER,
                        "MAX_ROLLBACK_TIMER": template.dataValues.MAX_ROLLBACK_TIMER
                    };
                    if (
                        !result.some((result) => result.ID === templObj.ID) ||
            result.length === 0
                    ) {
                        result.push(templObj);
                    }
                });
                let roleServiceTemplate = [];
                try {
                    roleServiceTemplate = await Templates.findAll({
                        "include": [
                            {
                                "model": TemplateToService,
                                "required": true,
                                "include": [
                                    {
                                        "model": ServiceName,
                                        "required": true,
                                        "where": { "ID": req.query.serviceId },
                                        "include": [
                                            {
                                                "model": RoleToService,
                                                "required": true,
                                                "include": [
                                                    {
                                                        "model": Roles,
                                                        "required": true,
                                                        "where": {
                                                            "IDENTIFICATOR": level.levelName
                                                        }
                                                    }
                                                ]
                                            },
                                            {
                                                "model": ServiceToCustomer,
                                                "required": true,
                                                "where": { "CUSTOMER_ID": req.query.customerId }
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                "model": TemplateToVendor,
                                "required": true,
                                "include": [
                                    {
                                        "model": CTVendorTypes
                                    }
                                ]
                            },
                            {
                                "model": WorkFlowToTemplate,
                                "include": [
                                    {
                                        "model": Workflow
                                    }
                                ]
                            }
                        ],
                        "where": {
                            "ENABLED": true
                        },
                        "order": [["ID", "DESC"]]
                    });
                } catch (error) {
                    loggerPino.error(error);
                    return res.status(internalServerError).send({ "message": "Role error!" });
                }

                roleServiceTemplate.forEach((template) => {
                    let questions;
                    let validation;
                    let splitValidation;
                    let carcheTemplate;
                    let staticHostname;
                    if (template.dataValues.QUESTIONS != null) {
                        questions = template.dataValues.QUESTIONS.toString();
                    }
                    if (template.dataValues.VALIDATION != null) {
                        validation = template.dataValues.VALIDATION.toString();
                        validation = validation.replace(/"/gi, "");
                        splitValidation = validation.split("\\n");
                    }
                    if (template.dataValues.CARCHETEMPLATE != null) {
                        carcheTemplate =
              template.dataValues.CARCHETEMPLATE.toString();
                    }
                    if (template.dataValues.STATICHOSTNAME != null) {
                        staticHostname =
              template.dataValues.STATICHOSTNAME.toString();
                    }

                    const services = [];
                    template.dataValues.TemplateToServices.forEach(
                        (templateServices) => {
                            services.push(
                                templateServices.dataValues.ServiceName.dataValues.SERVICE_NAME
                            );
                        }
                    );
                    const templObj = {
                        "ID": template.dataValues.ID,
                        "NAME": template.dataValues.NAME,
                        "QUESTIONS": questions,
                        "VALIDATION": splitValidation,
                        "DESCRIPTION": template.dataValues.DESCRIPTION,
                        "STATICHOSTNAMECHECKBOX":
              template.dataValues.STATICHOSTNAMECHECKBOX,
                        "CARCHETEMPLATE": carcheTemplate,
                        "STATICHOSTNAME": staticHostname,
                        "VENDOR_TYPE":
              template.dataValues.TemplateToVendors[0].dataValues.CTVendorType.dataValues.VENDOR_TYPE,
                        "SERVICE_NAME": services,
                        "WORKFLOW":
              template.dataValues.WorkFlowToTemplates[0].dataValues.Workflow.NAME,
                        "WORKFLOW_ID":
              template.dataValues.WorkFlowToTemplates[0].dataValues.Workflow.ID,
                        "API_ENDPOINT": template.dataValues.API_ENDPOINT,
                        "ENABLED": template.dataValues.ENABLED,
                        "MIN_ROLLBACK_TIMER": template.dataValues.MIN_ROLLBACK_TIMER,
                        "MAX_ROLLBACK_TIMER": template.dataValues.MAX_ROLLBACK_TIMER
                    };
                    if (
                        !result.some((result) => result.ID === templObj.ID) ||
            result.length === 0
                    ) {
                        result.push(templObj);
                    }
                });
                let roleTemplates = [];
                try {
                    roleTemplates = await Templates.findAll({
                        "include": [
                            {
                                "model": RoleTemplates,
                                "required": true,
                                "include": [
                                    {
                                        "model": Roles,
                                        "required": true,
                                        "where": { "IDENTIFICATOR": level.levelName }
                                    }
                                ]
                            },
                            {
                                "model": TemplateToVendor,
                                "required": true,
                                "include": [
                                    {
                                        "model": CTVendorTypes
                                    }
                                ]
                            },
                            {
                                "model": WorkFlowToTemplate,
                                "include": [
                                    {
                                        "model": Workflow
                                    }
                                ]
                            },
                            {
                                "model": TemplateToServiceToCustomer,
                                "required": true,
                                "include": [
                                    {
                                        "model": ServiceToCustomer,
                                        "where": {
                                            "SERVICE_ID": req.query.serviceId,
                                            "CUSTOMER_ID": req.query.customerId
                                        },
                                        "include": [
                                            {
                                                "model": ServiceName
                                            }
                                        ]
                                    }
                                ]
                            }
                        ],
                        "where": {
                            "ENABLED": true
                        },
                        "order": [["ID", "DESC"]]
                    });
                } catch (error) {
                    loggerPino.error(error);
                    return res.status(internalServerError).send({ "message": "Role error!" });
                }

                roleTemplates.forEach((template) => {
                    let questions;
                    let validation;
                    let splitValidation;
                    let carcheTemplate;
                    let staticHostname;
                    if (template.dataValues.QUESTIONS != null) {
                        questions = template.dataValues.QUESTIONS.toString();
                    }
                    if (template.dataValues.VALIDATION != null) {
                        validation = template.dataValues.VALIDATION.toString();
                        validation = validation.replace(/"/gi, "");
                        splitValidation = validation.split("\\n");
                    }
                    if (template.dataValues.CARCHETEMPLATE != null) {
                        carcheTemplate =
              template.dataValues.CARCHETEMPLATE.toString();
                    }
                    if (template.dataValues.STATICHOSTNAME != null) {
                        staticHostname =
              template.dataValues.STATICHOSTNAME.toString();
                    }

                    const services = [];
                    template.dataValues.TemplateToServiceToCustomers.forEach(
                        (service) => {
                            services.push(
                                service.dataValues.ServiceToCustomer.dataValues.ServiceName.SERVICE_NAME
                            );
                        }
                    );
                    const templObj = {
                        "ID": template.dataValues.ID,
                        "NAME": template.dataValues.NAME,
                        "QUESTIONS": questions,
                        "VALIDATION": splitValidation,
                        "DESCRIPTION": template.dataValues.DESCRIPTION,
                        "STATICHOSTNAMECHECKBOX":
              template.dataValues.STATICHOSTNAMECHECKBOX,
                        "CARCHETEMPLATE": carcheTemplate,
                        "STATICHOSTNAME": staticHostname,
                        "VENDOR_TYPE":
              template.dataValues.TemplateToVendors[0].dataValues.CTVendorType.dataValues.VENDOR_TYPE,
                        "SERVICE_NAME": services,
                        "WORKFLOW":
              template.dataValues.WorkFlowToTemplates[0].dataValues.Workflow.NAME,
                        "WORKFLOW_ID":
              template.dataValues.WorkFlowToTemplates[0].dataValues.Workflow.ID,
                        "API_ENDPOINT": template.dataValues.API_ENDPOINT,
                        "ENABLED": template.dataValues.ENABLED,
                        "MIN_ROLLBACK_TIMER": template.dataValues.MIN_ROLLBACK_TIMER,
                        "MAX_ROLLBACK_TIMER": template.dataValues.MAX_ROLLBACK_TIMER
                    };
                    if (
                        !result.some((result) => result.ID === templObj.ID) ||
            result.length === 0
                    ) {
                        result.push(templObj);
                    }
                });

                let roleServiceIndividualTemplate = [];
                try {
                    roleServiceIndividualTemplate = await Templates.findAll({
                        "include": [
                            {
                                "model": TemplateToService,
                                "required": true,
                                "include": [
                                    {
                                        "model": ServiceName,
                                        "required": true,
                                        "where": { "ID": req.query.serviceId },
                                        "include": [
                                            {
                                                "model": ServiceToCustomer,
                                                "required": true,
                                                "where": { "CUSTOMER_ID": req.query.customerId }
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                "model": RoleTemplates,
                                "required": true,
                                "include": [
                                    {
                                        "model": Roles,
                                        "required": true,
                                        "where": {
                                            "IDENTIFICATOR": level.levelName
                                        }
                                    }
                                ]
                            },
                            {
                                "model": TemplateToVendor,
                                "required": true,
                                "include": [
                                    {
                                        "model": CTVendorTypes
                                    }
                                ]
                            },
                            {
                                "model": WorkFlowToTemplate,
                                "include": [
                                    {
                                        "model": Workflow
                                    }
                                ]
                            }
                        ],
                        "where": {
                            "ENABLED": true
                        },
                        "order": [["ID", "DESC"]]
                    });
                } catch (error) {
                    loggerPino.error(error);
                    return res.status(internalServerError).send({ "message": "Role error!" });
                }

                roleServiceIndividualTemplate.forEach((template) => {
                    let questions;
                    let validation;
                    let splitValidation;
                    let carcheTemplate;
                    let staticHostname;
                    if (template.dataValues.QUESTIONS != null) {
                        questions = template.dataValues.QUESTIONS.toString();
                    }
                    if (template.dataValues.VALIDATION != null) {
                        validation = template.dataValues.VALIDATION.toString();
                        validation = validation.replace(/"/gi, "");
                        splitValidation = validation.split("\\n");
                    }
                    if (template.dataValues.CARCHETEMPLATE != null) {
                        carcheTemplate =
              template.dataValues.CARCHETEMPLATE.toString();
                    }
                    if (template.dataValues.STATICHOSTNAME != null) {
                        staticHostname =
              template.dataValues.STATICHOSTNAME.toString();
                    }

                    const services = [];
                    template.dataValues.TemplateToServices.forEach(
                        (templateServices) => {
                            services.push(
                                templateServices.dataValues.ServiceName.dataValues.SERVICE_NAME
                            );
                        }
                    );
                    const templObj = {
                        "ID": template.dataValues.ID,
                        "NAME": template.dataValues.NAME,
                        "QUESTIONS": questions,
                        "VALIDATION": splitValidation,
                        "DESCRIPTION": template.dataValues.DESCRIPTION,
                        "STATICHOSTNAMECHECKBOX":
              template.dataValues.STATICHOSTNAMECHECKBOX,
                        "CARCHETEMPLATE": carcheTemplate,
                        "STATICHOSTNAME": staticHostname,
                        "VENDOR_TYPE":
              template.dataValues.TemplateToVendors[0].dataValues.CTVendorType.dataValues.VENDOR_TYPE,
                        "SERVICE_NAME": services,
                        "WORKFLOW":
              template.dataValues.WorkFlowToTemplates[0].dataValues.Workflow.NAME,
                        "WORKFLOW_ID":
              template.dataValues.WorkFlowToTemplates[0].dataValues.Workflow.ID,
                        "API_ENDPOINT": template.dataValues.API_ENDPOINT,
                        "ENABLED": template.dataValues.ENABLED,
                        "MIN_ROLLBACK_TIMER": template.dataValues.MIN_ROLLBACK_TIMER,
                        "MAX_ROLLBACK_TIMER": template.dataValues.MAX_ROLLBACK_TIMER
                    };
                    if (
                        !result.some((result) => result.ID === templObj.ID) ||
            result.length === 0
                    ) {
                        result.push(templObj);
                    }
                });
            }
        }
        return res.status(ok).send({ result, "message": "Successful!" });
    }
];

exports.findTemplatesByServiceToCustomerRelation = async (
    customerId,
    serviceId,
    bcUserId
) => {
    const serviceToCustomerTemplates = await Templates.findAll({
        "include": [
            {
                "model": TemplateToServiceToCustomer,
                "required": true,
                "include": [
                    {
                        "model": ServiceToCustomer,
                        "where": {
                            "SERVICE_ID": serviceId,
                            "CUSTOMER_ID": customerId
                        },
                        "include": [
                            {
                                "model": UserToServiceToCustomer,
                                "required": true,
                                "include": [
                                    {
                                        "model": Users,
                                        "where": { "BC_USER_ID": bcUserId }
                                    }
                                ]
                            },
                            {
                                "model": ServiceName,
                                "where": { "ID": serviceId }
                            }
                        ]
                    }
                ]
            },
            {
                "model": TemplateToVendor,
                "required": true,
                "include": [
                    {
                        "model": CTVendorTypes
                    }
                ]
            },
            {
                "model": WorkFlowToTemplate,
                "include": [
                    {
                        "model": Workflow
                    }
                ]
            }
        ],
        "where": {
            "ENABLED": true
        }
    }).catch((error) => {
        loggerPino.error(error);
        throw new Error("Template can not be found!");
    });

    const services = [];
    for (const template of serviceToCustomerTemplates) {
        for (service of template.TemplateToServiceToCustomers) {
            if (
                services.indexOf(
                    service.ServiceToCustomer.ServiceName.dataValues.SERVICE_NAME
                ) < 0
            ) {
                services.push(
                    service.ServiceToCustomer.ServiceName.dataValues.SERVICE_NAME
                );
            }
        }
    }
    const result = await exports.createTemplateObject(
        services,
        serviceToCustomerTemplates
    );

    return result;
};

exports.findTemplatesByService = async (customerId, serviceId, bcUserId) => {
    const serviceTemplate = await Templates.findAll({
        "include": [
            {
                "model": TemplateToService,
                "required": true,
                "include": [
                    {
                        "model": ServiceName,
                        "required": true,
                        "include": [
                            {
                                "model": UserToService,
                                "required": true,
                                "include": [
                                    {
                                        "model": Users,
                                        "required": true,
                                        "where": { "BC_USER_ID": bcUserId }
                                    }
                                ]
                            },
                            {
                                "model": ServiceToCustomer,
                                "required": true,
                                "where": { "CUSTOMER_ID": customerId }
                            }
                        ],
                        "where": { "ID": serviceId }
                    }
                ]
            },
            {
                "model": TemplateToVendor,
                "required": true,
                "include": [
                    {
                        "model": CTVendorTypes
                    }
                ]
            },
            {
                "model": WorkFlowToTemplate,
                "include": [
                    {
                        "model": Workflow
                    }
                ]
            }
        ],
        "where": {
            "ENABLED": true
        }
    }).catch((error) => {
        loggerPino.error(error);
        throw new Error("Template can not be found!");
    });

    const services = [];
    for (const template of serviceTemplate) {
        for (templateServices of template.dataValues.TemplateToServices) {
            if (
                services.indexOf(
                    templateServices.dataValues.ServiceName.dataValues.SERVICE_NAME
                ) < 0
            ) {
                services.push(
                    templateServices.dataValues.ServiceName.dataValues.SERVICE_NAME
                );
            }
        }
    }

    const result = await exports.createTemplateObject(services, serviceTemplate);

    return result;
};

exports.findTemplatesByServiceIndividual = async (
    customerId,
    serviceId,
    bcUserId
) => {
    const serviceIndividualTemplate = await Templates.findAll({
        "include": [
            {
                "model": TemplateToService,
                "required": true,
                "include": [
                    {
                        "model": ServiceName,
                        "required": true,
                        "include": [
                            {
                                "model": ServiceToCustomer,
                                "required": true,
                                "where": { "CUSTOMER_ID": customerId }
                            }
                        ],
                        "where": { "ID": serviceId }
                    }
                ]
            },
            {
                "model": UsersTemplate,
                "required": true,
                "include": [
                    {
                        "model": Users,
                        "required": true,
                        "where": { "BC_USER_ID": bcUserId }
                    }
                ]
            },
            {
                "model": TemplateToVendor,
                "required": true,
                "include": [
                    {
                        "model": CTVendorTypes
                    }
                ]
            },
            {
                "model": WorkFlowToTemplate,
                "include": [
                    {
                        "model": Workflow
                    }
                ]
            }
        ],
        "where": {
            "ENABLED": true
        }
    }).catch((error) => {
        loggerPino.error(error);
        throw new Error("Template can not be found!");
    });

    const services = [];
    for (template of serviceIndividualTemplate) {
        for (templateServices of template.dataValues.TemplateToServices) {
            if (
                services.indexOf(
                    templateServices.dataValues.ServiceName.dataValues.SERVICE_NAME
                ) < 0
            ) {
                services.push(
                    templateServices.dataValues.ServiceName.dataValues.SERVICE_NAME
                );
            }
        }
    }

    const result = await exports.createTemplateObject(
        services,
        serviceIndividualTemplate
    );

    return result;
};

exports.findIndividualTemplates = async (customerId, serviceId, bcUserId) => {
    const templateUsers = await Templates.findAll({
        "include": [
            {
                "model": UsersTemplate,
                "required": true,
                "include": [
                    {
                        "model": Users,
                        "where": { "BC_USER_ID": bcUserId }
                    }
                ]
            },
            {
                "model": TemplateToVendor,
                "required": true,
                "include": [
                    {
                        "model": CTVendorTypes
                    }
                ]
            },
            {
                "model": WorkFlowToTemplate,
                "include": [
                    {
                        "model": Workflow
                    }
                ]
            },
            {
                "model": TemplateToServiceToCustomer,
                "required": true,
                "include": [
                    {
                        "model": ServiceToCustomer,
                        "where": {
                            "SERVICE_ID": serviceId,
                            "CUSTOMER_ID": customerId
                        },
                        "include": [
                            {
                                "model": ServiceName
                            }
                        ]
                    }
                ]
            }
        ],
        "where": {
            "ENABLED": true
        }
    }).catch((error) => {
        loggerPino.error(error);
        throw new Error("Template can not be found!");
    });

    const services = [];
    for (template of templateUsers) {
        for (service of template.dataValues.TemplateToServiceToCustomers) {
            if (
                services.indexOf(
                    service.dataValues.ServiceToCustomer.dataValues.ServiceName.SERVICE_NAME
                ) < 0
            ) {
                services.push(
                    service.dataValues.ServiceToCustomer.dataValues.ServiceName.SERVICE_NAME
                );
            }
        }
    }

    const result = await exports.createTemplateObject(services, templateUsers);

    return result;
};

exports.createTemplateObject = async (services, queryResult) => {
    const result = [];

    for (const template of queryResult) {
        let questions;
        let validation;
        let splitValidation;
        let carcheTemplate;
        let staticHostname;
        if (template.dataValues.QUESTIONS != null) {
            questions = template.dataValues.QUESTIONS.toString();
        }
        if (template.dataValues.VALIDATION != null) {
            validation = template.dataValues.VALIDATION.toString();
            validation = validation.replace(/"/gi, "");
            splitValidation = validation.split("\\n");
        }
        if (template.dataValues.CARCHETEMPLATE != null) {
            carcheTemplate = template.dataValues.CARCHETEMPLATE.toString();
        }
        if (template.dataValues.STATICHOSTNAME != null) {
            staticHostname = template.dataValues.STATICHOSTNAME.toString();
        }
        const templObj = {
            "ID": template.dataValues.ID,
            "NAME": template.dataValues.NAME,
            "QUESTIONS": questions,
            "VALIDATION": splitValidation,
            "DESCRIPTION": template.dataValues.DESCRIPTION,
            "STATICHOSTNAMECHECKBOX": template.dataValues.STATICHOSTNAMECHECKBOX,
            "CARCHETEMPLATE": carcheTemplate,
            "STATICHOSTNAME": staticHostname,
            "VENDOR_TYPE":
        template.dataValues.TemplateToVendors[0].dataValues.CTVendorType.dataValues.VENDOR_TYPE,
            "SERVICE_NAME": services,
            "WORKFLOW":
        template.dataValues.WorkFlowToTemplates[0].dataValues.Workflow.NAME,
            "WORKFLOW_ID":
        template.dataValues.WorkFlowToTemplates[0].dataValues.Workflow.ID,
            "API_ENDPOINT": template.dataValues.API_ENDPOINT,
            "ENABLED": template.dataValues.ENABLED,
            "MIN_ROLLBACK_TIMER": template.dataValues.MIN_ROLLBACK_TIMER,
            "MAX_ROLLBACK_TIMER": template.dataValues.MAX_ROLLBACK_TIMER
        };
        // Push found actions(templates) into result
        if (
            !result.some((result) => result.ID === templObj.ID) ||
      result.length === 0
        ) {
            result.push(templObj);
        }
    }

    return result;
};

exports.getAllAvailableTemplatesForBcUser = [
    [
        query("serviceId").trim(),
        check("serviceId").isLength({ "min": 1, "max": 255 })
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(unprocessableEntity).send({ errors });
        }
        const bcUserId = req.ebizUserId;
        const customer = await Customers.findOne({
            "where": { "BC_COMPANY_ID": req.ebizCompanyId }
        });
        const customerId = customer.dataValues.ID;
        try {
            const serviceToCustomerTemplates =
        await exports.findTemplatesByServiceToCustomerRelation(
            customerId,
            req.query.serviceId,
            bcUserId
        );
            const serviceTemplate = await exports.findTemplatesByService(
                customerId,
                req.query.serviceId,
                bcUserId
            );
            const serviceTemplateIndividual =
        await exports.findTemplatesByServiceIndividual(
            customerId,
            req.query.serviceId,
            bcUserId
        );
            const individualTemplates = await exports.findIndividualTemplates(
                customerId,
                req.query.serviceId,
                bcUserId
            );

            const result = serviceToCustomerTemplates.concat(
                serviceTemplate,
                serviceTemplateIndividual,
                individualTemplates
            );

            return res.status(ok).send({ result, "message": "Successful!" });
        } catch (error) {
            return res.status(internalServerError).send({ "message": error });
        }
    }
];

exports.loadActionVendorTypeByActionId = [
    [query("id").trim(), check("id").isNumeric()],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(unprocessableEntity).json({ errors });
        }
        exports
            .loadActionVendorTypeByActionIdAsync(req.query)
            .then((templateToVendor) => res
                .status(ok)
                .send({ "message": "Successful!", "result": templateToVendor }))
            .catch((error) => {
                loggerPino.error(error);
                return res.status(internalServerError).send({ "message": "Internal server error!" });
            });
    }
];

exports.loadActionVendorTypeByActionIdAsync = async function(query) {
    try {
        const template = await Templates.findOne({
            "where": { "ID": query.id }
        });
        if (template && template.dataValues && template.dataValues.ID) {
            const vendorToTemplate = await TemplateToVendor.findOne({
                "where": {
                    "TEMPLATE_ID": template.dataValues.ID
                },
                "include": [
                    {
                        "model": CTVendorTypes,
                        "required": true
                    }
                ]
            });
            if (
                vendorToTemplate &&
        vendorToTemplate.CTVendorType &&
        vendorToTemplate.CTVendorType.dataValues
            ) {
                return {
                    "id": template.dataValues.ID,
                    "vendor": {
                        "id": vendorToTemplate.CTVendorType.dataValues.ID,
                        "vendorType":
              vendorToTemplate.CTVendorType.dataValues.VENDOR_TYPE
                    }
                };
            }
            return null;
        }
        return null;
    } catch (error) {
        loggerPino.error(error);
        throw new Error("Database error");
    }
};

exports.changeActionEnabledStatusToFalse = [
    [body("actionId").trim(), check("actionId").isLength({ "min": 1, "max": 255 })],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(unprocessableEntity).send({ "message": errors });
        }
        const { body } = req;
        // Check if workflow exist in DB
        await Templates.findOne({
            "where": { "ID": body.actionId }
        }).catch((error) => {
            loggerPino.error(error);
            return res
                .status(internalServerError)
                .send({ "message": "Action is missing!" });
        });
        await oneConnection.transaction({ "autocommit": true }, async (t) => {
            await Templates.update(
                {
                    "ENABLED": false
                },
                {
                    "where": {
                        "ID": body.actionId
                    }
                },
                { "transaction": t }
            );
            return res.status(ok).send({ "message": "Action status was updated" });
        });
    }
];
