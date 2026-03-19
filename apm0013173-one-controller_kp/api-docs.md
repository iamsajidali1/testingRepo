# CSS (Customer Self Service) - API Documentation - CSSAPI

## Form template

### Load form templates ids and names by customer id

`GET` `/form-templates/names/customer-id/:id`

app.route('/getFormTemplateNamesByCustomerId/:id')
    .get(formController.getFormTemplateNamesByCustomerId);

Params:
* `id` - required, represent the customer Id

Body:
* NONE

Permissions:
* NONE

Response:
```javascript
[
    {
        id: "formTemplateId",        //string
        name: "formTemplateName"     //string
    },
    ...
]
```

Errors:
Error (`CODE 400`):
```javascript
{
    code: "400",
    message: "Customer id is not provided"
}
```

Notes:
* Should return empty array if there is not defined any from templates which is related with customer id

### Load form template by template id
`GET` `/form-template/:id`

app.route('/getTemplateNameByMONGO_ID/')
    .post(formController.get_template_name_by_MONGO_ID);

app.route('/formTemplate/:id')
    .get(formController.loadFormTemplateById)

Params:
* `id` - required, represent the template Id

Body:
* NONE

Permissions:
* NONE

Response:
```javascript
{
    name: "formTemplateName",               //string
    created_date: "createdDate",            //date
    questions: "formTemplateFields",        //array
    carcheTemplate: {                       //object
        contractid: "contractid",           //string 
        name: "carcheTemplateName",         //string
        version: 1                          //number 
    },
    customerID: "customerId",               //string
    customerName: "customerName",           //string
    validation: "validation",               //string
    description: "formTemplateDescription", //string
    service_flag: "formTemplateServiceFlag",//object
    service_workflow: "serviceWorkflow",    //object
    staticHostnameCheckBox: "true/false",   //boolean
    staticHostname: "staticHostnameObject"  //object
}
```

Errors:
Error (`CODE 400`):
```javascript
{
    code: "400",
    message: "Customer id is not provided"
}
```

Notes:
* Should return empty object if there is not defined any from template

### Create form template
`POST` `/form-template`

app.route('/formTemplate')
    .post(formController.addNewFormTemplate);

Params:
* NONE

Body:
```javascript
{
    name: "formTemplateName",               //required string
    created_date: "createdDate",            //date
    questions: "formTemplateFields",        //array
    carcheTemplate: {                       //object
        contractid: "contractid",           //string 
        name: "carcheTemplateName",         //string
        version: 1                          //number 
    },
    customerID: "customerId",               //string
    customerName: "customerName",           //string
    validation: "validation",               //string
    description: "formTemplateDescription", //string
    service_flag: "formTemplateServiceFlag",//object
    service_workflow: "serviceWorkflow",    //object
    staticHostnameCheckBox: "true/false",   //boolean
    staticHostname: "staticHostnameObject"  //object
}
```

Permissions:
* NONE

Response:
```javascript
{
    message: 'Template successfully saved!' //string
}
```

Errors:
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Error message"
}
```

Notes:
* NONE

### Delete form template by template id
`DELETE` `/form-template/:id`

app.route('/formTemplate/:id')
    .delete(formController.deleteFormTemplate);

Params:
* `id` - required, represent the template Id

Body:
* NONE

Permissions:
* NONE

Response:
```javascript
{
    message: 'Template successfully deleted!' //string
}
```

Errors:
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Error message"
}
```

Notes:
* NONE

### Update form template by template id
`PUT` `/form-template/:id`

app.route('/formTemplate/:id')
    .put(formController.updateFormTemplate)

Params:
* `id` - required, represent the template Id

Body:
```javascript
{
    name: "formTemplateName",               //required string
    created_date: "createdDate",            //date
    questions: "formTemplateFields",        //array
    carcheTemplate: {                       //object
        contractid: "contractid",           //string 
        name: "carcheTemplateName",         //string
        version: 1                          //number 
    },
    customerID: "customerId",               //string
    customerName: "customerName",           //string
    validation: "validation",               //string
    description: "formTemplateDescription", //string
    service_flag: "formTemplateServiceFlag",//object
    service_workflow: "serviceWorkflow",    //object
    staticHostnameCheckBox: "true/false",   //boolean
    staticHostname: "staticHostnameObject"  //object
}
```

Permissions:
* NONE

Response:
```javascript
{
    name: "formTemplateName",               //string
    created_date: "createdDate",            //date
    questions: "formTemplateFields",        //array
    carcheTemplate: {                       //object
        contractid: "contractid",           //string 
        name: "carcheTemplateName",         //string
        version: 1                          //number 
    },
    customerID: "customerId",               //string
    customerName: "customerName",           //string
    validation: "validation",               //string
    description: "formTemplateDescription", //string
    service_flag: "formTemplateServiceFlag",//object
    service_workflow: "serviceWorkflow",    //object
    staticHostnameCheckBox: "true/false",   //boolean
    staticHostname: "staticHostnameObject"  //object
}
```

Errors:
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Error message"
}
```

Notes:
* NONE

### Load form templates by customer id
`GET` `/form-templates/customer/:id`

app.route('/getFormTemplateByCustomerId/:id')
    .get(formController.listAllFormTemplateByCustomerID);

app.route('/getFormTemplateByCustomerId/:id')
    .get(formController.getFormTemplateByCustomerId);

app.route('/getFormTemplatesByCustomerName/:customerName')
    .get(formController.getFormTemplatesByCustomerName);

Params:
* `id` - required, represent the customer Id

Body:
* NONE

Permissions:
* NONE

Response:
```javascript
[
    {
        name: "formTemplateName",               //string
        created_date: "createdDate",            //date
        questions: "formTemplateFields",        //array
        carcheTemplate: {                       //object
            contractid: "contractid",           //string 
            name: "carcheTemplateName",         //string
            version: 1                          //number 
        },
        customerID: "customerId",               //string
        customerName: "customerName",           //string
        validation: "validation",               //string
        description: "formTemplateDescription", //string
        service_flag: "formTemplateServiceFlag",//object
        service_workflow: "serviceWorkflow",    //object
        staticHostnameCheckBox: "true/false",   //boolean
        staticHostname: "staticHostnameObject"  //object
    },
    ...
]
```

Errors:
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Error message"
}
```

Notes:
* NONE


### Load form templates by customer id
`GET` `/form-templates/template-name/contract-id/`

  app.route('/getUsedCarcheTemplates')
        .get(formController.get_templates_by_carche_t_name);  

Query:
* `name` - required, carche template name 
* `contractId` - required, now defined the leam contract id, should be or internal id 

Body:
* NONE

Permissions:
* NONE

Response:
```javascript
[
    {
        name: "formTemplateName",               //string
        created_date: "createdDate",            //date
        questions: "formTemplateFields",        //array
        carcheTemplate: {                       //object
            contractid: "contractid",           //string 
            name: "carcheTemplateName",         //string
            version: 1                          //number 
        },
        customerID: "customerId",               //string
        customerName: "customerName",           //string
        validation: "validation",               //string
        description: "formTemplateDescription", //string
        service_flag: "formTemplateServiceFlag",//object
        service_workflow: "serviceWorkflow",    //object
        staticHostnameCheckBox: "true/false",   //boolean
        staticHostname: "staticHostnameObject"  //object
    },
    ...
]
```

