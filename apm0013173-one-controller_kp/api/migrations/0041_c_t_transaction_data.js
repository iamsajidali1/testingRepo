/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.createTable(
        'CSS_TRANSACTION', {
        ID: {
            type: Sequelize.INTEGER(11),
            autoIncrement: true,
            unique: true,
            allowNull: false,
            primaryKey: true
        },
        DATA: {
            type: Sequelize.BLOB('long')
        },
        ATTUID: Sequelize.STRING(6),
        ROUTE: Sequelize.STRING(120),
        SESSION_ID: Sequelize.STRING(255)
    }
    );
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.dropTable('CSS_TRANSACTION');
}

module.exports = { up, down };
