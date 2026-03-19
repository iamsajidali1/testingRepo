const axios = require("axios");
const btoa = require("btoa");
const yaml = require("yaml");

const { CONFIG } = require("../config/configuration");
const { callCamundaService } = require("./camundaController");
const logger = require("../helpers/loggerHelper");
const {
  ok,
  internalServerError,
  notFound,
  unprocessableEntity,
} = require("../statuses");
const {
  transformUtilizationMetrics,
  transformLicenseData,
  transformSiteData,
} = require("../helpers/transformDataHelper");
const { check, validationResult, query } = require("express-validator");
const {
  OrchestratorListForLicense,
} = require("../models/orchestratorListForLicenseModel");
const {
  OrchestratorLicenseDetails,
} = require("../models/orchestratorLicenseDetailsModel");
const { OrchestratorList } = require("../models/orchestratorListModel");
const { SiteInfo } = require("../models/siteInfoModel");
const { Customers } = require("../models/customerOneModel");
const Sequelize = require("sequelize");
const { "stringify": str } = JSON;

class NotFoundError extends Error {}

/**
 * A mapping of vendor names to their corresponding KDBX identifiers.
 *
 * @constant {Object.<string, string>}
 * @property {string} VELOCLOUD - The KDBX identifier for VELOCLOUD.
 * @property {string} VMANAGE - The KDBX identifier for VMANAGE.
 */
const vendorToKdbxMapping = {
  VELOCLOUD: "css-ra-velocloud",
  VMANAGE: "css-ra-viptela",
};

/**
 * Retrieves the orchestrator list for a given serviceToCustomerId.
 *
 * @param {string} serviceToCustomerId - The ID of the serviceToCustomer.
 * @returns {Promise<Array<string>>} - A promise that resolves to an array of orchestrator lists.
 */
const findOrchestrators = async (serviceToCustomerId) => {
  try {
    const resp = await axios.get(
      `${CONFIG.ormUrl}/api/orchestratorlisttoservicetocustomer/`,
      {
        params: {
          service_to_customer__id: serviceToCustomerId,
        },
      }
    );
    if (!resp.data || !resp.data.results || !resp.data.results.length) {
      throw new Error(
        `Orchestrator list not found for serviceToCustomerId: ${serviceToCustomerId}!`
      );
    }
    return resp.data.results.map((orc) => orc.orchestrator_list);
  } catch (err) {
    logger.error(err);
    return [];
  }
};

/**
 * Finds the report URL for a given action ID.
 *
 * @param {string} actionId - The ID of the action.
 * @returns {Promise<string|null>} - The report URL if found, otherwise null.
 */
const findReportUrl = async (actionId) => {
  try {
    // Sanitise actionId to avoid SSRF
    if (!actionId) {
      throw new Error(`No action id is passed, can't fetch report endpoint!`);
    }
    const resp = await axios.get(`${CONFIG.ormUrl}/api/templates/`, {
      params: { id: actionId }
    });
    if (!resp.data || !resp.data.results || !resp.data.results.length) {
      throw new Error(`No Action found for actionId: ${actionId}`)
    }
    const [ action ] = resp.data.results;
    if(!action.apiendpoint) {
      throw new Error(`No API EndPoint found for actionId: ${actionId}!`);
    }
    return action.apiendpoint;
  } catch (err) {
    logger.error(`Error in finding Report Url: ${str(err.message)}`)
    return null;
  }
};

/**
 * To Generate the MDS Config Using Camunda
 * @param {*} req
 * @param {*} res
 * @returns {*} Object with status and message
 */
