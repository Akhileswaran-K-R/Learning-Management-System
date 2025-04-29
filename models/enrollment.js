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
    }

    static enroll(studentId, courseId) {
      return this.create({
        studentId,
        courseId,
        progess: 0,
      });
    }

    static getCourseEnrolledCount(id) {
      return this.count({
        where: {
          courseId: id,
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
      progess: DataTypes.DECIMAL,
    },
    {
      sequelize,
      modelName: "Enrollment",
    },
  );
  return Enrollment;
};
