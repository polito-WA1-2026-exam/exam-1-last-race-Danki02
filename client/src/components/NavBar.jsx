import { Link, useNavigate } from 'react-router-dom';
import './NavBar.css';

export default function NavBar({ user, loggedIn, logout }) {
  const navigate = useNavigate();

  // Call the logout function from App, then redirect to login
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">Last Race</Link>
      <div className="navbar-links">
        {/* Show full nav when logged in, minimal links otherwise */}
        {loggedIn ? (
          <>
            <Link to="/game">Play</Link>
            <Link to="/ranking">Ranking</Link>
            <Link to="/instructions">How to Play</Link>
            <span className="navbar-user">{user.username}</span>
            <button className="navbar-logout" onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/instructions">How to Play</Link>
            <Link to="/login" className="navbar-login-link">Login</Link>
          </>
        )}
      </div>
    </nav>
  );
}
