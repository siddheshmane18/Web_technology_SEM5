const express = require('express');
const studentRoutes = require('./routes/studentRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Student Management API is running.',
    endpoints: {
      health: '/api/health',
      students: '/api/students'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, status: 'ok', service: 'Student Management API' });
});

app.use('/api/students', studentRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
