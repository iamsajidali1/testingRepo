/* eslint-disable max-classes-per-file, no-magic-numbers, sort-keys */

const ax = require("axios");
const { check, body, validationResult } = require("express-validator");
const { CONFIG } = require("../config/configuration");
const {
    ok,
    created,
    internalServerError,
    notFound,
    unprocessableEntity,
    serviceUnavailable
} = require("../statuses");
const { getLogger } = require("../../utils/logging");
const { "stringify": str } = JSON;

class ResponseError extends Error {}
class NotFoundError extends Error {}

const getRbacList = async (query) => {
    const { ormUrl } = CONFIG;
    const log = getLogger();
    const queryString = new URLSearchParams(query).toString();
    const resp = await ax.get(`${ormUrl}/api/roletocomponent/?${queryString}`);
    const { data, status } = resp;

    if (status !== ok) {
        log.info(`Error in ORM response: ${str(data)}`);
        throw new ResponseError("Error in ORM response!");
    }

    if (!data || !data.results || data.results.length <= 0) {
        log.info(`Not found: ${str(data)}`);
        throw new NotFoundError("No access lists found!");
    }
    return data;
};

const addAccessToAcl = async (aclParams) => {
    const { accessType, component, role } = aclParams;
    const { ormUrl } = CONFIG;
    const log = getLogger();
    const resp = await ax.post(`${ormUrl}/api/roletocomponent/`, {
        accessType,
        component,
        role
    });
    const { data, status } = resp;

    if (status !== created) {
        log.info(`Error in ORM response: ${str(data)}`);
        throw new ResponseError("Error in ORM response!");
    }
    return data;
};

const updateAccessToAcl = async (aclParams) => {
    const { id, accessType, component, role } = aclParams;
    const { ormUrl } = CONFIG;
    const log = getLogger();
    const resp = await ax.put(`${ormUrl}/api/roletocomponent/${id}/`, {
        id,
        accessType,
        component,
        role
    });
    const { data, status } = resp;

    if (status !== ok) {
        log.info(`Error in ORM response: ${str(data)}`);
        throw new ResponseError("Error in ORM response!");
    }
    return data;
};

const getAccessList = async (req, res) => {
    const log = getLogger();
    try {
        const data = await getRbacList(req.query);
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
            "message": "Role based accesses can't be loaded!"
        });
    }
};

const updateAccessList = [
    [
        body("accessList").isArray({ "min": 1 }),
        check("accessList.*.id")
            .not()
            .isEmpty()
            .isNumeric()
            .optional({ "nullable": true })
            .trim(),
        check("accessList.*.role").not().isEmpty().isNumeric()
            .trim(),
        check("accessList.*.component").not().isEmpty().isString()
            .trim(),
        check("accessList.*.accessType").not().isEmpty().isString()
            .trim()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        const log = getLogger();
        if (!errors.isEmpty()) {
            return res.status(unprocessableEntity).json({ errors });
        }

        /*
         * Step 1: Create New ACL for Requests without ID
         * Step 2: Update the ACL for Existing IDs
         * Step 3: Get the Latest ACL and Return to the caller
         */
        try {
            const { accessList, componentKey } = req.body;
            // Step 1: get acl which does NOT have an existing id, and ADD them
            const newAccessList = accessList.filter((access) => !access.id);
            if (newAccessList && newAccessList.length) {
                await Promise.all(newAccessList.map(
                    (acl) => addAccessToAcl(acl)
                ));
            }
            // Step 2: get acl which does have an existing id, and UPDATE them
            const existingAccessList = accessList.filter((access) => access.id);
            if (existingAccessList && existingAccessList.length) {
                const promises = existingAccessList.map(
                    (acl) => updateAccessToAcl(acl)
                );
                await Promise.all(promises);
            }
            // Step 3: get the latest ACL and return to the caller
            const query = componentKey
                ? { "component__key": componentKey }
                : {};
            const data = await getRbacList(query);
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
                "message": "Access Control List can't be updated!"
            });
        }
    }
];

module.exports = { getAccessList, updateAccessList };
