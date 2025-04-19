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

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));

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

app.post("/users", async (request, response) => {
  console.log(request.body);
  try {
    const user = await User.addUser({
      firstName: request.body.firstName,
      lastName: request.body.lastName,
      email: request.body.email,
      password: request.body.password,
      role: request.body.role,
    });
    return response.json(user);
  } catch (error) {
    console.error(error);
  }
});

module.exports = app;
