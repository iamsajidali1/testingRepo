const { Customers } = require("../models/customerOneModel");
const { ServiceName } = require("../models/serviceNameModel");
const { ServiceToCustomer } = require("../models/serviceToCustomerModel");
const { GruaDataToCustomer } = require("../models/gruaDataToCustomerModel");
const { GruaData } = require("../models/gruaDataModel");
const { check, validationResult, body, query } = require("express-validator");
const oneConnection = require("../models/databaseOne").Database.getInstance();
const { getLogger } = require("../../utils/logging");
const { serviceUnavailable, ok, unprocessableEntity, badRequest } = require("../statuses");
const { executeCaching } = require("../controllers/cacheDevicesController");
const { "stringify": str } = JSON;

exports.getCustomer = [[
    query("id").trim(),
    check("id").isNumeric()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).send({ message: errors });
    }
    exports.getCustomerById(req.query).then(customer => {
        return res.status(200).send({ message: "Successful!", result: customer });
    }).catch(error => {
        return res.status(500).send({ message: error, errorId: "" });
    });
}];

exports.getCustomerById = async (query) => {
    let customer = await Customers.findOne(
        {
            where: { ID: query["id"] }
        }
    ).catch(error => {
        console.log(error);
        throw "Database error";
    });
    if (customer.dataValues) {
        let result = {
            id: customer.dataValues.ID,
            name: customer.dataValues.NAME,
            bcCompanyId: customer.dataValues.BC_COMPANY_ID ? customer.dataValues.BC_COMPANY_ID : "",
            bcName: customer.dataValues.BC_NAME ? customer.dataValues.BC_NAME : "",
            active: customer.dataValues.ACTIVE,
            crWebId: customer.dataValues.CRWEB_ID,
            msimEmail: customer.dataValues.MSIM_EMAIL ? customer.dataValues.MSIM_EMAIL : "",
        };
        return result;
    }
};

exports.getCustomerByBcCompanyId = async (bcCompanyId) => {
    const customer = await Customers.findOne({
        where: { BC_COMPANY_ID: bcCompanyId }
    }).catch(error => {
        console.log(error);
        throw new Error(`Database error: Unable to find the customer for the given BC_COMPANY_ID: ${bcCompanyId}`);
    })
    if (customer && customer.dataValues) {
        return {
            id: customer.dataValues.ID,
            name: customer.dataValues.NAME,
            bcCompanyId: customer.dataValues.BC_COMPANY_ID ? customer.dataValues.BC_COMPANY_ID : "",
            bcName: customer.dataValues.BC_NAME ? customer.dataValues.BC_NAME : "",
            active: customer.dataValues.ACTIVE
        };
    }
}

exports.getCustomerForBcUser = async (req, res) => {
    const ebizCompanyId = req.ebizCompanyId;
    if (!ebizCompanyId) {
        return res.status(unprocessableEntity).json({
            message: "ebizCompanyId is not set, please access through business center!",
            errorId: ""
        });
    }
    const customer = await exports.getCustomerByBcCompanyId(ebizCompanyId).catch(error => {
        console.log(error);
        return res.status(serviceUnavailable).json({ message: error.message, errorId: "" });
    })
    if (customer) {
        return res.status(ok).json({ message: "Successful!", result: customer });
    }
    return res.status(serviceUnavailable).json({ message: 'Something went wrong!', errorId: "" });
};

exports.getCustomers = async (req, res) => {
    try {
        const customers = await Customers.findAll();
        const results = [];
        if (customers.length > 0) {
            customers.forEach((obj) => {
                results.push({
                    id: obj.dataValues.ID,
                    name: obj.dataValues.NAME,
                    bcCompanyId: obj.dataValues.BC_COMPANY_ID ? obj.dataValues.BC_COMPANY_ID : "",
                    bcName: obj.dataValues.BC_NAME ? obj.dataValues.BC_NAME : "",
                    active: obj.dataValues.ACTIVE,
                    crWebId: obj.dataValues.CRWEB_ID,
                    msimEmail: obj.dataValues.MSIM_EMAIL ? obj.dataValues.MSIM_EMAIL : "",
                });
            });
        }
        return res.status(200).json(results);
    } catch (error) {
        console.log(error);
        return res
            .status(500)
            .send({ message: "Internal server error!", errorId: "" });
    }
};

