const Sequelize = require('sequelize');
const oneConnection = require("./databaseOne").Database.getInstance();

const SrReportsView = oneConnection.define('SrReportsView', {
    ID: {
        type: Sequelize.INTEGER(11), 
        primaryKey: true
    },
    TRANSACTION_ID: {
        type: Sequelize.STRING(255)
    },
    CUSTOMER_ID: {
        type: Sequelize.INTEGER(11)
    },
    CUSTOMER_NAME: {
        type: Sequelize.STRING(250)
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
    WORKFLOW_ID: {
        type: Sequelize.INTEGER(11)
    },
    CHANGE_TYPE_ID: {
        type: Sequelize.INTEGER(11)
    },
    CHANGE_TYPE: {
        type: Sequelize.STRING(150)
    },
    STATUS: {
        type: Sequelize.STRING(255)
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
    tableName: 'CSS_SR_REPORTS_VIEW',
    freezeTableName: true,
    timestamps: false
});


module.exports = { SrReportsView };