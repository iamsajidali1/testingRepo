const { ServiceName } = require("../models/serviceNameModel");
const { Customers } = require("../models/customerOneModel");
const { ServiceToCustomer } = require("../models/serviceToCustomerModel");
const { TemplateToServiceToCustomer } = require("../models/templateToServiceToCustomerModel");
const { TemplateToService } = require("../models/templateToServiceModel");
const { Templates } = require("../models/templatesDataModel");
const carcheController = require("../controllers/cArcheController");
var _ = require("lodash");
const loggerPino = require("../helpers/loggerHelper");
const others = "others";

exports.getBasicNodes = (req, res) => {
    nodeGenHelper().then(response => {
        if (response && response.data) {
            return res.status(200).json(response.data);
        } else {
            return res.status(200).json([]);
        }
    }).catch(err => {
        loggerPino.error(err);
        loggerPino.error(new Error().stack);
        return res.status(500).json('Internal server error');
    });

};

async function nodeGenHelper() {

    let allCarcheTemplate = await carcheController.getAllCarcheTemplates();

    // if no carche templates return false
    if (allCarcheTemplate.length <= 0) {
        return false;
    }

    let services = await getServices().catch(err => {
        loggerPino.error(err);
        loggerPino.error(new Error().stack);
        throw "Database error"
    });

    let customers = await getAllCustomers().catch(err => {
        loggerPino.error(err);
        loggerPino.error(new Error().stack);
        throw "Database error"
    });

    let servicesNode = [];

    // filter templates which has only service id
    let tempOnlyServices = allCarcheTemplate.filter(temp => {
        return temp.contractid == ''
    });


    if (tempOnlyServices.length > 0 && services.length > 0) {
        servicesNode = await servicesNodeHelper(tempOnlyServices, services);
    }

    // filter template which has contrac id
    let customersNode = [];
    let tempOnlyCustomers = allCarcheTemplate.filter(temp => {
        return temp.contractid != ''
    });

    if (tempOnlyCustomers.length > 0 && customers.length > 0 && services.length > 0) {
        customersNode = await customerNodeHelper(tempOnlyCustomers, customers, services);
    }

    let results = {
        data: [{
            "label": "Customers",
            "key": "Customers",
            "level": 1,
            "data": "Customers Folder",
            "expandedIcon": "pi pi-folder-open",
            "collapsedIcon": "pi pi-folder",
            "children": customersNode
        },
        {
            "label": "Services",
            "key": "Services",
            "data": "Services Folder",
            "expandedIcon": "pi pi-folder-open",
            "collapsedIcon": "pi pi-folder",
            "children": servicesNode
        }
        ]
    };
    return results;
    // filter customer acording each service



}

async function servicesNodeHelper(tempOnlyServices, services) {
    let serviceIds = [];
    let serviceNode = [];
    //get only ids for sort
    tempOnlyServices.map(temp => {
        serviceIds.push({ id: temp.services });
    });
    // get unique services
    if (serviceIds.length <= 0) {
        return serviceNode;
    }

    let listOfUniqueServices = _.uniqBy(serviceIds, "id");
    // select data from db about existing services

    // get templates by service
    let tempByService = [];
    let currService = {};
    let serviceLeaf = [];
    if (listOfUniqueServices.length > 0) {
        listOfUniqueServices.map(uService => {
            tempByService = tempOnlyServices.filter(temp => {
                return temp.services == uService.id
            });

            if (tempByService.length > 0) {
                serviceLeaf = generateLeaf(tempByService);

                currService = _.filter(services, function (o) { return o.ID == uService.id });
                if (currService.length > 0) {
                    serviceNode.push({
                        "label": currService[0].SERVICE_NAME,
                        "key": currService[0].SERVICE_NAME,
                        "id": currService[0].ID,
                        "data": currService[0].SERVICE_NAME,
                        "expandedIcon": "pi pi-folder-open",
                        "collapsedIcon": "pi pi-folder",
                        "children": serviceLeaf
                    });
                }

            }
            serviceLeaf = [];
            tempByService = [];
            currService = {};
        });
    }

    return serviceNode;

}


