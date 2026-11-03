'use strict';

const API_BASE = '/api/students';
const DEPARTMENTS = [
  'Computer Engineering',
  'Information Technology',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electronics and Telecommunication',
  'Electrical Engineering'
];

const elements = {
  addButton: document.getElementById('addStudentButton'),
  refreshButton: document.getElementById('refreshButton'),
  search: document.getElementById('searchInput'),
  departmentFilter: document.getElementById('departmentFilter'),
  semesterFilter: document.getElementById('semesterFilter'),
  resetFilters: document.getElementById('resetFiltersButton'),
  tbody: document.getElementById('studentsTableBody'),
  totalCount: document.getElementById('totalCount'),
  departmentCount: document.getElementById('departmentCount'),
  averageCgpa: document.getElementById('averageCgpa'),
  resultSummary: document.getElementById('resultSummary'),
  formPanel: document.getElementById('studentFormPanel'),
  form: document.getElementById('studentForm'),
  formTitle: document.getElementById('formTitle'),
  formEyebrow: document.getElementById('formEyebrow'),
  formAlert: document.getElementById('formAlert'),
  saveButton: document.getElementById('saveButton'),
  closeForm: document.getElementById('closeFormButton'),
  cancelButton: document.getElementById('cancelButton'),
  toast: document.getElementById('toast'),
  confirmDialog: document.getElementById('confirmDialog'),
  confirmMessage: document.getElementById('confirmMessage'),
  confirmCancel: document.getElementById('confirmCancel'),
  confirmDelete: document.getElementById('confirmDelete')
};

let editingId = null;
let deleteTargetId = null;
let toastTimer = null;
let searchTimer = null;
let latestRequest = 0;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || `Request failed (${response.status}).`);
    error.status = response.status;
    error.fields = data.errors || {};
    throw error;
  }
  return data;
}

