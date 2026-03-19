const Sequelize = require('sequelize');
const oneConnection  = require('./databaseOne').Database.getInstance();


const CTTypes = oneConnection.define('CTTypes', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    },
    TEMPLATE_TYPE:
    {
        type: Sequelize.STRING(255),
        allowNull: false
    }

}, {
    tableName: 'CSS_CONF_TEMPLATE_TYPES',
    freezeTableName: true,
    timestamps:false,
});

module.exports = { CTTypes };
