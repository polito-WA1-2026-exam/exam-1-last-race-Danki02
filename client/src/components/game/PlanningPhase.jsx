export default function PlanningPhase({
  segments, allStations, route, timeLeft,
  startStation, destination, saving,
  onAddSegment, onUndo, onReset, onSubmit,
}) {
  const currentStationId = route[route.length - 1];
  const reachedDest = currentStationId === destination?.id;
  const usableSegments = segments.filter(
    seg => seg.stationA.id === currentStationId || seg.stationB.id === currentStationId
  );

  const timerClass = timeLeft <= 10 ? 'timer-urgent' : timeLeft <= 30 ? 'timer-warning' : '';
  const barClass   = timeLeft <= 10 ? 'bar-urgent'   : timeLeft <= 30 ? 'bar-warning'   : 'bar-ok';
  const barWidth   = (timeLeft / 90) * 100;
  const stationName = id => allStations.find(s => s.id === id)?.name ?? id;

  return (
    <div className="game-page planning-layout">
      {/* Left column: mission header and clickable segment list */}
      <div className="planning-left">
        <div className="planning-header">
          <span>
            <strong>{startStation?.name}</strong> → <strong>{destination?.name}</strong>
          </span>
          <div className="timer-block">
            <span className={`planning-timer ${timerClass}`}>{timeLeft}s</span>
            <div className="timer-bar">
              <div className={`timer-bar-fill ${barClass}`} style={{ width: `${barWidth}%` }} />
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
                onClick={() => usable && !reachedDest && onAddSegment(seg)}
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

      {/* Right column: station map and route being built */}
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

          {reachedDest && <p className="reached-badge">Destination reached!</p>}

          <div className="planning-actions">
            <button className="game-btn small" onClick={onUndo} disabled={route.length <= 1}>
              Undo
            </button>
            <button className="game-btn small" onClick={onReset}>
              Reset
            </button>
            <button
              className="game-btn primary"
              onClick={onSubmit}
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
