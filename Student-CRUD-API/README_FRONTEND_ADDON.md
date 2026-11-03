# Student CRUD API — Basic Browser Frontend

This update adds a simple responsive frontend to the existing Node.js + Express + MongoDB CRUD API. The backend routes and Mongoose model are unchanged. Express serves the frontend from `public/`.

## Features

- List students from `GET /api/students`.
- Search by name, email or roll number.
- Filter by department and semester.
- Add students with client-side validation.
- Edit existing student records.
- Delete records after confirmation.
- Show API/server validation errors beside the relevant fields.
- Display result count, distinct departments and average CGPA.

## Run locally

1. Keep your existing `.env` file in the project root with a valid `MONGO_URI`.
2. Install dependencies if needed:

   ```bash
   npm install
   ```

3. Start the server:

   ```bash
   npm run dev
   ```

4. Open `http://localhost:5000`.

The frontend and API are served from the same Express origin, so no CORS configuration or Vite proxy is required.

## Files added/changed

- Added `public/index.html`.
- Added `public/styles.css`.
- Added `public/app.js`.
- Updated `src/app.js` to serve the `public` directory after the API routes.

## Deploy on Render

No change to Render's Root Directory, Build Command or Start Command is needed when deploying this project folder as the service root:

- Root Directory: `Student-CRUD-API` (when this is a subfolder in a monorepo)
- Build Command: `npm install`
- Start Command: `npm start`
- Environment variables: `MONGO_URI` and `NODE_ENV=production`

After pushing the changes, use **Manual Deploy → Deploy latest commit** in Render, or wait for automatic deployment if enabled. Open the Render service URL (not `/api/health`) to see the frontend. API endpoints remain under `/api`.

## Important

The frontend performs client-side validation for usability. The Express API and Mongoose schema continue to validate requests independently. Client-side validation is not a replacement for server-side validation.

This is an educational demonstration. The public CRUD endpoints do not have authentication or authorization; use synthetic student records only, not real personal information.
