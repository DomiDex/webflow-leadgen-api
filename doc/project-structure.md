webflow-leadgen-api/
├── .env
├── .gitignore
├── deps.ts
├── main.ts # Oak setup, middleware, mounts router
└── src/
├── config/
│ └── db.ts # Neon pool setup
├── routes/
│ └── lead.routes.ts # Defines /analyze, /leads/:id/continue endpoints
├── controllers/
│ └── lead.controller.ts # Handles request/response, validation, calls LeadService
├── services/
│ ├── pagespeed.service.ts # Logic for calling Google PageSpeed API
│ └── lead.service.ts # Business logic: orchestrates PageSpeed, prepares data, calls repository
├── repositories/
│ └── lead.repository.ts # Database interaction logic (SQL queries for 'leads' table)
├── types/
│ └── index.ts # Shared TypeScript interfaces (LeadData, Scores, etc.)
└── utils/
└── validators.ts # Optional: Validation helper functions

**Project Structure Explanation**

This project (webflow-leadgen-api) appears to be a backend API built using the Deno runtime and the Oak web framework. Its purpose seems to be generating leads, possibly by analyzing websites (indicated by pagespeed.service.ts) perhaps submitted via a Webflow form or site.

Here's a breakdown of the components:

Root Directory:

.env: Stores environment variables (like API keys for Google PageSpeed, Neon database credentials, secret keys). This file should not be committed to version control.
.gitignore: Specifies files and directories that Git should ignore (e.g., .env, node_modules if used, build artifacts).
deps.ts: A common Deno pattern for managing and exporting external dependencies from URLs. Makes imports cleaner in other files.
main.ts: This is the entry point of the application. It initializes the Oak application, sets up middleware (like logging, CORS, error handling), and importantly, mounts the routers (specifically lead.routes.ts in this case) to handle incoming requests.
src/ Directory (Source Code): This follows a standard layered architecture pattern, promoting separation of concerns.

config/: Contains configuration files.
db.ts: Sets up the database connection, specifically using a connection pool for Neon (a serverless PostgreSQL platform).
routes/: Defines the API endpoints (URLs) and HTTP methods (GET, POST, etc.). It maps these routes to specific functions in the controllers.
lead.routes.ts: Defines routes related to "leads," such as /analyze (likely for initiating an analysis) and /leads/:id/continue (potentially for a follow-up action on a specific lead).
controllers/: Acts as the intermediary between routes and services.
lead.controller.ts: Handles the request (ctx.request) and response (ctx.response) objects for lead-related routes. It parses incoming data, performs validation (possibly using utils/validators.ts), calls the appropriate methods in the lead.service.ts, and formats the final response to send back to the client.
services/: Contains the core business logic of the application.
pagespeed.service.ts: Encapsulates the logic specifically for interacting with the Google PageSpeed Insights API. It likely takes a URL, makes the API call, and returns relevant performance data.
lead.service.ts: Orchestrates the process for handling leads. It likely uses pagespeed.service.ts to get site data, potentially combines it with other information, performs necessary calculations or transformations, and then interacts with the lead.repository.ts to save or retrieve data from the database.
repositories/ (Data Access Layer): Responsible for all direct interactions with the database.
lead.repository.ts: Contains the SQL queries (or ORM methods) needed to perform CRUD (Create, Read, Update, Delete) operations on the leads table in the database configured in db.ts.
types/: Defines shared TypeScript interfaces and types used throughout the application.
index.ts: Likely exports all defined types/interfaces (e.g., LeadData, PageSpeedScores, LeadStatus) from this directory for easy importing elsewhere. This promotes consistency in data structures.
utils/: Contains reusable helper functions that don't belong to a specific layer but can be used across the application.
validators.ts: Provides functions for validating input data (e.g., checking if a URL is valid, if required fields are present).
Request Flow (Example for /analyze):

Request hits main.ts.
Oak middleware runs.
Oak router directs the request to the /analyze route defined in src/routes/lead.routes.ts.
The route definition calls the relevant handler function in src/controllers/lead.controller.ts.
The controller validates the request data (e.g., the URL to analyze).
The controller calls a method in src/services/lead.service.ts (e.g., analyzeWebsite).
The lead.service.ts might call src/services/pagespeed.service.ts to get performance data.
The lead.service.ts processes the data and calls a method in src/repositories/lead.repository.ts (e.g., createLead) to save the results.
The repository executes the SQL query against the Neon database (using the pool from src/config/db.ts).
The result bubbles back up: Repository -> Service -> Controller.
The controller formats the successful response (or error) and sends it back to the client.
Cursor Rules (@ symbol context)

To help Cursor understand this structure and answer questions effectively, you can provide it with context using the @ symbol followed by file or directory paths. Here are some useful rules/combinations:

Understanding a specific endpoint (e.g., /analyze):

@src/routes/lead.routes.ts @src/controllers/lead.controller.ts @src/services/lead.service.ts
Why: This tells Cursor about the route definition, the request/response handling, and the main business logic involved.
Understanding database interactions for leads:

@src/repositories/lead.repository.ts @src/services/lead.service.ts @src/types/index.ts
Why: This focuses Cursor on the SQL/database logic, the service that calls it, and the data structures being saved/retrieved. You might add @src/config/db.ts if the question involves the connection itself.
Understanding the PageSpeed integration:

@src/services/pagespeed.service.ts @src/services/lead.service.ts
Why: This shows Cursor the specific PageSpeed API interaction logic and how the main lead service utilizes it.
Understanding data structures/types:

@src/types/index.ts
Why: Directly points Cursor to where shared types are defined.
Understanding application setup and middleware:

@main.ts
Why: Focuses Cursor on the entry point, Oak setup, and global middleware.
Understanding dependencies:

@deps.ts
Why: Shows Cursor the external libraries being used.
General questions about the core logic:

@src/
Why: Provides broad context of the entire source code, good for general "how does X work?" questions within the application logic.
Questions about validation:

@src/utils/validators.ts @src/controllers/lead.controller.ts
Why: Shows the validation functions and where they are typically used (in the controller).
