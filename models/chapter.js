"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Chapter extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Chapter.belongsTo(models.Course, {
        foreignKey: "courseId",
        onDelete: "CASCADE",
      });
      Chapter.hasMany(models.Pages, {
        foreignKey: "chapterId",
      });
    }

    static addChapter({ title, description, courseId }) {
      return this.create({
        title,
        description,
        courseId,
      });
    }

    static findChapter(id) {
      return this.findByPk(id);
    }

    editChapter(title, description) {
      return this.update({
        title,
        description,
      });
    }

    static deleteChapter(id) {
      return this.destroy({
        where: {
          id,
        },
      });
    }
  }
  Chapter.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {
            msg: "Title should be provided",
          },
          notEmpty: {
            msg: "Title should be provided",
          },
        },
      },
      description: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {
            msg: "Description should be provided",
          },
          notEmpty: {
            msg: "Description should be provided",
          },
        },
      },
      courseId: {
        type: DataTypes.INTEGER,
        references: {
          model: "Courses",
          key: "id",
        },
      },
    },
    {
      sequelize,
      modelName: "Chapter",
    },
  );
  return Chapter;
};
