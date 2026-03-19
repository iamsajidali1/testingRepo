const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();



const RoleTemplates = oneConnection.define('RoleTemplates', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    }

}, {
    tableName: 'CSS_ROLE_TO_TEMPLATE',
    freezeTableName: true,
    timestamps: false,
});


module.exports = { RoleTemplates };
