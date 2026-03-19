const fs = require("fs");
const path = require("path");
const { ok, internalServerError, notFound } = require("../statuses");

class NotFoundError extends Error {}

const getStepsAndFlows = async (req, res) => {
  try {
    const { workflowId } = req.query;
    const raw = await fs.readFileSync(`${__dirname}/jsons/flows.json`);
    const data = JSON.parse(raw);
    const steps = data.find((row) => row.workflowId === Number(workflowId));
    if (!steps) {
      throw new NotFoundError("No workflow steps found for this configuration!");
    }
    return res.status(ok).json({
      result: steps,
      message: "Fetched workflow steps for this configuration successfully",
    });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(notFound).json({
        result: [],
        message: err.message,
      });
    }
    return res.status(internalServerError).json({
      result: [],
      message: "Something went wrong while getting the workflow steps!",
    });
  }
};


module.exports = { getStepsAndFlows };