async function customerNodeHelper(tempOnlyCustomers, customers, services) {

    let customerIds = [];
    let customersNode = [];
    tempOnlyCustomers.map(customer => {
        customerIds.push({ id: customer.contractid });
    });

    if (customerIds.length <= 0) {
        return customersNode;
    }

    let listOfUniqueCustomres = _.uniqBy(customerIds, "id");


    let currentCust = {};
    let templatesByCustomer = [];

    let customerLeaf = [];
    if (listOfUniqueCustomres.length > 0) {
        listOfUniqueCustomres.map(customer => {
            templatesByCustomer = tempOnlyCustomers.filter(tempC => {
                return tempC.contractid == customer.id
            });
            if (templatesByCustomer.length > 0) {
                currentCust = _.filter(customers, function (o) { return o.ID == customer.id });
                if (currentCust.length > 0) {
                    customerLeaf = sortCustomerByService(templatesByCustomer, services, currentCust[0].ID);
                    customersNode.push({
                        "label": currentCust[0].NAME,
                        "key": currentCust[0].NAME,
                        "data": currentCust[0].NAME,
                        "id": currentCust[0].ID,
                        "customerId": currentCust[0].ID,
                        "bc_name": currentCust[0].BC_NAME,
                        "bc_company_id": currentCust[0].BC_COMPANY_ID,
                        "expandedIcon": "pi pi-folder-open",
                        "collapsedIcon": "pi pi-folder",
                        "children": customerLeaf
                    });
                    customerLeaf = [];
                }
            }
        });
    }

    return customersNode

}

function sortCustomerByService(templatesByCustomer, services, customerId) {

    // TODO - create the tree modules for customers
    let tempWithoutService = templatesByCustomer.filter(temp => {
        return temp.services == "";
    });
    let tempWithService = templatesByCustomer.filter(temp => {
        return temp.services != ""
    });
    let tempWithServiceIds = [];
    if (tempWithService.length > 0) {
        tempWithService.map(temp => {
            tempWithServiceIds.push({ id: temp.services });
        });
    }

    let listOfUniqueServices = _.uniqBy(tempWithServiceIds, "id");

    let tempForCustomer = [];
    let leafForCutomerByService = [];
    let curr_service = {};
    let serviceToCustomerNode = [];
    if (listOfUniqueServices.length > 0) {
        listOfUniqueServices.map(service => {
            tempForCustomer = tempWithService.filter(tempC => {
                return tempC.services == service.id
            });
            curr_service = services.filter(serv => {
                return serv.ID == service.id
            });
            if (tempForCustomer.length > 0 && curr_service.length > 0) {
                leafForCutomerByService = generateLeaf(tempForCustomer);
                serviceToCustomerNode.push({
                    "label": curr_service[0].SERVICE_NAME,
                    "key": curr_service[0].SERVICE_NAME,
                    "id": curr_service[0].ID,
                    "data": curr_service[0].SERVICE_NAME,
                    "customerId": customerId,
                    "expandedIcon": "pi pi-folder-open",
                    "collapsedIcon": "pi pi-folder",
                    "children": leafForCutomerByService
                });

            }
            tempForCustomer = [];
        });
    }

    // generate leaf for templates without service
    if (tempWithoutService.length > 0) {
        let leafTempWithoutService = generateLeaf(tempWithoutService);
        if (leafTempWithoutService.length > 0) {
            serviceToCustomerNode.push({
                "label": `${others}`,
                "key": `${others}`,
                "id": `${others}`,
                "data": `${others}`,
                "customerId": customerId,
                "expandedIcon": "pi pi-folder-open",
                "collapsedIcon": "pi pi-folder",
                "children": leafTempWithoutService
            });
        }
    }

    return serviceToCustomerNode;

}



function generateLeaf(childrens) {
    let leafs = [];
    if (childrens.length > 0) {
        childrens.map(child => {
            leafs.push({
                "label": child.name,
                "key": child.id,
                "icon": "pi pi-file",
                "data": child.name,
                "service": child.services,
                "leaf": 1,
                "customer": child.contractid,

            });
        });
    }

    return leafs;
}



async function serviceToCustomers() {
    let serviceToCustomer = await ServiceToCustomer.findAll({
        order: [
            ['ID', 'ASC']
        ],
        include: [
            {
                model: Customers,
                required: true,
            },
            {
                model: ServiceName,
                require: true
            }
        ]
    }).catch(err => {
        loggerPino.error(err);
        loggerPino.error(new Error().stack);
        throw "Database error";
    });

    if (serviceToCustomer) {
        let remapedCToS = [];
        serviceToCustomer.map(cToS => {
            remapedCToS.push({
                ID: cToS.Customer.ID,
                NAME: cToS.Customer.NAME,
                BC_COMPANY_ID: cToS.Customer.BC_COMPANY_ID,
                BC_NAME: cToS.Customer.BC_NAME,
                SERVICE_ID: cToS.ServiceName.ID,
                SERVICE_NAME: cToS.ServiceName.SERVICE_NAME
            })
        });
        // return _.uniqWith(remapedCToS, _.isEqual);
        return remapedCToS;
    }

}


