/*** Importing modules ***/
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import passport from 'passport';
import LocalStrategy from 'passport-local';
import session from 'express-session';
import UserDao from './dao-users.js';
import GameDao from './dao-game.js';

const userDao = new UserDao();
const gameDao = new GameDao();

/*** Init express and set up the middlewares ***/
const app = express();
app.use(morgan('dev'));
app.use(express.json());

/** Set up and enable Cross-Origin Resource Sharing (CORS) **/
const corsOptions = {
    origin: 'http://localhost:5173',
    credentials: true,
};
app.use(cors(corsOptions));

/*** Passport ***/

passport.use(new LocalStrategy(async function verify(username, password, callback) {
    const user = await userDao.getUserByCredentials(username, password);
    if (!user)
        return callback(null, false, 'Incorrect username or password');
    return callback(null, user);
}));

// Serialize the full user object into the session
passport.serializeUser(function (user, callback) {
    callback(null, user);
});

// Deserialize: the user object stored in the session is returned as-is
passport.deserializeUser(function (user, callback) {
    return callback(null, user);
});

/** Creating the session **/
app.use(session({
    secret: "This is a very secret information used to initialize the session!",
    resave: false,
    saveUninitialized: false,
}));
app.use(passport.authenticate('session'));

/** Authentication verification middleware **/
const isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated())
        return next();
    return res.status(401).json({ error: 'Not authorized' });
};


/*** Users APIs ***/

// POST /api/sessions — login
app.post('/api/sessions', function (req, res, next) {
    passport.authenticate('local', (err, user, info) => {
        if (err)
            return next(err);
        if (!user)
            return res.status(401).json({ error: info });
        req.login(user, (err) => {
            if (err)
                return next(err);
            return res.json(req.user);
        });
    })(req, res, next);
});

// GET /api/sessions/current — check current session
app.get('/api/sessions/current', (req, res) => {
    if (req.isAuthenticated())
        res.status(200).json(req.user);
    else
        res.status(401).json({ error: 'Not authenticated' });
});

// DELETE /api/sessions/current — logout
app.delete('/api/sessions/current', (req, res) => {
    req.logout(() => {
        res.end();
    });
});


/*** Game APIs ***/

