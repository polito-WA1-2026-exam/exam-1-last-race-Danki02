import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { login as apiLogin, logout as apiLogout, getCurrentUser } from './api.js';
import NavBar from './components/NavBar.jsx';
import LoginPage from './pages/LoginPage.jsx';
import HomePage from './pages/HomePage.jsx';
import GamePage from './pages/GamePage.jsx';
import RankingPage from './pages/RankingPage.jsx';
import InstructionsPage from './pages/InstructionsPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

function App() {
  const [user, setUser] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if a session is already active on first load
  useEffect(() => {
    getCurrentUser()
      .then(user => { setUser(user); setLoggedIn(!!user); })
      .catch(() => { setLoggedIn(false); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  // Call the API login and update auth state on success
  const handleLogin = async (credentials) => {
    const user = await apiLogin(credentials.username, credentials.password);
    setUser(user); setLoggedIn(true);
  };

  // Call the API logout and clear auth state
  const handleLogout = async () => {
    await apiLogout();
    setLoggedIn(false); setUser(null);
  };

  if (loading) return <div className="app-loading">Loading…</div>;

  return (
    <>
      <NavBar user={user} loggedIn={loggedIn} logout={handleLogout} />
      <Routes>
        <Route path="/login"        element={loggedIn ? <Navigate replace to="/" /> : <LoginPage login={handleLogin} />} />
        <Route path="/"             element={loggedIn ? <HomePage user={user} /> : <InstructionsPage loggedIn={loggedIn} />} />
        <Route path="/instructions" element={<InstructionsPage loggedIn={loggedIn} />} />
        <Route path="/game"         element={<ProtectedRoute loggedIn={loggedIn}><GamePage /></ProtectedRoute>} />
        <Route path="/ranking"      element={<ProtectedRoute loggedIn={loggedIn}><RankingPage user={user} /></ProtectedRoute>} />
        <Route path="*"             element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

export default App;
