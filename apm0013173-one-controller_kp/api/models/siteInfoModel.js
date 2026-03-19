const Sequelize = require('sequelize');
const { OrchestratorList } = require('./orchestratorListModel');
const { Customers } = require('./customerOneModel');
const oneConnection = require('./databaseOne').Database.getInstance();

const SiteInfo = oneConnection.define('SiteInfo', {
    ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true
    },
    SITE_DATA:{
        type:Sequelize.JSON(),
        allowNull: false    
    },
    ORCHESTRATOR_LIST_ID: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
            model: OrchestratorList,
            key: 'ID'
        }
    },
    CUSTOMER_ID: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
            model: Customers,
            key: 'ID'
        }
    },
    CREATE_DATE: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    UPDATE_DATE: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        onUpdate: Sequelize.literal('CURRENT_TIMESTAMP')
    }
}, {
    tableName: 'CSS_SITE_INFO',
    freezeTableName: true,
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['CUSTOMER_ID', 'ORCHESTRATOR_LIST_ID']
        }
    ]
});

module.exports = { SiteInfo };