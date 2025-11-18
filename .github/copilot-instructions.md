## Purpose

This file gives concise, repository-specific guidance for AI coding agents (Copilot-style) so they can be productive immediately. It focuses on architecture, developer workflows, conventions, integration points, and common pitfalls discovered in this codebase.

**Big Picture**
- **Frontend:** React + Vite app in `src/` (entry: `src/main.jsx`, UI components in `src/components`). Start dev server with `npm run dev` from the repository root (see `package.json`).
- **Backend:** Flask app in `api/` (entry: `api/app.py`). The backend is an API-only Flask app exposing blueprints (see `api/app.py` imports: `screening`, `dashboard`, `speedcongruency`).
- **Data flow:** Frontend calls Flask API under `/api/*`. The axios instance `src/services/api.js` sets `withCredentials: true` (critical) so Flask session cookies are used.

**Local dev & run commands**
- **Install frontend deps:** Run `npm install` at the project root where `package.json` sits.
- **Run frontend:** `npm run dev` (Vite — default port 5173). The Flask CORS config accepts `http://localhost:5173`.
- **Install backend deps:** `cd api && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt` (macOS / Linux).
- **Run backend (recommended):** `cd api && source .venv/bin/activate && python app.py` (this runs Flask via `app.run(debug=True)` as in `api/app.py`).
- **Note:** `package.json` defines an `api` script using a Windows-style `.venv\\Scripts\\flask` path — do not rely on that on macOS; prefer the `api/README.md` or direct `python app.py`.

**API & Auth contract**
- **Session-based auth:** Flask uses cookie sessions (see `api/app.py`). The frontend must send cookies — `src/services/api.js` sets `withCredentials: true` for this reason.
- **Important endpoints:** `POST /api/auth/login`, `POST /api/auth/signup`, `POST /api/auth/logout`, `GET /api/auth/me` (see `api/README.md` and `api/app.py`). Frontend services call these via `src/services/*.js`.

**Key repo files to inspect for patterns and examples**
- `api/app.py` — blueprint registration, CORS config, auth endpoints, DB init, runs the Flask app.
- `api/README.md` — backend setup, routes list.
- `package.json` — frontend scripts (`dev`, `build`) and the suspicious `api` script (Windows path).
- `src/services/api.js` — central axios instance; contains global response interceptor and must remain `withCredentials: true`.
- `src/hooks/useColorTest.js` — example of domain-specific hook that drives test flow and response recording (practice vs testing phases).
- `src/services/*` — wrappers for specific API calls (look here to find how frontend maps to backend endpoints).

**Conventions & Patterns (what to follow exactly)**
- **Single axios instance:** Use `src/services/api.js` for all HTTP calls so session cookies, base URL, and error handling are consistent.
- **Hooks + services split:** Business logic for tests lives in `src/hooks` (e.g., `useColorTest.js`) and low-level deck/stimulus logic in `src/services` (e.g., `useDeck`, `buildDeck`). Components should use hooks, not reimplement timers/deck logic.
- **Blueprints on backend:** Each test/feature has its own blueprint (e.g., screening, speed-congruency). Add routes to the matching module and register in `api/app.py`.
- **DB location:** SQLite DB file is created under `api/instance/syntest.db` (see `api/app.py`). The app creates the directory if needed.

**Environment & configuration**
- **Frontend API base:** `VITE_API_BASE_URL` controls the client base URL. Default in `src/services/api.js` is `/api` which expects the Flask server to be proxied or on same origin during development.
- **Ports & CORS:** `api/app.py` allows `http://localhost:5173` and `http://127.0.0.1:5173`. When changing dev ports, update CORS origins accordingly.

**Common gotchas**
- **Windows path in `package.json` `api` script:** On macOS/Linux that `api` script will fail. Use `api/README.md` instructions instead.
- **Cookies required:** Forgetting `withCredentials` or not running both frontend and backend on expected origins will result in silent auth failures.
- **Hardcoded SECRET_KEY:** `api/app.py` includes a dev `SECRET_KEY` — do not expose or assume production readiness.

**When making changes or adding features**
- Add backend endpoints as Flask blueprints and register them in `api/app.py` with clear route prefixes (follow existing `screening`, `dashboard`, `speedcongruency` pattern).
- Update `src/services/*` to expose a thin wrapper that calls `src/services/api.js`. Keep business logic in hooks (`src/hooks`) or `api/services.py` (backend).
- Keep client-side test flows in hooks (see `useColorTest.js`) — components should be thin renderers of hook state.

**If you need to run or test things**
- Start backend first on `localhost:5000`, then frontend (`npm run dev`) — the frontend expects the API at `/api` or `VITE_API_BASE_URL`.
- Inspect requests in browser DevTools to verify cookies are included (look under request headers -> cookie).

If any of the above is unclear or you'd like me to expand a section (e.g., give example edits for adding a new blueprint, or create a sample `npm` script for macOS), tell me which area to iterate on.
