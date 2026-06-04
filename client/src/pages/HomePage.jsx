import { Container, Card, Alert, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <Container className="mt-5" style={{ maxWidth: '720px' }}>
      <h1 className="mb-1">Last Race</h1>
      <p className="lead text-muted mb-4">
        A single-player underground metro racing game.
      </p>

      {!user && (
        <Alert variant="info">
          <Alert.Heading>Welcome, traveller!</Alert.Heading>
          <p className="mb-2">
            To play, please{' '}
            <Alert.Link as={Link} to="/login">login</Alert.Link>.
          </p>
        </Alert>
      )}

      <Card className="mb-3">
        <Card.Header as="h5">How to Play</Card.Header>
        <Card.Body>
          <ol className="mb-0">
            <li className="mb-2">
              <strong>Setup</strong> — Study the full metro map: all lines, stations, and
              connections are shown. Take your time before starting the clock.
            </li>
            <li className="mb-2">
              <strong>Planning</strong> — You have <strong>90 seconds</strong>. You are given a
              starting and a destination station. Using only the list of connected pairs (lines are
              hidden), reconstruct the network in your head and click the segments that form your
              route.
            </li>
            <li className="mb-2">
              <strong>Execution</strong> — The server validates your route. For each segment a
              random event occurs, adding or removing coins. Events are shown one step at a time.
            </li>
            <li>
              <strong>Result</strong> — Your final coin balance is your score. Beat your record
              and climb the ranking!
            </li>
          </ol>
        </Card.Body>
      </Card>

      <Card className="mb-4">
        <Card.Header as="h5">Rules</Card.Header>
        <Card.Body>
          <ul className="mb-0">
            <li>Each game starts with <strong>20 coins</strong>.</li>
            <li>
              A route is <strong>valid</strong> when it follows real metro connections and line
              changes occur only at interchange stations.
            </li>
            <li>
              An invalid or incomplete route means you lose all 20 coins (score = 0).
            </li>
            <li>A negative final score is stored and shown as 0.</li>
          </ul>
        </Card.Body>
      </Card>

      {user && (
        <div className="d-flex gap-2">
          <Button as={Link} to="/game" variant="primary" size="lg">
            Play Now
          </Button>
          <Button as={Link} to="/ranking" variant="outline-secondary" size="lg">
            Ranking
          </Button>
        </div>
      )}
    </Container>
  );
}
