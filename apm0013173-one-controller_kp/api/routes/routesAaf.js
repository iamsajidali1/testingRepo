module.exports = (app) => {
    const cacheDevicesController = require("../controllers/cacheDevicesController");
    const jobsController = require("../controllers/jobsController");
    const reportScheduleController = require("../controllers/reportScheduleController.js");
    const veloSuiteController = require("../controllers/veloSuiteController");

    // Starting of cronjob related routes
    app.route("/jobs/sr-reports").get(jobsController.sendSrReports);
    app.route("/jobs/cache-devices").get(cacheDevicesController.triggerDeviceCaching);
    app.route("/jobs/network-insights").get(reportScheduleController.downloadUtilisationReport);
    // API endpoint to Synchronize the Velo Licenses
    app.route("/jobs/orchestrator/vco/sync-licenses").post(veloSuiteController.syncOrchestratorLicenses);
    // API endpoints exposed for the GVM Team (Uses Machince only, AAF Authentication)
    app.route("/orchestrator/vco/license").get(veloSuiteController.getOrchestratorLicenseData);
    app.route("/orchestrator/vco/license/report").get(veloSuiteController.getVcoLicenseReportForFilebeat);
    app.route("/jobs/site-details").post(veloSuiteController.saveSiteDetailsInfoIntoDB);
    app.route("/velo-suite/site-info/").get(veloSuiteController.sendSiteDetailsInfo);

};
