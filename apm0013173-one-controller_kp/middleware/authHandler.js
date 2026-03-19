/* eslint-disable no-magic-numbers, max-len, max-lines-per-function, max-statements, consistent-return, new-cap */

const axios = require("axios");
const { HttpsProxyAgent } = require("https-proxy-agent");
const { aafAzureHost, proxyAttPxy,proxyAttSub, proxyCso } = require("../api/constants");
const { getLogger } = require("../utils/logging");
const { forbidden, internalServerError, unauthorized } = require("../api/statuses");
const { CONFIG } = require("../api/config/configuration");
const { oidc } = CONFIG;
const AUTH_REDIRECT = oidc.redirectOidc;
const proxyServer = process.env.http_proxy || proxyAttSub || proxyAttPxy || proxyCso;
const btoa = require("btoa");
const qs = require("qs");
const { v4: uuidv4 } = require("uuid");
const { SessionToken } = require("../api/models/sessionTokenModel");
const logger = require("../api/helpers/loggerHelper");
const { "stringify": str } = JSON;




/**
 * Returns Request Promise for User Permissions by using basic auth
 * @param username
 * @param password
 * @returns {Promise} Request promise for User Permissions
 *
 */
const getAafPermissions = (username, password) => {
  const config = {
    url: `https://${aafAzureHost}/authz/perms/user/${username}`,
    method: "get",
    auth: { username, password },
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    proxy: false,
    httpsAgent: new HttpsProxyAgent(proxyServer),
  };
  return axios(config);
};

const getSessionToken = async (sessionId) => {
  const sessionToken = await SessionToken.findOne({
    where: { SESSION_ID: sessionId },
  });
  let tokenObject;
  if (sessionToken && sessionToken["dataValues"]) {
    tokenObject = {
      sessionId: sessionToken["dataValues"]["SESSION_ID"],
      access_token: sessionToken["dataValues"]["ACCESS_TOKEN"],
      refresh_token: sessionToken["dataValues"]["REFRESH_TOKEN"],
      expireIn: new Date(sessionToken["dataValues"]["EXPIRE_IN"]),
    };
  }
  return tokenObject;
};

const createSessionToken = async (
  sessionId,
  access_token,
  refresh_token,
  expireIn
) => {
  
  const oneConnection = require('../api/models/databaseOne').Database.getInstance();
  
  logger.info(`Attempting to create session token for sessionId: ${str(sessionId)}`);
  logger.debug('Session token creation details:', {
    sessionId,
    expireIn,
    tokenLength: access_token?.length,
    refreshTokenLength: refresh_token?.length
  });

  try {
    const result = await oneConnection.transaction(async (t) => {
      const sessionToken = await SessionToken.create(
        {
          SESSION_ID: sessionId,
          ACCESS_TOKEN: access_token,
          REFRESH_TOKEN: refresh_token,
          EXPIRE_IN: expireIn,
        },
        { transaction: t }
      );
      
      logger.info(`Successfully created session token for sessionId: ${str(sessionId)}`);
      logger.debug('Created session token details:', {
        id: sessionToken.ID,
        sessionId: sessionToken.SESSION_ID,
        expireIn: sessionToken.EXPIRE_IN
      });
      
      return sessionToken;
    });
    return result;
  } catch (error) {
    logger.error('Failed to create session token:', {
      sessionId,
      error: error.message,
      stack: error.stack,
      sqlMessage: error.original?.sqlMessage,
      sqlState: error.original?.sqlState
    });
    throw error;
  }
};

