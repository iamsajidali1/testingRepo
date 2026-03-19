from rest_framework import serializers
from orm import models


class CreateActionDataCustomers(serializers.ModelSerializer):
    class Meta:
        model = models.ActionDataCustomers
        fields = "__all__"


class ActionDataCustomers(serializers.ModelSerializer):
    class Meta:
        model = models.ActionDataCustomers
        fields = "__all__"


class CreateCustomers(serializers.ModelSerializer):
    class Meta:
        model = models.Customers
        fields = "__all__"


class Customers(serializers.ModelSerializer):
    class Meta:
        model = models.Customers
        fields = "__all__"


class CreateServices(serializers.ModelSerializer):
    class Meta:
        model = models.Services
        fields = "__all__"


class Services(serializers.ModelSerializer):
    class Meta:
        model = models.Services
        fields = "__all__"


class CreateServiceToCustomer(serializers.ModelSerializer):
    class Meta:
        model = models.ServiceToCustomer
        fields = "__all__"


class ServiceToCustomer(serializers.ModelSerializer):
    customer = Customers(many=False, read_only=True)
    service = Services(many=False, read_only=True)

    class Meta:
        model = models.ServiceToCustomer
        fields = "__all__"


class CreateActionDataToServiceToCustomer(serializers.ModelSerializer):
    class Meta:
        model = models.ActionDataToServiceToCustomer
        fields = "__all__"


class ActionDataToServiceToCustomer(serializers.ModelSerializer):
    action_data = ActionDataCustomers(many=False, read_only=True)
    service_to_customer = ServiceToCustomer(many=False, read_only=True)

    class Meta:
        model = models.ActionDataToServiceToCustomer
        fields = "__all__"


class CreateActions(serializers.ModelSerializer):
    class Meta:
        model = models.Actions
        fields = "__all__"


class Actions(serializers.ModelSerializer):
    class Meta:
        model = models.Actions
        fields = "__all__"


class CreateBcContext(serializers.ModelSerializer):
    class Meta:
        model = models.BcContext
        fields = "__all__"


class BcContext(serializers.ModelSerializer):
    class Meta:
        model = models.BcContext
        fields = "__all__"

class CreateCachedDevicesData(serializers.ModelSerializer):
    class Meta:
        model = models.CachedDevicesData
        fields = "__all__"

class CachedDevicesData(serializers.ModelSerializer):
    class Meta:
        model = models.CachedDevicesData
        fields = "__all__"

class CreateComponents(serializers.ModelSerializer):
    class Meta:
        model = models.Components
        fields = "__all__"


class Components(serializers.ModelSerializer):
    class Meta:
        model = models.Components
        fields = "__all__"

class CreateCarcheGeneratedConfig(serializers.ModelSerializer):
    class Meta:
        model = models.CarcheGeneratedConfig
        fields = "__all__"


class CarcheGeneratedConfig(serializers.ModelSerializer):
    class Meta:
        model = models.CarcheGeneratedConfig
        fields = "__all__"


class CreateConfTemplateContentTypes(serializers.ModelSerializer):
    class Meta:
        model = models.ConfTemplateContentTypes
        fields = "__all__"


class ConfTemplateContentTypes(serializers.ModelSerializer):
    class Meta:
        model = models.ConfTemplateContentTypes
        fields = "__all__"


class CreateConfTemplateTypes(serializers.ModelSerializer):
    class Meta:
        model = models.ConfTemplateTypes
        fields = "__all__"


class ConfTemplateTypes(serializers.ModelSerializer):
    class Meta:
        model = models.ConfTemplateTypes
        fields = "__all__"


class CreateConfTemplateVendorTypes(serializers.ModelSerializer):
    class Meta:
        model = models.ConfTemplateVendorTypes
        fields = "__all__"


class ConfTemplateVendorTypes(serializers.ModelSerializer):
    class Meta:
        model = models.ConfTemplateVendorTypes
        fields = "__all__"


class CreateDataCollection(serializers.ModelSerializer):
    class Meta:
        model = models.DataCollection
        fields = "__all__"


