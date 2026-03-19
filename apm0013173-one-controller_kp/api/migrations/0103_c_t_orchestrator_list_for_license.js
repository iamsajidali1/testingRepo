/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
  return queryInterface.createTable("CSS_ORCHESTRATOR_LIST_FOR_LICENSE", {
    ID: {
      type: Sequelize.INTEGER(11),
      primaryKey: true,
      unique: true,
      allowNull: false,
      autoIncrement: true,
    },
    ORCHESTRATOR: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    VENDOR_TYPE_ID: {
      type: Sequelize.INTEGER(11),
      references: {
        model: "CSS_CONF_TEMPLATE_VENDOR_TYPES",
        key: "ID",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    TENANT_ID: {
      type: Sequelize.INTEGER(11),
    },
    MANAGEMENT: {
      type: Sequelize.STRING(255),
    },
    LEVEL: {
      type: Sequelize.STRING(255),
    },
    TAGS: {
      type: Sequelize.STRING(255),
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
  return queryInterface.dropTable("CSS_ORCHESTRATOR_LIST_FOR_LICENSE");
}

module.exports = { up, down };
