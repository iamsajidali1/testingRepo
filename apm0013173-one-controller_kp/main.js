/* eslint-disable no-return-await, max-statements, no-console */

/**
 * Checking history:
 *
 * 1) In the logs there will be task ID - that's External Task ID.
 *     SELECT
 *         PROC_INST_ID
 *     FROM
 *         ACT_HI_EXT_TASK_LOG
 *     WHERE EXT_TASK_ID_="<EXTERNAL TASK ID>";
 * 2) Readable variables
 *    SELECT
 *        NAME_,
 *        VAR_TYPE_,
 *        DOUBLE_,
 *        LONG_,
 *        TEXT_,
 *        TEXT2_,
 *        BYTEARRAY_ID_,
 *        CREATE_TIME_
 *    FROM
 *        ACT_HI_VARINST
 *    WHERE PROC_INST_ID_="...";
 *
 * 3) Binary variables (files, bytes, ...)
 *    - copypaste somewhere and decode based on the knowledge of the data
 *      - echo '...'|base64 -D > file.xlsx
 *      - echo '...'|base64 -D > out.json
 *
 *     SELECT
 *         to_BASE64(BYTES_)
 *     FROM
 *         ACT_GE_BYTEARRAY
 *     WHERE ID_="<BYTEARRAY_ID_>";
 */

/**
 * @typedef {Object} NoInput - The task has no input variables.
 */

/**
 * @typedef {Object} NoOutput - The task has no output variables.
 */

const {
    Client, logger, Variables
} = require("camunda-external-task-client-js");
const http = require("http");
const https = require("https");
const axios = require("axios");
const base64decode = require("atob");
const { JSONPath } = require('jsonpath-plus');
const { Buffer } = require("buffer");
const { HttpsProxyAgent } = require("https-proxy-agent");
const { CAMUNDA_CSS_BACKEND_BASIC, CAMUNDA_ENGINE_URL } = process.env;
const constants = require("./api/constants");

const { "stringify": str } = JSON;

const proxyServer = process.env.http_proxy || constants.proxyAttPxy;

exports.callbackHandler = async (task, taskService, callback) => {
    console.log(`Starting ${task.topicName}`);
    let result = null;
    try {
        const vars = str(task.variables.getAll());
        console.log(`Found variables: ${vars}`);

        const { processVariables, localVariables } = await callback();
        console.log(`New process variables: ${str(processVariables)}`);
        console.log(`New local variables: ${str(localVariables)}`);

        console.log(`Completing ${task.topicName}`);
        result = await taskService.complete(
            task, processVariables, localVariables
        );
    } catch (error) {
        result = await taskService.handleFailure(task, {
            "errorDetails": str(error),
            "errorMessage": error.message || error.name || error,
            "retries": 0,
            "retryTimeout": 1000
        });
        console.log(`Encountered error in ${task.topicName}: ${error}`);
    } finally {
        console.log(`Finished ${task.topicName}`);
        return result;
    }
};

/**
 * Handler for `X-GenerateMdsVelocloud` External Task
 * @function X-GenerateMdsVelocloud
 * @param {string} vcoProtocol - Can be empty, should be http/https.
 * @param {string} vcoHostname - Plain hostname without protocol or path.
 * @param {string} vcoUsername - Username for VeloCloud Orchestrator.
 * @param {string} vcoPassword - Password for VeloCloud Orchestrator.
 * @returns {base64encoded-bytes} xlsx - Generated MDS.
 * @version 0.3
 * @see flows/mds-velocloud.bpmn
 */
exports.generateMdsVelocloud = async (
    { task, taskService }
) => await exports.callbackHandler(
    task, taskService, async () => {
        const { CONFIG } = require("./api/config/configuration");
        const procVars = new Variables();

        procVars.setAll(task.variables.getAll());

        const proto = procVars.get(constants.camundaMdsInputVcoProto);
        const host = procVars.get(constants.camundaMdsInputVcoHost);
        let vcoUrl = host;
        if (proto) {
            vcoUrl = `${proto}://${host}`;
        }

        const { MECH_ID, MECH_ID_PASS, MDS_TOKEN, vcoJS } = CONFIG;
        const basicAuth = Buffer.from(
            `${MECH_ID}:${MECH_ID_PASS}`, "binary"
        ).toString("base64");

        const resp = await axios.post(
            vcoJS.MSD_LINK, {
                "vco_password": procVars.get(constants.camundaMdsInputVcoPass),
                "vco_url": vcoUrl,
                "vco_username": procVars.get(constants.camundaMdsInputVcoUser)
            }, {
                "headers": {
                    "Authorization": `Basic ${basicAuth}`,
                    "Content-Type": "application/json",
                    "X-Authorization": MDS_TOKEN
                },
                "responseType": "arraybuffer"
            }
        );

        procVars.setTyped(constants.camundaMdsOutputXlsx, {
            "type": "file",
            "value": Buffer.from(
                resp.data.toString(), "binary"
            ).toString("base64"),
            "valueInfo": { "filename": constants.mdsFilename }
        });
        return {
            "localVariables": new Variables(), "processVariables": procVars
        };
    }
);

