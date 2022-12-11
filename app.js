const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const jobRoutes = require("./routes/job-routes");
const userRoutes = require("./routes/user-routes");
const otherRoutes = require("./routes/other-routes");
const HttpError = require("./models/http-error");
const path = require("path");
const fs = require("fs");
var cors = require("cors");

const app = express();

app.use(bodyParser.json());

app.use("/uploads/images", express.static(path.join("uploads", "images")));

app.use(cors());

app.use("/api/jobs", jobRoutes);

app.use("/api/users", userRoutes);

app.use("/api/others", otherRoutes);

app.use("*", (req, res, next) => {
  return next(
    new HttpError(
      "Something went wrong, check your request and try again.",
      400
    )
  );
});
app.use((req, res, next) => {
  res.sendFile(path.resolve(__dirname, "public", "index.html"));
});

app.use((error, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, (err) => {
      console.log(err);
    });
  }
  if (res.headersSent) {
    return next(error);
  }
  res.status(typeof error.code === "number" ? error.code : 500);
  res.json({ message: error.message || "An unknown error occurred!" });
});

mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0-react.j3wql.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`
  )
  .then(() => {
    app.listen(process.env.PORT || 5000);
  })
  .catch((err) => console.log(err));
