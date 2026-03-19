'use strict';

const TABLE = "CSS_BC_CONTEXT";
const INDEX = `${TABLE}_UNIQUE_SESSION_GDA`;

exports.up = (queryInterface, Sequelize) => {
    return queryInterface.addIndex(TABLE, {
        "fields": ["SESSION", "GDA_SESSION"],
        "name": INDEX,
        "unique": true
    });
};

exports.down = (queryInterface, Sequelize) => {
    return queryInterface.removeIndex(TABLE, INDEX);
};