class DataCollection(serializers.ModelSerializer):
    class Meta:
        model = models.DataCollection
        fields = "__all__"


class CreateDataTemplates(serializers.ModelSerializer):
    class Meta:
        model = models.DataTemplates
        fields = "__all__"


class DataTemplates(serializers.ModelSerializer):
    class Meta:
        model = models.DataTemplates
        fields = "__all__"


class CreateGruaData(serializers.ModelSerializer):
    class Meta:
        model = models.GruaData
        fields = "__all__"


class GruaData(serializers.ModelSerializer):
    class Meta:
        model = models.GruaData
        fields = "__all__"


class CreateGruaDataToCustomer(serializers.ModelSerializer):
    class Meta:
        model = models.GruaDataToCustomer
        fields = "__all__"


class GruaDataToCustomer(serializers.ModelSerializer):
    grua = GruaData(many=False, read_only=True)
    customer = Customers(many=False, read_only=True)

    class Meta:
        model = models.GruaDataToCustomer
        fields = "__all__"


class CreateError(serializers.ModelSerializer):
    class Meta:
        model = models.Error
        fields = "__all__"


class Error(serializers.ModelSerializer):
    class Meta:
        model = models.Error
        fields = "__all__"


class CreateGpsData(serializers.ModelSerializer):
    class Meta:
        model = models.GpsData
        fields = "__all__"


class GpsData(serializers.ModelSerializer):
    class Meta:
        model = models.GpsData
        fields = "__all__"


class CreateGpsDataToCustTest(serializers.ModelSerializer):
    class Meta:
        model = models.GpsDataToCustTest
        fields = "__all__"


class GpsDataToCustTest(serializers.ModelSerializer):
    gps_data = GpsData(many=False, read_only=True)
    customer = Customers(many=False, read_only=True)

    class Meta:
        model = models.GpsDataToCustTest
        fields = "__all__"


class CreateGpsDataToCustomer(serializers.ModelSerializer):
    class Meta:
        model = models.GpsDataToCustomer
        fields = "__all__"


class GpsDataToCustomer(serializers.ModelSerializer):
    gps_data = GpsData(many=False, read_only=True)
    customer = Customers(many=False, read_only=True)

    class Meta:
        model = models.GpsDataToCustomer
        fields = "__all__"


class CreateGpsDataToServiceToCustomer(serializers.ModelSerializer):
    class Meta:
        model = models.GpsDataToServiceToCustomer
        fields = "__all__"


class GpsDataToServiceToCustomer(serializers.ModelSerializer):
    gps_data = GpsData(many=False, read_only=True)
    service_to_customer = ServiceToCustomer(many=False, read_only=True)

    class Meta:
        model = models.GpsDataToServiceToCustomer
        fields = "__all__"


class CreateLeamData(serializers.ModelSerializer):
    class Meta:
        model = models.LeamData
        fields = "__all__"


class LeamData(serializers.ModelSerializer):
    class Meta:
        model = models.LeamData
        fields = "__all__"


class CreateLeamDataToServiceToCustomer(serializers.ModelSerializer):
    class Meta:
        model = models.LeamDataToServiceToCustomer
        fields = "__all__"


class LeamDataToServiceToCustomer(serializers.ModelSerializer):
    leam_data = LeamData(many=False, read_only=True)
    service_to_customer = ServiceToCustomer(many=False, read_only=True)

    class Meta:
        model = models.LeamDataToServiceToCustomer
        fields = "__all__"


class CreateLogRequest(serializers.ModelSerializer):
    class Meta:
        model = models.LogRequest
        fields = "__all__"


class LogRequest(serializers.ModelSerializer):
    class Meta:
        model = models.LogRequest
        fields = "__all__"


class CreateMcapCredential(serializers.ModelSerializer):
    class Meta:
        model = models.McapCredential
        fields = "__all__"


class McapCredential(serializers.ModelSerializer):
    class Meta:
        model = models.McapCredential
        fields = "__all__"


