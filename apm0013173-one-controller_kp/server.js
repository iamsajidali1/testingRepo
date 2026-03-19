const express = require("express");
const helmet = require("helmet");
const noCache = require("nocache");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const csrf = require("csurf");
const url = require("url");
const session = require("express-session");
const SequelizeStore = require("connect-session-sequelize");

const passport = require('passport');
const passportAzureAd = require('passport-azure-ad');

const constants = require("./api/constants");
const loggerPino = require("./api/helpers/loggerHelper");
const { getLogger } = require("./utils/logging");
const auth = require("./middleware/auth");
const registerRoutes = require("./api/routes/routes");
const registerOauthRoutes = require("./api/routes/routesOauth");
const registerAafRoutes = require("./api/routes/routesAaf");
const utils = require("./api/controllers/utils");
const mw = require("@com.att.bok.express-middlewares/bok-express-middlewares");
const authHandler = require("./middleware/authHandler");
const oAuthConfig = require("./oAuthConfig");
const transaction = require("./middleware/transaction");
const dataHandler = require("./middleware/dataHandler");
const permission = require("./middleware/permission");
const reqLogger = require("./middleware/logger");
const { paperplane } = require("./middleware/paperplane");
const { businessCenter } = require("./middleware/businessCenter");


exports.createApp = () => {
    const app = express();
    app.disable("x-powered-by");
    return app;
};

exports.getGlobalConfig = () => {
    const { CONFIG } = require("./api/config/configuration");
    return CONFIG;
};

exports.connectMySQL = () => require(
    "./api/models/databaseOne"
).Database.getInstance();

// Enabled for origins ending with suffix "att.com" with cookies allowed
exports.getCorsConfig = () => ({
    "allowedHeaders": constants.allowedHeaders,
    "credentials": constants.credentials,
    "exposedHeaders": constants.exposedHeaders,
    "methods": constants.methods,
    "origin": { "RegExp": constants.corsRegex },
    "preflightContinue": constants.preflightContinue
});

// TODO: executes MySQL connect on import!
exports.getScheduleProcess = () => require("./middleware/scheduler");

exports.getCsrfConfig = () => csrf({
    "cookie": constants.csrfUseCookie, "value": utils.handleCsrfValue
});

// Actually, is used as constructor, but ESLint can't identify from return
/* eslint-disable-next-line new-cap */
exports.createSessionStore = () => SequelizeStore(session.Store);

exports.getSessionConfig = (config) => {
    // TODO: set "secure" to true on non-local environment
    const Store = exports.createSessionStore();

    /*
     * TODO:
     * 1) Cookie “sessionId” will be soon rejected because it has the
     *   "sameSite" attribute set to “none” or an invalid value, without the
     *   "secure"  attribute. To know more about the “sameSite“ attribute,
     *   developer.mozilla.org/docs/Web/HTTP/Headers/Set-Cookie/SameSite
     *
     * 2) sessionId -> enable HttpOnly to prevent XSS/stealing
     *   + add:
     *   sessionIdSafe: <req.session> (w/o checksum)
     *   non-HttpOnly
     *   the rest remains
     */
    return session({
        "cookie": {
            // Allow accessing session via JS on FE
            "httpOnly": false
        },
        "name": constants.sessionCookie,
        // Required for Sequelize
        "resave": false,
        "saveUninitialized": true,
        "secret": config.SESSION_SECRET,
        "store": new Store({
            "db": exports.connectMySQL(),
            "expiration": constants.timeMs.year
        })
    });
};

exports.resolveHomeUrl = (req) => {
    const log = getLogger();
    const { "sessionID": ses } = req;
    log.info(`${ses}: Resolving homeURL for redirect by AAF middleware`);

    const { globalLogonAppName, globalLogonHost, globalLogonPath } = constants;

    /*
     * We need the original URL because one FE is on "/" and one on "/one",
     * so removing it causes unauthorized user on /one passing through GL
     * being redirected into / only (wrong FE).
     */
    const origUrl = `${req.protocol}://${req.hostname}${req.originalUrl}`;
    log.info(`${ses}: Original URL was: "${origUrl}"`);

    const homeUrl = new url.URL(globalLogonPath, globalLogonHost);
    homeUrl.searchParams.set("sysName", globalLogonAppName);
    homeUrl.searchParams.set("retURL", origUrl);
    const result = homeUrl.toString();
    log.info(`${ses}: Home URL is: "${result}"`);

    return result;
};

