const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const CTContentTypes = oneConnection.define('CTContentTypes', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    },
    CONTENT_TYPE:
    {
        type: Sequelize.STRING(255),
        allowNull: false
    }

}, {
    tableName: 'CSS_CONF_TEMPLATE_CONTENT_TYPES',
    freezeTableName: true,
    timestamps: false,
});

module.exports = { CTContentTypes };

