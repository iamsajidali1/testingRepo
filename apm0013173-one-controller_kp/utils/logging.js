const basicPino = require("pino");
const expressPino = require("express-pino-logger");

exports.getLoggerConfig = () => basicPino({ "prettyPrint": true });

/* eslint-disable-next-line no-inline-comments */
exports.getLogger = (/* Options */) => expressPino(
    { "logger": exports.getLoggerConfig() }
).logger;
