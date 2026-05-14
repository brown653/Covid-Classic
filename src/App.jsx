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

const FRONT_HOLES = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const BACK_HOLES = [10, 11, 12, 13, 14, 15, 16, 17, 18];

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
  const [selectedMatchupId, setSelectedMatchupId] = useState(null);

  const [scores, setScores] = useState({});
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
    for (let hole = holeStart; hole <= holeEnd; hole++) {
      total += Number(getScore(roundId, player, hole) || 0);
    }
    return total;
  }

  function getStablefordHoleBest(team, holeNumber) {
    const par = courses.jackFrost.par[holeNumber - 1];
    return Math.max(
      ...team.map((player) =>
        getStablefordPoints(getScore(1, player, holeNumber), par)
      )
    );
  }

  function getStablefordTeamTotal(team, holeStart, holeEnd) {
    let total = 0;
    for (let hole = holeStart; hole <= holeEnd; hole++) {
      total += getStablefordHoleBest(team, hole);
    }
    return total;
  }

  function getScramblePairTotal(pair, holeStart, holeEnd) {
    const scoringPlayer = pair[0];
    let total = 0;
    for (let hole = holeStart; hole <= holeEnd; hole++) {
      total += Number(getScore(2, scoringPlayer, hole) || 0);
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

  function getSinglesMatchWins(match, holeStart, holeEnd) {
    const playerA = match[0];
    const playerB = match[1];

    let winsA = 0;
    let winsB = 0;

    for (let hole = holeStart; hole <= holeEnd; hole++) {
      const scoreA = Number(getScore(3, playerA, hole));
      const scoreB = Number(getScore(3, playerB, hole));

      if (scoreA && scoreB) {
        if (scoreA < scoreB) winsA += 1;
        if (scoreB < scoreA) winsB += 1;
      }
    }

    return { winsA, winsB };
  }

  function getSinglesMatchStatus(match) {
    const { winsA, winsB } = getSinglesMatchWins(match, 1, 18);
    const playerA = match[0];
    const playerB = match[1];

    if (winsA === winsB) return "All Square";
    if (winsA > winsB) return `${playerA} ${winsA - winsB} Up`;
    return `${playerB} ${winsB - winsA} Up`;
  }

  function getSinglesSideTotal(sideNumber, holeStart, holeEnd) {
    const matches = teams[3];
    let total = 0;

    matches.forEach((match) => {
      const result = getSinglesMatchWins(match, holeStart, holeEnd);
      if (sideNumber === 1) total += result.winsA;
      if (sideNumber === 2) total += result.winsB;
    });

    return total;
  }

  function getMatchupSummary(matchup) {
    if (matchup.type === "stableford") {
      const frontA = getStablefordTeamTotal(matchup.sideAPlayers, 1, 9);
      const frontB = getStablefordTeamTotal(matchup.sideBPlayers, 1, 9);
      const backA = getStablefordTeamTotal(matchup.sideAPlayers, 10, 18);
      const backB = getStablefordTeamTotal(matchup.sideBPlayers, 10, 18);
      const totalA = getStablefordTeamTotal(matchup.sideAPlayers, 1, 18);
      const totalB = getStablefordTeamTotal(matchup.sideBPlayers, 1, 18);

      let status = "Tied";
      if (totalA > totalB) status = `${matchup.sideAName} leads`;
      if (totalB > totalA) status = `${matchup.sideBName} leads`;

      return {
        frontA,
        frontB,
        backA,
        backB,
        totalA,
        totalB,
        status,
        higherIsBetter: true,
      };
    }

    if (matchup.type === "scramble") {
      const frontA = getScramblePairTotal(matchup.sideAPlayers, 1, 9);
      const frontB = getScramblePairTotal(matchup.sideBPlayers, 1, 9);
      const backA = getScramblePairTotal(matchup.sideAPlayers, 10, 18);
      const backB = getScramblePairTotal(matchup.sideBPlayers, 10, 18);
      const totalA = getScramblePairTotal(matchup.sideAPlayers, 1, 18);
      const totalB = getScramblePairTotal(matchup.sideBPlayers, 1, 18);

      let status = "Tied";
      if (totalA && totalB) {
        if (totalA < totalB) status = `${matchup.sideAName} leads`;
        if (totalB < totalA) status = `${matchup.sideBName} leads`;
      }

      return {
        frontA,
        frontB,
        backA,
        backB,
        totalA,
        totalB,
        status,
        higherIsBetter: false,
      };
    }

    const front = getSinglesMatchWins(
      [matchup.sideAPlayers[0], matchup.sideBPlayers[0]],
      1,
      9
    );
    const back = getSinglesMatchWins(
      [matchup.sideAPlayers[0], matchup.sideBPlayers[0]],
      10,
      18
    );
    const total = getSinglesMatchWins(
      [matchup.sideAPlayers[0], matchup.sideBPlayers[0]],
      1,
      18
    );

    return {
      frontA: front.winsA,
      frontB: front.winsB,
      backA: back.winsA,
      backB: back.winsB,
      totalA: total.winsA,
      totalB: total.winsB,
      status: getSinglesMatchStatus([
        matchup.sideAPlayers[0],
        matchup.sideBPlayers[0],
      ]),
      higherIsBetter: true,
    };
  }

  const overallWeekend = useMemo(() => {
    const stableford = {
      aFront: getStablefordTeamTotal(teams[1][0], 1, 9),
      bFront: getStablefordTeamTotal(teams[1][1], 1, 9),
      aBack: getStablefordTeamTotal(teams[1][0], 10, 18),
      bBack: getStablefordTeamTotal(teams[1][1], 10, 18),
      aTotal: getStablefordTeamTotal(teams[1][0], 1, 18),
      bTotal: getStablefordTeamTotal(teams[1][1], 1, 18),
    };

    const scramble = {
      aFront: getScrambleSideTotal(1, 1, 9),
      bFront: getScrambleSideTotal(2, 1, 9),
      aBack: getScrambleSideTotal(1, 10, 18),
      bBack: getScrambleSideTotal(2, 10, 18),
      aTotal: getScrambleSideTotal(1, 1, 18),
      bTotal: getScrambleSideTotal(2, 1, 18),
    };

    const singles = {
      aFront: getSinglesSideTotal(1, 1, 9),
      bFront: getSinglesSideTotal(2, 1, 9),
      aBack: getSinglesSideTotal(1, 10, 18),
      bBack: getSinglesSideTotal(2, 10, 18),
      aTotal: getSinglesSideTotal(1, 1, 18),
      bTotal: getSinglesSideTotal(2, 1, 18),
    };

    let team1Points = 0;
    let team2Points = 0;

    [
      { data: stableford, higherIsBetter: true },
      { data: scramble, higherIsBetter: false },
      { data: singles, higherIsBetter: true },
    ].forEach((round) => {
      const front = awardPoint(
        round.data.aFront,
        round.data.bFront,
        round.higherIsBetter
      );
      const back = awardPoint(
        round.data.aBack,
        round.data.bBack,
        round.higherIsBetter
      );
      const total = awardPoint(
        round.data.aTotal,
        round.data.bTotal,
        round.higherIsBetter
      );

      team1Points += front[0] + back[0] + total[0];
      team2Points += front[1] + back[1] + total[1];
    });

    return {
      team1Points,
      team2Points,
      rounds: [
        {
          label: "Stableford",
          line: `${stableford.aFront}-${stableford.bFront} | ${stableford.aBack}-${stableford.bBack} | ${stableford.aTotal}-${stableford.bTotal}`,
        },
        {
          label: "Scramble",
          line: `${scramble.aFront}-${scramble.bFront} | ${scramble.aBack}-${scramble.bBack} | ${scramble.aTotal}-${scramble.bTotal}`,
        },
        {
          label: "Singles",
          line: `${singles.aFront}-${singles.bFront} | ${singles.aBack}-${singles.bBack} | ${singles.aTotal}-${singles.bTotal}`,
        },
      ],
    };
  }, [scores, teams]);

  const matchupGroups = useMemo(() => {
    const round1Matchups = [
      {
        id: "stableford-main",
        roundId: 1,
        roundLabel: "Round 1 · Stableford",
        title: "Team 1 vs Team 2",
        sideAName: "Team 1",
        sideBName: "Team 2",
        sideAPlayers: teams[1][0],
        sideBPlayers: teams[1][1],
        type: "stableford",
      },
    ];

    const round2Matchups = [
      {
        id: "scramble-1",
        roundId: 2,
        roundLabel: "Round 2 · Scramble",
        title: `${teams[2][0].join(" / ")} vs ${teams[2][2].join(" / ")}`,
        sideAName: "Team 1 Pair 1",
        sideBName: "Team 2 Pair 1",
        sideAPlayers: teams[2][0],
        sideBPlayers: teams[2][2],
        type: "scramble",
      },
      {
        id: "scramble-2",
        roundId: 2,
        roundLabel: "Round 2 · Scramble",
        title: `${teams[2][1].join(" / ")} vs ${teams[2][3].join(" / ")}`,
        sideAName: "Team 1 Pair 2",
        sideBName: "Team 2 Pair 2",
        sideAPlayers: teams[2][1],
        sideBPlayers: teams[2][3],
        type: "scramble",
      },
    ];

    const round3Matchups = teams[3].map((match, index) => ({
      id: `singles-${index + 1}`,
      roundId: 3,
      roundLabel: "Round 3 · Singles",
      title: `${match[0]} vs ${match[1]}`,
      sideAName: match[0],
      sideBName: match[1],
      sideAPlayers: [match[0]],
      sideBPlayers: [match[1]],
      type: "singles",
    }));

    return [
      {
        roundName: "Round 1",
        roundSubtitle: "Best Ball Stableford",
        items: round1Matchups,
      },
      {
        roundName: "Round 2",
        roundSubtitle: "2-Man Scramble",
        items: round2Matchups,
      },
      {
        roundName: "Round 3",
        roundSubtitle: "Singles Matches",
        items: round3Matchups,
      },
    ];
  }, [teams]);

  const flatMatchups = matchupGroups.flatMap((group) => group.items);
  const selectedMatchup = flatMatchups.find(
    (matchup) => matchup.id === selectedMatchupId
  );

  function getHoleResult(matchup, holeNumber) {
    if (matchup.type === "stableford") {
      const par = courses.jackFrost.par[holeNumber - 1];

      const a = Math.max(
        ...matchup.sideAPlayers.map((player) =>
          getStablefordPoints(getScore(1, player, holeNumber), par)
        )
      );
      const b = Math.max(
        ...matchup.sideBPlayers.map((player) =>
          getStablefordPoints(getScore(1, player, holeNumber), par)
        )
      );

      if (a > b) return "T1";
      if (b > a) return "T2";
      return "E";
    }

    if (matchup.type === "scramble") {
      const a = Number(getScore(2, matchup.sideAPlayers[0], holeNumber));
      const b = Number(getScore(2, matchup.sideBPlayers[0], holeNumber));

      if (!a || !b) return "";
      if (a < b) return "T1";
      if (b < a) return "T2";
      return "E";
    }

    const a = Number(getScore(3, matchup.sideAPlayers[0], holeNumber));
    const b = Number(getScore(3, matchup.sideBPlayers[0], holeNumber));

    if (!a || !b) return "";
    if (a < b) return matchup.sideAPlayers[0].split(" ")[0];
    if (b < a) return matchup.sideBPlayers[0].split(" ")[0];
    return "E";
  }

  function renderStandardScoreRow(roundId, player) {
    const front = getPlayerTotal(roundId, player, 1, 9);
    const back = getPlayerTotal(roundId, player, 10, 18);
    const total = front + back;

    return (
      <tr key={player}>
        <td className="scorecard-name">{player}</td>

        {FRONT_HOLES.map((hole) => (
          <td key={hole}>
            <input
              className="score-input"
              type="number"
              min="1"
              value={getScore(roundId, player, hole)}
              onChange={(event) =>
                updateScore(roundId, player, hole, event.target.value)
              }
            />
          </td>
        ))}

        <td className="score-total">{front || "-"}</td>

        {BACK_HOLES.map((hole) => (
          <td key={hole}>
            <input
              className="score-input"
              type="number"
              min="1"
              value={getScore(roundId, player, hole)}
              onChange={(event) =>
                updateScore(roundId, player, hole, event.target.value)
              }
            />
          </td>
        ))}

        <td className="score-total">{back || "-"}</td>
        <td className="score-total">{total || "-"}</td>
      </tr>
    );
  }

  function renderScrambleRow(pair) {
    const key = pair.join("-");
    const label = pair.join(" / ");
    const scoringPlayer = pair[0];
    const front = getScramblePairTotal(pair, 1, 9);
    const back = getScramblePairTotal(pair, 10, 18);
    const total = front + back;

    return (
      <tr key={key}>
        <td className="scorecard-name">{label}</td>

        {FRONT_HOLES.map((hole) => (
          <td key={hole}>
            <input
              className="score-input"
              type="number"
              min="1"
              value={getScore(2, scoringPlayer, hole)}
              onChange={(event) =>
                updateScore(2, scoringPlayer, hole, event.target.value)
              }
            />
          </td>
        ))}

        <td className="score-total">{front || "-"}</td>

        {BACK_HOLES.map((hole) => (
          <td key={hole}>
            <input
              className="score-input"
              type="number"
              min="1"
              value={getScore(2, scoringPlayer, hole)}
              onChange={(event) =>
                updateScore(2, scoringPlayer, hole, event.target.value)
              }
            />
          </td>
        ))}

        <td className="score-total">{back || "-"}</td>
        <td className="score-total">{total || "-"}</td>
      </tr>
    );
  }

  function MatchupDetail({ matchup }) {
    const summary = getMatchupSummary(matchup);
    const round = rounds.find((item) => item.id === matchup.roundId);
    const course = courses[round.courseKey];
    const outPar = course.par.slice(0, 9).reduce((a, b) => a + b, 0);
    const inPar = course.par.slice(9, 18).reduce((a, b) => a + b, 0);
    const totalPar = outPar + inPar;

    return (
      <div className="detail-page">
        <div className="detail-topbar">
          <button
            className="back-button"
            onClick={() => setSelectedMatchupId(null)}
          >
            ← Back to Matchups
          </button>
          <button
            className="ghost-button"
            onClick={() => resetRound(matchup.roundId)}
          >
            Reset This Round
          </button>
        </div>

        <section className="detail-hero">
          <div>
            <p className="detail-kicker">{matchup.roundLabel}</p>
            <h2>{matchup.title}</h2>
            <p className="detail-status">{summary.status}</p>
          </div>

          <div className="detail-summary-grid">
            <div className="summary-box">
              <span>Front 9</span>
              <strong>
                {summary.frontA} - {summary.frontB}
              </strong>
            </div>
            <div className="summary-box">
              <span>Back 9</span>
              <strong>
                {summary.backA} - {summary.backB}
              </strong>
            </div>
            <div className="summary-box">
              <span>Total</span>
              <strong>
                {summary.totalA} - {summary.totalB}
              </strong>
            </div>
          </div>
        </section>

        <section className="scorecard-card">
          <div className="scorecard-head">
            <div>
              <h3>Scorecard</h3>
              <p>{course.name}</p>
            </div>
            {matchup.type === "scramble" && (
              <span className="scorecard-note">
                Enter one score row per scramble pair.
              </span>
            )}
          </div>

          <div className="scorecard-wrap">
            <table className="scorecard-table">
              <thead>
                <tr>
                  <th className="scorecard-name">Hole</th>
                  {FRONT_HOLES.map((hole) => (
                    <th key={hole}>{hole}</th>
                  ))}
                  <th>OUT</th>
                  {BACK_HOLES.map((hole) => (
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
                  <th>{outPar}</th>
                  {course.par.slice(9, 18).map((par, index) => (
                    <th key={index}>{par}</th>
                  ))}
                  <th>{inPar}</th>
                  <th>{totalPar}</th>
                </tr>
              </thead>

              <tbody>
                {matchup.type === "stableford" && (
                  <>
                    <tr className="divider-row">
                      <td colSpan="22">Team 1</td>
                    </tr>
                    {matchup.sideAPlayers.map((player) =>
                      renderStandardScoreRow(1, player)
                    )}
                    <tr className="divider-row">
                      <td colSpan="22">Team 2</td>
                    </tr>
                    {matchup.sideBPlayers.map((player) =>
                      renderStandardScoreRow(1, player)
                    )}
                  </>
                )}

                {matchup.type === "scramble" && (
                  <>
                    {renderScrambleRow(matchup.sideAPlayers)}
                    {renderScrambleRow(matchup.sideBPlayers)}
                  </>
                )}

                {matchup.type === "singles" && (
                  <>
                    {renderStandardScoreRow(3, matchup.sideAPlayers[0])}
                    {renderStandardScoreRow(3, matchup.sideBPlayers[0])}
                  </>
                )}

                <tr className="result-row">
                  <td className="scorecard-name">Result</td>
                  {FRONT_HOLES.map((hole) => (
                    <td key={hole}>{getHoleResult(matchup, hole)}</td>
                  ))}
                  <td className="score-total">
                    {summary.frontA}-{summary.frontB}
                  </td>
                  {BACK_HOLES.map((hole) => (
                    <td key={hole}>{getHoleResult(matchup, hole)}</td>
                  ))}
                  <td className="score-total">
                    {summary.backA}-{summary.backB}
                  </td>
                  <td className="score-total">
                    {summary.totalA}-{summary.totalB}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <p className="app-brand">Covid Classic</p>
          <h1>Weekend Scoreboard</h1>
          <p className="app-subtitle">
            Track round-by-round matchups like a scoreboard app.
          </p>
        </div>

        <div className="weekend-score">
          <div className="weekend-team">
            <span>Team 1</span>
            <strong>{overallWeekend.team1Points}</strong>
          </div>
          <div className="weekend-separator">-</div>
          <div className="weekend-team">
            <span>Team 2</span>
            <strong>{overallWeekend.team2Points}</strong>
          </div>
        </div>
      </header>

      {selectedMatchup ? (
        <MatchupDetail matchup={selectedMatchup} />
      ) : (
        <>
          <section className="overview-grid">
            <div className="panel panel-main">
              <div className="panel-head">
                <div>
                  <p className="panel-kicker">Weekend Cup</p>
                  <h2>Overall Leaderboard</h2>
                </div>
              </div>

              <div className="leaderboard-head">
                <div className="leader-team">
                  <span>Team 1</span>
                  <strong>{overallWeekend.team1Points}</strong>
                  <small>{teams[1][0].join(" / ")}</small>
                </div>

                <div className="leader-vs">VS</div>

                <div className="leader-team">
                  <span>Team 2</span>
                  <strong>{overallWeekend.team2Points}</strong>
                  <small>{teams[1][1].join(" / ")}</small>
                </div>
              </div>
            </div>

            <div className="panel">
              <p className="panel-kicker">Round Snapshot</p>
              <h2>Scoring Breakdown</h2>

              <div className="round-summary-list">
                {overallWeekend.rounds.map((round) => (
                  <div className="round-summary-item" key={round.label}>
                    <strong>{round.label}</strong>
                    <span>{round.line}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <p className="panel-kicker">Live Board</p>
                <h2>Matchups</h2>
              </div>
            </div>

            <div className="round-board">
              {matchupGroups.map((group) => (
                <div className="round-group" key={group.roundName}>
                  <div className="round-group-head">
                    <div>
                      <h3>{group.roundName}</h3>
                      <p>{group.roundSubtitle}</p>
                    </div>
                  </div>

                  <div className="matchup-list">
                    {group.items.map((matchup) => {
                      const summary = getMatchupSummary(matchup);

                      return (
                        <button
                          className="matchup-card"
                          key={matchup.id}
                          onClick={() => setSelectedMatchupId(matchup.id)}
                        >
                          <div className="matchup-left">
                            <p className="matchup-label">{matchup.roundLabel}</p>
                            <h4>{matchup.title}</h4>
                            <span>{summary.status}</span>
                          </div>

                          <div className="matchup-right">
                            <div className="matchup-main-score">
                              {summary.totalA} - {summary.totalB}
                            </div>
                            <small>View Scorecard</small>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <details className="setup-panel">
            <summary>Player Names</summary>
            <div className="setup-content">
              <div className="players-grid">
                {players.map((player, index) => (
                  <input
                    key={index}
                    value={player}
                    onChange={(event) => updatePlayer(index, event.target.value)}
                  />
                ))}
              </div>
            </div>
          </details>

          <details className="setup-panel">
            <summary>Teams & Matchups</summary>
            <div className="setup-content">
              <div className="editor-grid">
                {rounds.map((round) => (
                  <div className="editor-card" key={round.id}>
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
            </div>
          </details>
        </>
      )}
    </div>
  );
}

export default App;
