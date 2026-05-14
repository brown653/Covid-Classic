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
  { id: 1, name: "Round 1", courseKey: "jackFrost", format: "Best Ball Stableford" },
  { id: 2, name: "Round 2", courseKey: "jackFrost", format: "2-Man Scramble" },
  { id: 3, name: "Round 3", courseKey: "ballyowen", format: "Singles Matches" },
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

function App() {
  const [players, setPlayers] = useState(defaultPlayers);
  const [selectedTab, setSelectedTab] = useState("overview");
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

  function resetRound(roundId) {
    setScores((previousScores) => ({
      ...previousScores,
      [roundId]: {},
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

  function hasPlayerScore(roundId, player, holeNumber) {
    return getScore(roundId, player, holeNumber) !== "";
  }

  function getPlayerTotal(roundId, player, holeStart = 1, holeEnd = 18) {
    let total = 0;

    for (let hole = holeStart; hole <= holeEnd; hole++) {
      total += Number(getScore(roundId, player, hole) || 0);
    }

    return total;
  }

  function getStablefordSegment(teamA, teamB, holeStart, holeEnd) {
    let teamAScore = 0;
    let teamBScore = 0;
    let holesCounted = 0;

    for (let hole = holeStart; hole <= holeEnd; hole++) {
      const par = courses.jackFrost.par[hole - 1];

      const teamAHasScore = teamA.some((player) => hasPlayerScore(1, player, hole));
      const teamBHasScore = teamB.some((player) => hasPlayerScore(1, player, hole));

      if (teamAHasScore && teamBHasScore) {
        const teamABest = Math.max(
          ...teamA.map((player) =>
            getStablefordPoints(getScore(1, player, hole), par)
          )
        );

        const teamBBest = Math.max(
          ...teamB.map((player) =>
            getStablefordPoints(getScore(1, player, hole), par)
          )
        );

        teamAScore += teamABest;
        teamBScore += teamBBest;
        holesCounted += 1;
      }
    }

    return { teamAScore, teamBScore, holesCounted, higherIsBetter: true };
  }

  function getScramblePairSegment(pairA, pairB, holeStart, holeEnd) {
    const scoringPlayerA = pairA[0];
    const scoringPlayerB = pairB[0];

    let teamAScore = 0;
    let teamBScore = 0;
    let holesCounted = 0;

    for (let hole = holeStart; hole <= holeEnd; hole++) {
      const scoreA = Number(getScore(2, scoringPlayerA, hole));
      const scoreB = Number(getScore(2, scoringPlayerB, hole));

      if (scoreA && scoreB) {
        teamAScore += scoreA;
        teamBScore += scoreB;
        holesCounted += 1;
      }
    }

    return { teamAScore, teamBScore, holesCounted, higherIsBetter: false };
  }

  function getScrambleSideSegment(sideNumber, holeStart, holeEnd) {
    const sideAPairs = [teams[2][0], teams[2][1]];
    const sideBPairs = [teams[2][2], teams[2][3]];

    let teamAScore = 0;
    let teamBScore = 0;
    let holesCounted = 0;

    sideAPairs.forEach((pairA, index) => {
      const pairB = sideBPairs[index];
      const result = getScramblePairSegment(pairA, pairB, holeStart, holeEnd);

      teamAScore += result.teamAScore;
      teamBScore += result.teamBScore;
      holesCounted += result.holesCounted;
    });

    return { teamAScore, teamBScore, holesCounted, higherIsBetter: false };
  }

  function getSinglesMatchSegment(match, holeStart, holeEnd) {
    const playerA = match[0];
    const playerB = match[1];

    let teamAScore = 0;
    let teamBScore = 0;
    let holesCounted = 0;

    for (let hole = holeStart; hole <= holeEnd; hole++) {
      const scoreA = Number(getScore(3, playerA, hole));
      const scoreB = Number(getScore(3, playerB, hole));

      if (scoreA && scoreB) {
        if (scoreA < scoreB) teamAScore += 1;
        if (scoreB < scoreA) teamBScore += 1;
        holesCounted += 1;
      }
    }

    return { teamAScore, teamBScore, holesCounted, higherIsBetter: true };
  }

  function getSinglesSideSegment(holeStart, holeEnd) {
    let teamAScore = 0;
    let teamBScore = 0;
    let holesCounted = 0;

    teams[3].forEach((match) => {
      const result = getSinglesMatchSegment(match, holeStart, holeEnd);
      teamAScore += result.teamAScore;
      teamBScore += result.teamBScore;
      holesCounted += result.holesCounted;
    });

    return { teamAScore, teamBScore, holesCounted, higherIsBetter: true };
  }

  function awardLivePoint(segment) {
    if (!segment.holesCounted) return [0, 0];

    if (segment.teamAScore === segment.teamBScore) return [0.5, 0.5];

    if (segment.higherIsBetter) {
      return segment.teamAScore > segment.teamBScore ? [1, 0] : [0, 1];
    }

    return segment.teamAScore < segment.teamBScore ? [1, 0] : [0, 1];
  }

  function getSegmentStatus(segment, labelA = "Team 1", labelB = "Team 2") {
    if (!segment.holesCounted) return "Not Started";
    if (segment.teamAScore === segment.teamBScore) return "Tied";

    if (segment.higherIsBetter) {
      return segment.teamAScore > segment.teamBScore
        ? `${labelA} leads`
        : `${labelB} leads`;
    }

    return segment.teamAScore < segment.teamBScore
      ? `${labelA} leads`
      : `${labelB} leads`;
  }

  const roundSegments = useMemo(() => {
    const stablefordFront = getStablefordSegment(teams[1][0], teams[1][1], 1, 9);
    const stablefordBack = getStablefordSegment(teams[1][0], teams[1][1], 10, 18);
    const stablefordFull = getStablefordSegment(teams[1][0], teams[1][1], 1, 18);

    const scrambleFront = getScrambleSideSegment(1, 1, 9);
    const scrambleBack = getScrambleSideSegment(1, 10, 18);
    const scrambleFull = getScrambleSideSegment(1, 1, 18);

    const singlesFront = getSinglesSideSegment(1, 9);
    const singlesBack = getSinglesSideSegment(10, 18);
    const singlesFull = getSinglesSideSegment(1, 18);

    return {
      1: {
        label: "Round 1",
        format: "Best Ball Stableford",
        segments: [stablefordFront, stablefordBack, stablefordFull],
      },
      2: {
        label: "Round 2",
        format: "2-Man Scramble",
        segments: [scrambleFront, scrambleBack, scrambleFull],
      },
      3: {
        label: "Round 3",
        format: "Singles Matches",
        segments: [singlesFront, singlesBack, singlesFull],
      },
    };
  }, [scores, teams]);

  const overallWeekend = useMemo(() => {
    let team1Points = 0;
    let team2Points = 0;

    Object.values(roundSegments).forEach((round) => {
      round.segments.forEach((segment) => {
        const [team1, team2] = awardLivePoint(segment);
        team1Points += team1;
        team2Points += team2;
      });
    });

    return { team1Points, team2Points };
  }, [roundSegments]);

  const matchupGroups = useMemo(() => {
    return [
      {
        roundId: 1,
        roundName: "Round 1",
        roundSubtitle: "Best Ball Stableford",
        items: [
          {
            id: "stableford-main",
            roundId: 1,
            type: "stableford",
            title: "Team 1 vs Team 2",
            sideAName: "Team 1",
            sideBName: "Team 2",
            sideAPlayers: teams[1][0],
            sideBPlayers: teams[1][1],
          },
        ],
      },
      {
        roundId: 2,
        roundName: "Round 2",
        roundSubtitle: "2-Man Scramble",
        items: [
          {
            id: "scramble-1",
            roundId: 2,
            type: "scramble",
            title: `${teams[2][0].join(" / ")} vs ${teams[2][2].join(" / ")}`,
            sideAName: "Team 1 Pair 1",
            sideBName: "Team 2 Pair 1",
            sideAPlayers: teams[2][0],
            sideBPlayers: teams[2][2],
          },
          {
            id: "scramble-2",
            roundId: 2,
            type: "scramble",
            title: `${teams[2][1].join(" / ")} vs ${teams[2][3].join(" / ")}`,
            sideAName: "Team 1 Pair 2",
            sideBName: "Team 2 Pair 2",
            sideAPlayers: teams[2][1],
            sideBPlayers: teams[2][3],
          },
        ],
      },
      {
        roundId: 3,
        roundName: "Round 3",
        roundSubtitle: "Singles Matches",
        items: teams[3].map((match, index) => ({
          id: `singles-${index + 1}`,
          roundId: 3,
          type: "singles",
          title: `${match[0]} vs ${match[1]}`,
          sideAName: match[0],
          sideBName: match[1],
          sideAPlayers: [match[0]],
          sideBPlayers: [match[1]],
        })),
      },
    ];
  }, [teams]);

  const flatMatchups = matchupGroups.flatMap((group) => group.items);
  const selectedMatchup = flatMatchups.find(
    (matchup) => matchup.id === selectedMatchupId
  );

  function getMatchupSegment(matchup, holeStart, holeEnd) {
    if (matchup.type === "stableford") {
      return getStablefordSegment(
        matchup.sideAPlayers,
        matchup.sideBPlayers,
        holeStart,
        holeEnd
      );
    }

    if (matchup.type === "scramble") {
      return getScramblePairSegment(
        matchup.sideAPlayers,
        matchup.sideBPlayers,
        holeStart,
        holeEnd
      );
    }

    return getSinglesMatchSegment(
      [matchup.sideAPlayers[0], matchup.sideBPlayers[0]],
      holeStart,
      holeEnd
    );
  }

  function getMatchupSummary(matchup) {
    const front = getMatchupSegment(matchup, 1, 9);
    const back = getMatchupSegment(matchup, 10, 18);
    const full = getMatchupSegment(matchup, 1, 18);

    return {
      front,
      back,
      full,
      status: getSegmentStatus(full, matchup.sideAName, matchup.sideBName),
    };
  }

  function getHoleResult(matchup, hole) {
    const segment = getMatchupSegment(matchup, hole, hole);
    if (!segment.holesCounted) return "";

    if (segment.teamAScore === segment.teamBScore) return "E";

    if (segment.higherIsBetter) {
      return segment.teamAScore > segment.teamBScore ? "T1" : "T2";
    }

    return segment.teamAScore < segment.teamBScore ? "T1" : "T2";
  }

  function renderScoreRow(roundId, player) {
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

  function renderScrambleScoreRow(pair) {
    const scoringPlayer = pair[0];
    const front = getPlayerTotal(2, scoringPlayer, 1, 9);
    const back = getPlayerTotal(2, scoringPlayer, 10, 18);
    const total = front + back;

    return (
      <tr key={pair.join("-")}>
        <td className="scorecard-name">{pair.join(" / ")}</td>

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

  function ScorecardView({ matchup }) {
    const round = rounds.find((item) => item.id === matchup.roundId);
    const course = courses[round.courseKey];
    const summary = getMatchupSummary(matchup);

    const outPar = course.par.slice(0, 9).reduce((a, b) => a + b, 0);
    const inPar = course.par.slice(9, 18).reduce((a, b) => a + b, 0);
    const totalPar = outPar + inPar;

    return (
      <div className="detail-page">
        <div className="detail-topbar">
          <button className="back-button" onClick={() => setSelectedMatchupId(null)}>
            ← Back
          </button>

          <button className="ghost-button" onClick={() => resetRound(matchup.roundId)}>
            Reset Round
          </button>
        </div>

        <section className="detail-hero">
          <div>
            <p className="detail-kicker">{round.name} · {round.format}</p>
            <h2>{matchup.title}</h2>
            <p className="detail-status">{summary.status}</p>
          </div>

          <div className="detail-summary-grid">
            <div className="summary-box">
              <span>Front</span>
              <strong>{summary.front.teamAScore} - {summary.front.teamBScore}</strong>
            </div>
            <div className="summary-box">
              <span>Back</span>
              <strong>{summary.back.teamAScore} - {summary.back.teamBScore}</strong>
            </div>
            <div className="summary-box">
              <span>Total</span>
              <strong>{summary.full.teamAScore} - {summary.full.teamBScore}</strong>
            </div>
          </div>
        </section>

        <section className="scorecard-card">
          <div className="scorecard-head">
            <div>
              <h3>Scorecard</h3>
              <p>{course.name}</p>
            </div>
          </div>

          <div className="scorecard-wrap">
            <table className="scorecard-table">
              <thead>
                <tr>
                  <th className="scorecard-name">Hole</th>
                  {FRONT_HOLES.map((hole) => <th key={hole}>{hole}</th>)}
                  <th>OUT</th>
                  {BACK_HOLES.map((hole) => <th key={hole}>{hole}</th>)}
                  <th>IN</th>
                  <th>TOT</th>
                </tr>

                <tr>
                  <th className="scorecard-name">Par</th>
                  {course.par.slice(0, 9).map((par, index) => <th key={index}>{par}</th>)}
                  <th>{outPar}</th>
                  {course.par.slice(9, 18).map((par, index) => <th key={index}>{par}</th>)}
                  <th>{inPar}</th>
                  <th>{totalPar}</th>
                </tr>
              </thead>

              <tbody>
                {matchup.type === "stableford" && (
                  <>
                    <tr className="divider-row"><td colSpan="22">Team 1</td></tr>
                    {matchup.sideAPlayers.map((player) => renderScoreRow(1, player))}
                    <tr className="divider-row"><td colSpan="22">Team 2</td></tr>
                    {matchup.sideBPlayers.map((player) => renderScoreRow(1, player))}
                  </>
                )}

                {matchup.type === "scramble" && (
                  <>
                    {renderScrambleScoreRow(matchup.sideAPlayers)}
                    {renderScrambleScoreRow(matchup.sideBPlayers)}
                  </>
                )}

                {matchup.type === "singles" && (
                  <>
                    {renderScoreRow(3, matchup.sideAPlayers[0])}
                    {renderScoreRow(3, matchup.sideBPlayers[0])}
                  </>
                )}

                <tr className="result-row">
                  <td className="scorecard-name">Result</td>
                  {FRONT_HOLES.map((hole) => <td key={hole}>{getHoleResult(matchup, hole)}</td>)}
                  <td className="score-total">
                    {summary.front.teamAScore}-{summary.front.teamBScore}
                  </td>
                  {BACK_HOLES.map((hole) => <td key={hole}>{getHoleResult(matchup, hole)}</td>)}
                  <td className="score-total">
                    {summary.back.teamAScore}-{summary.back.teamBScore}
                  </td>
                  <td className="score-total">
                    {summary.full.teamAScore}-{summary.full.teamBScore}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  function RoundPanel({ roundId }) {
    const group = matchupGroups.find((item) => item.roundId === roundId);
    const round = roundSegments[roundId];

    return (
      <>
        <section className="panel panel-main">
          <p className="panel-kicker">{round.label}</p>
          <h2>{round.format}</h2>

          <div className="round-points-grid">
            {["Front 9", "Back 9", "Full Round"].map((label, index) => {
              const segment = round.segments[index];
              const [team1Points, team2Points] = awardLivePoint(segment);

              return (
                <div className="round-point-box" key={label}>
                  <span>{label}</span>
                  <strong>{team1Points} - {team2Points}</strong>
                  <small>
                    {segment.teamAScore} - {segment.teamBScore} ·{" "}
                    {getSegmentStatus(segment)}
                  </small>
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel">
          <p className="panel-kicker">Live Board</p>
          <h2>Matchups</h2>

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
                    <p className="matchup-label">{group.roundSubtitle}</p>
                    <h4>{matchup.title}</h4>
                    <span>{summary.status}</span>
                  </div>

                  <div className="matchup-right">
                    <div className="matchup-main-score">
                      {summary.full.teamAScore} - {summary.full.teamBScore}
                    </div>
                    <small>View Scorecard</small>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <p className="app-brand">Covid Classic</p>
          <h1>Weekend Scoreboard</h1>
          <p className="app-subtitle">Live scoring, matchups, and weekend points.</p>
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
        <ScorecardView matchup={selectedMatchup} />
      ) : (
        <>
          <nav className="top-tabs">
            <button
              className={selectedTab === "overview" ? "active-tab" : ""}
              onClick={() => setSelectedTab("overview")}
            >
              Overview
            </button>
            <button
              className={selectedTab === "round1" ? "active-tab" : ""}
              onClick={() => setSelectedTab("round1")}
            >
              Round 1
            </button>
            <button
              className={selectedTab === "round2" ? "active-tab" : ""}
              onClick={() => setSelectedTab("round2")}
            >
              Round 2
            </button>
            <button
              className={selectedTab === "round3" ? "active-tab" : ""}
              onClick={() => setSelectedTab("round3")}
            >
              Round 3
            </button>
          </nav>

          {selectedTab === "overview" && (
            <>
              <section className="overview-grid">
                <div className="panel panel-main">
                  <p className="panel-kicker">Weekend Cup</p>
                  <h2>Live Overall Leaderboard</h2>

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
                  <p className="panel-kicker">Live Points</p>
                  <h2>Round Status</h2>

                  <div className="round-summary-list">
                    {[1, 2, 3].map((roundId) => {
                      const round = roundSegments[roundId];
                      const points = round.segments.map((segment) =>
                        awardLivePoint(segment)
                      );

                      const team1 = points.reduce((sum, point) => sum + point[0], 0);
                      const team2 = points.reduce((sum, point) => sum + point[1], 0);

                      return (
                        <div className="round-summary-item" key={roundId}>
                          <strong>{round.format}</strong>
                          <span>
                            Live Points: {team1} - {team2}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              <section className="panel">
                <p className="panel-kicker">All Matchups</p>
                <h2>Live Board</h2>

                <div className="round-board">
                  {matchupGroups.map((group) => (
                    <div className="round-group" key={group.roundId}>
                      <div className="round-group-head">
                        <h3>{group.roundName}</h3>
                        <p>{group.roundSubtitle}</p>
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
                                <p className="matchup-label">{group.roundSubtitle}</p>
                                <h4>{matchup.title}</h4>
                                <span>{summary.status}</span>
                              </div>

                              <div className="matchup-right">
                                <div className="matchup-main-score">
                                  {summary.full.teamAScore} - {summary.full.teamBScore}
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
            </>
          )}

          {selectedTab === "round1" && <RoundPanel roundId={1} />}
          {selectedTab === "round2" && <RoundPanel roundId={2} />}
          {selectedTab === "round3" && <RoundPanel roundId={3} />}

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
