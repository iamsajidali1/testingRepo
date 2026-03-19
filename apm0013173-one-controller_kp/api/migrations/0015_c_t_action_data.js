/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.createTable(
        'CSS_ACTION_DATA_CUSTOMERS', {
        ID: {
            type: Sequelize.INTEGER(11),
            primaryKey: true,
            unique: true,
            allowNull: false,
            autoIncrement: true
        },
        ACTION_DATA_CUS_ID: {
            type: Sequelize.STRING(255),
            allowNull: false
        },
        ACTION_DATA_CUS_NAME: {
            type: Sequelize.STRING(255)
        }
    }
    );
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.dropTable('CSS_ACTION_DATA_CUSTOMERS');
}

module.exports = { up, down };