Errors:
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Error message"
}
```
Error (`CODE 422`):
```javascript
{
    code: "422",
    message: "lenght error input variables"
}
```

Notes:
* NONE


### Load form templates description by template id
`GET` `/form-template/description/:id`

app.route('/getFormDescriptionByFormId/:id')
    .get(formController.getFormTemplateDescriptionByFormId);

Params:
* `id` - required, represent the template Id

Body:
* NONE

Permissions:
* NONE

Response:
```javascript
{
  Description: "formTemplateDescription" //string
}
```

Errors:
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Error message"
}
```

Notes:
* NONE

## Workflow form template

### Load form templates by workflow id
`GET` `/formTemplate/workflows/:id/:customerID`

app.route('/formTemplate/workflows/:id')
    .get(formController.getTemplatesByWorkflowId)

moved to workflowController 

Params:
* `id` - required, represent the workflow Id
* `customerID` - required, represent the customer leam id (need to changed to customer ID - first template change !!!)

Body:
* NONE

Permissions:
* `attuid` - from request get attuid 

Response:
```javascript
[
    {
        name: "formTemplateName",               //string
        created_date: "createdDate",            //date
        questions: "formTemplateFields",        //array
        carcheTemplate: {                       //object
            contractid: "contractid",           //string 
            name: "carcheTemplateName",         //string
            version: 1                          //number 
        },
        customerID: "customerId",               //string
        customerName: "customerName",           //string
        validation: "validation",               //string
        description: "formTemplateDescription", //string
        service_flag: "formTemplateServiceFlag",//object
        service_workflow: "serviceWorkflow",    //object
        staticHostnameCheckBox: "true/false",   //boolean
        staticHostname: "staticHostnameObject"  //object
    },
    ...
]
```

### Load all wrokflows
`GET` `/workflows`

app.route('/workflows')
    .get(formController.getAllWorkflows);

moved to workflowController 

Params:
* NONE

Body:
* NONE

Permissions:
* NONE

Response:
```javascript
[
    {
        id: "workflowId",                       //string
        name: "workflowName",                   //string
        service_type: "workflowServiceType"     //string
    },
    ...
]
```

Errors:
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Error message"
}
```

Notes:
* NONE

## Service Types

### Load service types 

`GET` `/service-types`

Params:
* NONE

Body:
* NONE

Permissions:
* NONE

Response:
```javascript
[
    {
        ID: 1,
        NAME: "serviceTypeName",        //string
        ACTION_ID: 'actionId',          //string external DB
        ACTION_NAME: 'actionName',      //string external DB
        GPS_ID: 'gpsID',                //stirng external DB
        LEAM_ID: 'leamID',              //string external DB
        LEAM_NAME: 'leamName',          //string external DB
        CUSTOMER_ID: 1,                 //nubmer foregin key CUSTOMER table
        MCAP_CREDENTIAL: 'default',     //string default or leamId depend on customer
        SN_TRANSLATION: 'id',           //foregin to translation table for service types
        ACTION_DATA_ID: 1,              //foregin key to action data table 
        ACTION_DATA_CUS_NAME: 'name',   //string from action data table
        ACTION_DATA_CUS_ID: 'id'        //string from action data table
    },
    ...
]
```

Notes:
* Should return empty array if there is not defined any service 

Errors: 
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Database error"
}
```

### Depricated load service types 

`GET`   `/getOneServiceTypes/`


### Load service types by customer id 

`GET` `/service-type/customer-id/:id`

Params 
* `id` - required, represent the customer Id, which is foreign key from CUSTOMERS table 


Body:
* NONE

Permissions:
* NONE

Response:
```javascript
[
    {
        ID: 1,
        NAME: "serviceTypeName",            //string
        ACTION_ID: 'actionId',              //string external DB
        ACTION_NAME: 'actionName',          //string external DB
        GPS_ID: 'gpsID',                    //stirng external DB
        LEAM_ID: 'leamID',                  //string external DB
        LEAM_NAME: 'leamName',              //string external DB
        CUSTOMER_ID: 1,                     //nubmer foregin key CUSTOMER table
        MCAP_CREDENTIAL: 'default',         //string default or leamId depend on customer
        SN_TRANSLATION: 'id',               //foregin to translation table for service types
        ACTION_DATA_ID: 1,                  //foregin key to action data table 
        ACTION_DATA_CUS_NAME: 'name'        //string from action data table
        ACTION_DATA_CUS_ID: 'id'            //string from action data table
    },
    ...
]
```
Errors: 

Error (`CODE 400`):
```javascript
{
    code: "400",
    message: "Customer id is not provided"
}
```

Error (`CODE 400`):
```javascript
{
    code: "400",
    message: "Customer does not exist"
}
```
Error (`CODE 400`):
```javascript
{
    code: "400",
    message: "Customer id must be number"
}
```

Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Database error"
}
```
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Internal server error"
}
```
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Parse error"
}
```

### Depricated load service type by customer id  

`GET`   `/getServiceByCustomer`

### Load service types by leam id 

`GET` `/service-type/leam-id/:id`

Params 
* `id` - required, represent the leam Id


Body:
* NONE

Permissions:
* NONE

Response:
```javascript
[
    {
        ID: 1,
        NAME: "serviceTypeName",            //string
        ACTION_ID: 'actionId',              //string external DB
        ACTION_NAME: 'actionName',          //string external DB
        GPS_ID: 'gpsID',                    //stirng external DB
        LEAM_ID: 'leamID',                  //string external DB
        LEAM_NAME: 'leamName',              //string external DB
        CUSTOMER_ID: 1,                     //nubmer foregin key CUSTOMER table
        MCAP_CREDENTIAL: 'default',         //string default or leamId depend on customer
        SN_TRANSLATION: 'id',               //foregin to translation table for service types
        ACTION_DATA_ID: 1,                  //foregin key to action data table 
        ACTION_DATA_CUS_NAME: 'name'        //string from action data table
        ACTION_DATA_CUS_ID: 'id'            //string from action data table
    },
    ...
]
```
Errors: 

Error (`CODE 400`):
```javascript
{
    code: "400",
    message: "Leam id is required!"
}
```
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Database error"
}
```

### Depricated load service types 

`GET`   `/getServiceByCustomerLeamId`


### Create service type for customer 

`POST` `/service-type`

Params 
* NONE


Body:
```javascript
{
    customerId: 1,                  //number - required
    customerLeamId: 'TEST1',        //string - required 
    customerMcapCred: 'TEST1',      //string - required 
    serviceName: 'MRS',             //string - required
    actionId: 'TEST2',              //string
    gpsId: 'TEST3',                 //string  
    actionDataId: 1,                //number - required 
    leamName: 'TEST4',              //string
    actionName: 'TEST5'             //string
    snTranslation: 1                //number
}
```

