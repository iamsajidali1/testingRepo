const { Customer } = require("../models/customerModel");


exports.get_customer_ID_by_le = function(req, res){
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




