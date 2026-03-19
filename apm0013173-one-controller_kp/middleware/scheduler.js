const { v4 } = require("uuid");
const { RouteAction } = require("../api/models/routeActionModel");
const {
    createNewProcess, getUserByAttuid, NotFoundError, getUserByBcId,
} = require("../api/controllers/schedulerController.js");
const { getLogger } = require("../utils/logging");
const { "stringify": str } = JSON;
const constans  = require("../api/constants")
const UserNotAuthenticated = require("../api/errors/userNotAuthneticated");

// start process, generate pid save process to DB and when process is completed save result to DB
function scheduleProcess(req, res, next) {
    const log = getLogger();
    // save process to db and generate pid
    saveProcess(req).then(process => {
        if (process.mongo_id) {
            // add pid to req body
            req.body["pid"] = process.mongo_id;
            req.body["processKey"] = process.id
            res.status(200).send({ "pid": process.mongo_id, "code": "200", "status": "enrolled" });
            // start process
        }
        next();
    }).catch(err => {
        log.error(str(err));
        return res.status(500).send({ "pid": "none", "code": "500", "status": "error", "result": err });
    });
}

// create pid and create record on DB for process
async function saveProcess(req) {
  const upmLevels = req.upmLevels;
  const isUpmUser =
    upmLevels && upmLevels.length > 0 && upmLevels[0].appID == constans.upmAppID;
  const log = getLogger();
  const { atteshr, path, query, sessionID: ses, isBcUser, cookies } = req;
  let schedulerPaths = null;
  try {
    schedulerPaths = await getAllSchedulerRoutes();
  } catch (err) {
    log.error(`${ses}: ${err}`);
    throw err;
  }

  if (!schedulerPaths || !schedulerPaths.includes(path)) return false;

  const { specialType } = query;
  log.info(`${ses}: [Scheduler] Assembling item`);
  let user = {};
  let bcContext = {};
  if (isBcUser) {
    bcContext = JSON.parse(req["cookies"]["bcSession"]);
  }
  
  // 404 is okay because a user may have access from UPM, thus won't be in DB
  try {
    user = isBcUser? await getUserByBcId(ses, bcContext["ebizUserId"]) : await getUserByAttuid(ses, (atteshr || {}).attuid);
  } catch (err) {
    if (!(err instanceof NotFoundError)) {
      throw err;
    }
  }
  if (user.id || isUpmUser) {
    const item = {
      code: "200",
      mongo_id: v4(),
      result: "{}",
      status: "enrolled",
      user: user.id || null,
      upm_permission_id: upmLevels ? upmLevels[0].permissionID : null
    };
    log.info(`${ses}: [Scheduler] Temporary item: ${str(item)}`);

    if (specialType && specialType === "excel") {
      item["specialReturnType"] = specialType;
    }
    log.info(`${ses}: [Scheduler] Item data: ${str(item)}`);

    const newProcess = await createNewProcess(ses, item);
    log.info(`${ses}: [Scheduler] Result: ${str(newProcess)}`);
    return newProcess;
  } else {
    throw new UserNotAuthenticated("User is not authenticated");
  }
}

async function getAllSchedulerRoutes() {
    let result = [];
    let routes = await RouteAction.findAll({
        where: {
            SCHEDULER: true
        }
    }).catch((err) => {
        console.log(err);
        throw err;
    });
    if (routes && routes.length > 1) {
        routes.map(route => {
            result.push(route.ROUTE);
        });
        return result;
    } else {
        return false;
    }
}

module.exports = { scheduleProcess };
