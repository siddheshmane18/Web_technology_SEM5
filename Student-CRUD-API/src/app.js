const express = require('express');
const path = require('node:path');
const studentRoutes = require('./routes/studentRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false }));

app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, status: 'ok', service: 'Student Management API' });
});

app.use('/api/students', studentRoutes);

// Serve the basic browser frontend from the public directory.
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
