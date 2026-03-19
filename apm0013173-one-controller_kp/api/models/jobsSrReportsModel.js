const Sequelize = require("sequelize");
const oneConnection = require("./databaseOne").Database.getInstance();

const JobsSrReport = oneConnection.define(
  "JobsSrReport",
  {
    ID: {
      type: Sequelize.INTEGER(11),
      primaryKey: true,
      unique: true,
      allowNull: false,
      autoIncrement: true,
    },
    DATA: {
      type: Sequelize.JSON(),
    },
    IS_NOTIFIED: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    REPORT_DATE: {
      type: Sequelize.DATE,
    },
    EXECUTION_DATE: {
      type: Sequelize.DATE,
    },
    UPDATE_DATE: {
      type: Sequelize.DATE,
    },
  },
  {
    tableName: "CSS_JOBS_SR_REPORTS",
    freezeTableName: true,
    timestamps: false,
  }
);

module.exports = { JobsSrReport };
