/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.bulkInsert(
        'CSS_ROLES', [{
            ID: 1,
            IDENTIFICATOR: "LE"
        }, {
            ID: 2,
            IDENTIFICATOR: "LCM"
        }, {
            ID: 3,
            IDENTIFICATOR: "ADMIN"
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
