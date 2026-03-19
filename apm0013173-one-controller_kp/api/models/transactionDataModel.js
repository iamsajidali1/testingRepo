const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const TransactionData = oneConnection.define('TransactionData', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    },
    DATA: {
        type: Sequelize.JSON()
    },
    USER_ID: Sequelize.STRING(64),
    ROUTE: Sequelize.STRING(120),
    SESSION_ID: Sequelize.STRING(255),
    IS_ACTIVE: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'CSS_TRANSACTION',
    freezeTableName: true,
    timestamps: true
});


module.exports = { TransactionData };
