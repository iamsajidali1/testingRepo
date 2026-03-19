const axios = require("axios");
const { "stringify": str } = JSON;
const { Op, Sequelize } = require("sequelize");

const {
    bcEnvProdExpress,
    bcEnvProdOriginal,
    bcEnvUat,
    bcGdaHeaderName,
    bcGdaProxyHostProdExpress,
    bcGdaProxyHostProdOriginal,
    bcGdaProxyHostUat,
    bcGdaQueryParam,
    bcSessionCookie,
    ebizCompanyId,
    ebizUserId,
    timeMs,
    "sessionCookie": cssSessionCookie,
    supportEmail
} = require("../api/constants");
const {
    found, internalServerError, preconditionFailed
} = require("../api/statuses");
const { getLogger } = require("../utils/logging");
const { "define": defineBcContext } = require("../api/models/bcContext");

exports.GDA_URLS = {
    [bcEnvUat]: `https://${bcGdaProxyHostUat}/check_session`,
    [bcEnvProdExpress]: `https://${bcGdaProxyHostProdExpress}/check_session`,
    [bcEnvProdOriginal]: `https://${bcGdaProxyHostProdOriginal}/check_session`
};

exports.businessCenterDefaults = {
    "bcEnv": null,
    "isBcUser": false
};

exports.parseIfObjectOrKeep = (string) => {
    if (string instanceof Object) {
        return string;
    }

    if (!string.includes("{") && !string.includes("}")) {
        return string;
    }
    return JSON.parse(string);
};

exports.checkBcCookie = (req) => {
    const log = getLogger();
    const { "sessionID": ses } = req;

    const result = {};
    const bcCookie = req.cookies[bcSessionCookie];
    log.info(`${ses}: Current BC cookie: ${str(bcCookie)}`);

    // Length fails for undefined/null values, but is caught by the raw NOT
    if (!bcCookie || !Object.keys(bcCookie).length) {
        return result;
    }

    log.info(`${ses}: BC cookie present, pulling fields from ${str(bcCookie)}`);
    const data = exports.parseIfObjectOrKeep(bcCookie);
    log.info(`${ses}: Found fields: ${str(data)}`);

    const keys = Object.keys(data);
    if (!keys.includes(ebizCompanyId) || !keys.includes(ebizUserId)) {
        log.info(`${ses}: BC cookie has not been checked yet`);
        return result;
    }

    for (const item of [ebizCompanyId, ebizUserId]) {
        log.info(`${ses}: Setting field ${item} as ${str(data[item])}`);
        result[item] = data[item];
    }
    return result;
};

exports.callGdaApi = async (ses, env, gdaSes) => {
    const log = getLogger();
    const url = `${exports.GDA_URLS[env]}/${gdaSes}`;
    log.info(`${ses}: Calling GD&A API: ${str(url)}`);
    return await axios.get(url, { proxy: false })
};

exports.parseContext = (strJson) => {
    const result = {
        "authorized": false,
        "context": {},
        "loginUrl": ""
    };

    const data = exports.parseIfObjectOrKeep(strJson);
    if (!(data instanceof Object)) {
        result.loginUrl = data;
        return result;
    }

    result.authorized = true;
    result.context = data;
    return result;
};

exports.setBcContext = (req, context) => {
    req.user = context.ebizUserId;
    req.isBcUser = true;
    req.ebizCompanyId = context.ebizCompanyId;
    req.ebizCompanyName = context.ebizCompanyName;
    req.ebizUserEmail = context.email;
    req.ebizUserId = req.user;
};

exports.setBcCookie = (req, res, context) => {
    return res.cookie(
        bcSessionCookie,
        str({
            // raw hostname must NOT be visible on the Internet!
            "bcEnv": req.bcEnv,
            [ebizCompanyId]: context.ebizCompanyId,
            [ebizUserId]: context.ebizUserId,
            "isBcUser": true
        }),
        { "httpOnly": false, "maxAge": timeMs.day }
    );
};

