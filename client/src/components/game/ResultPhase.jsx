import { useNavigate } from 'react-router-dom';

export default function ResultPhase({ gameResult, destination, error, onPlayAgain }) {
  const navigate = useNavigate();

  const finalScore = gameResult?.finalScore ?? 0;
  const isValid    = gameResult?.valid ?? false;
  const steps      = gameResult?.steps ?? [];

  const posSteps    = steps.filter(s => s.event.effect > 0);
  const negSteps    = steps.filter(s => s.event.effect < 0);
  const totalGained = posSteps.reduce((sum, s) => sum + s.event.effect, 0);
  const totalLost   = negSteps.reduce((sum, s) => sum + s.event.effect, 0);
  const avgEffect   = steps.length > 0
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
          <div className={`final-score ${finalScore > 0 ? 'pos' : 'zero'}`}>{finalScore}</div>
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
          <button className="game-btn primary" onClick={onPlayAgain}>Play Again</button>
          <button className="game-btn secondary" onClick={() => navigate('/ranking')}>
            View Ranking
          </button>
        </div>
      </div>
    </div>
  );
}
