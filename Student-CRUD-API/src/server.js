const dns = require("node:dns");

// Windows DNS workaround for MongoDB Atlas SRV resolution
if (process.platform === "win32") {
    dns.setServers(["1.1.1.1", "8.8.8.8"]);
}

require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Student Management API listening on port ${PORT}`);
    });
  } catch (error) {
    console.error(`Could not start API: ${error.message}`);
    process.exit(1);
  }
}

startServer();
