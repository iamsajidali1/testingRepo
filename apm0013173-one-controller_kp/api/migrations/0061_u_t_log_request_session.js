'use strict';

const TABLE = "CSS_LOG_REQUEST";
const COLUMN = "SESSION";

exports.up = (queryInterface, Sequelize) => queryInterface.addColumn(
    TABLE, COLUMN, {
        type: Sequelize.STRING(255),
        defaultValue: null
    }
);

exports.down = (queryInterface, Sequelize) => queryInterface.removeColumn(
    TABLE, COLUMN
);
