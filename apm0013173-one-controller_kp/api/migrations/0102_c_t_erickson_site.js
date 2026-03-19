/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.createTable("CSS_ERICKSON_SITES", {
      ID: {
        type: Sequelize.INTEGER(11),
        primaryKey: true,
        unique: true,
        allowNull: false,
        autoIncrement: true,
      },
      SITE_NAME: {
        type: Sequelize.STRING(100)
      },
      SITE_ID: {
        type: Sequelize.STRING(100)
      },
      GEOGRAPHICAL_SITE_ID: {
        type: Sequelize.INTEGER,
        allowNull: true
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
    return queryInterface.dropTable("CSS_ERICKSON_SITES");
  }
  
  module.exports = { up, down };
  