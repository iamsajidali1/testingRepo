const { ServiceName } = require("../models/serviceNameModel");


exports.get_services = function (req, res) {
    ServiceName.findAll()
        .then((sName) => {
            let results = [];
            sName.forEach((obj) => {
                results.push({
                    ID: obj.ID,
                    SERVICE_NAME: obj.SERVICE_NAME
                });
            });

            return res.json(results);
        }).catch(err => {
            console.error(err);
            return res.status(500).send({ message: "Database error" });
        });
};