Permissions:
* NONE

Response:
```javascript
{
    ID: 1,
    NAME: "serviceTypeName",            //string
    ACTION_ID: 'actionId',              //string external DB
    ACTION_NAME: 'actionName',          //string external DB
    GPS_ID: 'gpsID',                    //stirng external DB
    LEAM_ID: 'leamID',                  //string external DB
    LEAM_NAME: 'leamName',              //string external DB
    CUSTOMER_ID: 1,                     //nubmer foregin key CUSTOMER table
    MCAP_CREDENTIAL: 'default',         //string default or leamId depend on customer
    SN_TRANSLATION: 'id',               //foregin to translation table for service types
    ACTION_DATA_ID: 1,                  //foregin key to action data table 
    ACTION_DATA_CUS_NAME: 'name'        //string from action data table
    ACTION_DATA_CUS_ID: 'id'            //string from action data table
}
```
Errors: 

Error (`CODE 400`):
```javascript
{
    code: "400",
    message: "Missing requried field!"
}
```
Error (`CODE 400`):
```javascript
{
    code: "400",
    message: "Customer id must be number"
}
```
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Database error"
}
```
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Customer not found"
}
```
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Action data not found"
}
```
### Update service type for customer 

`PUT` `/service-type`

Params 
* NONE


Body:
```javascript
{
    id: 1,                      //number
    customerId?: 1,             //number
    customerLeamId?: 'TEST1'    //string
    customerMcapCred?: 'TEST1'  //string
    serviceName?: 'MRS'         //string
    actionId?: 'TEST2'          //string
    gpsId?: 'TEST3'             //string  
    actionDataId?: 1,           //number 
    leamName?: 'TEST4',         //string
    actionName?: 'TEST5'        //string
    snTranslation?: 1           //number
}
```

Permissions:
* NONE

Response:
```javascript
{
    true or error 
}
```
Errors: 

Error (`CODE 400`):
```javascript
{
    code: "400",
    message: "Missing id for update service type"
}
```
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Database error"
}
```
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Customer id must be number"
}
```
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Customer not found"
}
```
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Service not updated"
}
```
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Action id must be number"
}
```
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Action data id not exist"
}
```
### Delete service type for customer 

`DELETE` `/service-type`

Params 
* NONE


Body:
```javascript
{
    id: 1                      //number
}
```

Permissions:
* NONE

Response:
```javascript
{
  status: 200           // OK 
  []                    // reponse is empty
}
```
Errors: 

Error (`CODE 400`):
```javascript
{
    code: "400",
    message: "Identificator must be defined"
}
```
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Database error"
}
```
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Service not found"
}
```
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Record id must be number"
}
```
## Customers LEAM 

Note: 
* The whole dataController should be move to leam controller or something like this 
### Load customer by LE

`GET` `/leam/customers/user/attuid/:attuid`

Params:
* `attuid` - is required represent the LE attuid

Body:
* NONE

Permissions:
* NONE

Response:
```javascript
[
    {
        name: 'customerName'                     //string leam name 
        external_customer_id: 'customerId'       //string leam ID 
    },
    ...
]
```

Notes:
* NONE

Validatons: 
* `attuid` - params validation lenght

Errors: 
Error (`CODE 422`):
```javascript
{
    code: "422",
    message: "Input validation error"
}
```

### Current route 

`GET`   `/customersByLe/:attuid`

### Load all customers from LEAM

`GET` `/leam/customers`

Params:
* NONE

Body:
* NONE

Permissions:
* NONE

Response:
```javascript
[
    {
        name: 'customerName'                     //string leam name 
        external_customer_id: 'customerId'       //string leam ID 
    },
    ...
]
```
Errors: 
* No error handling 

### Current route 

`GET` `/customers`


### The function to get all customer from LEAM no route duplicated 

Function: 
get_customer_ID_by_le 

Location:
dataController.js

### Load service by customer LEAM ID 

`GET` `/leam/services/customer-id/:id`

Params:
* `id` - requried the Id, this represent the leam id of customer 

Body:
* NONE

Permissions:
* NONE

Response:
```javascript
[
    {
        external_customer_id: 'customerId'       //string leam ID 
        name: 'serviceName'                     //array of services per customer id
    },
    ...
]
```
Validations: 
* `customer-id` - min lenght of customer ID 5 max 15 (!! should be change according DB!!!)

Errors: 
Error (`CODE 422`):
```javascript
{
    code: "422",
    message: "Input validation error"
}
```

### Current route 

`GET` `/serviceByCustomerId/:customerID`

### Load service by leam customer name 

`GET` `/leam/customer/services/customer-name/:customeName`

Params:
* customer-name - requried the name, this represent the name of the custome in leam

Body:
* NONE

Permissions:
* NONE

Response:
```javascript
[
    {
        external_customer_id: 'customerId'       //string leam ID 
        name: 'serviceName'                     //array of services per customer id
    },
    ...
]
```
Validations: 
* `customerName` - min lenght of customer name 5 max 40 (!! should be change according DB!!!)

Errors: 
Error (`CODE 422`):
```javascript
{
    code: "422",
    message: "Input validation error"
}
```

### Current route 

`GET` `/servicesByCustomerName/:customerName`

## RouteToAction and Privileges

Note
* used only in access.js (check user has privileges to perfom action)


## Users Template

### Load users tempaltes 

`GET` `/users-templates`

Params:
* NONE

Body:
* NONE

Permissions:
* NONE

Response:
```javascript
[
    {
        ID: 1,                         //number 
        MONGO_TEMPLATE_ID: 'mongoID',  //string
        USER_ID: 1,                    //foregin key user table
        CUSTOMER_ID: 1                 //foregin key customer table 
    },
    ...
]
```

Notes:
* Should return empty array if table is empty

Errors: 
* No error handling 

### Depricated load users tempaltes 

`GET`   `/getOneUsersTemplate/`


### Bulk insert user tempaltes 

`POST` `/user-templates`

Params:
* NONE

Body:
```javascript
[
    {
        TEMPLATE_ID: 'mongoID',             //string mongo ID 
        CUSTOMER_ID: 1,                     //foregin key customer id 
        USER_ID: 1                          //foregin key user id
    },
    ...
]
```

Permissions:
* NONE

### IMPORTANT
```
Code rewrite
!!!! Need the code update, the bulkCreate should return invalid data,
needs query it ones more !!!! 
!!! Need check if customer and user exist !!!!! 
not sure about reponse 
check string lenght
```

Response:
```javascript
{
        "userTemplates":    
                        [
                            {
                            ID: 1,                          //number 
                            MONGO_TEMPLATE_ID: 'mongoID'    //string
                            USER_ID: 1                      //foregin key user table
                            CUSTOMER_ID: 1                  //foregin key customer table 
                            },
                            ...
                        ]
}
```

Notes:
* Should return empty array if table is empty

Errors: 
* No error handling 

### Depricated bulk insert user tempaltes 

`POST`   `/insertUserTemplate`

