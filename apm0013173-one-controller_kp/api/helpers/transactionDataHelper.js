/* eslint-disable max-len, no-magic-numbers, id-length, consistent-return */

const { Templates } = require("../models/templatesDataModel");
const { McapCredential } = require("../models/mcapCredentialModel");
const { McapCredentialToServiceToCustomer } = require("../models/mcapCredentialToServiceToCustomerModel");

// Get validations commands for selected action template id
exports.getValidationCommands = async (actionId, validationData) => {
    const template = await Templates.findOne({
        "where": { "ID": actionId }
    });
    let validationCommands = [];
    if (template && template.dataValues) {
        validationCommands = template.dataValues.VALIDATION.toString();
        validationCommands = validationCommands.replace(/"/giu, "").split("\\n");
    }

    // Filtering failed validation commands
    let filteredValidation = validationCommands;
    if (validationData) {
        filteredValidation = validationCommands.filter(
            (validationCommand) => "failedValidation" in validationData && !validationData.failedValidation.includes(validationCommand)
        );
    }

    const result = [];

    for (const command of filteredValidation) {
        if (command.includes("<")) {
            const commandWithVariable = exports.replaceCommandVariable(command, validationData.data);
            result.push(commandWithVariable);
        } else {
            result.push(command);
        }
    }
    const validationAsString = result.join('\n');
    return validationAsString;
};

exports.replaceCommandVariable = (command, validationData) => {
    const toBeReplaced = [];
    let updatedCommand = command;
    const commandsSplit = command.split("<");
    for (let i = 1; i < commandsSplit.length; i += 1) {
        toBeReplaced.push(commandsSplit[i].split(">")[0]);
    }
    for (const toBeReplacedCommand of toBeReplaced) {
        const toBeReplacedComplete = `<${toBeReplacedCommand}>`;
        const replaceBy = validationData.find((data) => data.dataCollectionVariable.toLowerCase() ===
                toBeReplacedCommand.toLowerCase()).variable;
        updatedCommand = updatedCommand.replace(toBeReplacedComplete, replaceBy);
    }
    return updatedCommand;
};

// Get mcap credentials
exports.getMcapCredentials = async (serviceToCustomerId) => {
    const credentialId = await McapCredentialToServiceToCustomer.findOne({
        "where": {
            "SERVICE_TO_CUSTOMER_ID": serviceToCustomerId
        },
        "include": [
            {
                "required": true,
                "model": McapCredential
            }
        ]
    });
    if (credentialId && credentialId.McapCredential &&
        credentialId.McapCredential.dataValues) {
        return credentialId.McapCredential.dataValues.CREDENTIAL;
    }
    return null;
};

// Load carche template for action template by id
exports.getCarcheTemplateForActionTemplate = async (actionId) => {
    const template = await Templates.findOne(
        {
            "where": { "ID": actionId }
        }
    );
    if (template && template.dataValues) {
        const result = JSON.parse(
            template.dataValues.CARCHETEMPLATE
        );
        return result;
    }
    return null;
};

exports.updateTransactionData = (sessionId, data) => {
    const { TransactionData } = require("../models/transactionDataModel");
    const result = TransactionData.sequelize.transaction({ "autocommit": true }, async (t) => {
        const savedTransaction = await TransactionData.findOne({
            "where": {
                "SESSION_ID": sessionId,
                "IS_ACTIVE": true
            }
        }, { "transaction": t });
        if (!savedTransaction && !savedTransaction.ID) {
            return false;
        }

        const transactionData = await TransactionData.update({
            "IS_ACTIVE": false
        }, {
            "where": {
                "ID": savedTransaction.ID
            }
        }, { "transaction": t });
        if (!transactionData) {
            return false;
        }

        const newTransationData = await TransactionData.create({
            "DATA": data,
            "USER_ID": savedTransaction.USER_ID,
            "SESSION_ID": savedTransaction.SESSION_ID,
            "IS_ACTIVE": true
        }, { "transaction": t });

        return Boolean(newTransationData);
    });
    return result;
};