const updateSessionToken = async (
  sessionId,
  access_token,
  refresh_token,
  expireIn
) => {
  const oneConnection = require('../api/models/databaseOne').Database.getInstance();
  
  logger.info(`Attempting to update session token for sessionId: ${str(sessionId)}`);
  logger.debug('Session token update details:', {
    sessionId,
    expireIn,
    tokenLength: access_token?.length,
    refreshTokenLength: refresh_token?.length
  });

  try {
    const result = await oneConnection.transaction(async (t) => {
      const [updatedRows] = await SessionToken.update(
        {
          ACCESS_TOKEN: access_token,
          REFRESH_TOKEN: refresh_token,
          EXPIRE_IN: expireIn,
        },
        {
          where: { SESSION_ID: sessionId },
          transaction: t
        }
      );
      
      if (updatedRows === 0) {
        logger.warn(`No session token found to update for sessionId: ${str(sessionId)}`);
      } else {
        logger.info(`Successfully updated session token for sessionId: ${str(sessionId)}`);
        logger.debug('Update affected rows:', updatedRows);
      }
      
      return updatedRows;
    });
    return result;
  } catch (error) {
    logger.error('Failed to update session token:', {
      sessionId,
      error: error.message,
      stack: error.stack,
      sqlMessage: error.original?.sqlMessage,
      sqlState: error.original?.sqlState
    });
    throw error;
  }
};

