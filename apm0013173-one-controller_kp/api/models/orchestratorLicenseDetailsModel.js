const Sequelize = require("sequelize");
const oneConnection = require("./databaseOne").Database.getInstance();

const OrchestratorLicenseDetails = oneConnection.define(
  "OrchestratorLicenseDetails",
  {
    ID: {
      type: Sequelize.INTEGER(11),
      primaryKey: true,
      unique: true,
      allowNull: false,
      autoIncrement: true,
    },
    ORCHESTRATOR_LIST_FOR_LICENSE_ID: {
      type: Sequelize.INTEGER(11),
      unique: true,
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
  },
  {
    tableName: "CSS_ORCHESTRATOR_LICENSE_DETAILS",
    freezeTableName: true,
    timestamps: true,
  }
);

module.exports = { OrchestratorLicenseDetails };
