import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import cors from 'cors';
import { scryptSync } from 'crypto';
import db from './db.js';

const app = express();
const port = 3001;

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());

app.use(session({
  secret: 'last_race_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax' },
}));

passport.use(new LocalStrategy((username, password, done) => {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return done(null, false, { message: 'Wrong credentials.' });

  const hash = scryptSync(password, user.salt, 64).toString('hex');
  if (hash !== user.password_hash) return done(null, false, { message: 'Wrong credentials.' });

  return done(null, { id: user.id, username: user.username });
}));

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser((id, done) => {
  const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(id);
  done(null, user || false);
});

app.use(passport.initialize());
app.use(passport.session());

const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Not authenticated' });
};

// POST /api/sessions — login
app.post('/api/sessions', (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: info.message });
    req.login(user, (err) => {
      if (err) return next(err);
      res.json({ id: user.id, username: user.username });
    });
  })(req, res, next);
});

// GET /api/sessions/current — check session
app.get('/api/sessions/current', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ id: req.user.id, username: req.user.username });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// DELETE /api/sessions/current — logout
app.delete('/api/sessions/current', isLoggedIn, (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed.' });
    res.status(200).json({ message: 'Logged out successfully.' });
  });
});

// GET /api/network
app.get('/api/network', isLoggedIn, (req, res) => {
  const lines = db.prepare('SELECT * FROM lines ORDER BY id').all();
  for (const line of lines) {
    line.stations = db.prepare(`
      SELECT s.id, s.name, ls.position
      FROM stations s
      JOIN line_stations ls ON s.id = ls.station_id
      WHERE ls.line_id = ?
      ORDER BY ls.position
    `).all(line.id);
  }
  res.json(lines);
});

// GET /api/events
app.get('/api/events', isLoggedIn, (req, res) => {
  const events = db.prepare('SELECT * FROM events').all();
  res.json(events);
});

// GET /api/game/setup — assigns start and destination from server (BFS distance >= 3)
app.get('/api/game/setup', isLoggedIn, (req, res) => {
  const lines = db.prepare('SELECT id FROM lines').all();
  const adjacency = {};

  for (const line of lines) {
    const stns = db.prepare(
      'SELECT station_id FROM line_stations WHERE line_id = ? ORDER BY position'
    ).all(line.id);
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

  const stations = db.prepare('SELECT id, name FROM stations').all();
  const shuffled = [...stations].sort(() => Math.random() - 0.5);

  for (const start of shuffled) {
    const distances = bfsDistances(start.id);
    const candidates = stations.filter(s => s.id !== start.id && (distances[s.id] ?? 0) >= 3);
    if (candidates.length > 0) {
      const dest = candidates[Math.floor(Math.random() * candidates.length)];
      return res.json({ startStation: start, destination: dest });
    }
  }

  res.status(500).json({ error: 'Could not find a valid start/destination pair.' });
});

// POST /api/games
app.post('/api/games', isLoggedIn, (req, res) => {
  const { score } = req.body;
  if (typeof score !== 'number') {
    return res.status(400).json({ error: 'score must be a number.' });
  }
  const result = db.prepare('INSERT INTO games (user_id, score) VALUES (?, ?)').run(req.user.id, score);
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(game);
});

// GET /api/ranking
app.get('/api/ranking', isLoggedIn, (req, res) => {
  const ranking = db.prepare(`
    SELECT u.username, g.score, g.played_at
    FROM games g
    JOIN users u ON g.user_id = u.id
    ORDER BY g.score DESC, g.played_at ASC
  `).all();
  res.json(ranking);
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
