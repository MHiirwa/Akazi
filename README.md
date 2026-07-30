# Akazi

Akazi is a job platform that connects three kinds of people: job seekers who are
looking for work, employers who are hiring, and administrators who keep the
platform healthy. Seekers build a profile, search for jobs, save the ones they
like, and apply. Employers post jobs, look through talent, review the people who
apply, schedule interviews, and see simple analytics. Administrators verify
employers, suspend accounts that misbehave, and take down jobs when needed.

The project is one repository with two separate applications inside it. The
backend folder is the API, built with Node.js, Express, Prisma, and PostgreSQL.
The frontend folder is the website that people actually see, built with React and
Vite. They run and deploy separately but belong to the same product.


## What is inside the repository

- backend: the server and API. Handles accounts, jobs, applications, email,
  file uploads, and the database.
- frontend: the single page web application people use in their browser.


## How the system works

A visitor opens the website and either creates an account or signs in. When they
register they choose whether they are a job seeker or an employer. From there the
experience changes depending on who they are.

A job seeker fills in their profile with a headline, a short bio, their skills,
work experience, projects, a resume, and any portfolio documents. They browse the
list of published jobs and filter it by things like location, industry, job type,
salary, and whether the job is remote. When they find a job they like they can
save it for later or apply to it with an optional cover letter. After applying
they can follow the status of that application and receive notifications when
something changes. They can also subscribe to email alerts so that new matching
jobs are sent to their inbox, and they can leave reviews for employers they have
dealt with.

An employer first submits a company profile. New employers start in a pending
state and an administrator has to verify them before their listings are fully
trusted. Once verified, an employer can post jobs with details such as the number
of openings, a deadline, required skills, a salary range, and whether the role is
remote. They can search the talent directory to find seekers by skill and
availability. When people apply, the employer can review each application,
shortlist good candidates, add private notes, reject applicants with a reason,
accept them, and schedule an interview with a date, a location, and a note. They
can also see how many people applied to each job and view basic hiring analytics.

An administrator has an overview of the whole platform. They can list all users
and suspend anyone who breaks the rules, approve or reject employers who are
waiting to be verified, and remove or restore job listings.

Behind the scenes the platform also sends emails for things like password resets,
job alerts, and application updates, and it shows in app notifications inside the
dashboard so people stay informed while they are using the site.


## How signing in works

Akazi keeps login simple and secure. There are two ways to sign in.

The first way is email and password. When a person registers, their password is
never stored as plain text. It is hashed with bcrypt before it is saved, so even
the people running the database cannot read it. When the person logs in, the
password they type is checked against that hash.

The second way is Google Sign In. Instead of a password, the person signs in with
their Google account and Google confirms who they are. Their Google identity is
linked to their Akazi account.

In both cases, once the person is confirmed, the server creates a signed token
called a JSON Web Token, or JWT. The website stores this token and sends it back
with every request that needs to know who you are. The server checks the token to
confirm the request is coming from a real, logged in user, and it also checks the
person's role so that seekers, employers, and administrators only see what they
are allowed to see. Tokens expire after a set time, for example seven days, so an
old token cannot be used forever.

If someone forgets their password there is a recovery flow. They ask for a reset,
the server sends them an email with a secure one time link, and that link lets
them set a new password. The link is tied to a token that expires, so it cannot be
reused later.


## The main things people can do

Job seekers can build a public profile, search and filter jobs, save jobs, apply
with a cover letter, withdraw an application, upload portfolio documents,
subscribe to email job alerts, get in app notifications, and review employers.

Employers can create a company profile and go through verification, post and edit
jobs, search the talent directory, review and shortlist applicants, reject or
accept them, schedule interviews, see applicant counts and analytics, and receive
reviews from seekers.

Administrators can list and suspend users, verify or reject employers, and remove
or restore jobs.


## What information the platform stores

The database is managed with Prisma on top of PostgreSQL. The main records are:

- Users: one record for every account, whether seeker, employer, or admin. It
  holds the profile, skills, resume, employer verification status, and password
  reset details.
- Jobs: the listings, with location, industry, type, salary range, number of
  openings, deadline, required skills, and status.
- Applications: the link between a seeker and a job. It tracks the status, the
  cover letter, whether the person is shortlisted, employer notes, and interview
  details. A person can only apply to the same job once.
- Saved jobs: the jobs a seeker has bookmarked.
- Job alerts: email subscriptions with keyword, location, and type filters, plus a
  one click unsubscribe link.
- Reviews: a seeker's rating and comment about an employer.
- Notifications: in app messages with a type, a message, a link, and whether they
  have been read.
- Documents: portfolio files that seekers upload.

The full schema lives in backend/prisma/schema.prisma.


## The API

The backend exposes a REST API. Everything lives under the /api path. Requests
that need a logged in user must include the JWT token in an Authorization header.
When the server is running there is also interactive documentation available at
/api-docs, and a simple health check at /health that returns a status of ok.

The main groups of endpoints are:

- Auth, under /api/auth: register, login, Google sign in, forgot password, reset
  password, get and update your own profile, check profile completion, and upload
  an avatar or resume.
- Jobs, under /api/jobs: list and filter jobs, view a job, create, update, and
  remove jobs, list your own jobs as an employer, get applicant counts, and view
  analytics.