const generateSdwanReport = async (req, res) => {
  const { orchestrator, usersEmail, vendor } = req.body.data;
  const { actionId, serviceToCustomerId } = req.body.actionData.data;
  const { genReport } = CONFIG;
  try {
    const orchestratorList = await findOrchestrators(serviceToCustomerId);
    if (!orchestratorList || !orchestratorList.length) {
      throw new Error("Could not fetch orchestrator list with details!");
    }
    const reportUrl = await findReportUrl(actionId);
    if (!reportUrl) {
      throw new Error("Report endpoint could not be found!");
    }
    // Filter out only the orchestrator for wgich the report is required
    let orchToBeUsed;
    let cryptBody = {};
    let customerDetails = {};
    //check if orchestrator is present
    if (orchestrator) {
      orchToBeUsed = orchestratorList.filter((orch) =>
        orchestrator.includes(orch.url)
      );

      // Prepare Crypt Body
      cryptBody = orchToBeUsed.map((orch) => ({
        kdbx_name: vendorToKdbxMapping[vendor],
        password: genReport.CRYPT_PASSWORD,
        tags: orch.tags ? orch.tags.split(",") : null,
        url: orch.url,
        tenantid: orch.tenant_id,
      }));
      // Prepare Customer Details
      customerDetails = orchToBeUsed.map((orch) => ({
        url: orch.url,
        tenantid: orch.tenant_id,
        configYaml: orch.config_yaml ? yaml.parse(orch.config_yaml) : null,
      }));
    }
    // prepare params from data that we received in req.body
    const params = [];
    for (const [key] of Object.entries(req.body.data)) {
      if (key != "orchestrator" && key != "usersEmail") {
        params.push({ type: "json", name: key, value: req.body.data[key] });
      }
    }
    // Prepare for the devices if any passed
    const devices = [];
    if (req.body.data.devices && req.body.data.devices.length) {
      logger.info("Devices found in the request body!");
      logger.info(str(req.body.data.devices));
      devices.push(
        ...req.body.data.devices.map((device) => ({ hostname: device }))
      );
    }
    // Prepare Camunda Body
    const camundaBody = {
      variables: {
        cryptBody: {
          value: str(cryptBody),
          type: "string",
        },
        customerDetails: {
          value: str(customerDetails),
          type: "string",
        },
        emails: {
          value: str(usersEmail),
          type: "string",
        },
        vendor: {
          value: vendor || "any",
          type: "string",
        },
        emailBody: {
          value:
            "Hello There, \nPlease find the attached report that you've requested. \n\n Thank You!",
          type: "string",
        },
        devices: {
          value: str(devices),
          type: "string",
        },
        params: {
          value: str(params),
          type: "string",
        },
        apiEndpoint: {
          value: `${reportUrl}`,
          type: "string",
        },
      },
    };
    logger.info(str(camundaBody));
    const response = await callCamundaService("RAReport/start", camundaBody);
    return res.status(response.statusCode || ok).json({
      ...response,
      message: `Successfully completed the request with id: ${response.userMessage}`,
    });
  } catch (error) {
    logger.error(error.message);
    return res.status(internalServerError).json({
      message:
        error.message || "Unable to complete the call to process manager!",
    });
  }
};

/**
 * Retrieves the utilization report for a selected orchestrator.
 * @param {Object} orchestrator - The orchestrator object containing the url and tenant_id.
 * @param {Object} requestBody - The request body for the report.
 * @param {string} reportEndpoint - The endpoint for the report.
 * @returns {Object} - The response object containing the status code, message, and data.
 */
const getUtilizationReport = async (
  orchestrator,
  requestBody,
  reportEndpoint
) => {
  try {
    if (!(orchestrator && orchestrator.url)) {
      const message = "Orchestrator url is missing!";
      logger.error(message);
      return { statusCode: notFound, message, data: null };
    }
    if (!(orchestrator && orchestrator.tenant_id)) {
      const message = "Orchestrator tenant_id is missing!";
      logger.error(message);
      return { statusCode: notFound, message, data: null };
    }
    // Prepare Crypt Body
    const cryptBody = {
      kdbx_name: "css-ra-velocloud",
      password: CONFIG.genReport.CRYPT_PASSWORD,
      tags: orchestrator.tags ? orchestrator.tags.split(",") : [],
      url: orchestrator.url,
      tenantid: orchestrator.tenant_id,
    };
    // Prepare Crypt Request
    const cryptRequest = {
      method: "POST",
      url: `${CONFIG.cryptUrl}/v1/credentials/`,
      data: cryptBody,
      headers: {
        "Content-Type": "application/json",
        "X-Authorization": `Token ${CONFIG.genReport.CRYPT_TOKEN}`,
      },
      auth: {
        username: CONFIG.MECH_ID,
        password: CONFIG.MECH_ID_PASS,
      },
      proxy: false,
    };
    logger.info(`Crypt Request => ${str(cryptRequest)}`);
    // Call crypt to get secrets
    const cryptResponse = await axios(cryptRequest);
    if (cryptResponse.status !== ok) {
      const message =
        "Not able to retrieve credentials for the selected orchestrator!";
      logger.error(message);
      return {
        statusCode: cryptResponse.status || internalServerError,
        message,
        data: null,
      };
    }

    const [orchestratorDetails] = cryptResponse.data;

    // Prepare Report Request
    const reportRequest = {
      method: "post",
      url: `${CONFIG.veloRaUrl}${reportEndpoint}`,
      data: requestBody,
      headers: {
        "Content-Type": "application/json",
        "X-Authorization": `Token ${CONFIG.genReport.CRYPT_TOKEN}`,
        "X-username": orchestratorDetails.username,
        "X-password": orchestratorDetails.password,
        "X-tenant-id": orchestrator.tenant_id,
        "X-url": orchestratorDetails.url,
      },
      auth: {
        username: CONFIG.MECH_ID,
        password: CONFIG.MECH_ID_PASS,
      },
      proxy: false,
    };
    logger.info(`Report Request => ${str(reportRequest)}`);
    logger.info("Fetching the utilization report ...");
    const reportResponse = await axios(reportRequest);
    if (reportResponse.status !== ok) {
      const message = `Error: ${reportResponse.status}: Not able to retrieve report for the selected orchestrator!`;
      logger.error(message);
      return {
        statusCode: reportResponse.status || internalServerError,
        message,
        data: null,
      };
    }
    logger.info("Utilization report fetched successfully!");
    return {
      statusCode: reportResponse.status,
      message: "Utilization report fetched successfully!",
      data: transformUtilizationMetrics(reportResponse.data.data),
    };
  } catch (error) {
    // TODO: Handle axios error
    const message =
      error.message || "Unhandled exception occured, please contact support!";
    logger.error(message);
    return { statusCode: internalServerError, message, data: null };
  }
};

