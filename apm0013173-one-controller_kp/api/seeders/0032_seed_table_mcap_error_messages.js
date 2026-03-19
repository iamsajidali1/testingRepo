/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
 function up(queryInterface, Sequelize) {
    return queryInterface.bulkInsert(
        'CSS_MCAP_ERROR_MESSAGES', [{
            ID: 1,
            MESSAGE: "% Invalid input detected at '^' marker"
        }, {
            ID: 2,
            MESSAGE: "% Incomplete command"
        }, {
            ID: 3,
            MESSAGE: "% Ambiguous command."
        },
        {
            ID: 4,
            MESSAGE: "% Policy commands not allowed without an address family"
        },
        {
            ID: 5,
            MESSAGE: "IP addresses may not be configured on L2 links"
        }], {}
    );
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.bulkDelete(
        'CSS_ROLES', {
            ID: {[Sequelize.Op.lte]: 3}
        }, {}
    );
}


module.exports = { up, down };
