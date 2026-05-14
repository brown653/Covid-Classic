import React, { useMemo, useState } from "react";
import "./App.css";

const defaultPlayers = [
  "Player 1",
  "Player 2",
  "Player 3",
  "Player 4",
  "Player 5",
  "Player 6",
  "Player 7",
  "Player 8",
];

const courses = {
  jackFrost: {
    name: "Jack Frost National",
    par: [4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 3, 5, 4, 4, 4, 3, 4, 5],
  },
  ballyowen: {
    name: "Ballyowen",
    par: [4, 4, 5, 3, 5, 3, 4, 4, 4, 5, 3, 4, 4, 4, 3, 4, 5, 4],
  },
};

const rounds = [
  {
    id: 1,
    name: "Round 1",
    courseKey: "jackFrost",
    format: "Best Ball Stableford",
  },
  {
    id: 2,
    name: "Round 2",
    courseKey: "jackFrost",
    format: "2-Man Scramble",
  },
  {
    id: 3,
    name: "Round 3",
    courseKey: "ballyowen",
    format: "Singles Matches",
  },
];

function getStablefordPoints(score, par) {
  if (!score) return 0;

  const diff = Number(score) - par;

  if (diff <= -3) return 5;
  if (diff === -2) return 4;
  if (diff === -1) return 3;
  if (diff === 0) return 2;
  if (diff === 1) return 1;

  return 0;
}

