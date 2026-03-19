
const { CONFIG } = require("../config/configuration");
const axios = require("axios");
const { ServiceName } = require("../models/serviceNameModel");
const { Customers } = require("../models/customerOneModel");
const { CTContentTypes } = require("../models/cTContentTypes");
const { CTTypes } = require("../models/cTTypes");
const { CTVendorTypes } = require("../models/cTVendorTypes");
const { check, validationResult, query, body, header } = require("express-validator");
const contentType = CONFIG.cArche.Content_Type;
const authorization = CONFIG.cArche.Authorization;
const carcheUrl = CONFIG.cArche.cArcheUrl;
const carcheGCC = require("../controllers/carcheGeneratedConfigController");
const btoa = require("btoa");
const loggerPino = require("../helpers/loggerHelper");
const constants = require("../../api/constants");
const { v4: uuidv4 } = require("uuid");
const trStatuses = require("../transactionStatuses");
const steps = require("../steps");
const { ok, internalServerError } = require("../statuses");
const { "stringify": str } = JSON;




/*!!!!!! TODO create migration scripts !!!!!!!
udpate existing /cArche/variables/customer-name/contract-id/ to /cArche/variables/name/contract-id/
add new /cArche/variables/name/service/
udpdate existing /cArche/template-list/contract-id/ to /cArche/template-list/contract-id/service/

`GET` `/cArche/template-list/contract-id/service/`

create script update generate template method
add new field
*/
// carche api_templates field
// for name is varchar 128
// for contract id and service 30
exports.getVariablesContractId = [[
    query("name").trim(),
    check("name").isLength({ min: 2, max: 128 }),
    query("contractid").trim(),
    check("contractid").isLength({ min: 1, max: 30 }),
    query("templateType").trim(),
    query("templateType").isLength({ min: 1, max: 11 })
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors });
    }

    const contractid = req.query.contractid;
    const name = req.query.name;
    const templateType = req.query.templateType;

    //CDP cArche
    const route = "/getVariables";
    const body = {
        "contractid": contractid,
        "name": name,
        "templateType": templateType
    };
    exports.cArcheReqHelper(body, route).then(response => {
        if (response && response.status == "OK") {
            return res.status(200).json(response.result);
        } else {
            return res.status(500).json({ message: "cArche Internal error" });
        }
    }).catch(err => {
        loggerPino.error(err);
        return res.status(500).json({ message: "cArche Internal error" });
    });

}];

exports.getVariablesService = [[
    query("name").trim(),
    check("name").isLength({ min: 2, max: 128 }),
    query("service").trim(),
    check("service").isLength({ min: 1, max: 30 }),
    query("templateType").trim(),
    query("templateType").isLength({ min: 1, max: 11 })
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors });
    }

    const service = req.query.service;
    const name = req.query.name;
    const templateType = req.query.templateType;
    //CDP cArche
    const route = "/getVariables";
    //!!! carche expect services not service
    const body = {
        "services": service,
        "name": name,
        "templateType": templateType
    };
    exports.cArcheReqHelper(body, route).then(response => {
        if (response && response.status == "OK") {
            return res.status(200).json(response.result);
        } else {
            return res.status(500).json({ message: "cArche Internal error" });
        }
    }).catch(err => {
        loggerPino.error(err);
        return res.status(500).json({ message: "cArche Internal error" });
    });

}];


exports.getVariablesByTemplateId = [[
    query("templateType").trim(),
    query("templateType").isLength({ min: 1, max: 11 }),
    query("id").trim(),
    check("id").isLength({ min: 1, max: 11 })
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors });
    }

    const id = req.query.id;
    const templateType = req.query.templateType;

    //CDP cArche
    const route = "/getVariables";
    //!!! carche expect services not service
    const body = {
        "id": id,
        "templateType": templateType
    };
    exports.cArcheReqHelper(body, route).then(response => {
        if (response && response.status == "OK") {
            return res.status(200).json(response.result);
        } else {
            return res.status(500).json({ message: "cArche Internal error" });
        }
    }).catch(err => {
        loggerPino.error(err);
        return res.status(500).json({ message: "cArche Internal error" });
    });

}];