- Applications, under /api/applications: apply to a job, withdraw, list your own
  applications, list applications to your jobs, update status, review and
  shortlist, and schedule an interview.
- Users and talent, under /api/users: platform stats, the talent directory, and a
  public talent profile.
- Reviews, under /api: list an employer's reviews, add a review, and delete your
  own review.
- Saved jobs, under /api/saved-jobs: list, add, and remove saved jobs.
- Job alerts, under /api/job-alerts: subscribe, unsubscribe, and manage your
  alerts.
- Notifications, under /api/notifications: list them, mark one as read, and mark
  all as read.
- Documents, under /api/documents: list, add, and remove portfolio documents.
- Admin, under /api/admin: list users, suspend users, set employer status, list
  jobs, and remove or restore jobs.


## The pages on the website

- Home page at the root.
- Job listings and job detail.
- Employer directory and employer profile.
- Public talent profile.
- Login and register.
- Forgot password and reset password.
- The dashboard, which changes based on whether you are a seeker, employer, or
  admin.
- Profile management.
- Job alert unsubscribe.


## The technology used

The backend uses Node.js and Express for the server, Prisma with PostgreSQL for
the database, JSON Web Tokens and bcrypt for login and passwords, Zod for
validating incoming data, Multer and Cloudinary for file uploads, Resend or SMTP
for email, and Helmet, CORS, compression, and rate limiting for security. It runs
with tsx.

The frontend uses React with Vite, React Router for navigation, and Google's
sign in library.


## All the technologies used, in full

Backend, the main libraries:

- Node.js: the runtime that runs the server code.
- Express: the web framework that handles routes and requests.
- Prisma Client: the tool that talks to the database in a type safe way.
- Prisma PostgreSQL adapter: connects Prisma to PostgreSQL.
- pg: the PostgreSQL database driver.
- PostgreSQL: the database itself, where everything is stored.
- jsonwebtoken: creates and verifies the JWT login tokens.
- bcryptjs: hashes passwords so they are never stored as plain text.
- Zod: checks and validates the data coming into the API.
- Multer: handles file uploads coming from the browser.
- Cloudinary: stores uploaded files like avatars, resumes, and documents.
- Resend: sends transactional emails such as resets and alerts.
- Helmet: sets secure HTTP headers.
- CORS: controls which website is allowed to call the API.
- compression: makes responses smaller and faster.
- express-rate-limit: limits how often a client can call the API to prevent abuse.
- dotenv: loads settings from the .env file.
- swagger-jsdoc and swagger-ui-express: generate and serve the interactive API
  documentation at /api-docs.

Backend, the development tools:

- tsx: runs the server directly and restarts it during development.
- nodemon: watches files and reloads the server on changes.
- prisma: the command line tool for migrations and generating the client.

Frontend, the main libraries:

- React: the library that builds the user interface.
- React DOM: renders React into the browser page.
- React Router: handles moving between pages without reloading.
- Google OAuth for React: adds the Google sign in button and flow.

Frontend, the build tools:

- Vite: the build tool and development server.
- Vite React plugin: lets Vite understand and build React code.


## Running it on your own machine

You need Node.js version 18 or newer and a PostgreSQL database.

For the backend, go into the backend folder, copy .env.example to .env and fill in
the real values, install the packages, generate the Prisma client, apply the
database migrations, optionally seed some demo data, and then start it in
development mode. It runs at http://localhost:3000 and the documentation is at
/api-docs.

A note on the database: this database may be out of sync with the local migration
history. Use prisma db push to sync the schema without losing data. Do not use
prisma migrate dev, because it can reset and destroy data. On a brand new
production database, prisma migrate deploy applies all migrations cleanly.

For the frontend, go into the frontend folder, copy .env.example to .env and set
the API URL and the Google client id, install the packages, and start it in
development mode. It runs at http://localhost:5173.


## Settings you need to provide

The backend reads its settings from an .env file. The important ones are the
database connection string, a long random secret for signing tokens, the token
lifetime, the port, the client url for CORS, a trust proxy setting for when it
runs behind a load balancer, the environment name, the Google client id, a limit
on applications per day, the email settings for Resend or SMTP, a support email,
and the Cloudinary keys for file uploads. The database url and the token secret
are required, and the server will refuse to start without them.

The frontend reads two settings: the API url and the Google client id.

Never put a real .env file into git. Only the .env.example templates belong in the
repository, and the .gitignore file already enforces this.


## Testing

The backend comes with a test suite that covers login, applications, admin
actions, reviews, and general endpoint and feature checks. Go into the backend
folder and run the test command. It uses a separate .env.test file so it does not
touch your real data.


## Putting it online

The two applications go online separately from the same repository.

The backend goes on a Node host such as Render, Railway, or Fly. Point the service
at the backend folder, set all the environment values in the host dashboard, set
the environment to production and trust proxy to one, build the project and
generate the Prisma client, run the migrations on release, and start the server.

The database goes on a managed PostgreSQL service.

The frontend goes on a static host such as Vercel or Netlify. Point it at the
frontend folder, build it, and set the API url to the address of the deployed
backend.

Before going live, generate fresh production secrets, set the client url to the
real frontend address, confirm that CORS and rate limiting are working, and make
sure the .env file is never exposed.


Akazi connects talent with opportunity.