/**
 * Handler for `X-PaperplaneSendEmailXlsx` External Task
 * @function X-PaperplaneSendEmailXlsx
 * @param {base64encoded-bytes} xlsx
 * @param {string} emails - Comma-separated emails as a string.
 * @returns {NoOutput}
 * @version 0.3
 * @see flows/mds-velocloud.bpmn
 */
exports.paperplaneSendEmailXlsx = async (
    { task, taskService }
) => await exports.callbackHandler(
    task, taskService, async () => {
        const { CONFIG } = require("./api/config/configuration");

        const vars = task.variables;

        const xlsx = vars.get(constants.camundaMdsOutputXlsx);
        const body = vars.get("body") || constants.mdsEmailBody;
        const filename = vars.get(constants.camundaMdsOutputFileName);
        let emails = vars.get(constants.camundaMdsInputEmails);
        emails = emails ? emails.split(",") : [];

        const output = {
            "localVariables": new Variables(),
            "processVariables": task.variables
        };

        if (!emails.length) {
            console.log("No emails found, skipping!");
            return output;
        }

        const {
            MECH_ID, MECH_ID_PASS, PAPERPLANE_TOKEN, PAPERPLANE_URL
        } = CONFIG;
        const basicAuth = Buffer.from(
            `${MECH_ID}:${MECH_ID_PASS}`, "binary"
        ).toString("base64");

        console.log(`Sending to: ${str(emails)}`);
        const resp = await axios.post(
            `${PAPERPLANE_URL}/api/v2/message`, {
                "attachments": { [filename || constants.mdsFilename]: xlsx },
                body,
                "sender": constants.paperplaneSender,
                "time": null,
                "to": emails,
                "type": "email"
            }, {
                "headers": {
                    "Authorization": `Basic ${basicAuth}`,
                    "Content-Type": "application/json",
                    "X-Authorization": PAPERPLANE_TOKEN
                },
            }
        );
        console.log(`Status: ${resp.status}, Response: ${str(resp.data)}`);
        return output;
    }
);

exports.getHttpAgent = () => new http.Agent({ "keepAlive": true });
exports.getInsecureAgent = () => new https.Agent(
    { "keepAlive": true, "rejectUnauthorized": false }
);

/**
 * Expects headers separated as per RFC:
 * https://tools.ietf.org/html/rfc7230#section-3
 * so CRLF (\r\n) for full header and ": " for key-value pair.
 */
exports.parseHeaders = (headers) => {
    let result = {};
    if (!headers) {
        return result;
    }

    const crlf = "\r\n";
    const lf = "\n";

    // Fallback to LF if CRLF can't be used or is not present
    let separator = crlf;
    if (!headers.includes(separator)) separator = lf;

    headers = headers.split(separator);
    for (const item of headers) {
        const keyVal = item.split(": ");
        /* eslint-disable-next-line no-magic-numbers */
        result[keyVal[0].toLowerCase()] = keyVal[1];
    };
    return result;
};

/**
 * Proxy configuration
 * If for some special reason you need to authorize to proxy
 * use Proxy-Authorization header via headers with its syntax.
 */
exports.parseProxyFromVars = (vars) => {
    const { "get": func } = vars;
    const useProxy = func("useProxy");
    console.log(`Should use proxy? ${Boolean(useProxy)}`);
    if (!useProxy) {
        /* eslint-disable-next-line no-undefined */
        return undefined;
    }

    return {
        "host": func("proxyHost"),
        "port": Number(func("proxyPort")),
        "protocol": func("proxyProtocol")
    };
};

exports.parseAxiosFromVars = (vars) => {
    const { "get": func } = vars;

    // Basic stuff
    const method = func("method");
    const url = func("url");
    const body = func("body");

    // Ignore verification for intranet websites if required
    const ignoreCertificate = func("ignoreCertificate");
    let headers = exports.parseHeaders(func("headers"));
    const proxy = exports.parseProxyFromVars(vars);

    let requestAgent = new https.Agent({ "keepAlive": true });

    if (ignoreCertificate) {
        requestAgent = exports.getInsecureAgent();
    }

    return {
        "data": body,
        headers,
        "httpAgent": exports.getHttpAgent(),
        "httpsAgent": requestAgent,
        method,
        "proxy": proxy,
        "responseType": "arraybuffer",
        "timeout": 3600000, // Adding explicit timout to 60 mins
        url
    };
};

