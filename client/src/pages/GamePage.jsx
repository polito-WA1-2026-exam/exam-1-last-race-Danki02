import { Container, Alert } from 'react-bootstrap';

// Game phases: setup → planning → execution → result
// Full implementation coming in the next development iteration.
export default function GamePage() {
  return (
    <Container className="mt-5">
      <h2>Game</h2>
      <Alert variant="secondary">
        Gioco da fà.
      </Alert>
    </Container>
  );
}
