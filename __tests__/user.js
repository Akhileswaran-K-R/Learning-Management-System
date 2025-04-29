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

const login = async (agent, username, password) => {
  let res = await agent.get("/login");
  let csrfToken = extractCsrfToken(res);
  res = await agent.post("/session").send({
    email: username,
    password: password,
    role: "Instructor",
    _csrf: csrfToken,
  });
};

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

  test("Sign up", async () => {
    let res = await agent.get("/signup");
    const csrfToken = extractCsrfToken(res);
    res = await agent.post("/users").send({
      firstName: "Test",
      lastName: "User A",
      email: "user.a@test.com",
      password: "12345678",
      role: "Instructor",
      _csrf: csrfToken,
    });
    expect(res.statusCode).toBe(302);
  });

  test("Sign out", async () => {
    let res = await agent.get("/home");
    expect(res.statusCode).toBe(200);
    res = await agent.get("/signout");
    expect(res.statusCode).toBe(302);
    res = await agent.get("/home");
    expect(res.statusCode).toBe(302);
  });

  test("Add Course", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@test.com", "12345678");

    const res = await agent.get("/courses/new");
    const csrfToken = extractCsrfToken(res);
    const response = await agent.post("/courses/new").send({
      title: "Java",
      _csrf: csrfToken,
    });

    expect(response.statusCode).toBe(302);
  });

  test("Add Chapter", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@test.com", "12345678");

    let groupedTodosResponse = await agent
      .get("/courses")
      .set("Accept", "application/json");

    let parsedGroupedResponse = JSON.parse(groupedTodosResponse.text);
    const courseCount = parsedGroupedResponse.courses.length;
    let latestCourse = parsedGroupedResponse.courses[courseCount - 1];

    const res = await agent.get(`/courses/${latestCourse.id}/chapters/new`);
    const csrfToken = extractCsrfToken(res);

    const response = await agent
      .post(`/courses/${latestCourse.id}/chapters/new`)
      .send({
        title: "Java is simple",
        description: "Basic syntax in java",
        _csrf: csrfToken,
      });

    expect(response.statusCode).toBe(302);
  });

  test("Add Page", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@test.com", "12345678");

    let groupedTodosResponse = await agent
      .get("/courses")
      .set("Accept", "application/json");

    let parsedGroupedResponse = JSON.parse(groupedTodosResponse.text);
    const courseCount = parsedGroupedResponse.courses.length;
    let latestCourse = parsedGroupedResponse.courses[courseCount - 1];

    groupedTodosResponse = await agent
      .get(`/courses/${latestCourse.id}/chapters`)
      .set("Accept", "application/json");

    parsedGroupedResponse = JSON.parse(groupedTodosResponse.text);
    const chapterCount = parsedGroupedResponse.chapters.length;
    let latestChapter = parsedGroupedResponse.chapters[chapterCount - 1];

    const res = await agent.get(`/chapters/${latestChapter.id}/pages/new`);
    const csrfToken = extractCsrfToken(res);

    const response = await agent
      .post(`/chapters/${latestChapter.id}/pages/new`)
      .send({
        title: "Hello world",
        content: `System.out.println("Hello world");`,
        _csrf: csrfToken,
      });

    expect(response.statusCode).toBe(302);
  });
});
