/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
  return queryInterface.createTable("CSS_ERROR_BASE", {
    ID: {
      type: Sequelize.INTEGER(11),
      primaryKey: true,
      unique: true,
      allowNull: false,
      autoIncrement: true,
    },
    CODE: {
      type: Sequelize.STRING(255),
      allowNull: false,
      unique: true,
    },
    MESSAGE: {
      type: Sequelize.TEXT(),
      allowNull: false,
    },
    DESCRIPTION: {
      type: Sequelize.TEXT(),
      allowNull: false,
    },
    CATEGORY: {
      type: Sequelize.STRING(255),
      allowNull: true,
    },
    HTTP_STATUS_CODE: {
      type: Sequelize.INTEGER,
      defaultValue: 500,
      allowNull: false,
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
  return queryInterface.dropTable("CSS_ERROR_BASE");
}

module.exports = { up, down };
