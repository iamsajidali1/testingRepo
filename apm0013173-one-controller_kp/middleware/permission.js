const constants = require("../api/constants");
const loggerPino = require("../api/helpers/loggerHelper");

/**
 * Check permissions for slected user on service, customer and actionTemplate
 * @param {Request} req request
 * @param {Response} res response
 * @param {function} next next fn
 */
exports.permission = async(req, res, next) => {
    const {
        checkGroupId,
        checkPermissionForGroupToServiceToCustomer,
        checkPermissionForGroupToActionTemplate,
        checkPermissionForGroupToService,
        checkIdividualpersmissionForServiceToCustomer,
        checkIdividualpersmissionForService,
        checkIdividualpersmissionForTemplate,
        checkUserId,
        checkRouteForOneCreator
    } = exports;
    const upmLevels = req.upmIdLevels;
    let customerId;
    if(req["ebizCompanyId"]){
    customerId = await exports.findCustomerId(req["ebizCompanyId"]);
    } else {
        customerId = req.query.customerId;
    }

    const serviceId = req.query.serviceId;
    const actionId = req.query.actionId;
    let permissionGranted = false;

    const type = req.headers[constants.header_one_type];

    if(!(type === constants.one_type)){
        req.body.actionData = null;
        req.body.permissionGranted = false;
        // add check for one creator routes
        const checkRoute = await checkRouteForOneCreator(req.path, req.method);
        if(checkRoute){
            if(upmLevels){
                for(key of Object.keys(upmLevels)){
                    if (
                      upmLevels[key]["levelName"] ===
                        constants.one_level_admin ||
                      upmLevels[key]["levelName"] === constants.one_level_le ||
                      upmLevels[key]["levelName"] === constants.one_level_bvioip || 
                      upmLevels[key]["levelName"] === constants.one_level_true_north
                    ) {
                      return next();
                    }
                };
            }
            // if is not set any levels or not have ADMIN or LE level
            return res.status(401).send("Not authorized!");
        } else {
            return next();
        }
    }

    try{
        // if the data for selected sessionId has not been set check permission for this action
        if(req.path === constants.transaction_path){
            /**
             * first check group permission - user levels from upm
             * check on table roles_to_service_to_customer then role_to_service
             * and then on role_to_template
             */
            if(upmLevels){
                for(key of Object.keys(upmLevels)){
                    const groupId = await checkGroupId(upmLevels[key]["levelName"]);
                    console.log('Setting UPM groupId: ', groupId);
                    permissionGranted = await checkPermissionForGroupToServiceToCustomer(actionId, customerId, serviceId, groupId);
                    console.log('Perm Result checkPermissionForGroupToServiceToCustomer', permissionGranted);
                    if(permissionGranted){
                        break;
                    }
                    permissionGranted = await checkPermissionForGroupToService(actionId, serviceId, groupId);
                    console.log('Perm Result checkPermissionForGroupToService', permissionGranted);
                    if(permissionGranted){
                        break;
                    }
                    permissionGranted = await checkPermissionForGroupToActionTemplate(actionId,groupId);
                    console.log('Perm Result checkPermissionForGroupToActionTemplate', permissionGranted);
                    if(permissionGranted){
                        break;
                    }
                };
            }

            /**
             * If permission is not still granted do second check individual permission
             * check on table users_to_service_to_customer then users_to_service and
             * then on users_to_template
            */
            if(!permissionGranted){
                const userId = await checkUserId(req.user, req.isBcUser);
                if(userId){
                    permissionGranted = await checkIdividualpersmissionForServiceToCustomer(userId, actionId, customerId, serviceId);
                    console.log('Perm Result checkIdividualpersmissionForServiceToCustomer', permissionGranted);                   
                    if(!permissionGranted){
                        permissionGranted = await checkIdividualpersmissionForService(userId, actionId, serviceId);
                        console.log('Perm Result checkIdividualpersmissionForService', permissionGranted);
                        if(!permissionGranted){
                            console.log('Perm Result checkIdividualpersmissionForTemplate', permissionGranted);
                            permissionGranted = await checkIdividualpersmissionForTemplate(userId, actionId);
                        }
                    }
                }
            }

            if(permissionGranted){
                req.body.permissionGranted = permissionGranted;
                return next();
            } else {
                return res.status(401).send({ message : "This action is unauthorized!" });
            }
        } else {
            req.body.permissionGranted = false;
            return next();
        }
    } catch(error){
        loggerPino.error(error);
        return res.status(500).send({ message : "Internal server error!" });
    }
}

