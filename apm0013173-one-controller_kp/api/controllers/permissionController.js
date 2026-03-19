const { Users } = require("../models/usersModel");
const { UsersTemplate } = require("../models/usersTemplateModel");
const { Templates } = require("../models/templatesDataModel");
const { Roles } = require("../models/rolesModel");
const { RoleTemplates } = require("../models/roleTemplates");
const { UserToServiceToCustomer } = require("../models/userToServiceToCustomerModel");
const { ServiceToCustomer } = require("../models/serviceToCustomerModel");
const { RoleToServiceToCustomer } = require("../models/roleToServiceToCustomerModel");
const { RoleToService } = require("../models/roleToServiceModel");
const { UserToService } = require("../models/userToServiceModel");
const sequelize = require("sequelize");
const { Op } = require("sequelize");
const { check, validationResult, body, query } = require("express-validator");
const oneConnection = require("../models/databaseOne").Database.getInstance();
const loggerPino = require("../helpers/loggerHelper");
const { ServiceName } = require("../models/serviceNameModel");

exports.assignTemplateToUser = [[
    body("userId").trim(),
    check("userId").isNumeric(),
    body("templateId").trim(),
    check("templateId").isNumeric(),
], async(req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).send({ message: errors });
    }
    try{
      const result = await exports.assignTemplateToUserAsync(req.body);
      if(result["message"] == "Client error!" || result["message"] == "Relation is already in database"){
        return res.status(400).send({ message: "Client error!" });
      } else {
        return res.status(200).send({ result: result, message: "Successful!" });
      }
    } catch(error){
      loggerPino.error(error);
      return res.status(500).send({ message: "Internal server error!" });
    }
}];

exports.assignTemplateToUserAsync = async (body) =>{
  try {
    const result = await oneConnection.transaction({autocommit: true}, async function (t) {
      const template = await Templates.findOne({
        where : { ID: body["templateId"] }
      }, { transaction: t});
      if(!template["dataValues"]["ID"]){
        return { dataValues : { message : "There is no existig template with that ID !" }};
      }

      const user = await Users.findOne({
        where : { ID: body["userId"] }
      }, { transaction: t});
      if(!user["dataValues"]["ID"]){
        return { dataValues : { message : "There is no existig user with that ID !" }};
      }

      const templateToUser = await UsersTemplate.findOne({
        where: {
          TEMPLATE_ID: body["templateId"],
          USER_ID: body["userId"]
        }
      },{ transaction: t});
      if(templateToUser !== null){
        return { dataValues: { message: "Relation is already in database" }}
      } else {
        const userTemplate = await UsersTemplate.create( {
          USER_ID : body["userId"],
          TEMPLATE_ID : body["templateId"]
        }, { transaction: t});
        return userTemplate;
      }
    }).then(function (result) {
      return result.dataValues;
    }).catch(function (error) {
      loggerPino.error(error);
      throw error;
    });
    return result;
  } catch(error){
    loggerPino.error(error);
    throw error;
  }
}

exports.assignTemplateToRole = [[
    body("roleId").trim(),
    check("roleId").isNumeric(),
    body("templateId").trim(),
    check("templateId").isNumeric(),
], async(req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).send({ message: errors});
    }
    try {
      const result = await exports.assignTemplateToRoleAsync(req.body);
      if(result["message"] == "Client error!" || result["message"] == "Relation is already in database"){
        return res.status(400).send({ message: "Client error!"});
      } else {
        return res.status(200).send({ result: result, message: "Successful!"});
      }
    } catch (error){
      loggerPino.error(error);
      return res.status(500).send({ message: "Internal server error!" });
    }
}];

exports.assignTemplateToRoleAsync = async(body) =>{
    try {
      const result = await oneConnection.transaction({autocommit: true}, async function (t) {
        const template = await Templates.findOne({
          where : { ID: body["templateId"] }
        }, { transaction: t});
        if(!template["dataValues"]["ID"]){
          return { dataValues : { message : "There is no existig template with that ID !" }};
        }

        const role = await Roles.findOne({
          where : { ID: body["roleId"] }
        }, { transaction: t});
        if(!role["dataValues"]["ID"]){
          return { dataValues : { message : "There is no existig role with that ID !" }};
        }

        const roleTemplates = await RoleTemplates.findOne({
            where: {
              TEMPLATE_ID: body["templateId"],
              ROLE_ID: body["roleId"]
            }
        },{ transaction: t});
        if(roleTemplates !== null){
          return { dataValues: { message: "Relation is already in database" }}
        } else {
          const roleTemplates = await RoleTemplates.create( {
            ROLE_ID : body["roleId"],
            TEMPLATE_ID : body["templateId"]
          }, { transaction: t});
          return roleTemplates;
        }
      }).then(function (result) {
        return result.dataValues;
      }).catch(function (error) {
        loggerPino.error(error);
        throw error;
      });
      return result;
    } catch(error){
      loggerPino.error(error);
      throw error;
    }
}

