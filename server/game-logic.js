// Builds a map of station_id -> [neighbor station_ids] from raw line_station rows.
// Each line is a sequence of stations; adjacent stations in that sequence are connected.
function buildAdjacency(lineStations) {
    const lineGroups = {};
    for (const ls of lineStations) {
        if (!lineGroups[ls.line_id]) lineGroups[ls.line_id] = [];
        lineGroups[ls.line_id].push({ station_id: ls.station_id, position: ls.position });
    }

    const adjacency = {};
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
    return adjacency;
}

// BFS from startId — returns an object with the shortest hop-distance to every reachable station.
function bfsDistances(adjacency, startId) {
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

// Picks a random start station, then picks a random destination that is at least
// 3 hops away (so the route is non-trivial). Shuffles stations first to keep it random.
// Returns null if no valid pair exists (shouldn't happen with a real network).
function findGameSetup(lineStations, stations) {
    const adjacency = buildAdjacency(lineStations);
    const shuffled = [...stations].sort(() => Math.random() - 0.5);
    for (const start of shuffled) {
        const distances = bfsDistances(adjacency, start.id);
        const candidates = stations.filter(s => s.id !== start.id && (distances[s.id] ?? 0) >= 3);
        if (candidates.length > 0) {
            const dest = candidates[Math.floor(Math.random() * candidates.length)];
            return { startStation: start, destination: dest };
        }
    }
    return null;
}

// Builds two lookup structures used during route validation:
//   segmentLine:  "minId,maxId" -> lineId   (which line owns this segment)
//   stationLines: station_id    -> Set of lineIds  (which lines serve this station)
// The key is order-independent so we can look up both (a,b) and (b,a) the same way.
function buildSegmentMaps(lineStations) {
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
    return { segmentLine, stationLines };
}

// Validates the player's route against three rules:
//   1. Must start at the assigned start and end at the assigned destination.
//   2. Every step must be a real adjacent segment in the network.
//   3. Changing line is only allowed at interchange stations (served by 2+ lines).
function validateRoute(route, setup, lineStations) {
    if (route[0] !== setup.startId || route[route.length - 1] !== setup.destId)
        return false;

    const { segmentLine, stationLines } = buildSegmentMaps(lineStations);
    let currentLineId = null;
    for (let i = 0; i < route.length - 1; i++) {
        const from = route[i];
        const to = route[i + 1];
        const key = `${Math.min(from, to)},${Math.max(from, to)}`;
        const lineId = segmentLine[key];
        if (!lineId) return false; // segment doesn't exist
        if (currentLineId !== null && lineId !== currentLineId) {
            // line change — only valid at an interchange (station on 2+ lines)
            if ((stationLines[from]?.size ?? 0) < 2) return false;
        }
        currentLineId = lineId;
    }
    return true;
}

// Walks the validated route and assigns a random event to each segment.
// Coins start at 20; each event adds or subtracts its effect. Score is floored at 0.
function applyEvents(route, stations, events) {
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
    return { steps, finalScore: Math.max(0, coins) };
}

export { findGameSetup, validateRoute, applyEvents };
