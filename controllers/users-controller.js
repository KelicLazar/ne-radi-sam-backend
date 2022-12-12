const HttpError = require("../models/http-error");
const User = require("../models/user");
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

//SIGNUP
const signUp = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data", 422)
    );
  }
  const { name, email, password, phone } = req.body;
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (error) {
    return next(
      new HttpError("Signing up failed, please try again used email", 500)
    );
  }

  if (existingUser) {
    return next(new HttpError("Email already in use, try different one", 422));
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (error) {
    return next(new HttpError("Could not create use, please try again.", 500));
  }

  const createdUser = new User({
    name,
    email,
    phone,
    password: hashedPassword,
    image: req.file.path,
    notifications: [],
    rating: [],
    places: [],
  });

  try {
    await createdUser.save();
  } catch (error) {
    return next(new HttpError("Could not sign up, try again.", 500));
  }

  let token;

  try {
    token = jwt.sign(
      {
        userId: createdUser.id,
        email: createdUser.email,
      },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (error) {
    return next(new HttpError("Signing up failed", 500));
  }
  let userData = {
    id: createdUser.id,
    email: createdUser.email,
    name: createdUser.name,
    phone: createdUser.phone,
    image: createdUser.image,
    jobs: createdUser.jobs,
    rating: createdUser.rating,
    notifications: createdUser.notifications,
  };

  res.status(201).json({
    userData,
    token,
  });
};

//LOGIN
const logIn = async (req, res, next) => {
  const { email } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email }).populate([
      {
        path: "jobs",
        populate: {
          path: "creator",
          model: "User",
        },
      },
      {
        path: "notifications",
        model: "Notification",
        populate: {
          path: "byUser",
          select: "image name ",
          model: "User",
        },
      },
    ]);
  } catch (error) {
    return next(new HttpError("Logging in failed, please try again", 500));
  }

  if (!existingUser) {
    return next(new HttpError("Invalid credentials, please try again.", 403));
  }

  let isValidPassword;
  try {
    isValidPassword = await bcrypt.compare(
      req.body.password,
      existingUser.password
    );
  } catch (error) {
    return next(
      new HttpError("Could not log you in, check your credentials.", 500)
    );
  }
  if (!isValidPassword) {
    return next(new HttpError("Invalid credentials, please try again.", 403));
  }
  let token;
  try {
    token = jwt.sign(
      { userId: existingUser.id, email: existingUser.email },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (error) {
    return next(new HttpError("Logging in faileddd", 500));
  }

  existingUser.password = undefined;
  existingUser.id = existingUser._id;

  res.json({ userData: existingUser, token });
};

const getUserDataById = async (req, res, next) => {
  const userId = req.params.uid;

  let userWithJobs;
  try {
    userWithJobs = await User.findById(userId, "-password").populate([
      {
        path: "jobs",
        model: "Job",
        populate: {
          path: "creator",
          select: "-password",
          model: "User",
        },
      },
      {
        path: "rating",
        model: "Rating",
        populate: {
          path: "byUser",
          model: "User",
          select: "name image",
        },
      },
      {
        path: "notifications",
        model: "Notification",
        populate: {
          path: "byUser",
          model: "User",
          select: "name image",
        },
      },
      {
        path: "jobs",
        model: "Job",
        populate: {
          path: "creator",
          model: "User",
          select: "-password",
          populate: {
            path: "rating",
            model: "Rating",
          },
        },
      },
    ]);
  } catch (error) {
    return next(
      new HttpError(
        "Something went wrong, could not find jobs from this user",
        500
      )
    );
  }
  if (!userWithJobs) {
    return next(
      new HttpError("Could not find jobs from the provided user id.", 406)
    );
  }

  res.json({ userData: userWithJobs.toObject({ getters: true }) });
};

const getUserById = async (req, res, next) => {
  const userId = req.params.uid;
  let user;

  try {
    user = await User.findById(userId, "-password");
  } catch (error) {
    return next(
      new HttpError("Something went wrong, could not find user", 500)
    );
  }

  if (!user) {
    return next(new HttpError("There is no user with that id.", 404));
  }
  res.json({ user: user.toObject({ getters: true }) });
};

const updateUser = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data", 422)
    );
  }
  const { name, phone } = req.body;

  let user;

  try {
    user = await User.findById(req.userData, "-password");
  } catch (error) {
    return next(
      new HttpError(
        "Something went wrong, could not find user with that id.",
        500
      )
    );
  }

  user.name = name;
  user.phone = phone;
  user.image = req.file.path;

  try {
    await user.save();
  } catch (error) {
    return next(new HttpError("Could not edit user, try again.", 500));
  }

  res.status(200).json({ user: user.toObject({ getters: true }) });
};

const changePassword = async (req, res, next) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    return next(
      new HttpError(
        "Confirm password input field is not matching new password field.",
        400
      )
    );
  }

  let user;

  try {
    user = await User.findById(req.userData);
  } catch (error) {
    return next(new HttpError("Could not find user with this id.", 500));
  }

  let isValidPassword;
  try {
    isValidPassword = await bcrypt.compare(currentPassword, user.password);
  } catch (error) {
    return next(
      new HttpError("Invalid input, please check inputs and try again.", 500)
    );
  }
  if (!isValidPassword) {
    return next(new HttpError("Invalid credentials, please try again.", 403));
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(newPassword, 12);
  } catch (error) {
    return next(
      new HttpError("Could not change password, please try again.", 500)
    );
  }

  user.password = hashedPassword;

  await user.save();

  res.json({ message: "Succesfully change password!" });
};

exports.signUp = signUp;
exports.logIn = logIn;
exports.getUserDataById = getUserDataById;
exports.getUserById = getUserById;
exports.updateUser = updateUser;
exports.changePassword = changePassword;
