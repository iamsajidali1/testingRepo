const Sequelize = require('sequelize');
const { leamDatabase } = require('./database');


const ServiceLine = leamDatabase.define('service_line', {
    service_line_id: Sequelize.INTEGER,
    name: Sequelize.STRING
}, {
    tableName: 'service_line',
    freezeTableName: true
});


module.exports = { ServiceLine };
