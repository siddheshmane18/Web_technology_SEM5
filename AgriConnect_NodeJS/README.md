# AgriConnect — (Node.js only)

This project extends the AgriConnect equipment-rental website to demonstrate **server-side validation using Node.js**.

## Requirements

- Node.js 18 or later
- A web browser
- No external npm packages are required

## Run the project

1. Extract the ZIP file.
2. Open the extracted `AgriConnect_NodeJS` folder in VS Code.
3. Open a terminal in that folder.
4. Run:

   ```bash
   node server.js
   ```

5. Open `http://localhost:3000` in your browser.

Do not open the HTML files directly from the file system. Use the URL served by Node.js.

## Main features

- User registration with server-side validation
- Login validation
- Password hashing using Node.js `crypto` (`scrypt`)
- Session cookie for the current running server
- Equipment creation, listing, search, category filtering, sorting, editing, and deletion
- Rental requests with date and duration validation
- Owner acceptance or rejection of rental requests
- JSON file persistence using Node.js `fs`
- Server responses with meaningful HTTP status codes and validation errors

## Server-side validation examples

The server validates data independently of the browser:

- Name length and email format
- Password length and account role
- Duplicate email registration
- Equipment name, category, price, location, description, and condition
- Rental equipment ID, start date, and rental duration
- Ownership and role permissions

Try invalid requests from the browser or a tool such as `curl` to demonstrate that server-side validation is enforced even when client-side validation is bypassed.

Example invalid registration request (run while the server is active):

```bash
curl -i -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"\",\"email\":\"not-an-email\",\"password\":\"123\",\"role\":\"farmer\"}"
```

Expected result: HTTP `400 Bad Request` and a JSON response containing validation errors.

## Demo workflow

1. Register an account with role `Equipment Owner`.
2. Log in and add equipment.
3. Log out and register a second account with role `Farmer / Renter`.
4. Log in as the farmer and submit a rental request.
5. Log in as the owner and accept or reject the request.

## Important limitations

- This is an educational assignment demo, not a production-ready service.
- Session data is stored in memory and resets when the Node.js server restarts.
- JSON file storage is appropriate only for a small local demonstration; it is not safe for concurrent high-traffic production use.
- The application uses an HTTP-only cookie, but deployment behind HTTPS should enable the `Secure` cookie attribute.
- Add CSRF protection, rate limiting, stronger session management, and production deployment hardening before using a real service.
- If deploying to a host with an ephemeral filesystem, JSON file changes may not persist across redeploys/restarts.
