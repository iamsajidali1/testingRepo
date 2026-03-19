/* eslint-disable new-cap, require-atomic-updates */
const axios = require("axios");
const lruCache = require("lru-cache");
const { HttpsProxyAgent } = require("https-proxy-agent");
const { getLogger } = require("../utils/logging");
const { ok, forbidden } = require("../api/statuses");
const { ispHost, proxyAttPxy } = require("../api/constants");
const { CONFIG } = require("../api/config/configuration");
const proxyServer = process.env.http_proxy || proxyAttPxy;
const LRU = new lruCache({ "max": 500 });
const { "stringify": str } = JSON;

/**
 * Get users information from WebPhone by Id
 * @param {*} id Any ID (ATTuid or Cingular CUid)
 */
const getUserDetailsById = async (id) => {
    const log = getLogger();
    try {
        const config = {
            "auth": {
                "username": CONFIG.MECH_ID,
                "password": CONFIG.MECH_ID_PASS
            },
            "headers": {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            "proxy": false,
            "httpsAgent": new HttpsProxyAgent(proxyServer)
        };
        log.info(`Getting the user details from ISP for id: ${str(id)}`);
        return await axios.get(
            `https://${ispHost}/api/core/v1/user/${id}`,
            config
        );
    } catch (error) {
        log.error(`Could not fetch details from ISP for user: ${str(id)}`);
        return null;
    }
};

/**
 * @param {Request} req request
 * @param {Response} res response
 * @param {function} next next fn
 */
const auth = async (req, res, next) => {
    if ((req.url).startsWith('/api/oauth/')) {
        req['oAuth'] = true;
        // Removing virtual host from request url
        req.url = req.url.replace("/api", "");
        return next();
    }
    const log = getLogger();

    // It must be req.user
    const user  = "sa3590";
    if (user) {
        // Removing virtual host from request url
        req.url = req.url.replace("/api", "");
        if (req.url === "/") {
            log.info(`Return status ${ok} auth middleware.`);
            return res.status(ok).send(true);
        }

        /*
         * Users Details
         * Check if it's there in the LRU cache
         */
        let userDetails = null;
        const lruResult = LRU.get(user);
        if (lruResult) {
            userDetails = lruResult;
        } else if(!/^[A-Za-z]{2}[0-9]{1}[A-Za-z0-9]{3,5}$/i.test(user)) {
            // Check if the user has a valid ATTUID
            log.info("User does not have a valid ATT Uid, maybe BC User or Oauth User");
            userDetails = null;
        } else {
            // Get the details of the user
            const response = await getUserDetailsById(user);
            // If there is a valid response
            if (response) {
                userDetails = response.data;
                LRU.set(user, userDetails);
            }
        }
        const atteshr = {};
        atteshr.attuid = userDetails?.attUid || user;
        // Set the Request Header accordingly
        req.atteshr = atteshr;
        req.userDetails = userDetails;
        req.user = atteshr.attuid;
        log.info(`Logged user with ATT Uid: ${str(req.atteshr.attuid)}`);
        log.info(`User Details: ${JSON.stringify(req.userDetails)}`);
        // If the URL is Login then return user details
        if (req.url === "/login" || req.url.match(/login\?.*/)) {
            log.info(`Return status ${ok} auth middleware.`);
            return res.status(ok).send({
                userId: atteshr.attuid,
                userDetails: req.userDetails
            });
    } 
        return next();
    } else {
        log.info(`Return status ${forbidden} auth middleware.`);
        return res.status(forbidden).send(false);
    }
};

module.exports = { auth };
