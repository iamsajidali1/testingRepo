/**
 * This controller is responsible to send custom reports as per request
 */

const { ReportSchedule } = require("../models/reportScheduleModel");
const { getUtilizationReport } = require("./veloSuiteController");
const { axiosEmailCall } = require("./paperPlaneController");

const constants = require("../constants");
const XLSX = require("xlsx");

const logger = require("../helpers/loggerHelper");
const { ok } = require("../statuses");

/**
   * Converts a given number of bytes into a human-readable format.
   *
   * @param {number} bytes - The number of bytes to convert.
   * @param {string} [suffix='B'] - The suffix to append to the output string. Defaults to 'B'.
   *
   * @returns {string} The converted bytes in a human-readable format.
   *
   * @example
   * // returns '1.00 GB'
   * convertBytes(1000000000);
   *
   * @example
   * // returns '1.00 Gbit'
   * convertBytes(1000000000, 'bit');
   */
const convertBytes = (bytes, suffix = 'B') => {
    const kilobytes = bytes / 1000;
    const megabytes = kilobytes / 1000;
    const gigabytes = megabytes / 1000;

    if (gigabytes >= 1) {
        return `${gigabytes.toFixed(2)} G${suffix}`;
    } else if (megabytes >= 1) {
        return `${megabytes.toFixed(2)} M${suffix}`;
    } else if (kilobytes >= 1) {
        return `${kilobytes.toFixed(2)} K${suffix}`;
    } else {
        return `${bytes} ${suffix === 'B' ? 'bytes' : suffix}`;
    }
}

const sendReportEmail = async (reportName, report, sendTo) => {
    try {
        // Timestamp for report generated 
        const timestamp = (new Date());
        // Prepare the email payload
        const payload = {
            "type": "email",
            "body": `<html>
                Hello Team, <br><br>
                Please find the attached <strong>'${reportName}'</strong>, 
                for last 24 hours upto UTC <strong>'${timestamp.toLocaleString("en-US", {timeStyle: 'short', dateStyle: 'short'})}'</strong>.<br><br>
                Thank you!
            </html>`,
            "to": sendTo.split(','),
            "sender": constants.paperplaneSender,
            "subject": `${reportName} || ${constants.subject}`,
            "time": null,
            "attachments": { [`${reportName} - ${timestamp.toISOString()}.xlsx`]: report.toString("base64") }
        };
        // Send the Emails
        await axiosEmailCall(payload);
    } catch (err) {
        const { message } = err;
        logger.error(`Unable to email the report - ${message}`);
    }
}

const getUtilisationReportXlsx = (report) => {
    // Create a new empty workbook
    const workbook = XLSX.utils.book_new();
    // Create a summary worksheet containing summary of all devices
    const summary = report.data.map(device => {
        const cpu = device.systemStats.find(att => att.metric == 'cpuPct');
        const memory = device.systemStats.find(att => att.metric == 'memoryPct');
        const tunnel = device.systemStats.find(att => att.metric == 'tunnelCount');
        const agrThroughputRx = device.agrThroughput.find(att => att.metric = "agrThroughputRx");
        const agrThroughputTx = device.agrThroughput.find(att => att.metric = "agrThroughputTx");
        // Function to calculate average
        getAverage = (data) => data.reduce((acc, curr) => acc + curr, 0) / data.length;
        // Calculate min, max and avg of each attribute
        return {
            "Hostname": device.hostname,
            "CPU Min": Math.min(...cpu.data).toFixed(2) + ' %',
            "CPU Max": Math.max(...cpu.data).toFixed(2) + ' %',
            "CPU Avg": getAverage(cpu.data).toFixed(2) + ' %',
            "Memory Min": Math.min(...memory.data).toFixed(2) + ' %',
            "Memory Max": Math.max(...memory.data).toFixed(2) + ' %',
            "Memory Avg": getAverage(memory.data).toFixed(2) + ' %',
            "TunnelCount Min": Math.min(...tunnel.data),
            "TunnelCount Max": Math.max(...tunnel.data),
            "TunnelCount Avg": getAverage(tunnel.data).toFixed(2),
            "AgrThroughputRx Min": convertBytes(Math.min(...agrThroughputRx.data)),
            "AgrThroughputRx Max": convertBytes(Math.max(...agrThroughputRx.data)),
            "AgrThroughputRx Avg": convertBytes(getAverage(agrThroughputRx.data).toFixed(2)),
            "AgrThroughputTx Min": convertBytes(Math.min(...agrThroughputTx.data)),
            "AgrThroughputTx Max": convertBytes(Math.max(...agrThroughputTx.data)),
            "AgrThroughputTx Avg": convertBytes(getAverage(agrThroughputTx.data).toFixed(2)),
        }
    })
    const summaryWorksheet = XLSX.utils.json_to_sheet(summary);
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Summary");
    // Loop through each devices and create a new worksheet
    report.data.forEach(device => {
        // Create columns using various network attributes
        const deviceData = [];
        const [ref] = device.systemStats;
        const cpu = device.systemStats.find(att => att.metric == 'cpuPct');
        const memory = device.systemStats.find(att => att.metric == 'memoryPct');
        const tunnel = device.systemStats.find(att => att.metric == 'tunnelCount');
        for (let index = 0; index < ref.data.length; index += 1) {
            deviceData.push({
                "Timestamp": new Date(ref.startTime + index * ref.tickInterval).toISOString(),
                "CPU Utilization": cpu.data[index] + ' %',
                "Memory Utilization": memory.data[index] + ' %',
                "Tunnel Count": tunnel.data[index]
            })
        }
        const worksheet = XLSX.utils.json_to_sheet(deviceData);
        XLSX.utils.book_append_sheet(workbook, worksheet, device.hostname);
    });
    // Write the workbook as buffer and return
    return XLSX.write(workbook, { bookType: 'xlsx', compression: true, type: 'buffer' });
}

const downloadUtilisationReport = async (req, res) => {
    const { reportId } = req.query;
    try {
        // Get the report details from the database
        const { dataValues } = await ReportSchedule.findOne({
            where: {
                ID: reportId
            }
        });
        const endpoint = dataValues.ENDPOINT;
        const { orchestrator, timeframe, devices } = dataValues.DATA;
        // Prepare request body for the RA
        const reqBody = {
            devices: devices && devices.length ? devices.map(hostname => ({ hostname })) : [], params: [{
                "type": "json",
                "name": "timeframe",
                "value": timeframe
            }]
        }
        logger.info(`Request body for the RA: ${JSON.stringify(reqBody)}`);
        const report = await getUtilizationReport(orchestrator, reqBody, endpoint);
        const reportBuffer = getUtilisationReportXlsx(report.data);
        await sendReportEmail(dataValues.NAME, reportBuffer, dataValues.SEND_TO);
        res.status(ok).json({
            statusCode: ok,
            message: "Report successfully emailed to respective recipient!"
        })
    } catch (error) {
        logger.error("Unable to download the report, something went wrong!");
        logger.error(error.message);
    }
}

module.exports = { downloadUtilisationReport }