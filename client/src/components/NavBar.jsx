import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import './NavBar.css';

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">Last Race</Link>
      <div className="navbar-links">
        {user ? (
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
