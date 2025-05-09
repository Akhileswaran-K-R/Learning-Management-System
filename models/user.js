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

    static updatePassword(id, hashedPwd) {
      return User.update(
        {
          password: hashedPwd,
        },
        {
          where: {
            id,
          },
        },
      );
    }
  }
  User.init(
    {
      firstName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {
            msg: "First name should be provided",
          },
          notEmpty: {
            msg: "First name should be provided",
          },
        },
      },
      lastName: DataTypes.STRING,
      role: DataTypes.STRING,
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {
            msg: "Email should be provided",
          },
          notEmpty: {
            msg: "Email should be provided",
          },
        },
      },
      password: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "User",
    },
  );
  return User;
};
