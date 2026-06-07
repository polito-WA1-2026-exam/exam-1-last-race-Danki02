import Database from 'better-sqlite3';
import { scryptSync, randomBytes } from 'crypto';

const db = new Database('last_race.db');

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS stations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS line_stations (
    line_id INTEGER NOT NULL,
    station_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    PRIMARY KEY (line_id, station_id),
    FOREIGN KEY (line_id) REFERENCES lines(id),
    FOREIGN KEY (station_id) REFERENCES stations(id)
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    effect INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

// Seed network and events once
const lineCount = db.prepare('SELECT COUNT(*) as c FROM lines').get().c;
if (lineCount === 0) {
  const insertLine = db.prepare('INSERT INTO lines (name) VALUES (?)');
  const lineIds = {};
  for (const name of ['Linea Rossa', 'Linea Blu', 'Linea Verde', 'Linea Gialla']) {
    lineIds[name] = insertLine.run(name).lastInsertRowid;
  }

  const insertStation = db.prepare('INSERT INTO stations (name) VALUES (?)');
  const stationIds = {};
  const stationNames = [
    'Centrale', 'Porta Velaria', 'Crocevia del Falco', 'Piazza delle Lanterne', 'Arco di Nebbia',
    'Fontana Oscura', 'Borgo Sereno', 'Viale dei Mosaici', 'Porto Nascosto',
    'Torre Cinerea', "Campo dell'Eco", "Giardino d'Ombra", 'Lago dei Vapori',
  ];
  for (const name of stationNames) {
    stationIds[name] = insertStation.run(name).lastInsertRowid;
  }

  const insertLS = db.prepare('INSERT INTO line_stations (line_id, station_id, position) VALUES (?, ?, ?)');
  const networkLayout = {
    'Linea Rossa':  ['Centrale', 'Porta Velaria', 'Crocevia del Falco', 'Piazza delle Lanterne', 'Arco di Nebbia'],
    'Linea Blu':    ['Centrale', 'Fontana Oscura', 'Borgo Sereno', 'Viale dei Mosaici', 'Porto Nascosto'],
    'Linea Verde':  ['Porta Velaria', 'Fontana Oscura', 'Torre Cinerea', "Campo dell'Eco", "Giardino d'Ombra"],
    'Linea Gialla': ['Piazza delle Lanterne', 'Torre Cinerea', 'Viale dei Mosaici', "Campo dell'Eco", 'Lago dei Vapori'],
  };
  for (const [lineName, stations] of Object.entries(networkLayout)) {
    stations.forEach((stationName, index) => {
      insertLS.run(lineIds[lineName], stationIds[stationName], index + 1);
    });
  }

  const insertEvent = db.prepare('INSERT INTO events (description, effect) VALUES (?, ?)');
  const events = [
    ['Quiet journey',     0],
    ['Wrong platform',   -2],
    ['Kind passenger',   +1],
    ['Signal delay',     -1],
    ['Express service',  +2],
    ['Lost ticket',      -3],
    ['Found wallet',     +4],
    ['Crowded train',    -4],
    ['Helpful conductor',+3],
    ['Missed stop',      -2],
  ];
  for (const [description, effect] of events) {
    insertEvent.run(description, effect);
  }
}

// Seed users once
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
if (userCount === 0) {
  const insertUser = db.prepare('INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)');
  const insertGame = db.prepare('INSERT INTO games (user_id, score, played_at) VALUES (?, ?, ?)');

  const usersToSeed = [
    { username: 'alice',   password: 'password1' },
    { username: 'bob',     password: 'password2' },
    { username: 'charlie', password: 'password3' },
  ];

  const userIds = {};
  for (const u of usersToSeed) {
    const { hash, salt } = hashPassword(u.password);
    userIds[u.username] = insertUser.run(u.username, hash, salt).lastInsertRowid;
  }

  insertGame.run(userIds['alice'], 18, '2026-06-01 10:00:00');
  insertGame.run(userIds['alice'], 12, '2026-06-02 11:00:00');
  insertGame.run(userIds['bob'],   20, '2026-06-03 09:00:00');
  insertGame.run(userIds['bob'],    5, '2026-06-04 15:00:00');
}

export default db;
