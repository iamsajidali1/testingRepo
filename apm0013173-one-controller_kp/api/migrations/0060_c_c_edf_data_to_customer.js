/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
  return queryInterface.addConstraint("CSS_EDF_DATA_TO_CUSTOMER", {
    fields: ["EDF_DATA_ID", "CUSTOMER_ID"],
    type: "unique",
    name: "edf_data_customer"
  });
}

/**
* @param {import("sequelize").QueryInterface} queryInterface
* @param {import("sequelize").DataTypes} Sequelize
*/
function down(queryInterface, Sequelize) {
  return queryInterface.removeConstraint("CSS_EDF_DATA_TO_CUSTOMER", "edf_data_customer");
}

module.exports = { up, down };

