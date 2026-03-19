const environments = ["dev", "test", "prod", "unittest"];
const fs = require("fs");
const {
    AAF_PASSWORD,
    AAF_USERNAME,
    ACTION_GPSID,
    ACTION_PASSWORD,
    ACTION_URL,
    ACTION_USERNAME,
    ACTION_DB_HOST,
    ACTION_DB_PORT,
    CARCHE_AUTHORIZATION,
    CARCHE_CONTENT_TYPE,
    CARCHE_URL,
    CSS_HOST,
    CSS_ENV,
    CSS_RA_UTILITIES_URL,
    CSS_RA_VELOCLOUD_TOKEN,
    GDUI_AAF_USERNAME,
    GDUI_AAF_PASSWORD,
    GPS_ORACLE_HOST,
    GPS_ORACLE_PASSWORD,
    GPS_ORACLE_PORT,
    GPS_ORACLE_SID,
    GPS_ORACLE_USERNAME,
    LEAM_MYSQL_HOST,
    LEAM_MYSQL_NAME,
    LEAM_MYSQL_PASSWORD,
    LEAM_MYSQL_PORT,
    LEAM_MYSQL_USERNAME,
    LMAC_MYSQL_HOST,
    LMAC_MYSQL_NAME,
    LMAC_MYSQL_PASSWORD,
    LMAC_MYSQL_PORT,
    LMAC_MYSQL_USERNAME,
    MCAP_PASSWORD,
    MDS_TOKEN,
    MDS_URL,
    NGNSD_LEAD_ATT_UID,
    OCS_URL,
    ORM_URL,
    CSS_RA_VELOCLOUD_URL,
    CRYPT_URL,
    ONE_MYSQL_HOST,
    ONE_MYSQL_NAME,
    ONE_MYSQL_PASSWORD,
    ONE_MYSQL_PORT,
    ONE_MYSQL_USERNAME,
    PAPERPLANE_TOKEN,
    PAPERPLANE_URL,
    SESSION_SECRET,
    VCO_AUTH,
    VCO_URL,
    VCO_VELOWRAPTOR,
    VCO_VERSION,
    VCO_USERS,
    VCO_EDGES,
    UPM,
    MCAP_SERVER_1,
    MCAP_SERVER_2,
    MCAP_SERVER_3,
    MCAP_SERVER_4,
    EDF_ORACLE_HOST,
    EDF_ORACLE_PASSWORD,
    EDF_ORACLE_PORT,
    EDF_ORACLE_SID,
    EDF_ORACLE_USERNAME,
    CRYPT_TOKEN,
    CRYPT_PASSWORD,
    CAMUNDA_ENGINE_URL,
    CAMUNDA_CSS_BACKEND_BASIC,
    ONE_OIDC_CLIENT_ID,
    ONE_OIDC_CLIENT_SECRET,
    ONE_OIDC_USER_INFO,
    ONE_OIDC_TOKEN,
    ONE_OIDC_REDIRECT_URI,
    ONE_OIDC_REDIRECT_OIDC,
    MS_AAD_OAUTH_TENANT_ID,
    MS_AAD_OAUTH_CLIENT_ID,
    SNOW_OAUTH_INSTANCE,
    SNOW_OAUTH_USERNAME,
    SNOW_OAUTH_PASSWORD,
    SNOW_OAUTH_CLIENT_ID,
    SNOW_OAUTH_CLIENT_SECRET,
    SNOW_OAUTH_SCOPE,
    EOC_USERNAME,
    EOC_PASSWORD,
    EOC_HOST,
    MCAP_USERNAME,
    MCAP_USERPWD
} = process.env;
if (!environments.includes(CSS_ENV)) {
  throw new Error(`Invalid CSS_ENV set in environment ${CSS_ENV}`);
}