exports.loadMiddlewares = (app, config) => {
    app.use(cors(exports.getCorsConfig()));
    app.use(bodyParser.urlencoded({
        "extended": true,
        "limit": constants.bodyLimit,
        "parameterLimit": constants.bodyParameterLimit
    }));
    app.use(bodyParser.json({ "limit": constants.bodyLimit }));

    // Parse cookies to JS key-value pairs
    app.use(cookieParser());

    // Set secure HTTP headers
    app.use(helmet());

    // Express-session
    app.use(exports.getSessionConfig(config));

    // Log HTTP requests
    app.use(reqLogger.getLogger());

    // TODO: why noCache? FE should use Cache Control!
    app.use(noCache());

    app.use(businessCenter);

    // Microsoft oAuth Config Starts Here
    // const bearerStrategy = new passportAzureAd.BearerStrategy({
    //     identityMetadata: `https://${oAuthConfig.metadata.authority}/${oAuthConfig.credentials.tenantID}/${oAuthConfig.metadata.version}/${oAuthConfig.metadata.discovery}`,
    //     issuer: `https://${oAuthConfig.metadata.issuerAuthority}/${oAuthConfig.credentials.tenantID}/`,
    //     clientID: oAuthConfig.credentials.clientID,
    //     audience: `api://${oAuthConfig.credentials.clientID}`,
    //     validateIssuer: oAuthConfig.settings.validateIssuer,
    //     passReqToCallback: oAuthConfig.settings.passReqToCallback,
    //     loggingLevel: oAuthConfig.settings.loggingLevel,
    //     loggingNoPII: oAuthConfig.settings.loggingNoPII,
    // }, (req, token, done) => {
    //     /**
    //      * If needed, pass down additional user info to route using the second argument below.
    //      * This information will be available in the req.user object.
    //      */
    //     return done(null, {}, token);
    // });
    // app.use(passport.initialize());

    // passport.use(bearerStrategy);
    
    // Auth Middleware
    // app.use(async (req, res, next) => {
    //     if (req.isBcUser) {
    //         return await next();
    //     }
    //     // Skip for oAuth for oAuth Routes
    //     if ((req.url).startsWith('/api/oauth/')) {
    //         return await next();
    //     }
    //     // Use GL OIDC or AAF Basic Auth
    //     await authHandler.auth(req, res, next);
    // });
    // Post Auth User Checks
    app.use(auth.auth);

    // // Add bok-express-middlewares UPM levels management if non-BC user
    // app.use(async (req, res, next) => {
    //     if (req.isBcUser) {
    //         return await next();
    //     }
    //     // Skip UPM Checks for Requests made for Cron Jobs
    //     if (constants.upmExcludePaths.some(path => req.url.startsWith(path))) {
    //         return await next();
    //     }
    //     // TODO: Better Logic
    //     // Skip UPM Checks for Bearer oAuth
    //     if ((req.url).startsWith('/oauth')) {
    //         return await next();
    //     }

    //     return await mw.upm({
    //         "appId": constants.upmAppID,
    //         "passOnMissing": true
    //     })(req, res, next);
    // });     
    
};

exports.loadDataMiddlewares = (app) => {
        // Check transaction data
        app.use(transaction.transaction);

        // Check permission
        //app.use(permission.permission);
    
        // Store data for transaction if permission is granted
        app.use(dataHandler.dataHandler);
    
        // Schedule process on MCAP
        const { scheduleProcess } = exports.getScheduleProcess();
        app.use(scheduleProcess);
    
        // Global email-error handler
        // app.use(paperplane);

}

exports.mainFunc = () => {
    const app = exports.createApp();
    const globalConfig = exports.getGlobalConfig();

    exports.connectMySQL();

    // Accept X-Forwarded-* headers
    app.set("trust proxy", true);
    exports.loadMiddlewares(app, globalConfig);
    registerOauthRoutes(app);
    registerAafRoutes(app);

    // app.use(exports.getCsrfConfig());
    // app.use((req, res, next) => {
    //     utils.createCsrfHeader(req, res);
    //     next();
    // });
    exports.loadDataMiddlewares(app);

    registerRoutes(app);

    // Bind to 0.0.0.0 (all IFs) with port specified
    const port = constants.listenPort;
    app.listen(port, () => {
        loggerPino.info(`Started env ${process.env.CSS_ENV} on port ${port}`);
    });
};


/**
 * Guard against accidental server start due to import/require() call.
 *
 * module.parent === null when:
 * $ node file.js
 * $ pm2-runtime file.js
 * $ pm2-runtime start ecosystem.config.js
 */
if (module.parent === null) {
    exports.mainFunc();
}