class CreateMcapCredentialToServiceToCustomer(serializers.ModelSerializer):
    class Meta:
        model = models.McapCredentialToServiceToCustomer
        fields = "__all__"


class McapCredentialToServiceToCustomer(serializers.ModelSerializer):
    mcap_credential = McapCredential(many=False, read_only=True)
    service_to_customer = ServiceToCustomer(many=False, read_only=True)

    class Meta:
        model = models.McapCredentialToServiceToCustomer
        fields = "__all__"


class CreateUsers(serializers.ModelSerializer):
    class Meta:
        model = models.Users
        fields = "__all__"


class Users(serializers.ModelSerializer):
    class Meta:
        model = models.Users
        fields = "__all__"


class CreateTemplates(serializers.ModelSerializer):
    class Meta:
        model = models.Templates
        fields = "__all__"


class Templates(serializers.ModelSerializer):
    class Meta:
        model = models.Templates
        fields = "__all__"


class CreateMonitorLogs(serializers.ModelSerializer):
    class Meta:
        model = models.MonitorLogs
        fields = "__all__"


class MonitorLogs(serializers.ModelSerializer):
    template = Templates(many=False, read_only=True)
    service = Services(many=False, read_only=True)
    user = Users(many=False, read_only=True)
    customer = Customers(many=False, read_only=True)
    service_to_customer = ServiceToCustomer(many=False, read_only=True)

    class Meta:
        model = models.MonitorLogs
        fields = "__all__"


class CreateOrchestratorList(serializers.ModelSerializer):
    class Meta:
        model = models.OrchestratorList
        fields = "__all__"


class OrchestratorList(serializers.ModelSerializer):
    class Meta:
        model = models.OrchestratorList
        fields = "__all__"


class CreateOrchestratorListToServiceToCustomer(serializers.ModelSerializer):
    class Meta:
        model = models.OrchestratorListToServiceToCustomer
        fields = "__all__"


class OrchestratorListToServiceToCustomer(serializers.ModelSerializer):
    orchestrator_list = OrchestratorList(many=False, read_only=True)
    service_to_customer = ServiceToCustomer(many=False, read_only=True)

    class Meta:
        model = models.OrchestratorListToServiceToCustomer
        fields = "__all__"


class CreateProcessResult(serializers.ModelSerializer):
    class Meta:
        model = models.ProcessResult
        fields = "__all__"


class ProcessResult(serializers.ModelSerializer):
    user = Users(many=False, read_only=True)

    class Meta:
        model = models.ProcessResult
        fields = "__all__"


class CreateRoles(serializers.ModelSerializer):
    class Meta:
        model = models.Roles
        fields = "__all__"


class Roles(serializers.ModelSerializer):
    class Meta:
        model = models.Roles
        fields = "__all__"


class CreateRoleToAction(serializers.ModelSerializer):
    class Meta:
        model = models.RoleToAction
        fields = "__all__"


class RoleToAction(serializers.ModelSerializer):
    role = Roles(many=False, read_only=True)
    action = Actions(many=False, read_only=True)

    class Meta:
        model = models.RoleToAction
        fields = "__all__"

class CreateRoleToComponent(serializers.ModelSerializer):
    class Meta:
        model = models.RoleToComponent
        fields = "__all__"


class RoleToComponent(serializers.ModelSerializer):
    role = Roles(many=False, read_only=True)
    component = Components(many=False, read_only=True)

    class Meta:
        model = models.RoleToComponent
        fields = "__all__"

class CreateRoleToService(serializers.ModelSerializer):
    class Meta:
        model = models.RoleToService
        fields = "__all__"


class RoleToService(serializers.ModelSerializer):
    role = Roles(many=False, read_only=True)
    service = Services(many=False, read_only=True)

    class Meta:
        model = models.RoleToService
        fields = "__all__"


class CreateRoleToServiceToCustomer(serializers.ModelSerializer):
    class Meta:
        model = models.RoleToServiceToCustomer
        fields = "__all__"


