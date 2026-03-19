const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


// map specific endpoint routes to required actions
// to permit/forbid roles from using specific APIs
const RouteAction = oneConnection.define('RouteAction', {
    ID: {
        type: Sequelize.INTEGER(11),
        autoIncrement: true,
        unique: true,
        allowNull: false,
        primaryKey: true
    },

    // from routes.js
    METHOD: Sequelize.STRING(20),
    ROUTE: Sequelize.STRING(120),
    SCHEDULER: Sequelize.BOOLEAN,
    TYPE: {
        type: Sequelize.STRING(20),
        defaultValue: null
    }
}, {
    tableName: 'CSS_ROUTE_TO_ACTION',
    freezeTableName: true,
    timestamps: false
});


module.exports = { RouteAction };
