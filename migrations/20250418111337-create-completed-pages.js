"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("CompletedPages", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      enrollmentId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Enrollments",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      pageId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Pages",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("CompletedPages");
  },
};
