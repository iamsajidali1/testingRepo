const { ServiceName } = require("../models/serviceNameModel");
const { ServiceToCustomer } = require("../models/serviceToCustomerModel");
const { TemplateToServiceToCustomer } = require("../models/templateToServiceToCustomerModel");
const { UserToServiceToCustomer } = require("../models/userToServiceToCustomerModel");
const { Users } = require("../models/usersModel");
const { UsersTemplate } = require("../models/usersTemplateModel");
const { Templates } = require("../models/templatesDataModel");
const { ActionData } = require("../models/actionDataModel");
const { ActionDataToServiceToCustomer } = require("../models/actionDataToServiceToCustomerModel");
const { McapCredential } = require("../models/mcapCredentialModel");
const { McapCredentialToServiceToCustomer } = require("../models/mcapCredentialToServiceToCustomerModel");
const { OrchestratorList } = require("../models/orchestratorListModel");
const { OrchestratorListToServiceToCustomer } = require("../models/orchestratorlistToServiceToCustomer");
const { RoleToService } = require("../models/roleToServiceModel");
const { TemplateToService } = require("../models/templateToServiceModel");
const { RoleToServiceToCustomer } = require("../models/roleToServiceToCustomerModel");
const { UserToService } = require("../models/userToServiceModel");
const { RoleTemplates } = require("../models/roleTemplates");
const { check, validationResult, query, body } = require("express-validator");
const { Roles } = require("../models/rolesModel");
const { ServiceAttributes } = require('../models/serviceAttributesModel');
const { ServiceToServiceAttributes } = require('../models/serviceToServiceAttributesModel');
const { Customers } = require('../models/customerOneModel');
const oneConnection = require("../models/databaseOne").Database.getInstance();
const loggerPino = require("../helpers/loggerHelper");

exports.loadService = [[
], (req, res) => {
    exports.loadServiceAsync().then(result => {
        return res.status(200).send({ result: result, message: "Successful!"});
    }).catch(error => {
        console.log(error);
        return res.status(500).send({ message: "Internal server error!", errorId: "" });
    });
}];

exports.loadServiceAsync = async () => {
    const services = await ServiceName.findAll();
    let result = [];
    services.forEach(service => {
        result.push({
            id : service["dataValues"]["ID"],
            serviceName : service["dataValues"]["SERVICE_NAME"],
        });
    });
    return result;
};

exports.loadServicesByTemplates = [[],
  async (req, res) => {
    try {
      const result = await exports.loadServicesByTemplatesAsync(
        req["ebizUserId"],
        req["ebizCompanyId"],
        req.query,
        req.upmLevels
      );
      return res.status(200).send({ result: result, message: "Successful!" });
    } catch (error) {
      console.log(error);
      return res
        .status(500)
        .send({ message: "Internal server error!", errorId: "" });
    }
  }]


