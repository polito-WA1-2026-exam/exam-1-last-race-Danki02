import { Link } from 'react-router-dom';
import './HomePage.css';

export default function HomePage({ user }) {

  return (
    <div className="home-page">
      <main className="home-main">
        <div className="home-logo">🚇</div>
        <h1 className="home-title">Last Race</h1>
        <p className="home-welcome">Welcome back, <strong>{user?.username}</strong></p>
        <p className="home-desc">
          The last train is leaving. Plan your route through the underground network
          and collect events along the way.
        </p>
        <div className="home-actions">
          <Link to="/game" className="home-btn primary">Play Now</Link>
          <Link to="/ranking" className="home-btn secondary">Ranking</Link>
          <Link to="/instructions" className="home-btn secondary">How to Play</Link>
        </div>
        <span className="home-badge">90s to plan · unlimited stations</span>
      </main>
    </div>
  );
}
