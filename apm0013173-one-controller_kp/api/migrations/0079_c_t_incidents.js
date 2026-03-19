/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
  return queryInterface.createTable("CSS_INCIDENTS", {
    ID: {
      type: Sequelize.INTEGER(11),
      primaryKey: true,
      unique: true,
      allowNull: false,
      autoIncrement: true,
    },
    STATUS: {
      type: Sequelize.TEXT(),
      allowNull: false,
    },
    USER_ID: {
      type: Sequelize.INTEGER(11),
      references: {
        model: "CSS_USERS",
        key: "ID",
      },
      onUpdate: "cascade",
      onDelete: "cascade",
    },
    TRANSACTION_ID: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    HOSTNAME: {
      type: Sequelize.STRING(255),
      allowNull: true,
    },
    INCIDENT_SOURCE: {
      type: Sequelize.TEXT(),
      allowNull: false,
    },
    INCIDENT_STACK_TRACE: {
      type: Sequelize.TEXT(),
      allowNull: true,
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
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
  return queryInterface.dropTable("CSS_INCIDENTS");
}

module.exports = { up, down };
