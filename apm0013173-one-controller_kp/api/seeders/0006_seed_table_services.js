/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.bulkInsert(
        'CSS_SERVICES', [ {
            ID: 1,
            SERVICE_NAME: 'MRS'
          },
          {
            ID: 2,
            SERVICE_NAME: 'MLAN'
          },
          {
            ID: 3,
            SERVICE_NAME: 'SD-WAN OTT'
          },
          {
            ID: 4,
            SERVICE_NAME: 'AVPN'
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
        'CSS_SERVICES', {
            ID: {[Sequelize.Op.lte]: 4}
        }, {}
    );
}


module.exports = { up, down };
