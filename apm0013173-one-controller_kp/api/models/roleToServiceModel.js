const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();



const RoleToService = oneConnection.define('RoleToService', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    }

}, {
    tableName: 'CSS_ROLE_TO_SERVICE',
    freezeTableName: true,
    timestamps: false,
});


module.exports = { RoleToService };
