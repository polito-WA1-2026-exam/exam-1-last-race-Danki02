export default function ExecutionPhase({ steps, stepIndex, onNextStep, onViewResults }) {
  const visibleSteps = steps.slice(0, stepIndex);
  const allRevealed  = stepIndex >= steps.length;
  const latestCoins  = visibleSteps.length > 0 ? visibleSteps[visibleSteps.length - 1].coins : 20;
  const progressPct  = steps.length > 0 ? (stepIndex / steps.length) * 100 : 0;

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
          <button className="game-btn primary" onClick={onNextStep}>Next Stop →</button>
        ) : (
          <button className="game-btn primary" onClick={onViewResults}>View Results</button>
        )}
      </div>
    </div>
  );
}
