'use strict';

const TABLE = "CSS_ERROR";
exports.up = (queryInterface, Sequelize) => {
    const model = {
        "ID": {
            type: Sequelize.INTEGER(11),
            primaryKey: true,
            unique: true,
            allowNull: false,
            autoIncrement: true
        },
        "MESSAGE": Sequelize.TEXT
    };
    return queryInterface.createTable(TABLE, model);
};

exports.down = (queryInterface, Sequelize) => queryInterface.dropTable(TABLE);
