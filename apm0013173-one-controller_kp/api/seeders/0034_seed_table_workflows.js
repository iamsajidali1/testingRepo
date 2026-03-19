/**
 * @param {import("sequelize").QueryInterface} queryInterface
 */
function up(queryInterface) {
    return queryInterface.bulkInsert(
        'CSS_WORKFLOW', [{
            ID: 14,
            NAME: 'Network insights'
        }], {}
    );
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.bulkDelete(
        'CSS_WORKFLOW', {
            ID: {
                [Sequelize.Op.in]: [14]
            }
        }, {}
    );
}

module.exports = { up, down };