'use strict';

const TABLE = "CSS_BC_CONTEXT";
exports.up = (queryInterface, Sequelize) => {
    const model = {
        "ID": {
            type: Sequelize.INTEGER(11),
            primaryKey: true,
            unique: true,
            allowNull: false,
            autoIncrement: true
        },
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
    return queryInterface.createTable(TABLE, model);
};

exports.down = (queryInterface, Sequelize) => queryInterface.dropTable(TABLE);
