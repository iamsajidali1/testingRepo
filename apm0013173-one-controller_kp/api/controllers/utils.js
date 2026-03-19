const { cookieReaderAllowedFor, csrfTokenName } = require("../constants");


exports.apiHeadersCookies = (req, res) => {
    exports.createCsrfHeader(req, res);
    return res.json({
        "cookies": req.cookies,
        "headers": req.headers
    });
};

exports.createCsrfHeader = (req, res) => {
    res.header(csrfTokenName, req.csrfToken());
};

exports.handleCsrfValue = (req) => req.headers[csrfTokenName];

exports.readCookie = (cookieName) => {
    return (req, res) => res.send((req.cookies || {})[cookieName]);
};

exports.cookieReader = (cookieName) => {
    if (!cookieReaderAllowedFor.includes(cookieName)) {
        throw new Error(`Cookie ${cookieName} not allowed in here`);
    }

    return exports.readCookie(cookieName);
};
