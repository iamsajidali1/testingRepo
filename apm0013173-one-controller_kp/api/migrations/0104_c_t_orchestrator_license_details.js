/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
  return queryInterface.createTable("CSS_ORCHESTRATOR_LICENSE_DETAILS", {
    ID: {
      type: Sequelize.INTEGER(11),
      primaryKey: true,
      unique: true,
      allowNull: false,
      autoIncrement: true,
    },
    ORCHESTRATOR_LIST_FOR_LICENSE_ID: {
      unique: true,
      type: Sequelize.INTEGER(11),
      references: {
        model: "CSS_ORCHESTRATOR_LIST_FOR_LICENSE",
        key: "ID",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    LICENSE_DATA: {
      type: Sequelize.JSON(),
    },
    LICENSE_COUNT: {
      type: Sequelize.INTEGER(11),
    },
    createdAt: {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    updatedAt: {
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
  return queryInterface.dropTable("CSS_ORCHESTRATOR_LICENSE_DETAILS");
}

module.exports = { up, down };
