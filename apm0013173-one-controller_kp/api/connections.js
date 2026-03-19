const { Sequelize } = require("sequelize");


class MySQLSequelizeSingleton {
    createSequelize() {
        const { CONFIG } = require("./config/configuration");
        const { database, username, password, dialect, host, port, pool } = CONFIG;
        return new Sequelize(database, username, password, {
            dialect: dialect,
            dialectOptions: { ssl: { rejectUnauthorized: false } },
            host: host,
            port: port,
            omitNull: false,
            logging: false,
            useNewUrlParser: true,
            pool: pool,
            define: {
                freezeTableName: true,
                timestamps: false
            },
            sync: { alter: false } // Ensure alter is disabled
        }
        );
    }

    constructor() {
        if (!MySQLSequelizeSingleton._instance) {
            this.sequelize = this.createSequelize();
            MySQLSequelizeSingleton._instance = this;
        }
        return MySQLSequelizeSingleton._instance;
    }

    static getInstance() {
        return this._instance;
    }
}

exports.getSequelize = () => {
    const single = new MySQLSequelizeSingleton();
    return MySQLSequelizeSingleton.getInstance().sequelize;
};
