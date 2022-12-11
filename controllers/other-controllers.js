const mongoose = require("mongoose");
const HttpError = require("../models/http-error");
const Message = require("../models/contact-us");
const User = require("../models/user");
const Rating = require("../models/rating");
const Notification = require("../models/notification");

const sendMessage = async (req, res, next) => {
  const { sender, message } = req.body;

  const newMessage = new Message({
    email: sender,
    message,
  });

  try {
    await newMessage.save();
  } catch (error) {
    return next(new HttpError("Could not send message.", 500));
  }

  res.status(201).json({ ok: true });
};

const giveRating = async (req, res, next) => {
  const { rate, comment, userToRate } = req.body;

  let user;
  let userToBeRated;

  try {
    user = await User.findById(req.body.userId, "-password");
  } catch (error) {
    console.log("Could not finish request", error);
    return next(new HttpError("Could not finish request", 400));
  }

  try {
    userToBeRated = await User.findById(userToRate, "-password");
  } catch (error) {
    return next(new HttpError("Could not finish request", 400));
  }

  const rating = new Rating({
    rate,
    comment,
    dateCreated: new Date().getTime(),
    byUser: user,
  });

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await rating.save({ session: sess });
    userToBeRated.rating.push(rating);
    await userToBeRated.save({ session: sess });
    await sess.commitTransaction();
  } catch (error) {
    return next(new HttpError("Could not rate user."), 500);
  }

  res.status(201).json({ ok: true });
};

const getNotifications = async (req, res, next) => {
  const userId = req.params.uid;

  let user;
  try {
    user = await User.findById(userId).populate({
      path: "notifications",
      model: "Notification",
      populate: {
        path: "byUser",
        model: "User",
      },
    });
  } catch (error) {}

  if (!user) {
    return next(new HttpError("There is no user with that id.", 404));
  }

  res.json({
    notifications: user.notifications.map((item) =>
      item.toObject({ getters: true })
    ),
  });
};

const createNotification = async (req, res, next) => {
  const { type, userId, forUser } = req.body;
  let forJob = null;
  if (req.body.forJob) {
    forJob = req.body.forJob;
  }

  if (userId === forUser && type !== "order") {
    return next(new HttpError("You can't hire yourself."));
  }

  let authedUser;
  try {
    authedUser = await User.findById(userId, "-password").populate({
      path: "rating",
      model: "Rating",
      populate: {
        path: "byUser",
        model: "User",
      },
    });
  } catch (error) {
    return next(new HttpError("Could not finish request.(1)", 400));
  }

  let userToReceiveNotification;

  try {
    userToReceiveNotification = await User.findById(
      forUser,
      "-password"
    ).populate({
      path: "notifications",
      model: "Notification",
      populate: {
        path: "byUser",
        model: "User",
      },
    });
  } catch (error) {
    return next(new HttpError("Could not finish request.(2)", 400));
  }
  let notificationExists = false;

  userToReceiveNotification.notifications.forEach((notif) => {
    if (
      notif.type === type &&
      notif.forJob === forJob &&
      notif.byUser.id === userId
    ) {
      notificationExists = true;
    }
  });

  if (notificationExists) {
    return next(
      new HttpError("You already sent offer to this user for this job")
    );
  }

  let userAlreadyRateYou = false;

  if (type === "rate") {
    authedUser.rating.forEach((rating) => {
      if (rating.byUser.id === userToReceiveNotification.id) {
        userAlreadyRateYou = true;
      }
    });
  }

  if (userAlreadyRateYou) {
    console.log("this user wont be able to rate you again");

    res.status(201).json({ ok: true });
    return;
  }
  const notification = new Notification({
    type,
    date: new Date().getTime(),
    forJob,
    byUser: authedUser,
  });

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await notification.save({ session: sess });
    userToReceiveNotification.notifications.push(notification);
    await userToReceiveNotification.save({ session: sess });
    await sess.commitTransaction();
  } catch (error) {
    return next(new HttpError("Could not finish request.(3)", 400));
  }

  res.status(201).json({ ok: true });
};

const createOrder = async (req, res, next) => {
  const { type, userId, fromUser } = req.body;

  if (type !== "order") {
    return next(new HttpError("Wrong request."));
  }

  let forJob = null;
  if (req.body.forJob) {
    forJob = req.body.forJob;
  }

  let authedUser;

  try {
    authedUser = await User.findById(userId, "-password");
  } catch (error) {
    return next(new HttpError("Could not finish request.(1)", 400));
  }

  let orderFromUser;

  try {
    orderFromUser = await User.findById(fromUser, "-password");
  } catch (error) {
    return next(new HttpError("Could not finish request.(2)", 400));
  }

  const orderNotification = new Notification({
    type,
    date: new Date().getTime(),
    forJob,
    byUser: orderFromUser,
  });

  const acceptedOfferNotification = new Notification({
    type: "acceptedOffer",
    date: new Date().getTime(),
    forJob,
    byUser: authedUser,
  });

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await orderNotification.save({ session: sess });
    authedUser.notifications.push(orderNotification);
    await authedUser.save({ session: sess });

    await acceptedOfferNotification.save({ session: sess });
    orderFromUser.notifications.push(acceptedOfferNotification);
    await orderFromUser.save({ session: sess });

    await sess.commitTransaction();
  } catch (error) {
    return next(new HttpError("Could not finish request.(3)", 400));
  }

  res.status(201).json({ ok: true });
};

const deleteNotification = async (req, res, next) => {
  const userId = req.body.userId;
  const notifId = req.params.nid;

  let user;
  try {
    user = await User.findById(userId).populate({
      path: "notifications",
      model: "Notification",
      populate: {
        path: "byUser",
        model: "User",
        select: "name image",
      },
    });
  } catch (error) {
    return next(new HttpError("Could not find user."), 500);
  }

  let notification;
  try {
    notification = await Notification.findById(notifId);
  } catch (error) {
    return next(new HttpError("Could not find notification."), 500);
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await notification.remove({ session: sess });
    user.notifications.pull(notification);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (error) {
    console.log(error);
    return next(new HttpError("Could not delete notification."), 500);
  }
  res.status(200).json({
    notifications: user.notifications.map((notifs) =>
      notifs.toObject({ getters: true })
    ),
  });
};

exports.sendMessage = sendMessage;
exports.giveRating = giveRating;
exports.getNotifications = getNotifications;
exports.createNotification = createNotification;
exports.createOrder = createOrder;
exports.deleteNotification = deleteNotification;
