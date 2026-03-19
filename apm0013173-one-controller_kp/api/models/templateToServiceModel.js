const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const TemplateToService = oneConnection.define('TemplateToService', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    }
}, {
    tableName: 'CSS_TEMPLATE_TO_SERVICE',
    freezeTableName: true,
    timestamps: false
});


module.exports = { TemplateToService };
