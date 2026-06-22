import { useState, useEffect, useRef } from 'react';
import { getNetwork, getSegments, getGameSetup, executeGame } from '../api.js';
import SetupPhase     from '../components/game/SetupPhase.jsx';
import PlanningPhase  from '../components/game/PlanningPhase.jsx';
import ExecutionPhase from '../components/game/ExecutionPhase.jsx';
import ResultPhase    from '../components/game/ResultPhase.jsx';
import './GamePage.css';

export default function GamePage() {
  const [network, setNetwork]           = useState([]);
  const [segments, setSegments]         = useState([]);
  const [startStation, setStartStation] = useState(null);
  const [destination, setDestination]   = useState(null);
  const [phase, setPhase]               = useState('loading');
  const [error, setError]               = useState('');

  const [route, setRoute]         = useState([]);
  const routeRef                  = useRef([]);
  const [timeLeft, setTimeLeft]   = useState(90);

  const [gameResult, setGameResult] = useState(null);
  const [stepIndex, setStepIndex]   = useState(0);
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    Promise.all([getNetwork(), getGameSetup()])
      .then(([net, setup]) => {
        setNetwork(net);
        setStartStation(setup.startStation);
        setDestination(setup.destination);
        setPhase('setup');
      })
      .catch(err => { setError(err.message); setPhase('setup'); });
  }, []);

  useEffect(() => {
    if (phase !== 'planning') return;

    const initial = [startStation?.id];
    routeRef.current = initial;
    setRoute(initial);
    setTimeLeft(90);
    getSegments().then(setSegments).catch(err => setError(err.message));

    const startTime = Date.now();
    const tick = setInterval(() => {
      setTimeLeft(Math.max(0, Math.round((90000 - (Date.now() - startTime)) / 1000)));
    }, 500);
    const timeout = setTimeout(() => { clearInterval(tick); handleSubmit(); }, 90000);

    return () => { clearInterval(tick); clearTimeout(timeout); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, startStation]);

  const handleSubmit = async () => {
    setPhase('executing');
    setSaving(true);
    setError('');
    try {
      const result = await executeGame(routeRef.current);
      setGameResult(result);
      setStepIndex(0);
      setPhase(result.valid ? 'execution' : 'result');
    } catch (err) {
      setError(err.message);
      setPhase('result');
    } finally {
      setSaving(false);
    }
  };

  const addSegment = (seg) => {
    const currentId = routeRef.current[routeRef.current.length - 1];
    const nextId    = seg.stationA.id === currentId ? seg.stationB.id : seg.stationA.id;
    const newRoute  = [...routeRef.current, nextId];
    routeRef.current = newRoute;
    setRoute(newRoute);
  };

  const undoLastStep = () => {
    if (route.length <= 1) return;
    const newRoute = route.slice(0, -1);
    routeRef.current = newRoute;
    setRoute(newRoute);
  };

  const resetRoute = () => {
    const initial = [startStation?.id];
    routeRef.current = initial;
    setRoute(initial);
  };

  const playAgain = async () => {
    setPhase('loading');
    setError('');
    setGameResult(null);
    setStepIndex(0);
    try {
      const setup = await getGameSetup();
      setStartStation(setup.startStation);
      setDestination(setup.destination);
      setPhase('setup');
    } catch (err) {
      setError(err.message);
      setPhase('setup');
    }
  };

  const allStations = [...new Map(
    network.flatMap(l => l.stations).map(s => [s.id, s])
  ).values()];

  if (phase === 'loading' || phase === 'executing') {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <span className="loading-label">
          {phase === 'executing' ? 'Validating route…' : 'Loading network…'}
        </span>
      </div>
    );
  }

  if (phase === 'setup')
    return <SetupPhase network={network} startStation={startStation} destination={destination} error={error} onStart={() => setPhase('planning')} />;

  if (phase === 'planning')
    return <PlanningPhase segments={segments} allStations={allStations} route={route} timeLeft={timeLeft} startStation={startStation} destination={destination} saving={saving} onAddSegment={addSegment} onUndo={undoLastStep} onReset={resetRoute} onSubmit={handleSubmit} />;

  if (phase === 'execution')
    return <ExecutionPhase steps={gameResult.steps} stepIndex={stepIndex} onNextStep={() => setStepIndex(i => i + 1)} onViewResults={() => setPhase('result')} />;

  return <ResultPhase gameResult={gameResult} destination={destination} error={error} onPlayAgain={playAgain} />;
}
