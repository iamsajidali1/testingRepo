const { CONFIG } = require('../config/configuration');
const leamConnection = CONFIG.leamJS;

const Sequelize = require('sequelize');

module.exports.leamDatabase = new Sequelize(
    leamConnection.database,
    leamConnection.user,
    leamConnection.password, {
    dialect: 'mysql',
    host: leamConnection.host,
    port: leamConnection.port,
    logging: console.log
}
);
