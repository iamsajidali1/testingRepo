/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
 function up(queryInterface, Sequelize) {
    return Promise.all([
        queryInterface.addColumn(
            'CSS_PROCESS_RESULT',
            'UPM_PERMISSION_ID',
            {
                type: Sequelize.INTEGER(2),
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
        queryInterface.addColumn(
            'CSS_PROCESS_RESULT',
            'UPM_PERMISSION_ID',
            {
                type: Sequelize.INTEGER(2),
            }
        )
    ]);
}

module.exports = { up, down };