### Load user template by user id and customer id

`GET` `/user-templates/user-id/customer-id`

Query:
* `userId` - required foregin key to user table
* `customerId` - required foregin key to customer table

Body:
None

Permissions:
* NONE

### IMPORTANT
```
Code rewrite
```

Response:
```javascript
[
    {
        ID: 1,                          //number 
        MONGO_TEMPLATE_ID: 'mongoID'    //string
        USER_ID: 1                      //foregin key user table
        CUSTOMER_ID: 1                  //foregin key customer table 
    },
    ...
]
```

Notes:
* Should return empty array if no assign ani template for user 

Errors: 
* No error handling 

### Depricated load user template by user id and customer id

`POST`   `/getTemplatebyUserAndCustomer`

### Load user template by customer id

`GET` `/user-templates/customer-id/:customerId`

Params:
* `customerId` - required foregin key to customer table

Body:
None

Permissions:
* NONE

### IMPORTANT
```
Code rewrite
Check the before route if, it is will work ?
```

Response:
```javascript
[
    {
        ID: 1,                          //number 
        MONGO_TEMPLATE_ID: 'mongoID'    //string
        USER_ID: 1                      //foregin key user table
        CUSTOMER_ID: 1                  //foregin key customer table 
    },
    ...
]
```

Notes:
* Should return empty array if there is no template for customer 

Errors: 
* No error handling 

### Depricated load user template by customer

`POST`   `/getTemplatebyCustomer`

### Load user template by mongo id 

`GET` `/user-templates/template-id/:id`

Params:
* `id` - the given mongo id from mongo db 

Body:
None

Permissions:
* NONE

### IMPORTANT
```
Code rewrite
```

Response:
```javascript
[
    {
        ID: 1,                  //number user id 
        NAME: 'test',           //string user name first and last name 
        ATTUID: 'xxx',          //string user attuid 
        BC_USER_ID: 'bcid',     //string user bc id 
        ROLE_ID: 1              //foregein key to ROLE table 
    },
    ...
]
```

Notes:
* Should return all users associated with the given template

Errors: 
* status 500 - Database error , or send empty string 

### Depricated load user template by customer

`GET`   `/getTemplateToUserAssociationByID`

### Delete association user and template 

`DELETE` `/user-templates`

Params:
* `TEMPLATE_ID` 'mongoID'       //string mongo template id 

Body:
NONE


Permissions:
* NONE

### IMPORTANT
```
Code rewrite
change query to param !!!! 
!!!! Need the code update, the bulkCreate should return invalid data,
needs query it ones more !!!! 
!!! Need check if customer and user exist in DB !!!!! 
not sure about reponse 
check string lenght 
```

Response:
```javascript
[
    {
         1,                         //number of deleted rows  
    },
    ...
]
```

Notes:
* Should also return zero, need to add check for response 

Errors: 
* No error handling 

### Depricated delete association user and template 

`DELETE`   `/deleteUserToTemplateRelation`

### Bulk update user tempaltes 

`PUT` `/user-templates`

Params:
* NONE

Body:
```javascript
[
    {
        MONGO_TEMPLATE_ID: 'mongoID',       //string mongo 
        CUSTOMER_ID: 1,                     //foregin key customer id 
        USER_ID: 1                          //foregin key user id
    },
    ...
]
```

Permissions:
* NONE

### IMPORTANT
```
Code rewrite
```

Response:
```javascript
[
    {
        ID: 1,                          //number 
        MONGO_TEMPLATE_ID: 'mongoID'    //string
        USER_ID: 1                      //foregin key user table
        CUSTOMER_ID: 1                  //foregin key customer table 
    },
    ...
]
```

Notes:
* Should return empty array if table is empty

Errors: 
* No error handling 

### Depricated bulk insert user tempaltes 

`POST`   `/insertTemplatesToDB`

## Users Customer 

### Load users customers  

`GET` `/user-customers`

Params:
* NONE

Body:
* NONE

Permissions:
* NONE

Response:
```javascript
[
    
    {
        ID: 1,              //number id of row 
        CUSTOMER_ID: 1,     //foregein key customer table
        USER_ID: 1,         //foregein key user table  
    },
    ...
]
```

Notes:
* None

Errors: 
* No error handling 

Existing function: 
* get_users_to_customers in databaseOneController - do we need route for it ? not used 
return all customer users relations 

### Depricated load users customers 

### Create users customers relation 

`POST` `/user-customer`

Params:
* NONE

Body:
```javascript
[
    {
        USER_ID: 1,         //foregin key user table
        CUSTOMER_ID: 1      //foregin key customer table 
    }
]
```


Permissions:
* NONE

Response:
```javascript
[
    {
        ID: 1,              //number table id 
        CUSTOMER_ID: 1,     //foregin key customer id 
        USER_ID: 1,         //foregin key user id 
    },
    ...
]
```

Notes:
* check existing customer and user in customer and user table 

Errors: 
* No error handling 


### Depricated create users customers relation 

`POST` `/insertUserToCustomer`

### Load customers by user ID customer user relation 

`GET` `/user-customer/user/:id`

Params:
* `id` - required the user id for select exact customers 

Body:
* NONE


Permissions:
* NONE

Response:
```javascript
[
    {
        ID: 1,                      //number table id 
        CUSTOMER_ID: 1,             //foregin key customer id 
        USER_ID: 1,                 //foregin key user id 
        Customers:{
            ID: 1,                  //number table id
            NAME: 'test',           //string customer name 
            BC_COMPANY_ID: 'bcID',  //string customer bc id
            BC_NAME: 'bcName',      //string customer name 
        }
    },
    ...
]
```

Notes:
* check existing customer and user in customer and user table 

Errors: 
* No error handling 


### Depricated load customers by user ID customer user relation

`POST` `/getCustomerpPerUser`

### Load users customers realtion by user attuid 

`GET` `/user-customer/user/attuid/:attuid`

Params:
* `attuid` - required for select the correct row from db 

Body:
* NONE


Permissions:
* NONE

Response:
```javascript
[
    {
        ID: 1,                      //number table id 
        USER_ID: 1,                 //foregin key user id 
        Customers: {                //customer object
            ID: 1,                  //customer internal id 
            NAME: 'test',           //customer name 
            BC_COMPANY_ID: 'bcID',  //customer BC id 
            BC_NAME: 'bcName',      //customer BC name    
        }
    },
    ...
]
```

Notes:
* check if attuid is provided, should be change only 

Errors: 
* No error handling 



### Depricated load users customers realtion by user attuid 

`POST` `/getUsersCustomersbyATTUID`


## Action Hostname Controller

### Get hostname address 

`GET` `/hostname/address/:hostname`

Params:
* `hostname` - required the hostname, for get address 

Body:
* NONE

Permissions:
* NONE

Response:
```javascript
{
    address1: 'address1',           //string address 1
    address2: 'address2',           //string address 2
    address3: 'address3',           //string address 3
    address4: 'address4',           //string address 4
    address5: 'address5',           //string address 5
    city: 'city',                   //string city
    country: 'country',             //string country 
    state: 'state',                 //string state
    zip: 'zip',                     //string zip
    country: 'country'              //string country
}
```

