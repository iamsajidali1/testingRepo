const axios = require("axios");
const { check, validationResult } = require("express-validator");

const { CONFIG } = require("../config/configuration");
const { getLogger } = require("../../utils/logging");
const { HttpsProxyAgent } = require("https-proxy-agent");

const { proxyAttSub } = require("../constants");
const { ok, badRequest, notFound, internalServerError, serviceUnavailable } = require("../statuses");
const { TDCData } = require("../models/tdcDataModel");
const { GeographicalSite } = require("../models/geographicalSiteModel");
const { EricksonSite } = require("../models/ericksonSiteModel");
const { "stringify": str } = JSON;

const proxyServer = process.env.http_proxy || proxyAttSub;

// Create a default axios instance
const axiosInstance = axios.create({
  proxy: false,
  httpsAgent: new HttpsProxyAgent(proxyServer),
  headers: {
    "Accept": "application/json",
    "Content-Type": "application/json"
  }
});

class ResponseError extends Error { }
class NotFoundError extends Error { }

/**
 * Request EOC Bearer token
 * @returns EOC Bearer token to access the resource
 */
const getEocToken = async () => {
  const logger = getLogger();
  const { eoc: { host, password, username } } = CONFIG;
  try {
    const tokenUrl = `${host}/avmSecurity/getToken`;
    logger.info(`Using EOC token URL: ${tokenUrl}`);
    const response = await axiosInstance.get(tokenUrl, { auth: { username, password } });
    if (response.status !== ok) {
      throw new Error(`getEocToken request failed: ${response.statusText}`);
    } else if (!response.data) {
      throw new Error("getEocToken request failed: empty response");
    } else if (!response.data.cwtoken) {
      throw new Error("getEocToken request failed: missing token");
    }
    return response.data.cwtoken;
  } catch (error) {
    // Check if AxiosError
    if (error.isAxiosError) {
      logger.error(`getEocToken request failed: ${error.message}`)
    } else {
      logger.error(`getEocToken request failed: ${str(error)}`);
    }
    return null;
  }
};

/**
 * Loads EOC JSON data by sending a POST request to the EOC service.
 *
 * @param {Object} data - The data to be sent in the request body.
 * @returns {Promise<Object|null>} The response data from the EOC service, or null if an error occurs.
 * @throws {Error} If the token request fails or the response from the EOC service is invalid.
 */
const loadEocJson = async (data) => {
  const logger = getLogger();
  const { eoc: { host } } = CONFIG;
  try {
    // Get the token
    logger.info("Getting EOC token");
    const token = await getEocToken();
    if (!token) {
      throw new Error("getEocToken request failed: empty token");
    }
    logger.info("EOC token received successfully");
    // Send the request
    const url = `${host}/operational/order/loadJson`;
    logger.info(`Sending request to EOC: ${url}`);
    const response = await axiosInstance.post(url, data, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    logger.info("Response received from EOC");
    if (response.status !== ok) {
      throw new ResponseError(`loadEocJson request failed: ${response.statusText}`);
    } else if (!response.data) {
      throw new NotFoundError("loadEocJson request failed: empty response");
    }
    logger.info("loadEocJson request successful");
    return { status: response.status, data: response.data };
  } catch (error) {
    // Check if AxiosError
    if (error.isAxiosError) {
      logger.error(`loadEocJson request failed: ${error.message}`)
      return { status: serviceUnavailable, message: error.message };
    } else if (error instanceof ResponseError) {
      logger.error(`loadEocJson request failed: ${str(error)}`);
      return { status: badRequest, message: error.message };
    } else if (error instanceof NotFoundError) {
      logger.error(`loadEocJson request failed: ${error.message}`);
      return { status: notFound, message: error.message };
    } else {
      logger.error(`loadEocJson request failed: ${str(error)}`);
      return { status: internalServerError, message: error.message };
    }
  }
}

const pushEocConfiguration = [[
  // Express Validator to validate the request
  check("tdcId", "tdcId is required").exists(),
  check("orderData", "orderData is required").exists()
], async (req, res) => {
  const validationErrors = validationResult(req);
  if (!validationErrors.isEmpty()) {
    const { errors } = validationErrors;
    return res.status(badRequest).json({ "message": errors.map((err) => err.msg).join(", "), errors });
  }
  const logger = getLogger();
  // Check if TDC id is Passed
  const { tdcId } = req.body;
  if (!tdcId) {
    return res.status(badRequest).json({
      "message": "TDC Id is missing in the Data Collection Record!"
    });
  }
  try {
    // Step 1: Get the Customer Site Id and Customer Details
    logger.info('Getting the customer site details')
    const tdcDataRow = await TDCData.findOne({
      where: { ID: tdcId },
      include: [{
        model: GeographicalSite,
        include: [{
          model: EricksonSite,
          attributes: ['SITE_ID', 'SITE_NAME']
        }]
      }]
    });

    if (!tdcDataRow) {
      throw new NotFoundError(`No TDC Data found with ID: ${tdcId}`)
    }

    const siteId = tdcDataRow.GeographicalSite?.EricksonSites?.[0]?.SITE_ID;
    const customerName = tdcDataRow.GeographicalSite?.EricksonSites?.[0]?.SITE_NAME;
    if (!siteId) {
      throw new NotFoundError(`No SITE_ID found for TDCData with ID: ${tdcId}`);
    }
    logger.info(`SITE_ID found: ${str(siteId)} with SITE_NAME: ${str(customerName)} for TDCData with ID: ${str(tdcId)}`);
    // Step 2: Generate Config using the template data and passing the user data
    // Step 3: Prepare the JSON Data to be loaded to the Orchestrator
    const { orderData } = req.body;
    const eocJson = { customerName, siteId, orderData }
    logger.info("Pushing EOC Json onto the Erickson orchestrator.")
    const eocResponse = await loadEocJson(eocJson);
    // Step 4: Send appropriate response to the user
    return res.status(eocResponse.status).json(eocResponse);
  } catch (error) {
    // Handle the Error in Each Step
    if (error instanceof NotFoundError) {
      logger.error(error.message);
      return res.status(notFound).json({ "message": error.message });
    } else {
      logger.error(`Error in pushEocConfiguration: ${str(error)}`);
      return res.status(badRequest).json({ "message": "Error in pushEocConfiguration" });
    }
  }
}]

module.exports = { pushEocConfiguration };