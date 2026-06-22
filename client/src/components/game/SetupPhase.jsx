export default function SetupPhase({ network, startStation, destination, error, onStart }) {
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

        <button className="game-btn primary" onClick={onStart}>
          Start Planning (90 s)
        </button>
      </div>
    </div>
  );
}