exports.loadServicesByTemplatesAsync = async (ebizUserId, ebizCompanyId, query, upmLevels) => {
  const result = [];
  const serviceIds = [];
  // find all available customers for user based on attuid which have assigned actions(templates)
  const customerId = await exports.findCustomerId(query["customerId"], ebizCompanyId);
  const userId = await exports.findUserId(query["attuid"], ebizUserId);

  const customerService = await Templates.findAll({
    include: [
      {
        model: TemplateToServiceToCustomer,
        required: true,
        include: [
          {
            model: ServiceToCustomer,
            required: true,
            where: { CUSTOMER_ID: customerId },
            include: [
              {
                model: UserToServiceToCustomer,
                required: true,
                include: [
                  {
                    model: Users,
                    required: true,
                    where: { ID: userId },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    where : {
      ENABLED: true
    }
  }).catch((error) => {
    loggerPino.error(error);
    throw new Error({ message: "Template error" });
  });

  customerService.forEach((result) => {
    result["dataValues"]["TemplateToServiceToCustomers"].forEach(
      (templateToServiceToCustomers) => {
        serviceId =
          templateToServiceToCustomers["dataValues"]["ServiceToCustomer"][
            "dataValues"
          ]["SERVICE_ID"];
        if (serviceIds.indexOf(serviceIds) === -1) {
          serviceIds.push(serviceId);
        }
      }
    );
  });

  const individualTempalte = await Templates.findAll({
    include: [
      {
        model: UsersTemplate,
        required: true,
        include: [
          {
            model: Users,
            required: true,
            where: { ID: userId},
          },
        ],
      },
      {
        model: TemplateToServiceToCustomer,
        required: true,
        include: [
          {
            model: ServiceToCustomer,
            where: { CUSTOMER_ID: customerId },
            required: true,
          },
        ],
      },
    ],
    where : {
      ENABLED: true
    }
  }).catch((error) => {
    loggerPino.error(error);
    throw new Error({ message: "User Template error" });
  });

  individualTempalte.forEach((result) => {
    result["dataValues"]["TemplateToServiceToCustomers"].forEach(
      (templateToServiceToCustomer) => {
        serviceId =
          templateToServiceToCustomer["dataValues"]["ServiceToCustomer"][
            "dataValues"
          ]["SERVICE_ID"];

        if (serviceIds.indexOf(serviceId) === -1) {
          serviceIds.push(serviceId);
        }
      }
    );
  });

  if(upmLevels && upmLevels.length > 0 ){
  for (const level of upmLevels) {
    const roleIndividualServices = await Templates.findAll({
      include: [
        {
          model: TemplateToService,
          required: true,
          include: [
            {
              model: ServiceName,
              required: true,
              include: [
                {
                  model: ServiceToCustomer,
                  required:true,
                  where: { CUSTOMER_ID: customerId }
              }
              ],
            },
          ],
        },
        {
          model: RoleTemplates,
          required: true,
          include: [
            {
              model: Roles,
              required: true,
              where: { IDENTIFICATOR: level["levelName"] },
            },
          ],
        },
      ],
      where : {
        ENABLED: true
      }
    });
    roleIndividualServices.forEach((service) => {
      service["TemplateToServices"].forEach((templateToService) => {
        serviceId = templateToService["dataValues"]["SERVICE_ID"];
        if (serviceIds.indexOf(serviceId) === -1) {
          serviceIds.push(serviceId);
        }
      });
    });

    const roleCustomerServices = await Templates.findAll({
      include: [
        {
          model: TemplateToServiceToCustomer,
          required: true,
          include: [
            {
              model: ServiceToCustomer,
              required: true,
              where: { CUSTOMER_ID: customerId },
              include: [
                {
                  model: RoleToServiceToCustomer,
                  required: true,
                  include: [
                    {
                      model: Roles,
                      required: true,
                      where: { IDENTIFICATOR: level["levelName"] },
                    },
                  ],
                },
                {
                  model: ServiceName,
                  required: true,
                },
              ],
            },
          ],
        },
      ],
      where : {
        ENABLED: true
      }
    });

    roleCustomerServices.forEach((service) => {
      service["TemplateToServiceToCustomers"].forEach(
        (templateToServiceToCustomer) => {
          serviceId =
            templateToServiceToCustomer["ServiceToCustomer"]["ServiceName"][
              "ID"
            ];
          if (serviceIds.indexOf(serviceId) === -1) {
            serviceIds.push(serviceId);
          }
        }
      );
    });

    const roleServices = await Templates.findAll({
      include: [
        {
          model: TemplateToService,
          required: true,
          include: [
            {
              model: ServiceName,
              required: true,
              include: [
                {
                  model: RoleToService,
                  required: true,
                  include: [
                    {
                      model: Roles,
                      required: true,
                      where: { IDENTIFICATOR: level["levelName"] },
                    },
                  ],
                },
                {
                  model: ServiceToCustomer,
                  required:true,
                  where: { CUSTOMER_ID: customerId }
              }
              ],
            },
          ],
        },
      ],
      where : {
        ENABLED: true
      }
    });

    roleServices.forEach((service) => {
      service["TemplateToServices"].forEach((templateToService) => {
        serviceId = templateToService["dataValues"]["SERVICE_ID"];
        if (serviceIds.indexOf(serviceId) === -1) {
          serviceIds.push(serviceId);
        }
      });
    });

    const roleTemplateServices = await Templates.findAll({
      include: [
        {
          model: RoleTemplates,
          required: true,
          include: [
            {
              model: Roles,
              required: true,
              where: { IDENTIFICATOR: level["levelName"] },
            }
          ],
        },
        {
          model: TemplateToServiceToCustomer,
          required: true,
          include: [
            {
              model: ServiceToCustomer,
              required: true,
              where: { CUSTOMER_ID: customerId }
            },
          ],
        },
      ],
      where : {
        ENABLED: true
      }
    });
    roleTemplateServices.forEach((service) => {
      service["TemplateToServiceToCustomers"].forEach((templateToServiceToCustomer) => {
        serviceId = templateToServiceToCustomer["dataValues"]["ServiceToCustomer"]["dataValues"]["SERVICE_ID"];
        if (serviceIds.indexOf(serviceId) === -1) {
          serviceIds.push(serviceId);
        }
      });
    });
  }
}

  const serviceUser = await Templates.findAll({
    include: [
      {
        model: TemplateToService,
        required: true,
        include: [
          {
            model: ServiceName,
            required: true,
            include: [
              {
                model: UserToService,
                required: true,
                include: [
                  {
                    model: Users,
                    required: true,
                    where: { ID: userId },
                  },
                ],
              },
              {
                model: ServiceToCustomer,
                required:true,
                where: { CUSTOMER_ID: customerId }
            }
            ],
          },
        ],
      },
    ],
    where : {
      ENABLED: true
    }
  });

  serviceUser.forEach((templateToServices) => {
    templateToServices["TemplateToServices"].forEach((service) => {
      serviceId = service["dataValues"]["SERVICE_ID"];
      if (serviceIds.indexOf(serviceId) === -1) {
        serviceIds.push(serviceId);
      }
    });
  });

const serviceIndividualTemplateUser = await Templates.findAll({
    include: [
      {
        model: TemplateToService,
        required: true,
        include: [
          {
            model: ServiceName,
            required: true,
            include: [
              {
                model: ServiceToCustomer,
                required:true,
                where: { CUSTOMER_ID: customerId }
            }
            ],
          },
        ],
      },
      {
        model: UsersTemplate,
        required: true,
        include: [
          {
            model: Users,
            required: true,
            where: { ID: userId },
          },
        ],
      },
    ],
    where : {
      ENABLED: true
    }
  });

  serviceIndividualTemplateUser.forEach((templateToServices) => {
    templateToServices["TemplateToServices"].forEach((service) => {
      serviceId = service["dataValues"]["SERVICE_ID"];
      if (serviceIds.indexOf(serviceId) === -1) {
        serviceIds.push(serviceId);
      }
    });
  });

  const services = await ServiceName.findAll({
    where: { ID: serviceIds },
  }).catch((error) => {
    loggerPino.error(error);
    throw new Error({ message: "Service error" });
  });

  services.forEach((service) => {
    result.push({
      SERVICE_ID: service["dataValues"]["ID"],
      NAME: service["dataValues"]["SERVICE_NAME"],
    });
  });
  return result;
};

exports.findUserId = async (attuid, ebizUserId) => {
  const whereConditionParametrized =
    attuid != undefined ? { ATTUID: attuid } : { BC_USER_ID: ebizUserId };
  try {
    const user = await Users.findOne({
      where: whereConditionParametrized,
    });
    if (user) {
      return user["dataValues"]["ID"];
    } else {
      return -1;
    }
  } catch (error) {
    loggerPino.error(error);
    return -1;
  }
};


exports.findCustomerId = async(customerId, ebizCompanyId) => {
  const whereConditionParametrized = customerId!=undefined? {ID: customerId} : {BC_COMPANY_ID: ebizCompanyId};
  try {
    const customer = await Customers.findOne({
      where: whereConditionParametrized
    })
    if(customer){
      return customer['dataValues']['ID'];
    } else {
      return -1
    }
  } catch(error) {
    loggerPino.error(error);
    return -1;
  }

  }

exports.loadActionDataForCustomer = [[
    query("customerId").trim(),
    check("customerId").isNumeric(),
    query("serviceId").trim(),
    check("serviceId").isNumeric()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).send({ message: errors });
    }
    exports.loadActionDataForCustomerAsync(req.query).then(result => {
        return res.status(200).send({ result: result, message: "Successful!"});
    }).catch(error => {
        console.log(error);
        return res.status(500).send({ message: "Internal server error!", errorId: "" });
    });
}];

exports.loadActionDataForCustomerAsync = async (query) => {
    try{
        const result = await oneConnection.transaction({autocommit: true}, async function (t) {
            const actionData = await ServiceToCustomer.findOne({
                where : { SERVICE_ID : query["serviceId"], CUSTOMER_ID : query["customerId"] },
                include: [{
                    model: ActionDataToServiceToCustomer,
                    required: true,
                    include: [{
                        model: ActionData,
                        required: false
                    }]
                }]
            }, { transaction: t});
            let result = [];
            if(actionData){
                actionData["dataValues"]["ActionDataToServiceToCustomers"].forEach(actionD => {
                    result.push({
                        id : actionD["ActionDatum"]["ID"],
                        actionCustomerId : actionD["ActionDatum"]["ACTION_DATA_CUS_ID"],
                        actionCustomerName : actionD["ActionDatum"]["ACTION_DATA_CUS_NAME"]
                    });
                });
            }
            return result;
        }).then(function (result) {
            return result;
        }).catch(function (error) {
            throw error;
        });
        return result;
    } catch(error){
        console.log(error);
        return error;
    }
};

exports.saveActionDataForCustomer = [[
    body("customerId").trim(),
    check("customerId").isNumeric(),
    body("serviceId").trim(),
    check("serviceId").isNumeric(),
    body("actionId").trim(),
    check("actionId").isLength({ min: 0, max: 255 }),
    body("actionName").trim(),
    check("actionName").isLength({ min: 1, max: 255 })
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).send({ message: errors });
    }
    exports.saveActionDataForCustomerAsync(req.body).then(result => {
        if(result["message"] == "Client error!"){
            return res.status(400).send({ message: "Client error!"});
        } else {
            return res.status(200).send({ id: result["ID"], message: "Successful!"});
        }
    }).catch(error => {
        console.log(error);
        return res.status(500).send({ message: "Internal server error!", errorId: "" });
    });
}];

exports.saveActionDataForCustomerAsync = async (body) => {
    try {
        const result = await oneConnection.transaction({autocommit: true}, async function (t) {
            const serviceToCustomer = await ServiceToCustomer.findOne({
                where : { SERVICE_ID : body["serviceId"], CUSTOMER_ID : body["customerId"]}
            }, { transaction: t});
            if(!serviceToCustomer["dataValues"]["ID"]){
                return { dataValues : { message : "Client error!"}};
            }
            const actionData = await ActionData.create( {
                ACTION_DATA_CUS_ID : body["actionId"],
                ACTION_DATA_CUS_NAME : body["actionName"]
            }, { transaction: t});
            if(actionData["dataValues"]["ID"]){
                await ActionDataToServiceToCustomer.create( {
                    ACTION_DATA_ID : actionData["dataValues"]["ID"],
                    SERVICE_TO_CUSTOMER_ID : serviceToCustomer["dataValues"]["ID"]
                }, { transaction: t});
                return actionData;
            } else {
                return { dataValues : { message : "Client error!" } };
            }
        }).then(function (result) {
            return result.dataValues;
        }).catch(function (error) {
            throw error;
        });
        return result;
    } catch(error){
        console.log(error);
        return error;
    }
};

exports.updateActionDataForCustomer = [[
    body("id").trim(),
    check("id").isNumeric(),
    body("actionId").trim(),
    check("actionId").isLength({ min: 1, max: 255 }),
    body("actionName").trim(),
    check("actionName").isLength({ min: 1, max: 255 })
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).send({ message: errors });
    }
    exports.updateActionDataForCustomerAsync(req.body).then(result => {
        if(result["message"] == "Client error!"){
            return res.status(400).send({ message: "Client error!"});
        } else {
            return res.status(200).send({ message: "Successful!"});
        }
    }).catch(error => {
        console.log(error);
        return res.status(500).send({ message: "Internal server error!", errorId: "" });
    });
}];

exports.updateActionDataForCustomerAsync = async (body) => {
    try {
        const result = await oneConnection.transaction({autocommit: true}, async function (t) {
            const actionData = await ActionData.update({
                ACTION_DATA_CUS_ID : body["actionId"],
                ACTION_DATA_CUS_NAME : body["actionName"]
            }, {
                where: {
                    ID: body["id"]
                }
            },{ transaction: t });
            if(actionData[0]){

                return { message : "Successful!" };
            } else {
                return { message : "Client error!" };
            }
        }).then(function (result) {
            return result;
        }).catch(function (error) {
            throw error;
        });
        return result;
    } catch(error){
        console.log(error);
        return error;
    }
};

exports.deleteActionDataForCustomer = [[
    query("id").trim(),
    check("id").isNumeric()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).send({ message: errors });
    }
    exports.deleteActionDataForCustomerAsync(req.query).then(result => {
        if(result["message"] == "Client error!"){
            return res.status(400).send({ message: "Client error!"});
        } else {
            return res.status(200).send({ message: "Successful!"});
        }
    }).catch(error => {
        console.log(error);
        return res.status(500).send({ message: "Internal server error!", errorId: "" });
    });
}];

