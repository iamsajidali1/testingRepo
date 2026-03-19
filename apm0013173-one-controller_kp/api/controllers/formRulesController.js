const Ajv = require('ajv');
const ajv = new Ajv();
const lodash = require('lodash');

const { FormRule } = require("../models/formRuleModel");
const { badRequest, internalServerError, ok, notFound } = require("../statuses");
const { getLogger } = require("../../utils/logging");
const { Templates } = require("../models/templatesDataModel");
const { Sequelize } = require('sequelize');

const formRulePayloadSchema = {
    type: "object",
    properties: {
        sequence: { type: "integer" },
        template_id: { type: "integer" },
        when_conditions: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    source_key: { type: "string" },
                    condition: { type: "string" },
                    value: { type: "string" },
                    operation: { enum: ["OR", "AND"] }
                },
                additionalProperties: false,
                required: ["source_key", "condition", "value"]
            },
            minItems: 1
        },
        then_conditions: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    target_key: { type: "string" },
                    action: { type: "string" },
                    target_value: { type: "string" },
                },
                additionalProperties: false,
                required: ["target_key", "action", "target_value"]
            },
            minItems: 1
        }
    },
    required: ["when_conditions", "then_conditions", "template_id"],
    additionalProperties: false
};

/**
 * Fetch Form Rules for a specific template ID
 * @param {*} req expecting a queryParam with 'templateId'
 * @param {*} res
 * @returns
 */
const getFormRules = async (req, res) => {
    const log = getLogger();
    try {
        const { template_id } = req.query;
        if (!template_id) {
            return res.status(badRequest).send({
                status: "Failure",
                statusCode: badRequest,
                message: "Expecting template_id query parameter"
            });
        }

        const rules = await FormRule.findAll({
            where: {
                TEMPLATE_ID: template_id
            },
            include: {
                model: Templates,
                as: "TEMPLATE"
            },
            order: [["sequence", "ASC"]]
        });

        return res.status(ok).json(rules);
    } catch (err) {
        const { message } = err;
        log.error(message);
        return res.status(internalServerError).json({
            message: "Internal Server Error while fetching Form Rules"
        });
    }
};

const validateFormRulePayload = (payload, partial) => {

    let schema = { ...formRulePayloadSchema };
    if (partial) {
        schema.required = [];
        schema.minProperties = 1;
    }

    const validate = ajv.compile(schema)

    const valid = validate(payload);
    if (!valid) {
        return {
            valid: false,
            errors: validate.errors
        }
    }

    return {
        valid: true
    }
}

/**
 * Create a form rule
 * @param {*} req
 * @param {*} res
 * @returns
 */
const createFormRule = async (req, res) => {
    const log = getLogger();
    try {
        const payload = lodash.pick(req.body, ["sequence", "when_conditions", "then_conditions", "template_id"]);

        const validation = validateFormRulePayload(payload, false);
        if (!validation.valid) {
            return res.status(badRequest).send({
                status: "Failure",
                statusCode: badRequest,
                message: "Payload validation failed",
                validationErrors: validation.errors
            });
        }

        let sequence = payload.sequence;

        if (!sequence) {
            const max = await FormRule.findOne({
                attributes: [[Sequelize.fn('MAX', Sequelize.col('SEQUENCE')), 'maxSequence']],
                where: {
                    template_id: payload.template_id
                }
            });

            sequence = (max.get('maxSequence') ?? 0) + 1;
        }

        await FormRule.create({
            SEQUENCE: sequence,
            WHEN_CONDITIONS: payload.when_conditions,
            THEN_CONDITIONS: payload.then_conditions,
            TEMPLATE_ID: payload.template_id
        });

        return res.status(ok).json({
            message: "Form rule created"
        });
    } catch (err) {
        const { message } = err;
        log.error(message);
        return res.status(internalServerError).json({
            message: "Internal Server Error while creating Form Rule"
        });
    }
};

/**
 * Change form rule sequence
 * @param {*} req
 * @param {*} res
 * @returns
 */

const incrementFormRuleSequence = async (req, res) => {
    const log = getLogger();
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(badRequest).send({
                status: "Failure",
                statusCode: badRequest,
                message: "Expecting id route parameter"
            });
        }

        const increment = Boolean(req.body.increment);

        const formRule = await FormRule.findOne({ where: { ID: id } });
        if (!formRule) {
            return res.status(notFound).send({
                status: "Failure",
                statusCode: notFound,
                message: "Form rule not found",
            });
        }

        const oldSequence = formRule.SEQUENCE;
        const newSequence = oldSequence + (increment ? 1 : -1);

        await FormRule.update({
            SEQUENCE: oldSequence,
        }, {
            where: {
                SEQUENCE: newSequence,
                TEMPLATE_ID: formRule.TEMPLATE_ID
            }
        });

        await FormRule.update({
            SEQUENCE: newSequence
        }, {
            where: {
                ID: formRule.ID
            }
        });

        return res.status(ok).json({
            message: "Form rule sequence updated"
        });
    } catch (err) {
        const { message } = err;
        log.error(message);
        return res.status(internalServerError).json({
            message: "Internal Server Error while updating form rule sequence"
        });
    }
};

/**
 * Create a form rule
 * @param {*} req
 * @param {*} res
 * @returns
 */
const updateFormRule = async (req, res) => {
    const log = getLogger();
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(badRequest).send({
                status: "Failure",
                statusCode: badRequest,
                message: "Expecting id route parameter"
            });
        }

        const payload = lodash.pick(req.body, ["sequence", "when_conditions", "then_conditions", "template_id"]);

        const validation = validateFormRulePayload(payload, true);
        if (!validation.valid) {
            return res.status(badRequest).send({
                status: "Failure",
                statusCode: badRequest,
                message: "Payload validation failed",
                validationErrors: validation.errors
            });
        }

        const formRule = await FormRule.findOne({ where: { ID: id } });
        if (!formRule) {
            return res.status(notFound).send({
                status: "Failure",
                statusCode: notFound,
                message: "Form rule not found",
            });
        }

        await FormRule.update({
            SEQUENCE: payload.sequence,
            WHEN_CONDITIONS: payload.when_conditions,
            THEN_CONDITIONS: payload.then_conditions,
            TEMPLATE_ID: payload.template_id
        }, {
            where: {
                ID: id
            }
        });

        return res.status(ok).json({
            message: "Form rule updated"
        });
    } catch (err) {
        const { message } = err;
        log.error(message);
        return res.status(internalServerError).json({
            message: "Internal Server Error while updating Form Rule"
        });
    }
};

/**
 * Deletes a form rule
 * @param {*} req
 * @param {*} res
 * @returns
 */
const deleteFormRule = async (req, res) => {
    const log = getLogger();
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(badRequest).send({
                status: "Failure",
                statusCode: badRequest,
                message: "Expecting id route parameter"
            });
        }

        const formRule = await FormRule.findOne({ where: { ID: id } });
        if (!formRule) {
            return res.status(notFound).send({
                status: "Failure",
                statusCode: notFound,
                message: "Form rule not found",
            });
        }

        await FormRule.destroy({
            where: {
                ID: id
            }
        });

        return res.status(ok).json({
            message: "Form rule deleted"
        });
    } catch (err) {
        const { message } = err;
        log.error(message);
        return res.status(internalServerError).json({
            message: "Internal Server Error while deleting Form Rule"
        });
    }
};

module.exports = {
    getFormRules,
    createFormRule,
    updateFormRule,
    deleteFormRule,
    incrementFormRuleSequence,
}