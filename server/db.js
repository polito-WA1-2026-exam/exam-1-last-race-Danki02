/** DB access module **/

import sqlite3 from 'sqlite3';
import crypto from 'crypto';

const db = new sqlite3.Database('last_race.db', (err) => {
    if (err) throw err;
});

db.serialize(() => {
    db.run('PRAGMA journal_mode = DELETE');
    db.run('PRAGMA foreign_keys = ON');

    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS lines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS stations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS line_stations (
        line_id INTEGER NOT NULL,
        station_id INTEGER NOT NULL,
        position INTEGER NOT NULL,
        PRIMARY KEY (line_id, station_id),
        FOREIGN KEY (line_id) REFERENCES lines(id),
        FOREIGN KEY (station_id) REFERENCES stations(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT NOT NULL,
        effect INTEGER NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        score INTEGER NOT NULL DEFAULT 0,
        played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Seed metro lines (INSERT OR IGNORE is idempotent)
    db.run("INSERT OR IGNORE INTO lines (id, name) VALUES (1, 'Linea Rossa')");
    db.run("INSERT OR IGNORE INTO lines (id, name) VALUES (2, 'Linea Blu')");
    db.run("INSERT OR IGNORE INTO lines (id, name) VALUES (3, 'Linea Verde')");
    db.run("INSERT OR IGNORE INTO lines (id, name) VALUES (4, 'Linea Gialla')");

    // Seed stations
    db.run("INSERT OR IGNORE INTO stations (id, name) VALUES (1,  'Centrale')");
    db.run("INSERT OR IGNORE INTO stations (id, name) VALUES (2,  'Porta Velaria')");
    db.run("INSERT OR IGNORE INTO stations (id, name) VALUES (3,  'Crocevia del Falco')");
    db.run("INSERT OR IGNORE INTO stations (id, name) VALUES (4,  'Piazza delle Lanterne')");
    db.run("INSERT OR IGNORE INTO stations (id, name) VALUES (5,  'Arco di Nebbia')");
    db.run("INSERT OR IGNORE INTO stations (id, name) VALUES (6,  'Fontana Oscura')");
    db.run("INSERT OR IGNORE INTO stations (id, name) VALUES (7,  'Borgo Sereno')");
    db.run("INSERT OR IGNORE INTO stations (id, name) VALUES (8,  'Viale dei Mosaici')");
    db.run("INSERT OR IGNORE INTO stations (id, name) VALUES (9,  'Porto Nascosto')");
    db.run("INSERT OR IGNORE INTO stations (id, name) VALUES (10, 'Torre Cinerea')");
    db.run("INSERT OR IGNORE INTO stations (id, name) VALUES (11, 'Campo dell''Eco')");
    db.run("INSERT OR IGNORE INTO stations (id, name) VALUES (12, 'Giardino d''Ombra')");
    db.run("INSERT OR IGNORE INTO stations (id, name) VALUES (13, 'Lago dei Vapori')");

    // Seed line_stations: (line_id, station_id, position)
    // Linea Rossa (1): Centrale → Porta Velaria → Crocevia del Falco → Piazza delle Lanterne → Arco di Nebbia
    db.run("INSERT OR IGNORE INTO line_stations VALUES (1, 1,  1)");
    db.run("INSERT OR IGNORE INTO line_stations VALUES (1, 2,  2)");
    db.run("INSERT OR IGNORE INTO line_stations VALUES (1, 3,  3)");
    db.run("INSERT OR IGNORE INTO line_stations VALUES (1, 4,  4)");
    db.run("INSERT OR IGNORE INTO line_stations VALUES (1, 5,  5)");
    // Linea Blu (2): Centrale → Fontana Oscura → Borgo Sereno → Viale dei Mosaici → Porto Nascosto
    db.run("INSERT OR IGNORE INTO line_stations VALUES (2, 1,  1)");
    db.run("INSERT OR IGNORE INTO line_stations VALUES (2, 6,  2)");
    db.run("INSERT OR IGNORE INTO line_stations VALUES (2, 7,  3)");
    db.run("INSERT OR IGNORE INTO line_stations VALUES (2, 8,  4)");
    db.run("INSERT OR IGNORE INTO line_stations VALUES (2, 9,  5)");
    // Linea Verde (3): Porta Velaria → Fontana Oscura → Torre Cinerea → Campo dell'Eco → Giardino d'Ombra
    db.run("INSERT OR IGNORE INTO line_stations VALUES (3, 2,  1)");
    db.run("INSERT OR IGNORE INTO line_stations VALUES (3, 6,  2)");
    db.run("INSERT OR IGNORE INTO line_stations VALUES (3, 10, 3)");
    db.run("INSERT OR IGNORE INTO line_stations VALUES (3, 11, 4)");
    db.run("INSERT OR IGNORE INTO line_stations VALUES (3, 12, 5)");
    // Linea Gialla (4): Piazza delle Lanterne → Torre Cinerea → Viale dei Mosaici → Campo dell'Eco → Lago dei Vapori
    db.run("INSERT OR IGNORE INTO line_stations VALUES (4, 4,  1)");
    db.run("INSERT OR IGNORE INTO line_stations VALUES (4, 10, 2)");
    db.run("INSERT OR IGNORE INTO line_stations VALUES (4, 8,  3)");
    db.run("INSERT OR IGNORE INTO line_stations VALUES (4, 11, 4)");
    db.run("INSERT OR IGNORE INTO line_stations VALUES (4, 13, 5)");

    // Seed events
    db.run("INSERT OR IGNORE INTO events (id, description, effect) VALUES (1,  'Quiet journey',      0)");
    db.run("INSERT OR IGNORE INTO events (id, description, effect) VALUES (2,  'Wrong platform',    -2)");
    db.run("INSERT OR IGNORE INTO events (id, description, effect) VALUES (3,  'Kind passenger',    +1)");
    db.run("INSERT OR IGNORE INTO events (id, description, effect) VALUES (4,  'Signal delay',      -1)");
    db.run("INSERT OR IGNORE INTO events (id, description, effect) VALUES (5,  'Express service',   +2)");
    db.run("INSERT OR IGNORE INTO events (id, description, effect) VALUES (6,  'Lost ticket',       -3)");
    db.run("INSERT OR IGNORE INTO events (id, description, effect) VALUES (7,  'Found wallet',      +4)");
    db.run("INSERT OR IGNORE INTO events (id, description, effect) VALUES (8,  'Crowded train',     -4)");
    db.run("INSERT OR IGNORE INTO events (id, description, effect) VALUES (9,  'Helpful conductor', +3)");
    db.run("INSERT OR IGNORE INTO events (id, description, effect) VALUES (10, 'Missed stop',       -2)");

    // Seed test users and pre-existing games (only if table is empty)
    db.get('SELECT COUNT(*) as c FROM users', (err, row) => {
        if (err || row.c > 0) return;
        const users = [
            { username: 'dani',    password: 'password1' },
            { username: 'geri',    password: 'password2' },
            { username: 'claudio', password: 'password3' },
        ];
        const stmt = db.prepare('INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)');
        for (const u of users) {
            const salt = crypto.randomBytes(16).toString('hex');
            const hash = crypto.scryptSync(u.password, salt, 64).toString('hex');
            stmt.run(u.username, hash, salt);
        }
        stmt.finalize(() => {
            // Seed past games for dani (id=1) and geri (id=2)
            const gStmt = db.prepare('INSERT INTO games (user_id, score) VALUES (?, ?)');
            gStmt.run(1, 18);
            gStmt.run(1, 12);
            gStmt.run(1, 24);
            gStmt.run(2, 20);
            gStmt.run(2, 7);
            gStmt.finalize();
        });
    });
});

export default db;
