# Student Management CRUD API

A demonstration REST API for the assignment: **Create an API to perform CRUD operations in a database, deploy the application on a web hosting provider, and test the API using Postman.**

## Project overview

This project manages student records through a REST API. It uses:

- **Node.js** — JavaScript runtime.
- **Express.js** — REST API routes and HTTP request/response handling.
- **MongoDB Atlas** — cloud database.
- **Mongoose** — MongoDB object modelling, schema rules and database operations.
- **Postman** — manual API testing using a ready-to-import collection.
- **Render** — hosting provider for deployment.

## Features

- Create a student record.
- Retrieve all students, with optional search, department and semester filters.
- Retrieve one student by MongoDB ID.
- Update a student record.
- Delete a student record.
- Validate request fields before database writes.
- Reject duplicate email addresses and roll numbers.
- Return meaningful HTTP status codes and JSON error responses.
- Postman tests for successful CRUD operations and invalid input.

## Folder structure

```text
Student-CRUD-API/
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── src/
│   ├── config/db.js
│   ├── controllers/studentController.js
│   ├── middleware/asyncHandler.js
│   ├── middleware/errorHandler.js
│   ├── models/Student.js
│   ├── routes/studentRoutes.js
│   ├── app.js
│   └── server.js
├── postman/
│   ├── Student_API.postman_collection.json
│   ├── Student_API_Local.postman_environment.json
│   └── README.md
├── .env.example
├── .gitignore
├── package.json
├── SUBMISSION_REPORT_TEMPLATE.md
└── README.md
```

## Browser frontend

A basic responsive frontend is served by Express at the root URL (`http://localhost:5000`). It supports listing, searching, department/semester filters, adding, editing and deleting students. The form performs client-side validation before calling the API, and also displays validation errors returned by Express.

The frontend files are `public/index.html`, `public/styles.css` and `public/app.js`. It uses the same origin as the API, so no separate frontend server or CORS configuration is required.

After starting the API, open `http://localhost:5000` to use the browser interface. See `README_FRONTEND_ADDON.md` for the update and deployment steps.

## API endpoints

Base URL for local testing: `http://localhost:5000`

| Operation | Method | Endpoint | Success status |
|---|---|---|---:|
| Health check | GET | `/api/health` | 200 |
| Create student | POST | `/api/students` | 201 |
| Read all students | GET | `/api/students` | 200 |
| Read one student | GET | `/api/students/:id` | 200 |
| Update student | PUT | `/api/students/:id` | 200 |
| Delete student | DELETE | `/api/students/:id` | 200 |

Optional read-all query parameters:

- `search` — partial, case-insensitive match against full name, email or roll number.
- `department` — exact department filter.
- `semester` — semester from 1 to 8.

Example: `/api/students?department=Computer%20Engineering&semester=5`

## Student JSON format

Send this JSON body to `POST /api/students` or `PUT /api/students/:id`:

```json
{
  "fullName": "Aarav Kulkarni",
  "email": "aarav@example.com",
  "rollNumber": "CE2024001",
  "department": "Computer Engineering",
  "semester": 5,
  "phone": "9876543210",
  "cgpa": 8.4
}
```

### Validation rules

| Field | Rule |
|---|---|
| fullName | Required; 2–80 characters |
| email | Required; valid email format; unique |
| rollNumber | Required; 3–20 characters; letters, numbers, `/` or `-`; unique |
| department | Must be one of the six values in `Student.js` |
| semester | Whole number from 1 to 8 |
| phone | 10-digit Indian mobile number beginning with 6–9 |
| cgpa | Number from 0 to 10 |

Mongoose schema validation is also enabled. The controller returns field-level validation messages with HTTP 400. Duplicate email or roll number returns HTTP 409.

## Run locally

### Prerequisites

- Node.js 20 or newer.
- npm.
- A MongoDB Atlas account and database connection string, or a reachable MongoDB deployment.
- Postman (desktop or web application).

### 1. Install packages

```bash
npm install
```

### 2. Configure the database

Copy `.env.example` to a new file named `.env` in the project root. Put your real MongoDB connection string into `MONGO_URI`:

```env
PORT=5000
MONGO_URI=mongodb+srv://DB_USERNAME:DB_PASSWORD@YOUR_CLUSTER.mongodb.net/student_api?retryWrites=true&w=majority
NODE_ENV=development
```

Replace the placeholders. URL-encode special characters in the database password. Never commit `.env` or share your database password.

### 3. Start the API

```bash
npm run dev
```

Or:

```bash
npm start
```

The terminal should report that MongoDB connected and the API is listening on port 5000.

### 4. Check the health route

Open `http://localhost:5000/api/health` in a browser. Expected response:

```json
{
  "success": true,
  "status": "ok",
  "service": "Student Management API"
}
```

## Configure MongoDB Atlas

