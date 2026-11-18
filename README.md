# Zenith: Multi-tenant Project Management & Team Collaboration

A web app where organizations plan projects, assign tasks and track progress on a Kanban board. Every organization's data is fully isolated, and permissions are enforced on the server.

> Built solo by Pragati as the Web Development Internship project (Project 2).

**Demo video:** `PASTE_DRIVE_LINK_HERE`

## Team contribution note
This project was assigned to a group of five interns. I messaged the group to coordinate the work and received no response for about 2 to 3 weeks. I followed up again and still received no reply, so I planned, designed and built the entire project on my own. This covers the database schema, backend API, authentication and permissions, frontend, tests, seed data and documentation. The Git commit history shows that all commits are from my account.

## Features
- Signup creates a new organization with an Owner account; login via JWT
- Projects and tasks with priority, assignee and due date
- Kanban board with drag-and-drop and a keyboard-friendly dropdown alternative
- Team page where owners add managers and employees
- Dashboard stats and an Insights page (status, priority, project progress)
- Overdue detection based on due dates
- Light and dark themes

## Screenshots
| Login | Board |
|---|---|
| ![Login](screenshots/login.png) | ![Board](screenshots/board.png) |

| Insights | Team |
|---|---|
| ![Insights](screenshots/insights.png) | ![Team](screenshots/team.png) |

| Employee view (own tasks only) | Another organization (isolated data) |
|---|---|
| ![Employee](screenshots/employee.png) | ![Beta](screenshots/beta.png) |

Test evidence: ![Tests](screenshots/tests.png)

## Tech stack
| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, vanilla JavaScript |
| Backend | Node.js, Express |
| Database | SQLite (better-sqlite3) |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Tests | Node built-in test runner |

## Architecture
Browser (static pages served from `public/`) → Express REST API (`/api/...`) → SQLite.
Each request carries a JWT that contains the user id, organization id and role. The server reads these values from the token and applies them to every query.

## Roles and permissions
| Action | Owner | Manager | Employee |
|---|---|---|---|
| Create projects and tasks | Yes | Yes | No |
| Assign tasks | Yes | Yes | No |
| Add team members | Yes | No | No |
| See all tasks | Yes | Yes | Only own |
| Update task status | Yes | Yes | Only own |

## Security
- Passwords are hashed with bcrypt; SQL uses parameterized queries
- The organization id comes from the signed JWT, never from the request body
- Every query is scoped by `org_id`; cross-organization access returns 404
- Roles are checked on the server (403), not just hidden in the UI
- User content is rendered with `textContent` to prevent XSS
- Secrets are read from environment variables; `.env` and the database file are not committed

## Setup
```bash
npm install
node seed.js        # creates demo data (run once)
node server.js      # http://localhost:3000
npm test            # run in a second terminal while the server is running
```
Optional: set a `JWT_SECRET` environment variable before starting (see `.env.example`).

## Demo accounts (password: `demo123`)
| Email | Role | Organization |
|---|---|---|
| owner@acme.com | Owner | Acme Corp |
| manager@acme.com | Manager | Acme Corp |
| employee@acme.com | Employee | Acme Corp |
| owner@beta.com | Owner | Beta Industries |
| employee@beta.com | Employee | Beta Industries |

All demo data is synthetic.

## Project structure
```
public/            frontend (index.html, extras.js)
auth.js            signup, login, JWT middleware
projects.js        projects, tasks, stats
team.js            team members
db.js              SQLite schema
seed.js            demo data for two organizations
isolation.test.js  tenant isolation and role tests
```

## Tests
`isolation.test.js` has 6 tests. They check that one organization cannot read or change another's data (404) and that employees cannot perform manager actions (403). Start the server, then run `npm test`.

## Known limitations
- Plain JavaScript and SQLite were used instead of React and PostgreSQL (the same schema can be moved to PostgreSQL)
- No comments, file attachments or email notifications yet
- Notification and activity records are stored in the database but not shown in the UI
- No password reset or email verification; owners set a temporary password for new members
- Not deployed; runs locally

## Future improvements
Comments and attachments, an in-app notification center, email invites, PostgreSQL, and deployment.