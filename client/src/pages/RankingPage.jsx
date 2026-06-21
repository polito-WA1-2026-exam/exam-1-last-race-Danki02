import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { getRanking } from '../api.js';
import './RankingPage.css';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function RankingPage() {
  const { user } = useAuth();
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getRanking()
      .then(setRanking)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const top3    = ranking.slice(0, 3);
  const theRest = ranking.slice(3);

  return (
    <div className="ranking-page">
      <div className="ranking-panel">
        <h2 className="ranking-title">Ranking — Best Scores</h2>

        {loading && <p className="ranking-loading">Loading…</p>}
        {error   && <p className="ranking-error">{error}</p>}

        {!loading && !error && ranking.length === 0 && (
          <p className="ranking-empty">No games played yet. Be the first!</p>
        )}

        {!loading && ranking.length > 0 && (
          <>
            {/* ── Podium for top 3 ── */}
            {top3.length >= 2 && (
              <div className="ranking-podium">
                {top3.map((entry, i) => (
                  <div key={entry.username} className={`podium-slot p${i + 1}`}>
                    <div className="podium-medal">{MEDALS[i]}</div>
                    <div className={`podium-name${entry.username === user?.username ? ' is-me' : ''}`}>
                      {entry.username}
                    </div>
                    <div className="podium-score">{entry.score}</div>
                    <div className="podium-bar" />
                  </div>
                ))}
              </div>
            )}

            {/* ── Full table ── */}
            <table className="ranking-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th>Best Score</th>
                  <th>Games</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((entry, i) => (
                  <tr
                    key={entry.username}
                    className={
                      (i === 0 ? 'rank-gold ' : i === 1 ? 'rank-silver ' : i === 2 ? 'rank-bronze ' : '') +
                      (entry.username === user?.username ? 'rank-me' : '')
                    }
                  >
                    <td className="rank-pos">
                      {i < 3
                        ? <span className="rank-medal">{MEDALS[i]}</span>
                        : `${i + 1}`
                      }
                    </td>
                    <td className="rank-username">
                      {entry.username}
                      {entry.username === user?.username && (
                        <span className="you-badge">you</span>
                      )}
                    </td>
                    <td className="rank-score pos">{entry.score}</td>
                    <td className="rank-games">{entry.games_played}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
