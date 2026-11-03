const mongoose = require('mongoose');
const Student = require('../models/Student');

const DEPARTMENTS = [
  'Computer Engineering',
  'Information Technology',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electronics and Telecommunication',
  'Electrical Engineering'
];

function validateStudentInput(body, { partial = false } = {}) {
  const errors = {};
  const fields = ['fullName', 'email', 'rollNumber', 'department', 'semester', 'phone', 'cgpa'];

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { errors: { body: 'Request body must be a JSON object.' } };
  }

  for (const field of fields) {
    if (!partial || Object.prototype.hasOwnProperty.call(body, field)) {
      const value = body[field];
      if (value === undefined || value === null || String(value).trim() === '') {
        errors[field] = `${field} is required.`;
      }
    }
  }

  const value = {};
  if (body.fullName !== undefined) {
    value.fullName = String(body.fullName).trim();
    if (value.fullName.length < 2 || value.fullName.length > 80) {
      errors.fullName = 'Full name must contain 2–80 characters.';
    }
  }
  if (body.email !== undefined) {
    value.email = String(body.email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) {
      errors.email = 'Enter a valid email address.';
    }
  }
  if (body.rollNumber !== undefined) {
    value.rollNumber = String(body.rollNumber).trim().toUpperCase();
    if (value.rollNumber.length < 3 || value.rollNumber.length > 20 || !/^[A-Z0-9/-]+$/.test(value.rollNumber)) {
      errors.rollNumber = 'Roll number must be 3–20 characters and use letters, numbers, / or - only.';
    }
  }
  if (body.department !== undefined) {
    value.department = String(body.department).trim();
    if (!DEPARTMENTS.includes(value.department)) errors.department = 'Select a valid department.';
  }
  if (body.semester !== undefined) {
    value.semester = Number(body.semester);
    if (!Number.isInteger(value.semester) || value.semester < 1 || value.semester > 8) {
      errors.semester = 'Semester must be a whole number from 1 to 8.';
    }
  }
  if (body.phone !== undefined) {
    value.phone = String(body.phone).trim();
    if (!/^[6-9]\d{9}$/.test(value.phone)) errors.phone = 'Enter a valid 10-digit Indian mobile number.';
  }
  if (body.cgpa !== undefined) {
    value.cgpa = Number(body.cgpa);
    if (!Number.isFinite(value.cgpa) || value.cgpa < 0 || value.cgpa > 10) {
      errors.cgpa = 'CGPA must be a number between 0 and 10.';
    }
  }

  return { value, errors };
}

function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

// CREATE: POST /api/students
async function createStudent(req, res) {
  const { value, errors } = validateStudentInput(req.body);
  if (Object.keys(errors).length) {
    return res.status(400).json({ success: false, message: 'Please correct the invalid fields.', errors });
  }

  const existing = await Student.findOne({
    $or: [{ email: value.email }, { rollNumber: value.rollNumber }]
  }).lean();

  if (existing) {
    const field = existing.email === value.email ? 'email' : 'rollNumber';
    return res.status(409).json({
      success: false,
      message: `${field} already exists.`,
      errors: { [field]: `${field} already exists.` }
    });
  }

  const student = await Student.create(value);
  return res.status(201).json({
    success: true,
    message: 'Student created successfully.',
    student
  });
}

// READ ALL: GET /api/students
async function getStudents(req, res) {
  const filter = {};
  if (req.query.department) filter.department = req.query.department;
  if (req.query.semester) {
    const semester = Number(req.query.semester);
    if (!Number.isInteger(semester) || semester < 1 || semester > 8) {
      return res.status(400).json({ success: false, message: 'semester query must be between 1 and 8.' });
    }
    filter.semester = semester;
  }
  if (req.query.search) {
    const escaped = String(req.query.search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    filter.$or = [{ fullName: regex }, { email: regex }, { rollNumber: regex }];
  }

  const students = await Student.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  return res.status(200).json({ success: true, count: students.length, students });
}

// READ ONE: GET /api/students/:id
async function getStudentById(req, res) {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid student ID.' });
  }
  const student = await Student.findById(req.params.id).lean();
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
  return res.status(200).json({ success: true, student });
}

// UPDATE: PUT /api/students/:id (full replacement of editable fields)
async function updateStudent(req, res) {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid student ID.' });
  }
  const { value, errors } = validateStudentInput(req.body);
  if (Object.keys(errors).length) {
    return res.status(400).json({ success: false, message: 'Please correct the invalid fields.', errors });
  }

  const existing = await Student.findOne({
    _id: { $ne: req.params.id },
    $or: [{ email: value.email }, { rollNumber: value.rollNumber }]
  }).lean();
  if (existing) {
    const field = existing.email === value.email ? 'email' : 'rollNumber';
    return res.status(409).json({ success: false, message: `${field} already exists.`, errors: { [field]: `${field} already exists.` } });
  }

  const student = await Student.findByIdAndUpdate(req.params.id, value, {
    new: true,
    runValidators: true
  });
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
  return res.status(200).json({ success: true, message: 'Student updated successfully.', student });
}

// DELETE: DELETE /api/students/:id
async function deleteStudent(req, res) {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid student ID.' });
  }
  const student = await Student.findByIdAndDelete(req.params.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
  return res.status(200).json({ success: true, message: 'Student deleted successfully.', studentId: student._id });
}

module.exports = { createStudent, getStudents, getStudentById, updateStudent, deleteStudent };
