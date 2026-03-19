const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const TemplateToVendor = oneConnection.define('TemplateToVendor', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    }
}, {
    tableName: 'CSS_TEMPLATE_TO_VENDOR',
    freezeTableName: true,
    timestamps: false
});


module.exports = { TemplateToVendor };
