# AgriConnect --- Node.js & Express Integration

A web application for connecting farmers who want to rent agricultural
equipment with farmers who have equipment available. This version adds a
Node.js/Express backend and server-side validation while aiming to
preserve the existing AgriConnect HTML, CSS, and UI components.


## 1. Project objectives

-   Add a server-side application using Node.js and Express.
-   Validate data on the server instead of trusting browser-side
    validation alone.
-   Support user registration and login.
-   Store passwords as hashes rather than plain text.
-   Manage equipment listings and rental requests through backend
    endpoints.
-   Preserve the existing project styling and components as far as
    possible.
-   Demonstrate server-side validation with an invalid HTTP request.

## 2. Technologies used

  -----------------------------------------------------------------------
  Technology                          Purpose
  ----------------------------------- -----------------------------------
  HTML5                               Page structure and forms

  CSS3                                Styling and layout

  JavaScript                          Browser-side interactions and API
                                      requests

  Node.js                             JavaScript runtime for the server

  Express.js                          HTTP server, routes, and
                                      request/response handling

  Express middleware                  Parses JSON request bodies and
                                      supports session handling

  `express-session`                   Maintains login sessions

  `bcryptjs`                          Hashes passwords before storage

  npm                                 Installs dependencies and runs
                                      scripts

  JSON files                          Simple local persistence for users,
                                      equipment, and rentals

  Server-side validation              Checks submitted values on the
                                      backend before accepting them
  -----------------------------------------------------------------------

**Storage note:** This implementation uses JSON files for local
demonstration. It is not a database-backed production deployment.



## 3. Project structure

The integration overlay contains or expects files similar to the
following:

``` text
AgriConnect_/
├── server.js
├── package.json
├── .gitignore
├── data/
│   ├── users.json
│   ├── equipment.json
│   └── rentals.json
├── js/
│   ├── main.js
│   ├── auth.js
│   ├── equipment.js
│   └── rental.js
├── js/validation.js        # existing client-side validation, if present
├── index.html              # existing page(s)
├── *.html                  # existing pages
└── css/                    # existing stylesheets
```

The exact HTML, CSS, and page filenames depend on your existing
repository. Do not replace your existing styling just to add the
backend.



## 4. Setup and run locally

### Step 1 --- Open the project directory

``` powershell
cd AgriConnect_
```

Use your own project path if it is different.

### Step 2 --- Install dependencies

``` powershell
npm install
```

### Step 3 --- Start the server

If the `package.json` has a `dev` script:

``` powershell
npm run dev
```

Otherwise, if it has a `start` script:

``` powershell
npm start
```