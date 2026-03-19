/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */

function up(queryInterface, Sequelize) {
  return Promise.all([
    queryInterface.addConstraint("CSS_ATOMIC_OPERATIONS_VENDOR_TYPES", {
      fields: ["ATOMIC_OPERATION_ID", "VENDOR_TYPE_ID"],
      type: "unique",
      name: "atomic_op_vendor_unique",
    }),
    queryInterface.addConstraint("CSS_ATOMIC_OPERATIONS_CHARACTERISTICS", {
      fields: ["CHARACTERISTIC_ID", "ATOMIC_OPERATION_ID"],
      type: "unique",
      name: "char_atomic_op_unique",
    }),
    queryInterface.addConstraint("CSS_ATOMIC_OPERATIONS_TEMPLATE", {
      fields: ["ATOMIC_OPERATION_ID", "TEMPLATE_ID"],
      type: "unique",
      name: "atomic_op_template_unique",
    }),
    queryInterface.addConstraint("CSS_ATOMIC_OPERATIONS_SERVICES", {
      fields: ["ATOMIC_OPERATION_ID", "SERVICE_ID"],
      type: "unique",
      name: "atomic_op_service_unique",
    }),
  ]);
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface) {
  return Promise.all([
    queryInterface.removeConstraint(
      "CSS_ATOMIC_OPERATIONS_VENDOR_TYPES",
      "atomic_op_vendor_unique"
    ),
    queryInterface.removeConstraint(
      "CSS_ATOMIC_OPERATIONS_CHARACTERISTICS",
      "char_atomic_op_unique"
    ),
    queryInterface.removeConstraint(
      "CSS_ATOMIC_OPERATIONS_TEMPLATE",
      "atomic_op_template_unique"
    ),
    queryInterface.removeConstraint(
      "CSS_ATOMIC_OPERATIONS_SERVICES",
      "atomic_op_service_unique"
    ),
  ]);
}

module.exports = { up, down };