class RoleToServiceToCustomer(serializers.ModelSerializer):
    role = Roles(many=False, read_only=True)
    service_to_customer = ServiceToCustomer(many=False, read_only=True)

    class Meta:
        model = models.RoleToServiceToCustomer
        fields = "__all__"


class CreateRoleToTemplate(serializers.ModelSerializer):
    class Meta:
        model = models.RoleToTemplate
        fields = "__all__"


class RoleToTemplate(serializers.ModelSerializer):
    template = Templates(many=False, read_only=True)
    role = Roles(many=False, read_only=True)

    class Meta:
        model = models.RoleToTemplate
        fields = "__all__"


class CreateRouteToAction(serializers.ModelSerializer):
    class Meta:
        model = models.RouteToAction
        fields = "__all__"


class RouteToAction(serializers.ModelSerializer):
    action = Actions(many=False, read_only=True)

    class Meta:
        model = models.RouteToAction
        fields = "__all__"


class CreateServiceAttributes(serializers.ModelSerializer):
    class Meta:
        model = models.ServiceAttributes
        fields = "__all__"


class ServiceAttributes(serializers.ModelSerializer):
    class Meta:
        model = models.ServiceAttributes
        fields = "__all__"


class CreateServiceToServiceAttributes(serializers.ModelSerializer):
    class Meta:
        model = models.ServiceToServiceAttributes
        fields = "__all__"


class ServiceToServiceAttributes(serializers.ModelSerializer):
    service_attribute = ServiceAttributes(many=False, read_only=True)
    service = Services(many=False, read_only=True)

    class Meta:
        model = models.ServiceToServiceAttributes
        fields = "__all__"


class CreateTdcData(serializers.ModelSerializer):
    class Meta:
        model = models.TdcData
        fields = "__all__"


class TdcData(serializers.ModelSerializer):
    class Meta:
        model = models.TemplateToService
        fields = "__all__"


class CreateTemplateToService(serializers.ModelSerializer):
    class Meta:
        model = models.TemplateToService
        fields = "__all__"


class TemplateToService(serializers.ModelSerializer):
    template = Templates(many=False, read_only=True)
    service = Services(many=False, read_only=True)

    class Meta:
        model = models.TemplateToService
        fields = "__all__"


class CreateTemplateToServiceToCustomer(serializers.ModelSerializer):
    class Meta:
        model = models.TemplateToServiceToCustomer
        fields = "__all__"


class TemplateToServiceToCustomer(serializers.ModelSerializer):
    template = Templates(many=False, read_only=True)
    service_to_customer = ServiceToCustomer(many=False, read_only=True)

    class Meta:
        model = models.TemplateToServiceToCustomer
        fields = "__all__"


class CreateTemplateToVendor(serializers.ModelSerializer):
    class Meta:
        model = models.TemplateToVendor
        fields = "__all__"


class TemplateToVendor(serializers.ModelSerializer):
    template = Templates(many=False, read_only=True)
    vendor = ConfTemplateVendorTypes(many=False, read_only=True)

    class Meta:
        model = models.TemplateToVendor
        fields = "__all__"


class CreateTransaction(serializers.ModelSerializer):
    class Meta:
        model = models.Transaction
        fields = "__all__"


class Transaction(serializers.ModelSerializer):
    class Meta:
        model = models.Transaction
        fields = "__all__"


class CreateTransactionLogsView(serializers.ModelSerializer):
    class Meta:
        model = models.TransactionLogsView
        fields = "__all__"


class TransactionLogsView(serializers.ModelSerializer):
    class Meta:
        model = models.TransactionLogsView
        fields = "__all__"

class CreateSrReportsView(serializers.ModelSerializer):
    class Meta:
        model = models.SrReportsView
        fields = "__all__"


class SrReportsView(serializers.ModelSerializer):
    class Meta:
        model = models.SrReportsView
        fields = ('transaction_id', 'customer_name', 'service_name', 'action_name', 'hostname', 'change_type', 'requester', 'update_date')


