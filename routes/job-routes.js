const express = require("express");
const HttpError = require("../models/http-error");
const jobsControllers = require("../controllers/jobs-controllers");
const router = express.Router();
const checkAuth = require("../middleware/check-auth");
const { check } = require("express-validator");

router.get("/get-jobs", jobsControllers.getJobs);

router.get("/edit-job/:jid", jobsControllers.getJobByJobId);

router.use(checkAuth);

router.post("/new-job", jobsControllers.createJob);

router.patch(
  "/update-job/:jid",
  [
    check("title").not().isEmpty(),
    check("category").not().isEmpty(),
    check("description").not().isEmpty(),
    check("phone").not().isEmpty(),
    check("city").not().isEmpty(),
    check("price").isNumeric(),
  ],
  jobsControllers.updateJob
);

router.delete("/delete-job/:jid", jobsControllers.deleteJob);

module.exports = router;
