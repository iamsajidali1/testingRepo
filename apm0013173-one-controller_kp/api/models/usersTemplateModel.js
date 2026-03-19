const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();



const UsersTemplate = oneConnection.define('UsersTemplate', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    }

}, {
    tableName: 'CSS_USER_TO_TEMPLATE',
    freezeTableName: true,
    timestamps: false,
});


module.exports = { UsersTemplate };
