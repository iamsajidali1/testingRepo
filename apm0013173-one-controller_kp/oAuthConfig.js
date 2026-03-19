const { CONFIG } = require("./api/config/configuration");

const aadPassportConfig = {
    credentials: {
        tenantID: CONFIG.aadOauth.tenantID,
        clientID: CONFIG.aadOauth.clientID
    },
    metadata: {
        audience: "https://graph.microsoft.com",
        authority: "login.microsoftonline.com",
        discovery: ".well-known/openid-configuration",
        issuerAuthority: "sts.windows.net",
        version: "v2.0"
    },
    settings: {
        validateIssuer: true,
        passReqToCallback: true,
        loggingLevel: "info",
        loggingNoPII: true,
    }
}

module.exports = aadPassportConfig;