Notes:
* Should return empty array if there is not defined any service 

Errors: 
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "SiteId is undefined"
}
```

### Depricated load service types 

`GET`   `/hostnameAddress/:hostname`

## Actions database table controller

### Get actions 

`GET` `/actions`

Params:
* NONE

Body:
* NONE

Permissions:
* NONE

Response:
```javascript
[
    {
        ID: 1,              //number id
        NAME: 'NAME',       //string name 
    },
    ...
]
```

Notes:
* Should return empty array if there is not defined any action 

Errors: 
* No error handling 

### Depricated action database table controller

`GET`   `/getOneActions/`

## Privileges database table controller

### Get privileges 

`GET` `/privileges`

Params:
* NONE

Body:
* NONE

Permissions:
* NONE

Response:
```javascript
[
    {
        ID: 1,                          //number id
        ACCESS: 'none',                 //string not defined in table should be REMOVED !!! 
        ROLE_ID: 1,                     //foregein key in to ROLES table
        ACTION_ID: 1,                   //foregein key in to ACTION table 
    },
    ...
]
```

Notes:
* remove ACCESS not defined in table !!!! 

Errors: 
* No error handling 

### Depricated privileges database table controller

`GET`   `/getOnePriveleges/`


## Roles database table controller

### Get roles 

`GET` `/roles`

Params:
* NONE

Body:
* NONE

Permissions:
* NONE

Response:
```javascript
[
    {
        ID: 1,                          //number id
        NAME: 'test',                   //string role name 
    },
    ...
]
```

Notes:
* NONE

Errors: 
* No error handling 

### Depricated roles database table controller

`GET`   `/getOneRoles/`


## Section Templates 

### Important, need to check if it is used ? Not find in one and renderer

## Customer database table controller

### Get customers 

`GET` `/customers`

Params:
* NONE

Body:
* NONE

Permissions:
* NONE

Response:
```javascript
[
    {
        ID: 'ID',                     //string id
        NAME: 'test',                 //string define customer name by application 
        BC_COMPANY_ID: 'bcID',        //string define the customer ID from BC 
        BC_NAME: 'bcname'             //string define the customer name in BC
    },
    ...
]
```

Notes:
* need to add new field to responde BC_NAME !!!! 

Errors: 
* No error handling 

### Depricated roles database table controller

`GET`   `/getOneCustomers/`


### Get customers by BC ID 

`GET` `/customer/bc/:id`

Params:
* `id` - required, the id of customer in BC 

Body:
* NONE

Permissions:
* NONE

Response:
```javascript
[
    {
        ID: 'ID',                     //string id
        NAME: 'test',                 //string define customer name by application 
        BC_COMPANY_ID: 'bcID',        //string define the customer ID from BC 
        BC_NAME: 'bcname'             //string define the customer name in BC
    },
    ...
]
```

Notes:
* need to check if there is existing the customer, need to add also bc_name 

Errors: 
* No error handling 

### Depricated get customers by BC ID 

`GET`   `/getCustomerbyBCID`


### Get customer by internal id 

`GET` `/customer/:id`

Params:
* `id` - required, the internal id of customer 

Body:
* NONE

Permissions:
* NONE

Response:
```javascript
[
    {
        ID: 'ID',                     //string id
        NAME: 'test',                 //string define customer name by application 
        BC_COMPANY_ID: 'bcID',        //string define the customer ID from BC 
        BC_NAME: 'bcname'             //string define the customer name in BC
    },
    ...
]
```

Notes:
* need to check if there is existing the customer, need to add also bc_name 

Errors: 
* No error handling 

### Depricated get customer by internal id 

`GET`   `/customer/:Id`


### Get customer not related with user 

`GET` `/customer/no-user-permission/user/attuid/:attuid`

Params:
* `attuid` - required, the current user attuid 

Body:
* NONE

Permissions:
* NONE

Response:
```javascript
[
    {
        ID: 'ID',                     //string id
        NAME: 'test',                 //string define customer name by application 
        BC_COMPANY_ID: 'bcID',        //string define the customer ID from BC 
        BC_NAME: 'bcname'             //string define the customer name in BC
    },
    ...
]
```

Notes:
* NONE

Errors: 
* No error handling 

### Depricated get customer not related with user 

`GET`   `/getCustomersWithoutUserPermission`

## Users database table controller

### Get users 

`GET` `/users`

Params:
* NONE

Body:
* NONE

Permissions:
* NONE

Response:
```javascript
[
    {
        ID: 'ID',                       //string id
        NAME: 'test',                   //string define user name firstname and last name 
        BC_USER_ID: 'bcID',             //string define the ID of user in BC 
        ATTUID: 'bcname',               //string define user attuid if exist 
        ROLE_ID: 1,                     //foregin key in to ROLE table 
    },
    ...
]
```

Notes:
* NONE 

Errors: 
* No error handling 

### Depricated roles database table controller

`GET`   `/getOneUsers/`

### Create user

`POST` `/user`

Params:
* NONE

Body:
Response:
```javascript
{
    ROLE_ID: 1,             //foregein key to ROLE table
    NAME: 'test',           //string define user name first and last name
    ATTUID: 'xxxxxx',       //string define user attuid 
    BC_USER_ID: 'bcID'      //string define the ID of user in BC 
}
```

Permissions:
* NONE

Response:
```javascript
[
    {
        ID: 'ID',                       //string id
        NAME: 'test',                   //string define user name firstname and last name 
        BC_USER_ID: 'bcID',             //string define the ID of user in BC 
        ATTUID: 'xxxxxx',               //string define user attuid if exist 
        ROLE_ID: 1,                     //foregin key in to ROLE table 
    },
    ...
]
```

Notes:
* body elements should be changed to lower case, need to check if role ID exist, check attuid format 

Errors: 
* No error handling 

### Depricated roles database table controller

`POST`   `/insertUser`

### Load user by attuid 

`GET` `/user/attuid/:attuid`

Params:
* `attuid` - attuid of the user which should be retrieved 

Body:
* NONE

Permissions:
* NONE

Response:
```javascript
[
    {
        ID: 'ID',                       //string id
        NAME: 'test',                   //string define user name firstname and last name 
        BC_USER_ID: 'bcID',             //string define the ID of user in BC 
        ATTUID: 'xxxxxx',               //string define user attuid if exist 
        ROLE_ID: 1,                     //foregin key in to ROLE table 
    },
    ...
]
```

Notes:
* NONE 

Errors: 
* No error handling 

### Depricated roles database table controller

`POST`   `/getUserIDbyATTUID`

## MCAP functions 

### Get hostnames  

`GET` `/hostnames/customer-name/service-type/`

Params:
* `customerName` - define the customer name from ACTION db, for get hostname in mcap 
* `serviceType` - define the service type 

Body:
* NONE

Permissions:
* NONE

Response:
```javascript
[
    
        hostanme1,hostname2...                   //array of hostnames per customer
]
```

Notes:
* stdout error should be change to some general ERROR !!! 

Errors: 
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Internal error"
}
```
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Command execution error"
}
```
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "stdout error"
}
```

