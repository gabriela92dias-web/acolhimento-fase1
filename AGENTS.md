# AGENTS.md

## Cursor Cloud specific instructions

### Overview

**Acolhimento** is a single-service Node.js/Express application for customer intake management, designed to integrate with Kommo CRM. It uses in-memory storage (no database required).

### Running the application

```bash
npm run dev   # or: node server.js
```

Server starts on `http://localhost:3333` (configurable via `PORT` env var).

### Key routes

| Route | Description |
|---|---|
| `GET /` | Main app (index.html) |
| `GET /widget.html` | Kommo CRM embeddable widget |
| `POST /api/atendimentos/auto` | Create/return active atendimento |
| `GET /api/atendimentos/:id` | Get atendimento by ID |
| `PATCH /api/atendimentos/:id` | Update atendimento status |

### Notes

- No linter, test framework, or build step is configured in this project. The `package.json` only has `start` and `dev` scripts (both run `node server.js`).
- Data is stored in-memory and is lost on server restart.
- No lockfile (`package-lock.json`) is committed; `npm install` generates one locally.
- The frontend is vanilla HTML/JS served directly by Express — no transpilation or bundling needed.
