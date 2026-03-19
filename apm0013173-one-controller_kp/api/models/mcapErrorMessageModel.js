const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const McapErrorMessage = oneConnection.define('McapErrorMessage', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    },
    MESSAGE: Sequelize.TEXT()
}, {
    tableName: 'CSS_MCAP_ERROR_MESSAGES',
    freezeTableName: true,
    timestamps: false
});


module.exports = { McapErrorMessage };
