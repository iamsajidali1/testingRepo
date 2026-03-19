const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();

const TransactionLogView = oneConnection.define('TransactionLogView', {
    ID: {
        type: Sequelize.INTEGER(11), 
        primaryKey: true
    },
    TRANSACTION_ID: {
        type: Sequelize.STRING(255)
    },
    SESSION_ID: {
        type: Sequelize.STRING(255)
    },
    CUSTOMER_ID: {
        type: Sequelize.INTEGER(11)
    },
    CUSTOMER_NAME: {
        type: Sequelize.STRING(150)
    },
    BC_CUSTOMER_ID: {
        type: Sequelize.STRING(150)
    },
    SERVICE_ID: {
        type: Sequelize.INTEGER(11)
    },
    SERVICE_NAME: {
        type: Sequelize.STRING(150)
    },
    SERVICETOCUSTOMER_ID: {
        type: Sequelize.INTEGER(11)
    },
    ACTION_ID: {
        type: Sequelize.INTEGER(11)
    },
    ACTION_NAME: {
        type: Sequelize.STRING(100)
    },
    HOSTNAME: {
        type: Sequelize.STRING(255)
    },
    DMS_SERVER: {
        type: Sequelize.STRING(255)
    },
    VENDOR_TYPE_ID: {
        type: Sequelize.INTEGER(11)
    },
    VENDOR_TYPE: {
        type: Sequelize.STRING(255)
    },
    CHANGE_TYPE_ID: {
        type: Sequelize.INTEGER(11)
    },
    CHANGE_TYPE: {
        type: Sequelize.STRING(150)
    },
    MCAP_CREDENTIAL_ID: {
        type: Sequelize.STRING(255)
    },
    STEP: {
        type: Sequelize.STRING(255)
    },
    STATUS: {
        type: Sequelize.STRING(255)
    },
    CONFIG_MCAP_ID: {
        type: Sequelize.STRING(255)
    },
    CONFIG_TEMPLATE_UUID: {
        type: Sequelize.STRING(255)
    },
    CONFIG_TEMPLATE_ID: {
        type: Sequelize.INTEGER(11)
    },
    CONFIG_TEMPLATE_NAME: {
        type: Sequelize.STRING(150)
    },
    REQUESTER: {
        type: Sequelize.STRING(150)
    },
    CREATE_DATE: {
        type: Sequelize.DATE
    },
    UPDATE_DATE: {
        type: Sequelize.DATE
    }
}, {
    tableName: 'CSS_TRANSACTION_LOGS_VIEW',
    freezeTableName: true,
    timestamps: false
});


module.exports = { TransactionLogView };