class CreateUserToTemplate(serializers.ModelSerializer):
    class Meta:
        model = models.UserToTemplate
        fields = "__all__"


class UserToTemplate(serializers.ModelSerializer):
    user = Users(many=False, read_only=True)
    template = Templates(many=False, read_only=True)

    class Meta:
        model = models.UserToTemplate
        fields = "__all__"


class CreateUsersToRoles(serializers.ModelSerializer):
    class Meta:
        model = models.UsersToRoles
        fields = "__all__"


class UsersToRoles(serializers.ModelSerializer):
    user = Users(many=False, read_only=True)
    role = Roles(many=False, read_only=True)

    class Meta:
        model = models.UsersToRoles
        fields = "__all__"


class CreateUsersToService(serializers.ModelSerializer):
    class Meta:
        model = models.UsersToService
        fields = "__all__"


class UsersToService(serializers.ModelSerializer):
    user = Users(many=False, read_only=True)
    service = Services(many=False, read_only=True)

    class Meta:
        model = models.UsersToService
        fields = "__all__"


class CreateUsersToServiceToCustomer(serializers.ModelSerializer):
    class Meta:
        model = models.UsersToServiceToCustomer
        fields = "__all__"


class UsersToServiceToCustomer(serializers.ModelSerializer):
    user = Users(many=False, read_only=True)
    service_to_customer = ServiceToCustomer(many=False, read_only=True)

    class Meta:
        model = models.UsersToServiceToCustomer
        fields = "__all__"


class CreateWorkflow(serializers.ModelSerializer):
    class Meta:
        model = models.Workflow
        fields = "__all__"


class Workflow(serializers.ModelSerializer):
    class Meta:
        model = models.Workflow
        fields = "__all__"


class CreateWorkflowAttributes(serializers.ModelSerializer):
    class Meta:
        model = models.WorkflowAttributes
        fields = "__all__"


class WorkflowAttributes(serializers.ModelSerializer):
    class Meta:
        model = models.WorkflowAttributes
        fields = "__all__"


class CreateWorkflowToService(serializers.ModelSerializer):
    class Meta:
        model = models.WorkflowToService
        fields = "__all__"


class WorkflowToService(serializers.ModelSerializer):
    workflow = Workflow(many=False, read_only=True)
    service = Services(many=False, read_only=True)

    class Meta:
        model = models.WorkflowToService
        fields = "__all__"


class CreateWorkflowToTemplate(serializers.ModelSerializer):
    class Meta:
        model = models.WorkflowToTemplate
        fields = "__all__"


class WorkflowToTemplate(serializers.ModelSerializer):
    workflow = Workflow(many=False, read_only=True)
    template = Templates(many=False, read_only=True)

    class Meta:
        model = models.WorkflowToTemplate
        fields = "__all__"


class CreateWorkflowToWorkflowAttributes(serializers.ModelSerializer):
    class Meta:
        model = models.WorkflowToWorkflowAttributes
        fields = "__all__"


class WorkflowToWorkflowAttributes(serializers.ModelSerializer):
    workflow = Workflow(many=False, read_only=True)
    workflow_attribute = WorkflowAttributes(many=False, read_only=True)

    class Meta:
        model = models.WorkflowToWorkflowAttributes
        fields = "__all__"


class CreateSequelizedata(serializers.ModelSerializer):
    class Meta:
        model = models.Sequelizedata
        fields = "__all__"


class Sequelizedata(serializers.ModelSerializer):
    class Meta:
        model = models.Sequelizedata
        fields = "__all__"


class CreateSequelizemeta(serializers.ModelSerializer):
    class Meta:
        model = models.Sequelizemeta
        fields = "__all__"


class CreateSequelizemeta(serializers.ModelSerializer):
    class Meta:
        model = models.Sequelizemeta
        fields = "__all__"


class CreateSession(serializers.ModelSerializer):
    class Meta:
        model = models.Session
        fields = "__all__"


class Session(serializers.ModelSerializer):
    class Meta:
        model = models.Session
        fields = "__all__"
