/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.createTable(
        'CSS_MCAP_CREDENTIAL_TO_SERVICE_TO_CUSTOMER', {
        ID: {
            type: Sequelize.INTEGER(11),
            primaryKey: true,
            unique: true,
            allowNull: false,
            autoIncrement: true
        },
        MCAP_CREDENTIAL_ID: {
            type: Sequelize.INTEGER(11),
            references: {
                model: "CSS_MCAP_CREDENTIAL",
                key: "ID"
            },
            onUpdate: "cascade",
            onDelete: "cascade",
        },
        SERVICE_TO_CUSTOMER_ID: {
            type: Sequelize.INTEGER(11),
            references: {
                model: 'CSS_SERVICE_TO_CUSTOMER',
                key: 'ID'
            },
            onUpdate: 'cascade',
            onDelete: 'cascade'
        }
    }
    );
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.dropTable('CSS_MCAP_CREDENTIAL_TO_SERVICE_TO_CUSTOMER');
}

module.exports = { up, down };