// GET /api/network — full network with lines and ordered stations (setup phase)
app.get('/api/network', isLoggedIn, async (req, res) => {
    try {
        const lines = await gameDao.getNetwork();
        res.json(lines);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/segments — adjacent station pairs without line info (planning phase)
app.get('/api/segments', isLoggedIn, async (req, res) => {
    try {
        const segments = await gameDao.getSegments();
        res.json(segments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/game/setup — assigns random start/destination pair (min 3 hops apart) and stores in session
app.get('/api/game/setup', isLoggedIn, async (req, res) => {
    try {
        const lineStations = await gameDao.getAllLineStations();
        const stations = await gameDao.getStations();

        // Build adjacency map from line_station data
        const adjacency = {};
        const lineGroups = {};
        for (const ls of lineStations) {
            if (!lineGroups[ls.line_id]) lineGroups[ls.line_id] = [];
            lineGroups[ls.line_id].push({ station_id: ls.station_id, position: ls.position });
        }
        for (const stns of Object.values(lineGroups)) {
            stns.sort((a, b) => a.position - b.position);
            for (let i = 0; i < stns.length - 1; i++) {
                const a = stns[i].station_id;
                const b = stns[i + 1].station_id;
                if (!adjacency[a]) adjacency[a] = [];
                if (!adjacency[b]) adjacency[b] = [];
                if (!adjacency[a].includes(b)) adjacency[a].push(b);
                if (!adjacency[b].includes(a)) adjacency[b].push(a);
            }
        }

        function bfsDistances(startId) {
            const dist = { [startId]: 0 };
            const queue = [startId];
            while (queue.length > 0) {
                const cur = queue.shift();
                for (const nb of (adjacency[cur] || [])) {
                    if (dist[nb] === undefined) {
                        dist[nb] = dist[cur] + 1;
                        queue.push(nb);
                    }
                }
            }
            return dist;
        }

        const shuffled = [...stations].sort(() => Math.random() - 0.5);
        for (const start of shuffled) {
            const distances = bfsDistances(start.id);
            const candidates = stations.filter(s => s.id !== start.id && (distances[s.id] ?? 0) >= 3);
            if (candidates.length > 0) {
                const dest = candidates[Math.floor(Math.random() * candidates.length)];
                req.session.gameSetup = { startId: start.id, destId: dest.id };
                return res.json({ startStation: start, destination: dest });
            }
        }

        res.status(500).json({ error: 'Could not find a valid start/destination pair.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/game/execute — validate player's route, apply random events, save score
app.post('/api/game/execute', isLoggedIn, async (req, res) => {
    const setup = req.session.gameSetup;
    if (!setup)
        return res.status(400).json({ error: 'No active game setup. Call /api/game/setup first.' });

    const { route } = req.body;
    if (!Array.isArray(route) || route.length < 2)
        return res.status(400).json({ error: 'Route must be an array of at least 2 station IDs.' });

    try {
        const lineStations = await gameDao.getAllLineStations();
        const stations = await gameDao.getStations();
        const events = await gameDao.getEvents();

        const saveAndReturn = async (valid, steps, finalScore) => {
            await gameDao.saveGame(req.user.id, finalScore);
            req.session.gameSetup = null;
            return res.json({ valid, steps, finalScore });
        };

        // Must start at assigned start and end at assigned destination
        if (route[0] !== setup.startId || route[route.length - 1] !== setup.destId)
            return saveAndReturn(false, [], 0);

        // Build segment→line and station→lines maps
        const lineGroups = {};
        for (const ls of lineStations) {
            if (!lineGroups[ls.line_id]) lineGroups[ls.line_id] = [];
            lineGroups[ls.line_id].push({ station_id: ls.station_id, position: ls.position });
        }

        const segmentLine = {};
        const stationLines = {};
        for (const [lineId, stns] of Object.entries(lineGroups)) {
            stns.sort((a, b) => a.position - b.position);
            for (let i = 0; i < stns.length - 1; i++) {
                const a = stns[i].station_id;
                const b = stns[i + 1].station_id;
                const key = `${Math.min(a, b)},${Math.max(a, b)}`;
                segmentLine[key] = Number(lineId);
            }
            for (const s of stns) {
                if (!stationLines[s.station_id]) stationLines[s.station_id] = new Set();
                stationLines[s.station_id].add(Number(lineId));
            }
        }

        // Validate each segment
        let currentLineId = null;
        for (let i = 0; i < route.length - 1; i++) {
            const from = route[i];
            const to = route[i + 1];
            const key = `${Math.min(from, to)},${Math.max(from, to)}`;
            const lineId = segmentLine[key];

            if (!lineId) return saveAndReturn(false, [], 0);

            if (currentLineId !== null && lineId !== currentLineId) {
                const fromLineSet = stationLines[from] || new Set();
                if (fromLineSet.size < 2) return saveAndReturn(false, [], 0);
            }
            currentLineId = lineId;
        }

        // Route is valid — apply random events to each segment
        const stationMap = {};
        for (const s of stations) stationMap[s.id] = s;

        let coins = 20;
        const steps = route.slice(0, -1).map((fromId, i) => {
            const toId = route[i + 1];
            const event = events[Math.floor(Math.random() * events.length)];
            coins += event.effect;
            return {
                fromStation: stationMap[fromId],
                toStation: stationMap[toId],
                event: { description: event.description, effect: event.effect },
                coins,
            };
        });

        const finalScore = Math.max(0, coins);
        return saveAndReturn(true, steps, finalScore);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/ranking — best score per user, descending
app.get('/api/ranking', isLoggedIn, async (req, res) => {
    try {
        const ranking = await gameDao.getRanking();
        res.json(ranking);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


/*** Activating the server ***/
const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}/`));
