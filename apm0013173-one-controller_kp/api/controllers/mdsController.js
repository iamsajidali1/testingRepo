const { CONFIG } = require("../config/configuration");
const vcoConfig = CONFIG.vcoJS;
const btoa = require("btoa");
const axios = require('axios');
const retry = 5;
const schedulerController = require("../controllers/schedulerController");
const { check, validationResult, body } = require("express-validator");
const paperPlaneController = require("../controllers/paperPlaneController");
const loggerPino = require("../helpers/loggerHelper");

exports.generateMdsConfiguration = [[
    body("credentials.VCO_USERNAME"),
    check("credentials.VCO_USERNAME").isLength({min: 1, max: 200}),
    body("credentials.VCO_PASSWORD"),
    check("credentials.VCO_PASSWORD").isLength({min: 1, max: 200})
], async(req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        schedulerController.updateStatusAndResult(req.body.pid, "Error", "422", errors, null)
        throw "Validation error - mds flow!";
    }
    try {
        const response = await exports.callHeapMdsAPIHelper(req);
        if (response.respStatus == "OK") {
            schedulerController.updateStatusAndResult(req.body.pid, "OK", "200", null ,response.response);
            return;
        } else {
            schedulerController.updateStatusAndResult(req.body.pid, "Error", response.respStatusCode, response.response, null);
            return;
        }
    } catch(error){
        loggerPino.error(error);
        schedulerController.updateStatusAndResult(req.body.pid, "Error", "500", "Internal error", null);
        throw "Internal error msd flow!";
    }
}];

exports.callHeapMdsAPIHelper = async(req) =>{
    for (i = 0; i <= retry; i++) {
        let resp = await exports.callHeapMdsAPIasPromise(req).catch(error => {
            loggerPino.error(error);
            throw error;
        });
        if (resp.status == "OK") {
            return { respStatus: resp.status, response: resp.result };
        }

        if (resp.status = "Error" && i == retry) {
            return { respStatus: resp.status, respStatusCode: resp.statusCode, response: resp.statusText }
        }
    }
}

exports.callHeapMdsAPIasPromise = async(req) =>{
    const data = req.body.actionData.data;
    const auth =  btoa(`${CONFIG.MECH_ID}:${CONFIG.MECH_ID_PASS}`);
    const requestConfig = {
        url: vcoConfig.MSD_LINK,
        method: 'post',
        responseType: 'arraybuffer',
        data: {
            "vco_url": data.vcoUrl.url,
            "vco_username": req.body.credentials.VCO_USERNAME,
            "vco_password": req.body.credentials.VCO_PASSWORD,
        }, 
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Authorization": CONFIG.MDS_TOKEN,
            "Authorization": `Basic ${auth}`
        }
    }
    const response = await axios(requestConfig).catch((error) => {
        loggerPino.error(error);
        throw "Call HEAP MDS is failed!";
    });
    if (response) {
        if (response.status <= 299 && response.status >= 200) {
            const base64Data = Buffer.from(response.data, 'binary').toString('base64');
            if (req.body.credentials.usersEmail) {
                paperPlaneController.sendEmailMds(
                    req.body.credentials.usersEmail,
                    "MDS configuration",
                    base64Data
                    );
            }
            return { status: "OK", statusCode: response.status, result: base64Data};
        } else {
            await response.text();
            loggerPino.error("Error when getting mds!");
            loggerPino.info("Whole response of the request");
            loggerPino.info(response);
            return { status: "Error", statusCode: response.status, statusText: response.statusText };
        }
    } else {
        loggerPino.error("Error when getting mds! - empty response");
        loggerPino.info("Whole response of the request");
        loggerPino.info(response);
        return { status: "Error", statusCode: 500, statusText: "Empty response!" };
    }
}
