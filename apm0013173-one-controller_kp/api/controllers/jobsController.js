/* eslint-disable sort-keys, no-magic-numbers, max-len, max-lines-per-function */

const { promisify } = require("util");
const csvStringify = require("csv-stringify");

const { getSrReportsData } = require("./srReportsController");
const { axiosEmailCall } = require("./paperPlaneController");
const { ok, notFound, internalServerError } = require("../statuses");
const constants = require("../constants");
const { getLogger } = require("../../utils/logging");

const csvStringifyPromise = promisify(csvStringify);

class NotFoundError extends Error {}

const TWENTY_FOUR_HOURS = 86400 * 1000;

const convertToFormattedUTC = (date) => {
    const options = { "year": "numeric", "month": "2-digit", "day": "2-digit" };
    options.timeZone = "UTC";
    return new Intl.DateTimeFormat("en-US", options).format(date);
};

const convertToFormattedTimestampUTC = (date) => {
    const options = {
        "year": "numeric",
        "month": "2-digit",
        "day": "2-digit",
        "hour": "numeric",
        "minute": "numeric",
        "second": "numeric",
        "hour12": false,
        "timeZone": "UTC"
    };
    return new Intl.DateTimeFormat("en-US", options).format(date);
};


const convertJsonToCsv = (data, delimeter) => {
    if (!data.length) {
        return "";
    }
    const columns = Object.keys(data[0]);
    return csvStringifyPromise(data, {
        "header": true,
        columns,
        "delimiter": delimeter || ",",
        "record_delimiter": "\r\n",
        "cast": { "date": convertToFormattedTimestampUTC }
    });
};


const sendSrReports = async (req, res) => {
    const log = getLogger();
    try {
        const now = new Date();

        /*
         * Get the list of customers and it's respective data
         * Create a Date Range where EndDate is now and StartDate is 24 hours prior
         * CronJOB will run at exactly UTC 00:00:00 Every day
         */
        const dataRange = {
            "startDate": new Date(now - TWENTY_FOUR_HOURS),
            "endDate": now
        };
        const results = await getSrReportsData(dataRange);
        if (!results) {
            throw new NotFoundError("No data found to be sent!");
        } else if (
            results &&
            Object.keys(results).length === 0 &&
            Object.getPrototypeOf(results) === Object.prototype
        ) {
            throw new NotFoundError("No data found to be sent!");
        }
        const customers = Object.keys(results);
        customers.forEach(async (customer) => {
            try {
                if (!results[customer].msimEmail) {
                    return;
                }
                const csv = await convertJsonToCsv(results[customer].data);
                const base64Csv = Buffer.from(csv, "utf-8").toString("base64");
                const payload = {
                    "type": "email",
                    "body": `<html>
                        Hello Team, <br><br>
                        Please find list of changes executed by client using Self-Service platform for <strong>'${customer}'</strong>, 
                        between UTC <strong>'${convertToFormattedUTC(dataRange.startDate)}'</strong> to <strong>'${convertToFormattedUTC(dataRange.endDate)}'</strong>,
                        that require CR/SR submission by MSIM.<br><br>
                        Thank you!
                    </html>`,
                    "to": [results[customer].msimEmail],
                    "sender": constants.paperplaneSender,
                    "subject": `${constants.subject} || CR/SR Report || ${customer} || ${convertToFormattedUTC(dataRange.startDate)}`,
                    "time": null,
                    "attachments": { [`SrReport_${customer}_${convertToFormattedUTC(dataRange.startDate)}.csv`]: base64Csv }
                };
                // Send the Emails
                await axiosEmailCall(payload);
            } catch (err) {
                const { message } = err;
                log.error(message);
            }
        });
        // Save this execution to the database
        const { JobsSrReport } = require("../models/jobsSrReportsModel");
        await JobsSrReport.create({ "DATA": results, "REPORT_DATE": dataRange.startDate, "IS_NOTIFIED": true });
        return res.status(ok).json(results);
    } catch (err) {
        const { message } = err;
        log.error(message);
        if (err instanceof NotFoundError) {
            return res.status(notFound).json({ message });
        }
        return res.status(internalServerError).json(err);
    }
};

module.exports = { convertToFormattedTimestampUTC, sendSrReports };
