"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Pages extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Pages.belongsTo(models.Chapter, {
        foreignKey: "chapterId",
        onDelete: "CASCADE",
      });

      Pages.hasMany(models.CompletedPages, {
        foreignKey: "pageId",
      });
    }

    static addPage({ title, content, chapterId }) {
      return this.create({
        title,
        content,
        chapterId,
      });
    }

    static findPage(id) {
      return this.findByPk(id);
    }

    editPage(title, content) {
      return this.update({
        title,
        content,
      });
    }

    static deletePage(id) {
      return this.destroy({
        where: {
          id,
        },
      });
    }
  }
  Pages.init(
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
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notNull: {
            msg: "Content should be provided",
          },
          notEmpty: {
            msg: "Content should be provided",
          },
        },
      },
      chapterId: {
        type: DataTypes.INTEGER,
        references: {
          model: "Chapters",
          key: "id",
        },
      },
    },
    {
      sequelize,
      modelName: "Pages",
    },
  );
  return Pages;
};
