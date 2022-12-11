const HttpError = require("../models/http-error");
const Job = require("../models/job");
const User = require("../models/user");
const mongoose = require("mongoose");
const { validationResult } = require("express-validator");

const getJobs = async (req, res, next) => {
  let jobs;
  try {
    jobs = await Job.find().populate([
      {
        path: "creator",
        model: "User",
        select: "-password",
        populate: { path: "rating", model: "Rating" },
      },
    ]);
  } catch (error) {
    return next(new HttpError("Could not find jobs.", 404));
  }

  res.json({ jobs: jobs.map((job) => job.toObject({ getters: true })) });
};

const getJobByJobId = async (req, res, next) => {
  const jobId = req.params.jid;
  let job;

  try {
    job = await Job.findById(jobId);
  } catch (error) {
    return next(new HttpError("Something went wrong, could not find job", 500));
  }

  if (!job) {
    return next(new HttpError("There is no job with that id.", 404));
  }
  res.json({ job: job.toObject({ getters: true }) });
};

const createJob = async (req, res, next) => {
  const { category, price, title, city, description, phone, userId } = req.body;

  const createdJob = new Job({
    title,
    city,
    description,
    phone,
    price,
    category: category.toUpperCase(),
    creator: userId,
    dateCreated: new Date().getTime(),
  });

  let user;

  try {
    user = await User.findById(userId);
  } catch (error) {
    return next(new HttpError("Creating place failed , try again.", 500));
  }

  if (!user) {
    return next(new HttpError("Could not find user for provided id", 404));
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdJob.save({ session: sess });
    user.jobs.push(createdJob);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (error) {
    return next(new HttpError("Creating place failed, please try again", 500));
  }

  res.status(201).json({ job: createdJob });
};

const updateJob = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data", 422)
    );
  }
  const { category, price, title, city, description, phone } = req.body;
  const jobId = req.params.jid;

  let job;

  try {
    job = await Job.findById(jobId);
  } catch (error) {
    return next(
      new HttpError(
        "Something went wrong, could not find job with that id.",
        500
      )
    );
  }
  if (job.creator.toString() !== req.userData) {
    return next(new HttpError("You are not allowed to edit this job.", 401));
  }

  job.title = title;
  job.description = description;
  job.price = price;
  job.city = city;
  job.category = category;
  job.phone = phone;

  try {
    await job.save();
  } catch (error) {
    return next(new HttpError("Could not update job, try again.", 500));
  }
  res.status(200).json({ job: job.toObject({ getters: true }) });
};

const deleteJob = async (req, res, next) => {
  const jobId = req.params.jid;
  let job;
  try {
    job = await Job.findById(jobId).populate("creator");
  } catch (error) {
    return next(new HttpError("Could not delete job, try again.", 500));
  }
  if (!job) {
    return next(new HttpError("Could not find job for this id", 404));
  }
  if (job.creator.id !== req.body.userId) {
    return next(new HttpError("You are not allowed to delete this job.", 401));
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await job.remove({ session: sess });
    job.creator.jobs.pull(job);
    await job.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (error) {
    return next(new HttpError("Could not delete job"), 500);
  }

  res.status(200).json({ ok: true });
};

exports.getJobs = getJobs;
exports.getJobByJobId = getJobByJobId;
exports.createJob = createJob;
exports.updateJob = updateJob;
exports.deleteJob = deleteJob;
