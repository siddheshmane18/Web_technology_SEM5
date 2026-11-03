# Postman testing

1. Open Postman.
2. Import `Student_API.postman_collection.json` and `Student_API_Local.postman_environment.json`.
3. Select the `Student API - Local` environment.
4. Start the API locally on port 5000.
5. Run the collection requests in order. The Create request stores the created MongoDB `_id` in the collection variable `studentId`; later requests use it.
6. The collection contains assertions for expected HTTP status codes and response content.

For the hosted API, duplicate the environment and change `baseUrl` to your deployed Render URL, for example `https://your-service.onrender.com`. Do not include a trailing slash.
