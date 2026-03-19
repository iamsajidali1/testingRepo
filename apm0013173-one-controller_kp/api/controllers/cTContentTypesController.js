const { CTContentTypes } = require("../models/cTContentTypes");


exports.get_conf_template_content_types = function (req, res) {
    CTContentTypes.findAll()
        .then((cTContentTypes) => {
            let results = [];
            cTContentTypes.forEach((obj) => {
                results.push({
                    id: obj.ID,
                    contentType: obj.CONTENT_TYPE
                });
            });

            return res.json(results);
        }).catch(err => {
            console.error(err);
            return res.status(500).send({ message: "Database error" });
        });
};