exports.assignTemplateToBcUser = [[
    body("userId").trim(),
    check("userId").isNumeric(),
    body("templateId").trim(),
    check("templateId").isNumeric(),
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors : errors });
    }
    exports.assignTemplateToUserAsync(req.body).then(result => {
        if(result["message"] == "Client error!" || result["message"] == "Relation is already in database"){
            return res.status(400).send({ message: "Client error!"});
        } else {
            return res.status(200).send({ result: result, message: "Successful!"});
        }
    }).catch(error => {
        loggerPino.error(error);
        return res.status(500).send({ message: "Internal server error!" });
    });
}];

exports.deletePermissionTemplateToRole = [[
    check("templateId").isNumeric(),
    check("roleId").isNumeric()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors })
    } else {
        exports.deletePermissionTemplateToRoleAsync(req.query).then(result => {
            return res.status(200).send({ message: result.message });
        }).catch(error => {
            loggerPino.error(error);
            return res.status(500).send({ message: "Internal server error!", errorId: "" });
        });
    }
}];

exports.deletePermissionTemplateToRoleAsync = async (query) =>{
    const result = await oneConnection.transaction({ autocommit: true }, async function (t) {
        await RoleTemplates.destroy({
            where: {
                ROLE_ID: query["roleId"],
                TEMPLATE_ID: query["templateId"]
            }
        }, { transaction: t });
        return { message: "Successful!" };
    });
    return result;
}

exports.deletePermissionTemplateToUser = [[
    check("templateId").isNumeric(),
    check("userId").isNumeric()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors });
    } else {
        exports.deletePermissionTemplateToUserAsync(req.query).then(result => {
            return res.status(200).send({ message: result.message });
        }).catch(error => {
            loggerPino.error(error);
            return res.status(500).send({ message: "Internal server error!", errorId: "" });
        });
    }
}];

exports.deletePermissionTemplateToUserAsync = async (query) =>{
    const result = await oneConnection.transaction({ autocommit: true }, async function (t) {
        await UsersTemplate.destroy({
            where: {
                USER_ID: query["userId"],
                TEMPLATE_ID: query["templateId"]
            }
        }, { transaction: t });
        return { message: "Successful!" };
    });
    return result;
}

exports.deletePermissionTemplateToBcUser = [[
    check("templateId").isNumeric(),
    check("userId").isNumeric()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors });
    } else {
        exports.deletePermissionTemplateToUserAsync(req.query).then(result => {
            return res.status(200).send({ message: result.message });
        }).catch(error => {
            loggerPino.error(error);
            return res.status(500).send({ message: "Internal server error!", errorId: "" });
        });
    }
}];

exports.getRoleToTemplate = [[
  query("templateId").trim(),
  check("templateId").isLength({min:1, max:6}),
], async(req, res) =>{
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors })
  }
  const response = await RoleTemplates.findAll({
    where: {
      TEMPLATE_ID: req.query["templateId"]
    },
    include:[{
      model: Roles
    }]
  }).catch(error =>{
    loggerPino.error(error);
    return res.status(500).json({ message: "Database error" });
  });
  const results = []
  if(response){
    response.forEach(result=>{
      results.push({
        ID: result["dataValues"]["Role"]["dataValues"]["ID"],
        IDENTIFICATOR: result["dataValues"]["Role"]["dataValues"]["IDENTIFICATOR"]
      })
    });
  }
  return res.status(200).json(results);
}];

exports.getUserToTemplate = [[
  query("templateId").trim(),
  check("templateId").isLength({min:1, max:6}),
], async(req, res) =>{
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors });
  }
  const response = await UsersTemplate.findAll({
    where: {
      TEMPLATE_ID: req.query["templateId"]
    },
    include:[{
      model: Users
    }]
  }).catch(error =>{
    loggerPino.error(error);
    return res.status(500).json({ message: "Database error" });
  });
  const results = [];
  if(response){
    response.forEach(result=>{
      if(result["dataValues"]["User"]["dataValues"]["ATTUID"] != null){
        results.push({
          ID: result["dataValues"]["User"]["dataValues"]["ID"],
          NAME: result["dataValues"]["User"]["dataValues"]["NAME"],
          ATTUID: result["dataValues"]["User"]["dataValues"]["ATTUID"],
          BC_USER_ID: result["dataValues"]["User"]["dataValues"]["BC_USER_ID"]
        });
      }
    });
  }
  return res.status(200).json(results);
}];

exports.getBcUsersToTemplate = [[
    query("templateId").isNumeric()
], (req, res) =>{
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors });
    }
    UsersTemplate.findAll({
        where: {
            TEMPLATE_ID: req.query["templateId"]
        },
        include:[{
            model: Users
        }]
    }).then((response) => {
        const results = [];
        response.forEach(result => {
            if(result["dataValues"]["User"]["dataValues"]["BC_USER_ID"] != null){
                results.push(result["dataValues"]["User"]["dataValues"]);
            }
        });
        return res.status(200).send(results);
    }).catch(error =>{
        loggerPino.error(error);
        return res.status(500).send({message: "Internal server error!"});
    });
}];

