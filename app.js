const express = require("express");
const app = express();

app.get("/", (request, response) => {
  response.json("hello");
});

module.exports = app;
