const Sequelize = require('sequelize');
const { leamDatabase } = require('./database');


const Assignment = leamDatabase.define('assignment', {
    name: Sequelize.STRING,
    customer_id: Sequelize.INTEGER,
    external_customer_id: Sequelize.STRING
}, {
    tableName: 'assignment',
    freezeTableName: true
});


module.exports = { Assignment };