/**
 * Generate the Utilisation Report
 * @param {*} req
 * @param {*} res
 */
const generateUtilisationReport = async (req, res) => {
  const { orchestrator, devices, timeframe } = req.body.data;
  const { actionId, serviceToCustomerId } = req.body.actionData.data;
  try {
    const orchestratorList = await findOrchestrators(serviceToCustomerId);
    if (!orchestratorList || !orchestratorList.length) {
      throw new Error("Could not fetch orchestrator list with details!");
    }
    const reportUrl = await findReportUrl(actionId);
    if (!reportUrl) {
      throw new Error("Report endpoint could not be found!");
    }
    //check if orchestrator is present
    if (!orchestrator) {
      throw new Error("Orchestrator could not be found!");
    }
    const [orchToBeUsed] = orchestratorList.filter((orch) =>
      orchestrator.includes(orch.url)
    );
    // Prepare request body for the RA
    const reqBody = {
      devices:
        devices && devices.length
          ? devices.map((hostname) => ({ hostname }))
          : [],
      params: [
        {
          type: "json",
          name: "timeframe",
          value: timeframe,
        },
      ],
    };
    logger.info(str(reqBody));
    const report = await getUtilizationReport(orchToBeUsed, reqBody, reportUrl);

    return res.status(report.statusCode).json(report);
  } catch (error) {
    logger.error(error.message);
    return res.status(internalServerError).json({
      message:
        error.message || "Unable to complete the call to process manager!",
    });
  }
};

/**
 * To Provision the users to the orchestrator Using Camunda
 * @param {*} req
 * @param {*} res
 * @returns {*} Object with status and message
 */
const provisionUsers = async (req, res) => {
  const { orchestrators, emails, config } = req.body;
  const { serviceToCustomerId } = req.body.actionData.data;
  const { genReport } = CONFIG;
  try {
    const orchestratorList = await findOrchestrators(serviceToCustomerId);
    if (!orchestratorList || !orchestratorList.length) {
      throw new Error("Could not fetch orchestrator list with details!");
    }
    // Filter out only the orchestrator for wgich the report is required
    const orchToBeUsed = orchestratorList.filter((orch) =>
      orchestrators.includes(orch.url)
    );
    // Prepare Crypt Body
    const cryptBody = orchToBeUsed.map((orch) => ({
      kdbx_name: vendorToKdbxMapping[vendor],
      password: genReport.CRYPT_PASSWORD,
      tags: orch.tags ? orch.tags.split(",") : null,
      url: orch.url,
      tenantid: orch.tenant_id,
    }));
    // Prepare Customer Details
    const customerDetails = orchToBeUsed.map((orch) => ({
      url: orch.url,
      tenantid: orch.tenant_id,
      configYaml: orch.config_yaml ? yaml.parse(orch.config_yaml) : null,
    }));
    // Prepare Params
    const params = [{ type: "json", name: "user_list", value: config }];
    // Prepare Camunda Body
    const camundaBody = {
      variables: {
        cryptBody: {
          value: str(cryptBody),
          type: "string",
        },
        customerDetails: {
          value: str(customerDetails),
          type: "string",
        },
        emails: {
          value: str(emails),
          type: "string",
        },
        vendor: {
          value: "VELOCLOUD",
          type: "string",
        },
        emailBody: {
          value:
            "Hello There, \n" +
            "Users have successfully been provisioned onto the Orchestrator.\n\n" +
            "Thank You!",
          type: "string",
        },
        devices: {
          value: "[]",
          type: "string",
        },
        params: {
          value: str(params),
          type: "string",
        },
      },
    };
    const response = await callCamundaService(
      "RAUserProvisioning/start",
      camundaBody
    );
    return res.status(response.statusCode || ok).json({
      ...response,
      message: `Successfully completed the request with id: ${response.userMessage}`,
    });
  } catch (error) {
    logger.error(error.message);
    return res.status(internalServerError).json({
      message:
        error.message || "Unable to complete the call to process manager!",
    });
  }
};

/**
 * To Provision the edges to the orchestrator Using Camunda
 * @param {*} req
 * @param {*} res
 * @returns {*} Object with status and message
 */
