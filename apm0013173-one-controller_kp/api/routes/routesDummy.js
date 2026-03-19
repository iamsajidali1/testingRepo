// Routes meant for testing purposes
const csrf = require('csurf');
const utils = require("../controllers/utils");
const cookieParser = require("cookie-parser");


exports.getCsrfConfig = () => {
    return csrf({ cookie: true, value: utils.handleCsrfValue });
};


exports.addDummyRoutes = (app) => {
    // add routes for all HTTP verbs
    return app.route("/dummy/csrf").all(
        cookieParser(), exports.getCsrfConfig(), utils.apiHeadersCookies
    );
};
