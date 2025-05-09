"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Enrollment extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Enrollment.belongsTo(models.User, {
        foreignKey: "studentId",
        onDelete: "CASCADE",
      });

      Enrollment.belongsTo(models.Course, {
        foreignKey: "courseId",
        onDelete: "CASCADE",
      });

      Enrollment.hasMany(models.CompletedPages, {
        foreignKey: "enrollmentId",
      });
    }

    static enroll(studentId, courseId) {
      return this.create({
        studentId,
        courseId,
        progress: 0,
      });
    }

    static getCourseEnrolledCount(id) {
      return this.count({
        where: {
          courseId: id,
        },
      });
    }

    static getCourseCompletedCount(id) {
      return this.count({
        where: {
          courseId: id,
          completed: true,
        },
      });
    }

    static checkEnrollment(studentId, courseId) {
      return this.findOne({
        where: {
          studentId,
          courseId,
        },
      });
    }

    static getEnrolledCourses(studentId, Course) {
      return this.findAll({
        where: {
          studentId,
        },
        include: Course,
        order: [["createdAt", "ASC"]],
      });
    }

    static getEnrolledStudents(courseId) {
      return this.findAll({
        where: {
          courseId,
        },
      });
    }

    static async calculateProgress(enrollment, CompletedPages) {
      const chapters = await enrollment.Course.getChapters();
      let pages = [];
      for (const chapter of chapters) {
        pages = pages.concat(await chapter.getPages());
      }

      let x = 0;
      for (const page of pages) {
        if (await CompletedPages.checkComplete(enrollment.id, page.id)) {
          x++;
        }
      }

      return this.update(
        {
          completed: x === pages.length && pages.length != 0,
          progress:
            pages.length === 0 ? 0 : ((x / pages.length) * 100).toFixed(1),
        },
        {
          where: {
            id: enrollment.id,
          },
        },
      );
    }

    static unenroll(studentId, courseId) {
      return this.destroy({
        where: {
          studentId,
          courseId,
        },
      });
    }
  }
  Enrollment.init(
    {
      studentId: {
        type: DataTypes.INTEGER,
        references: {
          model: "Users",
          key: "id",
        },
      },
      courseId: {
        type: DataTypes.INTEGER,
        references: {
          model: "Courses",
          key: "id",
        },
      },
      completed: DataTypes.BOOLEAN,
      progress: DataTypes.DECIMAL,
    },
    {
      sequelize,
      modelName: "Enrollment",
    },
  );
  return Enrollment;
};