const provisionEdges = async (req, res) => {
  const { orchestrators, emails, config } = req.body;
  const { serviceToCustomerId } = req.body.actionData.data;
  const { genReport } = CONFIG;
  try {
    const orchestratorList = await findOrchestrators(serviceToCustomerId);
    if (!orchestratorList || !orchestratorList.length) {
      throw new Error("Could not fetch orchestrator list with details!");
    }
    // Filter out only the orchestrator for wgich the report is required
    const orchToBeUsed = orchestratorList.filter((orch) =>
      orchestrators.includes(orch.url)
    );
    // Prepare Crypt Body
    const cryptBody = orchToBeUsed.map((orch) => ({
      kdbx_name: "css-ra-velocloud",
      password: genReport.CRYPT_PASSWORD,
      tags: orch.tags ? orch.tags.split(",") : null,
      url: orch.url,
      tenantid: orch.tenant_id,
    }));
    // Prepare Customer Details
    const customerDetails = orchToBeUsed.map((orch) => ({
      url: orch.url,
      tenantid: orch.tenant_id,
      configYaml: orch.config_yaml ? yaml.parse(orch.config_yaml) : null,
    }));
    // Prepare Params
    const params = [
      {
        type: "base64",
        name: "edge_list",
        value: btoa(str(config)),
      },
    ];
    // Prepare Camunda Body
    const camundaBody = {
      variables: {
        cryptBody: {
          value: str(cryptBody),
          type: "string",
        },
        customerDetails: {
          value: str(customerDetails),
          type: "string",
        },
        emails: {
          value: str(emails),
          type: "string",
        },
        vendor: {
          value: "VELOCLOUD",
          type: "string",
        },
        emailBody: {
          value:
            "Hello There, \n" +
            "Edges have successfully been provisioned onto the Orchestrator.\n\n" +
            "Thank You!",
          type: "string",
        },
        devices: {
          value: "[]",
          type: "string",
        },
        params: {
          value: str(params),
          type: "json",
        },
      },
    };
    let response;
       if((serviceToCustomerId == 183 && process.env.CSS_ENV == "dev") || (serviceToCustomerId == 582 && process.env.CSS_ENV == "prod")){
     response = await callCamundaService(
      "RAEdgeProvisioningCitizens/start",
      camundaBody
    );
  } else {
     response = await callCamundaService(
      "RAEdgeProvisioning/start",
      camundaBody
    );
  }
    return res.status(response.statusCode || ok).json({
      ...response,
      message: `Successfully completed the request with id: ${response.userMessage}`,
    });
  } catch (error) {
    logger.error(error.message);
    return res.status(internalServerError).json({
      message:
        error.message || "Unable to complete the call to process manager!",
    });
  }
};

/**
 * Retrieves orchestrator license details.
 *
 * @param {Object} orchestrator - The orchestrator object.
 * @param {string} orchestrator.ORCHESTRATOR - The URL of the orchestrator.
 * @param {string} orchestrator.TENANT_ID - The tenant ID of the orchestrator.
 * @param {string} [orchestrator.TAGS] - Optional tags for the orchestrator.
 * @returns {Promise<Object>} The response object containing statusCode, message, and data.
 * @throws {Error} If an unhandled exception occurs.
 */
const getOrchestratorLicenceDetails = async (orchestrator) => {
  try {
    if (!(orchestrator && orchestrator.ORCHESTRATOR)) {
      const message = "Orchestrator URL is missing!";
      logger.error(message);
      return { statusCode: notFound, message, data: null };
    }
    if (!(orchestrator && orchestrator.TENANT_ID)) {
      const message = "Orchestrator TENANT_ID is missing!";
      logger.error(message);
      return { statusCode: notFound, message, data: null };
    }
    // Prepare Crypt Body
    const cryptBody = {
      kdbx_name: "css-ra-velocloud",
      password: CONFIG.genReport.CRYPT_PASSWORD,
      tags: orchestrator.TAGS ? orchestrator.TAGS.split(",") : [],
      url: orchestrator.ORCHESTRATOR,
      tenantid: orchestrator.TENANT_ID,
    };
    // Prepare Crypt Request
    const cryptRequest = {
      method: "POST",
      url: `${CONFIG.cryptUrl}/v1/credentials/`,
      data: cryptBody,
      headers: {
        "Content-Type": "application/json",
        "X-Authorization": `Token ${CONFIG.genReport.CRYPT_TOKEN}`,
      },
      auth: {
        username: CONFIG.MECH_ID,
        password: CONFIG.MECH_ID_PASS,
      },
      proxy: false,
    };
    logger.info(`Crypt Request => ${str(cryptRequest)}`);
    // Call crypt to get secrets
    const cryptResponse = await axios(cryptRequest);
    if (cryptResponse.status !== ok) {
      const message =
        "Not able to retrieve credentials for the selected orchestrator!";
      logger.error(message);
      return {
        statusCode: cryptResponse.status || internalServerError,
        message,
        data: null,
      };
    }
    const [orchestratorDetails] = cryptResponse.data;
    // Prepare Report Request
    const reportRequest = {
      method: "post",
      url: `${CONFIG.veloRaUrl}/report/licenses`,
      headers: {
        "Content-Type": "application/json",
        "X-Authorization": `Token ${CONFIG.genReport.CRYPT_TOKEN}`,
        "X-username": orchestratorDetails.username,
        "X-password": orchestratorDetails.password,
        "X-tenant-id": orchestrator.TENANT_ID,
        "X-url": orchestratorDetails.url,
      },
      auth: {
        username: CONFIG.MECH_ID,
        password: CONFIG.MECH_ID_PASS,
      },
      data: {
        devices: [],
        params: [],
      },
      proxy: false,
    };
    logger.info(`License Request => ${str(reportRequest)}`);
    logger.info(`Fetching the license details for ${str(orchestratorDetails.url)}`);
    const reportResponse = await axios(reportRequest);
    if (reportResponse.status !== ok) {
      const message = `Error: ${reportResponse.status}: Not able to retrieve report for the selected orchestrator!`;
      logger.error(message);
      return {
        statusCode: reportResponse.status || internalServerError,
        message,
        data: null,
      };
    }
    logger.info("License details fetched successfully!");
    // Transform the data
    const transformedData = transformLicenseData(reportResponse.data.data);
    return {
      statusCode: reportResponse.status,
      message: "License details fetched successfully!",
      data: transformedData,
    };
  } catch (error) {
    const message =
      error.message || "Unhandled exception occured, please contact support!";
    logger.error(message);
    return { statusCode: internalServerError, message, data: null };
  }
};

