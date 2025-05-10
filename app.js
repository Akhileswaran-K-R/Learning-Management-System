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
const csrf = require("tiny-csrf");
const cookieParser = require("cookie-parser");

const passport = require("passport");
const connectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const flash = require("connect-flash");
app.use(flash());

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("shh! some secret string"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "my-super-secret-key-21728172615261562",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, //24hrs
    },
  }),
);

app.use((request, response, next) => {
  response.locals.messages = request.flash();
  next();
});

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      User.findOne({
        where: {
          email: username,
        },
      })
        .then(async (user) => {
          if (user) {
            const result = await bcrypt.compare(password, user.password);
            if (result) {
              return done(null, user);
            } else {
              return done(null, false, { message: "Invalid password" });
            }
          } else {
            return done(null, false, { message: "Invalid username" });
          }
        })
        .catch((error) => {
          return error;
        });
    },
  ),
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((error) => {
      done(error, null);
    });
});

function requireInstructor(req, res, next) {
  if (req.user && req.user.role === "Instructor") {
    return next();
  } else {
    res.status(401).json({ message: "Unauthorized user." });
  }
}

function requireStudent(req, res, next) {
  if (req.user && req.user.role === "Student") {
    return next();
  } else {
    res.status(401).json({ message: "Unauthorized user." });
  }
}

async function requireAuthor(req, res, next) {
  const id = req.params.id;
  const page = await Pages.findPage(id);
  let chapter, course;

  if (page) {
    chapter = await page.getChapter();
  } else {
    chapter = await Chapter.findChapter(id);
  }

  if (chapter) {
    course = await chapter.getCourse();
  } else {
    course = await Course.findCourse(id);
  }

  const instructor = await course.getUser();
  if (instructor.id === req.user.id) {
    return next();
  } else {
    res.status(401).json({ message: "Unauthorized user." });
  }
}

async function requireEnrolled(req, res, next) {
  if (req.user.role === "Instructor") {
    return next();
  }

  const id = req.params.id;
  const page = await Pages.findPage(id);
  let chapter, course;

  if (page) {
    chapter = await page.getChapter();
  } else {
    chapter = await Chapter.findChapter(id);
  }

  if (chapter) {
    course = await chapter.getCourse();
  } else {
    course = await Course.findCourse(id);
  }

  const isEnrolled = await Enrollment.checkEnrollment(req.user.id, course.id);
  if (isEnrolled) {
    return next();
  } else {
    req.flash("error", "Please enroll to access the chapters");
    return res.redirect(`/courses/${course.id}/chapters`);
  }
}

app.get("/", (request, response) => {
  if (request.user) {
    return response.redirect("/home");
  } else {
    return response.render("index", {
      title: "Learning Management System",
    });
  }
});

app.get("/signup/:role", (request, response) => {
  response.render("signup", {
    title: "Sign up",
    role: request.params.role,
    csrfToken: request.csrfToken(),
  });
});

app.get("/signout", (request, response, next) => {
  request.logout((err) => {
    if (err) {
      return next(err);
    }
    return response.redirect("/");
  });
});

app.get("/login/:role", (request, response) => {
  response.render("login", {
    title: "Login",
    role: request.params.role,
    csrfToken: request.csrfToken(),
  });
});

app.post("/users", async (request, response) => {
  const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
  try {
    const user = await User.addUser({
      firstName: request.body.firstName,
      lastName: request.body.lastName,
      email: request.body.email,
      password: hashedPwd,
      role: request.body.role,
    });

    request.login(user, (err) => {
      if (err) {
        throw err;
      }
      return response.redirect(`/home`);
    });
  } catch (error) {
    const msg = error.errors[0].message;
    request.flash("error", msg);
    return response.redirect("/signup");
  }
});

app.post(
  "/session",
  (request, response, next) => {
    const callback = passport.authenticate("local", {
      failureRedirect: `/login/${request.body.role}`,
      failureFlash: true,
    });
    return callback(request, response, next);
  },
  (request, response) => {
    if (request.body.role === request.user.role) {
      return response.redirect(`/home`);
    } else {
      request.logout((err) => {
        if (err) {
          return next(err);
        }
        const msg = "Please login using the respective portal";
        request.flash("error", msg);
        return response.redirect(`/`);
      });
    }
  },
);

app.get("/update", connectEnsureLogin.ensureLoggedIn(), (request, response) => {
  response.render("updatePassword", {
    title: "Update password",
    csrfToken: request.csrfToken(),
  });
});

