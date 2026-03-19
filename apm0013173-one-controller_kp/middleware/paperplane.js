const ax = require("axios");
const { HttpsProxyAgent } = require("https-proxy-agent");
const { getLogger } = require("../utils/logging");
const { paperplaneSender, supportEmail } = require("../api/constants");
const { "stringify": str } = JSON;
const constants = require("../api/constants");

const proxyServer = process.env.http_proxy || constants.proxyAttPxy;

exports.getHttpsAgent = () => new HttpsProxyAgent(proxyServer);

exports.sendMessage = async (body, ses) => {
    const log = getLogger();
    log.info(`${ses}: Calling Paperplane API`);

    const {
        "PAPERPLANE_TOKEN": token,
        "PAPERPLANE_URL": url
    } = process.env;
    log.info(`${ses}: Paperplane URL: ${url}`);

    return await ax.post(
        `https://${url}/api/v2/message`,
        {
            "body": body,
            "to": [supportEmail],
            "type": "email"
        },
        {
            "headers": {
                "Content-Type": "application/json",
                "Authorization": token
            },
            proxy: false,
            httpsAgent: exports.getHttpsAgent()
        }
    );
};

// Error handler right before Express' handler to send an email with a log
exports.paperplane = async (err, req, res, next) => {
    /*
     * We do not care whether this fails in the end and the service can be down
     * but the logs can be checked even later on. Rather, this will let us know
     * immediately what happened and to who, so we can attach an email to a bug
     * or directly contact a user.
     */
    if (res.headersSent) {
        return next(err);
    }

    const log = getLogger();

    let ses = "<missing>";
    try {
        let ses  = req.cookies["sessionId"];
        log.error(`${ses}: ${err}`);
        log.info(`${ses}: Encountered an error, sending message!`);

        await exports.sendMessage(
            `${err}\n${str(err)}\n${str(req.headers)}\n${str(req.cookies)}`
                + `\n${str(req.query)}\n${str(req.body)}`,
            ses
        );
        return await next();
    } catch (fail) {
        log.error(`${ses}: Paperplane middleware crashed`);
        log.error(`${ses}: ${fail}`);
        // No return, passthrough to the Express error handler!
    }
};