/**
 * Updates VCO licenses by fetching orchestrator list and updating license data.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise<void>} - A promise that resolves when the operation is complete.
 * @throws {Error} - Throws an error if unable to fetch orchestrator list or update license data.
 */
const syncOrchestratorLicenses = async (req, res) => {
  try {
    const orchestratorList = await OrchestratorListForLicense.findAll({});
    if (!orchestratorList || !orchestratorList.length) {
      throw new Error("Could not fetch orchestrator list with details!");
    }
    logger.info(`Orchestrator List => ${str(orchestratorList)}`);
    syncSummary = {
      totalOrchestrators: orchestratorList.length,
      success: 0,
      failed: 0,
      failedOrchestrators: [],
    };
    for (const orchestrator of orchestratorList) {
      try {
        const licenseDetails =
          await getOrchestratorLicenceDetails(orchestrator);
        if (licenseDetails.statusCode !== ok) {
          throw new Error(licenseDetails.message);
        }
        // Use upsert to create or update the record
        const [orchestratorLicense, created] =
          await OrchestratorLicenseDetails.upsert({
            ORCHESTRATOR_LIST_FOR_LICENSE_ID: orchestrator.ID,
            LICENSE_DATA: licenseDetails.data,
            LICENSE_COUNT: licenseDetails.data.length || 0,
          });
        if (created) {
          logger.info(
            `Created new license data for orchestrator: ${orchestrator.ORCHESTRATOR}, tenant_id: ${orchestrator.TENANT_ID}, tags: ${orchestrator.TAGS}`
          );
        } else {
          logger.info(
            `Updated license data for orchestrator: ${orchestrator.ORCHESTRATOR}, tenant_id: ${orchestrator.TENANT_ID}, tags: ${orchestrator.TAGS}`
          );
        }
        syncSummary.success++;
      } catch (error) {
        logger.error(
          `Failed to process orchestrator: ${orchestrator.ORCHESTRATOR}, tenant_id: ${orchestrator.TENANT_ID}, tags: ${orchestrator.TAGS}. Error: ${error.message}`
        );
        syncSummary.failed++;
        syncSummary.failedOrchestrators.push({
          orchestrator: orchestrator.ORCHESTRATOR,
          tenantId: orchestrator.TENANT_ID,
          tags: orchestrator.TAGS,
          error: error.message,
        });
      }
    }
    logger.info(`Orchestrator licenses updated successfully!`);
    logger.info(`Sync Summary => ${str(syncSummary)}`);
    res.status(ok).json({
      statusCode: ok,
      message: "Orchestrator licenses updated successfully!",
      summary: syncSummary,
    });
  } catch (error) {
    logger.error(error.message);
    return res.status(internalServerError).json({
      statusCode: internalServerError,
      message:
        error.message || "Unable to complete the call to process manager!",
    });
  }
};

/**
 * Middleware and controller to fetch orchestrator license data.
 *
 * Middleware:
 * - Validates the 'orchestrator' query parameter to ensure it is a non-empty string with a maximum length of 255 characters.
 * - Optionally validates the 'management' query parameter to ensure it is a string with a length between 2 and 255 characters.
 *
 * Controller:
 * - Checks for validation errors and returns a 422 Unprocessable Entity status if any are found.
 * - Extracts 'orchestrator' and 'management' from the request query.
 * - Logs the fetching process for the orchestrator and management.
 * - Constructs a where clause for querying the database.
 * - Queries the OrchestratorListForLicense model to fetch license data, including related OrchestratorLicenseDetails.
 * - Transforms the fetched data into a specific format.
 * - Returns the transformed data with a 200 OK status if successful.
 * - Handles errors, logging them and returning appropriate error responses.
 *
 * @param {Array} getOrchestratorLicenseData - Array containing validation middleware and the controller function.
 * @param {Function} getOrchestratorLicenseData[0] - Validation middleware for 'orchestrator' and 'management' query parameters.
 * @param {Function} getOrchestratorLicenseData[1] - Controller function to fetch and return orchestrator license data.
 * @returns {Promise<void>} - Returns a promise that resolves to void.
 */
