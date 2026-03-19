const { cookieReader } = require("../controllers/utils");
const { cookieReaderAllowedFor } = require("../constants");


exports.addUtilsRoutes = (app) => {
    const routes = [];
    for (const cookie of cookieReaderAllowedFor) {
        routes.push(
            app.route(`/cookieReader/${cookie}`).get(cookieReader(cookie))
        );
    }
    return routes;
};
