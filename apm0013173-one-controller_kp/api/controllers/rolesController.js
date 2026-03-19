const { CONFIG } = require("../config/configuration");
const { Roles } = require("../models/rolesModel");
const axios = require('axios');
const { HttpsProxyAgent } = require("https-proxy-agent");
const constants = require("../constants");
const loggerPino = require("../helpers/loggerHelper");
const oneConnection = require("../models/databaseOne").Database.getInstance();
const proxyServer = process.env.http_proxy || constants.proxyAttPxy;
const { "stringify": str } = JSON;

exports.getRoles = async(req, res) => {
    try {
        const roles = await Roles.findAll(
            { attributes: ["ID", "IDENTIFICATOR"] }
            ).catch(error =>{
            loggerPino.error(error);
            throw error;
        });
        let results = [];
        if(roles){
            for(const role of roles){
                results.push({
                    ID: role.dataValues.ID,
                    IDENTIFICATOR: role.dataValues.IDENTIFICATOR
                });
            }
        }
        return res.status(200).json(results);
    } catch(error) {
        loggerPino.error(error);
        return res.status(500).json({ message: "Database error" });
    }
}

exports.syncRolesInDB = async(req, res) =>{
    try {
        let levels = await exports.getUPMLevels();
        levels = await exports.checkRolesInDB(levels);
        await exports.insertRoleInDb(levels);
        return res.status(200).send({ message: "Successfull updated!" });
    } catch (error){
        loggerPino.error(error);
        return res.status(500).send({ message: "Internal server error!" });
    }
}

exports.getUPMLevels = async() => {
    const upmAppId = constants.upmAppID;
    const requestConfig = {
        url: `${CONFIG.UPM}/api/upm/v1/application/${upmAppId}`,
        method: 'get',
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
        proxy: false,
        httpsAgent: new HttpsProxyAgent(proxyServer)
    }

    const response = await axios(requestConfig).catch((error) => {
      loggerPino.error(error);
      throw "Unable to call UPM api!";
    });

    if (response) {
        const result = response.data;
        if (response.status <= 299 && response.status >= 200) {
            return result["data"]["levels"];
        }
        if (response.status > 299 && response.status < 599) {
            loggerPino.error("Error when loading levels from UPM!");
            loggerPino.info("Whole response of the request");
            loggerPino.info(str(result));
            throw new Error("Error when loading levels from UPM!");
        } else {
            loggerPino.error("Incorect api status UPM");
            loggerPino.info("Whole response of the request");
            loggerPino.info(str(result));
            throw new Error("Error when loading levels from UPM!");
        }
    } else {
        loggerPino.error("Error when loading levels from UPM!");
        loggerPino.info("Whole response of the request");
        loggerPino.info(response);
        throw new Error("Error when loading levels from UPM!");
    }
}

exports.checkRolesInDB = async(roles) => {
    promisesArray = [];
    for(const key of Object.keys(roles)){
        promisesArray.push(exports.checkRole(roles[key]["levelName"]));
    }
    const results = await Promise.all(promisesArray);
    return results;
}

// check role in DB
exports.checkRole = async(level) =>{
    const role = await Roles.findOne(
        {
            where : {
                IDENTIFICATOR : level
            }
        }
    );
    if((role && role["dataValues"] && role["dataValues"]["ID"])
    || level == constants.one_level_individual){
        // if found return NULL because role is exsist in DB or
        // level == INDIVIDUAL
        return null;
    } else {
        // if not found in DB return name of role
        return level;
    }
}

// insert roles to DB
exports.insertRoleInDb = async(roles) => {
    for(role of roles){
        if(role){
            await oneConnection.transaction({ autocommit: true }, async function (t) {
                await Roles.create({
                    IDENTIFICATOR: role
                }, { transaction: t }).catch(error => {
                    loggerPino.error(error);
                    throw new Error("Database error on create!");
                });
            });
        }
    };
    return;
}