exports.addNewTemplate = [[
    check("contractid").optional().isLength({ min: 1, max: 30 }),
    check("service").optional().isLength({ min: 1, max: 30 }),
    body("name").trim(),
    check("name").isLength({ min: 1, max: 128 }),
    body("body").trim(),
    check("body").isLength({ min: 1 }),
    body("deviceModel").trim(),
    check("deviceModel").isLength({ min: 1, max: 128 }),
    check("version").optional().isLength({ min: 1, max: 5 }),
    body("templateType").trim(),
    check("templateType").isLength({ min: 1, max: 128 }),
    body("vendorType").trim(),
    check("vendorType").isLength({ min: 1, max: 255 })
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors });
    }
    // one of them must be provided
    if (!req.body.contractid && !req.body.service) {
        return res.status(400).json({ errors: "Customer id or service must be provided" });
    }

    // CDP carche
    const route = "/updateTemplate";
    let data = ({
        "name": req.body.name,
        "body": req.body.body,
        "deviceModel": req.body.deviceModel,
        "templateType": req.body.templateType,
        "vendorType": req.body.vendorType
    });
    // add optional field if provided

    if (req.body.contractid) {
        data["contractid"] = req.body.contractid;
    }
    // service and in carche services
    if (req.body.service) {
        data["services"] = req.body.service;
    }
    if (req.body.version) {
        data["version"] = req.body.version;
    }
    exports.cArcheReqHelper(data, route).then(response => {
        if (response && response.status == "OK") {
            exports.reMapCarcheTemplateResult(response.result).then(result => {
                if (result) {
                    return res.status(200).json(result);
                }
                else {
                    return res.status(500).json({ message: "cArche Internal error" });
                }
            }).catch(err => {
                loggerPino.error(err);
                return res.status(500).json({ message: "cArche Internal error" });
            });

        } else {
            return res.status(500).json({ message: "cArche Internal error" });
        }
    }).catch(err => {
        loggerPino.error(err);
        return res.status(500).json({ message: "cArche Internal error" });
    });
}];


exports.reMapCarcheTemplateResult = async function (cArcheResponse) {
    try {
        let result = {
            "name": cArcheResponse.name,
            "body": cArcheResponse.body,
            "version": cArcheResponse.version,
            "dataCreated": cArcheResponse.dataCreated,
            "path": cArcheResponse.path,
            "id": cArcheResponse.id
        };
        if (cArcheResponse.contractid) {
            let customer = await exports.getCustomerById(cArcheResponse.contractid);
            result["contractid"] = customer;
        }
        if (cArcheResponse.services) {
            let service = await exports.getServiceById(cArcheResponse.services);
            result["services"] = service;
        }
        let deviceModel = await exports.getCTContetTypeById(cArcheResponse.deviceModel);
        result["deviceModel"] = deviceModel;

        let templateType = await exports.getCTTypesById(cArcheResponse.templateType);
        result["templateType"] = templateType;

        let vendorType = await exports.getcTVendorTypeById(cArcheResponse.vendorType);
        result["vendorType"] = vendorType;
        return result;
    } catch (err) {
        loggerPino.error(err);
        throw new Error("Database error");
    }
};


/*
 if the both contract id and services is provided the data is filtered according both parameters
* if only service is provided that it will return all the data only for the
* if nothing is provided that return all data
*/
exports.getTemplates = [[
    check("contractid").optional().isLength({ min: 1, max: 30 }),
    check("service").optional().isLength({ min: 1, max: 30 })
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors });
    }
    const route = "/listTemplates";
    let data = {};
    if (req.query.contractid) {
        data["contractid"] = req.query.contractid;
    }
    if (req.query.service) {
        data["services"] = req.query.service;
    }
    exports.cArcheReqHelper(data, route).then(response => {
        if (response && response.status == "OK") {
            return res.status(200).json(response.result);
        } else {
            return res.status(500).json({ message: "cArche Internal error" });
        }
    }).catch(err => {
        loggerPino.error(err);
        return res.status(500).json({ message: "cArche Internal error" });
    });
}];


exports.getAllCarcheTemplatesBasicInfo = async (req, res) => {
    const route = "/templates";
    const body = {};
    try {
        const response = await exports.cArcheReqHelper(body, route);
        if (response && response.status == "OK") {
            return res.status(200).json(response.result);
        } else {
            return res.status(503).json("Microservice cArche is unavailable.");
        }
    } catch (err) {
        loggerPino.error(err);
        return res.status(503).json("Microservice cArche is unavailable.");
    }
};


