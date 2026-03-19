/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.createTable(
        'CSS_MONITOR_LOGS', {
        ID: {
            type: Sequelize.INTEGER(11),
            primaryKey: true,
            unique: true,
            allowNull: false,
            autoIncrement: true
        },
        STATUS: {
            type: Sequelize.TEXT(),
            allowNull: false,
        },
        TRANSACTION_ID: {
            type: Sequelize.STRING(255),
            allowNull: false
        },
        IS_EXTERNAL_CUSTOMER: Sequelize.BOOLEAN,
        HOSTNAME: Sequelize.BLOB('long'),
        ORCHESTRATOR_RESPONSE: Sequelize.BLOB('long'),
        MCAP_TRANSACTION_ID: Sequelize.STRING(255),
        CARCHE_TRANSACTION_ID: Sequelize.STRING(255),
        COLLECTED_DATA: Sequelize.BLOB('long'),
        //required
        TEMPLATE_ID: {
            type: Sequelize.INTEGER(11),
            references: {
                model: "CSS_TEMPLATES",
                key: "ID"
            },
            onUpdate: "cascade",
            onDelete: "cascade",
        },
        // required
        SERVICE_ID: {
            type: Sequelize.INTEGER(11),
            references: {
                model: 'CSS_SERVICES',
                key: 'ID'
            },
            onUpdate: 'cascade',
            onDelete: 'cascade'
        },
        // requried
        USER_ID: {
            type: Sequelize.INTEGER(11),
            references: {
                model: "CSS_USERS",
                key: "ID"
            },
            onUpdate: "cascade",
            onDelete: "cascade",
        },
        // not required
        CUSTOMER_ID: {
            type: Sequelize.INTEGER(11),
            references: {
                model: "CSS_CUSTOMERS",
                key: "ID"
            },
            onUpdate: "cascade",
            onDelete: "cascade",
        },
        // not required
        SERVICE_TO_CUSTOMER_ID: {
            type: Sequelize.INTEGER(11),
            references: {
                model: "CSS_SERVICE_TO_CUSTOMER",
                key: "ID"
            },
            onUpdate: "cascade",
            onDelete: "cascade",
        },
        createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            onUpdate: Sequelize.literal('CURRENT_TIMESTAMP')
        }
    }
    );
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.dropTable('CSS_MONITOR_LOGS');
}

module.exports = { up, down };
