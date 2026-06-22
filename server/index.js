import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import passport from 'passport';
import LocalStrategy from 'passport-local';
import session from 'express-session';
import UserDao from './dao-users.js';
import GameDao from './dao-game.js';
import { findGameSetup, validateRoute, applyEvents } from './game-logic.js';

const userDao = new UserDao();
const gameDao = new GameDao();

// express setup
const app = express();
app.use(morgan('dev'));
app.use(express.json());

// allow requests from the Vite dev server
const corsOptions = {
    origin: 'http://localhost:5173',
    credentials: true,
};
app.use(cors(corsOptions));

// passport — local strategy + session serialization

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

// session middleware
app.use(session({
    secret: "This is a very secret information used to initialize the session!",
    resave: false,
    saveUninitialized: false,
}));
app.use(passport.authenticate('session'));

// middleware — rejects unauthenticated requests with 401
const isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated())
        return next();
    return res.status(401).json({ error: 'Not authorized' });
};


// auth routes

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


// game routes

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
        const setup = findGameSetup(lineStations, stations);
        if (!setup)
            return res.status(500).json({ error: 'Could not find a valid start/destination pair.' });
        req.session.gameSetup = { startId: setup.startStation.id, destId: setup.destination.id };
        res.json(setup);
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

        const valid = validateRoute(route, { startId: setup.startId, destId: setup.destId }, lineStations);
        const { steps, finalScore } = valid ? applyEvents(route, stations, events) : { steps: [], finalScore: 0 };

        await gameDao.saveGame(req.user.id, finalScore);
        req.session.gameSetup = null;
        res.json({ valid, steps, finalScore });
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


// Start the server
const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}/`));
