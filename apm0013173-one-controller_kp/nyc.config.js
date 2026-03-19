module.exports = {
    "all": true,
    "exclude": [
        ".git",
        "nyc.config.js", ".eslintrc.js", "test/*", "api/seeders",
        "api/migrations", "api/models",

        // just imports, nothing to test
        "api/helpers/loggerHelper.js",
        "ecosystem.config.js",

        // should be deleted from repo because the code
        // is commented out or does nothing
        "api/routes/routes.js"
    ],
    "check-coverage": true,
    "statements": 83.00,
    "branches": 76.00,
    "functions": 83.00,
    "lines": 84.00
};
