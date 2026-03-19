/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
  return queryInterface.createTable("CSS_ATOMIC_OPERATIONS_TEMPLATE", {
    ID: {
      type: Sequelize.INTEGER(11),
      primaryKey: true,
      unique: true,
      allowNull: false,
      autoIncrement: true,
    },
    ATOMIC_OPERATION_ID: {
      type: Sequelize.INTEGER(11),
      references: {
        model: "CSS_ATOMIC_OPERATIONS",
        key: "ID",
      },
      allowNull: false,
    },
    TEMPLATE_ID: {
      type: Sequelize.INTEGER(11),
      references: {
        model: "CSS_TEMPLATES",
        key: "ID",
      },
      allowNull: false,
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
  return queryInterface.dropTable("CSS_ATOMIC_OPERATIONS_TEMPLATE");
}

module.exports = { up, down };