exports.deleteActionDataForCustomerAsync = async (query) => {
    try {
        const result = await oneConnection.transaction({autocommit: true}, async function (t) {
            const actionData = await ActionData.destroy({
                where: {
                    ID: query["id"]
                }
            },{ transaction: t });
            if(actionData){
                return { message : "Successful!" };
            } else {
                return { message : "Client error!" };
            }
        }).then(function (result) {
            return result;
        }).catch(function (error) {
            throw error;
        });
        return result;
    } catch(error){
        console.log(error);
        return error;
    }
};

exports.loadCredentialsForService = [[
    query("customerId").trim(),
    check("customerId").isNumeric(),
    query("serviceId").trim(),
    check("serviceId").isNumeric()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).send({ message: errors });
    }
    exports.loadCredentialsForServiceAsync(req.query).then(credential => {
        let result = { id : credential["ID"], credential : credential["CREDENTIAL"]};
        return res.status(200).send({ result: result, message: "Successful!" });
    }).catch(error => {
        console.log(error);
        return res.status(500).send({ message: "Internal server error!", errorId: "" });
    });
}];

exports.loadCredentialsForServiceAsync = async (query) => {
    try{
        const result = await oneConnection.transaction({autocommit: true}, async function (t) {
            const mcapCredential = await ServiceToCustomer.findOne({
                attributes:  [ "ID" ],
                where : { SERVICE_ID : query["serviceId"], CUSTOMER_ID : query["customerId"] },
                include: [{
                    attributes:  [ "MCAP_CREDENTIAL_ID" ],
                    model: McapCredentialToServiceToCustomer,
                    required: true,
                    include: [{
                        attributes:  [ "ID", "CREDENTIAL" ],
                        model: McapCredential,
                        required: false
                    }]
                }]
            }, { transaction: t});
            if(mcapCredential["dataValues"]["McapCredentialToServiceToCustomers"][0]["dataValues"]["McapCredential"]["dataValues"]){
                return mcapCredential["dataValues"]["McapCredentialToServiceToCustomers"][0]["dataValues"]["McapCredential"];
            } else {
                return { dataValues : { message: " " } };
            }
        }).then(function (result) {
            return result.dataValues;
        }).catch(function (error) {
            throw error;
        });
        return result;
    } catch(error){
        console.log(error);
        return error;
    }
};

