import express          from 'express';
import cors             from 'cors';
import session          from 'express-session';
import passport         from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt           from 'bcrypt';
import morgan           from 'morgan';
import { db }           from './db.js';

// ── Passport ────────────────────────────────────────────────────────────────

passport.use(new LocalStrategy(async (username, password, done) => {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return done(null, false, { message: 'Incorrect credentials.' });
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return done(null, false, { message: 'Incorrect credentials.' });
  return done(null, { id: user.id, username: user.username });
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(id);
  done(null, user || false);
});

// ── App setup ────────────────────────────────────────────────────────────────

const app = express();

app.use(morgan('dev'));
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'lastrace-dev-secret-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: false, sameSite: 'lax' },
}));
app.use(passport.initialize());
app.use(passport.session());

// ── Middleware helpers ───────────────────────────────────────────────────────

const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: 'Not authenticated.' });
};

// ── Auth routes ──────────────────────────────────────────────────────────────

// POST /api/sessions – login
app.post('/api/sessions', (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: 'Username and password required.' });

  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ message: info?.message || 'Login failed.' });
    req.login(user, (err) => {
      if (err) return next(err);
      res.json({ id: user.id, username: user.username });
    });
  })(req, res, next);
});

// DELETE /api/sessions/current – logout
app.delete('/api/sessions/current', isAuthenticated, (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ message: 'Logout failed.' });
    res.status(204).end();
  });
});

// GET /api/sessions/current – get logged-in user
app.get('/api/sessions/current', (req, res) => {
  if (req.isAuthenticated())
    return res.json({ id: req.user.id, username: req.user.username });
  res.status(401).json({ message: 'Not authenticated.' });
});

// ── Network routes ───────────────────────────────────────────────────────────

// GET /api/network – full network (lines + ordered stations) for setup phase
app.get('/api/network', isAuthenticated, (req, res) => {
  const lines = db.prepare('SELECT id, name, color FROM lines').all();
  const ls    = db.prepare(`
    SELECT ls.line_id, s.id AS station_id, s.name AS station_name, ls.position
    FROM line_stations ls
    JOIN stations s ON s.id = ls.station_id
    ORDER BY ls.line_id, ls.position
  `).all();

  const result = lines.map(line => ({
    ...line,
    stations: ls
      .filter(r => r.line_id === line.id)
      .map(r => ({ id: r.station_id, name: r.station_name, position: r.position })),
  }));

  res.json(result);
});

// GET /api/network/segments – all connected pairs for the planning phase list
app.get('/api/network/segments', isAuthenticated, (req, res) => {
  // Each segment is an unordered pair of adjacent stations on the same line.
  // We deduplicate because the same physical segment can belong to multiple lines.
  const rows = db.prepare(`
    SELECT DISTINCT
      MIN(s1.name, s2.name) AS from_name,
      MAX(s1.name, s2.name) AS to_name
    FROM line_stations a
    JOIN line_stations b ON b.line_id = a.line_id AND b.position = a.position + 1
    JOIN stations s1 ON s1.id = a.station_id
    JOIN stations s2 ON s2.id = b.station_id
    ORDER BY from_name, to_name
  `).all();

  res.json(rows.map(r => ({ from: r.from_name, to: r.to_name })));
});

// GET /api/network/stations – station names + positions for the planning map
app.get('/api/network/stations', isAuthenticated, (req, res) => {
  const stations = db.prepare('SELECT id, name FROM stations ORDER BY name').all();
  res.json(stations);
});

// ── Ranking route ────────────────────────────────────────────────────────────

// GET /api/ranking – best score per user, descending
app.get('/api/ranking', isAuthenticated, (req, res) => {
  const ranking = db.prepare(`
    SELECT u.username, MAX(g.score) AS best_score
    FROM games g
    JOIN users u ON u.id = g.user_id
    GROUP BY u.id
    ORDER BY best_score DESC
  `).all();
  res.json(ranking);
});

// ── Error handler ────────────────────────────────────────────────────────────

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error.' });
});

app.listen(3001, () => console.log('Server running on http://localhost:3001'));