exports.getCustomerByStatus = [[
    query("active").trim(),
    check("active").isBoolean()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).send({ message: errors });
    }
    exports.getCustomerByStatusAsync(req.query.active).then(customer => {
        return res.status(200).send({ message: "Successful!", result: customer });
    }).catch(error => {
        return res.status(500).send({ message: error, errorId: "" });
    });
}];

exports.getCustomerByStatusAsync = async (status) => {
    let active = true;
    if (status != "true") {
        active = false;
    }
    let customers = await Customers.findAll({
        where: {
            ACTIVE: active
        }
    }).catch(error => {
        console.log(error);
        throw "Database error";
    });
    if (customers.length > 0) {
        let results = [];
        customers.forEach((obj) => {
            results.push({
                id: obj.ID,
                name: obj.NAME,
                bcCompanyId: obj.BC_COMPANY_ID ? obj.BC_COMPANY_ID : "",
                bcName: obj.BC_NAME ? obj.BC_NAME : "",
                active: obj.ACTIVE,
                crWebId: obj.CRWEB_ID,
                msimEmail: obj.MSIM_EMAIL ? obj.MSIM_EMAIL : "",
            });
        });
        return results;
    }
};

exports.createCustomer = [[
    body("name").trim(),
    check("name").isLength({ min: 1, max: 150 }),
    body("bcCompanyId").trim(),
    check("bcCompanyId").isLength({ min: 0, max: 150 }),
    body("bcName").trim(),
    check("bcName").isLength({ min: 0, max: 255 }),
    body("active")
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).send({ message: errors });
    }
    exports.createCustomerAsync(req.body).then(customer => {
        return res.status(200).send({ message: "Successful!", id: customer["ID"] });
    }).catch(error => {
        return res.status(500).send({ message: error, errorId: "" });
    });
}];

exports.createCustomerAsync = async (body) => {
    try {
        const result = await oneConnection.transaction({ autocommit: true }, function (t) {
            return Customers.create({
                NAME: body["name"],
                BC_COMPANY_ID: body["bcCompanyId"],
                BC_NAME: body["bcName"],
                ACTIVE: body["active"],
                CRWEB_ID: body["crWebId"],
                MSIM_EMAIL: body["msimEmail"]
            }, { transaction: t });
        }).then(function (result) {
            return result.dataValues;
        }).catch(function (error) {
            throw error;
        });
        return result;
    } catch (error) {
        console.log(error);
        return error;
    }
};

exports.updateCustomer = [[
    body("id").trim(),
    check("id").isNumeric(),
    body("name").trim(),
    check("name").isLength({ min: 1, max: 150 }),
    body("bcCompanyId").trim(),
    check("bcCompanyId").isLength({ min: 0, max: 150 }),
    body("bcName").trim(),
    check("bcName").isLength({ min: 0, max: 255 }),
    body("active")
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).send({ message: errors });
    }
    exports.updateCustomerAsync(req.body).then(result => {
        if (result && result["message"]) {
            return res.status(200).send({ message: result.message, errorId: "" });
        } else {
            return res.status(200).send({ message: "Successful!", id: req.body["id"] });
        }
    }).catch(error => {
        console.log(error);
        return res.status(500).send({ message: error, errorId: "" });
    });
}];

exports.updateCustomerAsync = async (body) => {
    try {
        const result = await oneConnection.transaction({ autocommit: true }, async function (t) {
            const customer = await Customers.update({
                NAME: body["name"],
                BC_COMPANY_ID: body["bcCompanyId"],
                BC_NAME: body["bcName"],
                ACTIVE: body["active"],
                CRWEB_ID: body["crWebId"],
                MSIM_EMAIL: body["msimEmail"]
            }, {
                where: {
                    ID: body["id"]
                }
            }, { transaction: t });
            if (customer[0]) {
                return customer;
            } else {
                return { dataValues: { message: "Record is already up to date!" } };
            }

        }).then(function (result) {
            return result.dataValues;
        }).catch(function (error) {
            throw error;
        });
        return result;
    } catch (error) {
        console.log(error);
        return error;
    }
};