let CONFIG = {
    "username": ONE_MYSQL_USERNAME,
    "password": ONE_MYSQL_PASSWORD,
    "database": ONE_MYSQL_NAME,
    "host": ONE_MYSQL_HOST,
    "port": Number(ONE_MYSQL_PORT || 3306),
    "dialect": "mysql",
    "seederStorage": "sequelize",
    "pool": { "max": 20, "min": 0, "acquire": 60000, "idle": 60000 },
    "actionJS": {
        "ACTION_USER": ACTION_USERNAME,
        "ACTION_PASSWD": ACTION_PASSWORD,
        "ACTION_URL": ACTION_URL,
        "GPSID": ACTION_GPSID
    },
    "actionDB": {
        "host": ACTION_DB_HOST,
        "port": ACTION_DB_PORT
    },
    "ngnsdOrgLeadAttUid": NGNSD_LEAD_ATT_UID,
    "mCapPassPhrase": MCAP_PASSWORD,
    "cssHost": CSS_HOST,
    "leamJS": {
        "host": LEAM_MYSQL_HOST,
        "port": Number(LEAM_MYSQL_PORT || 3306),
        "user": LEAM_MYSQL_USERNAME,
        "password": LEAM_MYSQL_PASSWORD,
        "database": LEAM_MYSQL_NAME
    },
    "lmacDB": {
        "host": LMAC_MYSQL_HOST,
        "port": Number(LMAC_MYSQL_PORT || 3306),
        "username": LMAC_MYSQL_USERNAME,
        "password": LMAC_MYSQL_PASSWORD,
        "database": LMAC_MYSQL_NAME
    },
    "vcoJS": {
        "VCO_URL": VCO_URL,
        "VCO_VERSION": VCO_VERSION,
        "VCO_AUTH": VCO_AUTH,
        "VELOWRAPTOR_URL": VCO_VELOWRAPTOR,
        "MSD_LINK": MDS_URL,
        "VCO_USERS": VCO_USERS,
        "VCO_EDGES": VCO_EDGES
    },
    "cArche": {
        "Content_Type": CARCHE_CONTENT_TYPE,
        "Authorization": CARCHE_AUTHORIZATION,
        "cArcheUrl": CARCHE_URL
    },
    "UPM": UPM,
    "MECH_ID": AAF_USERNAME,
    "MECH_ID_PASS": AAF_PASSWORD,
    "MDS_TOKEN": MDS_TOKEN,
    "PAPERPLANE_TOKEN": PAPERPLANE_TOKEN,
    "PAPERPLANE_URL": PAPERPLANE_URL,
    "genReport": {
        "TOKEN": CSS_RA_VELOCLOUD_TOKEN,
        "CRYPT_TOKEN": CRYPT_TOKEN,
        "CRYPT_PASSWORD": CRYPT_PASSWORD
    },
    "gpsConDetails": {
        "USER": GPS_ORACLE_USERNAME,
        "PASSWORD": GPS_ORACLE_PASSWORD,
        "HOST": GPS_ORACLE_HOST,
        "PORT": Number(GPS_ORACLE_PORT || 1524),
        "SID": GPS_ORACLE_SID
    },
    "edfConDetails": {
        "USER": EDF_ORACLE_USERNAME,
        "PASSWORD": EDF_ORACLE_PASSWORD,
        "HOST": EDF_ORACLE_HOST,
        "PORT": Number(EDF_ORACLE_PORT || 1521),
        "SID": EDF_ORACLE_SID
    },
    "ocsQueryUrl": OCS_URL,
    "ormUrl": ORM_URL,
    "veloRaUrl": CSS_RA_VELOCLOUD_URL,
    'cryptUrl': CRYPT_URL,
    "SESSION_SECRET": SESSION_SECRET,
    "mcapServer1": MCAP_SERVER_1,
    "mcapServer2": MCAP_SERVER_2,
    "mcapServer3": MCAP_SERVER_3,
    "mcapServer4": MCAP_SERVER_4,
    "camundaUrl": CAMUNDA_ENGINE_URL,
    "camundaBasicAuth": CAMUNDA_CSS_BACKEND_BASIC,
    "utilitiesUrl": CSS_RA_UTILITIES_URL,
    "oidc": {
        "client_id": ONE_OIDC_CLIENT_ID,
        "client_secret": ONE_OIDC_CLIENT_SECRET,
        "userInfo": ONE_OIDC_USER_INFO,
        "token": ONE_OIDC_TOKEN,
        "redirectUri": ONE_OIDC_REDIRECT_URI,
        "redirectOidc": ONE_OIDC_REDIRECT_OIDC
    },
    "aadOauth": {
        "tenantID": MS_AAD_OAUTH_TENANT_ID,
        "clientID": MS_AAD_OAUTH_CLIENT_ID
    },
    "snowOauth": {
        "instance": SNOW_OAUTH_INSTANCE,
        "username": SNOW_OAUTH_USERNAME,
        "password": SNOW_OAUTH_PASSWORD,
         "clientId": SNOW_OAUTH_CLIENT_ID,
        "clientSecret": SNOW_OAUTH_CLIENT_SECRET,
        "scope": SNOW_OAUTH_SCOPE
    },
    "eoc": {
      "username": EOC_USERNAME,
      "password": EOC_PASSWORD,
      "host": EOC_HOST
    },
    "gduiAaf": {
        "user": GDUI_AAF_USERNAME,
        "password": GDUI_AAF_PASSWORD
    },
    "mcapUsername": MCAP_USERNAME,
    "mcapUserpwd": MCAP_USERPWD
};



if (module.parent === null) {
    // Print config when running directly
    // Useful for "node configuration.js" in the container for quick check
    console.log(CONFIG);
}
if(process.env.CSS_ENV === "dev"){
    CONFIG = JSON.parse(
    fs.readFileSync(`${__dirname}/config.json`)
    )[process.env.CSS_ENV];
    }


module.exports = { CONFIG };