app.post(
  "/update",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const result = await bcrypt.compare(
      request.body.oldPassword,
      request.user.password,
    );

    if (result) {
      const hashedPwd = await bcrypt.hash(request.body.newPassword, saltRounds);
      try {
        await User.updatePassword(request.user.id, hashedPwd);
        request.logout((err) => {
          if (err) {
            return next(err);
          }
          return response.redirect(`/`);
        });
      } catch (error) {
        const msg = error.errors[0].message;
        request.flash("error", msg);
        return response.redirect("/signup");
      }
    } else {
      request.flash("error", "Password is wrong");
      return response.redirect(`/update`);
    }
  },
);

app.get(
  "/home",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      let courses;
      if (request.user.role === "Instructor") {
        courses = await Course.getAvailableInstructorCourses(
          User,
          request.user.id,
        );
      } else {
        courses = await Course.getAvailableStudentCourses(
          User,
          Enrollment,
          request.user.id,
        );
      }

      const user = await User.findByPk(request.user.id);
      const name = user.firstName + " " + user.lastName;

      for (const course of courses) {
        course.count = await Enrollment.getCourseEnrolledCount(course.id);
      }

      if (request.accepts("html")) {
        response.render("home", {
          title: "Learning Management System",
          name,
          role: request.user.role,
          courses,
          csrfToken: request.csrfToken(),
        });
      } else {
        return response.json({ courses });
      }
    } catch (error) {
      console.error(error);
    }
  },
);

app.get(
  "/courses",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const instructor = await User.findInstructor(request.user.id);

      let courses;
      if (request.user.role === "Instructor") {
        courses = await instructor.getCourses({
          include: User,
          order: [["createdAt", "ASC"]],
        });
      } else {
        courses = await Course.getEnrolledCourses(
          User,
          Enrollment,
          request.user.id,
        );
      }

      for (const course of courses) {
        course.count = await Enrollment.getCourseEnrolledCount(course.id);
      }

      if (request.accepts("html")) {
        return response.render("course", {
          title: "My Courses",
          courses,
          role: request.user.role,
          csrfToken: request.csrfToken(),
        });
      } else {
        return response.json({ courses });
      }
    } catch (error) {
      console.error(error);
    }
  },
);

app.get("/courses/new", requireInstructor, async (request, response) => {
  response.render("newCourse", {
    title: "Create new Course",
    csrfToken: request.csrfToken(),
  });
});

app.post("/courses/new", requireInstructor, async (request, response) => {
  try {
    const newCourse = await Course.addCourse({
      title: request.body.title,
      instructorId: request.user.id,
    });

    return response.redirect(`/courses/${newCourse.id}/chapters`);
  } catch (error) {
    const msg = error.errors[0].message;
    request.flash("error", msg);
    return response.redirect("/courses/new");
  }
});

app.get("/courses/:id/edit", requireInstructor, async (request, response) => {
  const course = await Course.findCourse(request.params.id);
  response.render("editCourse", {
    title: "Edit Course",
    course,
    csrfToken: request.csrfToken(),
  });
});

app.post(
  "/courses/:id/edit",
  requireInstructor,
  requireAuthor,
  async (request, response) => {
    try {
      const course = await Course.findCourse(request.params.id);
      await course.editCourse(request.body.title);
      return response.redirect(`/courses/${request.params.id}/chapters`);
    } catch (error) {
      const msg = error.errors[0].message;
      request.flash("error", msg);
      return response.redirect(request.url);
    }
  },
);

app.get(
  "/courses/:id/chapters",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const course = await Course.findCourse(request.params.id);
      course.count = await Enrollment.getCourseEnrolledCount(course.id);
      const chapters = await course.getChapters({
        order: [["createdAt", "ASC"]],
      });
      const isEnrolled = await Enrollment.checkEnrollment(
        request.user.id,
        course.id,
      );

      const instructor = await course.getUser();
      const isAuthor = request.user.id === instructor.id ? 1 : 0;

      if (isEnrolled) {
        for (const chapter of chapters) {
          let pages = await chapter.getPages();
          let x = 0;
          for (const page of pages) {
            if (await CompletedPages.checkComplete(isEnrolled.id, page.id)) {
              x++;
            }
          }

          if (x === pages.length && pages.length != 0) {
            chapter.complete = true;
          } else {
            chapter.complete = false;
          }
        }
      }

      if (request.accepts("html")) {
        response.render("chapter", {
          title: "Chapters",
          chapters,
          course,
          role: request.user.role,
          instructor,
          isEnrolled,
          isAuthor,
          csrfToken: request.csrfToken(),
        });
      } else {
        return response.json({ course, chapters });
      }
    } catch (error) {
      console.error(error);
    }
  },
);

app.post("/courses/:id/enroll", async (request, response) => {
  try {
    await Enrollment.enroll(request.user.id, request.params.id);
    return response.json(true);
  } catch (error) {
    console.error(error);
    return response.status(422).json(false);
  }
});