async function getAllCustomers() {
    let results = [];
    let customers = await Customers.findAll(
    ).catch(err => {
        loggerPino.error(err);
        loggerPino.error(new Error().stack);
        throw "Database error"
    });
    if (customers.length > 0) {
        customers.forEach((obj) => {
            results.push({
                ID: obj.dataValues.ID,
                NAME: obj.dataValues.NAME,
                BC_COMPANY_ID: obj.dataValues.BC_COMPANY_ID,
                BC_NAME: obj.dataValues.BC_NAME
            });
        })

        return results;
    }
}



async function getServices() {
    let results = [];
    let services = await ServiceName.findAll().catch(
        err => {
            loggerPino.error(err);
            loggerPino.error(new Error().stack);
            throw "Database error"
        }
    );
    if (services.length > 0) {
        services.forEach((obj) => {
            results.push({
                ID: obj.ID,
                SERVICE_NAME: obj.SERVICE_NAME
            });
        });

        return results;
    }
}

// Tree node structure for Actions START //
exports.getNodesForActions = (req, res) => {
    const { cachedFiles } = req.body;
    exports.nodeGenActions(cachedFiles).then(response => {
        return res.status(200).send(response);
    }).catch(error => {
        loggerPino.error(error);
        return res.status(500).send("Internal server error!");
    });
};

exports.nodeGenActions = async (cachedFiles) => {
    const cachedFilesJson = JSON.parse(cachedFiles);
    let treeNode = [{
        label: "Customers",
        key: "Customers",
        data: "Customers Folder",
        children: []
    },
    {
        label: "Services",
        key: "Services",
        data: "Services Folder",
        children: []
    }];
    // load all active customers
    const customers = await exports.loadActiveCustomer();
    for (let customer of customers) {
        let customerServices = [];
        // load all customer services
        const services = await exports.loadServicesByCustomer(customer.id);
        for (let service of services) {
            // load all assigned templates for specify customer and service
            const actions = await exports.getActionByServiceAndCustomer(customer.id, service.id);
            if (actions.length > 0) {
                customerServices.push({
                    "label": service.name,
                    "key": customer.name + "-" + service.name + "-" + service.id,
                    "data": { id: service.id, type: "service" },
                    "children": actions
                });
            }
        }
        if (customerServices.length > 0) {
            treeNode[0].children.push({
                "label": customer.name,
                "key": customer.name + "-" + customer.id,
                "data": { id: customer.id, type: "customer" },
                "children": customerServices,
            });
        }
    }
    const services = await exports.loadServices();
    treeNode[1].children = services;

    for( node of treeNode ) {
        cachedFilesJson.find((cachedNode) => {
            if(node.label == cachedNode.label){
               let keys = [];
               exports.findKeys(keys, cachedNode);
               exports.applyKeys(keys, node);
            }
        })
    }

    return treeNode;
};

exports.loadActiveCustomer = async () => {
    let customers = await Customers.findAll({
        where: {
            ACTIVE: true
        }
    }).catch(error => {
        loggerPino.error(error);
        throw new Error("Database error!");
    });
    let results = [];
    if (customers.length > 0) {
        customers.forEach((obj) => {
            results.push({
                id: obj.ID,
                name: obj.NAME,
                bcCompanyId: obj.BC_COMPANY_ID ? obj.BC_COMPANY_ID : "",
                bcName: obj.BC_NAME ? obj.BC_NAME : "",
                active: obj.ACTIVE
            });
        });
    }
    return results;
};

exports.loadServicesByCustomer = async (customerId) => {
    const serviceToCustomer = await ServiceToCustomer.findAll({
        where: {
            CUSTOMER_ID: customerId
        },
        include: [{
            required: true,
            attributes: ["ID", "SERVICE_NAME"],
            model: ServiceName
        }]
    }).catch(error => {
        loggerPino.error(error);
        throw new Error("Database error!");
    });
    let results = [];
    if (serviceToCustomer.length > 0) {
        serviceToCustomer.forEach((obj) => {
            results.push({
                id: obj.dataValues.ServiceName.ID,
                name: obj.dataValues.ServiceName.SERVICE_NAME
            });
        });
    }
    return results;
};