// check group id on db
exports.checkGroupId = async(group) => {
    require("../api/models/databaseOne").Database.getInstance();
    const { Roles } = require("../api/models/rolesModel");
    const role = await Roles.findOne(
        {
            where : { IDENTIFICATOR : group }
        }
    );
    if(role && role["dataValues"]){
        return role["dataValues"]["ID"];
    } else {
        return null;
    }
}

// check service to customer id
exports.checkServiceToCustomerId = async(customerId, serviceId) =>{
    require("../api/models/databaseOne").Database.getInstance();
    const { ServiceToCustomer } = require("../api/models/serviceToCustomerModel");
    const serviceToCustomer = await ServiceToCustomer.findOne(
        {
            where : { CUSTOMER_ID : customerId, SERVICE_ID : serviceId }
        }
    );
    if(serviceToCustomer && serviceToCustomer["dataValues"]){
        return serviceToCustomer["dataValues"]["ID"];
    } else {
        return null;
    }
}

// check permission for selected group for role to service to customer table
exports.checkPermissionForGroupToServiceToCustomer = async(actionTemplateId, customerId, serviceId, groupId) => {
    const {
        checkServiceToCustomerId,
        checkActionTemplateRelationToServiceToCustomer
    } = exports;
    const serviceToCustomerId = await checkServiceToCustomerId(customerId, serviceId);
    if(serviceToCustomerId){
        const actionTemplateToServiceToCustomer =
        await checkActionTemplateRelationToServiceToCustomer(actionTemplateId, serviceToCustomerId);
        require("../api/models/databaseOne").Database.getInstance();
        const { RoleToServiceToCustomer } = require("../api/models/roleToServiceToCustomerModel");
        const roleToServiceToCustomer = await RoleToServiceToCustomer.findOne(
            {
                where : {
                    SERVICE_TO_CUSTOMER_ID : serviceToCustomerId,
                    ROLE_ID : groupId
                }
            }
        );
        if(roleToServiceToCustomer && roleToServiceToCustomer["dataValues"]
            && roleToServiceToCustomer["dataValues"]["ID"] && actionTemplateToServiceToCustomer){
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
}

// check permission for selected group for role to template table
exports.checkPermissionForGroupToActionTemplate = async(actionTemplateId, groupId) => {
    require("../api/models/databaseOne").Database.getInstance();
    const { RoleTemplates } = require("../api/models/roleTemplates");
    const roleTemplates = await RoleTemplates.findOne(
        {
            where : {
                TEMPLATE_ID : actionTemplateId,
                ROLE_ID : groupId
            }
        }
    );
    if(roleTemplates && roleTemplates["dataValues"]
        && roleTemplates["dataValues"]["ID"]){
        return true;
    } else {
        return false;
    }
}

// check permission for selected group for role to service table
exports.checkPermissionForGroupToService = async(actionTemplateId, serviceId, groupId) => {
    const {
        checkActionTemplateRelationToService
    } = exports;
    const actionTemplateToService = await checkActionTemplateRelationToService(actionTemplateId, serviceId);
    if(actionTemplateToService){
        require("../api/models/databaseOne").Database.getInstance();
        const { RoleToService } = require("../api/models/roleToServiceModel");
        const roleToService = await RoleToService.findOne(
            {
                where : {
                    ROLE_ID : groupId,
                    SERVICE_ID : serviceId
                }
            }
        );
        if(roleToService && roleToService["dataValues"]
        && roleToService["dataValues"]["ID"]){
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
}

// check individual user permission for service to customer
exports.checkIdividualpersmissionForServiceToCustomer = async(userId, actionTemplateId, customerId, serviceId) =>{
    const {
        checkServiceToCustomerId,
        checkActionTemplateRelationToServiceToCustomer
    } = exports;
    const serviceToCustomerId = await checkServiceToCustomerId(customerId, serviceId);
    if(serviceToCustomerId){
        const actionTemplateToServiceToCustomer =
        await checkActionTemplateRelationToServiceToCustomer(actionTemplateId, serviceToCustomerId);
        require("../api/models/databaseOne").Database.getInstance();
        const { UserToServiceToCustomer } = require("../api/models/userToServiceToCustomerModel");
        const usersToServiceToCustomer = await UserToServiceToCustomer.findOne(
            {
                where : {
                    USER_ID : userId,
                    SERVICE_TO_CUSTOMER_ID : serviceToCustomerId
                }
            }
        );
        if(usersToServiceToCustomer && usersToServiceToCustomer["dataValues"]
            && usersToServiceToCustomer["dataValues"]["ID"] && actionTemplateToServiceToCustomer){
            return true;
        } else {
            return false;
        }

    } else {
        return false;
    }
}

// check individual user permission for service
exports.checkIdividualpersmissionForService = async(userId, actionTemplateId, serviceId) =>{
    const {
        checkActionTemplateRelationToService
    } = exports;
    const actionTemplateToService = await checkActionTemplateRelationToService(actionTemplateId, serviceId);
    if(actionTemplateToService){
        require("../api/models/databaseOne").Database.getInstance();
        const { UserToService } = require("../api/models/userToServiceModel");
        const userToService = await UserToService.findOne(
            {
                where : {
                    USER_ID : userId,
                    SERVICE_ID : serviceId
                }
            }
        );
        if(userToService && userToService["dataValues"]
            && userToService["dataValues"]["ID"]){
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
}

// check individual user permission for template
exports.checkIdividualpersmissionForTemplate = async(userId, actionTemplateId) =>{
    require("../api/models/databaseOne").Database.getInstance();
    const { UsersTemplate } = require("../api/models/usersTemplateModel");
    const usersTemplate = await UsersTemplate.findOne(
        {
            where : {
                USER_ID : userId,
                TEMPLATE_ID : actionTemplateId
            }
        }
    );
    if(usersTemplate && usersTemplate["dataValues"]
        && usersTemplate["dataValues"]["ID"]){
        return true;
    } else {
        return false;
    }
}

// load user id for specifi attuid or bc id
exports.checkUserId = async(userId, userType) =>{
    require("../api/models/databaseOne").Database.getInstance();
    const { Users } = require("../api/models/usersModel");
    let user = null;
    if(userType){
        user = await Users.findOne(
            {
                where : { BC_USER_ID : userId }
            }
        );
    } else {
        user = await Users.findOne(
            {
                where : { ATTUID : userId }
            }
        );
    }
    if(user && user["dataValues"]){
        return user["dataValues"]["ID"];
    } else {
        return null;
    }
}

// check relationship between action template and service to customer
exports.checkActionTemplateRelationToServiceToCustomer = async(actionTemplateId, serviceToCustomerId) =>{
    require("../api/models/databaseOne").Database.getInstance();
    const { TemplateToServiceToCustomer } = require("../api/models/templateToServiceToCustomerModel");
    const templateToServiceToCustomer = await TemplateToServiceToCustomer.findOne(
        {
            where : {
                TEMPLATE_ID : actionTemplateId,
                SERVICE_TO_CUSTOMER_ID : serviceToCustomerId
            }
        }
    );
    if(templateToServiceToCustomer && templateToServiceToCustomer["dataValues"]
        && templateToServiceToCustomer["dataValues"]["ID"]){
        return true;
    } else {
        return false;
    }
}

// check relationship between action template and service to
exports.checkActionTemplateRelationToService = async(actionTemplateId, serviceId) =>{
    require("../api/models/databaseOne").Database.getInstance();
    const { TemplateToService } = require("../api/models/templateToServiceModel");
    const templateToService = await TemplateToService.findOne(
        {
            where : {
                TEMPLATE_ID : actionTemplateId,
                SERVICE_ID : serviceId
            }
        }
    );
    if(templateToService && templateToService["dataValues"]
        && templateToService["dataValues"]["ID"]){
        return true;
    } else {
        return false;
    }
}

// check route for one - (creator)
exports.checkRouteForOneCreator = async(route, method) =>{
    require("../api/models/databaseOne").Database.getInstance();
    const { RouteAction } = require("../api/models/routeActionModel");
    const routeAction = await RouteAction.findOne(
        {
            where : {
                ROUTE : route,
                TYPE : constants.creator_request_type,
                METHOD : method
            }
        }
    );
    if(routeAction && routeAction["dataValues"]
        && routeAction["dataValues"]["ID"]){
        return true;
    } else {
        return false;
    }
}


exports.findCustomerId = async (ebizCompanyId) => {
  const { Customers } = require("../api/models/customerOneModel");
  try {
    const customer = await Customers.findOne({
      where: { BC_COMPANY_ID: ebizCompanyId },
    });
    if (customer) {
      return customer["dataValues"]["ID"];
    } else {
      return -1;
    }
  } catch (error) {
    loggerPino.error(error);
    return -1;
  }
};
