const Sequelize = require("sequelize");
const oneConnection = require("./databaseOne").Database.getInstance();

const OrchestratorListForLicense = oneConnection.define(
  "OrchestratorListForLicense",
  {
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
  },
  {
    tableName: "CSS_ORCHESTRATOR_LIST_FOR_LICENSE",
    freezeTableName: true,
    timestamps: false,
  }
);

module.exports = { OrchestratorListForLicense };