exports.assignePermissionForUser = [[
    check("customerId").isNumeric(),
    check("serviceId").isNumeric(),
    check("userId").isNumeric()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors });
    } else {
        exports.assignePermissionForUserAsync(req.body).then(result => {
            if(result.id == 1){
                return res.status(200).send({ message: "Successful!", result: result.result });
            } else if(result.id == 2){
                return res.status(400).send({ message: "Bad request!" });
            }
        }).catch(error => {
            loggerPino.error(error);
            return res.status(500).send({ message: "Internal server error!", errorId: "" });
        });
    }
}];

exports.assignePermissionForUserAsync = async (body) => {
    const result = await oneConnection.transaction({ autocommit: true }, async function (t) {
        const serviceToCustomer = await ServiceToCustomer.findOne({
            where: {
                CUSTOMER_ID: body["customerId"],
                SERVICE_ID: body["serviceId"]
            }
        }, { transaction: t });
        if(serviceToCustomer && serviceToCustomer.dataValues){
            const userToServiceToCustomerSearch = await UserToServiceToCustomer.findOne({
                where: {
                    USER_ID: body["userId"],
                    SERVICE_TO_CUSTOMER_ID: serviceToCustomer.dataValues["ID"]
                }
            }, { transaction: t });
            if(!(userToServiceToCustomerSearch)){
                const userToServiceToCustomer = await UserToServiceToCustomer.create({
                    USER_ID: body["userId"],
                    SERVICE_TO_CUSTOMER_ID: serviceToCustomer.dataValues["ID"]
                }, { transaction: t });
                if(userToServiceToCustomer.dataValues){
                    return {
                        message: "Successful", id: 1, result: {
                            userId: body["userId"],
                            perId: userToServiceToCustomer.dataValues["ID"]
                        }
                    };
                }
            } else {
                return {
                    message: "Bad request!", id: 2
                };
            }
        } else {
            return {
                message: "Bad request!", id: 2
            };
        }
    }).then(function (result) {
        return result;
    }).catch(function (error) {
        loggerPino.error(error);
        throw error;
    });
    return result;
}

exports.getUserForServiceAndCustomer = [[
    check("customerId").isNumeric(),
    check("serviceId").isNumeric()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors })
    } else {
        exports.getUserForServiceAndCustomerAsync(req.query).then(result => {
            if(result.id == 1){
                return res.status(200).send({ message: "Successful!", result: result.result });
            } else if(result.id == 2){
                return res.status(400).send({ message: "Bad request!" });
            }
        }).catch(error => {
            loggerPino.error(error);
            return res.status(500).send({ message: "Internal server error!", errorId: "" });
        });
    }
}];

exports.getUserForServiceAndCustomerAsync = async (query) =>{
    try {
        const serviceToCustomer = await ServiceToCustomer.findOne({
            where: {
                CUSTOMER_ID: query["customerId"],
                SERVICE_ID: query["serviceId"]
            }
        });
        if(serviceToCustomer && serviceToCustomer.dataValues){
            const userToServiceToCustomer = await UserToServiceToCustomer.findAll({
                where : {
                    SERVICE_TO_CUSTOMER_ID: serviceToCustomer.dataValues["ID"]
                }
            });
            if(userToServiceToCustomer){
                users = [];
                for(data of userToServiceToCustomer){
                    const user = await Users.findOne({
                        where: {
                            ID: data.dataValues["USER_ID"],
                            BC_USER_ID: {
                                [Op.eq]: null
                            }
                        }
                    });
                    if(user){
                        users.push(user.dataValues);
                    }
                };
                return {
                    message: "Successful", id: 1, result: users
                };
            } else {
                return {
                    message: "Bad request!", id: 2
                };
            }
        } else {
            return {
                message: "Successful", id: 1, result: []
            };
        }
    } catch (error) {
        loggerPino.error(error);
        throw error;
    }
}

exports.deletePermissionForUser = [[
    check("customerId").isNumeric(),
    check("serviceId").isNumeric(),
    check("userId").isNumeric()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors })
    } else {
        exports.deletePermissionForUserAsync(req.query).then(result => {
            if(result.id == 1){
                return res.status(200).send({ message: "Successful!" });
            } else if(result.id == 2){
                return res.status(400).send({ message: result.message });
            }
        }).catch(error => {
            loggerPino.error(error);
            return res.status(500).send({ message: "Internal server error!", errorId: "" });
        });
    }
}];

exports.deletePermissionForUserAsync = async (query) =>{
    const result = await oneConnection.transaction({ autocommit: true }, async function (t) {
        const serviceToCustomer = await ServiceToCustomer.findOne({
            where: {
                CUSTOMER_ID: query["customerId"],
                SERVICE_ID: query["serviceId"]
            }
        }, { transaction: t });
        if(serviceToCustomer && serviceToCustomer.dataValues){
            const userToServiceToCustomer = await UserToServiceToCustomer.destroy({
                where: {
                    USER_ID: query["userId"],
                    SERVICE_TO_CUSTOMER_ID: serviceToCustomer.dataValues["ID"]
                }
            }, { transaction: t });
            if (userToServiceToCustomer) {
                return { message: "Successful!", id: 1 };
            } else {
                return { message: "Client error!", id: 2 };
            }
        } else {
            return { message: "Bad request!", id: 2 };
        }
    }).then(function (result) {
        return result;
    }).catch(function (error) {
        loggerPino.error(error);
        throw error;
    });
    return result;
}

