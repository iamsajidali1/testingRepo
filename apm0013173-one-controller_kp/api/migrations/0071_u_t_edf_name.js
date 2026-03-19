/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.renameColumn(
            'CSS_EDF_DATA',
            'EDF_NAME',
            'GRUA'
        );
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.renameColumn(
            'CSS_EDF_DATA',
            'GRUA',
            'EDF_NAME'
        );
}

module.exports = { up, down };