### Depricated get hostnames

`GET`   `/Hostname/:customer`

### Get interfaces  

`GET` `/interfaces/customer-id/service-type/hostname/dms-server/`

Query:
* `customerId` - define the customer id from db 
* `serviceType` - define required service type
* `hostname` - define hostname for required interfaces
* `dmsServer` - define the hostname dms server 

Body:
* NONE

Permissions:
* NONE

Response:
```javascript
[
    
        interface1,interface2...                   //array of hostnames per customer
]
```

Notes:
* stdout error should be change to some general ERROR !!! 

Errors: 
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Internal error"
}
```
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Command execution error"
}
```
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "stdout error"
}
```

### Depricated get interfaces 

`POST`   `/Interfaces`

### Run validation on device   

`POST` `/run-validation`

Params:
* NONE

Body:
```javascript
{
    customerId: 1,                  //number customer internal id 
    serviceType: 'test',            //string the service name 
    hostname: 'test',               //string the hostname 
    dmsServer: 'test',              //string the dms server 
    validationCommand: 'command',   //string the validtion command 
}
```

Permissions:
* need to used customer Id and not external id / should check if need to be

Response:
```javascript
{
    commandOutput: 'command output',         //string command output from mcap
    id: 'command id mcap',                   //string mcap command id 
    status: 'success',                       //string command execution status failed / success
    m_status: 'success',                    //string output/status of the command from device 
    message: 'completed'                    //string define command state if running or completed
}
```

Notes:
* stdout error should be change to some general ERROR !!! 

Errors: 
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Internal error"
}
```
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Command execution error"
}
```
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "stdout error"
}
```

### Depricated run validation on device  

`POST`   `/runValidation`

### Push config on device   

`POST` `/push-config`

Params:
* NONE

Body:
```javascript
{
    customerId: 1,                  //number customer internal id 
    serviceType: 'test',            //string the service name 
    hostname: 'test',               //string the hostname 
    dmsServer: 'test',              //string the dms server 
    commands: 'command',            //string the config command 
}
```

Permissions:
* need to used customer Id and not external id / should check if need to be

Response:
```javascript
{
    commandOutput: 'command output',        //string command output from mcap
    id: 'command id mcap',                  //string mcap command id 
    status: 'success',                      //string command execution status failed / success
    m_status: 'success',                    //string output/status of the command from device 
    msg: 'completed'                        //string define command state if running or completed
}
```

Notes:
* stdout error should be change to some general ERROR !!! 

Errors: 
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Internal error"
}
```
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Command execution error"
}
```
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "stdout error"
}
```
 
### Depricated push config on device

`POST`   `/pushConfig`

### Set Rollback on device   

`POST` `/set-rollback`

Params:
* NONE

Body:
```javascript
{
    customerId: 1,                  //number customer internal id 
    serviceType: 'test',            //string the service name 
    hostname: 'test',               //string the hostname 
    dmsServer: 'test',              //string the dms server 
    timeout: 10                     //number timeout from front end 
}
```

Permissions:
* need to used customer Id and not external id / should check if need to be

Response:
```javascript
{
    result: 'result',                   //string result of the set rollback command on device  
    m_status: 'success',                //string output/status of the command from device 
    msg: 'completed'                    //string define command state if running or completed
}
```

Notes:
* stdout error should be change to some general ERROR !!! 

Errors: 
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Internal error"
}
```
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Command execution error"
}
```
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "stdout error"
}
```

### Depricated set Rollback on device   

`POST`   `/setRollback`

### Imediate rollback on device   

`POST` `/rollback-now`

Params:
* NONE

Body:
```javascript
{
    customerId: 1,                  //number customer internal id 
    serviceType: 'test',            //string the service name 
    hostname: 'test',               //string the hostname 
    dmsServer: 'test'               //string the dms server 
}
```

Permissions:
* need to used customer Id and not external id / should check if need to be

Response:
```javascript
{
    result: 'result',                   //string result of the set rollback command on device  
    m_status: 'success',                //string output/status of the command from device 
    msg: 'completed'                    //string define command state if running or completed
}
```

Notes:
* stdout error should be change to some general ERROR !!! 

Errors: 
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Internal error"
}
```
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Command execution error"
}
```
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "stdout error"
}
```

### Depricated imediate rollback on device   

`POST`   `/rollbackNow`

### Confirm change on device   

`POST` `/confirm-change`

Params:
* NONE

Body:
```javascript
{
    customerId: 1,                  //number customer internal id 
    serviceType: 'test',            //string the service name 
    hostname: 'test',               //string the hostname 
    dmsServer: 'test'               //string the dms server 
}
```

Permissions:
* need to used customer Id and not external id / should check if need to be

Response:
```javascript
{
    result: 'result',                   //string result of the set rollback command on device  
    m_status: 'success',                //string output/status of the command from device 
    msg: 'completed'                    //string define command state if running or completed
}
```

Notes:
* stdout error should be change to some general ERROR !!! 

Errors: 
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Internal error"
}
```
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Command execution error"
}
```
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "stdout error"
}
```

### Depricated confirm change on device  

`POST`   `/confirmChange`

## cArche functions 

### Generate config  

`POST` `/cArche/config`

Params:
* NONE

Body:
```javascript
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
```

Permissions:
* NONE

Response:
```javascript
[
    {
        cArche response  // depends on defined template in arche
    }
]
```

Notes:
* NEED !!! to validate the input in the body of generate config !!!!!! 
* exposed carche error to user, need to handle it  

Errors: 
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "carche error"
}
```

Error (`CODE 422`):
```javascript
{
    code: "422",
    message: "The validation error"
}
```

### Depricated generate config  

`GET`   `/generateConfig`


### Get cArche variables if contract id is provided (template assigned to customer)

`GET` `/cArche/variables/name/contract-id/`

Query:
* `name` - required this represent the exact template name
* `contractId` - required the template is saved accroding customer id in the carche 


Body:
* NONE 

Permissions:
* NONE

Response:
```javascript
[
    {
        cArche response  // return the array accroding the setted variables <Interfaces> in the template
    }
]
```

Notes:
* 

Errors: 
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "carche error"
}
```

Error (`CODE 422`):
```javascript
{
    code: "422",
    message: "The validation error"
}
```

### Get cArche variables if service is provided (template assigned to service)

`GET` `/cArche/variables/name/service/`

Query:
* `name` - required this represent the exact template name
* `service` - required the template is saved accroding services in the carche 


Body:
* NONE 

Permissions:
* NONE

Response:
```javascript
[
    {
        cArche response  // return the array accroding the setted variables <Interfaces> in the template
    }
]
```

Notes:
* 

