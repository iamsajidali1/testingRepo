# This is an auto-generated Django model module.
# You"ll have to do the following manually to clean this up:
#   * Rearrange models" order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to
#     the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create,
#     modify, and delete the table
# Feel free to rename the models, but don"t rename db_table values or field
# names.
from django.db import models


class ActionDataCustomers(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    action_data_cus_id = models.CharField(
        db_column="ACTION_DATA_CUS_ID", max_length=255
    )
    # Field name made lowercase.
    action_data_cus_name = models.CharField(
        db_column="ACTION_DATA_CUS_NAME", max_length=255, blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_action_data_customers"


class ActionDataToServiceToCustomer(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    action_data = models.ForeignKey(
        ActionDataCustomers, models.DO_NOTHING, db_column="ACTION_DATA_ID",
        blank=True, null=True
    )
    # Field name made lowercase.
    service_to_customer = models.ForeignKey(
        "ServiceToCustomer", models.DO_NOTHING,
        db_column="SERVICE_TO_CUSTOMER_ID", blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_action_data_to_service_to_customer"
        unique_together = (("action_data", "service_to_customer"),)


class Actions(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    name = models.CharField(
        db_column="NAME", max_length=100, blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_actions"


class BcContext(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    session = models.CharField(db_column="SESSION", max_length=128)
    # Field name made lowercase.
    gda_session = models.CharField(db_column="GDA_SESSION", max_length=64)
    # Field name made lowercase.
    user_id = models.CharField(db_column="USER_ID", max_length=64)
    # Field name made lowercase.
    user_email = models.CharField(db_column="USER_EMAIL", max_length=64)
    # Field name made lowercase.
    company_id = models.CharField(db_column="COMPANY_ID", max_length=64)
    # Field name made lowercase.
    company_name = models.CharField(db_column="COMPANY_NAME", max_length=64)
    # Field name made lowercase.
    active = models.IntegerField(db_column="ACTIVE")

    class Meta:
        managed = False
        db_table = "css_bc_context"
        unique_together = (("session", "gda_session"),)

class CachedDevicesData(models.Model):
    # Field name made lowercase.
    id = models.CharField(db_column="ID", max_length=100, primary_key=True)
    # Field name made lowercase.
    hostname = models.CharField(db_column="HOSTNAME", max_length=100)
    # Field name made lowercase.
    type = models.CharField(db_column="TYPE", max_length=100)
    # Field name made lowercase.
    category = models.CharField(db_column="CATEGORY", max_length=100)
    # Field name made lowercase.
    partnum = models.CharField(db_column="PARTNUM", max_length=100)
    # Field name made lowercase.
    vendor = models.CharField(db_column="VENDOR", max_length=100)
    # Field name made lowercase.
    service = models.CharField(db_column="SERVICE", max_length=100)
    # Field name made lowercase.
    address = models.CharField(db_column="ADDRESS", max_length=255)
    # Field name made lowercase.
    city = models.CharField(db_column="CITY", max_length=100)
    # Field name made lowercase.
    state = models.CharField(db_column="STATE", max_length=100)
    # Field name made lowercase.
    zip = models.CharField(db_column="ZIP", max_length=100)
    # Field name made lowercase.
    country = models.CharField(db_column="COUNTRY", max_length=100)
    # Field name made lowercase.
    grua = models.CharField(db_column="GRUA", max_length=100)
    # Field name made lowercase.
    serviceName = models.CharField(db_column="SERVICE_NAME", max_length=100)
    # Field name made lowercase.
    createdat = models.DateTimeField(db_column="createdAt")
    # Field name made lowercase.
    updatedat = models.DateTimeField(db_column="updatedAt")

    class Meta:
        managed = False
        db_table = "css_cached_devices_data"

class CarcheGeneratedConfig(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    template_file = models.CharField(db_column="TEMPLATE_FILE", max_length=255)
    # Field name made lowercase.
    carche_data = models.TextField(db_column="CARCHE_DATA")
    # Field name made lowercase.
    template_uuid = models.CharField(db_column="TEMPLATE_UUID", max_length=255)
    # Field name made lowercase.
    generated_template = models.TextField(
        db_column="GENERATED_TEMPLATE", blank=True, null=True
    )
    # Field name made lowercase.
    createdat = models.DateTimeField(db_column="createdAt")
    # Field name made lowercase.
    updatedat = models.DateTimeField(db_column="updatedAt")
    # Field name made lowercase.
    session_id = models.CharField(
        db_column="SESSION_ID", max_length=255, blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_carche_generated_config"


class Components(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    key = models.CharField(db_column="KEY", max_length=100, unique=True)
    # Field name made lowercase.
    name = models.CharField(db_column="NAME", max_length=255, null=True, blank=True)
    # Field name made lowercase.
    type = models.CharField(db_column="TYPE", max_length=100)

    class Meta:
        managed = False
        db_table = "css_app_components"


class ConfTemplateContentTypes(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    content_type = models.CharField(db_column="CONTENT_TYPE", max_length=255)

    class Meta:
        managed = False
        db_table = "css_conf_template_content_types"


class ConfTemplateTypes(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    template_type = models.CharField(db_column="TEMPLATE_TYPE", max_length=255)

    class Meta:
        managed = False
        db_table = "css_conf_template_types"


class ConfTemplateVendorTypes(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    vendor_type = models.CharField(db_column="VENDOR_TYPE", max_length=255)

    class Meta:
        managed = False
        db_table = "css_conf_template_vendor_types"


class Customers(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    name = models.CharField(db_column="NAME", max_length=150)
    # Field name made lowercase.
    bc_company_id = models.CharField(
        db_column="BC_COMPANY_ID", max_length=150, blank=True, null=True
    )
    # Field name made lowercase.
    bc_name = models.CharField(
        db_column="BC_NAME", max_length=255, blank=True, null=True
    )
    # Field name made lowercase.
    active = models.IntegerField(db_column="ACTIVE", blank=True, null=True)
    # Field name made lowercase.
    cr_web_id = models.CharField(
        db_column="CRWEB_ID", max_length=120, blank=True, null=True
    )

    # Field name made lowercase.
    msim_email = models.CharField(
        db_column="MSIM_EMAIL", max_length=120, blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_customers"


class DataCollection(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    collected_data = models.TextField(db_column="COLLECTED_DATA")
    # Field name made lowercase.
    createdat = models.DateTimeField(db_column="createdAt")
    # Field name made lowercase.
    updatedat = models.DateTimeField(db_column="updatedAt")

    class Meta:
        managed = False
        db_table = "css_data_collection"


class DataTemplates(models.Model):
    # Field name made lowercase.
    id = models.AutoField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    action_id = models.ForeignKey(
        "Templates", models.DO_NOTHING, db_column="ACTION_ID", null=False)
    # Field name made lowercase.
    customer_id = models.ForeignKey(
        "Customers", models.DO_NOTHING, db_column="CUSTOMER_ID",
        blank=True, null=True
    )
    # Field name made lowercase.
    service_id =  models.ForeignKey(
        "Services", models.DO_NOTHING, db_column="SERVICE_ID",
        blank=True, null=True
    )
    # Field name made lowercase.
    name = models.TextField(db_column="NAME", max_length=100, blank=False, null=False)
    # Field name made lowercase.
    data = models.JSONField(db_column="DATA")
    # Field name made lowercase.
    active = models.BooleanField(db_column="ACTIVE", null=False, default=True)
    # Field name made lowercase.
    createdat = models.DateTimeField(db_column="createdAt")
    # Field name made lowercase.
    updatedat = models.DateTimeField(db_column="updatedAt")

    class Meta:
        managed = False
        db_table = "css_data_templates"


class GruaData(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    grua = models.CharField(
        db_column="GRUA", max_length=255, blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_grua_data"


class GruaDataToCustomer(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    grua = models.ForeignKey(
        GruaData, models.DO_NOTHING, db_column="GRUA_ID",
        blank=True, null=True
    )
    # Field name made lowercase.
    customer = models.ForeignKey(
        Customers, models.DO_NOTHING, db_column="CUSTOMER_ID",
        blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_grua_data_to_customer"
        unique_together = (("grua", "customer"),)


class Error(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    message = models.TextField(db_column="MESSAGE", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "css_error"


class GpsData(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    gps_name = models.CharField(
        db_column="GPS_NAME", max_length=255, blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_gps_data"


class GpsDataToCustTest(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    gps_data = models.ForeignKey(
        GpsData, models.DO_NOTHING, db_column="GPS_DATA_ID",
        blank=True, null=True
    )
    # Field name made lowercase.
    customer = models.ForeignKey(
        Customers, models.DO_NOTHING, db_column="CUSTOMER_ID",
        blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_gps_data_to_cust_test"


class GpsDataToCustomer(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    gps_data = models.ForeignKey(
        GpsData, models.DO_NOTHING, db_column="GPS_DATA_ID"
    )
    # Field name made lowercase.
    customer = models.ForeignKey(
        Customers, models.DO_NOTHING, db_column="CUSTOMER_ID"
    )

    class Meta:
        managed = False
        db_table = "css_gps_data_to_customer"
        unique_together = (("gps_data", "customer"),)


class GpsDataToServiceToCustomer(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    gps_data = models.ForeignKey(
        GpsData, models.DO_NOTHING, db_column="GPS_DATA_ID",
        blank=True, null=True
    )
    # Field name made lowercase.
    service_to_customer = models.ForeignKey(
        "ServiceToCustomer", models.DO_NOTHING,
        db_column="SERVICE_TO_CUSTOMER_ID", blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_gps_data_to_service_to_customer"


class LeamData(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    leam_id = models.CharField(db_column="LEAM_ID", max_length=255)

    class Meta:
        managed = False
        db_table = "css_leam_data"


class LeamDataToServiceToCustomer(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    leam_data = models.ForeignKey(
        LeamData, models.DO_NOTHING, db_column="LEAM_DATA_ID",
        blank=True, null=True
    )
    # Field name made lowercase.
    service_to_customer = models.ForeignKey(
        "ServiceToCustomer", models.DO_NOTHING,
        db_column="SERVICE_TO_CUSTOMER_ID", blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_leam_data_to_service_to_customer"
        unique_together = (("leam_data", "service_to_customer"),)


class LogRequest(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    remote_addr = models.CharField(
        db_column="REMOTE_ADDR", max_length=50, blank=True, null=True
    )
    # Field name made lowercase.
    date = models.DateTimeField(db_column="DATE", blank=True, null=True)
    # Field name made lowercase.
    method = models.CharField(
        db_column="METHOD", max_length=50, blank=True, null=True
    )
    # Field name made lowercase.
    url = models.TextField(db_column="URL", blank=True, null=True)
    # Field name made lowercase.
    status = models.IntegerField(db_column="STATUS", blank=True, null=True)
    # Field name made lowercase.
    body = models.TextField(db_column="BODY", blank=True, null=True)
    # Field name made lowercase.
    request_body = models.TextField(
        db_column="REQUEST_BODY", blank=True, null=True
    )
    # Field name made lowercase.
    session = models.CharField(
        db_column="SESSION", max_length=255, blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_log_request"


class McapCredential(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    credential = models.CharField(
        db_column="CREDENTIAL", max_length=255, blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_mcap_credential"


class McapCredentialToServiceToCustomer(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    mcap_credential = models.ForeignKey(
        McapCredential, models.DO_NOTHING,
        db_column="MCAP_CREDENTIAL_ID", blank=True, null=True
    )
    # Field name made lowercase.
    service_to_customer = models.ForeignKey(
        "ServiceToCustomer", models.DO_NOTHING,
        db_column="SERVICE_TO_CUSTOMER_ID", blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_mcap_credential_to_service_to_customer"
        unique_together = (("mcap_credential", "service_to_customer"),)


class MonitorLogs(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    status = models.TextField(db_column="STATUS")
    # Field name made lowercase.
    transaction_id = models.CharField(
        db_column="TRANSACTION_ID", max_length=255
    )
    # Field name made lowercase.
    is_external_customer = models.IntegerField(
        db_column="IS_EXTERNAL_CUSTOMER", blank=True, null=True
    )
    # Field name made lowercase.
    hostname = models.TextField(db_column="HOSTNAME", blank=True, null=True)
    # Field name made lowercase.
    orchestrator_response = models.TextField(
        db_column="ORCHESTRATOR_RESPONSE", blank=True, null=True
    )
    # Field name made lowercase.
    mcap_transaction_id = models.CharField(
        db_column="MCAP_TRANSACTION_ID", max_length=255, blank=True, null=True
    )
    # Field name made lowercase.
    carche_transaction_id = models.CharField(
        db_column="CARCHE_TRANSACTION_ID", max_length=255,
        blank=True, null=True
    )
    # Field name made lowercase.
    collected_data = models.TextField(
        db_column="COLLECTED_DATA", blank=True, null=True
    )
    # Field name made lowercase.
    template = models.ForeignKey(
        "Templates", models.DO_NOTHING, db_column="TEMPLATE_ID",
        blank=True, null=True
    )
    # Field name made lowercase.
    service = models.ForeignKey(
        "Services", models.DO_NOTHING, db_column="SERVICE_ID",
        blank=True, null=True
    )
    # Field name made lowercase.
    user = models.ForeignKey(
        "Users", models.DO_NOTHING, db_column="USER_ID",
        blank=True, null=True
    )
    # Field name made lowercase.
    customer = models.ForeignKey(
        Customers, models.DO_NOTHING, db_column="CUSTOMER_ID",
        blank=True, null=True
    )
    # Field name made lowercase.
    service_to_customer = models.ForeignKey(
        "ServiceToCustomer", models.DO_NOTHING,
        db_column="SERVICE_TO_CUSTOMER_ID", blank=True, null=True
    )
    # Field name made lowercase.
    createdat = models.DateTimeField(db_column="createdAt")
    # Field name made lowercase.
    updatedat = models.DateTimeField(db_column="updatedAt")

    class Meta:
        managed = False
        db_table = "css_monitor_logs"


class OrchestratorList(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    url = models.CharField(db_column="URL", max_length=255)
    # Field name made lowercase.
    tenant_id = models.CharField(
        db_column="TENANT_ID", max_length=50, blank=True, null=True
    )
    tags =  models.TextField(
        db_column="TAGS", blank=True, null=True
    )
    config_yaml =  models.TextField(
        db_column="CONFIG_YAML", blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_orchestrator_list"


class OrchestratorListToServiceToCustomer(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    orchestrator_list = models.ForeignKey(
        OrchestratorList, models.DO_NOTHING,
        db_column="ORCHESTRATOR_LIST_ID", blank=True, null=True
    )
    # Field name made lowercase.
    service_to_customer = models.ForeignKey(
        "ServiceToCustomer", models.DO_NOTHING,
        db_column="SERVICE_TO_CUSTOMER_ID", blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_orchestrator_list_to_service_to_customer"
        unique_together = (("orchestrator_list", "service_to_customer"),)


class ProcessResult(models.Model):
    id = models.AutoField(db_column="ID", primary_key=True)
    mongo_id = models.TextField(db_column="MONGO_ID", blank=True, null=True)
    result = models.TextField(db_column="RESULT", blank=True, null=True)
    status = models.CharField(
        db_column="STATUS", max_length=120, blank=True, null=True
    )
    code = models.CharField(
        db_column="CODE", max_length=120, blank=True, null=True
    )
    result_type = models.CharField(
        db_column="RESULT_TYPE", max_length=120, blank=True, null=True
    )
    special_return_type = models.TextField(
        db_column="SPECIAL_RETURN_TYPE", blank=True, null=True
    )
    special_result = models.TextField(
        db_column="SPECIAL_RESULT", blank=True, null=True
    )
    user = models.ForeignKey(
        "Users", models.CASCADE, db_column="USER_ID",
        blank=True, null=True
    )
    upm_permission_id = models.IntegerField(
        db_column="UPM_PERMISSION_ID", blank=True, null=True
    )
    createdat = models.DateTimeField(db_column="createdAt", auto_now_add=True)
    updatedat = models.DateTimeField(db_column="updatedAt", auto_now=True)

    class Meta:
        managed = True
        db_table = "css_process_result"


class RoleToAction(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    role = models.ForeignKey(
        "Roles", models.DO_NOTHING, db_column="ROLE_ID",
        blank=True, null=True
    )
    # Field name made lowercase.
    action = models.ForeignKey(
        Actions, models.DO_NOTHING, db_column="ACTION_ID",
        blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_role_to_action"
        unique_together = (("role", "action"),)


class RoleToService(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    role = models.ForeignKey(
        "Roles", models.DO_NOTHING, db_column="ROLE_ID",
        blank=True, null=True
    )
    # Field name made lowercase.
    service = models.ForeignKey(
        "Services", models.DO_NOTHING, db_column="SERVICE_ID",
        blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_role_to_service"
        unique_together = (("role", "service"),)


class RoleToComponent(models.Model):
    # Field name made lowercase.
    id = models.AutoField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    role = models.ForeignKey(
        "Roles", models.DO_NOTHING, db_column="ROLE_ID",
        blank=True, null=True
    )
    # Field name made lowercase.
    component = models.ForeignKey(
        "Components", models.DO_NOTHING, to_field="key", db_column="COMPONENT_KEY",
        blank=True, null=True
    )
    # Field name made lowercase.
    accessType = models.CharField(
        db_column="ACCESS_TYPE", max_length=100, blank=False, null=False
    )

    class Meta:
        managed = False
        db_table = "css_role_to_component_access"
        unique_together = (("role", "component"),)


class RoleToServiceToCustomer(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    role = models.ForeignKey(
        "Roles", models.DO_NOTHING, db_column="ROLE_ID",
        blank=True, null=True
    )
    # Field name made lowercase.
    service_to_customer = models.ForeignKey(
        "ServiceToCustomer", models.DO_NOTHING,
        db_column="SERVICE_TO_CUSTOMER_ID", blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_role_to_service_to_customer"
        unique_together = (("role", "service_to_customer"),)


class RoleToTemplate(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    template = models.ForeignKey(
        "Templates", models.DO_NOTHING, db_column="TEMPLATE_ID",
        blank=True, null=True
    )
    # Field name made lowercase.
    role = models.ForeignKey(
        "Roles", models.DO_NOTHING, db_column="ROLE_ID",
        blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_role_to_template"
        unique_together = (("role", "template"),)


class Roles(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    identificator = models.CharField(
        db_column="IDENTIFICATOR", max_length=100, blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_roles"


class RouteToAction(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    route = models.CharField(
        db_column="ROUTE", max_length=120, blank=True, null=True
    )
    # Field name made lowercase.
    action = models.ForeignKey(
        Actions, models.DO_NOTHING, db_column="ACTION_ID",
        blank=True, null=True
    )
    # Field name made lowercase.
    method = models.CharField(
        db_column="METHOD", max_length=20, blank=True, null=True
    )
    # Field name made lowercase.
    scheduler = models.IntegerField(db_column="SCHEDULER")
    # Field name made lowercase.
    type = models.CharField(
        db_column="TYPE", max_length=20, blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_route_to_action"


class ServiceAttributes(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    name = models.CharField(
        db_column="NAME", max_length=150, blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_service_attributes"


class ServiceToCustomer(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    customer = models.ForeignKey(
        Customers, models.DO_NOTHING, db_column="CUSTOMER_ID",
        blank=True, null=True
    )
    # Field name made lowercase.
    service = models.ForeignKey(
        "Services", models.DO_NOTHING, db_column="SERVICE_ID",
        blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_service_to_customer"
        unique_together = (("customer", "service"),)


class ServiceToServiceAttributes(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    service_attribute = models.ForeignKey(
        ServiceAttributes, models.DO_NOTHING,
        db_column="SERVICE_ATTRIBUTE_ID"
    )
    # Field name made lowercase.
    service = models.ForeignKey(
        "Services", models.DO_NOTHING, db_column="SERVICE_ID"
    )

    class Meta:
        managed = False
        db_table = "css_service_to_service_attributes"
        unique_together = (("service_attribute", "service"),)


class Services(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    service_name = models.CharField(
        db_column="SERVICE_NAME", max_length=150, blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_services"

class TdcData(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    device = models.CharField(db_column="DEVICE", max_length=100)
    # Field name made lowercase.
    glid = models.CharField(db_column="GLID", max_length=100)
    # Field name made lowercase.
    callbackurl = models.CharField(db_column="CALLBACK_URL", max_length=100)
    # Field name made lowercase.
    sr = models.CharField(db_column="SR", max_length=100)
    # Field name made lowercase.
    status = models.CharField(db_column="STATUS", max_length=100)
    # Field name made lowercase.
    address = models.TextField(db_column="ADDRESS", blank=True, null=False)
    # Field name made lowercase.
    city = models.TextField(db_column="CITY", blank=True, null=False)
    # Field name made lowercase.
    state = models.TextField(db_column="STATE", blank=True, null=False)
    # Field name made lowercase.
    zip = models.IntegerField(db_column="ZIP", blank=True, null=False)
    # Field name made lowercase.
    country = models.TextField(db_column="COUNTRY", blank=True, null=False)
    # Field name made lowercase.
    active = models.BooleanField(db_column="ENABLED", null=False, default=True)


class TemplateToService(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    template = models.ForeignKey(
        "Templates", models.DO_NOTHING, db_column="TEMPLATE_ID",
        blank=True, null=True
    )
    # Field name made lowercase.
    service = models.ForeignKey(
        Services, models.DO_NOTHING, db_column="SERVICE_ID",
        blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_template_to_service"
        unique_together = (("template", "service"),)


class TemplateToServiceToCustomer(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    template = models.ForeignKey(
        "Templates", models.DO_NOTHING, db_column="TEMPLATE_ID",
        blank=True, null=True
    )
    # Field name made lowercase.
    service_to_customer = models.ForeignKey(
        ServiceToCustomer, models.DO_NOTHING,
        db_column="SERVICE_TO_CUSTOMER_ID", blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_template_to_service_to_customer"
        unique_together = (("template", "service_to_customer"),)


class TemplateToVendor(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    template = models.ForeignKey(
        "Templates", models.DO_NOTHING, db_column="TEMPLATE_ID",
        blank=True, null=True
    )
    # Field name made lowercase.
    vendor = models.ForeignKey(
        ConfTemplateVendorTypes, models.DO_NOTHING, db_column="VENDOR_ID",
        blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_template_to_vendor"
        unique_together = (("template", "vendor"),)


class Templates(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    name = models.CharField(db_column="NAME", max_length=40)
    # Field name made lowercase.
    questions = models.TextField(db_column="QUESTIONS", blank=True, null=True)
    # Field name made lowercase.
    validation = models.TextField(
        db_column="VALIDATION", blank=True, null=True
    )
    # Field name made lowercase.
    description = models.TextField(db_column="DESCRIPTION")
    # Field name made lowercase.
    statichostnamecheckbox = models.IntegerField(
        db_column="STATICHOSTNAMECHECKBOX"
    )
    # Field name made lowercase.
    carchetemplate = models.TextField(
        db_column="CARCHETEMPLATE", blank=True, null=True
    )
    # Field name made lowercase.
    statichostname = models.TextField(
        db_column="STATICHOSTNAME", blank=True, null=True
    )
     # Field name made lowercase.
    apiendpoint = models.TextField(
        db_column="API_ENDPOINT", blank=True, null=True
    )
    minrollbacktimer = models.TextField(
        db_column="MIN_ROLLBACK_TIMER", blank=True, null=True
    )
    maxrollbacktimer = models.TextField(
        db_column="MAX_ROLLBACK_TIMER", blank=True, null=True
    )
    # Field name made lowercase.
    createdat = models.DateTimeField(db_column="createdAt")
    # Field name made lowercase.
    updatedat = models.DateTimeField(db_column="updatedAt")

    class Meta:
        managed = False
        db_table = "css_templates"


class Transaction(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    data = models.TextField(db_column="DATA", blank=True, null=True)
    # Field name made lowercase.
    user_id = models.CharField(
        db_column="USER_ID", max_length=64, blank=True, null=True
    )
    # Field name made lowercase.
    route = models.CharField(
        db_column="ROUTE", max_length=120, blank=True, null=True
    )
    # Field name made lowercase.
    session_id = models.CharField(db_column="SESSION_ID", max_length=255)
    # Field name made lowercase.
    is_active = models.IntegerField(
        db_column="IS_ACTIVE", blank=True, null=True
    )
    # Field name made lowercase.
    createdat = models.DateTimeField(db_column="createdAt")
    # Field name made lowercase.
    updatedat = models.DateTimeField(db_column="updatedAt")

    class Meta:
        managed = False
        db_table = "css_transaction"


class TransactionLogsView(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    transaction_id = models.JSONField(
        db_column="TRANSACTION_ID", blank=True, null=True
    )
    # Field name made lowercase.
    session_id = models.CharField(
        db_column="SESSION_ID", max_length=255,
        db_collation="latin1_swedish_ci"
    )
    # Field name made lowercase.
    customer_id = models.PositiveBigIntegerField(
        db_column="CUSTOMER_ID", blank=True, null=True
    )
    # Field name made lowercase.
    customer_name = models.CharField(
        db_column="CUSTOMER_NAME", max_length=150,
        db_collation="latin1_swedish_ci"
    )
    # Field name made lowercase.
    bc_customer_id = models.CharField(
        db_column="BC_CUSTOMER_ID", max_length=150,
        db_collation="latin1_swedish_ci", blank=True, null=True
    )
    # Field name made lowercase.
    service_id = models.PositiveBigIntegerField(
        db_column="SERVICE_ID", blank=True, null=True
    )
    # Field name made lowercase.
    service_name = models.CharField(
        db_column="SERVICE_NAME", max_length=150,
        db_collation="latin1_swedish_ci", blank=True, null=True
    )
    # Field name made lowercase.
    servicetocustomer_id = models.PositiveBigIntegerField(
        db_column="SERVICETOCUSTOMER_ID", blank=True, null=True
    )
    # Field name made lowercase.
    action_id = models.PositiveBigIntegerField(
        db_column="ACTION_ID", blank=True, null=True
    )
    # Field name made lowercase.
    action_name = models.CharField(
        db_column="ACTION_NAME", max_length=40,
        db_collation="latin1_swedish_ci", blank=True, null=True
    )
    # Field name made lowercase.
    hostname = models.JSONField(db_column="HOSTNAME", blank=True, null=True)
    # Field name made lowercase.
    dms_server = models.JSONField(
        db_column="DMS_SERVER", blank=True, null=True
    )
    # Field name made lowercase.
    vendor_type_id = models.PositiveBigIntegerField(
        db_column="VENDOR_TYPE_ID", blank=True, null=True
    )
    # Field name made lowercase.
    vendor_type = models.CharField(
        db_column="VENDOR_TYPE", max_length=255,
        db_collation="latin1_swedish_ci", blank=True, null=True
    )
    # Field name made lowercase.
    change_type_id = models.PositiveBigIntegerField(
        db_column="CHANGE_TYPE_ID", blank=True, null=True
    )
    # Field name made lowercase.
    change_type = models.CharField(
        db_column="CHANGE_TYPE", max_length=150,
        db_collation="latin1_swedish_ci", blank=True, null=True
    )
    # Field name made lowercase.
    mcap_credential_id = models.JSONField(
        db_column="MCAP_CREDENTIAL_ID", blank=True, null=True
    )
    # Field name made lowercase.
    step = models.JSONField(db_column="STEP", blank=True, null=True)
    # Field name made lowercase.
    status = models.JSONField(db_column="STATUS", blank=True, null=True)
    # Field name made lowercase.
    config_mcap_id = models.JSONField(
        db_column="CONFIG_MCAP_ID", blank=True, null=True
    )
    # Field name made lowercase.
    config_template_uuid = models.JSONField(
        db_column="CONFIG_TEMPLATE_UUID", blank=True, null=True
    )
    # Field name made lowercase.
    config_template_id = models.JSONField(
        db_column="CONFIG_TEMPLATE_ID", blank=True, null=True
    )
    # Field name made lowercase.
    config_template_name = models.JSONField(
        db_column="CONFIG_TEMPLATE_NAME", blank=True, null=True
    )
    # Field name made lowercase.
    requester = models.CharField(
        db_column="REQUESTER", max_length=64,
        db_collation="latin1_swedish_ci", blank=True, null=True
    )
    # Field name made lowercase.
    create_date = models.DateTimeField(db_column="CREATE_DATE")
    # Field name made lowercase.
    update_date = models.DateTimeField(db_column="UPDATE_DATE")

    class Meta:
        managed = False  # Created from a view. Don"t remove.
        db_table = "css_transaction_logs_view"


class SrReportsView(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    transaction_id = models.JSONField(
        db_column="TRANSACTION_ID", blank=True, null=True
    )
    # Field name made lowercase.
    customer_id = models.PositiveBigIntegerField(
        db_column="CUSTOMER_ID", blank=True, null=True
    )
    # Field name made lowercase.
    customer_name = models.CharField(
        db_column="CUSTOMER_NAME", max_length=150,
        db_collation="latin1_swedish_ci"
    )
    # Field name made lowercase.
    bc_customer_id = models.CharField(
        db_column="BC_CUSTOMER_ID", max_length=150,
        db_collation="latin1_swedish_ci", blank=True, null=True
    )
    # Field name made lowercase.
    service_id = models.PositiveBigIntegerField(
        db_column="SERVICE_ID", blank=True, null=True
    )
    # Field name made lowercase.
    service_name = models.CharField(
        db_column="SERVICE_NAME", max_length=150,
        db_collation="latin1_swedish_ci", blank=True, null=True
    )
    # Field name made lowercase.
    servicetocustomer_id = models.PositiveBigIntegerField(
        db_column="SERVICETOCUSTOMER_ID", blank=True, null=True
    )
    # Field name made lowercase.
    action_id = models.PositiveBigIntegerField(
        db_column="ACTION_ID", blank=True, null=True
    )
    # Field name made lowercase.
    action_name = models.CharField(
        db_column="ACTION_NAME", max_length=40,
        db_collation="latin1_swedish_ci", blank=True, null=True
    )
    # Field name made lowercase.
    hostname = models.JSONField(db_column="HOSTNAME", blank=True, null=True)
    # Field name made lowercase.
    change_type_id = models.PositiveBigIntegerField(
        db_column="CHANGE_TYPE_ID", blank=True, null=True
    )
    # Field name made lowercase.
    change_type = models.CharField(
        db_column="CHANGE_TYPE", max_length=150,
        db_collation="latin1_swedish_ci", blank=True, null=True
    )
    # Field name made lowercase.
    requester = models.CharField(
        db_column="REQUESTER", max_length=64,
        db_collation="latin1_swedish_ci", blank=True, null=True
    )
    # Field name made lowercase.
    create_date = models.DateTimeField(db_column="CREATE_DATE")
    # Field name made lowercase.
    update_date = models.DateTimeField(db_column="UPDATE_DATE")

    class Meta:
        managed = False  # Created from a view. Don"t remove.
        db_table = "css_sr_reports_view"

class UserToTemplate(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    user = models.ForeignKey(
        "Users", models.DO_NOTHING, db_column="USER_ID",
        blank=True, null=True
    )
    # Field name made lowercase.
    template = models.ForeignKey(
        Templates, models.DO_NOTHING, db_column="TEMPLATE_ID",
        blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_user_to_template"
        unique_together = (("template", "user"),)


class Users(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    name = models.CharField(
        db_column="NAME", max_length=150, blank=True, null=True
    )
    # Field name made lowercase.
    attuid = models.CharField(
        db_column="ATTUID", max_length=6, blank=True, null=True
    )
    # Field name made lowercase.
    bc_user_id = models.CharField(
        db_column="BC_USER_ID", max_length=150, blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_users"


class UsersToRoles(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    user = models.ForeignKey(
        Users, models.DO_NOTHING, db_column="USER_ID", blank=True, null=True
    )
    # Field name made lowercase.
    role = models.ForeignKey(
        Roles, models.DO_NOTHING, db_column="ROLE_ID", blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_users_to_roles"
        unique_together = (("role", "user"),)


class UsersToService(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    user = models.ForeignKey(
        Users, models.DO_NOTHING, db_column="USER_ID", blank=True, null=True
    )
    # Field name made lowercase.
    service = models.ForeignKey(
        Services, models.DO_NOTHING, db_column="SERVICE_ID",
        blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_users_to_service"
        unique_together = (("service", "user"),)


class UsersToServiceToCustomer(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    user = models.ForeignKey(
        Users, models.DO_NOTHING, db_column="USER_ID", blank=True, null=True
    )
    # Field name made lowercase.
    service_to_customer = models.ForeignKey(
        ServiceToCustomer, models.DO_NOTHING,
        db_column="SERVICE_TO_CUSTOMER_ID", blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_users_to_service_to_customer"
        unique_together = (("service_to_customer", "user"),)


class Workflow(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    name = models.CharField(
        db_column="NAME", max_length=150, blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_workflow"


class WorkflowAttributes(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    name = models.CharField(
        db_column="NAME", max_length=150, blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_workflow_attributes"


class WorkflowToService(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    workflow = models.ForeignKey(
        Workflow, models.DO_NOTHING, db_column="WORKFLOW_ID",
        blank=True, null=True
    )
    # Field name made lowercase.
    service = models.ForeignKey(
        Services, models.DO_NOTHING, db_column="SERVICE_ID",
        blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_workflow_to_service"
        unique_together = (("service", "workflow"),)


class WorkflowToTemplate(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    workflow = models.ForeignKey(
        Workflow, models.DO_NOTHING, db_column="WORKFLOW_ID",
        blank=True, null=True
    )
    # Field name made lowercase.
    template = models.ForeignKey(
        Templates, models.DO_NOTHING, db_column="TEMPLATE_ID",
        blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_workflow_to_template"
        unique_together = (("workflow", "template"),)


class WorkflowToWorkflowAttributes(models.Model):
    # Field name made lowercase.
    id = models.IntegerField(db_column="ID", primary_key=True)
    # Field name made lowercase.
    workflow = models.ForeignKey(
        Workflow, models.DO_NOTHING, db_column="WORKFLOW_ID",
        blank=True, null=True
    )
    # Field name made lowercase.
    workflow_attribute = models.ForeignKey(
        WorkflowAttributes, models.DO_NOTHING,
        db_column="WORKFLOW_ATTRIBUTE_ID", blank=True, null=True
    )
    # Field name made lowercase.
    status = models.CharField(
        db_column="STATUS", max_length=15, blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "css_workflow_to_workflow_attributes"


class Sequelizedata(models.Model):
    name = models.CharField(primary_key=True, max_length=255)

    class Meta:
        managed = False
        db_table = "sequelizedata"


class Sequelizemeta(models.Model):
    name = models.CharField(primary_key=True, max_length=255)

    class Meta:
        managed = False
        db_table = "sequelizemeta"


class Session(models.Model):
    sid = models.CharField(primary_key=True, max_length=36)
    expires = models.DateTimeField(blank=True, null=True)
    data = models.TextField(blank=True, null=True)
    # Field name made lowercase.
    createdat = models.DateTimeField(db_column="createdAt")
    # Field name made lowercase.
    updatedat = models.DateTimeField(db_column="updatedAt")

    class Meta:
        managed = False
        db_table = "session"
