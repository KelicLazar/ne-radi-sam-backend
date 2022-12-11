const express = require("express");
const HttpError = require("../models/http-error");
const Message = require("../models/contact-us");
const otherControlers = require("../controllers/other-controllers");
const router = express.Router();
const checkAuth = require("../middleware/check-auth");

router.post("/contact-us", otherControlers.sendMessage);

router.get("/get-notifications/:uid", otherControlers.getNotifications);

router.use(checkAuth);
router.delete("/delete-notification/:nid", otherControlers.deleteNotification);

router.post("/post-notification", otherControlers.createNotification);
router.post("/post-order", otherControlers.createOrder);

router.post("/give-rating", otherControlers.giveRating);

module.exports = router;
