const express = require("express");
const userController = require("../controllers/users-controller");
const { check } = require("express-validator");
const fileUpload = require("../middleware/file-upload");
const router = express.Router();
const checkAuth = require("../middleware/check-auth");

router.get("/user-info/:uid", userController.getUserDataById);

router.get("/edit-user/:uid", userController.getUserById);

router.post(
  "/sign-up",
  fileUpload.single("image"),
  [
    check("name").not().isEmpty(),
    check("email").normalizeEmail().isEmail(),
    check("password").isLength({ min: 6 }),
  ],

  userController.signUp
);

router.post("/log-in", userController.logIn);

router.use(checkAuth);

router.patch(
  "/change-password",
  [
    check("currentPassword").isLength({ min: 6 }),
    check("newPassword").isLength({ min: 6 }),
    check("confirmPassword").isLength({ min: 6 }),
  ],
  userController.changePassword
);

router.patch(
  "/edit-user",
  fileUpload.single("image"),
  [check("name").not().isEmpty(), check("phone").not().isEmpty()],
  userController.updateUser
);

module.exports = router;