exports.saveCredentialsForService = [[
    body("customerId").trim(),
    check("customerId").isNumeric(),
    body("serviceId").trim(),
    check("serviceId").isNumeric(),
    body("credentialId").trim(),
    check("credentialId").isNumeric()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).send({ message: errors });
    }
    exports.saveCredentialsForServiceAsync(req.body).then(result => {
        if(result.message == "Client error!"){
            return res.status(400).send({ message: result.message });
        } else {
          return res.status(200).send({ message: result.message });
        }
    }).catch(error => {
        console.log(error);
        return res.status(500).send({ message: "Internal server error!", errorId: "" });
    });
}];

exports.saveCredentialsForServiceAsync = async (body) => {
    try {
        const result = await oneConnection.transaction({autocommit: true}, async function (t) {
            const serviceToCustomer = await ServiceToCustomer.findOne({
                where : { SERVICE_ID : body["serviceId"], CUSTOMER_ID : body["customerId"]}
            }, { transaction: t});
            if(!serviceToCustomer){
                return { message : "Client error!" };
            } else {
                const mcapCredential = await McapCredential.findOne({
                    where : { ID : body["credentialId"] }
                }, { transaction: t});
                if(mcapCredential && mcapCredential.dataValues["ID"]){
                    const checkUpdate = await McapCredentialToServiceToCustomer.findOne({
                      where : { SERVICE_TO_CUSTOMER_ID: serviceToCustomer.dataValues["ID"] }
                    }, { transaction: t});
                    let mcapCredentialToServiceToCustomer;
                    if(checkUpdate && checkUpdate["dataValues"]
                        && checkUpdate["dataValues"]["ID"]){
                      mcapCredentialToServiceToCustomer = await McapCredentialToServiceToCustomer.update({
                        MCAP_CREDENTIAL_ID: mcapCredential.dataValues["ID"]
                      }, {
                        where : {
                          ID : checkUpdate["dataValues"]["ID"]
                        }
                      }, { transaction: t});
                    } else {
                      mcapCredentialToServiceToCustomer = await McapCredentialToServiceToCustomer.create({
                        MCAP_CREDENTIAL_ID: mcapCredential.dataValues["ID"],
                        SERVICE_TO_CUSTOMER_ID: serviceToCustomer.dataValues["ID"]
                      }, { transaction: t});
                    }
                    if(mcapCredentialToServiceToCustomer.dataValues){
                        return { message: "Successful!" };
                    } else {
                        throw new Error("Server error! DB mcap credential to service to customer insertion failed!");
                    }
                } else {
                    throw new Error("Server error! DB mcap credential insertion failed!");
                }
            }
        }).then(function (result) {
            return result;
        }).catch(function (error) {
            throw error;
        });
        return result;
    } catch(error){
        console.log(error);
        return error;
    }
};

