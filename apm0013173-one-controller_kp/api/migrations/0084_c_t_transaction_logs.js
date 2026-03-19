/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.createTable("CSS_TRANSACTION_LOGS", {
        "ID": {
            "type": Sequelize.INTEGER(11),
            "primaryKey": true,
            "unique": true,
            "allowNull": false,
            "autoIncrement": true
        },
        "SESSION_ID": {
            "type": Sequelize.STRING(100),
            "allowNull": false
        },
        "TRANSACTION_ID": {
            "type": Sequelize.STRING(100)
        },
        "CUSTOMER_ID": {
            "type": Sequelize.INTEGER(11),
            "references": {
                "model": "CSS_CUSTOMERS",
                "key": "ID"
            },
            "onUpdate": "CASCADE",
            "onDelete": "SET NULL"
        },
        "SERVICE_ID": {
            "type": Sequelize.INTEGER(11),
            "references": {
                "model": "CSS_SERVICES",
                "key": "ID"
            },
            "onUpdate": "CASCADE",
            "onDelete": "SET NULL"
        },
        "SERVICE_TO_CUSTOMER_ID": {
            "type": Sequelize.INTEGER(11),
            "references": {
                "model": "CSS_SERVICE_TO_CUSTOMER",
                "key": "ID"
            },
            "onUpdate": "CASCADE",
            "onDelete": "SET NULL"
        },
        "ACTION_ID": {
            "type": Sequelize.INTEGER(11),
            "references": {
                "model": "CSS_TEMPLATES",
                "key": "ID"
            },
            "onUpdate": "CASCADE",
            "onDelete": "SET NULL"
        },
        "HOSTNAME": {
            "type": Sequelize.STRING(100)
        },
        "VCO_DETAILS": {
            "type": Sequelize.JSON()
        },
        "DMS_SERVER": {
            "type": Sequelize.STRING(100)
        },
        "VENDOR_TYPE_ID": {
            "type": Sequelize.INTEGER(11),
            "references": {
                "model": "CSS_CONF_TEMPLATE_VENDOR_TYPES",
                "key": "ID"
            },
            "onUpdate": "CASCADE",
            "onDelete": "SET NULL"
        },
        "CHANGE_TYPE_ID": {
            "type": Sequelize.INTEGER(11),
            "references": {
                "model": "CSS_WORKFLOW_TO_TEMPLATE",
                "key": "ID"
            },
            "onUpdate": "CASCADE",
            "onDelete": "SET NULL"
        },
        "MCAP_CREDENTIAL_ID": {
            "type": Sequelize.STRING(100)
        },
        "STEP": {
            "type": Sequelize.STRING(100)
        },
        "STATUS": {
            "type": Sequelize.STRING(100)
        },
        "CONFIG_MCAP_ID": {
            "type": Sequelize.STRING(100)
        },
        "CONFIG_TEMPLATE_UUID": {
            "type": Sequelize.STRING(255)
        },
        "REQUESTER": {
            "type": Sequelize.STRING(100)
        },
        "CREATE_DATE": {
            "type": Sequelize.DATE,
            "allowNull": false,
            "defaultValue": Sequelize.literal("CURRENT_TIMESTAMP")
        },
        "UPDATE_DATE": {
            "type": Sequelize.DATE,
            "allowNull": false,
            "defaultValue": Sequelize.literal("CURRENT_TIMESTAMP"),
            "onUpdate": Sequelize.literal("CURRENT_TIMESTAMP")
        }
    });
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.dropTable("CSS_TRANSACTION_LOGS");
}

module.exports = { up, down };
