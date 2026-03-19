/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return Promise.all([
        queryInterface.addColumn(
            'CSS_CUSTOMERS',
            'MSIM_EMAIL',
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
            'CSS_CUSTOMERS',
            'MSIM_EMAIL',
        )
    ]);
}

module.exports = { up, down };
