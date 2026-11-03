const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required.'],
      trim: true,
      minlength: [2, 'Full name must contain at least 2 characters.'],
      maxlength: [80, 'Full name cannot exceed 80 characters.']
    },
    email: {
      type: String,
      required: [true, 'Email is required.'],
      trim: true,
      lowercase: true,
      unique: true,
      maxlength: 120,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address.']
    },
    rollNumber: {
      type: String,
      required: [true, 'Roll number is required.'],
      trim: true,
      uppercase: true,
      unique: true,
      minlength: 3,
      maxlength: 20,
      match: [/^[A-Z0-9/-]+$/, 'Roll number may contain letters, numbers, / and - only.']
    },
    department: {
      type: String,
      required: [true, 'Department is required.'],
      enum: {
        values: [
          'Computer Engineering',
          'Information Technology',
          'Mechanical Engineering',
          'Civil Engineering',
          'Electronics and Telecommunication',
          'Electrical Engineering'
        ],
        message: 'Select a valid department.'
      }
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required.'],
      min: [1, 'Semester must be between 1 and 8.'],
      max: [8, 'Semester must be between 1 and 8.'],
      validate: {
        validator: Number.isInteger,
        message: 'Semester must be a whole number.'
      }
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required.'],
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number.']
    },
    cgpa: {
      type: Number,
      required: [true, 'CGPA is required.'],
      min: [0, 'CGPA must be between 0 and 10.'],
      max: [10, 'CGPA must be between 0 and 10.']
    }
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('Student', studentSchema);
