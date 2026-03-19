const { define } = require("../api/models/logRequestModel");
const { "stringify": str, parse } = JSON;
const lodash = require("lodash");


/*
 * Currently does nothing except specifying the source,
 * because some headers might be treated differently and capturing
 * the source will help to add a condition for such case.
 */
exports.REDACTED_SOURCE = Object.freeze({
    "NONE":    0,
    "HEADERS": 1 << 0,
    "BODY":    1 << 1,
    "COOKIES": 1 << 2,
    "ALL":     ~0
});

exports.REDACTED_ACTION = Object.freeze({
    "NONE":    0,
    "REPLACE": 1 << 0,
    "REMOVE":  1 << 1,
    "ALL":     ~0
});

exports.REDACTED_VALUES = Object.freeze({
    "NONE": 0,
    "PASSWORD": "*".repeat(32),
    "REDACTED": "<redacted data>"
});

exports.redacted = [
    {
        "source": exports.REDACTED_SOURCE.BODY,
        "location": "credentials.VCO_PASSWORD",
        "action": exports.REDACTED_ACTION.REPLACE,
        "value": exports.REDACTED_VALUES.PASSWORD
    },
    {
        "source": exports.REDACTED_SOURCE.COOKIES,
        "location": "attESSec",
        "action": exports.REDACTED_ACTION.REPLACE,
        "value": exports.REDACTED_VALUES.REDACTED
    },
    {
        "source": exports.REDACTED_SOURCE.COOKIES,
        "location": "attESg2",
        "action": exports.REDACTED_ACTION.REPLACE,
        "value": exports.REDACTED_VALUES.REDACTED
    },
    {
        "source": exports.REDACTED_SOURCE.BODY,
        "location": "body.VCO_PASSWORD",
        "action": exports.REDACTED_ACTION.REPLACE,
        "value": exports.REDACTED_VALUES.PASSWORD
    }
];

exports.getRemoteAddr = (req) => {
    const { ip, _remoteAddress, connection } = req;
    return ip || _remoteAddress || (connection && connection.remoteAddress);
};

exports.getIsoDate = () => {
    return new Date().toISOString();
};

exports.handleAction = (redactObj) => {
    if (redactObj.action === exports.REDACTED_ACTION.REPLACE) {
        return redactObj.value;
    }
    if (redactObj.action === exports.REDACTED_ACTION.REMOVE) {
        return undefined;
    }
};

exports.filterObj = (jsonObj, sourceType) => {
    let copy = parse(str(jsonObj));
    let loc = null;
    let initialKey = null;
    let key = null;

    let previous = null;
    let current = null;

    for (const redact of exports.redacted) {
        if (redact.source !== sourceType) {
            continue;
        }

        // Array of nested keys
        loc = redact.location.split(".");

        // First layer
        initialKey = loc.shift();
        current = copy[initialKey];

        // Empty location, so just Layer 1
        if (!loc.length) {
            if (copy[initialKey] === undefined) {
                continue;
            }
            copy[initialKey] = exports.handleAction(redact);
        }

        // Refs' magic
        while (key = loc.shift()) {
            previous = current;
            if (previous === undefined) {
                break;
            }
            if (!loc.length) {
                previous[key] = redact.value;
                return copy;
            }

            /*
             * Previous instance is object, but the current one might be int
             * which is immutable. References work this way only with mutable.
             */
            if (previous instanceof Object && !(current instanceof Object)) {
                current[key] = exports.handleAction(redact);
            } else {
                // Look forward and continue
                current = previous[key];
            }
        }
    }
    return copy;
};

exports.logger = async (req, res, next) => {
    const model = define();

    let tsc = null;
    try {
        const body = exports.filterObj(
            req.body, exports.REDACTED_SOURCE.BODY
        );
        const headers = exports.filterObj(
            req.headers, exports.REDACTED_SOURCE.HEADERS
        );
        const cookies = exports.filterObj(
            req.cookies, exports.REDACTED_SOURCE.COOKIES
        );

        tsc = await model.sequelize.transaction();

        const session = req.sessionID || cookies.sessionId || null;
        const log = await model.create(
            {
                "REMOTE_ADDR": exports.getRemoteAddr(req),
                "DATE": exports.getIsoDate(),
                "METHOD": req.method,
                "URL": req.url || req.originalUrl,
                "STATUS": res.statusCode,
                "SESSION": session,
                "REQUEST_BODY": str({
                    "body": body,
                    "cookies": cookies,
                    "headers": headers
                })
            },
            { "returning": true },
            { "transaction": tsc }
        );

        if (!log) {
            console.log("Log instance is empty");
            throw new Error("Log instance is empty");
        }

        await tsc.commit();
        return next();
    } catch (err) {
        console.log("Log insert failed");
        console.error(err);
        if (tsc) {
            await tsc.rollback();
        }
    }

};

// Currently no config options though...
exports.getLogger = (/* options */) => {
    return exports.logger;
};
