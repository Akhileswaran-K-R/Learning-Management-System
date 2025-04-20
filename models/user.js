"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      User.hasMany(models.Course, {
        foreignKey: "instructorId",
      });
      User.hasMany(models.Enrollment, {
        foreignKey: "studentId",
      });
      User.hasMany(models.CompletedPages, {
        foreignKey: "studentId",
      });
    }

    static addUser({ firstName, lastName, email, password, role }) {
      return this.create({
        firstName,
        lastName,
        email,
        password,
        role,
      });
    }

    static findInstructor(id) {
      return this.findByPk(id);
    }
  }
  User.init(
    {
      firstName: DataTypes.STRING,
      lastName: DataTypes.STRING,
      role: DataTypes.STRING,
      email: DataTypes.STRING,
      password: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "User",
    },
  );
  return User;
};
