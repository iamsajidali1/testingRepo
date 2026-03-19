const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const RoleToAction = oneConnection.define('RoleToAction', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    }
}, {
    tableName: 'CSS_ROLE_TO_ACTION',
    freezeTableName: true,
    timestamps: false
});


module.exports = { RoleToAction };
