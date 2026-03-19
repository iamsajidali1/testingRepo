/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.renameTable(
        'CSS_EDF_DATA','CSS_GRUA_DATA',
    );
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.renameTable(
        'CSS_GRUA_DATA','CSS_EDF_DATA'
    );
}

module.exports = { up, down };
