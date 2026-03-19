/* eslint-disable max-classes-per-file, no-magic-numbers */

const { check, validationResult, query } = require("express-validator");
const ax = require("axios");
const { CONFIG } = require("../config/configuration");
const {
    ok,
    notFound,
    internalServerError,
    unprocessableEntity,
    serviceUnavailable
} = require("../statuses");
const { getLogger } = require("../../utils/logging");
const { "stringify": str } = JSON;

class ResponseError extends Error {}
class NotFoundError extends Error {}

exports.getTransactionLogs = [
    [
        query("offset").trim(),
        check("offset").isInt({ "min": 0 }),
        query("limit").trim(),
        check("limit").isInt({ "min": 0 })
    ],
    async (req, res) => {
        const errors = validationResult(req);
        const log = getLogger();
        if (!errors.isEmpty()) {
            return res.status(unprocessableEntity).json({ errors });
        }
        const queryString = new URLSearchParams(req.query).toString();
        try {
            const { ormUrl } = CONFIG;
            const resp = await ax.get(
                `${ormUrl}/api/transactionlogsview/?${queryString}`
            );
            const { data, status } = resp;

            if (status !== ok) {
                log.info(`Error in ORM response: ${str(data)}`);
                throw new ResponseError("Error in ORM response!");
            }

            if (!data || !data.results || data.results.length <= 0) {
                log.info(`Not found: ${str(data)}`);
                throw new NotFoundError("No transaction logs found!");
            }

            return res.status(ok).json(data);
        } catch (err) {
            const { message } = err;
            log.error(message);
            if (err instanceof ResponseError) {
                return res.status(internalServerError).json({ message });
            } else if (err instanceof NotFoundError) {
                return res.status(notFound).json({ message });
            }
            return res.status(serviceUnavailable).json({
                "message": "Transaction logs can't be loaded!"
            });
        }
    }
];
