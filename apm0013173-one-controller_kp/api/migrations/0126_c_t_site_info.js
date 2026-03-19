/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
  return queryInterface.createTable("CSS_SITE_INFO", {
    ID: {
      type: Sequelize.INTEGER(11),
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
    },

    SITE_DATA: {
      type: Sequelize.JSON(),
      allowNull: false,
    },
    CUSTOMER_ID: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "CSS_CUSTOMERS",
        key: "ID",
      },
    },
    
    ORCHESTRATOR_LIST_ID: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "CSS_ORCHESTRATOR_LIST",
        key: "ID",
      },
    },

    CREATE_DATE: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    UPDATE_DATE: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      onUpdate: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
  }).then(() =>
    queryInterface.addIndex("CSS_SITE_INFO", ["CUSTOMER_ID", "ORCHESTRATOR_LIST_ID"], {
      unique: true,
      name: "unique_customer_orchestrator"
    })
  );
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 */
function down(queryInterface) {
  return queryInterface.dropTable("CSS_SITE_INFO");
}

module.exports = { up, down };
