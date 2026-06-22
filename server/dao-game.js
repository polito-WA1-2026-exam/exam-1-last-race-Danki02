import db from './db.js';
const all = (sql, params = []) => new Promise((resolve, reject) =>
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows))
);

const run = (sql, params = []) => new Promise((resolve, reject) =>
    db.run(sql, params, function (err) { err ? reject(err) : resolve({ id: this.lastID }); })
);

export default function GameDao() {

    // Returns all lines, each with its stations array ordered by position.
    // A single JOIN query fetches everything; we then group rows by line_id in JS.
    this.getNetwork = async () => {
        const rows = await all(`
            SELECT l.id AS line_id, l.name AS line_name, s.id, s.name, ls.position
            FROM lines l
            JOIN line_stations ls ON l.id = ls.line_id
            JOIN stations s ON s.id = ls.station_id
            ORDER BY l.id, ls.position`);

        const map = new Map();
        for (const r of rows) {
            if (!map.has(r.line_id))
                map.set(r.line_id, { id: r.line_id, name: r.line_name, stations: [] });
            map.get(r.line_id).stations.push({ id: r.id, name: r.name, position: r.position });
        }
        return [...map.values()];
    };

    // Returns unique adjacent station pairs across all lines, with no line info.
    // The self-join on position + 1 directly produces consecutive pairs per line;
    // deduplication in JS is needed because shared segments appear in multiple lines.
    this.getSegments = async () => {
        const rows = await all(`
            SELECT s1.id AS id_a, s1.name AS name_a, s2.id AS id_b, s2.name AS name_b
            FROM line_stations ls1
            JOIN line_stations ls2 ON ls1.line_id = ls2.line_id AND ls2.position = ls1.position + 1
            JOIN stations s1 ON s1.id = ls1.station_id
            JOIN stations s2 ON s2.id = ls2.station_id`);

        // Key is order-independent (min,max) so (A,B) and (B,A) map to the same entry
        const seen = new Set();
        return rows.filter(r => {
            const key = `${Math.min(r.id_a, r.id_b)},${Math.max(r.id_a, r.id_b)}`;
            return seen.has(key) ? false : seen.add(key);
        }).map(r => ({ stationA: { id: r.id_a, name: r.name_a }, stationB: { id: r.id_b, name: r.name_b } }));
    };

    // Returns all stations (used by game-logic to build the station lookup map)
    this.getStations = () => all('SELECT id, name FROM stations');

    // Returns all line_station rows ordered by line and position (used for adjacency and validation)
    this.getAllLineStations = () => all('SELECT line_id, station_id, position FROM line_stations ORDER BY line_id, position');

    // Returns all events (random effects applied to each segment during execution)
    this.getEvents = () => all('SELECT * FROM events');

    // Saves a completed game and returns the new row id
    this.saveGame = (userId, score) => run('INSERT INTO games (user_id, score) VALUES (?, ?)', [userId, score]);

    // Returns best score and total games played per user, ordered by best score descending
    this.getRanking = () => all(`
        SELECT u.username, MAX(g.score) AS score, COUNT(g.id) AS games_played
        FROM games g JOIN users u ON g.user_id = u.id
        GROUP BY u.id, u.username
        ORDER BY score DESC`);
}
