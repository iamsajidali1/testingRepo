/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.bulkInsert(
        'CSS_WORKFLOW', [{
            ID: 1,
            NAME: "Logical change"
        }, {
            ID: 2,
            NAME: "Data collection"
        }, {
            ID: 3,
            NAME: "Show commands"
        },{
            ID: 4,
            NAME: "Show commands with variables"
        },
        {
            ID: 5,
            NAME: "Bulk logical change"
        },
        {
            ID: 6,
            NAME: "Generate config"
        },
        {
            ID: 7,
            NAME: "VCO edge provisioning"
        },
        {
            ID: 8,
            NAME: "Bulk VCO edge provisioning"
        },
        {
            ID: 9,
            NAME: "MDS config generator"
        },
        {
            ID: 10,
            NAME: "Bulk VCO users provisioning"
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
        'CSS_ROLES', {
            ID: {[Sequelize.Op.lte]: 3}
        }, {}
    );
}


module.exports = { up, down };