exports.createMcapCredentials = [[
  body("credential").trim(),
  check("credential").isLength({ min: 1, max: 150 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).send({ message: errors });
  }
  try {
    const result = await exports.createMcapCredentialsAsync(req.body);
    return res.status(200).send({ message: result.message });
  } catch(error){
    console.log(error);
    return res.status(500).send({ message: "Internal server error!", errorId: "" });
  }
}];

exports.createMcapCredentialsAsync = async(body) => {
  const result = await oneConnection.transaction({autocommit: true}, async function (t) {
    await McapCredential.create({
      CREDENTIAL : body["credential"]
    }, { transaction: t});
    return { message: "Successful!" };
  });
  return result;
}

exports.loadAllMcapCredentials = async (req, res) => {
    try {
      const result = await exports.loadAllMcapCredentialsHelper();
      return res.status(200).send(result);
    } catch(error) {
      console.log(error);
      return res.status(500).send({ message: "Internal server error!", errorId: "" });
    }
};

exports.loadAllMcapCredentialsHelper = async () => {
  const mcapCredentials = await McapCredential.findAll();
  let result = [];
  if(mcapCredentials && mcapCredentials.length){
    mcapCredentials.forEach(credential =>{
      result.push({
        id : credential["dataValues"]["ID"],
        credential : credential["dataValues"]["CREDENTIAL"],
      })
    });
  }
  return result;
};

exports.deleteCredentialsForService = [[
    query("id").trim(),
    check("id").isNumeric(),
    query("serviceId").trim(),
    check("serviceId").isNumeric(),
    query("customerId").trim(),
    check("customerId").isNumeric()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).send({ message: errors });
    }
    exports.deleteCredentialsForServiceAsync(req.query).then(result => {
        if(result.message == "Client error!"){
            return res.status(400).send({ message: result.message });
        } else {
          return res.status(200).send({ message: result.message });
        }
    }).catch(error => {
        console.log(error);
        return res.status(500).send({ message: "Internal server error!", errorId: "" });
    });
}];

exports.deleteCredentialsForServiceAsync = async (query) => {
    try {
        const result = await oneConnection.transaction({autocommit: true}, async function (t) {
            const serviceToCustomer = await ServiceToCustomer.findOne({
              where: {
                  CUSTOMER_ID : query["customerId"], SERVICE_ID : query["serviceId"]
              }
            },{ transaction: t });
            if(serviceToCustomer && serviceToCustomer["dataValues"] &&
              serviceToCustomer["dataValues"]["ID"]){
              const mcapCredential = await McapCredentialToServiceToCustomer.destroy({
                  where: {
                      MCAP_CREDENTIAL_ID: query["id"], SERVICE_TO_CUSTOMER_ID : serviceToCustomer["dataValues"]["ID"]
                  }
              },{ transaction: t });
              if(mcapCredential){
                  return { message : "Successful!" };
              } else {
                  return { message : "Client error!" };
              }
            } else {
              return { message : "Client error!" };
            }
        }).then(function (result) {
            return result;
        }).catch(function (error) {
            throw error;
        });
        return result;
    } catch(error){
        console.log(error);
        return error;
    }
};

