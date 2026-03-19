const { CTVendorTypes } = require("../models/cTVendorTypes");


exports.get_conf_template_vendor_types = function (req, res) {
    CTVendorTypes.findAll()
        .then((cTContentTypes) => {
            let results = [];
            cTContentTypes.forEach((obj) => {
                results.push({
                    id: obj.ID,
                    vendorType: obj.VENDOR_TYPE
                });
            });

            return res.json(results);
        }).catch(err => {
            console.error(err);
            return res.status(500).send({ message: "Database error" });
        });
};