exports.checkGdaSession = async (req, res, next) => {
    const log = getLogger();
    const { gdaSessionId, "sessionID": ses } = req;

    const bcCookie = exports.checkBcCookie(req);

    // Fascinating how one language can't treat booleans in a sane way
    const bcCookiePresent = !!bcCookie && !!Object.keys(bcCookie).length;

    if (!gdaSessionId && !bcCookiePresent && !req.isBcUser) {
        log.info(
            `${ses}: Not a Business Center user, no session and cookie present`
        );
        return next();
    }

    let authorized = null;
    let parsed = {};
    let context = {};
    log.info(`${ses}: Validating GD&A session and retrieving context`);
    if (!bcCookiePresent) {
        log.info(`${ses}: BC cookie not present, need to retrieve context`);
        let response = null;
        try {
            response = await exports.callGdaApi(ses, req.bcEnv, gdaSessionId);
        } catch (err) {
            log.info(`${ses}: Encountered unexpected response: ${str(err)}`);
            response = await err.response;
        }

        const { data } = response;
        parsed = exports.parseContext(data);
        context = parsed.context;
        authorized = parsed.authorized;
        log.info(`${ses}: Parsed context: ${str(parsed)}`);
    } else {
        log.info(`${ses}: BC cookie present, retrieving context from DB`);
        context = await exports.selectContext(ses, bcCookie);
        authorized = context !== null;
        log.info(`${ses}: Parsed context: ${str(context)}`);
    }

    if (authorized) {
        log.info(`${ses}: BC user is authorized`);
        log.info(`${ses}: Setting BC context`);
        exports.setBcContext(req, context);
        if (!bcCookiePresent) {
            await exports.insertContext(ses, gdaSessionId, context);

            log.info(`${ses}: Setting BC cookie '${bcSessionCookie}'`);
            exports.setBcCookie(req, res, context);

            log.info(`${ses}: Response headers will be: ${str(res.headers)}`);
            log.info(`${ses}: Response cookies will be: ${str(res.cookies)}`);

            // Use Referer header to jump back in history
            res.setHeader("X-BC-FirstPass", "1");
            res.setHeader("Cache-Control", "no-cache, no-store, max-age=0");

            /*
             * TODO:
             * Temporarily hardcode expressportal.att.com until the host
             * forwarding is resolved in expressportal's webserver.
             */
            let { gdaHost } = req;
            if (gdaHost.includes(bcGdaProxyHostProdOriginal)) {
                gdaHost = bcGdaProxyHostProdExpress;
            }
            return res.redirect(found, `https://${gdaHost}/ebiz/gda/css/`);
        }
        return next();
    } else {
        let lurl = parsed.loginUrl;

        if (parsed.loginUrl) {
            log.info(`${ses}: BC user is not authorized`);
            log.info(`${ses}: Redirecting with ${str(found)} to ${str(lurl)}`);
            return res.redirect(found, lurl);
        }

        log.info(`${ses}: Login URL is undefined, calling GDA api`);
        let response = null;
        try {
            response = await exports.callGdaApi(ses, req.bcEnv, gdaSessionId);
        } catch (err) {
            log.info(`${ses}: Encountered unexpected response: ${str(err)}`);
            response = await err.response;
        }

        const { data } = response;
        parsed = exports.parseContext(data);
        lurl = parsed.loginUrl;

        log.info(`${ses}: BC user is not authorized`);
        log.info(`${ses}: Redirecting with ${str(found)} to ${str(lurl)}`);
        return res.redirect(found, lurl);
    }
};

exports.selectContext = async (session) => {
    const log = getLogger();

    log.info(`${session}: Defining BcContext model`);
    const BcContext = defineBcContext();

    log.info(
        `${session}: Selecting BC session context by session: ${str(session)}`
    );
    const row = await BcContext.findOne({
        "where": {
            "ACTIVE": { [Op.eq]: true },
            "SESSION": { [Op.eq]: session }
        }
    });

    log.info(`${session}: Found BC context: ${str(row)}`);
    if (row === null) return row;

    const result = {
        "ebizCompanyId": row.COMPANY_ID,
        "ebizCompanyName": row.COMPANY_NAME,
        "ebizUserId": row.USER_ID,
        "email": row.USER_EMAIL
    };

    log.info(`${session}: Returning assembled context: ${str(result)}`);
    return result;
};