function App() {
  const [players, setPlayers] = useState(defaultPlayers);
  const [activeRoundId, setActiveRoundId] = useState(1);
  const [activeHole, setActiveHole] = useState(1);
  const [scores, setScores] = useState({});

  const [teams, setTeams] = useState({
    1: [
      ["Player 1", "Player 2"],
      ["Player 3", "Player 4"],
      ["Player 5", "Player 6"],
      ["Player 7", "Player 8"],
    ],
    2: [
      ["Player 1", "Player 2"],
      ["Player 3", "Player 4"],
      ["Player 5", "Player 6"],
      ["Player 7", "Player 8"],
    ],
    3: [
      ["Player 1", "Player 2"],
      ["Player 3", "Player 4"],
      ["Player 5", "Player 6"],
      ["Player 7", "Player 8"],
    ],
  });

  const activeRound = rounds.find((round) => round.id === activeRoundId);
  const course = courses[activeRound.courseKey];

  function updatePlayer(index, newName) {
    const oldName = players[index];
    const updatedPlayers = [...players];
    updatedPlayers[index] = newName;
    setPlayers(updatedPlayers);

    setTeams((previousTeams) => {
      const updatedTeams = { ...previousTeams };

      Object.keys(updatedTeams).forEach((roundId) => {
        updatedTeams[roundId] = updatedTeams[roundId].map((team) =>
          team.map((player) => (player === oldName ? newName : player))
        );
      });

      return updatedTeams;
    });
  }

  function updateScore(player, holeNumber, value) {
    setScores((previousScores) => ({
      ...previousScores,
      [activeRoundId]: {
        ...(previousScores[activeRoundId] || {}),
        [player]: {
          ...((previousScores[activeRoundId] || {})[player] || {}),
          [holeNumber]: value,
        },
      },
    }));
  }

  function getScore(player, holeNumber) {
    return scores?.[activeRoundId]?.[player]?.[holeNumber] || "";
  }

  function updateTeam(roundId, teamIndex, playerIndex, value) {
    setTeams((previousTeams) => {
      const updatedTeams = { ...previousTeams };

      updatedTeams[roundId] = updatedTeams[roundId].map((team, index) => {
        if (index !== teamIndex) return team;

        const updatedTeam = [...team];
        updatedTeam[playerIndex] = value;
        return updatedTeam;
      });

      return updatedTeams;
    });
  }

  function resetCurrentRound() {
    setScores((previousScores) => ({
      ...previousScores,
      [activeRoundId]: {},
    }));
  }

  const leaderboard = useMemo(() => {
    const roundScores = scores[activeRoundId] || {};
    const currentTeams = teams[activeRoundId] || [];

    if (activeRound.format === "Best Ball Stableford") {
      return currentTeams
        .map((team, index) => {
          let totalPoints = 0;

          course.par.forEach((par, holeIndex) => {
            const holeNumber = holeIndex + 1;

            const teamHolePoints = team.map((player) =>
              getStablefordPoints(roundScores?.[player]?.[holeNumber], par)
            );

            totalPoints += Math.max(...teamHolePoints);
          });

          return {
            name: `Team ${index + 1}`,
            players: team.join(" / "),
            score: totalPoints,
            label: "points",
          };
        })
        .sort((a, b) => b.score - a.score);
    }

    if (activeRound.format === "2-Man Scramble") {
      return currentTeams
        .map((team, index) => {
          const scoringPlayer = team[0];
          let gross = 0;
          let parTotal = 0;
          let holesEntered = 0;

          course.par.forEach((par, holeIndex) => {
            const holeNumber = holeIndex + 1;
            const score = Number(roundScores?.[scoringPlayer]?.[holeNumber]);

            if (score) {
              gross += score;
              parTotal += par;
              holesEntered += 1;
            }
          });

          const toPar = holesEntered ? gross - parTotal : 0;

          return {
            name: `Team ${index + 1}`,
            players: team.join(" / "),
            score: toPar,
            label: "to par",
          };
        })
        .sort((a, b) => a.score - b.score);
    }

    return currentTeams.map((match, index) => {
      const playerA = match[0];
      const playerB = match[1];

      let matchScore = 0;

      course.par.forEach((_, holeIndex) => {
        const holeNumber = holeIndex + 1;
        const scoreA = Number(roundScores?.[playerA]?.[holeNumber]);
        const scoreB = Number(roundScores?.[playerB]?.[holeNumber]);

        if (scoreA && scoreB) {
          if (scoreA < scoreB) matchScore += 1;
          if (scoreB < scoreA) matchScore -= 1;
        }
      });

      let result = "All Square";

      if (matchScore > 0) result = `${playerA} ${matchScore} Up`;
      if (matchScore < 0) result = `${playerB} ${Math.abs(matchScore)} Up`;

      return {
        name: `Match ${index + 1}`,
        players: `${playerA} vs ${playerB}`,
        score: result,
        label: "",
      };
    });
  }, [scores, activeRoundId, teams, activeRound.format, course.par]);

  return (
    <div className="app">
      <header className="hero">
        <p className="eyebrow">Golf Trip Scoreboard</p>
        <h1>Covid Classic</h1>
        <p className="subtitle">
          Track Best Ball Stableford, 2-Man Scramble, and Singles Matches.
        </p>
      </header>

      <div className="round-buttons">
        {rounds.map((round) => (
          <button
            key={round.id}
            className={activeRoundId === round.id ? "active" : ""}
            onClick={() => {
              setActiveRoundId(round.id);
              setActiveHole(1);
            }}
          >
            {round.name}
          </button>
        ))}
      </div>

      <main className="layout">
        <section className="card scoreboard-card">
          <div className="section-header">
            <div>
              <h2>
                {activeRound.name}: {activeRound.format}
              </h2>
              <p>
                {course.name} | Par{" "}
                {course.par.reduce((total, par) => total + par, 0)}
              </p>
            </div>

            <button className="secondary" onClick={resetCurrentRound}>
              Reset Round
            </button>
          </div>

          <div className="mobile-score-entry">
            <div className="mobile-hole-header">
              <div>
                <h3>Hole {activeHole}</h3>
                <p>Par {course.par[activeHole - 1]}</p>
              </div>

              <select
                value={activeHole}
                onChange={(event) => setActiveHole(Number(event.target.value))}
              >
                {course.par.map((_, index) => (
                  <option key={index + 1} value={index + 1}>
                    Hole {index + 1}
                  </option>
                ))}
              </select>
            </div>

            <div className="hole-nav">
              {course.par.map((_, index) => (
                <button
                  key={index + 1}
                  className={activeHole === index + 1 ? "active-hole" : ""}
                  onClick={() => setActiveHole(index + 1)}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            <div className="mobile-player-scores">
              {players.map((player) => (
                <div className="mobile-player-row" key={player}>
                  <span>{player}</span>

                  <input
                    type="number"
                    min="1"
                    value={getScore(player, activeHole)}
                    onChange={(event) =>
                      updateScore(player, activeHole, event.target.value)
                    }
                    placeholder="-"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="player-col">Player</th>
                  {course.par.map((par, index) => (
                    <th key={index}>
                      <div>{index + 1}</div>
                      <small>Par {par}</small>
                    </th>
                  ))}
                  <th>Total</th>
                </tr>
              </thead>

              <tbody>
                {players.map((player) => {
                  const total = course.par.reduce((sum, _, holeIndex) => {
                    const holeNumber = holeIndex + 1;
                    return sum + Number(getScore(player, holeNumber) || 0);
                  }, 0);

                  return (
                    <tr key={player}>
                      <td className="player-col">{player}</td>

                      {course.par.map((_, holeIndex) => {
                        const holeNumber = holeIndex + 1;

                        return (
                          <td key={holeNumber}>
                            <input
                              className="score-input"
                              type="number"
                              min="1"
                              value={getScore(player, holeNumber)}
                              onChange={(event) =>
                                updateScore(
                                  player,
                                  holeNumber,
                                  event.target.value
                                )
                              }
                            />
                          </td>
                        );
                      })}

                      <td className="total-cell">{total || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="side-panel">
          <section className="card">
            <h2>Leaderboard</h2>

            <div className="leaderboard">
              {leaderboard.map((item, index) => (
                <div className="leaderboard-row" key={index}>
                  <div>
                    <strong>
                      #{index + 1} {item.name}
                    </strong>
                    <p>{item.players}</p>
                  </div>

                  <div className="leader-score">
                    <strong>{item.score}</strong>
                    <span>{item.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <h2>Teams / Matches</h2>

            {(teams[activeRoundId] || []).map((team, teamIndex) => (
              <div className="team-row" key={teamIndex}>
                <span>
                  {activeRound.format === "Singles Matches"
                    ? `Match ${teamIndex + 1}`
                    : `Team ${teamIndex + 1}`}
                </span>

                <div className="team-selects">
                  {team.map((player, playerIndex) => (
                    <select
                      key={playerIndex}
                      value={player}
                      onChange={(event) =>
                        updateTeam(
                          activeRoundId,
                          teamIndex,
                          playerIndex,
                          event.target.value
                        )
                      }
                    >
                      {players.map((playerOption) => (
                        <option key={playerOption} value={playerOption}>
                          {playerOption}
                        </option>
                      ))}
                    </select>
                  ))}
                </div>
              </div>
            ))}
          </section>
        </aside>
      </main>

      <section className="card players-card">
        <div className="section-header">
          <div>
            <h2>Players</h2>
            <p>Edit these once you have the final 8 guys.</p>
          </div>
        </div>

        <div className="players-grid">
          {players.map((player, index) => (
            <input
              key={index}
              value={player}
              onChange={(event) => updatePlayer(index, event.target.value)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export default App;
