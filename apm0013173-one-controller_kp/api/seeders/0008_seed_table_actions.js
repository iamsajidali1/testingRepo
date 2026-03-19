/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */

function up(queryInterface, Sequelize) {
    return queryInterface.bulkInsert(
        'CSS_ACTIONS', [{
            ID: 1,
            NAME: "Add user to role"
        }, {
            ID: 2,
            NAME: "Read templates"
        }, {
            ID: 3,
            NAME: "Assign user to template"
        }, {
            ID: 4,
            NAME: "Read customers"
        }, {
            ID: 5,
            NAME: "Read roles"
        }, {
            ID: 6,
            NAME: "Add internal customer"
        }, {
            ID: 7,
            NAME: "Add external customer"
        }, {
            ID: 8,
            NAME: "Add customer to user"
        }, {
            ID: 9,
            NAME: "Add templates"
        }, {
            ID: 10,
            NAME: "Remove templates"
        }, {
            ID: 11,
            NAME: "Read actions"
        }, {
            ID: 12,
            NAME: "Read privileges"
        }, {
            ID: 13,
            NAME: "Read users"
        }, {
            ID: 14,
            NAME: "Add users"
        }, {
            ID: 15,
            NAME: "Read hostnames"
        }, {
            ID: 16,
            NAME: "Read interfaces"
        }, {
            ID: 17,
            NAME: "Generate config"
        }, {
            ID: 18,
            NAME: "Validate config"
        }, {
            ID: 19,
            NAME: "Push config, set rollback, confirm config"
        }, {
            ID: 20,
            NAME: "Read logs"
        }, {
            ID: 21,
            NAME: "Add logs"
        }, {
            ID: 22,
            NAME: "Add VCO Edge"
        }, {
            ID: 23,
            NAME: "Read hostname address"
        }, {
            ID: 24,
            NAME: 'Write data collection'
        },
        {
            ID: 25,
            NAME: 'Read data collection'
        }, {
            ID: 26,
            NAME: "Read carche template"
        }, {
            ID: 27,
            NAME: "Write carche template"
        }, {
            ID: 28,
            NAME: "Read service type"
        }, {
            ID: 29,
            NAME: 'Create service type'
        }, {
            ID: 30,
            NAME: 'Delete service type'
        }, {
            ID: 31,
            NAME: 'Create customer'
        }, {
            ID: 32,
            NAME: 'Update customer'
        }, {
            ID: 33,
            NAME: 'Delete customer'
        }, {
            ID: 34,
            NAME: 'Create action data'
        }, {
            ID: 35,
            NAME: 'Read action data'
        }, {
            ID: 36,
            NAME: 'Delete action data'
        }, {
            ID: 37,
            NAME: "Read scheduler process result"
        }, {
            ID: 38,
            NAME: "Generate MDS config"
        }, {
            ID: 39,
            NAME: "Create VCO users"
        }, {
            ID: 40,
            NAME: "Send message - paperplane"
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
        'CSS_ACTIONS', {
        ID: { [Sequelize.Op.lte]: 40 }
    }, {}
    );
}


module.exports = { up, down };
