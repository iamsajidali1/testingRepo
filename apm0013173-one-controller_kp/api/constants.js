/* eslint-disable no-magic-numbers */
module.exports = {
    "aafAzureHost": "aaf-azure.it.att.com",
    "aafCdpHost": "aaf.it.att.com",
    "actionScreen": "action",
    "allowedHeaders": [
        "xsrf-token",
        "Expires",
        "Pragma",
        "Cache-Control",
        "Content-Type",
        "one-type",
        "Access-Control-Allow-Origin",
        "Access-Control-Allow-Header",
        "Access-Control-Allow-Methods",
        "authorization",
    ],

    // Use uuidgen, so it's not guessable on the Internet
    "bcEnvProdExpress": "A08029E2-B8DD-4089-A997-60D32FED0AE4",
    "bcEnvProdOriginal":"303FEE11-EC8F-455F-8B1E-755C25724741",
    "bcEnvUat":  "7107ADE9-49F0-455C-B911-55939B610E67",

    /*
     * URLs for GD&A envs
     * Names of header/query for BC mw
     */
    "bcGdaHeaderName": "x-gda-to-css-session",
    "bcGdaProxyHostProdExpress": "expressportal.att.com",
    "bcGdaProxyHostProdOriginal": "fbc.web.att.com",
    "bcGdaProxyHostUat": "fbcaz.web.att.com",
    "bcGdaQueryParam": "sessionID",
    "bcOnboardingEmail": "dl-Self-Service_Onboarding@intl.att.com",
    // FE cookies for BC
    "bcSessionCookie": "bcSession",
    "bcTempCookie": "bcSessionTemp",
    // BizOps API Gateway URLs
    "bizApiGwProd": "apigw.web.att.com",

    "bodyLimit": "50mb",
    // TODO: whaaat??? why?
    "bodyParameterLimit": 50000,
    "camundaBaseUrl": "https://bok.dev.att.com/engine-rest",
    "camundaMdsInputEmails": "emails",
    "camundaMdsInputVcoHost": "vcoHostname",
    "camundaMdsInputVcoPass": "vcoPassword",
    "camundaMdsInputVcoProto": "vcoProtocol",
    "camundaMdsInputVcoUser": "vcoUsername",
    "camundaMdsOutputXlsx": "xlsx",
    "camundaMdsOutputFileName": "filename",
    "cookieReaderAllowedFor": ["sessionId", "bcSession", "transactionId"],
    /* eslint-disable-next-line no-useless-escape */
    "corsRegex": "/att\.com$/",
    "creator_request_type": "one",
    "credentials": true,
    "csrfTokenName": "xsrf-token",
    "csrfUseCookie": true,
    "dataCollection": "dataCredential",
    "deviceCisco": "CISCO",
    "deviceJuniper": "JUNIPER",
    "ebizCompanyId": "ebizCompanyId",
    "ebizUserId": "ebizUserId",
    "excelType":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "exposedHeaders": [
        "xsrf-token",
        "Access-Control-Request-Method",
        "Access-Control-Allow-Headers",
        "Content-Type",
        "Origin",
        "Accept"
    ],
    "expressPoweredHeader": "x-powered-by",
    // This should be something else according to the GL docs
    "globalLogonAppName": "usrp",
    "globalLogonHost": "https://www.e-access.att.com",
    "globalLogonPath": "empsvcs/hrpinmgt/pagLogin",
    "header_one_type": "one-type",
    "infinity": "999999999",
    "ispHost": "isp.web.att.com",
    "listenPort": 8000,
    "mdsEmailBody": "MDS configuration",
    "mdsFilename": "mds.xls",
    "methods": [
        "GET",
        "HEAD",
        "PUT",
        "PATCH",
        "POST",
        "DELETE",
        "OPTIONS"
    ],
    "one_level_admin": "ADMIN",
    "one_level_individual": "INDIVIDUAL",
    "one_level_le": "LE",
    "one_level_bvioip": "BVOIP Admin",
    "one_level_true_north": "True North",
    "one_type": "transaction",
    "paperplaneSender": "ONE - Open Network Experience",
    "preflightContinue": false,
    "proxyAttSub": "https://sub.proxy.att.com:8080",
    "proxyAttPxy": "https://pxyapp.proxy.att.com:8080",
    "proxyConexus": "http://proxy.conexus.svc.local:3128",
    "sessionCookie": "sessionId",
    "subject": "Self-Service Network Management",
    // TODO: pull email/s from DB and cache
    "supportEmail": "rm-sd_devops@intl.att.com",
    "lanMigrationSupport": "mbukvaj@intl.att.com",
    "timeMs": {
        "day": 24 * 60 * 60 * 1000,
        "hour": 60 * 60 * 1000,
        "minute": 60 * 1000,
        "month": 30 * 24 * 60 * 60 * 1000,
        "second": 1000,
        "year": 365 * 24 * 60 * 60 * 1000,
        "year360": 12 * 30 * 24 * 60 * 60 * 1000
    },
    "transaction_path": "/transaction/",
    "upmAppID": 145,
    "upmExcludePaths": [
        "/jobs/sr-reports",
        "/jobs/cache-devices",
        "/jobs/network-insights",
        "/jobs/orchestrator/vco/sync-licenses",
        "/orchestrator/vco/license",
        "/jobs/site-details",
        "/velo-suite/site-info/"
    ],
    "restApiId": "tv8985:ONE:Server:Rest:Api",
    "mcapUrlTask":"https://mcap.web.att.com/restapi/taskManagement",
    "mcapUrlData":"https://mcap.web.att.com/restapi/dataManagement"
};
