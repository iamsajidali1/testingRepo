# cArche - Request examples 

### All of the request require in header 

Authorization 

## Generate config


`POST` `/generateConfig`

views.py - GenerateConfig


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
{
        "genereted config",        //string
}
```
or
    config_base64 file encoded in base64 file 

Errors:
Error (`CODE 400`):
```javascript
{
    code: "400",
    message: "BAD REQUEST"
}
```
Error (`CODE 500`):
```javascript
{
    code: "400",
    message: "INTERNAL SERVER ERROR"
}
```

Notes:
* Error will display the output of the wrongly defined variable or any other errors 




## List of templates 

views.py - ListTemplates

`POST` `/listTemplates`

Body:
```javascript
{
    "contractid": "contracid"       //string not mandatory field contract id of the templates
    "services": "service"           //string not mandatory field servcie of the templates
}
```

Notes:
* if the both contract id and services is provided the data is filtered according both parameters 
* if only service is provided that it will return all the data only for the 
* if nothing is provided that return all data 


Permissions:
* NONE


Response:
```javascript
[
    {
        "name": "template name",        //string represent the template name
        "services": "service",          //string represent the service if it provided for the template
        "contractid": "contractid"      //string represent the contract id if it provided for the template
    },
    ...
]
```

Errors:
Error (`CODE 400`):
```javascript
{
    code: "400",
    message: "BAD REQUEST"
}
```
Error (`CODE 500`):
```javascript
{
    code: "400",
    message: "INTERNAL SERVER ERROR"
}
```

Notes:
* Error will display the output of the wrongly defined variable or any other errors 


## Create or Update existing template 

views.py - UpdateTemplate

`POST` `/updateTemplate`

Body:
```javascript
{
    "name": "template name",         //string mandatory field, the newly created template name
    "deviceModel": "device model",   //string optional field, but good to have the newly created 
                                    //template device model type (CLI, XMl, JSON)
    "body": "template",              //string mandatory field, the template itself must be encoded in base64
    "services": "service",           //string mandatory field, if contract id is not provided define 
                                    //the service which is used for template, there is a special category 
                                    // generic, which is used for these templates which is not related with any service
    "contractid": "contractid",     // string mandatory field, if the service is not provided and template 
                                    //is only related withcontract id 
    "version": 1                    //number not mandatory field, if not provided the default is 1 for it
    "templateType": "cArche",       //string not mandatory field, in db default value "cArche", but in future "jinja"
    "vendorType": "CISCO SYSTEMS"   //string not mandatory field, in db default value "CISCO SYSTEMS",
                                    // in future should be aslo "JUNIPER NETWORKS" etc. 
}
```



Permissions:
* NONE

Response:
```javascript
{
        "name": "template name",        //string represent the template name
        "contractid": "contractid",     //string represent the template contract id if provided
        "path": "path",                 //string represent the path where the template is saved inside the image
        "body": "template",             //string represent the template 
        "services": "service",          //string represent the template service if exist
        "version": 1,                   //number represent the template version
        "deviceModel": "CLI",           //string represent the template model type (CLI, XML, JSON..)
        "dateCreated": "2020..",        //string represent the create date of the template
        "templateType": "cArche",       //string represent the template type (cArche, jinja..)
        "vendorType": "CISCO SYSTEMS"   //string represent the tempalte vendor type (CISCO SYSTEMS, JUNIPER NETWORKS)  

}
```

Errors:
Error (`CODE 400`):
```javascript
{
    code: "400",
    message: "BAD REQUEST"
}
```
Error (`CODE 500`):
```javascript
{
    code: "400",
    message: "INTERNAL SERVER ERROR"
}
```

Notes:
* Error will display the output of the wrongly defined variable or any other errors 

`PUT` `/updateTemplate`

Notes:
* name - must be provided during update, to identify template, ca not be updated 
* deviceModel - can be updated without any issue 
* body - can be updated without any issue
* services - can be updated if contract id is provided, if only services for template than can not be updated
* contractid - if provided this can not be updated 
* templateType - can be updated without any issue
* vendorType - can be updated without any issue 

Body:
```javascript
{
    "name": "template name",         //string mandatory field, the newly created template name
    "deviceModel": "device model",   //string optional field, but good to have the newly created 
                                    //template device model type (CLI, XMl, JSON)
    "body": "template",              //string mandatory field, the template itself must be encoded in base64
    "services": "service",           //string mandatory field, if contract id is not provided define 
                                    //the service which is used for template, there is a special category 
                                    // generic, which is used for these templates which is not related with any service
    "contractid": "contractid",     // string mandatory field, if the service is not provided and template 
                                    //is only related withcontract id 
    "version": 1                    //number not mandatory field, if not provided the default is 1 for it
    "templateType": "cArche",       //string not mandatory field, in db default value "cArche", but in future "jinja"
    "vendorType": "CISCO SYSTEMS"   //string not mandatory field, in db default value "CISCO SYSTEMS",
                                    // in future should be aslo "JUNIPER NETWORKS" etc. 
}
```



Permissions:
* NONE

Response:
```javascript
{
        "name": "template name",        //string represent the template name
        "contractid": "contractid",     //string represent the template contract id if provided
        "path": "path",                 //string represent the path where the template is saved inside the image
        "body": "template",             //string represent the template 
        "services": "service",          //string represent the template service if exist
        "version": 1,                   //number represent the template version
        "deviceModel": "CLI",           //string represent the template model type (CLI, XML, JSON..)
        "dateCreated": "2020..",        //string represent the create date of the template
        "templateType": "cArche",       //string represent the template type (cArche, jinja..)
        "vendorType": "CISCO SYSTEMS"   //string represent the tempalte vendor type (CISCO SYSTEMS, JUNIPER NETWORKS)  

}
```

Errors:
Error (`CODE 400`):
```javascript
{
    code: "400",
    message: "BAD REQUEST"
}
```
Error (`CODE 500`):
```javascript
{
    code: "400",
    message: "INTERNAL SERVER ERROR"
}
```

Notes:
* Error will display the output of the wrongly defined variable or any other errors 


## Get template  

views.py - GetTemplate

`POST` `/getTemplate`

Body:
```javascript
{
    "contractid": "contracid",       //string contract id of the templates 
    "services": "service",           //string servcie of the templates
    "name": "template name",         //string template name 
}
```

Notes:
* if contract id is mandatory if name and service is not provided (return all template related with this contract id)
* if contract id and name is provided return specific template according condition
* if services and name is provided return specific template according contition


Permissions:
* NONE


Response:
```javascript
[
    {
        "name": "template name",        //string represent the template name
        "contractid": "contractid",     //string represent the template contract id if provided
        "path": "path",                 //string represent the path where the template is saved inside the image
        "body": "template",             //string represent the template 
        "services": "service",          //string represent the template service if exist
        "version": 1,                   //number represent the template version
        "deviceModel": "CLI",           //string represent the template model type (CLI, XML, JSON..)
        "dateCreated": "2020..",        //string represent the create date of the template
        "templateType": "cArche",       //string represent the template type (cArche, jinja..)
        "vendorType": "CISCO SYSTEMS"   //string represent the tempalte vendor type (CISCO SYSTEMS, JUNIPER NETWORKS)  
    },
    ...
]
```

Errors:
Error (`CODE 400`):
```javascript
{
    code: "400",
    message: "BAD REQUEST"
}
```
Error (`CODE 500`):
```javascript
{
    code: "400",
    message: "INTERNAL SERVER ERROR"
}
```

Notes:
* Error will display the output of the wrongly defined variable or any other errors 


## Delete template  

views.py - DeleteTemplate

`POST` `/deleteTemplate`

Body:
```javascript
{
    "contractid": "contracid",       //string contract id of the templates 
    "services": "service",           //string servcie of the templates
    "name": "template name",         //string template name 
}
```

Notes:
* if contract id and name is provided return specific template according condition
* if services and name is provided return specific template according contition
* the services and name or contract id and name is mandatory field 


Permissions:
* NONE


Response:
 (`CODE 204`):
```javascript
{
    code: "204",
    message: "NO CONTENT"
}
```


Errors:
Error (`CODE 400`):
```javascript
{
    code: "400",
    message: "BAD REQUEST"
}
```
Error (`CODE 500`):
```javascript
{
    code: "400",
    message: "INTERNAL SERVER ERROR"
}
```

Notes:
* Error will display the output of the wrongly defined variable or any other errors 
* The template is also delete from file system



## Get variables  

views.py - GetVariables

`POST` `/getVariables`

Body:
```javascript
{
    "contractid": "contracid",       //string contract id of the templates 
    "services": "service",           //string servcie of the templates
    "name": "template name",         //string template name 
}
```

Notes:
* if contract id and name is provided return specific template according condition
* if services and name is provided return specific template according contition
* the services and name or contract id and name is mandatory field 


Permissions:
* NONE


Response:
```javascript
[
    "variable1",                // array of string return the list of the variable in the temples fro example <Interface> is 
                                // variable, variables is specified by special characters.. 
    "variable2"
]
```


Errors:
Error (`CODE 400`):
```javascript
{
    code: "400",
    message: "BAD REQUEST"
}
```
Error (`CODE 500`):
```javascript
{
    code: "400",
    message: "INTERNAL SERVER ERROR"
}
```

Notes:
* Error will display the output of the wrongly defined variable or any other errors 
* The template is also delete from file system