exports.getAllCarcheTemplates = async function () {
    const route = "/templates";
    const body = {};
    try {
        const templates = await exports.cArcheReqHelper(body, route);
        if (templates && templates.status == "OK" && templates.result) {
            return templates.result;
        } else {
            throw new Error("Microservice cArche is unavailable.");
        }

    } catch (err) {
        loggerPino.error(err);
        throw new Error("Microservice cArche is unavailable.");
    }
};



/*
* if contract id is mandatory if name and service is not provided (return all template related with this contract id)
* if contract id and name is provided return specific template according condition
* if services and name is provided return specific template according contition
*/

exports.getTemplate = [[
    check("contractid").optional().isLength({ min: 1, max: 30 }),
    check("service").optional().isLength({ min: 1, max: 30 }),
    check("name").optional().isLength({ min: 1, max: 128 })
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors });
    }
    const route = "/getTemplate";
    // none of parameters is provided it is the issue
    if (!req.query.contractid && !req.query.name && !req.query.service) {
        return res.status(400).json({ errors: "Customer id or service and name must be provided" });
    }
    // if contract id is not provided but service yes the name is mandatory
    if (!req.query.contractid && req.query.service && !req.query.name) {
        return res.status(400).json({ errors: "If only service is provided name is mandatory" });
    }

    // if contract id is not provided but service yes the name is mandatory
    if (!req.query.contractid && !req.query.service && req.query.name) {
        return res.status(400).json({ errors: "Contract id or service must be provided if name is provided" });
    }

    let data = {};

    // if only contact id is provided - return list of template accroding contract id
    if (req.query.contractid) {
        data["contractid"] = req.query.contractid;
    }
    if (req.query.name) {
        data["name"] = req.query.name;
    }
    if (req.query.service) {
        data["services"] = req.query.service;
    }

    //CDP carche
    exports.cArcheReqHelper(data, route).then(response => {
        if (response && response.status == "OK") {
            return res.status(200).json(response.result);
        } else {
            return res.status(500).json({ message: "cArche Internal error" });
        }
    }).catch(err => {
        loggerPino.error(err);
        return res.status(500).json({ message: "cArche Internal error" });
    });

}];

/*
Notes:
* if contract id and name is provided return specific template according condition
* if services and name is provided return specific template according contition
* the services and name or contract id and name is mandatory field
* provided new option delete template via id only
*/
exports.deleteTemplate = [[
    check("contractid").optional().isLength({ min: 1, max: 30 }),
    check("service").optional().isLength({ min: 1, max: 30 }),
    check("name").optional().isLength({ min: 1, max: 128 }),
    check("id").optional().isLength({ min: 1, max: 11 }),
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors });
    }
    const route = "/deleteTemplate";
    // service and name or contract id and name is mandatory to delete the specific template
    if ((!req.query.contractid && !req.query.name) || (!req.query.service && !req.query.name)) {
        if (!req.query.id) {
            return res.status(400).json({ errors: "Customer id or service and name must be provided or template id" });
        }
    }
    let data = {};
    if (req.query.contractid && req.query.name) {
        data["name"] = req.query.name;
        data["contractid"] = req.query.contractid;
    }

    if (req.query.service && req.query.name) {
        data["name"] = req.query.name;
        data["contractid"] = req.query.contractid;
    }
    if (req.query.id) {
        data["id"] = req.query.id;
    }

    exports.cArcheReqHelper(data, route).then(response => {
        if (response && response.status == "OK") {
            return res.status(200).json(response.result);
        } else {
            return res.status(500).json({ message: "cArche Internal error" });
        }
    }).catch(err => {
        loggerPino.error(err);
        return res.status(500).json({ message: "cArche Internal error" });
    });


}];

/**
 * Helper function to run the requestion repeating action -old templateHelper
 * @param {string} body - should be all input to query JSON.stringify({"name": "templatename", "contractid": "contractid"})
 * @param {string} route  - route name for the carche request
 */
