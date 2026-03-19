/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.createTable(
        'CSS_SERVICES', {
        ID:
        {
            type: Sequelize.INTEGER(11),
            primaryKey: true,
            unique: true,
            allowNull: false,
            autoIncrement: true
        },
        SERVICE_NAME: Sequelize.STRING(150),
    }
    );
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.dropTable('CSS_SERVICES');
}


module.exports = { up, down };
