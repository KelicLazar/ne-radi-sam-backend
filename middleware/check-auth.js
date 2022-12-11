const HttpError = require("../models/http-error");
const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    if (!token) {
      throw new Error("Auth failed");
    }
    const decodedToken = jwt.verify(token, "process.env.JWT_KEY");
    if (req.method === "PATCH") {
      req.userData = decodedToken.userId;
    } else {
      req.body.userId = decodedToken.userId;
    }
    next();
  } catch (error) {
    return next(new HttpError("Authentication failed", 403));
  }
};