exports.cArcheReqHelper = async function (body, route) {
    const auth = btoa(`${CONFIG.MECH_ID}:${CONFIG.MECH_ID_PASS}`);
    const requestConfig = {
        url: carcheUrl + route,
        method: body["updateTemplate"] ? 'put' : 'post',
        data: body,
        headers: {
            "Content-Type": `${contentType}`,
            "X-Authorization": `${authorization}`,
            "Authorization": `Basic ${auth}`
        }
    }
    const response = await axios(requestConfig).catch(err => {
        loggerPino.info("Issue in carcheHelper function, with route:");
        loggerPino.info(route);
        loggerPino.error(err);
        throw new Error("Error carcheReq helper");
    });
    if (!response) {
        throw new Error("Error carcheReq helper");
    }
    try {
        let resultsData = response.data;
        if (response.status > 299 && response.status < 599) {
            loggerPino.error("Carche helper error response body");
            loggerPino.error(str(resultsData));
            loggerPino.info("Whole response of the request ");
            loggerPino.info(response);
            throw new Error("Error carcheReq helper");
        } else if (response.status <= 299 && response.status >= 200) {
            return { status: "OK", result: resultsData };
        } else {
            loggerPino.error("Incorect api status carcheReq helper");
            loggerPino.info("Whole response of the request ");
            loggerPino.info(response);
            throw new Error("Error carcheReq helper");
        }
    } catch (err) {
        loggerPino.info(err);
        loggerPino.info("Whole response of the request ");
        loggerPino.info(response);
        throw new Error("Error carcheReq helper");
    }
};
/*
* name must be provided, devicemodel, body, templateType and vendorType can be updated,
* contract id can not be updated, service can be if contract id is provided other wise not
* in FE if update and contractid is provided allow update service other if only service not allow udpate it
*/

exports.updateTemplate = [[
    body("name").trim(),
    check("name").isLength({ min: 1, max: 250 }),
    check("id").optional().isLength({ min: 1, max: 30 }),
    check("contractid").optional().isLength({ min: 1, max: 30 }),
    check("service").optional().isLength({ min: 1, max: 30 }),
    check("deviceModel").optional().isLength({ min: 1, max: 128 }),
    check("body").optional().isLength({ min: 1 }),
    check("version").optional().isLength({ min: 1, max: 5 }),
    check("templateType").optional().isLength({ min: 1, max: 128 }),
    check("vendorType").optional().isLength({ min: 1, max: 255 })
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors });
    }
    if (!req.body.contractid && !req.body.service) {
        return res.status(400).json({ errors: "Customer id or service must be provided" });
    }
    // CDP carche
    const route = "/updateTemplate";
    let data = ({
        "name": req.body.name
    });
    // add optional field if provided
    if (req.body.id) {
        data["id"] = req.body.id;
    }
    if (req.body.contractid) {
        data["contractid"] = req.body.contractid;
    }
    // service and in carche services
    if (req.body.service) {
        data["services"] = req.body.service;
    }
    if (req.body.version) {
        data["version"] = req.body.version;
    }
    if (req.body.deviceModel) {
        data["deviceModel"] = req.body.deviceModel;
    }
    if (req.body.body) {
        data["body"] = req.body.body;
    }
    if (req.body.templateType) {
        data["templateType"] = req.body.templateType.toString();
    }
    if (req.body.vendorType) {
        data["vendorType"] = req.body.vendorType.toString();
    }
    data["updateTemplate"] = true;
    exports.cArcheReqHelper(data, route).then(response => {
        if (response && response.status == "OK") {
            return res.status(200).json(response.result);
        } else {
            return res.status(500).json({ message: "cArche Internal error" });
        }
    }).catch(err => {
        loggerPino.error(err);
        return res.status(500).json({ message: "cArche Internal error" });
    });
}];

