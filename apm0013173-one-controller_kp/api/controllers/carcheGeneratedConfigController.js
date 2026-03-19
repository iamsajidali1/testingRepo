const { CarcheGeneratedConfig } = require("../models/carcheGeneratedTemplate");
const oneConnection = require("../models/databaseOne").Database.getInstance();
const loggerPino = require("../helpers/loggerHelper");

exports.insertIntoCarcheTemplateTable = async function (data) {
    try {
        let response = await exports.insertIntoCarcheTemplateHelper(data);
        if (response) {
            return response;
        } else {
            loggerPino.error("carcheTempalte save export function");
            throw new Error("Error insertIntoCarcheTemplateTable");
        }
    } catch (err) {
        loggerPino.error("carcheTempalte save export function");
        loggerPino.error(err);
        throw new Error("Error insertIntoCarcheTemplateTable");
    }
};

exports.insertIntoCarcheTemplateHelper = async (data) => {
    let transaction = await oneConnection.transaction({ autocommit: true });

    try {
        let configObject = {
            TEMPLATE_FILE: data.templateFile,
            TEMPLATE_UUID: data.templateUUID,
            GENERATED_TEMPLATE: data.generatedTemplate,
            CARCHE_DATA: data.carcheData,
            SESSION_ID: data.sessionId
        };
        let carcheTemplateDB = await CarcheGeneratedConfig.create(configObject, {
            returning: true
        }, {
            transaction: transaction
        });
        if (!carcheTemplateDB) {
            loggerPino.error("carche temlate was not saved");
            throw new Error("Database error");
        }
        await transaction.commit();
        return carcheTemplateDB;

    } catch (err) {
        loggerPino.error(err);
        await transaction.rollback();
        throw new Error("Database error");
    }
}

// data should contain - user attuid, templateid and template uuid
exports.getTemplateByIds = async function (data) {
    try {
        let response = await exports.getTemplateByIdHelper(data);
        if (response) {
            return response;
        } else {
            return [];
        }
    } catch (err) {
        loggerPino.error(err);
        throw new Error("Database error");
    }

};

exports.getTemplateByIdHelper = async (data) => {
    let transaction = await oneConnection.transaction({ autocommit: true });
    try {
        let carcheTemplateDB = await CarcheGeneratedConfig.findOne({
            where: {
                TEMPLATE_UUID: data.templateUUID
            }
        }, {
            transaction: transaction
        });
        if (!carcheTemplateDB) {
            loggerPino.error("Unable to find carche template");
            throw new Error("Database error");
        }
        await transaction.commit();
        return carcheTemplateDB.dataValues;
    } catch (err) {
        loggerPino.error(err);
        await transaction.rollback();
        throw new Error("Database error");
    }
}
