const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent
} = require('../controllers/studentController');

const router = express.Router();

router.route('/')
  .post(asyncHandler(createStudent))
  .get(asyncHandler(getStudents));

router.route('/:id')
  .get(asyncHandler(getStudentById))
  .put(asyncHandler(updateStudent))
  .delete(asyncHandler(deleteStudent));

module.exports = router;
