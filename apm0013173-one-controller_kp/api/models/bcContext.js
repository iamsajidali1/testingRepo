const { Sequelize } = require("sequelize");


exports.name = "BcContext";
exports.model = {
    "ID": {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    },

    /*
     * Must not be a FK because excluding/changing the session library will
     * destroy the data on CASCADE deleting or will cause issues when changing
     * table that holds the session IDs.
     */
    "SESSION": {
        "allowNull": false,
        "comment": "Hard value of express-session + connect-session-sequelize",
        "type": Sequelize.STRING(64)
    },
    "GDA_SESSION": {
        "allowNull": false,
        "comment": "sessionId set as query param when redirecting from BC",
        "type": Sequelize.STRING(64)
    },
    "USER_ID": {
        "allowNull": false,
        "comment": "ebizUserId from GD&A API that decrypts the BC context",
        "type": Sequelize.STRING(64)
    },
    "USER_EMAIL": {
        "allowNull": false,
        "comment": "ebizUserEmail from GD&A API that decrypts the BC context",
        "type": Sequelize.STRING(64)
    },
    "COMPANY_ID": {
        "allowNull": false,
        "comment": "ebizCompanyId from GD&A API that decrypts the BC context",
        "type": Sequelize.STRING(64)
    },
    "COMPANY_NAME": {
        "allowNull": false,
        "comment": "ebizCompanyName from GD&A API that decrypts the BC context",
        "type": Sequelize.STRING(64)
    },
    "ACTIVE": {
        "allowNull": false,
        "defaultValue": true,
        "type": Sequelize.BOOLEAN
    }
};

exports.opts = {
    "freezeTableName": true,
    "tableName": "CSS_BC_CONTEXT",
    "timestamps": false
};

exports.define = () => {
    const conn = require("../connections");
    const seq = conn.getSequelize();
    return seq.define(exports.name, exports.model, exports.opts);
};