exports.deleteCredentials = [[
  query("id").trim(),
  check("id").isNumeric()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).send({ message: errors });
  }
  try {
    const result = await exports.deleteCredentialsAsync(req.query);
    if(result.message == "Client error!"){
      return res.status(400).send({ message: result.message });
    } else {
      return res.status(200).send({ message: result.message });
    }
  } catch(error){
    console.log(error);
      return res.status(500).send({ message: "Internal server error!", errorId: "" });
  }
}];

exports.deleteCredentialsAsync = async (query) => {
    const result = await oneConnection.transaction({autocommit: true}, async function (t) {
        const mcapCredential = await McapCredential.destroy({
            where: {
                ID: query["id"]
            }
        },{ transaction: t });
        if(mcapCredential){
            return { message : "Successful!" };
        } else {
            return { message : "Client error!" };
        }
    });
    return result;
};

exports.loadOrchestratorListForService = [[
    query("customerId").trim(),
    check("customerId").isNumeric(),
    query("serviceId").trim(),
    check("serviceId").isNumeric()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).send({ message: errors });
    }
    exports.loadOrchestratorListForServiceAsync(req.query).then(result => {
        return res.status(200).send({ result : result, message: "Successful!"});
    }).catch(error => {
        console.log(error);
        return res.status(500).send({ message: "Internal server error!", errorId: "" });
    });
}];

exports.loadOrchestratorListForServiceAsync = async (query) => {
    try{
        const result = await oneConnection.transaction({autocommit: true}, async function (t) {
            const orchestratorList = await ServiceToCustomer.findOne({
                attributes:  [ "ID" ],
                where : { SERVICE_ID : query["serviceId"], CUSTOMER_ID : query["customerId"] },
                include: [{
                    attributes:  [ "ORCHESTRATOR_LIST_ID" ],
                    model: OrchestratorListToServiceToCustomer,
                    required: true,
                    include: [{
                        attributes:  [ "ID", "URL", "TENANT_ID", "CONFIG_YAML" ],
                        model: OrchestratorList,
                        required: false
                    }]
                }]
            }, { transaction: t});
            let result = [];
            if(orchestratorList){
                orchestratorList["dataValues"]["OrchestratorListToServiceToCustomers"].forEach(orchD => {
                    result.push({
                        id : orchD["dataValues"]["OrchestratorList"]["ID"],
                        url : orchD["dataValues"]["OrchestratorList"]["URL"],
                        tenantId : orchD["dataValues"]["OrchestratorList"]["TENANT_ID"],
                        configYaml: orchD["dataValues"]["OrchestratorList"]["CONFIG_YAML"]
                    });
                });
            }
            return result;
        }).then(function (result) {
            return result;
        }).catch(function (error) {
            throw error;
        });
        return result;
    } catch(error){
        console.log(error);
        return error;
    }
};

exports.saveOrchestratorListForService = [[
    body("customerId").trim(),
    check("customerId").isNumeric(),
    body("serviceId").trim(),
    check("serviceId").isNumeric(),
    body("url").trim(),
    check("url").isLength({ min: 1, max: 255 }),
    body("tenantId").trim(),
    check("tenantId").isLength({ min: 1, max: 50 })
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).send({ message: errors });
    }
    exports.saveOrchestratorListForServiceAsync(req.body).then(result => {
        if(result["message"] == "Client error!"){
            return res.status(400).send({ message: "Client error!"});
        } else {
            return res.status(200).send({ id: result["ID"], message: "Successful!"});
        }
    }).catch(error => {
        console.log(error);
        return res.status(500).send({ message: "Internal server error!", errorId: "" });
    });
}];

exports.saveOrchestratorListForServiceAsync = async (body) => {
    try {
        const result = await oneConnection.transaction({autocommit: true}, async function (t) {
            const serviceToCustomer = await ServiceToCustomer.findOne({
                where : { SERVICE_ID : body["serviceId"], CUSTOMER_ID : body["customerId"]}
            }, { transaction: t});
            if(!serviceToCustomer){
                return { message : "Client error!" };
            } else {
                const orchestratorList = await OrchestratorList.create({
                    URL: body["url"],
                    TENANT_ID: body["tenantId"]
                }, { transaction: t});
                if(orchestratorList.dataValues["ID"]){
                    const orchestratorListToServiceToCustomer = await OrchestratorListToServiceToCustomer.create({
                        ORCHESTRATOR_LIST_ID: orchestratorList.dataValues["ID"],
                        SERVICE_TO_CUSTOMER_ID: serviceToCustomer.dataValues["ID"]
                    }, { transaction: t});
                    if(orchestratorListToServiceToCustomer.dataValues){
                        return { message: "Successful!" };
                    } else {
                        throw new Error("Server error! DB orchestrator-list to service to customer insertion failed!");
                    }
                } else {
                    throw new Error("Server error! DB orchestrator-list insertion failed!");
                }
            }
        }).then(function (result) {
            return result;
        }).catch(function (error) {
            throw error;
        });
        return result;
    } catch(error){
        console.log(error);
        return error;
    }
};

