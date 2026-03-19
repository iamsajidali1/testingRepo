const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const DataTemplate = oneConnection.define('DataTemplate', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    },
    ACTION_ID: {
        type: Sequelize.INTEGER(11),
        allowNull: false,
    },
    CUSTOMER_ID: {
        type: Sequelize.INTEGER(11),
        allowNull: true,
    },
    SERVICE_ID: {
        type: Sequelize.INTEGER(11),
        allowNull: true,
    },
    NAME: {
        type: Sequelize.STRING(255),
        allowNull: false,
    },
    DATA: {
        type: Sequelize.JSON,
        allowNull: false,
    },
    ACTIVE: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
}, {
    tableName: 'CSS_DATA_TEMPLATES',
    freezeTableName: true,
    timestamps: true,
});


module.exports = { DataTemplate };
