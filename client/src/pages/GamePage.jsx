import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNetwork, getEvents, getGameSetup, saveGame } from '../api.js';
import './GamePage.css';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getAllStations(network) {
  const map = new Map();
  for (const line of network) {
    for (const s of line.stations) {
      if (!map.has(s.id)) map.set(s.id, { ...s });
    }
  }
  return [...map.values()];
}

function getLinesForStation(network, stationId) {
  return network.filter(line => line.stations.some(s => s.id === stationId));
}

function getStopsBetween(line, fromId, toId) {
  const from = line.stations.find(s => s.id === fromId);
  const to = line.stations.find(s => s.id === toId);
  if (!from || !to) return [];
  const goingForward = from.position < to.position;
  const stops = line.stations.filter(s =>
    goingForward
      ? s.position > from.position && s.position <= to.position
      : s.position >= to.position && s.position < from.position
  );
  return goingForward
    ? stops.sort((a, b) => a.position - b.position)
    : stops.sort((a, b) => b.position - a.position);
}


export default function GamePage() {
  const navigate = useNavigate();

  const [phase, setPhase] = useState('loading');
  const [network, setNetwork] = useState([]);
  const [allEvents, setAllEvents] = useState([]);

  // Game state
  const [startStation, setStartStation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [shuffledEvents, setShuffledEvents] = useState([]);

  // Planning state
  const [currentStation, setCurrentStation] = useState(null);
  const [plannedStops, setPlannedStops] = useState([]);
  const [selectedLineId, setSelectedLineId] = useState('');
  const [selectedTargetId, setSelectedTargetId] = useState('');

  // Execution state
  const [execStep, setExecStep] = useState(0);
  const [score, setScore] = useState(20);
  const [eventLog, setEventLog] = useState([]);

  // Result state
  const [saving, setSaving] = useState(false);
  const [savedGame, setSavedGame] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getNetwork(), getEvents(), getGameSetup()])
      .then(([net, evts, setup]) => {
        setNetwork(net);
        setAllEvents(evts);
        setStartStation(setup.startStation);
        setDestination(setup.destination);
        setCurrentStation(setup.startStation);
        setShuffledEvents(shuffle(evts));
        setPhase('setup');
      })
      .catch(err => {
        setError(err.message);
        setPhase('setup');
      });
  }, []);

  const availableLines = currentStation ? getLinesForStation(network, currentStation.id) : [];
  const selectedLine = network.find(l => l.id === Number(selectedLineId));
  const targetOptions = selectedLine
    ? selectedLine.stations.filter(s => s.id !== currentStation?.id)
    : [];

  const addLeg = () => {
    if (!selectedLine || !selectedTargetId) return;
    const target = selectedLine.stations.find(s => s.id === Number(selectedTargetId));
    if (!target) return;
    const stops = getStopsBetween(selectedLine, currentStation.id, target.id);
    const newStops = stops.map(s => ({ station: s, lineName: selectedLine.name }));
    setPlannedStops(prev => [...prev, ...newStops]);
    setCurrentStation(target);
    setSelectedLineId('');
    setSelectedTargetId('');
  };

  const resetPlanning = () => {
    setPlannedStops([]);
    setCurrentStation(startStation);
    setSelectedLineId('');
    setSelectedTargetId('');
  };

  const revealNext = () => {
    const idx = execStep;
    if (idx >= plannedStops.length) return;
    const event = shuffledEvents[idx % shuffledEvents.length];
    const { station, lineName } = plannedStops[idx];
    const newScore = score + event.effect;
    setEventLog(prev => [...prev, { station, lineName, event, score: newScore }]);
    setScore(newScore);
    setExecStep(idx + 1);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const game = await saveGame(score);
      setSavedGame(game);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const playAgain = async () => {
    setPhase('loading');
    setPlannedStops([]);
    setSelectedLineId('');
    setSelectedTargetId('');
    setExecStep(0);
    setScore(20);
    setEventLog([]);
    setSavedGame(null);
    setError('');
    try {
      const setup = await getGameSetup();
      setStartStation(setup.startStation);
      setDestination(setup.destination);
      setCurrentStation(setup.startStation);
      setShuffledEvents(shuffle(allEvents));
      setPhase('setup');
    } catch (err) {
      setError(err.message);
      setPhase('setup');
    }
  };

  const reachedDestination =
    plannedStops.length > 0 &&
    plannedStops[plannedStops.length - 1]?.station.id === destination?.id;

  const allStopsRevealed = execStep >= plannedStops.length;

  // ── LOADING ──────────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="game-page">
        <p className="game-loading">Loading network…</p>
      </div>
    );
  }

  // ── SETUP ────────────────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="game-page">
        <div className="game-panel">
          <h2 className="phase-title">Mission Briefing</h2>
          {error && <p className="game-error">{error}</p>}

          <div className="setup-mission">
            <div className="mission-card start">
              <span className="mission-label">Departure</span>
              <span className="mission-station">{startStation?.name}</span>
            </div>
            <div className="mission-arrow">→</div>
            <div className="mission-card dest">
              <span className="mission-label">Destination</span>
              <span className="mission-station">{destination?.name}</span>
            </div>
          </div>

          <div className="network-map">
            <h3>Metro Network</h3>
            {network.map(line => (
              <div key={line.id} className="line-row">
                <span className="line-name">{line.name}</span>
                <div className="line-stations">
                  {line.stations.map((s, i) => (
                    <span key={s.id} className="station-chip-wrap">
                      <span
                        className={
                          'station-chip' +
                          (s.id === startStation?.id ? ' chip-start' : '') +
                          (s.id === destination?.id ? ' chip-dest' : '')
                        }
                      >
                        {s.name}
                      </span>
                      {i < line.stations.length - 1 && <span className="chip-sep">—</span>}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button className="game-btn primary" onClick={() => setPhase('planning')}>
            Start Planning
          </button>
        </div>
      </div>
    );
  }

  // ── PLANNING ─────────────────────────────────────────────────────────────────
  if (phase === 'planning') {
    return (
      <div className="game-page">
        <div className="game-panel">
          <h2 className="phase-title">Plan Your Route</h2>

          <div className="planning-header">
            <span>From <strong>{startStation?.name}</strong></span>
            <span className="arrow">→</span>
            <span>To <strong>{destination?.name}</strong></span>
          </div>

          <div className="current-pos">
            Currently at: <strong>{currentStation?.name}</strong>
            {currentStation?.id === destination?.id && (
              <span className="reached-badge"> Destination reached!</span>
            )}
          </div>

          {plannedStops.length > 0 && (
            <div className="planned-route">
              <h4>Planned route ({plannedStops.length} stops)</h4>
              <ol className="stops-list">
                {plannedStops.map((item, i) => (
                  <li key={i} className={item.station.id === destination?.id ? 'stop-dest' : ''}>
                    <span className="stop-line-tag">{item.lineName}</span>
                    {item.station.name}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {currentStation?.id !== destination?.id && (
            <div className="leg-form">
              <h4>Add leg</h4>
              <div className="leg-selects">
                <select
                  value={selectedLineId}
                  onChange={e => { setSelectedLineId(e.target.value); setSelectedTargetId(''); }}
                >
                  <option value="">Choose line…</option>
                  {availableLines.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>

                <select
                  value={selectedTargetId}
                  onChange={e => setSelectedTargetId(e.target.value)}
                  disabled={!selectedLineId}
                >
                  <option value="">Choose station…</option>
                  {targetOptions.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>

                <button
                  className="game-btn secondary"
                  onClick={addLeg}
                  disabled={!selectedLineId || !selectedTargetId}
                >
                  Add
                </button>
              </div>
            </div>
          )}

          <div className="planning-actions">
            <button className="game-btn" onClick={resetPlanning}>Reset</button>
            <button
              className="game-btn primary"
              onClick={() => setPhase('execution')}
              disabled={plannedStops.length === 0}
            >
              Execute ({plannedStops.length} stops)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── EXECUTION ────────────────────────────────────────────────────────────────
  if (phase === 'execution') {
    return (
      <div className="game-page">
        <div className="game-panel">
          <h2 className="phase-title">Execution</h2>

          <div className="exec-header">
            <span className="exec-progress">{execStep} / {plannedStops.length} stops</span>
            <span className={`exec-score ${score >= 0 ? 'pos' : 'neg'}`}>
              Score: {score > 0 ? '+' : ''}{score}
            </span>
          </div>

          <div className="event-log">
            {eventLog.length === 0 && (
              <p className="exec-hint">Press "Next Stop" to start travelling…</p>
            )}
            {eventLog.map((entry, i) => (
              <div
                key={i}
                className={`event-entry ${entry.event.effect > 0 ? 'ev-pos' : entry.event.effect < 0 ? 'ev-neg' : 'ev-neu'}`}
              >
                <div className="entry-left">
                  <span className="entry-line-tag">{entry.lineName}</span>
                  <span className="entry-station">{entry.station.name}</span>
                </div>
                <div className="entry-right">
                  <span className="entry-event">{entry.event.description}</span>
                  <span className="entry-effect">
                    {entry.event.effect > 0 ? '+' : ''}{entry.event.effect}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {!allStopsRevealed ? (
            <button className="game-btn primary" onClick={revealNext}>
              Next Stop →
            </button>
          ) : (
            <button className="game-btn primary" onClick={() => setPhase('result')}>
              View Results
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── RESULT ───────────────────────────────────────────────────────────────────
  return (
    <div className="game-page">
      <div className="game-panel result-panel">
        <h2 className="phase-title">Result</h2>

        <div className={`final-score ${score >= 0 ? 'pos' : 'neg'}`}>
          {score > 0 ? '+' : ''}{score}
        </div>

        {reachedDestination ? (
          <p className="result-msg success">You reached {destination?.name}!</p>
        ) : (
          <p className="result-msg">
            You stopped at <strong>{currentStation?.name}</strong>.
            Destination was <strong>{destination?.name}</strong>.
          </p>
        )}

        <div className="result-stats">
          <span>Stops: {plannedStops.length}</span>
          <span>Events: {eventLog.length}</span>
        </div>

        {error && <p className="game-error">{error}</p>}

        {!savedGame ? (
          <button className="game-btn primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Score'}
          </button>
        ) : (
          <p className="saved-msg">Score saved!</p>
        )}

        <div className="result-actions">
          <button className="game-btn" onClick={playAgain}>Play Again</button>
          <button className="game-btn secondary" onClick={() => navigate('/ranking')}>
            View Ranking
          </button>
        </div>
      </div>
    </div>
  );
}