exports.deleteServiceToCustomer = [[
    query("customerId").trim(),
    check("customerId").isNumeric(),
    query("serviceId").trim(),
    check("serviceId").isNumeric()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).send({ message: errors });
    }
    exports.deleteServiceToCustomerAsync(req.query).then(result => {
        if (result["message"] == "Successful!") {
            return res.status(200).send({ message: "Successful!" });
        } else {
            return res.status(400).send({ message: result.message, errorId: "" });
        }
    }).catch(error => {
        console.log(error);
        return res.status(500).send({ message: "Internal server error!", errorId: "" });
    });
}];

exports.deleteServiceToCustomerAsync = async (query) => {
    try {
        const result = await oneConnection.transaction({ autocommit: true }, async function (t) {
            const serviceToCustomer = await ServiceToCustomer.destroy({
                where: {
                    SERVICE_ID: query["serviceId"],
                    CUSTOMER_ID: query["customerId"]
                }
            }, { transaction: t });
            if (serviceToCustomer) {
                return { message: "Successful!" };
            } else {
                return { message: "Client error!" };
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
};

exports.addServiceToCustomer = [[
    body("customerId").trim(),
    check("customerId").isNumeric(),
    body("serviceId").trim(),
    check("serviceId").isNumeric()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).send({ message: errors });
    }
    exports.addServiceToCustomerAsync(req.body).then(result => {
        if (!result["message"]) {
            return res.status(200).send({ message: "Successful!" });
        } else {
            return res.status(400).send({ message: result.message, errorId: "" });
        }
    }).catch(error => {
        console.log(error);
        return res.status(500).send({ message: "Internal server error!", errorId: "" });
    });
}];

exports.addServiceToCustomerAsync = async (body) => {
    try {
        const result = await oneConnection.transaction({ autocommit: true }, async function (t) {
            const exist = await ServiceToCustomer.findOne({
                where: { SERVICE_ID: body["serviceId"], CUSTOMER_ID: body["customerId"] }
            }, { transaction: t });

            if (exist) {
                return { dataValues: { message: "Servis is already assigned to this customer!" } };
            }

            const customer = await Customers.findOne({
                where: { ID: body["customerId"] }
            }, { transaction: t });

            const service = await ServiceName.findOne({
                where: { ID: body["serviceId"] }
            }, { transaction: t });

            if (customer && service) {
                const serviceToCustomer = await ServiceToCustomer.create({
                    SERVICE_ID: body["serviceId"],
                    CUSTOMER_ID: body["customerId"]
                }, { transaction: t });
                return serviceToCustomer;
            } else {
                return { dataValues: { message: "Client error!" } };
            }
        }).then(function (result) {
            return result.dataValues;
        }).catch(function (error) {
            throw error;
        });
        return result;
    } catch (error) {
        console.log(error);
        return error;
    }
};

exports.getCustomerServices = [[
    query("customerId").trim(),
    check("customerId").isNumeric()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).send({ message: errors });
    }
    exports.getCusotmerServicesAsync(req.query).then(result => {
        return res.status(200).send({ services: result, message: "Successful!" });
    }).catch(error => {
        console.log(error);
        return res.status(500).send({ message: "Internal server error!", errorId: "" });
    });
}];

exports.getCusotmerServicesAsync = async (query) => {
    const serviceToCustomer = await ServiceToCustomer.findAll({
        where: {
            CUSTOMER_ID: query["customerId"]
        },
        include: [{
            required: true,
            attributes: ["ID", "SERVICE_NAME"],
            model: ServiceName
        }]
    }).catch(error => {
        console.log(error);
        throw "Database error";
    });
    let results = [];
    if (serviceToCustomer.length > 0) {
        serviceToCustomer.forEach((obj) => {
            results.push({
                id: obj.dataValues.ServiceName.ID,
                serviceName: obj.dataValues.ServiceName.SERVICE_NAME
            });
        });
    }
    return results;
};

exports.deleteCustomerToServices = [[
    query("customerId").trim(),
    check("customerId").isNumeric(),
    query("serviceId").trim(),
    check("serviceId").isNumeric()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).send({ message: errors });
    }
    exports.deleteCustomerToServicesAsync(req.query).then(result => {
        return res.status(200).send({ customer: result, message: "Successful!" });
    }).catch(error => {
        console.log(error);
        return res.status(500).send({ message: "Internal server error!", errorId: "" });
    });
}];

exports.deleteCustomerToServicesAsync = async (query) => {
    // TODO: Empty Function, removed the logs, please write the function if neeeded
};


