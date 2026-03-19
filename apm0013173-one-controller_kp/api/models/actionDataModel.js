const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const ActionData = oneConnection.define('ActionData', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    },
    ACTION_DATA_CUS_ID: {
        type: Sequelize.STRING(255)
    },
    ACTION_DATA_CUS_NAME: {
        type: Sequelize.STRING(255)
    }
}, {
    tableName: 'CSS_ACTION_DATA_CUSTOMERS',
    freezeTableName: true,
    timestamps: false,
});


module.exports = { ActionData };
