/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */

function up(queryInterface, Sequelize) {
    return queryInterface.bulkInsert(
        'CSS_WORKFLOW_ATTRIBUTES', [{
            ID: 1,
            NAME: 'Validation'
        },{
            ID: 2,
            NAME: 'Form'
        }, {
            ID: 3,
            NAME: 'Hostname'
        }, {
            ID: 4,
            NAME: 'Config template'
        }
    ], {}
    );
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.bulkDelete(
        'CSS_WORKFLOW_ATTRIBUTES', {
        ID: { [Sequelize.Op.in]: [1, 4] }
    }, {}
    );
}


module.exports = { up, down };