exports.assignePermissionForRole = [[
    check("customerId").isNumeric(),
    check("serviceId").isNumeric(),
    check("roleId").isNumeric()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors })
    } else {
        exports.assignePermissionForRoleAsync(req.body).then(result => {
            if(result.id == 1){
                return res.status(200).send({ message: "Successful!", result: result.result });
            } else if(result.id == 2){
                return res.status(400).send({ message: "Bad request!" });
            }
        }).catch(error => {
            loggerPino.error(error);
            return res.status(500).send({ message: "Internal server error!", errorId: "" });
        });
    }
}];

exports.assignePermissionForRoleAsync = async (body) =>{
    const result = await oneConnection.transaction({ autocommit: true }, async function (t) {
        const serviceToCustomer = await ServiceToCustomer.findOne({
            where: {
                CUSTOMER_ID: body["customerId"],
                SERVICE_ID: body["serviceId"]
            }
        }, { transaction: t });
        if(serviceToCustomer && serviceToCustomer.dataValues){
            const roleToServiceToCustomerSearch = await RoleToServiceToCustomer.findOne({
                where: {
                    ROLE_ID: body["roleId"],
                    SERVICE_TO_CUSTOMER_ID: serviceToCustomer.dataValues["ID"]
                }
            }, { transaction: t });
            if(!(roleToServiceToCustomerSearch)){
                const roleToServiceToCustomer = await RoleToServiceToCustomer.create({
                    ROLE_ID: body["roleId"],
                    SERVICE_TO_CUSTOMER_ID: serviceToCustomer.dataValues["ID"]
                }, { transaction: t });
                if(roleToServiceToCustomer.dataValues){
                    return {
                        message: "Successful", id: 1, result: {
                            roleId: body["roleId"],
                            perId: roleToServiceToCustomer.dataValues["ID"]
                        }
                    };
                }
            } else {
                return {
                    message: "Bad request!", id: 2
                };
            }
        } else {
            return {
                message: "Bad request!", id: 2
            };
        }
    }).then(function (result) {
        return result;
    }).catch(function (error) {
        loggerPino.error(error);
        throw error;
    });
    return result;
}

exports.getRolesForServiceAndCustomer = [[
    check("customerId").isNumeric(),
    check("serviceId").isNumeric()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors })
    } else {
        exports.getRolesForServiceAndCustomerAsync(req.query).then(result => {
            if(result.id == 1){
                return res.status(200).send({ message: "Successful!", result: result.result });
            } else if(result.id == 2){
                return res.status(400).send({ message: "Bad request!" });
            }
        }).catch(error => {
            loggerPino.error(error);
            return res.status(500).send({ message: "Internal server error!", errorId: "" });
        });
    }
}];

exports.getRolesForServiceAndCustomerAsync = async (query) =>{
    try {
        const serviceToCustomer = await ServiceToCustomer.findOne({
            where: {
                CUSTOMER_ID: query["customerId"],
                SERVICE_ID: query["serviceId"]
            }
        });
        if(serviceToCustomer && serviceToCustomer.dataValues){
            const roleToServiceToCustomer = await RoleToServiceToCustomer.findAll({
                where : {
                    SERVICE_TO_CUSTOMER_ID: serviceToCustomer.dataValues["ID"]
                }
            });
            if(roleToServiceToCustomer){
                roles = [];
                for(data of roleToServiceToCustomer){
                    const role = await Roles.findOne({
                        where: {
                            ID: data.dataValues["ROLE_ID"]
                        }
                    });
                    roles.push(role.dataValues);
                };
                return {
                    message: "Successful", id: 1, result: roles
                };
            } else {
                return {
                    message: "Bad request!", id: 2
                };
            }
        } else {
            return {
                message: "Successful", id: 1, result: []
            };
        }
    } catch (error) {
        loggerPino.error(error);
        throw error;
    }
}

exports.deletePermissionForRole = [[
    check("customerId").isNumeric(),
    check("serviceId").isNumeric(),
    check("roleId").isNumeric()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors })
    } else {
        exports.deletePermissionForRoleAsync(req.query).then(result => {
            if(result.id == 1){
                return res.status(200).send({ message: "Successful!" });
            } else if(result.id == 2){
                return res.status(400).send({ message: result.message });
            }
        }).catch(error => {
            loggerPino.error(error);
            return res.status(500).send({ message: "Internal server error!", errorId: "" });
        });
    }
}];

