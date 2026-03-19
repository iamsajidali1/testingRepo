/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
 function up(queryInterface, Sequelize) {
    return queryInterface.createTable(
        'CSS_EDF_DATA_TO_CUSTOMER', {
        ID: {
            type: Sequelize.INTEGER(11),
            primaryKey: true,
            unique: true,
            allowNull: false,
            autoIncrement: true
        },
        EDF_DATA_ID: {
            type: Sequelize.INTEGER(11),
            references: {
                model: "CSS_EDF_DATA",
                key: "ID"
            },
            onUpdate: "cascade",
            onDelete: "cascade",
        },
        CUSTOMER_ID: {
            type: Sequelize.INTEGER(11),
            references: {
                model: 'CSS_CUSTOMERS',
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
    return queryInterface.dropTable('CSS_EDF_DATA_TO_CUSTOMER');
}

module.exports = { up, down };
