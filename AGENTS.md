# AGENTS.md

## Cursor Cloud specific instructions

### Overview

**Acolhimento** is a single-service Node.js/Express application for customer intake management, integrated with Kommo CRM. It uses SQLite (`better-sqlite3`) with a local `data.db` file (auto-created on startup; tables are created automatically). Deployed to Render at `https://acolhimento-fase1.onrender.com`.

### Running the application

```bash
npm run dev   # or: node server.js
```

Server starts on `http://localhost:3333` (configurable via `PORT` env var).

### Key routes

| Route | Description |
|---|---|
| `GET /` | Main app (index.html) |
| `GET /widget.html` | Kommo CRM embeddable widget (shows atendimento inline, encerrar/reabrir) |
| `GET /gadget.html` | Floating gadget overlay (FAB button + sliding panel with live timer) |
| `GET /dashboard` | KPI dashboard (totals, period stats, bar chart, table) |
| `POST /api/atendimentos/auto` | Create/return active atendimento for a Kommo contact |
| `GET /api/atendimentos` | List all atendimentos (with `?status=ativo\|encerrado` filter) |
| `GET /api/atendimentos/:id` | Get atendimento by ID |
| `PATCH /api/atendimentos/:id` | Update atendimento status (`ativo` or `encerrado`) |

### Kommo integration

The `kommo-widget/` directory contains the Kommo Widget SDK package. The pre-built ZIP (`acolhimento-widget.zip`) can be uploaded via **Configurações > Integrações > Criar Integração** in Kommo. The widget renders an iframe of `widget.html` in contact/lead card sidebars (`ccard-1`, `lcard-1`). The `base_url` setting must point to the deployed server URL.

### Notes

- No linter, test framework, or build step is configured. `package.json` only has `start` and `dev` scripts (both run `node server.js`).
- Data is stored in SQLite (`data.db`). The `better-sqlite3` package requires native C++ compilation; `build-essential` and `python3` must be available for `npm install`.
- `DB_PATH` env var can override the default database file location.
- `package-lock.json` is committed; run `npm install` to restore dependencies.
- The frontend is vanilla HTML/JS served directly by Express — no transpilation or bundling needed.
- All widget/gadget pages accept query params: `kommoContactId`, `nome`, `telefone` (also `contact_id`, `name`, `phone` aliases).
