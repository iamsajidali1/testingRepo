const { CONFIG } = require("../config/configuration");
const genReport = CONFIG.genReport;
const camundaUrl = CONFIG.camundaUrl;
const camundaBasicAuth = CONFIG.camundaBasicAuth;
const axios = require('axios');
const { validationResult, header } = require("express-validator");
const loggerPino = require("../helpers/loggerHelper");
const constants = require("../constants");

exports.generateReport = [[
    header(constants.header_one_type).trim(),
    header(constants.header_one_type).notEmpty().equals(constants.one_type)
], async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors });
    }
    try {

        const data = req.body.actionData.data;
        const device = req.body.device;
        const params = req.body.params;
        const email = req.userEmail;
        const actionId = data.actionId
        const orchestrator = await exports.findOrchestratorByUrlAndTenantId(data.serviceToCustomerId);
        const reportUrl = await exports.findReportUrl(actionId);
        if (!orchestrator) {
            return res.status(400).send("Orchestartor Url is not found");
        }
        const response = await exports.callGenerateReportAPIasPromise(orchestrator, email, reportUrl, device, params);
        if (response.status == "OK") {
            return res.status(200).send({ result: response, message: "Successful!" });
        }
        if(response.status == "Error"){
            return res.status(500).send("Internal error generate report flow");
        }
    }
    catch (err) {
        loggerPino.error(err);
        return res.status(500).send("Internal error generate report flow");
    }
}
];

exports.callGenerateReportAPIasPromise = async function (orchestrator, email, reportUrl, device, params) {
    try {
        const options = {
             headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": `Basic ${camundaBasicAuth}`
            }
        };
        const tags = orchestrator["tags"].split(",");
        const cryptBody = JSON.stringify({ kdbx_name:"css-ra-velocloud", password: genReport.CRYPT_PASSWORD, tags:tags, url:orchestrator["url"] });
        const response = await axios.post(
            `${camundaUrl}process-definition/key/RequestRAVeloBilling/start`,
            {
                variables: {
                    cryptBody: { value: cryptBody, type:"string" },
                    tenantid: { value: orchestrator["tenant_id"], type: "integer" },
                    emails: { value: `${email}`, "type": "string" },
                    emailBody: { value: "Generated report in attachment", "type": "string" },
                    apiEndpoint: { value: reportUrl, "type": "string" },
                    devices:{ value: JSON.stringify(device), type:"string"},
                    params:{value: JSON.stringify(params), type:"string"}
                }
            },
            options
        );

        if (response) {
            if (response.status > 299 && response.status < 599) {
                return { status: "Error", statusCode: response.status, statusText: response.statusText }
            } else if (response.status <= 299 && response.status >= 200) {
                return { status: "OK", statusCode: response.status, userMessage: response.data.id }
            }
        } else {
            throw new Error("No response provided");
        }
    } catch (err) {
        loggerPino.error(err);
        throw new Error("Call Device report is failed");
    };
}


exports.findReportUrl = async function (actionId) {
    try {
        const resp = await axios.get(
            `${CONFIG.ormUrl}/api/templates/${actionId}`
        );
        if (resp.data) {
            return resp.data["apiendpoint"];
        } else {
            return false;
        }
    } catch (err) {
        loggerPino.error(err);
        throw new Error("Database error");
    }

}

exports.findOrchestratorByUrlAndTenantId = async function (serviceToCustomerId) {
    try {
        const resp = await axios.get(
            `${CONFIG.ormUrl}/api/orchestratorlisttoservicetocustomer/?service_to_customer__id=${serviceToCustomerId}`
        );
        if (resp.data.results[0]["orchestrator_list"]) {
            return resp.data.results[0]["orchestrator_list"];
        } else {
            return false;
        }
    } catch (err) {
        loggerPino.error(err);
        throw new Error("Database error");
    }

}