function showToast(message, type = 'success') {
  elements.toast.textContent = message;
  elements.toast.className = `toast show${type === 'error' ? ' error' : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove('show'), 3300);
}

function showFormAlert(message) {
  elements.formAlert.textContent = message;
  elements.formAlert.hidden = !message;
}

function clearErrors() {
  document.querySelectorAll('.field-error').forEach(node => { node.textContent = ''; });
  document.querySelectorAll('#studentForm input, #studentForm select').forEach(node => node.classList.remove('invalid'));
  showFormAlert('');
}

function setFieldError(field, message) {
  const errorElement = document.getElementById(`${field}Error`);
  const inputElement = document.getElementById(field);
  if (errorElement) errorElement.textContent = message;
  if (inputElement) inputElement.classList.toggle('invalid', Boolean(message));
}

function getFormValues() {
  return {
    fullName: document.getElementById('fullName').value.trim(),
    email: document.getElementById('email').value.trim().toLowerCase(),
    rollNumber: document.getElementById('rollNumber').value.trim().toUpperCase(),
    department: document.getElementById('department').value,
    semester: document.getElementById('semester').value,
    phone: document.getElementById('phone').value.trim(),
    cgpa: document.getElementById('cgpa').value
  };
}

// Client-side validation: reject invalid data before sending a request to Express.
function validateStudent(values) {
  const errors = {};
  if (values.fullName.length < 2 || values.fullName.length > 80) {
    errors.fullName = 'Full name must contain 2–80 characters.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email) || values.email.length > 120) {
    errors.email = 'Enter a valid email address.';
  }
  if (values.rollNumber.length < 3 || values.rollNumber.length > 20 || !/^[A-Z0-9/-]+$/.test(values.rollNumber)) {
    errors.rollNumber = 'Use 3–20 letters, numbers, / or - only.';
  }
  if (!DEPARTMENTS.includes(values.department)) {
    errors.department = 'Please select a department.';
  }
  const semester = Number(values.semester);
  if (!values.semester || !Number.isInteger(semester) || semester < 1 || semester > 8) {
    errors.semester = 'Select a semester from 1 to 8.';
  }
  if (!/^[6-9]\d{9}$/.test(values.phone)) {
    errors.phone = 'Enter a valid 10-digit Indian mobile number.';
  }
  const cgpa = Number(values.cgpa);
  if (values.cgpa === '' || !Number.isFinite(cgpa) || cgpa < 0 || cgpa > 10) {
    errors.cgpa = 'CGPA must be a number between 0 and 10.';
  }
  return errors;
}

function openForm(student = null) {
  clearErrors();
  elements.form.reset();
  editingId = student?._id || null;
  elements.formTitle.textContent = editingId ? 'Update student' : 'Add a student';
  elements.formEyebrow.textContent = editingId ? 'EDIT RECORD' : 'NEW RECORD';
  elements.saveButton.textContent = editingId ? 'Update student' : 'Save student';

  if (student) {
    for (const field of ['fullName', 'email', 'rollNumber', 'department', 'semester', 'phone', 'cgpa']) {
      document.getElementById(field).value = student[field] ?? '';
    }
  }
  elements.formPanel.hidden = false;
  elements.formPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('fullName').focus({ preventScroll: true });
}

function closeForm() {
  elements.formPanel.hidden = true;
  elements.form.reset();
  editingId = null;
  clearErrors();
}

function getInitials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase();
}

function renderStudents(students) {
  elements.tbody.replaceChildren();
  if (!students.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 7;
    cell.className = 'table-message';
    cell.textContent = 'No student records found. Add a student or change the filters.';
    row.append(cell);
    elements.tbody.append(row);
  } else {
    for (const student of students) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <div class="student-cell">
            <span class="avatar">${escapeHtml(getInitials(student.fullName))}</span>
            <span><span class="student-name">${escapeHtml(student.fullName)}</span><span class="student-email">${escapeHtml(student.email)}</span></span>
          </div>
        </td>
        <td><span class="roll-pill">${escapeHtml(student.rollNumber)}</span></td>
        <td>${escapeHtml(student.department)}</td>
        <td><span class="semester-pill">${escapeHtml(student.semester)}</span></td>
        <td>${escapeHtml(student.phone)}</td>
        <td><span class="cgpa-value">${Number(student.cgpa).toFixed(2)}</span></td>
        <td><div class="actions-cell">
          <button class="small-action" type="button" data-action="edit" data-id="${escapeHtml(student._id)}">Edit</button>
          <button class="small-action delete" type="button" data-action="delete" data-id="${escapeHtml(student._id)}">Delete</button>
        </div></td>`;
      elements.tbody.append(row);
    }
  }

  const count = students.length;
  const departments = new Set(students.map(student => student.department)).size;
  const average = count ? students.reduce((sum, student) => sum + Number(student.cgpa), 0) / count : 0;
  elements.totalCount.textContent = count;
  elements.departmentCount.textContent = departments;
  elements.averageCgpa.textContent = count ? average.toFixed(2) : '—';
  elements.resultSummary.textContent = `${count} student record${count === 1 ? '' : 's'} found`;
}

async function loadStudents() {
  const requestNumber = ++latestRequest;
  elements.tbody.innerHTML = '<tr><td colspan="7" class="table-message">Loading student records...</td></tr>';
  const params = new URLSearchParams();
  const search = elements.search.value.trim();
  const department = elements.departmentFilter.value;
  const semester = elements.semesterFilter.value;
  if (search) params.set('search', search);
  if (department) params.set('department', department);
  if (semester) params.set('semester', semester);

  try {
    const query = params.toString();
    const result = await apiRequest(`${API_BASE}${query ? `?${query}` : ''}`);
    if (requestNumber !== latestRequest) return;
    renderStudents(result.students || []);
  } catch (error) {
    if (requestNumber !== latestRequest) return;
    elements.tbody.innerHTML = `<tr><td colspan="7" class="table-message">${escapeHtml(error.message)}. Check that the API and MongoDB connection are running.</td></tr>`;
    elements.totalCount.textContent = '—';
    elements.departmentCount.textContent = '—';
    elements.averageCgpa.textContent = '—';
    elements.resultSummary.textContent = 'Could not load records';
  }
}