app.get(
  "/courses/:id/chapters/new",
  requireInstructor,
  requireAuthor,
  async (request, response) => {
    response.render("newChapter", {
      title: "Create a new chapter",
      course: await Course.findCourse(request.params.id),
      csrfToken: request.csrfToken(),
    });
  },
);

app.post(
  "/courses/:id/chapters/new",
  requireInstructor,
  requireAuthor,
  async (request, response) => {
    try {
      const newChapter = await Chapter.addChapter({
        title: request.body.title,
        description: request.body.description,
        courseId: request.params.id,
      });
      return response.redirect(`/chapters/${newChapter.id}/pages`);
    } catch (error) {
      const msg = error.errors[0].message;
      request.flash("error", msg);
      return response.redirect(request.url);
    }
  },
);

app.get(
  "/chapters/:id/pages",
  connectEnsureLogin.ensureLoggedIn(),
  requireEnrolled,
  async (request, response) => {
    try {
      const chapter = await Chapter.findChapter(request.params.id);
      const course = await chapter.getCourse();
      const pages = await chapter.getPages({
        order: [["createdAt", "ASC"]],
      });
      const isAuthor = request.user.id === (await course.getUser()).id ? 1 : 0;
      const isEnrolled = await Enrollment.checkEnrollment(
        request.user.id,
        course.id,
      );

      if (isEnrolled) {
        for (const page of pages) {
          page.complete = await CompletedPages.checkComplete(
            isEnrolled.id,
            page.id,
          );
        }
      }

      if (request.accepts("html")) {
        return response.render("page", {
          title: "Pages",
          course,
          chapter,
          pages,
          isAuthor,
          isEnrolled,
          csrfToken: request.csrfToken(),
        });
      } else {
        return response.json({ chapter, pages });
      }
    } catch (error) {
      console.error(error);
    }
  },
);

app.get(
  "/chapters/:id/edit",
  requireInstructor,
  requireAuthor,
  async (request, response) => {
    const chapter = await Chapter.findChapter(request.params.id);
    const course = await chapter.getCourse();
    response.render("editChapter", {
      title: "Edit Chapter",
      course,
      chapter,
      csrfToken: request.csrfToken(),
    });
  },
);

app.post(
  "/chapters/:id/edit",
  requireInstructor,
  requireAuthor,
  async (request, response) => {
    try {
      const chapter = await Chapter.findChapter(request.params.id);
      await chapter.editChapter(request.body.title, request.body.description);
      return response.redirect(`/chapters/${chapter.id}/pages`);
    } catch (error) {
      const msg = error.errors[0].message;
      request.flash("error", msg);
      return response.redirect(request.url);
    }
  },
);

app.get(
  "/chapters/:id/pages/new",
  requireInstructor,
  requireAuthor,
  async (request, response) => {
    const chapter = await Chapter.findChapter(request.params.id);
    const course = await chapter.getCourse();
    response.render("newPage", {
      title: "New Page",
      course,
      chapter,
      csrfToken: request.csrfToken(),
    });
  },
);

app.post(
  "/chapters/:id/pages/new",
  requireInstructor,
  requireAuthor,
  async (request, response) => {
    try {
      const newPage = await Pages.addPage({
        title: request.body.title,
        content: request.body.content,
        chapterId: request.params.id,
      });

      const chapter = await Chapter.findChapter(request.params.id);
      const course = await chapter.getCourse();
      const enrollments = await Enrollment.getEnrolledStudents(course.id);

      for (const enrollment of enrollments) {
        enrollment.Course = course;
        await Enrollment.calculateProgress(enrollment, CompletedPages);
      }

      return response.redirect(`/pages/${newPage.id}`);
    } catch (error) {
      const msg = error.errors[0].message;
      request.flash("error", msg);
      return response.redirect(request.url);
    }
  },
);

app.get(
  "/pages/:id",
  connectEnsureLogin.ensureLoggedIn(),
  requireEnrolled,
  async (request, response) => {
    const page = await Pages.findPage(request.params.id);
    const chapter = await page.getChapter();
    let pages = await chapter.getPages({
      order: [["createdAt", "ASC"]],
    });
    const course = await chapter.getCourse();
    const isAuthor = request.user.id === (await course.getUser()).id ? 1 : 0;
    const isEnrolled = await Enrollment.checkEnrollment(
      request.user.id,
      course.id,
    );

    let isComplete = 0;
    if (isEnrolled) {
      isComplete = await CompletedPages.checkComplete(isEnrolled.id, page.id);
    }

    pages = pages.map((page) => {
      return page.id;
    });

    const nextPage = pages.find((pageId) => pageId > request.params.id);

    if (request.accepts("html")) {
      response.render("content", {
        title: "Content",
        page,
        nextPage,
        chapter,
        course,
        isAuthor,
        isEnrolled,
        isComplete,
        role: request.user.role,
        csrfToken: request.csrfToken(),
      });
    } else {
      return response.json({ page });
    }
  },
);

