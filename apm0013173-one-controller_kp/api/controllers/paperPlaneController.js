const { CONFIG } = require("../config/configuration");
const btoa = require("btoa");
const atob = require("atob");
const constants = require("../constants");
const axios = require('axios');
const { getLogger } = require("../../utils/logging");
const { ok, serviceUnavailable } = require("../statuses");
const {
    getChangeNotificationEmailBody
  } = require("../../html_templates/minified");
  const { "stringify": str } = JSON;

exports.sendEmailMds = async (email, message, attachments) => {
    const log = getLogger();
    const payload = {
        type: "email",
        body: message,
        to: email,
        sender: constants.paperplaneSender,
        subject: constants.subject,
        time: null,
        attachments: { "mds.xls": attachments }
    };
    try {
        const result = await exports.axiosEmailCall(payload);
        return result;
    } catch (err) {
        log.error(err);
        throw err;
    }

};

exports.sendEmail = async (req, res) => {
    const log = getLogger();
    const emails = [];
    const bccEmail = [constants.supportEmail];
    if (req.isBcUser && req.ebizUserEmail) {
        emails.push(req.ebizUserEmail);
    } else {
        emails.push(req.user + "@att.com");
    }
    const payload = {
        type: "email",
        body: atob(req.body.message),
        to: emails,
        bcc: bccEmail,
        sender: constants.paperplaneSender,
        subject: constants.subject,
        time: null
    };
    try {
        const result = await exports.axiosEmailCall(payload);
        return res.status(ok).json(result);
    } catch (err) {
        log.error(err);
        return res.status(serviceUnavailable).json(err.message);
    }
};

exports.sendEmailBcUser = async (req, res) => {
    const log = getLogger();
    const cc = [];
    let emailBody = 'There is no BC user present';
    const emails = [constants.bcOnboardingEmail];
    log.info(`Send email to ${emails}`);
    if (req.isBcUser && req.ebizUserEmail) {
        log.info(`Send email ${str(req.ebizUserEmail)}`);
        cc.push(req.ebizUserEmail);
        emailBody = `<html>Hi Self-service Network Management, <br><br>
        I would like to request access to the Self-service Network Management application
        .<br><br>My Business Center ID (email) is: ${req["ebizUserEmail"]}.
        <br>The company name I am part of in Business Center is: ${req["ebizCompanyName"]}<br><br>Thank you</html>`;
    }
    const payload = {
        type: "email",
        body: emailBody,
        to: emails,
        bcc: cc,
        sender: constants.paperplaneSender,
        subject: constants.subject,
        time: null
    };
    try {
        const result = await exports.axiosEmailCall(payload);
        return res.status(ok).json(result);
    } catch (err) {
        log.error(err);
        return res.status(serviceUnavailable).json(err.message);
    }
};


exports.sendEmailNewTemplate = async (req, res) => {
    const body = getChangeNotificationEmailBody(req.body);
    const log = getLogger();
    const emails = [];
    const bccEmail = req.body.lanMigrationWorkflow? [constants.supportEmail, constants.lanMigrationSupport] : [constants.supportEmail];
    if (req.isBcUser && req.ebizUserEmail) {
        emails.push(req.ebizUserEmail);
    } else {
        emails.push(req.user + "@att.com");
    }
    const payload = {
        type: "email",
        body: body,
        to: emails,
        bcc: bccEmail,
        sender: constants.paperplaneSender,
        subject: constants.subject,
        time: null
    };
    try {
        const result = await exports.axiosEmailCall(payload);
        return res.status(ok).json(result);
    } catch (err) {
        log.error(err);
        return res.status(serviceUnavailable).json(err.message);
    }
};

exports.axiosEmailCall = async (payload) => {
    const log = getLogger();
    const auth = btoa(`${CONFIG.MECH_ID}:${CONFIG.MECH_ID_PASS}`);
    const options = {
        headers: {
            "Content-Type": "application/json",
            "X-Authorization": CONFIG.PAPERPLANE_TOKEN,
            "Authorization": `Basic ${auth}`
        },
    };

    const messageNotification = await axios.post(
        `${CONFIG.PAPERPLANE_URL}/api/v2/message`,
        payload,
        options
    );
    if (messageNotification) {
        if (messageNotification.status >= 200 && messageNotification.status < 299) {
            return true;
        } else {
            log.error(messageNotification);
            throw new Error("Can not send email notification!");
        }
    } else {
        log.error("Missing response from message request");
        throw new Error("Can not send email notification!");
    }

}
