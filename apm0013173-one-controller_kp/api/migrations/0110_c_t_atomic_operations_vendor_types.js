/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
  return queryInterface.createTable("CSS_ATOMIC_OPERATIONS_VENDOR_TYPES", {
    ID: {
      type: Sequelize.INTEGER(11),
      primaryKey: true,
      unique: true,
      allowNull: false,
      autoIncrement: true,
    },
    VENDOR_TYPE_ID: {
      type: Sequelize.INTEGER(11),
      references: {
        model: "CSS_CONF_TEMPLATE_VENDOR_TYPES",
        key: "ID",
      },
    },
    ATOMIC_OPERATION_ID: {
      type: Sequelize.INTEGER(11),
      references: {
        model: "CSS_ATOMIC_OPERATIONS",
        key: "ID",
      },
    },
    CREATE_DATE: {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    UPDATE_DATE: {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      onUpdate: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
  });
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 */
function down(queryInterface) {
  return queryInterface.dropTable("CSS_ATOMIC_OPERATIONS_VENDOR_TYPES");
}

module.exports = { up, down };