/*
  {
        "globals": {
            "templatefile": "test"      // string mandatory field represent the template name which will use for config generation
        },
        "main_data":{
            "outputtofile": "yes"       // string not mandatory field if not provided that the value is set no
                                        // if yes request return config as plan text, if no that encoded in base64
            "version": 1                // number mandatory field must by 1 or other depends on creation but
                                        // versioning is not implemeted yet
            "services": "service"       // string mandatory if contract id not provided and if template does not have contract id
            "contractid": "contractid"  // string mandatory if services is not provided and if template have contract id (otherwise
                                        // will be not found ), but services and contract id can be provided together
            "uuid": "1e8a14b3-45ed-4f5a-ae2e-3aff3bc2d4b4"  // string mandatory field must be unique for each request
            ...                         // main data schould contain all mandatory field from getVaribale function,
                                        //this is the values which will be used to generate the config (Interfaces, description etc...)
        }
    }
*/
exports.generateConfig = [[
    body("main_data.outputtofile").trim(),
    check("main_data.outputtofile").isLength({ min: 1, max: 10 }),
    header(constants.header_one_type).trim(),
    header(constants.header_one_type).notEmpty().equals(constants.one_type)
], async (req, res) => {
    loggerPino.info("****************************GENERATECONFIG************************");
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors });
    }
    try {
        const response = await exports.generateConfigInternalFunction(req);
        return res.status(200).json(response);
    } catch (err) {
        loggerPino.error(err);
        return res.status(500).json({message: "Unable to generate config, Internal Server Error!"});
    };
}];

exports.generateConfigInternalFunction = async (req) => {
    const transactionDataHelper = require("../helpers/transactionDataHelper");
    const data = req.body.actionData;
    const uuid = uuidv4();
    const updatedData = Object.assign({}, data.data);
    updatedData["uuid"] = uuid;
    updatedData["step"] = steps.configGenerate;
    updatedData["status"] = trStatuses.changeNotCompleted;
    const updateTransaction = await transactionDataHelper.updateTransactionData(
        data["sessionId"],
        updatedData
    );
    if (!updateTransaction) {
        throw new Error("Generate config transaction can not be updated!");
    }
    let carcheRqBody = {};
    carcheRqBody["main_data"] = req.body["main_data"];
    carcheRqBody["globals"] = req.body["globals"];
    for ( const property in req.body ) {
        if (
          property != "main_data" &&
          property != "globals" &&
          property != "actionData" &&
          property != "permissionGranted" &&
          property != "pid" &&
          property != "processKey"
        ) {
          carcheRqBody[property] = req.body[property];
        }
      }
    try {
        // Why God Why ???
        // The below line is catestrophic that is rewriting carcheRqBody
        // We are not using any thing from DB, just querying and coming back :D
        // Skipping this as all the data is coming from FE/ request no need to go to DB
        await exports.loadDataFromDbToObject(data.data, uuid, carcheRqBody);
        const response = await exports.generateConfigHelper(carcheRqBody, data["sessionId"]);
        if (response && response.status === "OK") {
            return Object.assign({}, {
                config: response.result,
                templateId: response.templateId,
                templateUUID: response.templateUuid
            });
        } else {
            throw new Error("Microservice cArche does not return the valid response!");
        }

    } catch (err) {
        loggerPino.error(err);
        throw new Error("Config can not be generated!");
    };
}

exports.loadDataFromDbToObject = async (data, uuid, carcheObject) => {
    const transactionDataHelper = require("../helpers/transactionDataHelper");
    const carcheTemplate =
        await transactionDataHelper.getCarcheTemplateForActionTemplate(data.actionId);
    // push data to object from body for cArche
    if (carcheTemplate) {
        carcheObject["globals"]["templatefile"] = carcheTemplate["name"];
        carcheObject["main_data"]["outputtofile"] = "yes";
        carcheObject["main_data"]["version"] = carcheTemplate["version"];
        carcheObject["main_data"]["services"] = carcheTemplate["services"];
        if (carcheTemplate["contractid"]) {
            carcheObject["main_data"]["contractid"] = carcheTemplate["contractid"];
        } else {
            delete carcheObject["main_data"]["contractid"];
        }
        carcheObject["main_data"]["id"] = carcheTemplate["id"];
        carcheObject["main_data"]["uuid"] = uuid;
        carcheObject["main_data"]["templateType"] = carcheTemplate["templateType"];
        return true;
    } else {
        return false;
    }
}