exports.getCustomerGRUAsById = async (id) => {
    const log = getLogger();
    try {
        const { dataValues } = await Customers.findOne({
            where: { ID: id },
            include: [{
                attributes: ["GRUA_ID"],
                model: GruaDataToCustomer,
                required: true,
                include: [{
                    attributes: ["ID", "GRUA"],
                    model: GruaData,
                    required: false
                }]
            }]
        });
        const gruas = [];
        dataValues.GruaDataToCustomers.forEach(gruaD2C => {
            gruas.push(gruaD2C["dataValues"]["GruaDatum"]["dataValues"]["GRUA"]);
        })
        return gruas;
    } catch(error) {
        log.error(`Unable to fetch GRUA list for the customer with id: ${str(id)}`);
        return [];
    }
}

exports.loadGruaDataForCustomer = [[
    query("customerId").trim(),
    check("customerId").isNumeric()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(unprocessableEntity).send({ message: errors });
    }
    const log = getLogger();
    const results = [];
    try {
        const gruaData = await Customers.findOne({
            attributes: ["ID"],
            where: { ID: req.query["customerId"] },
            include: [{
                attributes: ["GRUA_ID"],
                model: GruaDataToCustomer,
                required: true,
                include: [{
                    attributes: ["ID", "GRUA"],
                    model: GruaData,
                    required: false
                }]
            }]
        });
        if (gruaData) {
            gruaData["dataValues"]["GruaDataToCustomers"].forEach(gruaDs => {
                results.push({
                    id: gruaDs["dataValues"]["GruaDatum"]["dataValues"]["ID"],
                    grua: gruaDs["dataValues"]["GruaDatum"]["dataValues"]["GRUA"]
                });
            });
        }
        return res.status(ok).send({ result: results, message: "Successful!" });
    } catch (error) {
        log.error(error);
        return res.status(serviceUnavailable).send({ message: "Can not load GRUA data for customer!" });
    };
}];

exports.saveGruaDataForCustomer = [[
    body("customerId").trim(),
    check("customerId").isNumeric(),
    body("grua").trim(),
    check("grua").isLength({ min: 1, max: 255 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(unprocessableEntity).send({ message: errors });
    }
    const log = getLogger();
    try {
        const customers = await Customers.findOne({
            where: { ID: req.body["customerId"] }
        });
        if (!customers) {
            return res.status(badRequest).send({ message: "Customer does not exist!" });
        }
        const result = await oneConnection.transaction({ autocommit: true }, async function (t) {
            const gruaData = await GruaData.create({
                GRUA: req.body["grua"]
            }, { transaction: t });

            if (gruaData && gruaData["dataValues"] && gruaData["dataValues"]["ID"]) {
                const gruaDataToCustomer = await GruaDataToCustomer.create({
                    GRUA_ID: gruaData.dataValues["ID"],
                    CUSTOMER_ID: customers.dataValues["ID"]
                }, { transaction: t });
                if (gruaDataToCustomer && gruaDataToCustomer["dataValues"]) {
                    return gruaDataToCustomer["dataValues"];
                } else {
                    throw new Error("Can not create relation grua data and customer!");
                }
            } else {
                throw new Error("Can not create GRUA data!");
            }
        });
        // Looks like GRUA created Successfully
        // Trigger the Device Caching for this GRUA
        executeCaching([req.body.grua]);
        return res.status(200).send({ id: result["ID"], message: "Successful!" });

    } catch (error) {
        log.error(error);
        return res.status(serviceUnavailable).send({ message: "GRUA data can not be saved!" });
    }
}];


exports.deleteGruaDataForCustomer = [[
    query("id").trim(),
    check("id").isNumeric()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(unprocessableEntity).send({ message: errors });
    }
    const log = getLogger();
    try {
        const result = await oneConnection.transaction({ autocommit: true }, async function (t) {
            const gruaData = await GruaData.destroy({
                where: {
                    ID: req.query["id"]
                }
            }, { transaction: t });
            if (!gruaData) {
                throw new Error("Grua data can not be removed!");
            }
            return gruaData;
        });
        return res.status(200).send({ result: result, message: "Successful!" });
    } catch (error) {
        log.error(error);
        return res.status(serviceUnavailable).send({ message: "GRUA data can not be removed!" });
    }
}];