exports.setHttpResponse = (vars, resp) => {
    const { "setTyped": func } = vars;

    func("status", { "type": "integer", "value": resp.status });
    func("statusText", { "type": "string", "value": resp.statusText });
    func("bytes", {
        "type": "file",
        "value": Buffer.from(
            resp.data.toString(), "binary"
        ).toString("base64"),
        "valueInfo": { "filename": "bytes" }
    });

    const rawRespHeaders = resp.headers;
    let respHeaders = [];
    for (const key of Object.keys(rawRespHeaders)) {
        respHeaders.push(`${key}: ${rawRespHeaders[key]}`);
    }
    respHeaders = respHeaders.join("\r\n");
    func("headers", { "type": "string", "value": respHeaders });
};

/**
 * @typedef {Object} HttpRequest
 * @prop {integer} status
 * @prop {string} statusText
 * @prop {base64encoded-bytes} bytes
 * @prop {string} headers - Raw string of headers defined as per RFC7230.
 */
/**
 * Handler for `X-HttpRequest` External Task
 * @function X-HttpRequest
 * @param {string} method - HTTP verb in lowercase.
 * @param {string} url - Absolute URL with protocol.
 * @param {string} body - Raw string passed as a content.
 * @param {boolean} ignoreCertificate - Skips certificate verification.
 * @param {string} headers - Raw string of headers defined as per RFC7230.
 * @param {string} useProxy - Enables using proxy* params for the request.
 * @param {string} proxyProtocol - Must not be empty, should be http/https.
 * @param {string} proxyHostname
 * @param {integer} proxyPort
 * @returns {HttpRequest}
 * @version 0.2
 * @see flows/http-request.bpmn
 */
exports.httpRequest = async (
    { task, taskService }
) => await exports.callbackHandler(
    task, taskService, async () => {
        await taskService.extendLock(task, 3600000);
        const procVars = new Variables();
        procVars.setAll(task.variables.getAll());
        const axiosConf = exports.parseAxiosFromVars(procVars);
        console.log(`axios -> ${str(axiosConf)}`);
        const resp = await axios(axiosConf);
        console.log(`Status: ${resp.status}, Response: ${str(resp.data)}`);
        exports.setHttpResponse(procVars, resp);
        return {
            "localVariables": new Variables(),
            "processVariables": procVars
        };
    }
);

/**
 * Handler for `X-HttpRequest-Aaf` External Task
 * @function X-HttpRequest-Aaf
 * @param {string} method - HTTP verb in lowercase.
 * @param {string} url - Absolute URL with protocol.
 * @param {string} body - Raw string passed as a content.
 * @param {boolean} ignoreCertificate - Skips certificate verification.
 * @param {string} headers - Raw string of headers defined as per RFC7230.
 * @param {string} useProxy - Enables using proxy* params for the request.
 * @param {string} proxyProtocol - Must not be empty, should be http/https.
 * @param {string} proxyHostname
 * @param {integer} proxyPort
 * @returns {HttpRequest}
 * @version 0.1
 * @see flows/http-request.bpmn
 */
exports.httpRequestAaf = async (
    { task, taskService }
) => await exports.callbackHandler(
    task, taskService, async () => {
        await taskService.extendLock(task, 3600000);
        const vars = task.variables;
        const opts = exports.parseAxiosFromVars(vars);

        // Set/overwrite Authorization header with AAF creds
        const { AAF_USERNAME, AAF_PASSWORD } = process.env;
        const encoded = Buffer.from(
            `${AAF_USERNAME}:${AAF_PASSWORD}`, "binary"
        ).toString("base64");
        opts.headers["authorization"] = `Basic ${encoded}`;
        console.log(`axios -> ${str(opts)}`);
        const resp = await axios(opts);
        console.log(`Status: ${resp.status}, Response: ${str(resp.data)}`);

        // Local variables die when a task is completed
        const procVars = new Variables();
        exports.setHttpResponse(procVars, resp);

        return {
            "localVariables": null,
            "processVariables": procVars
        };
    }
);

