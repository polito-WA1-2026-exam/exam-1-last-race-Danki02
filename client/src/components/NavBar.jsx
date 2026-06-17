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
      {user && (
        <div className="navbar-links">
          <Link to="/game">Play</Link>
          <Link to="/ranking">Ranking</Link>
          <span className="navbar-user">{user.username}</span>
          <button className="navbar-logout" onClick={handleLogout}>Logout</button>
        </div>
      )}
    </nav>
  );
}
