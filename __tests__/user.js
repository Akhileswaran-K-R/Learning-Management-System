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

function extractCsrfTokenMeta(res) {
  const $ = cheerio.load(res.text);
  return $('meta[name="csrf-token"]').attr("content");
}

async function addCourse(agent) {
  const res = await agent.get("/courses/new");
  const csrfToken = extractCsrfToken(res);
  const response = await agent.post("/courses/new").send({
    title: "Java",
    _csrf: csrfToken,
  });

  return response;
}

async function addChapter(agent, id) {
  const res = await agent.get(`/courses/${id}/chapters/new`);
  const csrfToken = extractCsrfToken(res);

  const response = await agent.post(`/courses/${id}/chapters/new`).send({
    title: "Java is simple",
    description: "Basic syntax in java",
    _csrf: csrfToken,
  });

  return response;
}

async function addPage(agent, id) {
  const res = await agent.get(`/chapters/${id}/pages/new`);
  const csrfToken = extractCsrfToken(res);

  const response = agent.post(`/chapters/${id}/pages/new`).send({
    title: "Hello world",
    content: `System.out.println("Hello world");`,
    _csrf: csrfToken,
  });

  return response;
}

const login = async (agent, username, password, role) => {
  let res = await agent.get(`/login/${role}`);
  let csrfToken = extractCsrfToken(res);
  res = await agent.post("/session").send({
    email: username,
    password: password,
    role,
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

  test("Sign up for instructor", async () => {
    let res = await agent.get("/signup/Instructor");
    let csrfToken = extractCsrfToken(res);
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

  test("Sign up for student", async () => {
    let res = await agent.get("/signup/Student");
    let csrfToken = extractCsrfToken(res);
    res = await agent.post("/users").send({
      firstName: "Test",
      lastName: "User B",
      email: "user.b@test.com",
      password: "12345678",
      role: "Student",
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
    await login(agent, "user.a@test.com", "12345678", "Instructor");

    const response = await addCourse(agent);
    expect(response.statusCode).toBe(302);
  });

  test("Add Chapter", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@test.com", "12345678", "Instructor");
    await addCourse(agent);

    let groupedResponse = await agent
      .get("/courses")
      .set("Accept", "application/json");

    let parsedGroupedResponse = JSON.parse(groupedResponse.text);
    const courseCount = parsedGroupedResponse.courses.length;
    let latestCourse = parsedGroupedResponse.courses[courseCount - 1];

    const response = await addChapter(agent, latestCourse.id);
    expect(response.statusCode).toBe(302);
  });

  test("Add Page", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@test.com", "12345678", "Instructor");
    await addCourse(agent);

    let groupedResponse = await agent
      .get("/courses")
      .set("Accept", "application/json");

    let parsedGroupedResponse = JSON.parse(groupedResponse.text);
    const courseCount = parsedGroupedResponse.courses.length;
    let latestCourse = parsedGroupedResponse.courses[courseCount - 1];
    await addChapter(agent, latestCourse.id);

    groupedResponse = await agent
      .get(`/courses/${latestCourse.id}/chapters`)
      .set("Accept", "application/json");

    parsedGroupedResponse = JSON.parse(groupedResponse.text);
    const chapterCount = parsedGroupedResponse.chapters.length;
    let latestChapter = parsedGroupedResponse.chapters[chapterCount - 1];

    const response = await addPage(agent, latestChapter.id);
    expect(response.statusCode).toBe(302);
  });

  test("Edit Course", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@test.com", "12345678", "Instructor");
    await addCourse(agent);

    let groupedResponse = await agent
      .get("/courses")
      .set("Accept", "application/json");

    let parsedGroupedResponse = JSON.parse(groupedResponse.text);
    const courseCount = parsedGroupedResponse.courses.length;
    let latestCourse = parsedGroupedResponse.courses[courseCount - 1];

    const res = await agent.get(`/courses/${latestCourse.id}/edit`);
    const csrfToken = extractCsrfToken(res);
    await agent.post(`/courses/${latestCourse.id}/edit`).send({
      title: "Programming in Java",
      _csrf: csrfToken,
    });

    groupedResponse = await agent
      .get(`/courses/${latestCourse.id}/chapters`)
      .set("Accept", "application/json");
    parsedGroupedResponse = JSON.parse(groupedResponse.text);
    const { course } = parsedGroupedResponse;
    expect(course.title).toBe("Programming in Java");
  });

  test("Edit Chapter", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@test.com", "12345678", "Instructor");
    await addCourse(agent);

    let groupedResponse = await agent
      .get("/courses")
      .set("Accept", "application/json");

    let parsedGroupedResponse = JSON.parse(groupedResponse.text);
    const courseCount = parsedGroupedResponse.courses.length;
    let latestCourse = parsedGroupedResponse.courses[courseCount - 1];
    await addChapter(agent, latestCourse.id);

    groupedResponse = await agent
      .get(`/courses/${latestCourse.id}/chapters`)
      .set("Accept", "application/json");

    parsedGroupedResponse = JSON.parse(groupedResponse.text);
    const chapterCount = parsedGroupedResponse.chapters.length;
    let latestChapter = parsedGroupedResponse.chapters[chapterCount - 1];

    const res = await agent.get(`/chapters/${latestChapter.id}/edit`);
    const csrfToken = extractCsrfToken(res);
    await agent.post(`/chapters/${latestChapter.id}/edit`).send({
      title: "Java Foundation",
      description: "Basic programming in java",
      _csrf: csrfToken,
    });

    groupedResponse = await agent
      .get(`/chapters/${latestChapter.id}/pages`)
      .set("Accept", "application/json");
    parsedGroupedResponse = JSON.parse(groupedResponse.text);
    const { chapter } = parsedGroupedResponse;
    expect(chapter.title).toBe("Java Foundation");
  });

  test("Edit Page", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@test.com", "12345678", "Instructor");
    await addCourse(agent);

    let groupedResponse = await agent
      .get("/courses")
      .set("Accept", "application/json");

    let parsedGroupedResponse = JSON.parse(groupedResponse.text);
    const courseCount = parsedGroupedResponse.courses.length;
    let latestCourse = parsedGroupedResponse.courses[courseCount - 1];
    await addChapter(agent, latestCourse.id);

    groupedResponse = await agent
      .get(`/courses/${latestCourse.id}/chapters`)
      .set("Accept", "application/json");

    parsedGroupedResponse = JSON.parse(groupedResponse.text);
    const chapterCount = parsedGroupedResponse.chapters.length;
    let latestChapter = parsedGroupedResponse.chapters[chapterCount - 1];
    await addPage(agent, latestChapter.id);

    groupedResponse = await agent
      .get(`/chapters/${latestChapter.id}/pages`)
      .set("Accept", "application/json");

    parsedGroupedResponse = JSON.parse(groupedResponse.text);
    const pageCount = parsedGroupedResponse.pages.length;
    let latestPage = parsedGroupedResponse.pages[pageCount - 1];

    const res = await agent.get(`/pages/${latestPage.id}/edit`);
    const csrfToken = extractCsrfToken(res);
    await agent.post(`/pages/${latestPage.id}/edit`).send({
      title: "A program for printing Hello world",
      content: `System.out.println("Hello world");`,
      _csrf: csrfToken,
    });

    groupedResponse = await agent
      .get(`/pages/${latestPage.id}`)
      .set("Accept", "application/json");
    parsedGroupedResponse = JSON.parse(groupedResponse.text);
    const { page } = parsedGroupedResponse;
    expect(page.title).toBe("A program for printing Hello world");
  });

  test("Delete Course", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@test.com", "12345678", "Instructor");
    await addCourse(agent);

    let groupedResponse = await agent
      .get("/courses")
      .set("Accept", "application/json");

    let parsedGroupedResponse = JSON.parse(groupedResponse.text);
    const courseCount = parsedGroupedResponse.courses.length;
    let latestCourse = parsedGroupedResponse.courses[courseCount - 1];

    const res = await agent.get(`/courses/${latestCourse.id}/chapters`);
    const csrfToken = extractCsrfTokenMeta(res);

    const deleteResponse = await agent
      .delete(`/courses/${latestCourse.id}/chapters`)
      .send({
        _csrf: csrfToken,
      });

    const result = JSON.parse(deleteResponse.text);
    expect(result).toBe(true);
  });

  test("Delete Chapter", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@test.com", "12345678", "Instructor");
    await addCourse(agent);

    let groupedResponse = await agent
      .get("/courses")
      .set("Accept", "application/json");

    let parsedGroupedResponse = JSON.parse(groupedResponse.text);
    const courseCount = parsedGroupedResponse.courses.length;
    let latestCourse = parsedGroupedResponse.courses[courseCount - 1];
    await addChapter(agent, latestCourse.id);

    groupedResponse = await agent
      .get(`/courses/${latestCourse.id}/chapters`)
      .set("Accept", "application/json");

    parsedGroupedResponse = JSON.parse(groupedResponse.text);
    const chapterCount = parsedGroupedResponse.chapters.length;
    let latestChapter = parsedGroupedResponse.chapters[chapterCount - 1];

    const res = await agent.get(`/chapters/${latestChapter.id}/pages`);
    const csrfToken = extractCsrfTokenMeta(res);

    const deleteResponse = await agent
      .delete(`/chapters/${latestChapter.id}/pages`)
      .send({
        _csrf: csrfToken,
      });

    const result = JSON.parse(deleteResponse.text);
    expect(result).toBe(true);
  });

  test("Delete Page", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@test.com", "12345678", "Instructor");
    await addCourse(agent);

    let groupedResponse = await agent
      .get("/courses")
      .set("Accept", "application/json");

    let parsedGroupedResponse = JSON.parse(groupedResponse.text);
    const courseCount = parsedGroupedResponse.courses.length;
    let latestCourse = parsedGroupedResponse.courses[courseCount - 1];
    await addChapter(agent, latestCourse.id);

    groupedResponse = await agent
      .get(`/courses/${latestCourse.id}/chapters`)
      .set("Accept", "application/json");

    parsedGroupedResponse = JSON.parse(groupedResponse.text);
    const chapterCount = parsedGroupedResponse.chapters.length;
    let latestChapter = parsedGroupedResponse.chapters[chapterCount - 1];
    await addPage(agent, latestChapter.id);

    groupedResponse = await agent
      .get(`/chapters/${latestChapter.id}/pages`)
      .set("Accept", "application/json");

    parsedGroupedResponse = JSON.parse(groupedResponse.text);
    const pageCount = parsedGroupedResponse.pages.length;
    let latestPage = parsedGroupedResponse.pages[pageCount - 1];

    const res = await agent.get(`/pages/${latestPage.id}`);
    const csrfToken = extractCsrfTokenMeta(res);

    const deleteResponse = await agent.delete(`/pages/${latestPage.id}`).send({
      _csrf: csrfToken,
    });

    const result = JSON.parse(deleteResponse.text);
    expect(result).toBe(true);
  });

  test("Enroll", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@test.com", "12345678", "Instructor");
    await addCourse(agent);

    let groupedResponse = await agent
      .get("/courses")
      .set("Accept", "application/json");

    let parsedGroupedResponse = JSON.parse(groupedResponse.text);
    const courseCount = parsedGroupedResponse.courses.length;
    let latestCourse = parsedGroupedResponse.courses[courseCount - 1];

    await login(agent, "user.b@test.com", "12345678", "Student");
    const res = await agent.get(`/home`);
    const csrfToken = extractCsrfTokenMeta(res);
    const enrollResponse = await agent
      .post(`/courses/${latestCourse.id}/enroll`)
      .send({ _csrf: csrfToken });

    const result = JSON.parse(enrollResponse.text);
    expect(result).toBe(true);
  });

  test("Unenroll", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@test.com", "12345678", "Instructor");
    await addCourse(agent);

    let groupedResponse = await agent
      .get("/courses")
      .set("Accept", "application/json");

    let parsedGroupedResponse = JSON.parse(groupedResponse.text);
    const courseCount = parsedGroupedResponse.courses.length;
    let latestCourse = parsedGroupedResponse.courses[courseCount - 1];

    await login(agent, "user.b@test.com", "12345678", "Student");
    let res = await agent.get(`/home`);
    let csrfToken = extractCsrfTokenMeta(res);
    await agent
      .post(`/courses/${latestCourse.id}/enroll`)
      .send({ _csrf: csrfToken });

    res = await agent.get(`/courses`);
    csrfToken = extractCsrfTokenMeta(res);
    const unenrollResponse = await agent
      .delete(`/courses/${latestCourse.id}/unenroll`)
      .send({ _csrf: csrfToken });

    const result = JSON.parse(unenrollResponse.text);
    expect(result).toBe(true);
  });

  test("Mark as Complete", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@test.com", "12345678", "Instructor");
    await addCourse(agent);

    let groupedResponse = await agent
      .get("/courses")
      .set("Accept", "application/json");

    let parsedGroupedResponse = JSON.parse(groupedResponse.text);
    const courseCount = parsedGroupedResponse.courses.length;
    let latestCourse = parsedGroupedResponse.courses[courseCount - 1];
    await addChapter(agent, latestCourse.id);

    groupedResponse = await agent
      .get(`/courses/${latestCourse.id}/chapters`)
      .set("Accept", "application/json");

    parsedGroupedResponse = JSON.parse(groupedResponse.text);
    const chapterCount = parsedGroupedResponse.chapters.length;
    let latestChapter = parsedGroupedResponse.chapters[chapterCount - 1];
    await addPage(agent, latestChapter.id);

    groupedResponse = await agent
      .get(`/chapters/${latestChapter.id}/pages`)
      .set("Accept", "application/json");

    parsedGroupedResponse = JSON.parse(groupedResponse.text);
    const pageCount = parsedGroupedResponse.pages.length;
    let latestPage = parsedGroupedResponse.pages[pageCount - 1];

    await login(agent, "user.b@test.com", "12345678", "Student");
    let res = await agent.get(`/home`);
    let csrfToken = extractCsrfTokenMeta(res);
    await agent
      .post(`/courses/${latestCourse.id}/enroll`)
      .send({ _csrf: csrfToken });

    res = await agent.get(`/pages/${latestPage.id}`);
    csrfToken = extractCsrfTokenMeta(res);

    const markAsCompleteResponse = await agent
      .post(`/pages/${latestPage.id}`)
      .send({ _csrf: csrfToken });
    const result = JSON.parse(markAsCompleteResponse.text);
    expect(result).toBe(true);
  });
});
