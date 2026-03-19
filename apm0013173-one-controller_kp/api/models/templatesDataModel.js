const Sequelize = require('sequelize');
const oneConnection = require('./databaseOne').Database.getInstance();


const Templates = oneConnection.define('Templates', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    },
    NAME: {
        type: Sequelize.STRING(60),
        allowNull: false
    },
    QUESTIONS: {
        type: Sequelize.BLOB('long')
    },
    // customer ID and customer name - must be separe table
    VALIDATION: {
        type: Sequelize.BLOB('long')
    },
    DESCRIPTION: {
        type: Sequelize.TEXT(),
        allowNull: false
    },
    STATICHOSTNAMECHECKBOX: {
        type: Sequelize.BOOLEAN,
        allowNull: false
    },
    // used text becuase of the search when someone try to remove carche template
    CARCHETEMPLATE: {
        type: Sequelize.TEXT(),
        allowNull: true
    },
    // service must be separate table with relation to template
    STATICHOSTNAME: {
        type: Sequelize.BLOB('long'),
        allowNull: true
    },
    // endpoint for generating reports
    API_ENDPOINT: {
        type: Sequelize.STRING(120),
        allowNull: true
    },
    ENABLED: {
        type: Sequelize.BOOLEAN,
        allowNull: false
    },
    MIN_ROLLBACK_TIMER: { type: Sequelize.INTEGER(2) },
    MAX_ROLLBACK_TIMER: { type: Sequelize.INTEGER(3) }
}, {
    tableName: 'CSS_TEMPLATES',
    freezeTableName: true,
    timestamps: true
});


module.exports = { Templates };