exports.insertContext = async (session, gdaSessionId, context) => {
    const log = getLogger();
    log.info(`${session}: Inserting BC session context`);

    const data = {
        "SESSION": session,
        "GDA_SESSION": gdaSessionId,
        "USER_ID": context.ebizUserId,
        "USER_EMAIL": context.email,
        "COMPANY_ID": context.ebizCompanyId,
        "COMPANY_NAME": context.ebizCompanyName,
    };
    log.info(
        `${session}: GD&A Session: ${gdaSessionId}, Context: ${str(context)}`
    );

    log.info(`${session}: Defining BcContext model`);
    const BcContext = defineBcContext();
    log.info(`${session}: Attempting transaction`);
    const result = await BcContext.sequelize.transaction(
        {"autoCommit": true}, async () => await BcContext.upsert(data)
    );
    log.info(`${session}: Transaction successful - ${str(result)}`);
    return result;
};

exports.businessCenter = async (req, res, next) => {
    const { "sessionID": ses } = req;

    const log = getLogger();
    const defaults = exports.businessCenterDefaults;
    req.bcEnv = defaults.bcEnv;
    req.isBcUser = defaults.isBcUser;

    let data = exports.parseIfObjectOrKeep(req.headers[bcGdaHeaderName] || {});
    log.info(`${ses}: GD&A header is: '${str(data)}'`);

    const { host } = data;
    req.gdaHost = host;
    log.info(`${ses}: Host is: '${str(host)}'`);
    req.gdaSessionId = data[bcGdaQueryParam];
    log.info(`${ses}: GD&A session ID is: ${str(req.gdaSessionId)}`);

    const uat = bcGdaProxyHostUat;
    const prodExpress = bcGdaProxyHostProdExpress;
    const prodOriginal = bcGdaProxyHostProdOriginal;
    if (host && host.includes(uat)) {
        log.info(`${ses}: Host header is UAT GD&A MITM proxy`);
        log.info(
            `${ses}: Setting request properties for Business Center UAT env`
        );
        req.isBcUser = true;
        req.bcEnv = bcEnvUat;
    } else if (host && host.includes(prodExpress)) {
        log.info(`${ses}: Host header is Prod GD&A MITM proxy`);
        log.info(
            `${ses}: Setting request properties for Business Center Prod env`
        );
        req.isBcUser = true;
        req.bcEnv = bcEnvProdExpress;
    } else if (host && host.includes(prodOriginal)) {
        log.info(`${ses}: Host header is Prod GD&A MITM proxy`);
        log.info(
            `${ses}: Setting request properties for Business Center Prod env`
        );
        req.isBcUser = true;
        req.bcEnv = bcEnvProdOriginal;
    }

    log.info(`${ses}: Marked as Business Center user: ${req.isBcUser}`);
    log.info(`${ses}: Marked as Business Center env : ${req.bcEnv}`);

    try {
        return await exports.checkGdaSession(req, res, next);
    } catch (err) {
        // TODO: Add logging with Paperplane
        log.error(`${ses}: Can't allow BC user to access`);
        log.error(`${ses}: ${err}`);

        const genericMessage = (
            `Can't communicate with the application,`
                + ` please capture a screenshot of the window`
                + ` and contact ${supportEmail}`
        );

        // TODO: Use generic errors via CSS-334
        if (err instanceof Sequelize.ValidationError) {
            log.error(`${ses}: Failed to insert BC context`);
            return res.status(preconditionFailed).send({
                "message": "Invalid data for BC context insert",
                "userMessage": genericMessage,
                "stacktrace": err.stack
            });
        } else {
            // Once triggered, the error has to be captured and added here
            return res.status(internalServerError).send({
                "message": "Unhandled error, copy the log and create a bug",
                "userMessage": genericMessage,
                "stacktrace": err.stack
            });
        }
    }
};