/**
 * To Check Auth
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
const auth = async (req, res, next) => {
  const logger = getLogger();
  
  // Log initial request variables
  const homeUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  const authHeader = req.headers.authorization;
  const { cookies } = req;
  const timeNow = new Date();
  const sessionId = cookies["sessionId"];
  let dbToken;
  let isTokenExpired;
  let isAuthenticated;

  logger.debug('Initial variables', {
    homeUrl,
    authHeader,
    cookies,
    timeNow,
    sessionId
  });

  // check if there is already token for given session id
  if (sessionId) {
    logger.debug('Attempting to retrieve session token', { sessionId });
    dbToken = await getSessionToken(sessionId);
    if (dbToken) {
      logger.debug('Found existing session token', { 
        sessionId,
        expireIn: dbToken.expireIn
      });
    } else {
      logger.debug('No session token found', { sessionId });
    }
  }

  // check if token is valid or expired and if is valid set authenticated value to true
  if (dbToken) {
    isTokenExpired = new Date(dbToken.expireIn) < timeNow;
    isAuthenticated = dbToken.access_token && !isTokenExpired;
    
    logger.debug('Token validation variables', {
      dbToken,
      isTokenExpired,
      isAuthenticated,
      tokenExpireIn: dbToken.expireIn
    });
  }
  
  //get status and code from query after auth redirect happened
  const state = req.query.state;
  const code = req.query.code;

  logger.debug('Auth callback variables', {
    state,
    code,
    cookieState: cookies.state
  });

  // Case 1: Valid session token exists
  if (isAuthenticated) {
    try {
      const requestConfig = {
        url: oidc.userInfo,
        method: "post",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${dbToken.access_token}`,
        },
        proxy: false,
        httpsAgent: new HttpsProxyAgent(proxyServer),
      };

      logger.debug('OIDC request config', { requestConfig });
      
      const userInfo = await axios(requestConfig);
      const [userId, email] = userInfo.data.preferred_username.split("@");
      
      logger.debug('User info response', {
        userInfoData: userInfo.data,
        userId,
        email
      });

      logger.info('User authenticated successfully', {
        userId,
        email,
        authenticationType: 'session_token'
      });

      req.user = userId;
      req.userEmail = email;
      return next();
    } catch (err) {
      logger.error('Failed to validate user info with OIDC provider', {
        error: err.message,
        stack: err.stack,
        status: err.status
      });
      return res.status(err.status || internalServerError).json({
        statusCode: err.status || internalServerError,
        message: err.message,
      });
    }
  } 
  // Case 2: Handle OIDC callback
  else if (!isAuthenticated && !authHeader && code && state == cookies.state) {
    logger.info('Processing OIDC callback', { 
      hasCode: !!code,
      hasState: !!state 
    });

    const oidcUserAuth = btoa(`${oidc.client_id}:${oidc.client_secret}`);
    
    logger.debug('OIDC auth variables', {
      oidcUserAuth,
      clientId: oidc.client_id
    });

    let token;
    try {
      let redirectUri = oidc.redirectUri;
      const urlsPath = {
        "/one": "/one",
        "/onetouch": "/onetouch",
        "/classicUi": "/classicUi",
      };
      
      for (url of Object.keys(urlsPath)) {
        const regex = new RegExp(url + "\\?.*");
        if (req.headers.referer.match(regex)) {
          redirectUri = redirectUri + urlsPath[url];
          logger.debug('Modified redirect URI', { redirectUri });
        }
      }

      // Token exchange
      logger.debug('Exchanging authorization code for tokens');
      const data = qs.stringify({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
      });

      const requestConfig = {
        url: oidc.token,
        method: "post",
        data: data,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${oidcUserAuth}`,
        },
        proxy: false,
        httpsAgent: new HttpsProxyAgent(proxyServer),
      };

      logger.debug('Token exchange request', {
        data,
        requestConfig,
        redirectUri
      });

      token = await axios(requestConfig);
      const expireIn = new Date();
      expireIn.setUTCSeconds(
        expireIn.getUTCSeconds() + token["data"]["expires_in"]
      );

      logger.debug('Token response', {
        tokenData: token.data,
        expireIn
      });

      // Store token in database
      if (!dbToken) {
        logger.info('Creating new session token', { sessionId });
        await createSessionToken(
          sessionId,
          token["data"]["access_token"],
          token["data"]["refresh_token"],
          expireIn.toUTCString()
        );
      } else {
        logger.info('Updating existing session token', { sessionId });
        await updateSessionToken(
          sessionId,
          token["data"]["access_token"],
          token["data"]["refresh_token"],
          expireIn.toUTCString()
        );
      }
    } catch (error) {
      logger.error('Failed to process OIDC callback', {
        error: error.message,
        stack: error.stack
      });
    }
  } 
  // Case 3: Basic auth header present
  else if (authHeader) {
    const authData = new Buffer.from(authHeader.split(" ")[1], "base64")
      .toString()
      .split(":");
    const [user, pass] = authData;
    
    logger.debug('Basic auth variables', {
      authData,
      user
      // Not logging password for security
    });

    if (user && pass) {
      try {
        logger.info('Attempting basic auth authentication', { user });
        const result = await getAafPermissions(user, pass);
        console.log(result);
        const hasAccess = result.data.perm.some(
          (access) => access.type === "com.att.bok.prod.access"
        );

        if (!hasAccess) {
          logger.warn('User lacks required permissions', {
            user,
            requiredPermission: "com.att.bok.prod.access"
          });
          const err = new Error("You are not allowed to access this resource!");
          err.status = forbidden;
          return res.status(err.status).json({
            statusCode: err.status,
            message: err.message,
          });
        }

        logger.info('Basic auth authentication successful', { user });
        const [userId] = user.split("@");
        req.user = userId;
        return next();
      } catch (err) {
        logger.error('Basic auth authentication failed', {
          user,
          error: err.message,
          statusCode: err.statusCode
        });
        return res.status(err.statusCode).json({
          statusCode: err.statusCode,
          message: err.message,
        });
      }
    } else {
      logger.warn('Invalid basic auth credentials provided');
      const err = new Error("You are not authenticated!");
      res.setHeader("WWW-Authenticate", "Basic");
      err.status = forbidden;
      return res.status(err.status).json({
        statusCode: err.status,
        message: err.message,
      });
    }
  }

  // Case 4: No valid authentication, redirect to login
  if (!authHeader && !isAuthenticated) {
    let redirectUrl = AUTH_REDIRECT;
    const urlsPath = {
      "/one/": "%2Fone%2F",
      "/onetouch/": "%2Fonetouch%2F",
      "/classicUi/": "%2FclassicUi%2F",
    };
    
    for (url of Object.keys(urlsPath)) {
      if (req.headers && req.headers.referer && req.headers.referer.match(url)) {
        redirectUrl = redirectUrl + urlsPath[url];
      }
    }
    
    const stateUiid = uuidv4();
    res.cookie("state", stateUiid);
    redirectUrl = redirectUrl + `&state=${stateUiid}`;
    
    logger.debug('Redirect variables', {
      redirectUrl,
      stateUiid,
      homeUrl
    });

    logger.info('Redirecting to authentication provider', {
      redirectUrl,
      state: stateUiid,
      originalPath: homeUrl
    });

    return res.status(unauthorized).json({
      src: "OIDC",
      redirectUrl: redirectUrl,
      state: stateUiid,
      path: homeUrl,
    });
  }
};

module.exports = { auth };

