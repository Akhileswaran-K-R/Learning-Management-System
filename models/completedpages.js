"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class CompletedPages extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      CompletedPages.belongsTo(models.Enrollment, {
        foreignKey: "enrollmentId",
        onDelete: "CASCADE",
      });

      CompletedPages.belongsTo(models.Pages, {
        foreignKey: "pageId",
        onDelete: "CASCADE",
      });
    }

    static markAsComplete(enrollmentId, pageId) {
      return this.create({
        enrollmentId,
        pageId,
      });
    }

    static checkComplete(enrollmentId, pageId) {
      return this.findOne({
        where: {
          enrollmentId,
          pageId,
        },
      });
    }
  }
  CompletedPages.init(
    {
      enrollmentId: {
        type: DataTypes.INTEGER,
        references: {
          model: "Enrollments",
          key: "id",
        },
      },
      pageId: {
        type: DataTypes.INTEGER,
        references: {
          model: "Pages",
          key: "id",
        },
      },
    },
    {
      sequelize,
      modelName: "CompletedPages",
    },
  );
  return CompletedPages;
};