exports.deletePermissionForRoleAsync = async (query) =>{
    const result = await oneConnection.transaction({ autocommit: true }, async function (t) {
        const serviceToCustomer = await ServiceToCustomer.findOne({
            where: {
                CUSTOMER_ID: query["customerId"],
                SERVICE_ID: query["serviceId"]
            }
        }, { transaction: t });
        if(serviceToCustomer && serviceToCustomer.dataValues){
            const roleToServiceToCustomer = await RoleToServiceToCustomer.destroy({
                where: {
                    ROLE_ID: query["roleId"],
                    SERVICE_TO_CUSTOMER_ID: serviceToCustomer.dataValues["ID"]
                }
            }, { transaction: t });
            if (roleToServiceToCustomer) {
                return { message: "Successful!", id: 1 };
            } else {
                return { message: "Client error!", id: 2 };
            }
        } else {
            return { message: "Bad request!", id: 2 };
        }
    }).then(function (result) {
        return result;
    }).catch(function (error) {
        loggerPino.error(error);
        throw error;
    });
    return result;
}

exports.assignePermissionForBcUser = [[
    check("customerId").isNumeric(),
    check("serviceId").isNumeric(),
    check("userId").isNumeric()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors })
    } else {
        exports.assignePermissionForBcUserAsync(req.body).then(result => {
            if(result.id == 1){
                return res.status(200).send({ message: "Successful!", result: result.result });
            } else if(result.id == 2){
                return res.status(400).send({ message: "Bad request!" });
            }
        }).catch(error => {
            loggerPino.error(error);
            return res.status(500).send({ message: "Internal server error!", errorId: "" });
        });
    }
}];

exports.checkUserIdIfIsBcUser = async (userId) =>{
    const user = await Users.findOne({
        where: {
            ID: userId
        }
    });
    if(user && user.dataValues["BC_USER_ID"]){
        return true;
    } else {
        return false;
    }
}

exports.assignePermissionForBcUserAsync = async (body) =>{
    const result = await oneConnection.transaction({ autocommit: true }, async function (t) {
        const checkBcUser = await exports.checkUserIdIfIsBcUser(body["userId"]);
        if(checkBcUser){
            const serviceToCustomer = await ServiceToCustomer.findOne({
                where: {
                    CUSTOMER_ID: body["customerId"],
                    SERVICE_ID: body["serviceId"]
                }
            }, { transaction: t });
            if(serviceToCustomer && serviceToCustomer.dataValues){
                const userToServiceToCustomerSearch = await UserToServiceToCustomer.findOne({
                    where: {
                        USER_ID: body["userId"],
                        SERVICE_TO_CUSTOMER_ID: serviceToCustomer.dataValues["ID"]
                    }
                }, { transaction: t });
                if(!(userToServiceToCustomerSearch)){
                    const userToServiceToCustomer = await UserToServiceToCustomer.create({
                        USER_ID: body["userId"],
                        SERVICE_TO_CUSTOMER_ID: serviceToCustomer.dataValues["ID"]
                    }, { transaction: t });
                    if(userToServiceToCustomer.dataValues){
                        return {
                            message: "Successful", id: 1, result: {
                                userId: body["userId"],
                                perId: userToServiceToCustomer.dataValues["ID"]
                            }
                        };
                    }
                } else {
                    return {
                        message: "Bad request!", id: 2
                    };
                }
            } else {
                return {
                    message: "Bad request!", id: 2
                };
            }
        } else {
            return {
                message: "Bad request!", id: 2
            };
        }
    }).then(function (result) {
        return result;
    }).catch(function (error) {
        loggerPino.error(error);
        throw error;
    });
    return result;
}

exports.getBcUserForServiceAndCustomer = [[
    check("customerId").isNumeric(),
    check("serviceId").isNumeric()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors })
    } else {
        exports.getBcUserForServiceAndCustomerAsync(req.query).then(result => {
            if(result.id == 1){
                return res.status(200).send({ message: "Successful!", result: result.result });
            } else if(result.id == 2){
                return res.status(400).send({ message: "Bad request!" });
            }
        }).catch(error => {
            loggerPino.error(error);
            return res.status(500).send({ message: "Internal server error!", errorId: "" });
        });
    }
}];

exports.getBcUserForServiceAndCustomerAsync = async (query) =>{
    try {
        const serviceToCustomer = await ServiceToCustomer.findOne({
            where: {
                CUSTOMER_ID: query["customerId"],
                SERVICE_ID: query["serviceId"]
            }
        });
        if(serviceToCustomer && serviceToCustomer.dataValues){
            const userToServiceToCustomer = await UserToServiceToCustomer.findAll({
                where : {
                    SERVICE_TO_CUSTOMER_ID: serviceToCustomer.dataValues["ID"]
                }
            });
            if(userToServiceToCustomer){
                bcUsers = [];
                for(data of userToServiceToCustomer){
                    const bcUser = await Users.findOne({
                        where: {
                            ID: data.dataValues["USER_ID"]
                        }
                    });
                    if(bcUser.dataValues["BC_USER_ID"] != null){
                        bcUsers.push(bcUser.dataValues);
                    }
                };
                return {
                    message: "Successful", id: 1, result: bcUsers
                };
            } else {
                return {
                    message: "Bad request!", id: 2
                };
            }
        } else {
            return {
                message: "Successful", id: 1, result: []
            };
        }
    } catch (error) {
        loggerPino.error(error);
        throw error;
    }
}

