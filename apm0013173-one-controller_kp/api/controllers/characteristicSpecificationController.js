const Ajv = require('ajv');
const ajv = new Ajv();
const lodash = require('lodash');

const { getLogger } = require("../../utils/logging");
const { Characteristic } = require("../models/characteristicModel");
const { CharacteristicSpecification } = require("../models/characteristicSpecificationModel");
const { badRequest, internalServerError, notFound, ok } = require("../statuses");

const characteristicPostSchema = {
    type: "object",
    properties: {
        name: { type: "string" },
        valueType: { type: "string" },
        "@type": { type: "string" },
        characteristicValueSpecification: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    value: { type: "string" }
                },
                required: ["value"],
                additionalProperties: false
            }
        }
    },
    required: ["name", "valueType", "@type"],
    additionalProperties: false
}

const mapCharacteristic = (char) => {
    return {
        id: char.ID,
        name: char.NAME,
        valueType: char.VALUE_TYPE,
        "@type": "CharacteristicSpecification",
        characteristicValueSpecification: (char.CharacteristicSpecifications ?? []).map(spec => {
            return {
                id: spec.ID,
                value: spec.VALUE,
                "@type": "StringCharacteristicValueSpecification"
            }
        })
    }
}

/**
 * Fetch Characteristic Specifications for a given Characteristic 
 * @param {*} req expecting a queryParam with 'name'
 * @param {*} res
 * @returns
 */
const getCharacteristicSpecifications = async (req, res) => {
    const log = getLogger();
    try {
        const { name } = req.query;
        let where = {};

        if (name) {
            where = { name };
        }

        const characteristics = await Characteristic.findAll({
            where,
            include: {
                model: CharacteristicSpecification,
                required: false
            }
        });

        if (!characteristics.length) {
            return res.status(notFound).send({
                "status": "Failure",
                "statusCode": notFound,
                "message": "Could not find a characteristic for that name"
            });
        }

        const results = characteristics.map(mapCharacteristic);

        return res.status(ok).json(results);
    } catch (err) {
        const { message } = err;
        log.error(message);
        return res.status(internalServerError).json({
            "message": "Internal server error while fetching characteristic specifications."
        });
    }
};

/**
 * Fetch Characteristic Specifications for a given Characteristic 
 * @param {*} req expecting a queryParam with 'name'
 * @param {*} res
 * @returns
 */
const getCharacteristicSpecification = async (req, res) => {
    const log = getLogger();
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(badRequest).send({
                status: "Failure",
                statusCode: badRequest,
                message: "Expecting a characteristic ID!"
            });
        }

        const characteristic = await Characteristic.findOne({
            where: {
                id
            },
            include: {
                model: CharacteristicSpecification,
                required: false
            }
        });

        if (!characteristic) {
            return res.status(notFound).send({
                "status": "Failure",
                "statusCode": notFound,
                "message": "Could not find a characteristic for that ID"
            });
        }

        const result = mapCharacteristic(characteristic);

        return res.status(ok).json(result);
    } catch (err) {
        const { message } = err;
        log.error(message);
        return res.status(internalServerError).json({
            "message": "Internal server error while fetching characteristic specifications."
        });
    }
};

/**
 * Create a new characteristic with corresponding specifications
 * @param {*} req
 * @param {*} res
 * @returns
 */
const createCharacteristic = async (req, res) => {
    const log = getLogger();
    try {
        const payload = lodash.pick(req.body, ["name", "valueType", "@type", "characteristicValueSpecification"]);
        const validate = ajv.compile(characteristicPostSchema);
        const valid = validate(payload);
        if (!valid) {
            return res.status(badRequest).send({
                status: "Failure",
                statusCode: badRequest,
                message: "Payload validation failed!",
                validationErrors: validate.errors
            });
        }

        const insertObject = {
            NAME: payload.name,
            VALUE_TYPE: payload.valueType,
            CharacteristicSpecifications: (payload.characteristicValueSpecification ?? []).map(spec => {
                return {
                    VALUE: spec.value
                }
            })
        };

        const result = await Characteristic.create(insertObject, {
            include: {
                model: CharacteristicSpecification,
                as: "CharacteristicSpecifications"
            }
        });

        const characteristic = await Characteristic.findOne({
            where: {
                id: result.ID
            },
            include: {
                model: CharacteristicSpecification,
                required: false
            }
        });

        return res.status(ok).json(mapCharacteristic(characteristic));

    } catch (err) {
        const { message } = err;
        log.error(message);

        return res.status(internalServerError).send({
            "status": "Failure",
            "statusCode": internalServerError,
            "message": err.message
        });
    }
};

/**
 * Update value for characteristic specification
 * @param {*} req
 * @param {*} res
 * @returns
 */
const patchCharacteristicSpecification = async (req, res) => {
    const log = getLogger();
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(badRequest).send({
                status: "Failure",
                statusCode: badRequest,
                message: "Expecting a characteristic specification ID!"
            });
        }

        const { value } = req.body;
        if (lodash.isNil(value)) {
            return res.status(badRequest).send({
                status: "Failure",
                statusCode: badRequest,
                message: "Expecting a characteristic specification value!"
            });
        }

        const spec = await CharacteristicSpecification.findOne({
            where: {
                id
            }
        });

        if (!spec) {
            return res.status(notFound).send({
                "status": "Failure",
                "statusCode": notFound,
                "message": "Could not find a characteristic specification for that ID"
            });
        }

        const r = await CharacteristicSpecification.update({
            VALUE: value
        }, {
            where: {
                ID: spec.ID
            }
        });

        const characteristic = await Characteristic.findOne({
            where: {
                id: spec.CHARACTERISTIC_ID
            },
            include: {
                model: CharacteristicSpecification,
                required: false
            }
        });

        return res.status(ok).json(mapCharacteristic(characteristic));

    } catch (err) {
        const { message } = err;
        log.error(message);

        return res.status(internalServerError).send({
            "status": "Failure",
            "statusCode": internalServerError,
            "message": err.message
        });
    }
};



module.exports = {
    getCharacteristicSpecifications,
    getCharacteristicSpecification,
    createCharacteristic,
    patchCharacteristicSpecification
}