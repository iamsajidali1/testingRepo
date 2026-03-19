/* eslint-disable max-classes-per-file, no-magic-numbers, max-len, max-lines-per-function */

const { Op } = require("sequelize");
const { getLogger } = require("../../utils/logging");

class InvalidInputError extends Error {}

exports.getSrReportsData = async (dateRange) => {
    const log = getLogger();
    const { startDate, endDate } = dateRange;
    const { SrReportsView } = require("../models/srReportsViewModel");
    const { Customers } = require("../models/customerOneModel");

    /*
     * ERROR Handling
     * Prepare the Query CONDITION based on Date Range
     * Check if Both the Passed Dates are valid
     * And also endDate should be GreaterThan or Equal to startDate
     */
    if (!startDate || !endDate) {
        throw new InvalidInputError("Both startDate and endDate needs to passed!");
    }
    if (isNaN(Date.parse(startDate)) || isNaN(Date.parse(endDate))) {
        throw new InvalidInputError("Both startDate and endDate should be in valid date format!");
    }
    if (new Date(endDate).getTime() < new Date(startDate).getTime()) {
        throw new InvalidInputError("The endDate should be greater than startDate!");
    }

    // Get data
    log.info("Fetching transactions for timeframe: ");

    // Find all the records that falls under SrReportsView
    const srReportData = await SrReportsView.findAll({
        "raw": true,
        "where": {
            "CREATE_DATE": {
                [Op.between]: [startDate, endDate]
            }
        }
    });

    // Filter out the customers for which we need more customer details
    const customerNames = srReportData.map((row) => row.CUSTOMER_NAME);

    // Find All the Customers to map SR Report to
    const customers = await Customers.findAll({
        "raw": true,
        "where": { "NAME": [...customerNames] }
    });

    log.info(`Fetched ${srReportData.length} SR Records!`);
    log.info(`Fetched ${customers.length} total Customers!`);

    // Group the srReport based on Customer Name
    const groupedByCustomer = srReportData.reduce((acc, data) => {
        acc[data.CUSTOMER_NAME] = {};
        acc[data.CUSTOMER_NAME].data = [];
        acc[data.CUSTOMER_NAME].data.push(data);
        return acc;
    }, {});

    // Assign the msimEmail id from the customer data
    for (const [key] of Object.entries(groupedByCustomer)) {
        // Find the customer details from the customers Array of Obj
        const customer = customers.find((cust) => cust.NAME === key);
        // Create a new key as msimEmail and assign the respective value
        groupedByCustomer[key].msimEmail = customer.MSIM_EMAIL;
    }
    return groupedByCustomer;
};
