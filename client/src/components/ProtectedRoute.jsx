import { Navigate } from 'react-router-dom';

// Redirects to login if the user is not authenticated
export default function ProtectedRoute({ loggedIn, children }) {
  if (!loggedIn) return <Navigate to="/login" replace />;
  return children;
}