Errors: 
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "carche error"
}
```

Error (`CODE 422`):
```javascript
{
    code: "422",
    message: "The validation error"
}
```

### Depricated get cArche variables

`GET`   `/getcArcheVariables`

### Get cArche list of templates via customer Id  and service  

`GET` `/cArche/template-list/contract-id/service/`

Params:
* NONE

Query: 
* `contractId` - not requried the template is saved accroding leam ID to cArche, should be change to customer internal id 
* `service` - not requried the template service specificaction 

NOTE:
* if the both contract id and services is provided the data is filtered according both parameters 
* if only service is provided that it will return all the data only for the 
* if nothing is provided that return all data 


Body:
* NONE 

Permissions:
* NONE

Response:
```javascript
[
    {
        nam: "template name",        //string represent the template name
        services: "service",          //string represent the service if it provided for the template
        contractid: "contractid"      //string represent the contract id if it provided for the template
    },
    ...
]
```


Errors: 
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "carche error"
}
```

Error (`CODE 422`):
```javascript
{
    code: "422",
    message: "The validation error"
}
```

### Depricated get cArche templates 

`GET`   `/getcArcheListTemplates`

### Get cArche template

`GET` `/cArche/template`

Params:
* NONE 

Query: 
* `contractid` - not mandatory the template customer id / contract id 
* `name` - required the template name for select the carche template 
* `service` - not mandaotry  the template service 

Notes:
* if contract id is mandatory if name and service is not provided (return all template related with this contract id)
* if contract id and name is provided return specific template according condition
* if services and name is provided return specific template according contition


Body:
* NONE 

Permissions:
* NONE


Response:
```javascript
[
    {
        name: "template name",        //string represent the template name
        contractid: "contractid",     //string represent the template contract id if provided
        path: "path",                 //string represent the path where the template is saved inside the image
        body: "template",             //string represent the template 
        services: "service",          //string represent the template service if exist
        version: 1,                   //number represent the template version
        deviceModel: "CLI",           //string represent the template model type (CLI, XML, JSON..)
        dateCreated: "2020..",        //string represent the create date of the template
        templateType: "cArche",       //string represent the template type (cArche, jinja..)
        vendorType: "CISCO SYSTEMS"   //string represent the tempalte vendor type (CISCO SYSTEMS, JUNIPER NETWORKS)  
    },
    ...
]
```

Notes:
* change the validatios to be corect for each variables according db 

Errors: 
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "carche error"
}
```
Error (`CODE 422`):
```javascript
{
    code: "422",
    message: "The validation error"
}
```

Error (`CODE 400`):
```javascript
{
    code: "400",
    message: "If only service is provided name is mandatory"
}
```
Error (`CODE 400`):
```javascript
{
    code: "400",
    message: "Customer id or service and name must be provided"
}
```

Error (`CODE 400`):
```javascript
{
    code: "400",
    message: "Contract id or service must be provided if name is provided"
}
```


### Depricated get cArche templates 

`GET`   `/cArcheTemplate`

### Create cArche template - contract id and service 


`POST` `/cArche/template`

Params:
* NONE

Body:
* `name` - template name 
* `deviceModel` - template type JSON, XML or CLI 
* `body` - the template body, content of the template
* `service` -  the template service 
* `contractid` - customer contract id for template 
* `version` - adding the tempalte version 
* `templateType` - the template type as cArche or jinja
* `vendorType` - customer contract id for template 

NOTE:
* !!! the contract id or service is mandatory one of them must be provided 
* !!!!! remove the check from the FE - template name max 30 characters !!!! 

Permissions:
* NONE

Response:
```javascript
[
    {
        name: 'templateName',                       //string template name 
        contractid: 'contractId',                   //string customer contract id, external id 
        path: 'saved path',                         //cArche file system path, where is templated saved 
        body: 'template body',                      //the template content
        services: 'service',                        // the template service 
        version: 1,                                 //number version of template
        deviceModel: 'template type',               //template type CLI, XML, JSON
        dataCreated: 'date',                        //date define when the template was created 
        templateType: 'cArche',                     //string represent the template type (cArche, jinja..)
        vendorType: 'CISCO SYSTEMS',                //string the tempalte vendor type (CISCO SYSTEMS, JUNIPER NETWORKS)  
    }
]
```

Notes:
* change the validatios to be corect for each variables according db 

Errors: 
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "carche error"
}
```
Error (`CODE 422`):
```javascript
{
    code: "422",
    message: "The validation error"
}
```

Error (`CODE 400`):
```javascript
{
    code: "400",
    message: "Customer id or service must be provided"
}
```

### Depricated get cArche templates 

`POST`   `/cArcheTemplate`



### Update cArche template

`PUT` `/cArche/template`

Params:
* NONE

Query: 
* NONE

Body:
* `name` - template name 
* `deviceModel` - template type JSON, XML or CLI 
* `body` - the template body, content of the template
* `service` -  the template service 
* `contractid` - customer contract id for template 
* `version` - adding the tempalte version 
* `templateType` - the template type as cArche or jinja
* `vendorType` - customer contract id for template 

NOTE
* name must be provided, devicemodel, body, templateType and vendorType can be updated, 
* contract id can not be updated, service can be if contract id is provided other wise not 
* in FE if update and contractid is provided allow update service other if only service not allow udpate it 


Permissions:
* NONE

Response:
```javascript
[
    {
        cArche response  // need to be clarified, normalize 
    }
]
```

Notes:
* change the validatios to be corect for each variables according db 
* I think is is not used till now 

Errors: 
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "carche error"
}
```

Error (`CODE 422`):
```javascript
{
    code: "422",
    message: "The validation error"
}
```

### Depricated update cArche template

`PUT`   `/cArcheTemplate`

### Delete cArche template

`DELETE` `/cArche/template`

Params:
* NONE

Query: 
* `name`- template name it is required 
* `contractid` - external customer id 
* `service` - external customer id 

Notes:
* if contract id and name is provided return specific template according condition
* if services and name is provided return specific template according contition
* the services and name or contract id and name is mandatory field 

Body:
* NONE 

Permissions:
* NONE

Response:
```javascript
[
    {
       "" //empty if success (background 204 no content from carche )
    }
]
```

Notes:
* change the validatios to be corect for each variables according db 

Errors: 
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "carche error"
}
```

Error (`CODE 422`):
```javascript
{
    code: "422",
    message: "The validation error"
}
```

Error (`CODE 400`):
```javascript
{
    code: "400",
    message: "Customer id or service and name must be provided"
}
```


### Depricated delete cArche template

`DELETE`   `/cArcheTemplate`


## Conf template content type database table controller

### Get CT content type 

`GET` `/cArche/template/content-types/`

Params:
* NONE

Body:
* NONE

Permissions:
* NONE

Response:
```javascript
[
    {
        ID: 1,                                  //number id
        CONTENT_TYPE: 'test',                   //string template content type 
    },
    ...
]
```

Notes:
* NONE

Errors: 
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Database error"
}
```

## Conf template type database table controller

### Get CT type 

`GET` `/cArche/template/types/`

Params:
* NONE

Body:
* NONE

Permissions:
* NONE

Response:
```javascript
[
    {
        ID: 1,                                  //number id
        TEMPLATE_TYPE: 'test',                  //string template type 
    },
    ...
]
```

Notes:
* NONE

Errors: 
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Database error"
}
```


