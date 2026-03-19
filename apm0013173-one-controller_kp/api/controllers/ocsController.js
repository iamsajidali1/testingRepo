const { CONFIG } = require("../config/configuration");
const ocsUrl = CONFIG.ocsQueryUrl;
const btoa = require("btoa");
const axios = require("axios");
const loggerPino = require("../helpers/loggerHelper");
const { ok } = require("../statuses");
const { proxyAttSub } = require("../constants");
const { HttpsProxyAgent } = require("https-proxy-agent");
const proxyServer = process.env.http_proxy || proxyAttSub;

exports.callOCSAPIasPromise = async (requestData) => {
  const auth = btoa(`${CONFIG.gduiAaf.user}:${CONFIG.gduiAaf.password}`);
  try {
    const config = {
      url: ocsUrl,
      method: 'POST',
      data: requestData,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      "proxy":false,
      "httpsAgent": new HttpsProxyAgent(proxyServer),
    }
    const response = await axios(config)
    if (response) {
      if (response.status <= 299 && response.status >= 200) {
        return {
          status: "OK",
          statusCode: ok,
          result: response.data,
        };
      }
      if (response.status > 299 && response.status < 599) {
        loggerPino.error(response.statusText);
        loggerPino.info("Whole response of ocs request");
        loggerPino.info(response);
        return {
          status: "Error",
          statusCode: response.status,
          statusText: response.statusText,
        };
      } else {
        loggerPino.error("Ocs response status error!");
        loggerPino.info("Whole response of ocs request");
        loggerPino.info(response);
        return {
          status: "Error",
          statusCode: 500,
          statusText: "Status error!",
        };
      }
    } else {
      loggerPino.error("Response from OCS is not provided!");
      loggerPino.info("Whole response of ocs request");
      loggerPino.info(response);
      return {
        status: "Error",
        statusCode: 500,
        statusText: "Response from OCS is not provided!",
      };
    }
  } catch (error) {
    loggerPino.error(error);
    throw "Call OCS is failed";
  }
};
