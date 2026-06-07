import { useAuth } from '../context/AuthContext.jsx';
import { logout } from '../api.js';
import './HomePage.css';

export default function HomePage() {
  const { user, setUser } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setUser(null);
    }
  };

  return (
    <div className="home-page">
      <header className="home-header">
        <h1 className="home-title">Last Race</h1>
        <div className="home-user">
          <span>Welcome, <strong>{user.username}</strong></span>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main className="home-main">
        <p className="home-placeholder">Game coming soon…</p>
      </main>
    </div>
  );
}