exports.updateOrchestratorListForService = [[
    body("id").trim(),
    check("id").isNumeric(),
    body("url").trim(),
    check("url").isLength({ min: 1, max: 255 }),
    body("tenantId").trim(),
    check("tenantId").isLength({ min: 1, max: 50 })
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).send({ message: errors });
    }
    exports.updateOrchestratorListForServiceAsync(req.body).then(result => {
        if(result["message"] == "Client error!"){
            return res.status(400).send({ message: "Client error!"});
        } else {
            return res.status(200).send({ id: result["ID"], message: "Successful!"});
        }
    }).catch(error => {
        console.log(error);
        return res.status(500).send({ message: "Internal server error!", errorId: "" });
    });
}];

exports.updateOrchestratorListForServiceAsync = async (body) => {
    try {
        const result = await oneConnection.transaction({autocommit: true}, async function (t) {
            const orchestratorList = await OrchestratorList.update({
                URL: body["url"],
                TENANT_ID: body["tenantId"]
            }, {
                where: {
                    ID: body["id"]
                }
            },{ transaction: t });

            if(orchestratorList[0]){
                return { message : "Successful!" };
            } else {
                return { message : "Client error!" };
            }
        }).then(function (result) {
            return result;
        }).catch(function (error) {
            throw error;
        });
        return result;
    } catch(error){
        console.log(error);
        return error;
    }
};

exports.deleteOrchestratorListForService = [[
    query("id").trim(),
    check("id").isNumeric()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).send({ message: errors});
    }
    exports.deleteOrchestratorListForServiceAsync(req.query).then(result => {
        if(result["message"] == "Client error!"){
            return res.status(400).send({ message: "Client error!"});
        } else {
            return res.status(200).send({ id: req.query["id"], message: "Successful!"});
        }
    }).catch(error => {
        console.log(error);
        return res.status(500).send({ message: "Internal server error!", errorId: "" });
    });
}];

exports.deleteOrchestratorListForServiceAsync = async (query) => {
    try {
        const result = await oneConnection.transaction({autocommit: true}, async function (t) {
            const orchestratorList = await OrchestratorList.destroy({
                where: {
                    ID: query["id"]
                }
            },{ transaction: t });
            if(orchestratorList){
                return { message : "Successful!" };
            } else {
                return { message : "Client error!" };
            }
        }).then(function (result) {
            return result;
        }).catch(function (error) {
            throw error;
        });
        return result;
    } catch (error) {
        console.log(error);
        return error;
    }
}

exports.createService = [
  [
    body("serviceName").trim(),
    check("serviceName").isLength({ min: 1, max: 255 }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).send({ message: errors });
    }
    exports
      .createServiceAsync(req.body)
      .then((result) => {
        if (result["status"] >= 300 && result["status"] <= 499) {
          return res.status(400).send({ message: result });
        } else {
            return res
            .status(200)
            .send({ id: result["result"]["id"], message: "Successful" });
        }
      })
      .catch((error) => {
        loggerPino.error(error);
        return res.status(500).send({ message: "Internal server error!" });
      });
  },
];

exports.createServiceAsync = async (body) => {
  try {
    const result = await oneConnection
      .transaction({ autocommit: true }, async function (t) {
        const service = await ServiceName.findOne(
          {
            where: { SERVICE_NAME: body["serviceName"] },
          },
          { transaction: t }
        );
        if (service) {
          throw new Error("There is existing service with that name !");
        }
        const serviceName = await ServiceName.create(
          {
            SERVICE_NAME: body["serviceName"],
          },
          { transaction: t }
        );

        return serviceName;
      })
      .then((res) => {
        const result = {
          status: 200,
          result: res.dataValues,
        };
        return result;
      });
    return result;
  } catch (e) {
    loggerPino.error(e)
    const error = {
      status: 400,
      errorMessage: "Internal server error",
    };
    return error;
  }
};

exports.updateService = [
  [
    body("serviceId").trim(),
    check("serviceId").isLength({ min: 1, max: 255 }),
    body("serviceName").trim(),
    check("serviceName").isLength({ min: 1, max: 255 }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).send({ message: errors });
    }
    exports
      .updateServiceAsync(req.body)
      .then((result) => {

        if (result["status"] > 300 && result["status"] < 499) {
          return res.status(400).send({ message: "Error" });
        } else {
            return res.status(200).send({ message: "Successful!" });
        }
      })
      .catch((error) => {
        loggerPino.error(error);
        return res.status(500).send({ message: "Internal server error!" });
      });
  },
];

exports.updateServiceAsync = async (body) => {
  try {
    const result = await oneConnection
      .transaction({ autocommit: true }, async function (t) {
        const service = await ServiceName.findOne(
          {
            where: { ID: body["serviceId"] },
          },
          { transaction: t }
        );
        if (!service) {
          throw new Error("There is no service with that ID!");
        }
        const serviceName = await ServiceName.update(
          {
            SERVICE_NAME: body["serviceName"],
          },
          {
            where: {
              ID: body["serviceId"],
            },
          },
          { transaction: t }
        );
        if (serviceName) {
          return { status: 200, message: "Successful!" };
        } else {
          throw new Error("Client error");
        }
      })
      .then((result) => {
        return result;
      })
      .catch((error) => {
        loggerPino.error(error)
        throw new Error(error);
      });
    return result;
  } catch (e) {
      loggerPino.error(e)
    const error = {
      status: 400,
      errorMessage: "Internal server error",
    };
    return error;
  }
};

