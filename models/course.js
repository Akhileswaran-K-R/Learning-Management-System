"use strict";
const { Model, Op } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Course extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Course.belongsTo(models.User, {
        foreignKey: "instructorId",
        onDelete: "CASCADE",
      });
      Course.hasMany(models.Chapter, {
        foreignKey: "courseId",
      });
      Course.hasMany(models.Enrollment, {
        foreignKey: "courseId",
      });
    }

    static getAvailableInstructorCourses(User, excludedId) {
      return this.findAll({
        include: User,
        where: {
          instructorId: {
            [Op.ne]: excludedId,
          },
        },
      });
    }

    static async getAvailableStudentCourses(User, Enrollment, targetStudentId) {
      const enrolledCourses = await Enrollment.findAll({
        where: {
          studentId: targetStudentId,
        },
        attributes: ["courseId"],
      });

      const enrolledCourseIds = enrolledCourses.map(
        (enrolledCourse) => enrolledCourse.courseId,
      );

      return this.findAll({
        where: {
          id: {
            [Op.notIn]: enrolledCourseIds.length ? enrolledCourseIds : [0],
          },
        },
        include: User,
      });
    }

    static addCourse({ title, instructorId }) {
      return this.create({
        title,
        instructorId,
      });
    }

    static findCourse(id) {
      return this.findByPk(id);
    }
  }
  Course.init(
    {
      title: DataTypes.STRING,
      instructorId: {
        type: DataTypes.INTEGER,
        references: {
          model: "Users",
          key: "id",
        },
      },
    },
    {
      sequelize,
      modelName: "Course",
    },
  );
  return Course;
};