## Conf template vendor type database table controller

### Get CT vendor type 

`GET` `/cArche/template/vendor-types/`

Params:
* NONE

Body:
* NONE

Permissions:
* NONE

Response:
```javascript
[
    {
        ID: 1,                                  //number id
        VENDOR_TYPE: 'test',                    //string template vendor type 
    },
    ...
]
```

Notes:
* NONE

Errors: 
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "Database error"
}
```


## Loggin controller  

### Get logs  

`GET` `/log`

Params:
* NONE 

Body:
* NONE

Query: 
* `pageLimit` - defined the page limit of the displayed data pagination 

Permissions:
* NONE

Response:
```javascript
{
    results: ['log1', 'log2'...],               //array of the log records 
    page: 1,                                    //number the current page from all pages
    pageCount: 100,                             //number total count of all documents
    pages: 2                                    //number total count of all pages 
}
```

Notes:
* validation looks ok, according front end ranges 

Errors: 
Error (`CODE 422`):
```javascript
{
    code: "422",
    message: "Page is in bad range!"
}
```

### Depricated get logs

* None - should be as it is defined 

### Update log  

`UPDATE` `/log`

Params:
* NONE 

Body:
```javascript
{
    transactionId: 'transactionId',              //string define the unique key for transaction 
    status: 'success'                            //string define the transaction status 
}
```

Permissions:
* NONE

Response:
```javascript
{
     message: 'Log successfully updated!'           //string display the log update was successfull 
}
```

Notes:
* check validation according the table ranges 

Errors: 
Error (`CODE 422`):
```javascript
{
    code: "422",
    message: "Page is in bad range!"
}
```

### Depricated get hostnames

* None - should be as it is defined 

### Create log  

`POST` `/log`

Params:
* NONE 

Body:
```javascript
{
    body: !!! not validated input not defined parameters 
}
```

Permissions:
* NONE

Response:
```javascript
{
     message: 'Log successfully saved!'           //string display the log creation was successfull 
}
```

Notes:
* check validation according the table ranges, validtion for content-type should be therer or move to middleware ? 

Errors: 
* some errors which return 400 status non-json or empty object .... 

### Depricated get hostnames

* None - should be as it is defined 


### Create VCO Edge log   

`POST` `/log/vco-edge`

Params:
* NONE 

Body:
```javascript
{
   customer: {
       name: 'test',                        //string customer name 
       external_customer_id: 'leamId'       //string customer leam id should be change to internal customer id 
   },
   ... !!!!! ( not defined the all input parameters )
}
```


Permissions:
* NONE

Response:
```javascript
{
    message: 'Successfully!'            //string return successfull message if the log was created           
}
```

Notes:
* customer validation should be move to all logs controller , leam id should be change to internal id 

Errors: 
* some errors which return 400 status non-json or empty object ...., should unified 
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "some error"
}
```
Error (`CODE 400`):
```javascript
{
    code: "400",
    message: 'Customer does not exist!'
}
```

### Depricated get logs

`POST` `/vcoEdge`

### Get VCO Edge log   

`GET` `/log/vco-edge`

Params:
* NONE 

Query: 
* `pageLimit` - define the number of records which should be returned for user

Body:
* NONE


Permissions:
* NONE

Response:
```javascript
{
    results: ['vcolog1', 'vcolog2'...],         //array of the vco log records 
    page: 1,                                    //number the current page from all pages
    pageCount: 100,                             //number total count of all documents
    pages: 2                                    //number total count of all pages 
}
```

Notes:
* customer validation should be move to all logs controller , leam id should be change to internal id 

Errors: 
* no error handling only for pagelimit 
Error (`CODE 422`):
```javascript
{
    code: "422",
    message: "Page is in bad range!" 
}
```

### Depricated get logs

`GET` `/vcoEdge`

### Create validation command log   

`POST` `/log/val-commands`

Params:
* NONE 

Body:
```javascript
{
   ... !!!!! ( not defined the all input parameters )
}
```


Permissions:
* NONE

Response:
```javascript
{
    message: 'Successfully!'            //string return successfull message if the log was created           
}
```

Notes:
* customer validation should be move to all logs controller , leam id should be change to internal id 

Errors: 
* some errors which return 400 status non-json or empty object ...., should unified 
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "some error"
}
```

### Depricated get logs

`POST` `/valCommands`


### Get validation command log   

`GET` `/log/val-commands`

Params:
* NONE 

Body:
```javascript
{
   ... !!!!! ( not defined the all input parameters )
}
```
Query: 
* `pageLimit` - define the number of records which should be returned for user

Permissions:
* NONE

Response:
```javascript
{
    results: ['valclog1', 'valclog2'...],       //array of the vco log records 
    page: 1,                                    //number the current page from all pages
    pageCount: 100,                             //number total count of all documents
    pages: 2                                    //number total count of all pages 
}
``` 

Notes:
* customer validation should be move to all logs controller , leam id should be change to internal id 

Errors: 
* some errors which return 400 status non-json or empty object ...., should unified 
Error (`CODE 422`):
```javascript
{
    code: "422",
    message: "Page is in bad range!" 
}
```

### Depricated get logs

`GET` `/valCommands`


## VCO Edge functions 

### Create VCO edge   

`POST` `/vco-edge`

Params:
* NONE

Body:
```javascript
{
    !! NOTE DEFINED need to be investigated !!! maybe only config is need for it 
}
```

Permissions:
* NONE

Response:
```javascript
[
    {
        body: 'body'            //object returned by velowraptor 
    }
]
```

Notes:
* all credentials are saved in the database 
* investigate what is process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

Errors: 
* some error provided by velowraptor 
Error (`CODE 500`):
```javascript
{
    code: "500",
    message: "velowraptor error"
}
```

### Depricated create VCO edge   

`POST`   `/createVCOEdge`

### REMOVE /createVCOEdgeCitizen' not used

## Data collection functions 

### Create data collection    

`POST` `/data-collection-record`

Params:
* NONE

Body:
```javascript
{
    !! NOTE DEFINED need to be investigated !!! maybe only config is need for it 
}
```

Permissions:
* NONE

Response:
```javascript
[
    {
        message: 'Data successfully saved!'         //string successfull message 
    }
]
```

Notes:
* 


Errors: 
* some error provided by velowraptor 
Error (`CODE 400`):
```javascript
{
    code: "400",
    message: "not definned error" 
}
```

### Depricated generate config  

`POST`   `/createDataCollectionRecord`

### Important to check if should be other routes for datacollection !!!! 

## Action data functions 

### Parse action data from excel file 

`GET` `/action-data`

Params:
* NONE

Body:
* NONE

Permissions:
* NONE

Response:
```javascript
[
    {
        length: 7               //number, return the number of rows parsed 
    }
]
```

Notes:
* This function is like crone job, the excel file is dirrectly definned in code no accessable from outside 


Errors: 
* no error handling only console log error 


### Depricated generate config  
* NONE 


