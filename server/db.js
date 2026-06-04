import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcrypt';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new DatabaseSync(path.join(__dirname, 'database.db'));

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS lines (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS stations (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS line_stations (
    line_id    INTEGER NOT NULL REFERENCES lines(id),
    station_id INTEGER NOT NULL REFERENCES stations(id),
    position   INTEGER NOT NULL,
    PRIMARY KEY (line_id, station_id)
  );

  CREATE TABLE IF NOT EXISTS events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT    NOT NULL,
    effect      INTEGER NOT NULL CHECK(effect >= -4 AND effect <= 4)
  );

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS games (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    score      INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

/* ---------------------------------------------------------------
   Network design – Aloria Metro (5 lines, 15 stations, 6 interchanges)

   Red:    Central Hub → North Terminal → Market Cross → Old Port → South Hill
   Blue:   Central Hub → Westgate → Park Lane → Airport
   Green:  Market Cross → Westgate → Industrial Zone → West Bridge
   Yellow: West Bridge → East Square → Riverside → Crystal Bay
   Purple: Riverside → Temple Road → South Hill → Dawn Quarter

   Interchange stations (served by 2+ lines):
     Central Hub (Red+Blue), Market Cross (Red+Green),
     Westgate (Blue+Green), West Bridge (Green+Yellow),
     Riverside (Yellow+Purple), South Hill (Red+Purple)
--------------------------------------------------------------- */

function seed() {
  const count = db.prepare('SELECT COUNT(*) as c FROM lines').get();
  if (count.c > 0) return;

  const insertLine    = db.prepare('INSERT INTO lines (name, color) VALUES (?, ?)');
  const insertStation = db.prepare('INSERT INTO stations (name) VALUES (?)');
  const insertLS      = db.prepare('INSERT INTO line_stations (line_id, station_id, position) VALUES (?, ?, ?)');
  const insertEvent   = db.prepare('INSERT INTO events (description, effect) VALUES (?, ?)');
  const insertUser    = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
  const insertGame    = db.prepare('INSERT INTO games (user_id, score, created_at) VALUES (?, ?, ?)');

  // Lines
  const lineRows = [
    { name: 'Red Line',    color: '#e74c3c' },
    { name: 'Blue Line',   color: '#3498db' },
    { name: 'Green Line',  color: '#2ecc71' },
    { name: 'Yellow Line', color: '#f1c40f' },
    { name: 'Purple Line', color: '#9b59b6' },
  ];
  for (const l of lineRows) insertLine.run(l.name, l.color);

  // Stations
  const stationNames = [
    'Central Hub', 'North Terminal', 'Market Cross', 'Old Port', 'South Hill',
    'Westgate', 'Park Lane', 'Airport',
    'Industrial Zone', 'West Bridge',
    'East Square', 'Riverside', 'Crystal Bay',
    'Temple Road', 'Dawn Quarter',
  ];
  for (const name of stationNames) insertStation.run(name);

  const lid = (name) => db.prepare('SELECT id FROM lines    WHERE name = ?').get(name).id;
  const sid = (name) => db.prepare('SELECT id FROM stations WHERE name = ?').get(name).id;

  const topology = {
    'Red Line':    ['Central Hub', 'North Terminal', 'Market Cross', 'Old Port', 'South Hill'],
    'Blue Line':   ['Central Hub', 'Westgate', 'Park Lane', 'Airport'],
    'Green Line':  ['Market Cross', 'Westgate', 'Industrial Zone', 'West Bridge'],
    'Yellow Line': ['West Bridge', 'East Square', 'Riverside', 'Crystal Bay'],
    'Purple Line': ['Riverside', 'Temple Road', 'South Hill', 'Dawn Quarter'],
  };

  for (const [lineName, stations] of Object.entries(topology)) {
    const lId = lid(lineName);
    stations.forEach((name, idx) => insertLS.run(lId, sid(name), idx + 1));
  }

  // Events (10 events, effects from -4 to +4)
  const events = [
    { description: 'Quiet journey, no disruptions',        effect:  0 },
    { description: 'Wrong platform, had to backtrack',     effect: -2 },
    { description: 'Kind passenger helped you find a seat',effect:  1 },
    { description: 'Signal delay caused a long wait',      effect: -1 },
    { description: 'Express service, arrived ahead of schedule', effect: 2 },
    { description: 'Pickpocket stole from your bag',       effect: -3 },
    { description: 'Found a lucky coin on the seat',       effect:  3 },
    { description: 'Crowded carriage, very stressful',     effect: -1 },
    { description: 'Free upgrade to priority carriage',    effect:  4 },
    { description: 'Emergency stop, long delay',           effect: -4 },
  ];
  for (const ev of events) insertEvent.run(ev.description, ev.effect);

  // Users  (passwords: alice→alice123, bob→bob123, charlie→charlie123)
  const aliceRow   = insertUser.run('alice',   bcrypt.hashSync('alice123',   10));
  const bobRow     = insertUser.run('bob',     bcrypt.hashSync('bob123',     10));
  insertUser.run('charlie', bcrypt.hashSync('charlie123', 10));

  // Pre-played games for alice and bob
  insertGame.run(aliceRow.lastInsertRowid, 22, '2026-06-01T10:00:00');
  insertGame.run(aliceRow.lastInsertRowid, 15, '2026-06-02T14:30:00');
  insertGame.run(bobRow.lastInsertRowid,   18, '2026-06-01T16:00:00');
  insertGame.run(bobRow.lastInsertRowid,    5, '2026-06-03T09:15:00');
}

seed();

export { db };
