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

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
// app.use(cookieParser("shh! some secret string"));
// app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));

app.use(
  session({
    secret: "my-super-secret-key-21728172615261562",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, //24hrs
    },
  }),
);

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
  console.log("Serializing user in session", user.id);
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

app.get("/", (request, response) => {
  response.render("index", {
    title: "Learning Management System",
  });
});

app.get("/signup", (request, response) => {
  response.render("signup", {
    title: "Sign up",
    role: request.query.role,
    csrfToken: request.csrfToken(),
  });
});

app.get("/login", (request, response) => {
  response.render("login", {
    title: "Login",
    role: request.query.role,
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
      return response.redirect(`/${user.role}`);
    });
  } catch (error) {
    console.error(error);
  }
});

app.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/login",
  }),
  (request, response) => {
    if (request.body.role === request.user.role) {
      return response.redirect(`/${request.user.role}`);
    } else {
      request.logout((err) => {
        if (err) {
          return next(err);
        }
        return response.redirect(`/login?role=${request.body.role}`);
      });
    }
  },
);

app.get(
  "/Instructor",
  // requireInstructor,
  async (request, response) => {
    try {
      const courses = await Course.getAllCourses();
      return response.json(courses);
    } catch (error) {
      console.error(error);
    }
  },
);

app.get(
  "/Instructor/courses",
  // requireInstructor,
  async (request, response) => {
    try {
      const instructor = await User.findInstructor(request.body.id);
      const courses = await instructor.getCourses();
      return response.json(courses);
    } catch (error) {
      console.error(error);
    }
  },
);

app.get(
  "/Instructor/courses/new",
  //requireInstructor,
  async (request, response) => {},
);

app.post(
  "/Instructor/courses/new",
  //requireInstructor,
  async (request, response) => {
    try {
      const newCourse = await Course.addCourse({
        title: request.body.title,
        instructorId: request.body.id,
      });

      return response.json(newCourse);
    } catch (error) {
      console.error(error);
    }
  },
);

app.get(
  "/Instructor/courses/:id/chapters",
  /*requireInstructor,*/ async (request, response) => {
    try {
      const course = await Course.findCourse(request.params.id);
      const chapters = await course.getChapters();
      return response.json(chapters);
    } catch (error) {
      console.error(error);
    }
  },
);

app.get(
  "/Instructor/courses/:id/chapters/new",
  async (request, response) => {},
);

app.post("/Instructor/courses/:id/chapters/new", async (request, response) => {
  try {
    const chapter = await Chapter.addChapter({
      title: request.body.title,
      description: request.body.description,
      courseId: request.params.id,
    });
    return response.json(chapter);
  } catch (error) {
    console.error(error);
  }
});

app.get("/Student", requireStudent, (request, response) => {});

module.exports = app;
