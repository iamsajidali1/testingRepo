const https = require("https");

/**
 * @typedef {{attuid:string,firstName:string,lastName:string,country:string,jobTitle:string,supervisorAttuid:string,level:string}} WebPhoneResponse
 */

exports.loadUser = webPhoneRequest;


/**
 * Returns object: {
 *  attuid: "attuid",
 *  firstName: "first name",
 *  lastName: "last name",
 *  country: "country",
 *  jobTitle: "job title",
 *  supervisorAttuid: "supervisor attuid",
 *  level: "1"
 * }
 *
 * @returns {WebPhoneResponse|null}
 *
 * Errors: WebPhone
 */
function webPhoneRequest(attuid) {
    return new Promise(function(resolve, reject) {
        // prepare query message
        /* eslint-disable no-useless-escape */
        const payload = `{"query":"{query: people(handle: \\\"${ attuid }\\\") {handle jtName firstName lastName countryDesc supervisorATTUID level consultantFlag state}}","variables":null,"operationName":null}`;
        // request options
        const options = {
            hostname: "webphone.operations.labs.att.com",
            path: "/v1?",
            method: "POST",
            port: 443,
            headers: {
                "Content-Type": "application/json",
            }
        };

        // create https request and handle result
        var req = https.request(options, (res) => {
            // check status code
            if (res.statusCode < 200 || res.statusCode >= 300){
                return reject("WebPhone");
            }

            res.setEncoding("utf8");
            var d = "";
            res.on("data", (data) => {
                d += data;
            });

            res.on("end", () => {
                try {
                    // parse and send back result
                    var parsed = (typeof d === "string") ? JSON.parse(d) : d;
                    var jobPrefix = (trim(parsed.data.query[0].consultantFlag) == "Y") ? "**CONTRACTOR** " : "";
                    var countrySuffix = (trim(parsed.data.query[0].state) == "PR" && parsed.data.query[0].countryDesc == "United States") ? " - PR" : "";
                    resolve({
                        attuid: trim(parsed.data.query[0].handle),
                        firstName: trim(parsed.data.query[0].firstName),
                        lastName: trim(parsed.data.query[0].lastName),
                        country: trim(parsed.data.query[0].countryDesc) + countrySuffix,
                        jobTitle: jobPrefix + trim(parsed.data.query[0].jtName),
                        supervisorAttuid: trim(parsed.data.query[0].supervisorATTUID),
                        level: trim(parsed.data.query[0].level)
                    });
                } catch (ex) {
                    resolve(null);
                }
            });
        });

        // handle connection error
        req.on("error", function() {
            reject("WebPhone");
        });
        // add payload
        req.write(payload);
        // send request
        req.end();
    });
}

/**
 * Returns object: {
 *  attuid: "attuid",
 *  firstName: "first name",
 *  lastName: "last name",
 *  country: "country",
 *  jobTitle: "job title",
 *  supervisorAttuid: "supervisor attuid",
 *  level: "3"
 * }
 *
 * Function throws error NoManager when system is unable to find Level 3 manager in 5 attampts (to avoid infinite loops)
 *
 * @returns {WebPhoneResponse}
 *
 * Errors: WebPhone, NoManager
 */
exports.loadUsersL3ManagerUnderRobertHutchinson = function(attuid) {
    // wrap async function into promise
    return new Promise(function(resolve, reject) {
        exports.getLevel3ManagerUnderRobertHutchinson(attuid).then((data) => {
            resolve(data);
        }).catch((err) => {
            reject(err);
        });
    });
};

/**
 * Function throws error NoRobertHutchinson when user is not part of RobertHutchinson organisation (in 5 attempts)
 *
 * @param {string} attuid
 * @return L3 manager or higher
 *
 * Returns object: {
 *  attuid: "attuid",
 *  firstName: "first name",
 *  lastName: "last name",
 *  country: "country",
 *  jobTitle: "job title",
 *  supervisorAttuid: "supervisor attuid",
 *  level: "1"
 * }
 *
 * @return {{attuid:string,firstName:string,lastName:string,country:string,jobTitle:string,supervisorAttuid:string,level:string}}
 *
 * Errors: WebPhone, NoRobertHutchinson
 */
async function getLevel3ManagerUnderRobertHutchinson(attuid) {
    var manager = null;
    // make 5 attempts
    for (var i = 0; i < 10; i++) {
        // check for empty ATTUID
        if (!attuid) {
            break;
        }

        // load user from WebPhone
        var user = await exports.loadUser(attuid);
        if (!user) {
            return null;
        }
        // check if user is Level 3
        if (user.level >= 3 && !manager) {
            manager = user;
        }

        // check if Robert Hutchinson is current user
        if (user.attuid == "rh9892") {
            return manager;
        }

        // jump to parent
        attuid = user.supervisorAttuid;
    }

    // manager was not found
    return null;
}
exports.getLevel3ManagerUnderRobertHutchinson = getLevel3ManagerUnderRobertHutchinson;

function trim(str) {
    if (typeof str === "string") {
        return str.trim();
    }
    return str;
}
exports.trim = trim;
