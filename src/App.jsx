import React, { useMemo, useState } from "react";
import "./App.css";

const defaultPlayers = [
  "Al Brown",
  "Charles Mayer",
  "Mike Luddy",
  "Mike Paladino",
  "Kevin Gilmore",
  "Jason Spendley",
  "Brian Riordan",
  "Pat",
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

function awardPoint(teamOneScore, teamTwoScore, higherIsBetter = true) {
  if (teamOneScore === teamTwoScore) return [0.5, 0.5];

  if (higherIsBetter) {
    return teamOneScore > teamTwoScore ? [1, 0] : [0, 1];
  }

  return teamOneScore < teamTwoScore ? [1, 0] : [0, 1];
}

function App() {
  const [players, setPlayers] = useState(defaultPlayers);
  const [scores, setScores] = useState({});
  const [activeHole, setActiveHole] = useState(1);
  const [selectedMatchupId, setSelectedMatchupId] = useState("dashboard");

  const [teams, setTeams] = useState({
    1: [
      ["Al Brown", "Charles Mayer", "Mike Luddy", "Mike Paladino"],
      ["Kevin Gilmore", "Jason Spendley", "Brian Riordan", "Pat"],
    ],
    2: [
      ["Al Brown", "Charles Mayer"],
      ["Mike Luddy", "Mike Paladino"],
      ["Kevin Gilmore", "Jason Spendley"],
      ["Brian Riordan", "Pat"],
    ],
    3: [
      ["Al Brown", "Kevin Gilmore"],
      ["Charles Mayer", "Jason Spendley"],
      ["Mike Luddy", "Brian Riordan"],
      ["Mike Paladino", "Pat"],
    ],
  });

  function getScore(roundId, player, holeNumber) {
    return scores?.[roundId]?.[player]?.[holeNumber] || "";
  }

  function updateScore(roundId, player, holeNumber, value) {
    setScores((previousScores) => ({
      ...previousScores,
      [roundId]: {
        ...(previousScores[roundId] || {}),
        [player]: {
          ...((previousScores[roundId] || {})[player] || {}),
          [holeNumber]: value,
        },
      },
    }));
  }

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

  function resetRound(roundId) {
    setScores((previousScores) => ({
      ...previousScores,
      [roundId]: {},
    }));
  }

  function getPlayerTotal(roundId, player, holeStart = 1, holeEnd = 18) {
    let total = 0;

    for (let holeNumber = holeStart; holeNumber <= holeEnd; holeNumber++) {
      total += Number(getScore(roundId, player, holeNumber) || 0);
    }

    return total;
  }

  function getStablefordTeamTotal(team, holeStart, holeEnd) {
    const par = courses.jackFrost.par;
    let total = 0;

    for (let holeNumber = holeStart; holeNumber <= holeEnd; holeNumber++) {
      const holePar = par[holeNumber - 1];

      const bestHolePoints = Math.max(
        ...team.map((player) =>
          getStablefordPoints(getScore(1, player, holeNumber), holePar)
        )
      );

      total += bestHolePoints;
    }

    return total;
  }

  function getScramblePairTotal(pair, holeStart, holeEnd) {
    const scoringPlayer = pair[0];
    let total = 0;

    for (let holeNumber = holeStart; holeNumber <= holeEnd; holeNumber++) {
      total += Number(getScore(2, scoringPlayer, holeNumber) || 0);
    }

    return total;
  }

  function getScrambleSideTotal(sideNumber, holeStart, holeEnd) {
    const scrambleTeams = teams[2];

    const sidePairs =
      sideNumber === 1
        ? [scrambleTeams[0], scrambleTeams[1]]
        : [scrambleTeams[2], scrambleTeams[3]];

    return sidePairs.reduce(
      (sum, pair) => sum + getScramblePairTotal(pair, holeStart, holeEnd),
      0
    );
  }

  function getSinglesSideTotal(sideNumber, holeStart, holeEnd) {
    const matches = teams[3];
    let total = 0;

    matches.forEach((match) => {
      const playerA = match[0];
      const playerB = match[1];

      for (let holeNumber = holeStart; holeNumber <= holeEnd; holeNumber++) {
        const scoreA = Number(getScore(3, playerA, holeNumber));
        const scoreB = Number(getScore(3, playerB, holeNumber));

        if (scoreA && scoreB) {
          if (scoreA < scoreB && sideNumber === 1) total += 1;
          if (scoreB < scoreA && sideNumber === 2) total += 1;
        }
      }
    });

    return total;
  }

  const overallLeaderboard = useMemo(() => {
    const teamOne = teams[1][0];
    const teamTwo = teams[1][1];

    let teamOnePoints = 0;
    let teamTwoPoints = 0;

    const details = [];

    const stableford = {
      teamOneFront: getStablefordTeamTotal(teamOne, 1, 9),
      teamTwoFront: getStablefordTeamTotal(teamTwo, 1, 9),
      teamOneBack: getStablefordTeamTotal(teamOne, 10, 18),
      teamTwoBack: getStablefordTeamTotal(teamTwo, 10, 18),
      teamOneFull: getStablefordTeamTotal(teamOne, 1, 18),
      teamTwoFull: getStablefordTeamTotal(teamTwo, 1, 18),
    };

    const scramble = {
      teamOneFront: getScrambleSideTotal(1, 1, 9),
      teamTwoFront: getScrambleSideTotal(2, 1, 9),
      teamOneBack: getScrambleSideTotal(1, 10, 18),
      teamTwoBack: getScrambleSideTotal(2, 10, 18),
      teamOneFull: getScrambleSideTotal(1, 1, 18),
      teamTwoFull: getScrambleSideTotal(2, 1, 18),
    };

    const singles = {
      teamOneFront: getSinglesSideTotal(1, 1, 9),
      teamTwoFront: getSinglesSideTotal(2, 1, 9),
      teamOneBack: getSinglesSideTotal(1, 10, 18),
      teamTwoBack: getSinglesSideTotal(2, 10, 18),
      teamOneFull: getSinglesSideTotal(1, 1, 18),
      teamTwoFull: getSinglesSideTotal(2, 1, 18),
    };

    [
      { label: "Stableford", data: stableford, higherIsBetter: true },
      { label: "Scramble", data: scramble, higherIsBetter: false },
      { label: "Singles", data: singles, higherIsBetter: true },
    ].forEach((round) => {
      const front = awardPoint(
        round.data.teamOneFront,
        round.data.teamTwoFront,
        round.higherIsBetter
      );
      const back = awardPoint(
        round.data.teamOneBack,
        round.data.teamTwoBack,
        round.higherIsBetter
      );
      const full = awardPoint(
        round.data.teamOneFull,
        round.data.teamTwoFull,
        round.higherIsBetter
      );

      teamOnePoints += front[0] + back[0] + full[0];
      teamTwoPoints += front[1] + back[1] + full[1];

      details.push({
        label: round.label,
        teamOne: `${round.data.teamOneFront}/${round.data.teamOneBack}/${round.data.teamOneFull}`,
        teamTwo: `${round.data.teamTwoFront}/${round.data.teamTwoBack}/${round.data.teamTwoFull}`,
      });
    });

    return [
      {
        name: "Team 1",
        players: teamOne.join(" / "),
        points: teamOnePoints,
        details: details.map((item) => `${item.label}: ${item.teamOne}`),
      },
      {
        name: "Team 2",
        players: teamTwo.join(" / "),
        points: teamTwoPoints,
        details: details.map((item) => `${item.label}: ${item.teamTwo}`),
      },
    ].sort((a, b) => b.points - a.points);
  }, [scores, teams]);

  const matchupCards = useMemo(() => {
    const cards = [];

    const teamOneStablefordFull = getStablefordTeamTotal(teams[1][0], 1, 18);
    const teamTwoStablefordFull = getStablefordTeamTotal(teams[1][1], 1, 18);

    cards.push({
      id: "round1-stableford",
      roundId: 1,
      title: "Round 1 · Stableford",
      subtitle: "Team 1 vs Team 2",
      type: "stableford",
      sideAName: "Team 1",
      sideBName: "Team 2",
      sideAPlayers: teams[1][0],
      sideBPlayers: teams[1][1],
      status:
        teamOneStablefordFull === teamTwoStablefordFull
          ? "Tied"
          : teamOneStablefordFull > teamTwoStablefordFull
          ? "Team 1 leads"
          : "Team 2 leads",
      scoreLine: `${teamOneStablefordFull} - ${teamTwoStablefordFull}`,
    });

    const scramblePairings = [
      [teams[2][0], teams[2][2]],
      [teams[2][1], teams[2][3]],
    ];

    scramblePairings.forEach((pairing, index) => {
      const sideATotal = getScramblePairTotal(pairing[0], 1, 18);
      const sideBTotal = getScramblePairTotal(pairing[1], 1, 18);

      cards.push({
        id: `round2-scramble-${index + 1}`,
        roundId: 2,
        title: `Round 2 · Scramble Matchup ${index + 1}`,
        subtitle: `${pairing[0].join(" / ")} vs ${pairing[1].join(" / ")}`,
        type: "scramble",
        sideAName: `Team 1 Pair ${index + 1}`,
        sideBName: `Team 2 Pair ${index + 1}`,
        sideAPlayers: pairing[0],
        sideBPlayers: pairing[1],
        status:
          sideATotal === sideBTotal
            ? "Tied"
            : sideATotal < sideBTotal
            ? "Team 1 pair leads"
            : "Team 2 pair leads",
        scoreLine: `${sideATotal || "-"} - ${sideBTotal || "-"}`,
      });
    });

    teams[3].forEach((match, index) => {
      const playerA = match[0];
      const playerB = match[1];

      let matchScore = 0;

      courses.ballyowen.par.forEach((_, holeIndex) => {
        const holeNumber = holeIndex + 1;
        const scoreA = Number(getScore(3, playerA, holeNumber));
        const scoreB = Number(getScore(3, playerB, holeNumber));

        if (scoreA && scoreB) {
          if (scoreA < scoreB) matchScore += 1;
          if (scoreB < scoreA) matchScore -= 1;
        }
      });

      let status = "All Square";
      if (matchScore > 0) status = `${playerA} ${matchScore} Up`;
      if (matchScore < 0) status = `${playerB} ${Math.abs(matchScore)} Up`;

      cards.push({
        id: `round3-singles-${index + 1}`,
        roundId: 3,
        title: `Round 3 · Singles Match ${index + 1}`,
        subtitle: `${playerA} vs ${playerB}`,
        type: "singles",
        sideAName: playerA,
        sideBName: playerB,
        sideAPlayers: [playerA],
        sideBPlayers: [playerB],
        status,
        scoreLine: status,
      });
    });

    return cards;
  }, [scores, teams]);

  const selectedMatchup = matchupCards.find(
    (card) => card.id === selectedMatchupId
  );

  function getMatchupHoleResult(matchup, holeNumber) {
    const round = rounds.find((item) => item.id === matchup.roundId);
    const par = courses[round.courseKey].par[holeNumber - 1];

    if (matchup.type === "stableford") {
      const sideAPoints = Math.max(
        ...matchup.sideAPlayers.map((player) =>
          getStablefordPoints(getScore(matchup.roundId, player, holeNumber), par)
        )
      );

      const sideBPoints = Math.max(
        ...matchup.sideBPlayers.map((player) =>
          getStablefordPoints(getScore(matchup.roundId, player, holeNumber), par)
        )
      );

      if (sideAPoints > sideBPoints) return "+1";
      if (sideBPoints > sideAPoints) return "-1";
      return "E";
    }

    if (matchup.type === "scramble") {
      const scoreA = Number(getScore(matchup.roundId, matchup.sideAPlayers[0], holeNumber));
      const scoreB = Number(getScore(matchup.roundId, matchup.sideBPlayers[0], holeNumber));

      if (!scoreA || !scoreB) return "";
      if (scoreA < scoreB) return "+1";
      if (scoreB < scoreA) return "-1";
      return "E";
    }

    const scoreA = Number(getScore(matchup.roundId, matchup.sideAPlayers[0], holeNumber));
    const scoreB = Number(getScore(matchup.roundId, matchup.sideBPlayers[0], holeNumber));

    if (!scoreA || !scoreB) return "";
    if (scoreA < scoreB) return "+1";
    if (scoreB < scoreA) return "-1";
    return "E";
  }

  function ScorecardView({ matchup }) {
    const round = rounds.find((item) => item.id === matchup.roundId);
    const course = courses[round.courseKey];
    const allPlayers = [...matchup.sideAPlayers, ...matchup.sideBPlayers];

    const frontPar = course.par.slice(0, 9).reduce((sum, par) => sum + par, 0);
    const backPar = course.par.slice(9, 18).reduce((sum, par) => sum + par, 0);
    const totalPar = frontPar + backPar;

    return (
      <section className="card matchup-detail-card">
        <div className="detail-header">
          <button className="back-button" onClick={() => setSelectedMatchupId("dashboard")}>
            ← Back
          </button>

          <div>
            <p className="eyebrow dark">{round.name}</p>
            <h2>{matchup.title}</h2>
            <p>{matchup.subtitle}</p>
          </div>

          <div className="status-pill">{matchup.status}</div>
        </div>

        <div className="scorecard-wrap">
          <table className="scorecard-table">
            <thead>
              <tr>
                <th className="scorecard-name">Hole</th>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((hole) => (
                  <th key={hole}>{hole}</th>
                ))}
                <th>OUT</th>
                {[10, 11, 12, 13, 14, 15, 16, 17, 18].map((hole) => (
                  <th key={hole}>{hole}</th>
                ))}
                <th>IN</th>
                <th>TOT</th>
              </tr>

              <tr>
                <th className="scorecard-name">Par</th>
                {course.par.slice(0, 9).map((par, index) => (
                  <th key={index}>{par}</th>
                ))}
                <th>{frontPar}</th>
                {course.par.slice(9, 18).map((par, index) => (
                  <th key={index}>{par}</th>
                ))}
                <th>{backPar}</th>
                <th>{totalPar}</th>
              </tr>
            </thead>

            <tbody>
              {allPlayers.map((player) => {
                const front = getPlayerTotal(matchup.roundId, player, 1, 9);
                const back = getPlayerTotal(matchup.roundId, player, 10, 18);

                return (
                  <tr key={player}>
                    <td className="scorecard-name player-name">{player}</td>

                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((hole) => (
                      <td key={hole}>
                        <input
                          className="mini-score"
                          type="number"
                          min="1"
                          value={getScore(matchup.roundId, player, hole)}
                          onChange={(event) =>
                            updateScore(matchup.roundId, player, hole, event.target.value)
                          }
                        />
                      </td>
                    ))}

                    <td className="score-total">{front || "-"}</td>

                    {[10, 11, 12, 13, 14, 15, 16, 17, 18].map((hole) => (
                      <td key={hole}>
                        <input
                          className="mini-score"
                          type="number"
                          min="1"
                          value={getScore(matchup.roundId, player, hole)}
                          onChange={(event) =>
                            updateScore(matchup.roundId, player, hole, event.target.value)
                          }
                        />
                      </td>
                    ))}

                    <td className="score-total">{back || "-"}</td>
                    <td className="score-total">{front + back || "-"}</td>
                  </tr>
                );
              })}

              <tr className="result-row">
                <td className="scorecard-name">Result</td>

                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((hole) => (
                  <td key={hole}>{getMatchupHoleResult(matchup, hole)}</td>
                ))}

                <td></td>

                {[10, 11, 12, 13, 14, 15, 16, 17, 18].map((hole) => (
                  <td key={hole}>{getMatchupHoleResult(matchup, hole)}</td>
                ))}

                <td></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        <button className="secondary full-width" onClick={() => resetRound(matchup.roundId)}>
          Reset This Round
        </button>
      </section>
    );
  }

  return (
    <div className="app">
      <header className="hero">
        <p className="eyebrow">Golf Trip Scoreboard</p>
        <h1>Covid Classic</h1>
        <p className="subtitle">
          Weekend points, matchup cards, and ESPN-style scorecard views.
        </p>
      </header>

      {selectedMatchup ? (
        <ScorecardView matchup={selectedMatchup} />
      ) : (
        <>
          <section className="dashboard-grid">
            <div className="card">
              <h2>Overall Leaderboard</h2>
              <p className="small-note">
                Each round awards 1 point for Front 9, Back 9, and Full Round.
                Ties split 0.5 each.
              </p>

              <div className="overall-grid">
                {overallLeaderboard.map((team) => (
                  <div className="overall-card" key={team.name}>
                    <div>
                      <h3>{team.name}</h3>
                      <p>{team.players}</p>
                    </div>

                    <div className="overall-points">{team.points}</div>

                    <div className="overall-lines">
                      {team.details.map((line) => (
                        <span key={line}>{line}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2>Quick Score Entry</h2>
              <p className="small-note">Use this for fast mobile scoring by hole.</p>

              <div className="quick-entry-controls">
                <select
                  value={activeHole}
                  onChange={(event) => setActiveHole(Number(event.target.value))}
                >
                  {Array.from({ length: 18 }, (_, index) => (
                    <option key={index + 1} value={index + 1}>
                      Hole {index + 1}
                    </option>
                  ))}
                </select>
              </div>

              <div className="quick-score-list">
                {players.map((player) => (
                  <div className="quick-score-row" key={player}>
                    <span>{player}</span>
                    <input
                      type="number"
                      min="1"
                      value={getScore(1, player, activeHole)}
                      onChange={(event) =>
                        updateScore(1, player, activeHole, event.target.value)
                      }
                      placeholder="R1"
                    />
                    <input
                      type="number"
                      min="1"
                      value={getScore(2, player, activeHole)}
                      onChange={(event) =>
                        updateScore(2, player, activeHole, event.target.value)
                      }
                      placeholder="R2"
                    />
                    <input
                      type="number"
                      min="1"
                      value={getScore(3, player, activeHole)}
                      onChange={(event) =>
                        updateScore(3, player, activeHole, event.target.value)
                      }
                      placeholder="R3"
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="card">
            <div className="section-header">
              <div>
                <h2>Matchups</h2>
                <p>Click into any matchup for the full 18-hole scorecard.</p>
              </div>
            </div>

            <div className="matchup-grid">
              {matchupCards.map((matchup) => (
                <button
                  className="matchup-card"
                  key={matchup.id}
                  onClick={() => setSelectedMatchupId(matchup.id)}
                >
                  <div>
                    <p className="matchup-title">{matchup.title}</p>
                    <h3>{matchup.subtitle}</h3>
                    <p className="matchup-status">{matchup.status}</p>
                  </div>

                  <div className="matchup-score">{matchup.scoreLine}</div>
                </button>
              ))}
            </div>
          </section>

          <section className="card">
            <h2>Teams / Matches</h2>

            <div className="team-editor-grid">
              {rounds.map((round) => (
                <div className="team-editor-card" key={round.id}>
                  <h3>{round.name}</h3>
                  <p>{round.format}</p>

                  {(teams[round.id] || []).map((team, teamIndex) => (
                    <div className="team-row" key={teamIndex}>
                      <span>
                        {round.format === "Singles Matches"
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
                                round.id,
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
                </div>
              ))}
            </div>
          </section>

          <section className="card players-card">
            <h2>Players</h2>
            <p className="small-note">Edit names here if anything changes.</p>

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
        </>
      )}
    </div>
  );
}

export default App;