exports.deletePermissionForBcUser = [[
    check("customerId").isNumeric(),
    check("serviceId").isNumeric(),
    check("userId").isNumeric()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors })
    } else {
        exports.deletePermissionForUserAsync(req.query).then(result => {
            if(result.id == 1){
                return res.status(200).send({ message: "Successful!" });
            } else if(result.id == 2){
                return res.status(400).send({ message: result.message });
            }
        }).catch(error => {
            loggerPino.error(error);
            return res.status(500).send({ message: "Internal server error!", errorId: "" });
        });
    }
}];

exports.assignServiceToUser = [
  [
    body("userId").trim(),
    check("userId").isNumeric(),
    body("serviceId").trim(),
    check("serviceId").isNumeric(),
  ],
 async(req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).send({ message: errors });
    }
      try{
      const result = await exports.assignServiceToUserAsync(req.body);
      if (result["message"] == "Client error!") {
        return res.status(400).send({ message: "Client error!" });
      } else {
        return res
          .status(200)
          .send({ result: result, message: "Successful!" });
      }
    } catch(error) {
        loggerPino.error(error);
        return res.status(500).send({ message: "Internal server error!" });
    }
  },
];

exports.assignServiceToUserAsync = async (body) => {
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
          throw new Error("There is no existing service with that ID !");
        }

        const user = await Users.findOne(
          {
            where: { ID: body["userId"] },
          },
          { transaction: t }
        );
        if (!user) {
          throw new Error("There is no existig user with that ID !");
        }

        const serviceToUser = await UserToService.findOne(
          {
            where: {
              SERVICE_ID: body["serviceId"],
              USER_ID: body["userId"],
            },
          },
          { transaction: t }
        );
        if (serviceToUser !== null) {
          throw new Error("Relation is already in database !");
        } else {
          const serviceToUser = await UserToService.create(
            {
              USER_ID: body["userId"],
              SERVICE_ID: body["serviceId"],
            },
            { transaction: t }
          );
          if (serviceToUser && serviceToUser.dataValues) {
            return {
              message: "Successful",
              id: 1,
              result: serviceToUser.dataValues,
            };
          }
        }
      })
      .then(function (result) {
        return result;
      })
      .catch(function (error) {
        loggerPino.error(error);
        throw error;
      });
    return result;
  } catch (e) {
    loggerPino.error(e);
    const error = {
      status: 400,
      errorMessage: "Internal server error",
    };
    return error;
  }
};

exports.assignServiceToRole = [
  [
    body("roleId").trim(),
    check("roleId").isNumeric(),
    body("serviceId").trim(),
    check("serviceId").isNumeric(),
  ],
  async(req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).send({ message: errors });
    }
      try {
      const result = await exports.assignServiceToRoleAsync(req.body);
      if (result["message"] == "Client error!") {
        return res.status(400).send({ message: "Client error!" });
      } else {
        return res
          .status(200)
          .send({ result: result, message: "Successful!" });
      }
    } catch(error){
      loggerPino.error(error);
      return res.status(500).send({ message: "Internal server error!" });
    }
  },
];

exports.assignServiceToRoleAsync = async (body) => {
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
          return {
            dataValues: {
              message: "There is no existig service with that ID !",
            },
          };
        }

        const role = await Roles.findOne(
          {
            where: { ID: body["roleId"] },
          },
          { transaction: t }
        );
        if (!role) {
          return {
            dataValues: { message: "There is no existig role with that ID !" },
          };
        }

        const roleService = await RoleToService.findOne(
          {
            where: {
              SERVICE_ID: body["serviceId"],
              ROLE_ID: body["roleId"],
            },
          },
          { transaction: t }
        );
        if (roleService !== null) {
          return { dataValues: { message: "Relation is already in database" } };
        } else {
          const roleToService = await RoleToService.create(
            {
              ROLE_ID: body["roleId"],
              SERVICE_ID: body["serviceId"],
            },
            { transaction: t }
          );
          if (roleToService && roleToService.dataValues) {
            return {
              message: "Successful!",
              id: 1,
              result: roleToService.dataValues,
            };
          }
        }
      })
      .then(function (result) {
        return result;
      })
      .catch(function (error) {
        loggerPino.error(error);
        throw error;
      });
    return result;
  } catch (e) {
    loggerPino.error(e);
    const error = {
      status: 400,
      errorMessage: "Internal server error",
    };
    return error;
  }
};

exports.deletePermissionForRoleToService = [
  [check("serviceId").isNumeric(), check("roleId").isNumeric()],
  async(req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors });
    } else {
        try{
       const result = await exports.deletePermissionForRoleToServiceAsync(req.query);
       if (result.id == 1) {
        return res
          .status(200)
          .send({ result: result, message: "Successful!" });
      } else if (result.id == 2) {
        return res.status(400).send({ message: result.message });
      }
      }
      catch(error){
        loggerPino.error(error);
        return res.status(500).send({ message: "Internal server error!" });
      }
    }
  },
];

