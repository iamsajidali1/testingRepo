/* eslint-disable max-lines-per-function, max-statements, max-lines, max-len */
/*
 * TODO: move everything to dedicated logical modules, pass app reference,
 * import and call a function e.g. addActionRoutes(app) => app.route().get()
 */
const { addDummyRoutes } = require("./routesDummy.js");
const { addUtilsRoutes } = require("./routesUtils.js");

module.exports = (app) => {
    const cArcheController = require("../controllers/cArcheController");
    const treeNodesController = require("../controllers/treeNodesController");
    const cTContentTypesController = require("../controllers/cTContentTypesController");
    const cTTypesController = require("../controllers/cTTypesController");
    const cTVendorTypesController = require("../controllers/cTVendorTypesController");
    const customerController = require("../controllers/customerController");
    const serviceController = require("../controllers/serviceController");
    const actionTemplateController = require("../controllers/actionTemplateController");
    const workflowController = require("../controllers/workflowController");
    const mcapController = require("../controllers/mcapController");
    const schedulerController = require("../controllers/schedulerController");
    const userServiceController = require("../controllers/userServiceController");
    const usersController = require("../controllers/usersController");
    const ocsController = require("../controllers/ocsController");
    const permissionController = require("../controllers/permissionController");
    const rolesController = require("../controllers/rolesController");
    const paperPlaneController = require("../controllers/paperPlaneController");
    const ochestratorController = require("../controllers/orchestratorController");
    const veloWraptorController = require("../controllers/velowraptorController");
    const mdsController = require("../controllers/mdsController");
    const reportDataController = require("../controllers/reportDataController");
    const dataCollectionController = require("../controllers/dataCollectionController");
    const loggingController = require("../controllers/loggingController");
    const lanMigrationController = require("../controllers/lanMigrationController");
    const componentsController = require("../controllers/componentsController");
    const rbacController = require("../controllers/rbacController");
    const cacheDevicesController = require("../controllers/cacheDevicesController");
    const changeRequestController = require("../controllers/changeRequestController");
    const guiController = require("../controllers/guiController");
    const veloSuiteController = require("../controllers/veloSuiteController");
    const camundaController = require("../controllers/camundaController.js");
    const dataTemplateController = require("../controllers/dataTemplateController.js");
    const tdcController = require("../controllers/tdcController.js");
    const eocController = require("../controllers/eocController.js");
    const formRulesController = require("../controllers/formRulesController");

    // ACTION routes START//
    app
        .route("/action-template/")
        .get(actionTemplateController.loadActionById)
        .put(actionTemplateController.updateAction)
        .delete(actionTemplateController.deleteAction)
        .post(actionTemplateController.addAction);

    app
        .route("/action-template/services/")
        .get(actionTemplateController.loadActionAssignedServices);

    app
        .route("/action-template/cArche/")
        .get(actionTemplateController.loadActionsByCarcheTemplate)
        .post(actionTemplateController.updateActionTriggeredByCarchTempChange);

    app
        .route("/action-template/vendor-type/")
        .get(actionTemplateController.loadActionVendorTypeByActionId);

    app
        .route("/action-templates/customer-service/")
        .get(actionTemplateController.getAllTemplatesForServiceCustomer);

    app
        .route("/action-templates/service/customer-service/user/")
        .get(actionTemplateController.getAllAvailableTemplatesForUser);

    app
        .route("/action-templates/service/customer-service/bc-user/")
        .get(actionTemplateController.getAllAvailableTemplatesForBcUser);

    app
        .route("/action-template/disable-action")
        .put(actionTemplateController.changeActionEnabledStatusToFalse);

    // ACTION routes END//

    /*
     * CONFIGURATION TEMPLATE routes START//
     * Old route /generateConfig
     */
    app.route("/cArche/config/").post(cArcheController.generateConfig);

    /*
     * Old route /getcArcheVariables
     * Get variables according customer
     */
    app
        .route("/cArche/variables/name/contract-id/")
        .get(cArcheController.getVariablesContractId);
    // Get variables according service
    app
        .route("/cArche/variables/name/service/")
        .get(cArcheController.getVariablesService);
    // Get variables according service
    app
        .route("/cArche/variables/template-id/")
        .get(cArcheController.getVariablesByTemplateId);
    // Old route /getcArcheListTemplates'
    app
        .route("/cArche/template-list/contract-id/service/")
        .get(cArcheController.getTemplates);
    // Old route /cArcheTemplate
    app
        .route("/cArche/template/")
        .get(cArcheController.getTemplate)
        .post(cArcheController.addNewTemplate)
        .put(cArcheController.updateTemplate)
        .delete(cArcheController.deleteTemplate);

    app
        .route("/cArche/templates/")
        .get(cArcheController.getAllCarcheTemplatesBasicInfo);

    // Confing tempalte content type
    app
        .route("/cArche/template/content-types/")
        .get(cTContentTypesController.get_conf_template_content_types);

    // Confing tempalte type
    app
        .route("/cArche/template/types/")
        .get(cTTypesController.get_conf_template_types);

    // Confing tempalte vendor type
    app
        .route("/cArche/template/vendor-types/")
        .get(cTVendorTypesController.get_conf_template_vendor_types);

    app
        .route("/cArche/template/convert-to-jinja/")
        .post(cArcheController.convertArcheToJinja);
        
    // CONFIGURATION TEMPLATE routes END//

    // HIERARCHY MENU routes START//
    app.route("/node-list/").get(treeNodesController.getBasicNodes);

    app.route("/node-list/actions/").post(treeNodesController.getNodesForActions);
    // HIERARCHY MENU routes END//

    // CUSTOMER routes START//
    app
        .route("/customer/")
        .post(customerController.createCustomer)
        .put(customerController.updateCustomer)
        .get(customerController.getCustomer);
    
    app
        .route("/customer/bc-user")
        .get(customerController.getCustomerForBcUser);

    app
        .route("/customer/service/")
        .post(customerController.addServiceToCustomer)
        .delete(customerController.deleteServiceToCustomer)
        .get(customerController.getCustomerServices);


    app.route("/customers/").get(customerController.getCustomers);

    app.route("/customers/status/").get(customerController.getCustomerByStatus);
    // CUSTOMER routes END//

    // USER routes START//
    app.route("/users/attuid/").get(usersController.getUserByATTUID);

    app.route("/users/sync/").get(usersController.syncUsers);
    // USER routes END//

    // SERVICE routes START//
    app
        .route("/service/")
        .get(serviceController.loadService)
        .post(serviceController.createService)
        .put(serviceController.updateService)
        .delete(serviceController.deleteService);

    app
        .route("/service/attributes/")
        .get(serviceController.loadAssignedAttributes)
        .post(serviceController.assigneAttributesToService)
        .delete(serviceController.deleteAssignedAttributesToService);

    app
        .route("/services/attributes/")
        .get(serviceController.loadServiceAttributes);

    app
        .route("/service/customer/action-data/")
        .post(serviceController.saveActionDataForCustomer)
        .put(serviceController.updateActionDataForCustomer)
        .delete(serviceController.deleteActionDataForCustomer)
        .get(serviceController.loadActionDataForCustomer);

    app
        .route("/service/customer/orchestrator-list/")
        .post(serviceController.saveOrchestratorListForService)
        .put(serviceController.updateOrchestratorListForService)
        .delete(serviceController.deleteOrchestratorListForService)
        .get(serviceController.loadOrchestratorListForService);

    app
        .route("/service/customer/mcap-credentials/")
        .post(serviceController.saveCredentialsForService)
        .delete(serviceController.deleteCredentialsForService)
        .get(serviceController.loadCredentialsForService);

    app
        .route("/service/mcap-credentials/")
        .post(serviceController.createMcapCredentials)
        .get(serviceController.loadAllMcapCredentials)
        .delete(serviceController.deleteCredentials);

    app
        .route("/service/customer/template/user/attuid/")
        .get(serviceController.loadServicesByTemplates);

    app
        .route("/service/customer/template/user/bc-user/")
        .get(serviceController.loadServicesByTemplates);
    // SERVICE routes END//

    // WORKFLOWS routes START//
    app
        .route("/workflow/service/customer/user/")
        .get(workflowController.getAvailableWorkflowsForServiceCustomerUser);

    app.route("/workflows/").get(workflowController.getAllWorkflows);

    app.route("/workflow/action/").get(workflowController.getWorkflowsByActionId);

    app
        .route("/workflow/attributes/")
        .get(workflowController.getWorkflowAttributes);

    app
        .route("/workflow/attribute/")
        .get(workflowController.getAssignedAttributes)
        .post(workflowController.assigneAttributeToWorkflow)
        .delete(workflowController.deleteAssignedAttributeToWorkflow);

    app.route("/workflow/timer/")
        .get(workflowController.getMaxAndMinRollbackTimerForWorkflow)
        .post(workflowController.setMaxAndMinRollbackTimerForWorkflow);
    // WORKFLOWS routes END//

    // OcsController routes END

    // MCAP routes START //
    app.route("/scripts/").get(mcapController.getListOfScripts);

    app.route("/run-validation/").post(mcapController.runValidation);

    app.route("/push-config/").get(mcapController.pushConfig);

    app.route("/set-rollback/").get(mcapController.setRollback);

    app.route("/rollback-timer/").post(mcapController.startRollbackTimer)

    app.route("/rollback-now/").get(mcapController.rollbackNow);

    app.route("/confirm-change/").get(mcapController.confirmChange);

    app.route("/run-script/").post(mcapController.runMcapScript);

    app
        .route("/change-request/config")
        .get(changeRequestController.getCrCreateConfig)
        .put(changeRequestController.updateCrCreateConfig);

    app.route("/change-request/").post(changeRequestController.createChangeRequest);

    app
        .route("/scheduler/")
        .get(schedulerController.checkProcess)
        .post(schedulerController.checkProcessReturnBlob)
        .put(schedulerController.updateProcess)

    app.route("/check-device-availability/").get(mcapController.checkDeviceAvailability);
    // Scheduler for MCAP routes END //

    // User to service relation routes START

    app
        .route("/user-service/customer/user")
        .get(userServiceController.getCustomersAccordingUser);

    // User to service relation routes EMD

    // User routes START
    app.route("/users/attuid").get(usersController.getUserByATTUID);

    app.route("/users").get(usersController.getUsers);

    app.route("/bc/users/").get(usersController.getBcUsers);

    app.route("/bc/user/").post(usersController.createBcUser);

    // User routes END

    // PERMISSION routes START//
    app
        .route("/permission/template/user/")
        .post(permissionController.assignTemplateToUser)
        .get(permissionController.getUserToTemplate)
        .delete(permissionController.deletePermissionTemplateToUser);

    app
        .route("/permission/template/role/")
        .post(permissionController.assignTemplateToRole)
        .get(permissionController.getRoleToTemplate)
        .delete(permissionController.deletePermissionTemplateToRole);

    app
        .route("/permission/template/customer/")
        .post(permissionController.assignTemplateToBcUser)
        .get(permissionController.getBcUsersToTemplate)
        .delete(permissionController.deletePermissionTemplateToBcUser);

    app
        .route("/permission/service/user/")
        .post(permissionController.assignePermissionForUser)
        .get(permissionController.getUserForServiceAndCustomer)
        .delete(permissionController.deletePermissionForUser);

    app
        .route("/permission/service/role/")
        .post(permissionController.assignePermissionForRole)
        .get(permissionController.getRolesForServiceAndCustomer)
        .delete(permissionController.deletePermissionForRole);

    app
        .route("/permission/service/customer/")
        .post(permissionController.assignePermissionForBcUser)
        .get(permissionController.getBcUserForServiceAndCustomer)
        .delete(permissionController.deletePermissionForBcUser);

    app
        .route("/permission/services/user/")
        .post(permissionController.assignServiceToUser)
        .get(permissionController.getUserForService)
        .delete(permissionController.deletePermissionForUserToService);

    app
        .route("/permission/services/role/")
        .post(permissionController.assignServiceToRole)
        .get(permissionController.getRolesForService)
        .delete(permissionController.deletePermissionForRoleToService);

    app
        .route("/permission/services/customer/")
        .post(permissionController.assignServiceToBcUser)
        .get(permissionController.getBcUserForService)
        .delete(permissionController.deletePermissionForBcUserToService);
    // PERMISSION routes END//

    // RoleController routes START
    app
        .route("/roles/")
        .get(rolesController.getRoles)
        .put(rolesController.syncRolesInDB);
    // RoleController routes END

    app.route("/send-email/").post(paperPlaneController.sendEmailNewTemplate);


    app.route("/send-email-bc/").post(paperPlaneController.sendEmailBcUser);

    // Orchestator list transaction
    app
        .route("/service-to-customer/orchestartor-list/")
        .get(ochestratorController.getOrchestratorListByServiceToCustomerId);
    app
        .route("/service-to-customer/orchestrator-list-tags/")
        .get(ochestratorController.getOrchestratorTags)
        .put(ochestratorController.updateOrchestratorTags);

    app
        .route("/service-to-customer/orchestrator-list-config/") 
        .put(ochestratorController.updateOrchestratorConfig); 
    // End orchestrator list

    app.route("/vco-edge/").post(veloWraptorController.createVCOEdge);

    app.route("/vco-edge-bulk/").post(veloWraptorController.bulkCreateVCOEdge);

    app.route("/mds/").post(mdsController.generateMdsConfiguration);

    app.route("/vco-users/").post(veloWraptorController.createVCOUser);

    // Report data flow
    app
        .route("/generate-report-data/")
        .post(reportDataController.generateReport);

    // Use Velo Suite with Camunda
    app
        .route("/velo-suite/provision-users")
        .post(veloSuiteController.provisionUsers);
    app
        .route("/velo-suite/provision-edges")
        .post(veloSuiteController.provisionEdges);
    
    app
        .route("/velo-suite/utilisation-report")
        .post(veloSuiteController.generateUtilisationReport);

    app
        .route("/sdwan/generate-report")
        .post(veloSuiteController.generateSdwanReport);
    
    
    app
        .route("/camunda-task-handler/")
        .post(camundaController.camundaLongPollingTaskHandler);

    app
        .route("/customer/grua-data/")
        .post(customerController.saveGruaDataForCustomer)
        .delete(customerController.deleteGruaDataForCustomer)
        .get(customerController.loadGruaDataForCustomer);

    app
        .route("/data-collection/")
        .get(dataCollectionController.getCdcConfigAndDataByTransactionId);

    app
        .route("/data-collection-record/")
        .get(dataCollectionController.getCollectedDataByTdcId)
        .post(dataCollectionController.createDataCollectionRecord);

    app
        .route("/data-template/")
        .get(dataTemplateController.loadDataTemplate)
        .post(dataTemplateController.saveDataTemplate)    

    app.route("/logs/").get(loggingController.getTransactionLogs);

    app.route("/lan-migration/").post(lanMigrationController.lanMigration);

    app.route("/components/").get(componentsController.getAppComponents);

    app.route("/components/tree").get(componentsController.getAppComponentsTree);

    app
        .route("/rbac/acl")
        .get(rbacController.getAccessList)
        .post(rbacController.updateAccessList);

    app.route("/cache/devices").get(cacheDevicesController.getCachedDevices);

    // GUI Controllers
    app.route("/gui/steps-config/").get(guiController.getStepsAndFlows);


    // TDC Related Routes
    app.route("/tdc-data/").get(tdcController.getTDCData);
    app.route("/tdc-data/bc-user/").get(tdcController.getTDCDataForBcUser);

    app.route("/tdc-data/eoc/push-config").post(eocController.pushEocConfiguration)

    app.route("/form-rules/")
        .get(formRulesController.getFormRules)
        .post(formRulesController.createFormRule);

    app.route('/form-rules/:id')
        .patch(formRulesController.updateFormRule)
        .delete(formRulesController.deleteFormRule);

    app.route('/form-rules/increment-sequence/:id')
        .put(formRulesController.incrementFormRuleSequence);

    addDummyRoutes(app);
    addUtilsRoutes(app);
};
