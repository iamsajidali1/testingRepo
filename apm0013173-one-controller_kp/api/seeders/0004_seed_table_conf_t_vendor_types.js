/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.bulkInsert(
        'CSS_CONF_TEMPLATE_VENDOR_TYPES', [{
            ID: 1,
            VENDOR_TYPE: "CISCO SYSTEMS"
        }, {
            ID: 2,
            VENDOR_TYPE: "JUNIPER NETWORKS"
        },{
            ID: 3,
            VENDOR_TYPE: "any"
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
        ID: { [Sequelize.Op.lte]: 3 }
    }, {}
    );
}


module.exports = { up, down };
