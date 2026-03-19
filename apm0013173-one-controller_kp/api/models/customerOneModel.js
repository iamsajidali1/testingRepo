const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const Customers = oneConnection.define('Customers', {
    ID: {
        type: Sequelize.INTEGER(11),
        autoIncrement: true,
        unique: true,
        allowNull: false,
        primaryKey: true
    },
    NAME: {
        type: Sequelize.STRING(150),
        allowNull: false
    },
    BC_COMPANY_ID: Sequelize.STRING(150),
    BC_NAME: Sequelize.STRING(255),
    ACTIVE: Sequelize.BOOLEAN,
    CRWEB_ID: Sequelize.STRING(120),
    MSIM_EMAIL: Sequelize.STRING(120)
}, {
    tableName: 'CSS_CUSTOMERS',
    freezeTableName: true,
    timestamps: false,
});


module.exports = { Customers };
