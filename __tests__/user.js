/* eslint-disable no-undef */
const request = require("supertest");
const db = require("../models/index");
const app = require("../app");
const cheerio = require("cheerio");

let server, agent;

function extractCsrfToken(res) {
  const $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}

describe("User test suite", () => {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(4000);
    agent = request.agent(server);
  });

  afterAll(async () => {
    await db.sequelize.close();
    server.close();
  });

  test("Sign up by instructor", async () => {
    let res = await agent.get("/signup/Instructor");
    const csrfToken = extractCsrfToken(res);
    res = await agent.post("/users").send({
      firstName: "Test",
      lastName: "User A",
      email: "user.a@test.com",
      password: "12345678",
      role: "Instructor",
      _csrf: csrfToken,
    });
    console.log(res);
    expect(res.statusCode).toBe(200);
  });

  test("Sign up by student", async () => {
    let res = await agent.get("/signup/Student");
    const csrfToken = extractCsrfToken(res);
    res = await agent.post("/users").send({
      firstName: "Test",
      lastName: "User A",
      email: "user.a@test.com",
      password: "12345678",
      role: "Student",
      _csrf: csrfToken,
    });
    console.log(res);
    expect(res.statusCode).toBe(200);
  });
});
