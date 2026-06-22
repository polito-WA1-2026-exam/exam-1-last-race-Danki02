# Last Race — Client

React + Vite frontend for the Last Race exam project.

## Getting started

```bash
cd client
npm install
npm run dev      # starts on http://localhost:5173
```

The server must be running on `http://localhost:3001` before using the app.

## Project structure

```text
src/
├── App.jsx                      # root component — auth state + routing
├── main.jsx                     # React entry point
├── api.js                       # all fetch calls to the server
├── pages/
│   ├── HomePage.jsx             # welcome screen (logged-in users)
│   ├── InstructionsPage.jsx     # game rules (public)
│   ├── LoginPage.jsx            # login form
│   ├── GamePage.jsx             # game orchestrator (state + phase logic)
│   ├── GamePage.css
│   ├── RankingPage.jsx          # global leaderboard
│   ├── RankingPage.css
│   ├── NotFoundPage.jsx         # 404 page for unknown routes
│   └── NotFoundPage.css
└── components/
    ├── NavBar.jsx               # top navigation bar
    ├── NavBar.css
    ├── ProtectedRoute.jsx       # redirects unauthenticated users to /login
    └── game/
        ├── SetupPhase.jsx       # network map + mission assignment
        ├── PlanningPhase.jsx    # 90s timer + segment picker + route builder
        ├── ExecutionPhase.jsx   # step-by-step journey reveal
        └── ResultPhase.jsx      # final score + statistics
```

## Routes

| Path           | Component                                             | Auth     |
| -------------- | ----------------------------------------------------- | -------- |
| `/`            | `HomePage` if logged in, `InstructionsPage` if not    | —        |
| `/login`       | `LoginPage` (redirects to `/` if already logged in)   | —        |
| `/instructions`| `InstructionsPage`                                    | —        |
| `/game`        | `GamePage`                                            | required |
| `/ranking`     | `RankingPage`                                         | required |
| `*`            | `NotFoundPage` (404)                                  | —        |

## Game phases

`GamePage.jsx` holds all state and switches between four phase components:

1. **Setup** (`SetupPhase`) — shows the full metro network and the assigned start/destination pair
2. **Planning** (`PlanningPhase`) — 90-second timer, clickable segment list, route builder
3. **Execution** (`ExecutionPhase`) — reveals each step one at a time with random events and coin changes
4. **Result** (`ResultPhase`) — final score, validity message, and per-game statistics

## API calls (`src/api.js`)

All requests go to `http://localhost:3001/api` with `credentials: 'include'` for session cookies.

| Function                    | Method | Endpoint              |
| --------------------------- | ------ | --------------------- |
| `login(username, password)` | POST   | `/sessions`           |
| `logout()`                  | DELETE | `/sessions/current`   |
| `getCurrentUser()`          | GET    | `/sessions/current`   |
| `getNetwork()`              | GET    | `/network`            |
| `getSegments()`             | GET    | `/segments`           |
| `getGameSetup()`            | GET    | `/game/setup`         |
| `executeGame(route)`        | POST   | `/game/execute`       |
| `getRanking()`              | GET    | `/ranking`            |
