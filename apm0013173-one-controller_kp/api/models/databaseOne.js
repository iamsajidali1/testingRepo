'use strict';

const Sequelize = require('sequelize');
const { getLogger } = require("../../utils/logging");
const { CONFIG } = require('../config/configuration');

/** @type {Sequelize} current database instance */
let _db_instance = null;
/** whether database is original or modified */
let _original_db = false;

/**
 * DB instance manager
 */
class _Database {
    /**
     * Returns current instance
     * @param {boolean} noCreate whether to directly return connection or create new one
     * @returns {Sequelize}
     */
    static getInstance(noCreate = false) {
        const log = getLogger();
        if (noCreate) {
            return _db_instance;
        }
        if (!_db_instance) {
            const { database, username, password, dialect, host, port, pool } = CONFIG;
            _db_instance = new Sequelize(database, username, password, {
                dialect: dialect,
                dialectOptions: { ssl: { rejectUnauthorized: false } },
                host: host,
                port: port,
                pool: pool,
                omitNull: false,
                logging: false,
                useNewUrlParser: true,
                sync: { alter: false } // Ensure alter is disabled
            });
            _original_db = true;

            log.info('Database connection established. Adding relations...');
            _Database.addRelations()
                .then(() => {
                    log.info('Database relations added successfully! All models are ready.');
                }).catch((err) => {
                    log.error('Error adding database relations:', err);
                });
        }
        return _db_instance;
    }

    /**
     * Sets current DB instance (useful for mocking)
     * @param {Sequelize} instance
     * @param {boolean} whether database is origina (be careful what you use!)
     */
    static setInstance(instance, original = false) {
        _db_instance = instance;
        _original_db = original;
    }

    /**
     * Check if database is original
     * @returns {boolean}
     */
    static isOriginalDatabase() {
        return _original_db;
    }

