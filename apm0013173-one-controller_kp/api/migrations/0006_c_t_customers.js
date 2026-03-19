/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.createTable(
        'CSS_CUSTOMERS', {
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
        ACTIVE: Sequelize.BOOLEAN
    }
    );
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.dropTable('CSS_CUSTOMERS');
}

module.exports = { up, down };
