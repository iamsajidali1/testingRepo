const Sequelize = require("sequelize");
const oneConnection = require("./databaseOne").Database.getInstance();

const AtomicOperationTypes = oneConnection.define(
  "AtomicOperationTypes",
  {
    ID: {
      type: Sequelize.INTEGER(11),
      primaryKey: true,
      unique: true,
      allowNull: false,
      autoIncrement: true,
    },
    NAME: { 
      type: Sequelize.STRING(100),
      allowNull: false 
    },
    CREATE_DATE: {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    UPDATE_DATE: {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      onUpdate: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
  },
  {
    tableName: "CSS_ATOMIC_OPERATIONS_TYPES",
    freezeTableName: true,
    timestamps: false,
  }
);

module.exports = { AtomicOperationTypes };
