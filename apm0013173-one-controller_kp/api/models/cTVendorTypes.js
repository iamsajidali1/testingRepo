const Sequelize = require('sequelize');
const oneConnection  = require('./databaseOne').Database.getInstance();


const CTVendorTypes = oneConnection.define('CTVendorTypes', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    },
    VENDOR_TYPE:
    {
        type: Sequelize.STRING(255),
        allowNull: false
    }

}, {
    tableName: 'CSS_CONF_TEMPLATE_VENDOR_TYPES',
    freezeTableName: true,
    timestamps:false,
});

module.exports = { CTVendorTypes };
