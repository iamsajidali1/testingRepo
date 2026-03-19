const Sequelize = require("sequelize");
const oneConnection = require("./databaseOne").Database.getInstance();

const JinjaConverterLogs = oneConnection.define(
  "JinjaConverterLogs",
  {
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
  },
  {
    tableName: "CSS_CARCHE_JINJA_CONVERTER_LOGS",
    freezeTableName: true,
    timestamps: true,
  }
);

module.exports = { JinjaConverterLogs };