    /**
     * Add relationship in models and sync
     * @returns {Promise<void>}
     */
    static addRelations() {
        const { UsersTemplate } = require('../models/usersTemplateModel');
        const { Users } = require('../models/usersModel');
        const { Customers } = require('../models/customerOneModel');
        const { Roles } = require('../models/rolesModel');
        const { Actions } = require('./actionsModel');
        const { RoleToAction } = require('../models/roleToActionModel');
        const { RouteAction } = require('../models/routeActionModel');
        const { ActionData } = require('../models/actionDataModel');
        const { ServiceName } = require('../models/serviceNameModel');
        const { Templates } = require('../models/templatesDataModel');
        const { RoleTemplates } = require('../models/roleTemplates');
        const { ServiceToCustomer } = require('../models/serviceToCustomerModel');
        const { Workflow } = require('../models/workflowModel');
        const { ActionDataToServiceToCustomer } = require('../models/actionDataToServiceToCustomerModel');
        const { McapCredential } = require('../models/mcapCredentialModel');
        const { McapCredentialToServiceToCustomer } = require('../models/mcapCredentialToServiceToCustomerModel');
        const { OrchestratorList } = require('../models/orchestratorListModel');
        const { OrchestratorListToServiceToCustomer } = require('../models/orchestratorlistToServiceToCustomer');
        const { WorkFlowToTemplate } = require('../models/workflowToTemplateModel');
        const { UserToRole } = require('../models/userToRoleModel');
        const { UserToService } = require('../models/userToServiceModel');
        const { UserToServiceToCustomer } = require('../models/userToServiceToCustomerModel');
        const { RoleToServiceToCustomer } = require('../models/roleToServiceToCustomerModel');
        const { TemplateToService } = require('../models/templateToServiceModel');
        const { TemplateToServiceToCustomer } = require('../models/templateToServiceToCustomerModel');
        const { RoleToService } = require('../models/roleToServiceModel');
        const { WorkFlowToService } = require('../models/workflowToServiceModel');
        const { WorkflowAttributes } = require('../models/workflowAttributesModel');
        const { WorkflowToWorkflowAttributes } = require('../models/workflowToWorkflowAttributesModel');
        const { MonitorLogs } = require('../models/monitorLogsModel');
        const { LeamData } = require('../models/leamDataModel');
        const { LeamDataToServiceToCustomer } = require('../models/leamDataToServiceToCustomerModel');
        const { TemplateToVendor } = require('../models/templateToVendorModel');
        const { ServiceAttributes } = require('../models/serviceAttributesModel');
        const { ServiceToServiceAttributes } = require('../models/serviceToServiceAttributesModel');
        const { CTVendorTypes } = require('../models/cTVendorTypes');
        const { GruaData } = require('./gruaDataModel');
        const { GruaDataToCustomer } = require('./gruaDataToCustomerModel');
        const { AutoCrToServiceToCustomer } = require('./autoCrToServiceToCustomerModel');
        const { WorkflowToRollbackTimer } = require('./workflowToRollbackTimerModel');
        const { DataTemplate } = require('./dataTemplateModel');
        const { TDCData } = require("../models/tdcDataModel");
        const { OrchestratorListForLicense } = require('./orchestratorListForLicenseModel');
        const { OrchestratorLicenseDetails } = require('./orchestratorLicenseDetailsModel');
        const { FormRule } = require('./formRuleModel');
        const { Characteristic } = require('./characteristicModel');
        const { CharacteristicSpecification } = require('./characteristicSpecificationModel');
        const { AtomicOperationsCharacteristics } = require('./atomicOperationsCharacteristicsModel');
        const { AtomicOperations } = require('./atomicOperationsModel');
        const { AtomicOperationTypes } = require('./atomicOperationTypesModel');
        const { AtomicOperationsTemplate } = require('./atomicOperationsTemplateModel');
        const { AtomicOperationsVendorTypes } = require('./atomicOperationsVendorTypesModel');
        const { AtomicOperationsServices } = require('./atomicOperationsServicesModel');
        const { ProductOrder } = require('./productOrderModel');
        const { Organization } = require('./organizationModel');
        const { GeographicalSite } = require('./geographicalSiteModel');
        const { GeographicalLocation } = require('./geographicalLocationModel');
        const { GeographicalAddress } = require('./geographicalAddressModel');
        const { EricksonSite } = require('./ericksonSiteModel'); 
        const { SiteInfo } = require("./siteInfoModel")

        //ROLE to USER
        // role to user to role
        Roles.hasMany(UserToRole, { foreignKey: { name: 'ROLE_ID', allowNull: false, sourceKey: 'ID' } });
        UserToRole.belongsTo(Roles, { foreignKey: { name: 'ROLE_ID', allowNull: false, sourceKey: 'ID' } });

        // user to role to user
        Users.hasMany(UserToRole, { foreignKey: { name: 'USER_ID', allowNull: false, sourceKey: 'ID' } });
        UserToRole.belongsTo(Users, { foreignKey: { name: 'USER_ID', allowNull: false, sourceKey: 'ID' } });

        // Role to Action - PRIVILIGIES table
        // Role to Role to Action
        Roles.hasOne(RoleToAction, { foreignKey: { name: 'ROLE_ID', allowNull: false, sourceKey: 'ID' } });
        RoleToAction.belongsTo(Roles, { foreignKey: { name: 'ROLE_ID', allowNull: false, sourceKey: 'ID' } });

        //Action to Rolet To Action
        Actions.hasOne(RoleToAction, { foreignKey: { name: 'ACTION_ID', allowNull: false, sourceKey: 'ID' } });
        RoleToAction.belongsTo(Actions, { foreignKey: { name: 'ACTION_ID', allowNull: false, sourceKey: 'ID' } });

        // USER nad ROLE to template

        // User to User template
        Users.hasMany(UsersTemplate, { foreignKey: { name: 'USER_ID', allowNull: false, sourceKey: 'ID' } });
        UsersTemplate.belongsTo(Users, { foreignKey: { name: 'USER_ID', allowNull: false, sourceKey: 'ID' } });

        // Template to users template
        Templates.hasMany(UsersTemplate, { foreignKey: { name: 'TEMPLATE_ID', allowNull: false, sourceKey: 'ID' } });
        UsersTemplate.belongsTo(Templates, { foreignKey: { name: 'TEMPLATE_ID', allowNull: false, sourceKey: 'ID' } });

        // Role to role template
        Roles.hasMany(RoleTemplates, { foreignKey: { name: 'ROLE_ID', allowNull: false, sourceKey: 'ID' } });
        RoleTemplates.belongsTo(Roles, { foreignKey: { name: 'ROLE_ID', allowNull: false, sourceKey: 'ID' } });

        // template to role template
        Templates.hasMany(RoleTemplates, { foreignKey: { name: 'TEMPLATE_ID', allowNull: false, sourceKey: 'ID' } });
        RoleTemplates.belongsTo(Templates, { foreignKey: { name: 'TEMPLATE_ID', allowNull: false, sourceKey: 'ID' } });

        // !!! should be removed
        // User to Customer user
        // Users.hasMany(CustomerUser, { foreignKey: { name: 'USER_ID', allowNull: false, sourceKey: 'ID' } });
        //CustomerUser.belongsTo(Users, { foreignKey: { name: 'USER_ID', allowNull: false, sourceKey: 'ID' } });

        // Action to route to actions
        Actions.hasMany(RouteAction, { foreignKey: { name: 'ACTION_ID', allowNull: false, sourceKey: 'ID' } });
        RouteAction.belongsTo(Actions, { foreignKey: { name: 'ACTION_ID', allowNull: false, sourceKey: 'ID' } });

        // SERVICE to CUSTOMER

        // Service to serviceToCustomer
        ServiceName.hasMany(ServiceToCustomer, { foreignKey: { name: 'SERVICE_ID', allowNull: false, sourceKey: 'ID' } });
        ServiceToCustomer.belongsTo(ServiceName, { foreignKey: { name: 'SERVICE_ID', allowNull: false, sourceKey: 'ID' } });

        // Customer to serviceto customer

        Customers.hasMany(ServiceToCustomer, { foreignKey: { name: 'CUSTOMER_ID', allowNull: false, sourceKey: 'ID' } });
        ServiceToCustomer.belongsTo(Customers, { foreignKey: { name: 'CUSTOMER_ID', allowNull: false, sourceKey: 'ID' } });

        // Worfklow To service to workflow
        //ServiceName.hasMany(Workflow, { foreignKey: { name: 'SERVICE_ID', allowNull: false, sourceKey: 'ID' } });
        //Workflow.belongsTo(ServiceName, { foreignKey: { name: 'SERVICE_ID', allowNull: false, sourceKey: 'ID' } });

        // Workflow to service  workflow to service
        Workflow.hasMany(WorkFlowToService, { foreignKey: { name: 'WORKFLOW_ID', allowNull: false, sourceKey: 'ID' } });
        WorkFlowToService.belongsTo(Workflow, { foreignKey: { name: 'WORKFLOW_ID', allowNull: false, sourceKey: 'ID' } });

        //Service to workflow to service
        ServiceName.hasMany(WorkFlowToService, { foreignKey: { name: 'SERVICE_ID', allowNull: false, sourceKey: 'ID' } });
        WorkFlowToService.belongsTo(ServiceName, { foreignKey: { name: 'SERVICE_ID', allowNull: false, sourceKey: 'ID' } });

        // ACTION DATA to SERVICE to Customer
        //Action data to action data to service
        ActionData.hasMany(ActionDataToServiceToCustomer, { foreignKey: { name: 'ACTION_DATA_ID', allowNull: false, sourceKey: 'ID' } });
        ActionDataToServiceToCustomer.belongsTo(ActionData, { foreignKey: { name: 'ACTION_DATA_ID', allowNull: false, sourceKey: 'ID' } });

        // Service to custoomer to action data to service
        ServiceToCustomer.hasMany(ActionDataToServiceToCustomer, { foreignKey: { name: 'SERVICE_TO_CUSTOMER_ID', allowNull: false, sourceKey: 'ID' } });
        ActionDataToServiceToCustomer.belongsTo(ServiceToCustomer, { foreignKey: { name: 'SERVICE_TO_CUSTOMER_ID', allowNull: false, sourceKey: 'ID' } });



        // MCAP Credential to SERVICE to Customer
        //Mcap Credential to McapCredential to service
        McapCredential.hasMany(McapCredentialToServiceToCustomer, { foreignKey: { name: 'MCAP_CREDENTIAL_ID', allowNull: false, sourceKey: 'ID' } });
        McapCredentialToServiceToCustomer.belongsTo(McapCredential, { foreignKey: { name: 'MCAP_CREDENTIAL_ID', allowNull: false, sourceKey: 'ID' } });

        // Service to Customer to Mcap Credentials
        ServiceToCustomer.hasMany(McapCredentialToServiceToCustomer, { foreignKey: { name: 'SERVICE_TO_CUSTOMER_ID', allowNull: false, sourceKey: 'ID' } });
        McapCredentialToServiceToCustomer.belongsTo(ServiceToCustomer, { foreignKey: { name: 'SERVICE_TO_CUSTOMER_ID', allowNull: false, sourceKey: 'ID' } });

        // Service to Customer AUTO CR Create
        ServiceToCustomer.hasMany(AutoCrToServiceToCustomer, { foreignKey: { name: 'SERVICE_TO_CUSTOMER_ID', allowNull: false, sourceKey: 'ID' } });
        AutoCrToServiceToCustomer.belongsTo(ServiceToCustomer, { foreignKey: { name: 'SERVICE_TO_CUSTOMER_ID', allowNull: false, sourceKey: 'ID' } });


        // ORCHESTRATOR LIST to SERVICE to Customer
        //Orchestrator list to orchestartor list to service to customer
        OrchestratorList.hasMany(OrchestratorListToServiceToCustomer, { foreignKey: { name: 'ORCHESTRATOR_LIST_ID', allowNull: false, sourceKey: 'ID' } });
        OrchestratorListToServiceToCustomer.belongsTo(OrchestratorList, { foreignKey: { name: 'ORCHESTRATOR_LIST_ID', allowNull: false, sourceKey: 'ID' } });

        // Service to Custome to Orchestrator list
        ServiceToCustomer.hasMany(OrchestratorListToServiceToCustomer, { foreignKey: { name: 'SERVICE_TO_CUSTOMER_ID', allowNull: false, sourceKey: 'ID' } });
        OrchestratorListToServiceToCustomer.belongsTo(ServiceToCustomer, { foreignKey: { name: 'SERVICE_TO_CUSTOMER_ID', allowNull: false, sourceKey: 'ID' } });


        // WORKFLOW to TEMPLATE
        // Worfklow to workflow to template
        Workflow.hasMany(WorkFlowToTemplate, { foreignKey: { name: 'WORKFLOW_ID', allowNull: false, sourceKey: 'ID' } });
        WorkFlowToTemplate.belongsTo(Workflow, { foreignKey: { name: 'WORKFLOW_ID', allowNull: false, sourceKey: 'ID' } });

        // Template to workflow to template
        Templates.hasMany(WorkFlowToTemplate, { foreignKey: { name: 'TEMPLATE_ID', allowNull: false, sourceKey: 'ID' } });
        WorkFlowToTemplate.belongsTo(Templates, { foreignKey: { name: 'TEMPLATE_ID', allowNull: false, sourceKey: 'ID' } });


        // USER TO SERVICE
        // User to service to user
        Users.hasMany(UserToService, { foreignKey: { name: 'USER_ID', allowNull: false, sourceKey: 'ID' } });
        UserToService.belongsTo(Users, { foreignKey: { name: 'USER_ID', allowNull: false, sourceKey: 'ID' } });

        // Service to service to user
        ServiceName.hasMany(UserToService, { foreignKey: { name: 'SERVICE_ID', allowNull: false, sourceKey: 'ID' } });
        UserToService.belongsTo(ServiceName, { foreignKey: { name: 'SERVICE_ID', allowNull: false, sourceKey: 'ID' } });

        // USER TO SERVICE TO CUSTOMER
        // User to user to service to customer
        Users.hasMany(UserToServiceToCustomer, { foreignKey: { name: 'USER_ID', allowNull: false, sourceKey: 'ID' } });
        UserToServiceToCustomer.belongsTo(Users, { foreignKey: { name: 'USER_ID', allowNull: false, sourceKey: 'ID' } });

        // Service to customer to service to user
        ServiceToCustomer.hasMany(UserToServiceToCustomer, { foreignKey: { name: 'SERVICE_TO_CUSTOMER_ID', allowNull: false, sourceKey: 'ID' } });
        UserToServiceToCustomer.belongsTo(ServiceToCustomer, { foreignKey: { name: 'SERVICE_TO_CUSTOMER_ID', allowNull: false, sourceKey: 'ID' } });


        // ROLE TO SERVICE to Customer
        // Role to service to customer
        Roles.hasMany(RoleToServiceToCustomer, { foreignKey: { name: 'ROLE_ID', allowNull: false, sourceKey: 'ID' } });
        RoleToServiceToCustomer.belongsTo(Roles, { foreignKey: { name: 'ROLE_ID', allowNull: false, sourceKey: 'ID' } });

        // Service to Customer to Role
        ServiceToCustomer.hasMany(RoleToServiceToCustomer, { foreignKey: { name: 'SERVICE_TO_CUSTOMER_ID', allowNull: false, sourceKey: 'ID' } });
        RoleToServiceToCustomer.belongsTo(ServiceToCustomer, { foreignKey: { name: 'SERVICE_TO_CUSTOMER_ID', allowNull: false, sourceKey: 'ID' } });

        // TEMPLATE to SERVICE to Customer
        // Tempalte to template service to customer
        Templates.hasMany(TemplateToServiceToCustomer, { foreignKey: { name: 'TEMPLATE_ID', allowNull: false, sourceKey: 'ID' } });
        TemplateToServiceToCustomer.belongsTo(Templates, { foreignKey: { name: 'TEMPLATE_ID', allowNull: false, sourceKey: 'ID' } });

        //Service to template to service to customer
        ServiceToCustomer.hasMany(TemplateToServiceToCustomer, { foreignKey: { name: 'SERVICE_TO_CUSTOMER_ID', allowNull: false, sourceKey: 'ID' } });
        TemplateToServiceToCustomer.belongsTo(ServiceToCustomer, { foreignKey: { name: 'SERVICE_TO_CUSTOMER_ID', allowNull: false, sourceKey: 'ID' } });

        // TEMPLATE to SERVICE
        //Template to template to service
        Templates.hasMany(TemplateToService, { foreignKey: { name: 'TEMPLATE_ID', allowNull: false, sourceKey: 'ID' } });
        TemplateToService.belongsTo(Templates, { foreignKey: { name: 'TEMPLATE_ID', allowNull: false, sourceKey: 'ID' } });

        // Service to Template
        ServiceName.hasMany(TemplateToService, { foreignKey: { name: 'SERVICE_ID', allowNull: false, sourceKey: 'ID' } });
        TemplateToService.belongsTo(ServiceName, { foreignKey: { name: 'SERVICE_ID', allowNull: false, sourceKey: 'ID' } });

        // ROLE to SERVICE
        // Role to role to service
        Roles.hasMany(RoleToService, { foreignKey: { name: 'ROLE_ID', allowNull: false, sourceKey: 'ID' } });
        RoleToService.belongsTo(Roles, { foreignKey: { name: 'ROLE_ID', allowNull: false, sourceKey: 'ID' } });

        // Service to role to service
        ServiceName.hasMany(RoleToService, { foreignKey: { name: 'SERVICE_ID', allowNull: false, sourceKey: 'ID' } });
        RoleToService.belongsTo(ServiceName, { foreignKey: { name: 'SERVICE_ID', allowNull: false, sourceKey: 'ID' } });

        // MONITOR LOGS RELATIONS
        // Template id - required
        Templates.hasMany(MonitorLogs, { foreignKey: { name: 'TEMPLATE_ID', allowNull: false, sourceKey: 'ID' } });
        MonitorLogs.belongsTo(Templates, { foreignKey: { name: 'TEMPLATE_ID', allowNull: false, sourceKey: 'ID' } });

        // Service id - required
        ServiceName.hasMany(MonitorLogs, { foreignKey: { name: 'SERVICE_ID', allowNull: false, sourceKey: 'ID' } });
        MonitorLogs.belongsTo(ServiceName, { foreignKey: { name: 'SERVICE_ID', allowNull: false, sourceKey: 'ID' } });

        // User id - required
        Users.hasMany(MonitorLogs, { foreignKey: { name: 'USER_ID', allowNull: false, sourceKey: 'ID' } });
        MonitorLogs.belongsTo(Users, { foreignKey: { name: 'USER_ID', allowNull: false, sourceKey: 'ID' } });

        // Customer id - not requried - maybe service to customer adding both options - allowNull: true
        Customers.hasMany(MonitorLogs, { foreignKey: { name: 'CUSTOMER_ID', allowNull: true, sourceKey: 'ID' } });
        MonitorLogs.belongsTo(Customers, { foreignKey: { name: 'CUSTOMER_ID', allowNull: true, sourceKey: 'ID' } });

        // Customer to service id
        ServiceToCustomer.hasMany(MonitorLogs, { foreignKey: { name: 'SERVICE_TO_CUSTOMER_ID', allowNull: true, sourceKey: 'ID' } });
        MonitorLogs.belongsTo(MonitorLogs, { foreignKey: { name: 'SERVICE_TO_CUSTOMER_ID', allowNull: true, sourceKey: 'ID' } });

        // LEAM DATA to SERVICE TO CUSTOMER
        // leam data to leam to service to customer
        LeamData.hasMany(LeamDataToServiceToCustomer, { foreignKey: { name: 'LEAM_DATA_ID', allowNull: false, sourceKey: 'ID' } });
        LeamDataToServiceToCustomer.belongsTo(LeamData, { foreignKey: { name: 'LEAM_DATA_ID', allowNull: false, sourceKey: 'ID' } });

        // service to customer to leam to service to customer
        ServiceToCustomer.hasMany(LeamDataToServiceToCustomer, { foreignKey: { name: 'SERVICE_TO_CUSTOMER_ID', allowNull: false, sourceKey: 'ID' } });
        LeamDataToServiceToCustomer.belongsTo(ServiceToCustomer, { foreignKey: { name: 'SERVICE_TO_CUSTOMER_ID', allowNull: false, sourceKey: 'ID' } });

        //Service attribute to service to service attributes
        ServiceAttributes.hasMany(ServiceToServiceAttributes, { foreignKey: { name: 'SERVICE_ATTRIBUTE_ID', allowNull: false, sourceKey: 'ID' } });
        ServiceToServiceAttributes.belongsTo(ServiceAttributes, { foreignKey: { name: 'SERVICE_ATTRIBUTE_ID', allowNull: false, sourceKey: 'ID' } });

        // Service to service to service attributes
        ServiceName.hasMany(ServiceToServiceAttributes, { foreignKey: { name: 'SERVICE_ID', allowNull: false, sourceKey: 'ID' } });
        ServiceToServiceAttributes.belongsTo(ServiceName, { foreignKey: { name: 'SERVICE_ID', allowNull: false, sourceKey: 'ID' } });

        //Workflow attribute to workflow to workflow attributes
        WorkflowAttributes.hasMany(WorkflowToWorkflowAttributes, { foreignKey: { name: 'WORKFLOW_ATTRIBUTE_ID', allowNull: false, sourceKey: 'ID' } });
        WorkflowToWorkflowAttributes.belongsTo(WorkflowAttributes, { foreignKey: { name: 'WORKFLOW_ATTRIBUTE_ID', allowNull: false, sourceKey: 'ID' } });

        // Workflow to worklow to workflow attributes
        Workflow.hasMany(WorkflowToWorkflowAttributes, { foreignKey: { name: 'WORKFLOW_ID', allowNull: false, sourceKey: 'ID' } });
        WorkflowToWorkflowAttributes.belongsTo(Workflow, { foreignKey: { name: 'WORKFLOW_ID', allowNull: false, sourceKey: 'ID' } });


        // TEMPLATE TO VENDOR TYPE
        // vendor type to template
        CTVendorTypes.hasMany(TemplateToVendor, { foreignKey: { name: 'VENDOR_ID', allowNull: false, sourceKey: 'ID' } });
        TemplateToVendor.belongsTo(CTVendorTypes, { foreignKey: { name: 'VENDOR_ID', allowNull: false, sourceKey: 'ID' } });

        // template to vendor type
        Templates.hasMany(TemplateToVendor, { foreignKey: { name: 'TEMPLATE_ID', allowNull: false, sourceKey: 'ID' } });
        TemplateToVendor.belongsTo(Templates, { foreignKey: { name: 'TEMPLATE_ID', allowNull: false, sourceKey: 'ID' } });


        //GRUA DATA TO CUSTOMER
        // Grua data to grua data to customer
        GruaData.hasMany(GruaDataToCustomer, { foreignKey: { name: 'GRUA_ID', allowNull: false, sourceKey: 'ID' } });
        GruaDataToCustomer.belongsTo(GruaData, { foreignKey: { name: 'GRUA_ID', allowNull: false, sourceKey: 'ID' } });

        // Customer to grua data
        Customers.hasMany(GruaDataToCustomer, { foreignKey: { name: 'CUSTOMER_ID', allowNull: false, sourceKey: 'ID' } });
        GruaDataToCustomer.belongsTo(Customers, { foreignKey: { name: 'CUSTOMER_ID', allowNull: false, sourceKey: 'ID' } });

        //workflow to rollback timer
        Workflow.hasOne(WorkflowToRollbackTimer, { foreignKey: { name: 'WORKFLOW_ID', allowNull: false, sourceKey: 'ID' } });
        WorkflowToRollbackTimer.belongsTo(Workflow, { foreignKey: { name: 'WORKFLOW_ID', allowNull: false, sourceKey: 'ID' } });


        // Data template to action template
        Templates.hasMany(DataTemplate, { foreignKey: { name: 'ACTION_ID', allowNull: false, sourceKey: 'ID' } });
        DataTemplate.belongsTo(Templates, { foreignKey: { name: 'ACTION_ID', allowNull: false, sourceKey: 'ID' } });

        // Data template to customer
        Customers.hasMany(DataTemplate, { as: 'customer', foreignKey: { name: 'CUSTOMER_ID', allowNull: false, sourceKey: 'ID' } });
        DataTemplate.belongsTo(Customers, { as: 'customer', foreignKey: { name: 'CUSTOMER_ID', allowNull: false, sourceKey: 'ID' } });

        // Data template to service
        // Data template to customer
        ServiceName.hasMany(DataTemplate, { as: 'service', foreignKey: { name: 'SERVICE_ID', allowNull: false, sourceKey: 'ID' } });
        DataTemplate.belongsTo(ServiceName, { as: 'service', foreignKey: { name: 'SERVICE_ID', allowNull: false, sourceKey: 'ID' } });

        // TDC Data to Template
        Templates.hasMany(TDCData, { foreignKey: { name: 'TEMPLATE_ID', allowNull: false, sourceKey: 'ID' } });
        TDCData.belongsTo(Templates, { as: 'TEMPLATE', foreignKey: { name: 'TEMPLATE_ID', allowNull: false, sourceKey: 'ID' } });


        // TDC Data to Organization
        Organization.hasMany(TDCData, { foreignKey: { name: 'ORGANIZATION_ID', allowNull: true, sourceKey: 'ID' } });
        TDCData.belongsTo(Organization, { as: 'ORGANIZATION', foreignKey: { name: 'ORGANIZATION_ID', allowNull: true, sourceKey: 'ID' } });

        // TDC Data to ProductOrder
        TDCData.belongsTo(ProductOrder, { foreignKey: { name: 'PRODUCT_ORDER_ID', allowNull: true, sourceKey: 'ID' } });
        ProductOrder.hasOne(TDCData, { foreignKey: { name: 'PRODUCT_ORDER_ID', allowNull: true, sourceKey: 'ID' } });

        // TDC Data to Geographical Site
        TDCData.belongsTo(GeographicalSite, { foreignKey: { name: 'GEOGRAPHICAL_SITE_ID', allowNull: true, sourceKey: 'ID' } });
        GeographicalSite.hasOne(TDCData, { foreignKey: { name: 'GEOGRAPHICAL_SITE_ID', allowNull: true, sourceKey: 'ID' } });

        // Geographical Location to Geographical Site
        GeographicalSite.belongsTo(GeographicalLocation, { foreignKey: 'GEOGRAPHICAL_LOCATION_ID', allowNull: false, sourceKey: 'ID' });
        GeographicalLocation.hasOne(GeographicalSite, { foreignKey: 'GEOGRAPHICAL_LOCATION_ID', allowNull: false, sourceKey: 'ID' });

        // Geographical Address to Geographical Site
        GeographicalSite.belongsTo(GeographicalAddress, { foreignKey: 'GEOGRAPHICAL_ADDRESS_ID', allowNull: false, sourceKey: 'ID' });
        GeographicalAddress.hasOne(GeographicalSite, { foreignKey: 'GEOGRAPHICAL_ADDRESS_ID', allowNull: false, sourceKey: 'ID' });

        // Erickson Site to Geographical Site
        EricksonSite.belongsTo(GeographicalSite, { foreignKey: 'GEOGRAPHICAL_SITE_ID', targetKey: 'ID' });
        GeographicalSite.hasMany(EricksonSite, { foreignKey: 'GEOGRAPHICAL_SITE_ID', sourceKey: 'ID' });

        // Form Rule to Template
        Templates.hasMany(FormRule, { foreignKey: { name: 'TEMPLATE_ID', allowNull: false, sourceKey: 'ID' } });
        FormRule.belongsTo(Templates, { as: 'TEMPLATE', foreignKey: { name: 'TEMPLATE_ID', allowNull: false, sourceKey: 'ID' } });

        // Ocrechestrator List for License to License Details
        OrchestratorListForLicense.hasMany(OrchestratorLicenseDetails, { as: "LICENSE_DETAILS", foreignKey: { name: 'ORCHESTRATOR_LIST_FOR_LICENSE_ID', allowNull: false, sourceKey: 'ID' } });
        OrchestratorLicenseDetails.belongsTo(OrchestratorListForLicense, { as: "LICENSE_DETAILS", foreignKey: { name: 'ORCHESTRATOR_LIST_FOR_LICENSE_ID', allowNull: false, sourceKey: 'ID' } });

        // Characteristic specification
        Characteristic.hasMany(CharacteristicSpecification, { foreignKey: { name: "CHARACTERISTIC_ID", allowNull: false, sourceKey: "ID" } });
        CharacteristicSpecification.belongsTo(Characteristic, { foreignKey: { name: "CHARACTERISTIC_ID", allowNull: false, sourceKey: "ID" } });

        // Atomic operations
        Characteristic.belongsToMany(AtomicOperations, { through: AtomicOperationsCharacteristics, foreignKey: 'CHARACTERISTIC_ID', allowNull: false, sourceKey: "ID" });
        AtomicOperations.belongsToMany(Characteristic, { through: AtomicOperationsCharacteristics, foreignKey: 'ATOMIC_OPERATION_ID', allowNull: false, sourceKey: "ID" });

        AtomicOperations.hasMany(AtomicOperationsCharacteristics, { foreignKey: 'ATOMIC_OPERATION_ID', allowNull: false, sourceKey: 'ID' });
        AtomicOperationsCharacteristics.belongsTo(AtomicOperations, { foreignKey: 'ATOMIC_OPERATION_ID', allowNull: false, targetKey: 'ID' });

        AtomicOperations.belongsTo(AtomicOperationTypes, { foreignKey: 'TYPE', allowNull: false, sourceKey: "ID" });
        AtomicOperationTypes.hasMany(AtomicOperations, { foreignKey: 'TYPE', allowNull: false, sourceKey: "ID" });

        Templates.belongsToMany(AtomicOperations, { through: AtomicOperationsTemplate, foreignKey: 'TEMPLATE_ID', allowNull: false, sourceKey: "ID" });
        AtomicOperations.belongsToMany(Templates, { through: AtomicOperationsTemplate, foreignKey: 'ATOMIC_OPERATION_ID', allowNull: false, sourceKey: "ID" });

        ServiceName.belongsToMany(AtomicOperations, { through: AtomicOperationsServices, foreignKey: 'SERVICE_ID', allowNull: false, sourceKey: "ID" });
        AtomicOperations.belongsToMany(ServiceName, { through: AtomicOperationsServices, foreignKey: 'ATOMIC_OPERATION_ID', allowNull: false, sourceKey: "ID" });

        CTVendorTypes.belongsToMany(AtomicOperations, { through: AtomicOperationsVendorTypes, foreignKey: 'VENDOR_TYPE_ID', allowNull: false, sourceKey: "ID" });
        AtomicOperations.belongsToMany(CTVendorTypes, { through: AtomicOperationsVendorTypes, foreignKey: 'ATOMIC_OPERATION_ID', allowNull: false, sourceKey: "ID" });

        Customers.hasMany(SiteInfo, { foreignKey: { name: 'CUSTOMER_ID', allowNull: false, sourceKey: 'ID' } });
        SiteInfo.belongsTo(Customers, { as: 'CUSTOMER', foreignKey: { name: 'CUSTOMER_ID', allowNull: false, sourceKey: 'ID' } });

        OrchestratorList.hasMany(SiteInfo, { foreignKey: { name: 'ORCHESTRATOR_LIST_ID', allowNull: false, sourceKey: 'ID' } });
        SiteInfo.belongsTo(OrchestratorList, { as: 'ORCHESTRATOR_LIST', foreignKey: { name: 'ORCHESTRATOR_LIST_ID', allowNull: false, sourceKey: 'ID' } });

        // Synchronize all models
        return _db_instance.sync({ alter: false, force: false });
    }

}

exports.Database = _Database;
