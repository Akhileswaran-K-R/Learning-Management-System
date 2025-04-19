/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */

const express = require("express");
const app = express();
const {
  User,
  Course,
  Chapter,
  Pages,
  Enrollment,
  CompletedPages,
} = require("./models");
const path = require("path");
const bodyParser = require("body-parser");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.get("/", (request, response) => {
  response.render("index", {
    title: "Learning Management System",
  });
});

app.get("/signup/:role", (request, response) => {
  response.render("signup", {
    title: "Sign up",
    role: request.params.role,
  });
});

module.exports = app;
