import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNetwork, getSegments, getGameSetup, executeGame } from '../api.js';
import './GamePage.css';

export default function GamePage() {
  const navigate = useNavigate();

  // Loaded data
  const [network, setNetwork] = useState([]);
  const [segments, setSegments] = useState([]);
  const [startStation, setStartStation] = useState(null);
  const [destination, setDestination] = useState(null);

  // Phase: loading | setup | planning | executing | execution | result
  const [phase, setPhase] = useState('loading');
  const [error, setError] = useState('');

  // Planning
  const [route, setRoute] = useState([]);
  const routeRef = useRef([]);
  const [timeLeft, setTimeLeft] = useState(90);

  // Execution / Result
  const [gameResult, setGameResult] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  // ── Initial load ──────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([getNetwork(), getGameSetup()])
      .then(([net, setup]) => {
        setNetwork(net);
        setStartStation(setup.startStation);
        setDestination(setup.destination);
        setPhase('setup');
      })
      .catch(err => {
        setError(err.message);
        setPhase('setup');
      });
  }, []);

  // ── Enter planning: load segments, reset route ────────────────────────────────
  useEffect(() => {
    if (phase !== 'planning') return;

    setTimeLeft(90);
    routeRef.current = [startStation?.id];
    setRoute([startStation?.id]);

    getSegments()
      .then(setSegments)
      .catch(err => setError(err.message));
  }, [phase, startStation]);

  // ── 90-second planning timer ──────────────────────────────────────────────────
  const submitRouteRef = useRef(null);

  useEffect(() => {
    if (phase !== 'planning') return;

    const startTime = Date.now();
    const countInterval = setInterval(() => {
      const remaining = Math.max(0, Math.round((90000 - (Date.now() - startTime)) / 1000));
      setTimeLeft(remaining);
    }, 500);

    const timeout = setTimeout(() => {
      clearInterval(countInterval);
      setTimeLeft(0);
      submitRouteRef.current?.();
    }, 90000);

    return () => {
      clearInterval(countInterval);
      clearTimeout(timeout);
    };
  }, [phase]);

  // ── Submit route (manual or auto) ─────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const currentRoute = routeRef.current;
    setPhase('executing');
    setSaving(true);
    setError('');
    try {
      const result = await executeGame(currentRoute);
      setGameResult(result);
      setStepIndex(0);
      setPhase(result.valid ? 'execution' : 'result');
    } catch (err) {
      setError(err.message);
      setPhase('result');
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    submitRouteRef.current = handleSubmit;
  }, [handleSubmit]);

  // ── Route building helpers ────────────────────────────────────────────────────
  const currentStationId = route[route.length - 1];

  const usableSegments = segments.filter(
    seg => seg.stationA.id === currentStationId || seg.stationB.id === currentStationId
  );

  const addSegment = (seg) => {
    const nextId = seg.stationA.id === currentStationId ? seg.stationB.id : seg.stationA.id;
    const newRoute = [...routeRef.current, nextId];
    routeRef.current = newRoute;
    setRoute(newRoute);
  };

  const resetRoute = () => {
    const initial = [startStation?.id];
    routeRef.current = initial;
    setRoute(initial);
  };

  const undoLastStep = () => {
    if (route.length <= 1) return;
    const newRoute = route.slice(0, -1);
    routeRef.current = newRoute;
    setRoute(newRoute);
  };

  // ── Play again ────────────────────────────────────────────────────────────────
  const playAgain = async () => {
    setPhase('loading');
    setError('');
    setGameResult(null);
    setStepIndex(0);
    try {
      const setup = await getGameSetup();
      setStartStation(setup.startStation);
      setDestination(setup.destination);
      setPhase('setup');
    } catch (err) {
      setError(err.message);
      setPhase('setup');
    }
  };

  // ── All stations list (for planning map) ──────────────────────────────────────
  const allStations = [...new Map(
    network.flatMap(l => l.stations).map(s => [s.id, s])
  ).values()];

  // ── LOADING ───────────────────────────────────────────────────────────────────
  if (phase === 'loading' || phase === 'executing') {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <span className="loading-label">
          {phase === 'executing' ? 'Validating route…' : 'Loading network…'}
        </span>
      </div>
    );
  }

  // ── SETUP ─────────────────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="game-page">
        <div className="game-panel">
          <h2 className="phase-title">Study the Network</h2>
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

          <p className="setup-hint">
            Memorise the network. In the planning phase you won't see line connections — only a list of segment pairs.
          </p>

          <button className="game-btn primary" onClick={() => setPhase('planning')}>
            Start Planning (90 s)
          </button>
        </div>
      </div>
    );
  }

  // ── PLANNING ──────────────────────────────────────────────────────────────────
  if (phase === 'planning') {
    const reachedDest = currentStationId === destination?.id;
    const timerClass = timeLeft <= 10 ? 'timer-urgent' : timeLeft <= 30 ? 'timer-warning' : '';
    const barClass   = timeLeft <= 10 ? 'bar-urgent'   : timeLeft <= 30 ? 'bar-warning'   : 'bar-ok';
    const barWidth   = (timeLeft / 90) * 100;
    const stationName = id => allStations.find(s => s.id === id)?.name ?? id;

    return (
      <div className="game-page planning-layout">
        {/* ── Left: header + segment list ── */}
        <div className="planning-left">
          <div className="planning-header">
            <span>
              <strong>{startStation?.name}</strong> → <strong>{destination?.name}</strong>
            </span>
            <div className="timer-block">
              <span className={`planning-timer ${timerClass}`}>{timeLeft}s</span>
              <div className="timer-bar">
                <div
                  className={`timer-bar-fill ${barClass}`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          </div>

          <h3 className="segments-title">All Segments ({segments.length})</h3>
          <ul className="segments-list">
            {segments.map((seg, i) => {
              const usable =
                seg.stationA.id === currentStationId ||
                seg.stationB.id === currentStationId;
              return (
                <li
                  key={i}
                  className={'segment-item' + (usable ? ' segment-usable' : '')}
                  onClick={() => usable && !reachedDest && addSegment(seg)}
                  title={usable && !reachedDest ? 'Click to add this segment' : ''}
                >
                  <span className="seg-station">{seg.stationA.name}</span>
                  <span className="seg-dash"> — </span>
                  <span className="seg-station">{seg.stationB.name}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* ── Right: route being built + station map ── */}
        <div className="planning-right">
          <div className="station-grid">
            <h3 className="station-grid-title">Stations</h3>
            <div className="station-chips">
              {allStations.map(s => (
                <span
                  key={s.id}
                  className={
                    'station-dot' +
                    (s.id === startStation?.id ? ' dot-start' : '') +
                    (s.id === destination?.id ? ' dot-dest' : '') +
                    (s.id === currentStationId ? ' dot-current' : '')
                  }
                >
                  {s.name}
                </span>
              ))}
            </div>
          </div>

          <div className="route-panel">
            <h3 className="route-title">
              Your Route
              <span className="route-pos"> — at: <strong>{stationName(currentStationId)}</strong></span>
            </h3>

            <div className="route-meta">
              <span className="route-stat">Stops: <strong>{route.length - 1}</strong></span>
              <span className="route-stat">Usable segments: <strong>{usableSegments.length}</strong></span>
            </div>

            {route.length <= 1 ? (
              <p className="route-empty">Click a segment to start your journey from <strong>{startStation?.name}</strong></p>
            ) : (
              <ol className="route-steps">
                <li className="route-start">Start: {startStation?.name}</li>
                {route.slice(1).map((id, i) => (
                  <li key={i} className={id === destination?.id ? 'step-dest' : ''}>
                    → {stationName(id)}
                  </li>
                ))}
              </ol>
            )}

            {reachedDest && (
              <p className="reached-badge">Destination reached!</p>
            )}

            <div className="planning-actions">
              <button className="game-btn small" onClick={undoLastStep} disabled={route.length <= 1}>
                Undo
              </button>
              <button className="game-btn small" onClick={resetRoute}>
                Reset
              </button>
              <button
                className="game-btn primary"
                onClick={handleSubmit}
                disabled={saving || route.length < 2}
              >
                Submit Route
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── EXECUTION ─────────────────────────────────────────────────────────────────
  if (phase === 'execution') {
    const { steps, finalScore } = gameResult;
    const visibleSteps = steps.slice(0, stepIndex);
    const allRevealed = stepIndex >= steps.length;
    const latestCoins = visibleSteps.length > 0 ? visibleSteps[visibleSteps.length - 1].coins : 20;
    const progressPct = steps.length > 0 ? (stepIndex / steps.length) * 100 : 0;

    return (
      <div className="game-page">
        <div className="game-panel">
          <h2 className="phase-title">Journey</h2>

          <div className="exec-header">
            <div className="exec-meta">
              <span className="exec-progress">{stepIndex} / {steps.length} stops</span>
              <div className="exec-progress-bar">
                <div className="exec-progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
            <div className="exec-score-block">
              <div className="exec-score-label">Coins</div>
              <div className={`exec-score ${latestCoins >= 0 ? 'pos' : 'neg'}`}>
                {latestCoins >= 0 ? '+' : ''}{latestCoins}
              </div>
            </div>
          </div>

          <div className="event-log">
            {stepIndex === 0 && (
              <p className="exec-hint">Press "Next Stop" to start travelling…</p>
            )}
            {visibleSteps.map((step, i) => (
              <div
                key={i}
                className={`event-entry ${step.event.effect > 0 ? 'ev-pos' : step.event.effect < 0 ? 'ev-neg' : 'ev-neu'}`}
              >
                <div className="entry-left">
                  <div className="entry-station">{step.fromStation.name} → {step.toStation.name}</div>
                  <div className="entry-event">{step.event.description}</div>
                </div>
                <div className="entry-right">
                  <span className="entry-effect">
                    {step.event.effect > 0 ? '+' : ''}{step.event.effect}
                  </span>
                  <span className="entry-total">total: {step.coins}</span>
                </div>
              </div>
            ))}
          </div>

          {!allRevealed ? (
            <button className="game-btn primary" onClick={() => setStepIndex(i => i + 1)}>
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

  // ── RESULT ────────────────────────────────────────────────────────────────────
  const finalScore = gameResult?.finalScore ?? 0;
  const isValid    = gameResult?.valid ?? false;
  const steps      = gameResult?.steps ?? [];

  // Compute statistics from steps
  const posSteps     = steps.filter(s => s.event.effect > 0);
  const negSteps     = steps.filter(s => s.event.effect < 0);
  const totalGained  = posSteps.reduce((sum, s) => sum + s.event.effect, 0);
  const totalLost    = negSteps.reduce((sum, s) => sum + s.event.effect, 0);
  const avgEffect    = steps.length > 0
    ? (steps.reduce((sum, s) => sum + s.event.effect, 0) / steps.length).toFixed(1)
    : '—';
  const bestStep  = steps.length > 0 ? steps.reduce((b, s) => s.event.effect > b.event.effect ? s : b, steps[0]) : null;
  const worstStep = steps.length > 0 ? steps.reduce((w, s) => s.event.effect < w.event.effect ? s : w, steps[0]) : null;

  return (
    <div className="game-page">
      <div className="game-panel result-panel">
        <h2 className="phase-title">Result</h2>

        <div className="final-score-block">
          <div className="final-score-label">Final Score</div>
          <div className={`final-score ${finalScore > 0 ? 'pos' : 'zero'}`}>
            {finalScore}
          </div>
          <div className="final-score-label">coins</div>
        </div>

        {isValid ? (
          <p className="result-msg success">
            Valid route — you reached <strong>{destination?.name}</strong>.
          </p>
        ) : (
          <p className="result-msg invalid">
            Invalid or incomplete route — score: 0 coins.
          </p>
        )}

        {steps.length > 0 && (
          <>
            <hr className="result-divider" />
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Stops</div>
                <div className="stat-value accent">{steps.length}</div>
                <div className="stat-sub">segments travelled</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Positive Events</div>
                <div className="stat-value pos">{posSteps.length}</div>
                <div className="stat-sub">+{totalGained} coins gained</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Negative Events</div>
                <div className="stat-value neg">{negSteps.length}</div>
                <div className="stat-sub">{totalLost} coins lost</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Avg. per Stop</div>
                <div className={`stat-value ${Number(avgEffect) >= 0 ? 'pos' : 'neg'}`}>{avgEffect}</div>
                <div className="stat-sub">coins/segment</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Best Event</div>
                <div className="stat-value pos">{bestStep ? `+${bestStep.event.effect}` : '—'}</div>
                <div className="stat-sub">{bestStep?.toStation?.name ?? ''}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Worst Event</div>
                <div className="stat-value neg">{worstStep ? worstStep.event.effect : '—'}</div>
                <div className="stat-sub">{worstStep?.toStation?.name ?? ''}</div>
              </div>
            </div>
          </>
        )}

        {error && <p className="game-error">{error}</p>}

        <div className="result-actions">
          <button className="game-btn primary" onClick={playAgain}>Play Again</button>
          <button className="game-btn secondary" onClick={() => navigate('/ranking')}>
            View Ranking
          </button>
        </div>
      </div>
    </div>
  );
}
