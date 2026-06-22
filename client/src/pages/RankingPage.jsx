import { useState, useEffect } from 'react';
import { getRanking } from '../api.js';
import './RankingPage.css';

// Top-3 medal badges styled via CSS classes
const MEDALS = [
  <span className="medal medal-gold">1°</span>,
  <span className="medal medal-silver">2°</span>,
  <span className="medal medal-bronze">3°</span>,
];

export default function RankingPage({ user }) {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch the global leaderboard on mount
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
            {/* Podium: visual display of the top 3 players */}
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

            {/* Full leaderboard table with all players */}
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