app.post(
  "/pages/:id",
  requireStudent,
  requireEnrolled,
  async (request, response) => {
    try {
      const page = await Pages.findPage(request.params.id);
      const chapter = await page.getChapter();
      const course = await chapter.getCourse();

      const enrolled = await Enrollment.checkEnrollment(
        request.user.id,
        course.id,
      );
      enrolled.Course = course;

      await CompletedPages.markAsComplete(enrolled.id, request.params.id);
      await Enrollment.calculateProgress(enrolled, CompletedPages);
      return response.json(true);
    } catch (error) {
      console.error(error);
      return response.status(422).json(false);
    }
  },
);

app.get(
  "/pages/:id/edit",
  requireInstructor,
  requireAuthor,
  async (request, response) => {
    const page = await Pages.findPage(request.params.id);
    const chapter = await page.getChapter();
    const course = await chapter.getCourse();

    response.render("editPage", {
      title: "Edit Page",
      course,
      chapter,
      page,
      csrfToken: request.csrfToken(),
    });
  },
);

app.post(
  "/pages/:id/edit",
  requireInstructor,
  requireAuthor,
  async (request, response) => {
    try {
      const page = await Pages.findPage(request.params.id);
      await page.editPage(request.body.title, request.body.content);
      response.redirect(`/pages/${page.id}`);
    } catch (error) {
      console.error(error);
      const msg = error.errors[0].message;
      request.flash("error", msg);
      return response.redirect(request.url);
    }
  },
);

app.delete(
  "/courses/:id/chapters",
  requireInstructor,
  requireAuthor,
  async (request, response) => {
    try {
      await Course.deleteCourse(request.params.id);
      return response.json(true);
    } catch (error) {
      console.error(error);
      return response.status(422).json(false);
    }
  },
);

app.delete(
  "/chapters/:id/pages",
  requireInstructor,
  requireAuthor,
  async (request, response) => {
    try {
      const chapter = await Chapter.findChapter(request.params.id);
      const course = await chapter.getCourse();
      const enrollments = await Enrollment.getEnrolledStudents(course.id);
      await Chapter.deleteChapter(request.params.id);

      for (const enrollment of enrollments) {
        enrollment.Course = course;
        await Enrollment.calculateProgress(enrollment, CompletedPages);
      }
      return response.json(true);
    } catch (error) {
      console.error(error);
      return response.status(422).json(false);
    }
  },
);

app.delete(
  "/pages/:id",
  requireInstructor,
  requireAuthor,
  async (request, response) => {
    try {
      const page = await Pages.findPage(request.params.id);
      const chapter = await page.getChapter();
      const course = await chapter.getCourse();
      const enrollments = await Enrollment.getEnrolledStudents(course.id);
      await Pages.deletePage(request.params.id);

      for (const enrollment of enrollments) {
        enrollment.Course = course;
        await Enrollment.calculateProgress(enrollment, CompletedPages);
      }
      return response.json(true);
    } catch (error) {
      console.error(error);
      return response.status(422).json(false);
    }
  },
);

app.delete(
  "/courses/:id/unenroll",
  requireStudent,
  requireEnrolled,
  async (request, response) => {
    try {
      await Enrollment.unenroll(request.user.id, request.params.id);
      return response.json(true);
    } catch (error) {
      console.error(error);
      return response.status(422).json(false);
    }
  },
);

app.get("/report", requireInstructor, async (request, response) => {
  try {
    const instructor = await User.findInstructor(request.user.id);
    const courses = await instructor.getCourses({
      order: [["createdAt", "ASC"]],
    });
    let totalCount = 0,
      totalCompleted = 0;
    for (const course of courses) {
      course.count = await Enrollment.getCourseEnrolledCount(course.id);
      course.completed = await Enrollment.getCourseCompletedCount(course.id);
      totalCount += course.count;
      totalCompleted += course.completed;
    }

    response.render("report", {
      title: "Report",
      courses,
      totalCount,
      totalCompleted,
    });
  } catch (error) {
    console.error(error);
  }
});

app.get("/progress", requireStudent, async (request, response) => {
  let enrollments = await Enrollment.getEnrolledCourses(
    request.user.id,
    Course,
  );

  response.render("progress", {
    title: "Progress",
    enrollments,
  });
});

module.exports = app;
