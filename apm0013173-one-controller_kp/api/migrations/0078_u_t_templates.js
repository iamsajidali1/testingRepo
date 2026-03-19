/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return Promise.all([
        queryInterface.addColumn(
            'CSS_TEMPLATES',
            'API_ENDPOINT',
            {
                type: Sequelize.STRING(120),
            }
        )
    ]);
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return Promise.all([
        queryInterface.removeColumn(
            'CSS_TEMPLATES',
            'API_ENDPOINT',
        )
    ]);
}

module.exports = { up, down };
