const Sequelize = require("sequelize");
const oneConnection = require("./databaseOne").Database.getInstance();

const Components = oneConnection.define(
  "Components",
  {
    ID: {
      type: Sequelize.INTEGER(11),
      primaryKey: true,
      unique: true,
      allowNull: false,
      autoIncrement: true,
    },
    KEY: {
      type: Sequelize.STRING(100),
      unique: true,
      allowNull: false,
    },
    NAME: Sequelize.STRING(255),
    TYPE: Sequelize.STRING(100)
  },
  {
    tableName: "CSS_APP_COMPONENTS",
    freezeTableName: true,
    timestamps: false,
  }
);

module.exports = { Components };
