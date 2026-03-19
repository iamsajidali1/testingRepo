/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.bulkInsert(
        'CSS_CONF_TEMPLATE_TYPES', [{
            ID: 1,
            TEMPLATE_TYPE: "cArche"
        }, {
            ID: 2,
            TEMPLATE_TYPE: "Jinja2"
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
        'CSS_CONF_TEMPLATE_TYPES', {
        ID: { [Sequelize.Op.lte]: 2 }
    }, {}
    );
}


module.exports = { up, down };