async function submitStudent(event) {
  event.preventDefault();
  clearErrors();
  const values = getFormValues();
  const errors = validateStudent(values);
  for (const [field, message] of Object.entries(errors)) setFieldError(field, message);
  if (Object.keys(errors).length) {
    showFormAlert('Please correct the highlighted fields before saving.');
    return;
  }

  const payload = {
    ...values,
    semester: Number(values.semester),
    cgpa: Number(values.cgpa)
  };
  const isEditing = Boolean(editingId);
  const url = isEditing ? `${API_BASE}/${encodeURIComponent(editingId)}` : API_BASE;
  elements.saveButton.disabled = true;
  elements.saveButton.textContent = isEditing ? 'Updating...' : 'Saving...';

  try {
    const result = await apiRequest(url, {
      method: isEditing ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });
    closeForm();
    showToast(result.message || (isEditing ? 'Student updated.' : 'Student created.'));
    await loadStudents();
  } catch (error) {
    for (const [field, message] of Object.entries(error.fields || {})) setFieldError(field, message);
    showFormAlert(error.message || 'Unable to save the student.');
    if (!Object.keys(error.fields || {}).length) showToast(error.message, 'error');
  } finally {
    elements.saveButton.disabled = false;
    elements.saveButton.textContent = editingId ? 'Update student' : 'Save student';
  }
}

function askDelete(studentId, studentName) {
  deleteTargetId = studentId;
  elements.confirmMessage.textContent = `Delete ${studentName}'s record? This action cannot be undone.`;
  elements.confirmDialog.hidden = false;
  elements.confirmDelete.focus();
}

async function deleteStudent() {
  if (!deleteTargetId) return;
  elements.confirmDelete.disabled = true;
  elements.confirmDelete.textContent = 'Deleting...';
  try {
    const result = await apiRequest(`${API_BASE}/${encodeURIComponent(deleteTargetId)}`, { method: 'DELETE' });
    elements.confirmDialog.hidden = true;
    deleteTargetId = null;
    showToast(result.message || 'Student deleted.');
    await loadStudents();
  } catch (error) {
    elements.confirmDialog.hidden = true;
    showToast(error.message, 'error');
  } finally {
    elements.confirmDelete.disabled = false;
    elements.confirmDelete.textContent = 'Delete record';
  }
}

async function editStudent(studentId) {
  try {
    const result = await apiRequest(`${API_BASE}/${encodeURIComponent(studentId)}`);
    openForm(result.student);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

elements.addButton.addEventListener('click', () => openForm());
elements.refreshButton.addEventListener('click', loadStudents);
elements.closeForm.addEventListener('click', closeForm);
elements.cancelButton.addEventListener('click', closeForm);
elements.form.addEventListener('submit', submitStudent);
elements.search.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadStudents, 250);
});
elements.departmentFilter.addEventListener('change', loadStudents);
elements.semesterFilter.addEventListener('change', loadStudents);
elements.resetFilters.addEventListener('click', () => {
  elements.search.value = '';
  elements.departmentFilter.value = '';
  elements.semesterFilter.value = '';
  loadStudents();
});
elements.tbody.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  if (action === 'edit') editStudent(id);
  if (action === 'delete') {
    const row = button.closest('tr');
    const name = row?.querySelector('.student-name')?.textContent || 'this student';
    askDelete(id, name);
  }
});
elements.confirmCancel.addEventListener('click', () => {
  elements.confirmDialog.hidden = true;
  deleteTargetId = null;
});
elements.confirmDelete.addEventListener('click', deleteStudent);
elements.confirmDialog.addEventListener('click', event => {
  if (event.target === elements.confirmDialog) {
    elements.confirmDialog.hidden = true;
    deleteTargetId = null;
  }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    elements.confirmDialog.hidden = true;
    if (!elements.formPanel.hidden) closeForm();
    deleteTargetId = null;
  }
});

loadStudents();
