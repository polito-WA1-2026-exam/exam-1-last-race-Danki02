import { Link } from 'react-router-dom';
import './InstructionsPage.css';

export default function InstructionsPage() {
  return (
    <div className="instr-page">
      <div className="instr-panel">
        <h1 className="instr-title">Last Race</h1>
        <p className="instr-subtitle">A single-player underground metro adventure</p>

        <div className="instr-section">
          <h2>How to Play</h2>
          <ol className="instr-steps">
            <li>
              <strong>Setup</strong> — You are shown a fictional metro network with lines and stations.
              Study it carefully before starting.
            </li>
            <li>
              <strong>Planning (90 seconds)</strong> — You receive a start station and a destination.
              You see only the list of segment pairs — no line names.
              Click segments in sequence to build your route before time runs out.
            </li>
            <li>
              <strong>Execution</strong> — Your route is validated. If valid, each step triggers a
              random event that adds or removes coins from your starting balance of <strong>20 coins</strong>.
              Events are revealed one at a time.
            </li>
            <li>
              <strong>Result</strong> — Your final coin total is your score (minimum 0).
              Invalid or incomplete routes score 0. Play again to beat your personal best!
            </li>
          </ol>
        </div>

        <div className="instr-section">
          <h2>Route Rules</h2>
          <ul className="instr-rules">
            <li>The route must start and end at the assigned stations.</li>
            <li>Each step must be an adjacent pair of stations on the same metro line.</li>
            <li>Changing lines is only allowed at <em>interchange stations</em> — stations served by more than one line.</li>
          </ul>
        </div>

        <div className="instr-section">
          <h2>Scoring</h2>
          <ul className="instr-rules">
            <li>Start with <strong>20 coins</strong> each game.</li>
            <li>Each segment triggers one random event: effect ranges from −4 to +4 coins.</li>
            <li>Final score = remaining coins (floored at 0).</li>
            <li>Your best score across all games appears on the Ranking page.</li>
          </ul>
        </div>

        <div className="instr-login-cta">
          <p>Log in to start playing and appear on the ranking board.</p>
          <Link to="/login" className="instr-btn">Log in</Link>
        </div>
      </div>
    </div>
  );
}
