const Sequelize = require('sequelize');
const { leamDatabase } = require('./database');


const Customer = leamDatabase.define('customer', {
    customer_id: Sequelize.INTEGER,
    name: Sequelize.STRING,
    external_customer_id: Sequelize.STRING,
    service_line_id: Sequelize.INTEGER
}, {
    tableName: 'customer',
    freezeTableName: true
});


module.exports = { Customer };