exports.deletePermissionForRoleToServiceAsync = async (query) => {
  const result = await oneConnection
    .transaction({ autocommit: true }, async function (t) {
      const service = await ServiceName.findOne(
        {
          where: { ID: query["serviceId"] },
        },
        { transaction: t }
      );
      if (!service) {
        return { id: 2, message: "There is no existig service with that ID !" };
      }

      const role = await Roles.findOne(
        {
          where: { ID: query["roleId"] },
        },
        { transaction: t }
      );
      if (!role) {
        return { id: 2, message: "There is no existig role with that ID !" };
      }
      const roleService = await RoleToService.findOne(
        {
          where: {
            SERVICE_ID: query["serviceId"],
            ROLE_ID: query["roleId"],
          },
        },
        { transaction: t }
      );

      if (roleService == null) {
        return { id: 2, message: "Relation is not in database" };
      }

      const roleToService = await RoleToService.destroy(
        {
          where: {
            ROLE_ID: query["roleId"],
            SERVICE_ID: query["serviceId"],
          },
        },
        { transaction: t }
      );
      if (roleToService) {
        return { message: "Successful!", id: 1 };
      } else {
        return { message: "Client error!", id: 2 };
      }
    })
    .then(function (result) {
      return result;
    })
    .catch(function (error) {
      loggerPino.error(error);
      throw error;
    });
  return result;
};

exports.deletePermissionForUserToService = [
  [check("serviceId").isNumeric(), check("userId").isNumeric()],
  async(req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors });
    } else {
       try{
       const result = await exports.deletePermissionForUserToServiceAsync(req.query);
       if (result.id == 1) {
        return res
          .status(200)
          .send({ result: result, message: "Successful!" });
      } else if (result.id == 2) {
        return res.status(400).send({ message: result.message });
      }
      }
      catch(error){
        loggerPino.error(error);
        return res.status(500).send({ message: "Internal server error!" });
      }
    }
  },
];

exports.deletePermissionForUserToServiceAsync = async (query) => {
  const result = await oneConnection
    .transaction({ autocommit: true }, async function (t) {
      const service = await ServiceName.findOne(
        {
          where: { ID: query["serviceId"] },
        },
        { transaction: t }
      );
      if (!service) {
        return {
          id: 2,
          message: "There is no existig service with that ID !",
        };
      }

      const user = await Users.findOne(
        {
          where: { ID: query["userId"] },
        },
        { transaction: t }
      );
      if (!user) {
        return { id: 2, message: "There is no existig user with that ID !" };
      }

      const userToService = await UserToService.findOne(
        {
          where: {
            SERVICE_ID: query["serviceId"],
            USER_ID: query["userId"],
          },
        },
        { transaction: t }
      );
      if (userToService == null) {
        return { id: 2, message: "Relation is not in database" };
      }

      const userService = await UserToService.destroy(
        {
          where: {
            USER_ID: query["userId"],
            SERVICE_ID: query["serviceId"],
          },
        },
        { transaction: t }
      );
      if (userService) {
        return { message: "Successful!", id: 1 };
      } else {
        return { message: "Client error!", id: 2 };
      }
    })
    .then(function (result) {
      return result;
    })
    .catch(function (error) {
      loggerPino.error(error);
      throw error;
    });
  return result;
};

exports.assignServiceToBcUser = [
  [
    body("userId").trim(),
    check("userId").isNumeric(),
    body("serviceId").trim(),
    check("serviceId").isNumeric(),
  ],
  async(req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).send({ message: errors });
    }
    else{
     try{
     const result = await exports.assignServiceToBcUserAsync(req.body);
     if (result["message"] == "Client error!") {
      return res.status(400).send({ message: "Client error!" });
    } else {
      return res
        .status(200)
        .send({ result: result, message: "Successful!" });
    }
  } catch(error) {
    loggerPino.error(error);
    return res.status(500).send({ message: "Internal server error!" });
  }
    }
  },
];

exports.assignServiceToBcUserAsync = async (body) => {
  try {
    const result = await oneConnection
      .transaction({ autocommit: true }, async function (t) {
        const checkBcUser = await exports.checkUserIdIfIsBcUser(body["userId"]);
        if (checkBcUser) {
          const service = await ServiceName.findOne(
            {
              where: { ID: body["serviceId"] },
            },
            { transaction: t }
          );
          if (!service) {
            return {
              dataValues: {
                message: "There is no existig service with that ID !",
              },
            };
          }

          const user = await Users.findOne(
            {
              where: { ID: body["userId"] },
            },
            { transaction: t }
          );
          if (!user) {
            return {
              dataValues: {
                message: "There is no existig user with that ID !",
              },
            };
          }

          const serviceToUser = await UserToService.findOne(
            {
              where: {
                SERVICE_ID: body["serviceId"],
                USER_ID: body["userId"],
              },
            },
            { transaction: t }
          );
          if (serviceToUser !== null) {
            return {
              dataValues: { message: "Relation is already in database" },
            };
          } else {
            const serviceToUser = await UserToService.create(
              {
                USER_ID: body["userId"],
                SERVICE_ID: body["serviceId"],
              },
              { transaction: t }
            );
            if (serviceToUser && serviceToUser.dataValues) {
              return {
                message: "Successful!",
                id: 1,
                result: serviceToUser.dataValues,
              };
            }
          }
        }
      })
      .then(function (result) {
        return result;
      })
      .catch(function (error) {
        throw error;
      });
    return result;
  } catch (e) {
    loggerPino.error(e);
    const error = {
      status: 400,
      errorMessage: "Internal server error",
    };
    return error;
  }
};

