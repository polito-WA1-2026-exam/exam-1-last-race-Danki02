import { Link } from 'react-router-dom';
import { ExclamationCircleFill } from 'react-bootstrap-icons';
import './NotFoundPage.css';

export default function NotFoundPage() {
  return (
    <div className="notfound-page">
      <main className="notfound-main">
        <ExclamationCircleFill size={48} className="notfound-logo" />
        <h1 className="notfound-code">404</h1>
        <p className="notfound-title">Wrong Stop</p>
        <p className="notfound-desc">
          This station doesn't exist on the network.<br />
          Check your route and try again.
        </p>
        <Link to="/" className="notfound-btn">Back to Home</Link>
      </main>
    </div>
  );
}