exports.generateConfigHelper = async function (carcheRqBody, sessionID) {
    // CDP carche
    const auth = btoa(`${CONFIG.MECH_ID}:${CONFIG.MECH_ID_PASS}`);
    const requestConfig = {
        url: carcheUrl + "/generateConfig",
        method: 'post',
        data: carcheRqBody,
        headers: {
            "Content-Type": `${contentType}`,
            "X-Authorization": `${authorization}`,
            "Authorization": `Basic ${auth}`
        }
    }
    let response = await axios(requestConfig).catch(err => {
        loggerPino.error(err);
        throw new Error("Error call generate config helper");
    });
    if (!response) {
        throw new Error("Error call generate config helper");
    }

    try {
        let resultData = response.data;
        if (response.status > 299 && response.status < 599) {
            loggerPino.info("Template generation issue");
            loggerPino.error(str(resultData));
            loggerPino.info("Whole response of the request ");
            loggerPino.info(response);
            throw new Error("Error call generate config helper");
        } else if (response.status <= 299 && response.status >= 200) {
            let globals = carcheRqBody.globals;
            let mainData = carcheRqBody.main_data;
            let data = {
                sessionId: sessionID,
                templateFile: globals.templatefile,
                templateUUID: mainData.uuid,
                generatedTemplate: resultData
            };
            let carData = ({
                "version": mainData.version,
                "templateType": mainData.templateType,
                "id": mainData.id
            });
            if (mainData.contractid) {
                carData["contractId"] = mainData.contractid;
            }
            if (mainData.services) {
                carData["services"] = mainData.services;
            }
            data["carcheData"] = carData;

            try {
                let insertTemplate = await carcheGCC.insertIntoCarcheTemplateTable(data);
                if (insertTemplate) {
                    return {
                        status: "OK", result: resultData,
                        templateId: insertTemplate.ID, templateUuid: insertTemplate.TEMPLATE_UUID
                    };
                } else {
                    return {
                        status: "Error"
                    };
                }
            } catch (err) {
                loggerPino.error("cArche template insert cArcheController");
                loggerPino.error(err);
                throw new Error("Database error");
            }

        } else {
            loggerPino.error("Incorect status template generateConfigHelper");
            loggerPino.info("Whole response of the request ");
            loggerPino.info(response);
            throw new Error("Error call generate config helper");
        }
    } catch (err) {
        loggerPino.error(err);
        loggerPino.info("Whole response of the request ");
        loggerPino.info(response);
        throw new Error("Error call generate config helper");
    }

};


exports.convertArcheToJinja = [[
    body("data").trim(),
    check("data").isLength({ min: 1 })
], async (req, res) => {
    loggerPino.info("****************************CONVERT_ARCHE_TO_JINJA************************");
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors });
    }
    const route = "/a2j-translator/translate/";
    const { data } = req.body;
    exports.cArcheReqHelper({ data }, route)
    .then(response => {
        if (response && response.status == "OK") {
            return res.status(ok).json(response.result);
        } else {
            return res.status(internalServerError).json({ message: "Unable to convert to jinja config - cArche Internal error" });
        }
    }).catch(err => {
        loggerPino.error(err);
        return res.status(internalServerError).json({ message: "Unable to convert to jinja config - Internal Server Error" });
    });
}];


// async functions - get service, customer, vendor type, content type, template type by ID

exports.getServiceById = async function (serviceId) {
    let service = await ServiceName.findOne({
        where: {
            ID: serviceId
        }
    }).catch(err => {
        loggerPino.error(err);
        throw new Error("Database error");
    });
    return service;
};

exports.getCustomerById = async function (customerId) {
    let customer = await Customers.findOne({
        where: {
            ID: customerId
        }
    }).catch(err => {
        loggerPino.error(err);
        throw new Error("Database error");
    });
    return customer;
};


exports.getCTContetTypeById = async function (ctContentTypeById) {
    let ctContentType = await CTContentTypes.findOne({
        where: {
            ID: ctContentTypeById
        }
    }).catch(err => {
        loggerPino.error(err);
        throw new Error("Database error");
    });
    return ctContentType;
};

exports.getCTTypesById = async function (cTTypesId) {
    let cTType = await CTTypes.findOne({
        where: {
            ID: cTTypesId
        }
    }).catch(err => {
        loggerPino.error(err);
        throw new Error("Database error");
    });
    return cTType;
};

exports.getcTVendorTypeById = async function (cTVendorTypeId) {
    let ctVendorType = await CTVendorTypes.findOne({
        where: {
            ID: cTVendorTypeId
        }
    }).catch(err => {
        loggerPino.error(err);
        throw new Error("Database error");
    });
    return ctVendorType;
};



