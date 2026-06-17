import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import './HomePage.css';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="home-page">
      <main className="home-main">
        <h2 className="home-welcome">Welcome, <strong>{user?.username}</strong></h2>
        <p className="home-desc">
          The last train is leaving. Plan your route through the underground network
          and collect events along the way.
        </p>
        <div className="home-actions">
          <Link to="/game" className="home-btn primary">Play Now</Link>
          <Link to="/ranking" className="home-btn secondary">Ranking</Link>
        </div>
      </main>
    </div>
  );
}