const getOrchestratorLicenseData = [
  [
    query("orchestrator").trim(),
    check("orchestrator").isLength({ min: 1, max: 255 }),
    check("management").optional().isString().isLength({ min: 2, max: 255 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(unprocessableEntity).send({
        statusCode: unprocessableEntity,
        message: "Bad Request! Request validation Failed!.",
        errors: errors.array(),
      });
    }
    const { orchestrator, management } = req.query;
    logger.info(`Fetching license data for orchestrator: ${str(orchestrator)}`);
    const whereClause = { ORCHESTRATOR: orchestrator };
    if (management) {
      logger.info(`Fetching license data for management: ${str(management)}`);
      whereClause.MANAGEMENT = management;
    }
    try {
      const licenseData = await OrchestratorListForLicense.findAll({
        where: whereClause,
        include: [
          {
            model: OrchestratorLicenseDetails,
            as: "LICENSE_DETAILS",
            attributes: ["LICENSE_DATA", "LICENSE_COUNT", "updatedAt"],
          },
        ],
      });

      if (!licenseData || !licenseData.length) {
        throw new NotFoundError(
          `License data not found for orchestrator: ${orchestrator}!`
        );
      }
      const transformedLicenseData = licenseData.map((orch) => {
        const licenseDetails = orch.dataValues.LICENSE_DETAILS[0] || {};
        return {
          orchestrator: orch.dataValues.ORCHESTRATOR,
          tenantId: orch.dataValues.TENANT_ID,
          management: orch.dataValues.MANAGEMENT,
          licenseDetails: {
            licenses: licenseDetails.LICENSE_DATA || [],
            licenseCount: licenseDetails.LICENSE_COUNT || 0,
            updatedAt: licenseDetails.updatedAt || null,
          },
        };
      });
      res.status(ok).json({
        statusCode: ok,
        message: "License data fetched successfully!",
        data: transformedLicenseData,
      });
    } catch (error) {
      logger.error(error.message);
      let statusCode = internalServerError;
      let message = error.message;
      if (error instanceof NotFoundError) {
        statusCode = notFound;
      }
      logger.error(error.stack);
      return res.status(statusCode).json({
        statusCode,
        message:
          message ||
          "Unable to fetch the license data for selected orchestrator!",
        errors: [],
      });
    }
  },
];

const getVcoLicenseReportForFilebeat = async (req, res) => {
  try {
    // Define the where clause if needed, otherwise remove it
    const whereClause = {}; // Add conditions if necessary

    // Get the license details for all orchestrators
    const licenseData = await OrchestratorListForLicense.findAll({
      where: whereClause,
      include: [
        {
          model: OrchestratorLicenseDetails,
          as: "LICENSE_DETAILS",
          attributes: ["LICENSE_DATA", "LICENSE_COUNT", "updatedAt"],
        },
      ],
      attributes: ["ORCHESTRATOR", "TENANT_ID", "MANAGEMENT"],
    });

    if (!licenseData || !licenseData.length) {
      return res.status(ok).json([]);
    }

    // Transform the data into a linear JSON array of objects
    const transformedData = licenseData.flatMap((orchestrator) => {
      const { ORCHESTRATOR, TENANT_ID, MANAGEMENT, LICENSE_DETAILS } =
        orchestrator;

      return LICENSE_DETAILS.flatMap((licenseDetail) => {
        const { LICENSE_DATA } = licenseDetail;

        return LICENSE_DATA.map((license) => ({
          Orchestrator: ORCHESTRATOR,
          TenantId: TENANT_ID,
          Management: MANAGEMENT,
          State: license.state || "N/A",
          Postal: license.postal || "N/A",
          Country: license.country || "N/A",
          HaState: license.haState || "N/A",
          License: license.license || "N/A",
          Customer: license.customer || "N/A",
          EdgeName: license.edgeName || "N/A",
          EdgeState: license.edgeState || "N/A",
          LogicalId: license.logicalId || "N/A",
          LicenseBw: license.licenseBw || "N/A",
          CustomerId: license.customerId || null,
          LicenseType: license.licenseType || "N/A",
          ModelNumber: license.modelNumber || "N/A",
          AddressLine1: license.addressLine1 || "N/A",
          AddressLine2: license.addressLine2 || "N/A",
          SerialNumber: license.serialNumber || "N/A",
          LicenseRegion: license.licenseRegion || "N/A",
          ActivationDate: license.activationDate || "N/A",
          HaSerialNumber: license.haSerialNumber || "N/A",
          LicenseDuration: license.licenseDuration || null,
          SoftwareVersion: license.softwareVersion || "N/A",
          DefaultSwVersion: license.defaultSwVersion || "N/A",
        }));
      });
    });

    // Return the transformed data
    return res.status(ok).json(transformedData);
  } catch (error) {
    logger.error(`Error fetching VCO license report: ${error.message}`);
    return res.status(internalServerError).json({
      statusCode: internalServerError,
      message: "An error occurred while fetching the VCO license report.",
      error: error.message,
    });
  }
};


/**
 * Retrieves orchestrator license details.
 *
 * @param {Object} orchestrator - The orchestrator object.
 * @param {string} orchestrator.URL - The URL of the orchestrator.
 * @param {string} orchestrator.TENANT_ID - The tenant ID of the orchestrator.
 * @param {string} [orchestrator.TAGS] - Optional tags for the orchestrator.
 * @returns {Promise<Object>} The response object containing statusCode, message, and data.
 * @throws {Error} If an unhandled exception occurs.
 */
const getSiteDetailsInfoFromOrchestrator = async (orchestrator) => {
  try {
    if (!(orchestrator && orchestrator.URL)) {
      const message = "Orchestrator URL is missing!";
      logger.error(message);
      return { statusCode: notFound, message, data: null };
    }
    if (!(orchestrator && orchestrator.TENANT_ID)) {
      const message = "Orchestrator TENANT_ID is missing!";
      logger.error(message);
      return { statusCode: notFound, message, data: null };
    }
    // Prepare Crypt Body
    const cryptBody = {
      kdbx_name: "css-ra-velocloud",
      password: CONFIG.genReport.CRYPT_PASSWORD,
      tags: orchestrator.TAGS ? orchestrator.TAGS.split(",") : [],
      url: orchestrator.URL,
      tenantid: orchestrator.TENANT_ID,
    };

    // Prepare Crypt Request
    const cryptRequest = {
      method: "POST",
      url: `${CONFIG.cryptUrl}/v1/credentials/`,
      data: cryptBody,
      headers: {
        "Content-Type": "application/json",
        "X-Authorization": `Token ${CONFIG.genReport.CRYPT_TOKEN}`,
      },
      auth: {
        username: CONFIG.MECH_ID,
        password: CONFIG.MECH_ID_PASS,
      },
      proxy: false,
    };
    logger.info(`Crypt Request => ${str(cryptRequest)}`);
    // Call crypt to get secrets
    const cryptResponse = await axios(cryptRequest);
    if (cryptResponse.status !== ok) {
      const message =
        "Not able to retrieve credentials for the selected orchestrator!";
      logger.error(message);
      return {
        statusCode: cryptResponse.status || internalServerError,
        message,
        data: null,
      };
    }
    const [orchestratorDetails] = cryptResponse.data;
    // Prepare Report Request
    const reportRequest = {
      method: "post",
      url: `${CONFIG.veloRaUrl}/report/siteInfoDetail`,
      headers: {
        "Content-Type": "application/json",
        "X-Authorization": `Token ${CONFIG.genReport.CRYPT_TOKEN}`,
        "X-username": orchestratorDetails.username,
        "X-password": orchestratorDetails.password,
        "X-tenant-id": orchestrator.TENANT_ID,
        "X-url": orchestratorDetails.url,
      },
      auth: {
        username: CONFIG.MECH_ID,
        password: CONFIG.MECH_ID_PASS,
      },
      data: {
        devices: [],
        params: [],
      },
      proxy: false,
    };
    logger.info(`Site Info Request => ${str(reportRequest)}`);
    logger.info(`Fetching the site info detials for ${str(orchestratorDetails.url)}`);
    const reportResponse = await axios(reportRequest);
    if (reportResponse.status !== ok) {
      const message = `Error: ${reportResponse.status}: Not able to retrieve report for the selected orchestrator!`;
      logger.error(message);
      return {
        statusCode: reportResponse.status || internalServerError,
        message,
        data: null,
      };
    }
    logger.info("Site details fetched successfully!");
    // Transform the data
    const transformedData = transformSiteData(reportResponse.data.data);
    return {
      statusCode: reportResponse.status,
      message: "Site details fetched successfully!",
      data: transformedData,
    };
  } catch (error) {
    const message =
      error.message || "Unhandled exception occured, please contact support!";
    logger.error(message);
    return { statusCode: internalServerError, message, data: null };
  }
};

const saveSiteDetailsInfoIntoDB = async (req, res) => {
  try {
    const dataBody = req.body;
    for (const data of dataBody) {
      const orchestratorList = await OrchestratorList.findOne({
        where: {
          URL: { [Sequelize.Op.substring]: data.orchestratorUrl },
          TENANT_ID: data.tenantId,
        },
      });

      const customer = await Customers.findOne({
        where: { ID: data.customerId },
      });
      if (!orchestratorList) {
        throw new Error("Could not fetch orchestrator list with details!");
      }
      logger.info(`Orchestrator List => ${str(orchestratorList)}`);
      syncSummary = {
        totalOrchestrators: orchestratorList.length,
        success: 0,
        failed: 0,
        failedOrchestrators: [],
      };
      try {
        const siteInfoDetials =
          await getSiteDetailsInfoFromOrchestrator(orchestratorList);
        if (siteInfoDetials.statusCode !== ok) {
          throw new Error(siteInfoDetials.message);
        }
        // Use upsert to create or update the record
        const [sites, created] = await SiteInfo.upsert({
          SITE_DATA: siteInfoDetials.data,
          CUSTOMER_ID: customer.ID,
          ORCHESTRATOR_LIST_ID: orchestratorList.ID,
        });
        if (created) {
          logger.info(
            `Created new site data for orchestrator: ${orchestratorList.URL}, tenant_id: ${orchestratorList.TENANT_ID}, tags: ${orchestratorList.TAGS}`
          );
        } else {
          logger.info(
            `Updated site data for orchestrator: ${orchestratorList.URL}, tenant_id: ${orchestratorList.TENANT_ID}, tags: ${orchestratorList.TAGS}`
          );
        }
        syncSummary.success++;
      } catch (error) {
        logger.error(
          `Failed to process orchestrator: ${orchestratorList.URL}, tenant_id: ${orchestratorList.TENANT_ID}, tags: ${orchestratorList.TAGS}. Error: ${error.message}`
        );
        syncSummary.failed++;
        syncSummary.failedOrchestrators.push({
          orchestrator: orchestratorList.URL,
          tenantId: orchestratorList.TENANT_ID,
          tags: orchestratorList.TAGS,
          error: error.message,
        });
      }

      logger.info(`Orchestrator sites updated successfully!`);
      logger.info(`Sync Summary => ${str(syncSummary)}`);
    }
    res.status(ok).json({
      statusCode: ok,
      message: "Orchestrator sites updated",
    });
  } catch (error) {
    logger.error(error.message);
    return res.status(internalServerError).json({
      statusCode: internalServerError,
      message:
        error.message || "Unable to complete the call to process manager!",
    });
  }
};

const sendSiteDetailsInfo = async (req, res) => {
  try {
    // Define the where clause if needed, otherwise remove it
    const whereClause = {}; // Add conditions if necessary

    // Get the license details for all orchestrators
    const siteInfo = await SiteInfo.findAll({
      where: whereClause,
      include: [
        {
          model: Customers,
          as: "CUSTOMER",
          attributes: ["NAME"],
        },
        {
          model: OrchestratorList,
          as: "ORCHESTRATOR_LIST",
          attributes: ["URL", "TAGS"],
        },
      ],
      attributes: ["SITE_DATA"],
    });
    if (!siteInfo || !siteInfo.length) {
      return res.status(ok).json([]);
    }

    // Transform the data into a linear JSON array of objects
    const transformedData = siteInfo.flatMap((orchestrator) => {
      const { SITE_DATA } = orchestrator;

      return SITE_DATA.map((siteInfo) => ({
        tenantID: siteInfo.tenantID,
        name: siteInfo.name,
        edgeUUID: siteInfo.edgeUUID,
        edgeId: siteInfo.edgeId,
        state: siteInfo.state,
        postalCode: siteInfo.postalCode,
        country: siteInfo.country,
        streetAddress: siteInfo.streetAddress,
        streetAddress2: siteInfo.streetAddress2,
        isHub: siteInfo.isHub,
        haMode: siteInfo.haMode,
        deviceFamily: siteInfo.deviceFamily,
        modelNumber: siteInfo.modelNumber,
        profileName: siteInfo.profileName,
        customInfo: siteInfo.customInfo,
        description: siteInfo.description,
        platformFirmware: siteInfo.platformFirmware,
        license: siteInfo.license,
        softwareVersion: siteInfo.softwareVersion,
        factorySoftwareVersion: siteInfo.factorySoftwareVersion,
        serialNumber: siteInfo.serialNumber,
        haSerialNumber: siteInfo.haSerialNumber,
        status: siteInfo.status,
        activationTime: siteInfo.activationTime,
        activationKey: siteInfo.activationKey,
        activationState: siteInfo.activationState,
      }));
    });

    // Return the transformed data
    return res.status(ok).json(transformedData);
  } catch (error) {
    logger.error(`Error fetching VCO site report: ${error.message}`);
    return res.status(internalServerError).json({
      statusCode: internalServerError,
      message: "An error occurred while fetching the VCO site report.",
      error: error.message,
    });
  }
};

module.exports = {
  findOrchestrators,
  findReportUrl,
  generateSdwanReport,
  getUtilizationReport,
  generateUtilisationReport,
  provisionUsers,
  provisionEdges,
  syncOrchestratorLicenses,
  getOrchestratorLicenseData,
  getVcoLicenseReportForFilebeat,
  saveSiteDetailsInfoIntoDB,
  sendSiteDetailsInfo,
};
