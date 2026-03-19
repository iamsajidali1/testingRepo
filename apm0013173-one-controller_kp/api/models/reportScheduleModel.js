const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();

const ReportSchedule = oneConnection.define('ReportSchedule', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    },
    NAME: {
        type: Sequelize.STRING(255),
        allowNull: false
    },
    ENDPOINT: {
        type: Sequelize.STRING(100),
        allowNull: false
    },
    DATA: {
        type: Sequelize.JSON,
    },
    SCHEDULE: {
        type: Sequelize.STRING(100),
        allowNull: false
    },
    SEND_TO: {
        type: Sequelize.STRING(255),
        allowNull: false
    },
    LAST_SENT_ON: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
    },
    CREATE_DATE: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
    },
    UPDATE_DATE: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        onUpdate: Sequelize.literal("CURRENT_TIMESTAMP")
    }
}, {
    tableName: 'CSS_REPORT_SCHEDULES',
    freezeTableName: true,
    timestamps: false
});


module.exports = { ReportSchedule };