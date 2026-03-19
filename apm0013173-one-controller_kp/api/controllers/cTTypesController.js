const { CTTypes } = require("../models/cTTypes");


exports.get_conf_template_types = function (req, res) {
    CTTypes.findAll()
        .then((cTContentTypes) => {
            let results = [];
            cTContentTypes.forEach((obj) => {
                results.push({
                    id: obj.ID,
                    templateType: obj.TEMPLATE_TYPE
                });
            });

            return res.json(results);
        }).catch(err => {
            console.error(err);
            return res.status(500).send({ message: "Database error" });
        });
};
