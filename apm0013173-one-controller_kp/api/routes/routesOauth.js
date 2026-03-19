const passport = require("passport");

module.exports = (app) => {
    const tdcController = require("../controllers/tdcController.js");
    const eocController = require("../controllers/eocController.js");
    const characteristicSpecificationController = require("../controllers/characteristicSpecificationController.js");

    // TDC Route oAuth Driven
    app.route("/oauth/tdc/test")
        .get(passport.authenticate("oauth-bearer", { "session": false }), tdcController.testAuth);

    app.route("/oauth/tdc/tdc-data")
        .post(passport.authenticate("oauth-bearer", { "session": false }), tdcController.addTdcRecords);
    app.route("/oauth/tdc/tdc-data")
        .put(passport.authenticate("oauth-bearer", { "session": false }), tdcController.updateTDCData);
    app.route("/oauth/tdc/tdc-data/:deviceId")
        .patch(passport.authenticate("oauth-bearer", { "session": false }), tdcController.patchTDCData);

    app.route("/oauth/tdc/characteristic-specification")
        .get(passport.authenticate("oauth-bearer", { "session": false }), characteristicSpecificationController.getCharacteristicSpecifications)
        .post(passport.authenticate("oauth-bearer", { "session": false }), characteristicSpecificationController.createCharacteristic);

    app.route("/oauth/tdc/characteristic-specification/:id")
        .get(passport.authenticate("oauth-bearer", { "session": false }), characteristicSpecificationController.getCharacteristicSpecification)
        .patch(passport.authenticate("oauth-bearer", { "session": false }), characteristicSpecificationController.patchCharacteristicSpecification);

};