exports.deleteService = [
    [
      body("serviceId").trim(),
      check("serviceId").isLength({ min: 1, max: 255 })
    ],
    (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).send({ message: errors });
      }
      exports
        .deleteServiceAsync(req.body)
        .then((result) => {
          if (result["status"] > 300 && result["status"] < 499) {
            return res.status(400).send({ message: "Error" });
          } else {
            return res.status(200).send({ message: "Successful!" });
          }
        })
        .catch((error) => {
            loggerPino.error(error);
            return res.status(500).send({ message: "Internal server error!" });
        });
    },
  ];

  exports.deleteServiceAsync = async (body) => {
    try {
      const result = await oneConnection
        .transaction({ autocommit: true }, async function (t) {
          const service = await ServiceName.findOne(
            {
              where: { ID: body["serviceId"] },
            },
            { transaction: t }
          );
          if (!service) {
            throw new Error("There is no service with that ID!");
          }
          const serviceName = await ServiceName.destroy(
            {
              where: {
                ID: body["serviceId"],
              },
            },
            { transaction: t }
          );
          if (serviceName) {
            return { status: 200, message: "Successful!" };
          } else {
            throw new Error("Client error");
          }
        })
        .then((result) => {
          return result;
        })
        .catch((error) => {
          loggerPino.error(error);
          throw new Error(error);
        });
      return result;
    } catch (e) {
        loggerPino.error(e)
      const error = {
        status: 400,
        errorMessage: "Internal server error",
      };
      return error;
    }
  };

  exports.loadAssignedAttributes = [
    [
      check("id").isNumeric()
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).send({ errors: errors });
      }

      try {
        const result = await exports.loadAssignedAttributesHelper(req.query["id"]);
        return res.status(200).send({ message: "Successful!", result: result });
      } catch(error){
        loggerPino.error(error);
        return res.status(500).send({ message: "Internal server error!" });
      }
    },
  ];

  exports.loadAssignedAttributesHelper = async(id) =>{
    const attributes = await ServiceToServiceAttributes.findAll(
      {
        where : { SERVICE_ID : id },
        include : [{
          model: ServiceAttributes,
          required: true,
        }]
      }
    );
    let result = [];
    if(attributes && attributes.length > 0){
      for(const obj of attributes){
        result.push({
          id: obj["dataValues"]["ServiceAttribute"]["dataValues"]["ID"],
          name: obj["dataValues"]["ServiceAttribute"]["dataValues"]["NAME"]
        });
      }
    }
    return result;
  }

  exports.loadServiceAttributes = async (req, res) => {
      try {
        const attributes = await ServiceAttributes.findAll();
        let result = [];
        if(attributes && attributes.length > 0){
          for(const attribute of attributes){
            result.push({
              id: attribute["dataValues"]["ID"],
              name: attribute["dataValues"]["NAME"]
            })
          }
        }
        return res.status(200).send({ message: "Successful!", result: result });
      } catch(error){
        loggerPino.error(error);
        return res.status(500).send({ message: "Internal server error!" });
      }
  }

  exports.assigneAttributesToService = [
    [
      body("serviceId").trim(),
      check("serviceId").isNumeric(),
      body("attributeId").trim(),
      check("attributeId").isNumeric()
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).send({ message: errors });
      }

      try {
        const existingAttributes = await  exports.loadAssignedAttributesHelper(req.body["serviceId"]);
        const check = existingAttributes.find(attribute => attribute["id"] == req.body["attributeId"]);
        if(!check){
          await exports.assigneAttributesToServiceHelper(req.body);
          return res.status(200).send({ message: "Successfully created!" });
        } else {
          return res.status(400).send({ message: "Bad request!" });
        }
      } catch(error){
        loggerPino.error(error);
        return res.status(500).send({ message: "Internal server error!" });
      }
    },
  ];

  exports.assigneAttributesToServiceHelper = async(body) =>{
    const result = await oneConnection
    .transaction({ autocommit: true }, async function (t) {
      const serviceToServiceAttributes = await ServiceToServiceAttributes.create({
        SERVICE_ID: body["serviceId"],
        SERVICE_ATTRIBUTE_ID: body["attributeId"]
      }, { transaction: t });
      return serviceToServiceAttributes;
    });
    return result;
  }

  exports.deleteAssignedAttributesToService = [
    [
      check("serviceId").isNumeric(),
      check("attributeId").isNumeric()
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).send({ message: errors });
      }

      try {
        await exports.deleteAssignedAttributesToServiceHelper(req.query);
        return res.status(200).send({ message: "Successfully deleted!" });
      } catch(error){
        loggerPino.error(error);
        return res.status(500).send({ message: "Internal server error!" });
      }
    },
  ];

  exports.deleteAssignedAttributesToServiceHelper = async(query) =>{
    const result = await oneConnection
    .transaction({ autocommit: true }, async function (t) {
      const serviceToServiceAttributes = await ServiceToServiceAttributes.destroy({
        where : {
          SERVICE_ID: query["serviceId"],
          SERVICE_ATTRIBUTE_ID: query["attributeId"]
        }
      }, { transaction: t });
      return serviceToServiceAttributes;
    });
    return result;
  }
