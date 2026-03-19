const fs = require("fs");
const mongoose = require("mongoose");
const processResult = require("../models/processMongoModel");
const dataCollection = require("../models/dataCollectionMongoModel");
const config = require("../config/configuration");
const constants = require("../constants");

const getMongoConfig = () => {
    const { mongoLimits } = constants;
    return {
        "connectTimeoutMS": mongoLimits.connectTimeoutMS,
        "keepAlive": mongoLimits.keepAlive,
        "reconnectInterval": mongoLimits.reconnectInterval,
        "reconnectTries": mongoLimits.reconnectTries,
        "useFindAndModify": false,
        "useNewUrlParser": true
    };
};

const connectMongo = () => {
    mongoose.Promise = global.Promise;
    mongoose.connect(
        config.CONFIG.mongoJS.mongoDBstring,
        getMongoConfig(),
        (err) => {
            if (err) {
                /* eslint-disable-next-line no-console */
                console.error("Error while connecting to Mongo", err);
            }
        }
    );
};

const getDataFromMongo = async (model) => {
    const data = await model.find({});
    const file = JSON.stringify(data);
    const { collectionName } = model.collection;
    const jsonPath = `${collectionName}/${collectionName}.json`;
    if (!fs.existsSync(collectionName)) {
        fs.mkdirSync(collectionName);
    }

    fs.writeFileSync(jsonPath, file, "utf-8");
};

const main = async () => {
    await connectMongo();
    await getDataFromMongo(processResult);
    await getDataFromMongo(dataCollection);
    await mongoose.connection.close(() => process.exit(0));
}

main().then(console.log).catch(console.error);
