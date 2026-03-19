/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.createTable(
        'CSS_ROLES', {
        ID: {
            type: Sequelize.INTEGER(11),
            primaryKey: true,
            unique: true,
            allowNull: false,
            autoIncrement: true
        },
        IDENTIFICATOR: Sequelize.STRING(100)
    });
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.dropTable('CSS_ROLES');
}


module.exports = { up, down };
