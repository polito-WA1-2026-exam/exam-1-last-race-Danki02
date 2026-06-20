/* Data Access Object (DAO) module for accessing game data */

import db from './db.js';

export default function GameDao() {

    // Returns all lines, each with its ordered stations array
    this.getNetwork = () => {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM lines ORDER BY id', (err, lines) => {
                if (err) return reject(err);
                if (lines.length === 0) return resolve([]);

                let remaining = lines.length;
                for (const line of lines) {
                    db.all(
                        `SELECT s.id, s.name, ls.position
                         FROM stations s
                         JOIN line_stations ls ON s.id = ls.station_id
                         WHERE ls.line_id = ?
                         ORDER BY ls.position`,
                        [line.id],
                        (err, stations) => {
                            if (err) return reject(err);
                            line.stations = stations;
                            if (--remaining === 0) resolve(lines);
                        }
                    );
                }
            });
        });
    };

    // Returns unique adjacent station pairs across all lines (no line info)
    this.getSegments = () => {
        return new Promise((resolve, reject) => {
            db.all('SELECT id FROM lines', (err, lines) => {
                if (err) return reject(err);
                if (lines.length === 0) return resolve([]);

                const seen = new Set();
                const segments = [];
                let remaining = lines.length;

                for (const line of lines) {
                    db.all(
                        `SELECT s.id, s.name
                         FROM stations s
                         JOIN line_stations ls ON s.id = ls.station_id
                         WHERE ls.line_id = ?
                         ORDER BY ls.position`,
                        [line.id],
                        (err, stns) => {
                            if (err) return reject(err);
                            for (let i = 0; i < stns.length - 1; i++) {
                                const a = stns[i];
                                const b = stns[i + 1];
                                const key = `${Math.min(a.id, b.id)},${Math.max(a.id, b.id)}`;
                                if (!seen.has(key)) {
                                    seen.add(key);
                                    segments.push({
                                        stationA: { id: a.id, name: a.name },
                                        stationB: { id: b.id, name: b.name },
                                    });
                                }
                            }
                            if (--remaining === 0) resolve(segments);
                        }
                    );
                }
            });
        });
    };

    // Returns all stations
    this.getStations = () => {
        return new Promise((resolve, reject) => {
            db.all('SELECT id, name FROM stations', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    };

    // Returns all line_station rows for adjacency/validation logic
    this.getAllLineStations = () => {
        return new Promise((resolve, reject) => {
            db.all(
                `SELECT line_id, station_id, position
                 FROM line_stations
                 ORDER BY line_id, position`,
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    };

    // Returns all events
    this.getEvents = () => {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM events', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    };

    // Saves a completed game and returns its id
    this.saveGame = (userId, score) => {
        return new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO games (user_id, score) VALUES (?, ?)',
                [userId, score],
                function (err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID });
                }
            );
        });
    };

    // Returns best score + games played per user, ordered by score desc
    this.getRanking = () => {
        return new Promise((resolve, reject) => {
            db.all(
                `SELECT u.username, MAX(g.score) AS score, COUNT(g.id) AS games_played
                 FROM games g
                 JOIN users u ON g.user_id = u.id
                 GROUP BY u.id, u.username
                 ORDER BY score DESC`,
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    };

}
