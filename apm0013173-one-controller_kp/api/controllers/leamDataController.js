const Sequelize = require("sequelize");
const { Customer } = require("../models/customerModel");
const { Assignment } = require("../models/assignmentModel");
const { ServiceLine } = require("../models/serviceLineModel");
const { check, validationResult, query } = require("express-validator");


exports.get_customer_by_le = [[
    query("attuid").trim(),
    check("attuid").isLength({min: 6, max: 6})
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    } else {
        // pull all assignment objects for specific ATTUID
        Assignment.findAll({
            attributes: ["customer_id"],
            where: {
                attuid: req.query.attuid
            }
        }).then((customerIDs) => {
            // pull customer IDs to array
            let ids = [];
            customerIDs.forEach((obj) => {
                ids.push(obj.dataValues.customer_id);
            });

            // pull customers by their IDs
            Customer.findAll({
                attributes: ["name", "external_customer_id"],
                where: {
                    customer_id: {
                        [Sequelize.Op.in]: ids
                    }
                }
            }).then((customers) => {
                // pull final values from customer objects and JSONify
                let results = [];
                customers.forEach((obj) => {
                    results.push({
                        name: obj.dataValues.name,
                        external_customer_id: obj.dataValues.external_customer_id
                    });
                });
                return res.json(results);
            });
        });
    }
}];

exports.get_customers = function(req, res){
    Customer.findAll({
        attributes: ["name", "external_customer_id"]
    }).then((customers) => {
        // pull final values from customer objects and JSONify
        let results = [];
        customers.forEach((obj) => {
            results.push({
                name: obj.dataValues.name,
                external_customer_id: obj.dataValues.external_customer_id
            });
        });
        return res.json(results);
    });
};
// in leam database external customer max lenght should be 25
exports.get_customers_services = [[
    query("id").trim(),
    check("id").isLength({min: 1, max: 25})
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    } else {
        ServiceLine.findAll({
            attributes: ["name", "service_line_id"]
        }).then((lines) => {
            // create ID -> name map for const access
            let mapLines = {};
            lines.forEach((obj) => {
                mapLines[obj.dataValues.service_line_id] = obj.dataValues.name;
            });

            Customer.findAll({
                attributes: ["external_customer_id", "service_line_id"],
                where: {
                    external_customer_id: req.query.id
                }
            }).then((customers) => {
                // pull final values from customer objects and JSONify
                let results = [];
                customers.forEach((obj) => {
                    results.push({
                        external_customer_id: obj.dataValues.external_customer_id,
                        name: mapLines[obj.dataValues.service_line_id]
                    });
                });
                return res.json(results);
            });
        });
    }
}];

exports.get_customers_services_by_customer_name =  [[
    query("customerName").trim(),
    check("customerName").isLength({min: 1, max: 255})
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    } else {
        ServiceLine.findAll({
            attributes: ["name", "service_line_id"]
        }).then((lines) => {
            // create ID -> name map for const access
            let mapLines = {};
            lines.forEach((obj) => {
                mapLines[obj.dataValues.service_line_id] = obj.dataValues.name;
            });

            Customer.findAll({
                attributes: ["external_customer_id", "service_line_id"],
                where: {
                    name: req.query.customerName
                }
            }).then((customers) => {
                // pull final values from customer objects and JSONify
                let results = [];
                customers.forEach((obj) => {
                    results.push({
                        name: mapLines[obj.dataValues.service_line_id],
                        external_customer_id: obj.dataValues.external_customer_id
                    });
                });

                return res.json(results);
            });
        });
    }
}];
