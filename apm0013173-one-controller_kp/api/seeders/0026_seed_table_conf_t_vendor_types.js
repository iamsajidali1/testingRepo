/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.bulkInsert(
        'CSS_CONF_TEMPLATE_VENDOR_TYPES', [{
            ID: 4,
            VENDOR_TYPE: "VELOCLOUD"
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
        'CSS_CONF_TEMPLATE_VENDOR_TYPES', {
        ID: { [Sequelize.Op.lte]: 4 }
    }, {}
    );
}


module.exports = { up, down };
