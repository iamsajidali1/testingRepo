'use strict';

const TABLE = "CSS_BC_CONTEXT";
exports.up = (queryInterface, Sequelize) => {
    return queryInterface.changeColumn(TABLE, "SESSION", {
        "allowNull": false,
        "comment": "Hard value of express-session + connect-session-sequelize",
        "type": Sequelize.STRING(128)
    });
};

exports.down = (queryInterface, Sequelize) => {
    return queryInterface.changeColumn(TABLE, "SESSION", {
        "allowNull": false,
        "comment": "Hard value of express-session + connect-session-sequelize",
        "type": Sequelize.STRING(64)
    });
};
