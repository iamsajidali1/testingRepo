/* eslint-disable max-classes-per-file, no-magic-numbers */

const ax = require("axios");
const { CONFIG } = require("../config/configuration");
const {
    ok,
    internalServerError,
    notFound,
    serviceUnavailable
} = require("../statuses");
const { getLogger } = require("../../utils/logging");
const { "stringify": str } = JSON;

class ResponseError extends Error {}
class NotFoundError extends Error {}

const makeTreesFromNodes = (nodes) => {
    // Find Parent Child Map
    const parentChildMap = nodes.map((node) => {
        const childKey = node.key;
        const levelArray = childKey.split("-");
        levelArray.pop();
        const parentKey = levelArray.join("-") || null;
        return { ...node, parentKey };
    });

    // Find the Id to Array Index Mapping
    const idToIndexHash = parentChildMap.reduce((acc, el, index) => {
        acc[el.key] = index;
        return acc;
    }, {});

    // Creating the Tree
    const trees = [];
    parentChildMap.forEach((el) => {
    // Handle the root element
        if (el.parentKey === null) {
            trees[el.key] = el;
            return;
        }

        /*
         * Use our mapping to locate the parent element
         * in our parentChildMap array
         */
        const parentEl = parentChildMap[idToIndexHash[el.parentKey]];
        // Add our current element to it's parent's `children` array
        parentEl.children = [...parentEl.children || [], el];
    });
    return trees;
};

const getAppComponents = async (req, res) => {
    const log = getLogger();
    const queryString = new URLSearchParams(req.query).toString();
    try {
        const { ormUrl } = CONFIG;
        const resp = await ax.get(
            `${ormUrl}/api/components/?${queryString}`
        );
        const { data, status } = resp;

        if (status !== ok) {
            log.info(`Error in ORM response: ${str(data)}`);
            throw new ResponseError("Error in ORM response!");
        }

        if (!data || !data.results || data.results.length <= 0) {
            log.info(`Not found: ${str(data)}`);
            throw new NotFoundError("No components found!");
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
            "message": "Components can't be loaded!"
        });
    }
};

const getAppComponentsTree = async (req, res) => {
    const log = getLogger();
    const queryString = new URLSearchParams(req.query).toString();
    try {
        const { ormUrl } = CONFIG;
        const resp = await ax.get(
            `${ormUrl}/api/components/?${queryString}`
        );
        const { data, status } = resp;

        if (status !== ok) {
            log.info(`Error in ORM response: ${str(data)}`);
            throw new ResponseError("Error in ORM response!");
        }

        if (!data || !data.results || data.results.length <= 0) {
            log.info(`Not found: ${str(data)}`);
            throw new NotFoundError("No components found!");
        }
        // Make the Trees
        const trees = makeTreesFromNodes(data.results);
        return res.status(ok).json(trees);
    } catch (err) {
        const { message } = err;
        log.error(message);
        if (err instanceof ResponseError) {
            return res.status(internalServerError).json({ message });
        } else if (err instanceof NotFoundError) {
            return res.status(notFound).json({ message });
        }
        return res.status(serviceUnavailable).json({
            "message": "Components can't be loaded!"
        });
    }
};

module.exports = { getAppComponents, getAppComponentsTree };
