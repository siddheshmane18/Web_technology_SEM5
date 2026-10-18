# AgriConnect - Web Technology Assignment

## Requirements covered
- HTML, CSS and vanilla JavaScript
- Arrays of objects for users, equipment and rental requests
- JSON.stringify() / JSON.parse()
- localStorage persistence
- Form validation and inline error messages
- Equipment CRUD, search, filter, sort
- Rental cost calculation and request status workflow

## Run
1. Extract the ZIP.
2. Open the `AgriConnect_Assignment` folder in VS Code.
3. Recommended: use the Live Server extension to open `index.html`.
4. If you use Live Server, open the same origin/port each time so localStorage remains available.
5. Register an account. Choose `Equipment Owner` to add and manage listings.
6. Register a second account as `Farmer / Renter` to request equipment.

## Important
This is an academic frontend demonstration. Data is stored in the browser on the same browser origin. It is not a secure multi-user production application. The demo stores passwords locally for demonstration purposes only; do not use real passwords. A real system must use a backend, password hashing and server-side authentication.

## Files
- `index.html`, `login.html`, `register.html`
- `equipment.html`, `equipment-details.html`
- `add-equipment.html`, `my-equipment.html`, `my-rentals.html`
- `style.css`
- `js/main.js`, `js/validation.js`, `js/auth.js`, `js/equipment.js`, `js/rental.js`