exports.getActionByServiceAndCustomer = async (customerId, serviceId) => {
    const serviceToCustomer = await ServiceToCustomer.findOne({
        attributes: ["ID"],
        where: {
            CUSTOMER_ID: customerId, SERVICE_ID: serviceId
        },
        include: [{
            attributes: ["ID", "TEMPLATE_ID"],
            required: true,
            model: TemplateToServiceToCustomer,
            include: [{
                attributes: ["ID", "NAME","ENABLED"],
                required: false,
                model: Templates
            }]
        }]
    }).catch(error => {
        loggerPino.error(error);
        throw new Error("Database error!");
    });
    let templates = [];
    if (serviceToCustomer) {
        serviceToCustomer["dataValues"]["TemplateToServiceToCustomers"].forEach(result => {
            templates.push({
                label: result["Template"]["dataValues"].NAME,
                key: customerId + "-" + serviceId + "-" + result["Template"]["dataValues"].ID,
                data: { id: result["Template"]["dataValues"].ID, type: "action" },
                enabled: result["Template"]["dataValues"].ENABLED,
                styleClass: result["Template"]["dataValues"].ENABLED ? "" : "disabledAction",
                leaf: 1
            });
        });
    }
    const sortedTemplates = exports.sortTemplates(templates);
    return sortedTemplates;
};

exports.loadServices = async () => {
    const serviceName = await ServiceName.findAll({
    }).catch(error => {
        loggerPino.error(error);
        throw new Error("Database error!");
    });
    let services = [];
    for (let service of serviceName) {
        // load all templates which is assignet to specify service
        const templates = await exports.loadActionsByService(service["dataValues"].ID);
        if (templates && templates.length > 0) {
            services.push({
                "label": service["dataValues"].SERVICE_NAME,
                "key": service["dataValues"].SERVICE_NAME + "-" + service["dataValues"].ID,
                "data": { id: service["dataValues"].ID, type: "service" },
                "children": templates
            });
        }
    }
    return services;
};

exports.loadActionsByService = async (serviceId) => {
    const templateToService = await TemplateToService.findAll({
        attributes: ["ID"],
        where: {
            SERVICE_ID: serviceId
        },
        include: [{
            attributes: ["ID", "NAME", "ENABLED"],
            required: false,
            model: Templates
        }]
    }).catch(error => {
        loggerPino.error(error);
        throw new Error("Database error!");
    });
    let templates = [];
    if (templateToService) {
        templateToService.forEach(result => {
            templates.push({
                label: result["dataValues"]["Template"]["dataValues"].NAME,
                key: result["dataValues"]["Template"]["dataValues"].NAME + "-" + serviceId + "-" + result["dataValues"]["Template"]["dataValues"].ID,
                "data": { id: result["dataValues"]["Template"]["dataValues"].ID, type: "action" },
                enabled: result["dataValues"]["Template"]["dataValues"].ENABLED,
                styleClass: result["dataValues"]["Template"]["dataValues"].ENABLED ? "" : "disabledAction",
                leaf: 1
            });
        });
    }
    const sortedTemplates = exports.sortTemplates(templates);
    return sortedTemplates;
};
// Tree node structure for Actions END //


//function to sort TreeNode by enabled attributes and alphabetically
exports.sortTemplates = (templates) => {
    const sortedTemplates = templates.sort(
        function (a, b) {
            if (a.enabled < b.enabled) return 1;
            if (a.enabled > b.enabled) return -1;
            return a.label.localeCompare(b.label);
        });
    return sortedTemplates;
}
// function to find expanded node kyes
exports.findKeys = function (keys, tree) {
    if ("leaf" in tree) {
        return keys;
    }

    if ("expanded" in tree) {
        keys.push(tree["key"]);
    }
    if ("children" in tree) {
        for (child of tree["children"]) {
            exports.findKeys(keys, child);
        }
    }

}
// function to apply expanded attribute from node kyes to new generated tree
exports.applyKeys = function (keys, tree) {
    if ("leaf" in tree) {
        return keys;
    }
    if (keys.includes(tree.key)) {
        tree["expanded"] = true
    }
    if ("children" in tree) {
        for (child of tree["children"]) {
            exports.applyKeys(keys, child);
        }
    }
}