exports.readFileVariable = async (vars, name) => {
    console.log(`Reading file variable: ${name}`);
    const data = (vars.getTyped(name) || {}).value;
    console.log(`\tdata -> ${data}`);
    const result = await axios({
        "responseType": "arraybuffer",
        "url": `${data.engineService.baseUrl}${data.remotePath}`
    });
    return result.data;
};

/**
 * Handler for `X-Parse-JsonPath` External Task
 * @function X-Parse-JsonPath
 * @param {Camunda File} json
 * @returns {JSON} result
 * @version 0.1
 * @see flows/parse-jsonpath.bpmn
 */
exports.parseJsonPath = async (
    { task, taskService }
) => await exports.callbackHandler(
    task, taskService, async () => {
        const vars = task.variables;
        const jsonpath = vars.get("jsonpath");
        const firstOnly = vars.get("firstOnly");
        const varname = vars.get("varname");

        console.log(str({ vars, jsonpath, firstOnly, varname }));
        let data = vars.get(varname || "json");
        console.log(({ data }));

        if (Buffer.isBuffer(data)) {
            data = data.toString();
        } else {
            data = base64decode(data);
        }
        data = JSON.parse(data);

        let result = JSONPath({ "json": data, "path": jsonpath });
        if (firstOnly) result = result[0];

        return {
            "localVariables": new Variables().setTyped(
                "result",
                { "type": "JSON", "value": str(result) }
            ),
            "processVariables": null
        };
    }
);

/**
 * Handler for `X-Print` External Task
 * @function X-Print
 * @param {string} input
 * @returns {NoOutput}
 * @version 0.1
 * @see flows/request-upm.bpmn
 */
exports.print = async (
    { task, taskService }
) => await exports.callbackHandler(
    task, taskService, async () => {
        const vars = task.variables;
        const data = vars.get("input");

        console.log("->", typeof data, data);
        try {
            console.log(base64decode(data));
        } catch (err) {
            // Cam be ignored, but catching just in case of an interesting bug
            console.log(err);
        }

        return {
            "localVariables": null,
            "processVariables": null
        };
    }
);

/**
 * Handler for `X-Base64-Encode` External Task
 * @function X-Base64-Encode
 * @param {string} input
 * @returns {string} output
 * @version 0.1
 * @see flows/request-upm.bpmn
 */
exports.base64Encode = async (
    { task, taskService }
) => await exports.callbackHandler(
    task, taskService, async () => {
        const vars = task.variables;
        const data = vars.get("input");

        console.log("->", typeof data, data);
        const result = Buffer.from(data, "binary").toString("base64");
        console.log(result);

        return {
            "localVariables": new Variables().setTyped(
                "output",
                { "type": "string", "value": result }
            ),
            "processVariables": null
        };
    }
);

/**
 * Handler for `X-Base64-Decode` External Task
 * @function X-Base64-Decode
 * @param {string} input
 * @returns {string} output
 * @version 0.1
 * @see flows/request-upm.bpmn
 */
exports.base64Decode = async (
    { task, taskService }
) => await exports.callbackHandler(
    task, taskService, async () => {
        const vars = task.variables;
        const data = vars.get("input");

        console.log("->", typeof data, data);
        const result = base64decode(data);
        console.log(result);

        return {
            "localVariables": new Variables().setTyped(
                "output",
                { "type": "string", "value": result }
            ),
            "processVariables": null
        };
    }
);

exports.taskHandlers = {
    "X-GenerateMdsVelocloud": exports.generateMdsVelocloud,
    "X-HttpRequest": exports.httpRequest,
    "X-HttpRequest-Aaf": exports.httpRequestAaf,
    "X-PaperplaneSendEmailXlsx": exports.paperplaneSendEmailXlsx,
    "X-Parse-JsonPath": exports.parseJsonPath,
    "X-Print": exports.print,
    "X-Base64-Encode": exports.base64Encode,
    "X-Base64-Decode": exports.base64Decode
};

exports.basicAuthInterceptor = (config) => ({
    ...config, headers: { ...config.headers, ...{
        "Authorization": `Basic ${CAMUNDA_CSS_BACKEND_BASIC}`
    } }
});

exports.mainFunc = () => {
    const baseUrl = CAMUNDA_ENGINE_URL || constants.camundaBaseUrl;
    const workerId = str(Math.floor(Math.random() * 2 ** 64));

    const client = new Client({
        baseUrl, "use": logger.level("info"), workerId,
        "interceptors": [exports.basicAuthInterceptor]
    });

    const handlers = exports.taskHandlers;
    for (const topic of Object.keys(handlers)) {
        client.subscribe(topic, handlers[topic]);
    }
};

if (module.parent === null) {
    exports.mainFunc();
}
