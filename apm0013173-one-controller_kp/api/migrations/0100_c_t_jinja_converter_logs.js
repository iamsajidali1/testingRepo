/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
  return queryInterface.createTable("CSS_CARCHE_JINJA_CONVERTER_LOGS", {
    ID: {
      type: Sequelize.INTEGER(11),
      primaryKey: true,
      unique: true,
      allowNull: false,
      autoIncrement: true,
    },
    TEMPLATE_ID: {
      type: Sequelize.INTEGER(11)
    },
    TEMPLATE_FILE: {
      type: Sequelize.STRING(255)
    },
    CARCHE_TEMPLATE: Sequelize.BLOB("long"),
    JINJA_TEMPLATE: Sequelize.BLOB("long"),
    SESSION_ID: {
      type: Sequelize.STRING(255),
      defaultValue: null,
    },
    CONVERTED_BY: {
      type: Sequelize.STRING(10),
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
  return queryInterface.dropTable("CSS_CARCHE_JINJA_CONVERTER_LOGS");
}

module.exports = { up, down };