exports.deletePermissionForBcUserToService = [
  [check("serviceId").isNumeric(), check("userId").isNumeric()],
  async(req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors });
    } else {
       try{
        const result = await exports.deletePermissionForUserToServiceAsync(req.query);
        if (result.id == 1) {
          return res.status(200).send({ id: 1, message: "Successful!" });
        } else if (result.id == 2) {
          return res.status(400).send({ message: result.message });
        }
       }
       catch(error){
        loggerPino.error(error);
        return res.status(500).send({ message: "Internal server error!" });
       }
    }
  },
];

exports.getUserForService = [
  [check("serviceId").isNumeric()],
  async(req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors });
    } else {
       try{
        const result = await exports.getUserForServiceAsync(req.query);
        if (result.id == 1) {
          return res
            .status(200)
            .send({ message: "Successful!", result: result.result });
        } else if (result.id == 2) {
          return res.status(400).send({ message: "Bad request!" });
        }
       } catch (error){
        loggerPino.error(error);
        return res.status(500).send({ message: "Internal server error!" });
       }
    }
  },
];

exports.getUserForServiceAsync = async (query) => {
  try {
    const service = await ServiceName.findOne({
      where: {
        ID: query["serviceId"],
      },
    });
    if (service && service.dataValues) {
      const userToService = await UserToService.findAll({
        where: {
          SERVICE_ID: query["serviceId"],
        },
      });
      if (userToService) {
        users = [];
        for (data of userToService) {
          const user = await Users.findOne({
            where: {
              ID: data.dataValues["USER_ID"],
              BC_USER_ID: {
                [Op.eq]: null,
              },
            },
          });
          if (user) {
            users.push(user.dataValues);
          }
        }
        return {
          message: "Successful",
          id: 1,
          result: users,
        };
      } else {
        return {
          message: "Bad request!",
          id: 2,
        };
      }
    } else {
      return {
        message: "Successful",
        id: 1,
        result: [],
      };
    }
  } catch (error) {
    loggerPino.error(error);
    throw error;
  }
};

exports.getRolesForService = [
  [check("serviceId").isNumeric()],
  async(req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors });
    } else {
       try{
        const result = await exports.getRolesForServiceAsync(req.query);
        if (result.id == 1) {
          return res
            .status(200)
            .send({ message: "Successful!", result: result.result });
        } else if (result.id == 2) {
          return res.status(400).send({ message: "Bad request!" });
        }
       } catch (error){
        loggerPino.error(error);
        return res.status(500).send({ message: "Internal server error!" });
       }
    }
  },
];

exports.getRolesForServiceAsync = async (query) => {
  try {
    const service = await ServiceName.findOne({
      where: {
        ID: query["serviceId"],
      },
    });
    if (service && service.dataValues) {
      const roleToService = await RoleToService.findAll({
        where: {
          SERVICE_ID: query["serviceId"],
        },
      });
      if (roleToService) {
        roles = [];
        for (data of roleToService) {
          const role = await Roles.findOne({
            where: {
              ID: data.dataValues["ROLE_ID"],
            },
          });
          roles.push(role.dataValues);
        }
        return {
          message: "Successful",
          id: 1,
          result: roles,
        };
      } else {
        return {
          message: "Bad request!",
          id: 2,
        };
      }
    } else {
      return {
        message: "Successful",
        id: 1,
        result: [],
      };
    }
  } catch (error) {
    loggerPino.error(error);
    throw error;
  }
};

exports.getBcUserForService = [
  [check("serviceId").isNumeric()],
  async(req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors });
    } else {
       try{
        const result = await exports.getBcUserForServiceAsync(req.query);
        if (result.id == 1) {
          return res
            .status(200)
            .send({ message: "Successful!", result: result.result });
        } else if (result.id == 2) {
          return res.status(400).send({ message: "Bad request!" });
        }
       } catch (error){
        loggerPino.error(error);
        return res.status(500).send({ message: "Internal server error!" });
       }
    }
  },
];

exports.getBcUserForServiceAsync = async (query) => {
  try {
    const service = await ServiceName.findOne({
      where: {
        ID: query["serviceId"],
      },
    });
    if (service && service.dataValues) {
      const userToService = await UserToService.findAll({
        where: {
          SERVICE_ID: query["serviceId"],
        },
      });
      if (userToService) {
        bcUsers = [];
        for (data of userToService) {
          const bcUser = await Users.findOne({
            where: {
              ID: data.dataValues["USER_ID"],
            },
          });
          if (bcUser.dataValues["BC_USER_ID"] != null) {
            bcUsers.push(bcUser.dataValues);
          }
        }
        return {
          message: "Successful",
          id: 1,
          result: bcUsers,
        };
      } else {
        return {
          message: "Bad request!",
          id: 2,
        };
      }
    } else {
      return { message: "Successful", id: 1, result: [] };
    }
  } catch (error) {
    loggerPino.error(error);
    throw error;
  }
};