1. Sign in to MongoDB Atlas and create a project.
2. Create a database deployment/cluster using an available tier.
3. Create a **database user** with a username and a strong password. This is separate from your Atlas website login.
4. In the project's Network Access / IP Access List settings, allow the IP address from which your local development machine connects.
5. Choose **Connect** for the deployment, select **Drivers**, select Node.js, and copy the connection string.
6. Replace the username, password and cluster host in the connection string; include `student_api` as the database name.
7. Put the finished string in `.env` as `MONGO_URI` and start the API.

For a Render deployment, Atlas must also allow network traffic from the deployed service. Render outbound addresses can depend on the service/plan. For a short academic demo, an Atlas access-list entry of `0.0.0.0/0` is sometimes used to permit connections from any IP, but it exposes the database endpoint to connection attempts from anywhere. Use a dedicated strong database password, least-privilege database user, and remove broad access after the demonstration; for production use a narrow allowlist or a hosting plan with stable outbound IPs/private networking. See the official MongoDB network-security documentation linked below.

## Test with Postman

1. Open Postman.
2. Select **Import** and import both files from the `postman` folder:
   - `Student_API.postman_collection.json`
   - `Student_API_Local.postman_environment.json`
3. Select the `Student API - Local` environment.
4. Start the API and confirm `baseUrl` is `http://localhost:5000`.
5. Open the collection and run requests in this order:
   1. Health Check
   2. CREATE - Add Student
   3. READ - Get All Students
   4. READ - Get Student By ID
   5. UPDATE - Edit Student
   6. VALIDATION - Reject Invalid Student
   7. DELETE - Remove Student
   8. READ - Confirm Deleted Student Returns 404

The Create request saves the returned MongoDB `_id` to the collection variable `studentId`. Subsequent requests use that ID automatically. The requests include Postman assertions for response status and important response fields.

To test your hosted service, duplicate the Postman environment and change `baseUrl` to your deployed Render URL, for example `https://your-service-name.onrender.com` (no trailing slash). Run the collection again.

## Deploy on Render

If this project is stored inside your existing `Web_technology_SEM5` repository at `Student-CRUD-API/`, configure Render's **Root Directory** as `Student-CRUD-API`. If you have placed the project files directly at the repository root, leave Root Directory blank. Do not upload `.env` or `node_modules`.

1. In Render, create a **New Web Service** and connect the GitHub repository.
2. Choose the Node runtime.
3. Set Root Directory as described above.
4. Set the build command to `npm install`.
5. Set the start command to `npm start`.
6. Add environment variables in Render:
   - `MONGO_URI` = your Atlas connection string.
   - `NODE_ENV` = `production`.
   - `PORT` is normally supplied by Render; the application reads it automatically and defaults to 5000 locally.
7. Create the service and wait for the deploy to finish.
8. Open `https://YOUR-SERVICE.onrender.com/` to use the browser frontend.
9. Open `https://YOUR-SERVICE.onrender.com/api/health` and confirm it returns the healthy JSON response.
10. Duplicate your Postman environment, change `baseUrl` to the Render URL, and test all CRUD requests against the hosted API.
11. Save screenshots of the deployed frontend, health endpoint, successful Create/Read/Update/Delete responses, and the validation-failure response for your assignment evidence.

Render's free web services may spin down after inactivity, so the first request after a quiet period can take longer. Check the current Render plan details before relying on it for a live presentation.

## HTTP status codes used

| Code | Meaning | Example |
|---:|---|---|
| 200 | OK | Read, update, delete, health check |
| 201 | Created | Student created |
| 400 | Bad Request | Invalid fields, malformed ID, invalid query |
| 404 | Not Found | Student or route does not exist |
| 409 | Conflict | Duplicate email or roll number |
| 500 | Internal Server Error | Unexpected server-side failure |

## Troubleshooting

- **`MONGO_URI is missing`**: confirm `.env` is in the project root and named exactly `.env`.
- **MongoDB server selection timeout**: check the Atlas IP access list, database username/password, cluster hostname and network connection.
- **Authentication failed**: use the Atlas database user's credentials, not your Atlas website login. URL-encode special characters in the password.
- **Port already in use**: stop the other process or set another local `PORT` in `.env`.
- **Student ID invalid**: use the `_id` returned by the Create or Read All response, not the roll number.
- **Duplicate key**: use a new email and roll number; both fields are unique.
- **Postman cannot resolve `baseUrl`**: select the correct environment or set the collection variable to the correct local/hosted URL.

## Deployment notes and limitations

- This project is an educational demonstration, not a production student-information system.
- The API has no user authentication or role-based authorization; anyone who can reach the endpoint can perform CRUD operations. Do not put real student personal data into the public demo.
- Add authentication, HTTPS, rate limiting, audit logs, backups and stricter access controls before real-world use.
- Protect the MongoDB URI and never commit `.env`.

## Official references

- Render Node/Express deployment: https://render.com/docs/deploy-node-express-app
- Render deployment configuration: https://render.com/docs/deploys
- MongoDB Atlas connection guide: https://www.mongodb.com/docs/atlas/connect-to-database-deployment/
- MongoDB Atlas network security: https://www.mongodb.com/docs/atlas/architecture/current/network-security/
- Postman import: https://learning.postman.com/docs/getting-started/importing-and-exporting/importing-data/
