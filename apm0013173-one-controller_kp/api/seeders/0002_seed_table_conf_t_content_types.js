/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.bulkInsert(
        'CSS_CONF_TEMPLATE_CONTENT_TYPES', [{
            ID: 1,
            CONTENT_TYPE: "CLI"
        }, {
            ID: 2,
            CONTENT_TYPE: "JSON"
        }, {
            ID: 3,
            CONTENT_TYPE: "XML"
        }], {}
    );
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.bulkDelete(
        'CSS_CONF_TEMPLATE_CONTENT_TYPES', {
            ID: {[Sequelize.Op.lte]: 3}
        }, {}
    );
}


module.exports = { up, down };
