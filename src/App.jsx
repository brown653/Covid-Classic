import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import "./App.css";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

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
    hcp: [11, 5, 17, 7, 15, 3, 9, 13, 1, 8, 18, 2, 10, 6, 14, 16, 12, 4],
  },
  ballyowen: {
    name: "Ballyowen",
    par: [4, 4, 5, 3, 5, 3, 4, 4, 4, 5, 3, 4, 4, 4, 3, 4, 5, 4],
    hcp: [13, 11, 3, 17, 5, 15, 1, 7, 9, 12, 18, 14, 8, 4, 16, 2, 10, 6],
  },
};

const rounds = [
  { id: 1, name: "Round 1", shortName: "R1", courseKey: "jackFrost", format: "Best Ball Stableford" },
  { id: 2, name: "Round 2", shortName: "R2", courseKey: "jackFrost", format: "2-Man Scramble" },
  { id: 3, name: "Round 3", shortName: "R3", courseKey: "ballyowen", format: "Singles Matches" },
];

const FRONT_HOLES = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const BACK_HOLES = [10, 11, 12, 13, 14, 15, 16, 17, 18];

function getStablefordPoints(score, par) {
  if (!score && score !== 0) return 0;
  const diff = Number(score) - par;

  if (diff <= -3) return 5;
  if (diff === -2) return 4;
  if (diff === -1) return 3;
  if (diff === 0) return 2;
  if (diff === 1) return 1;
  return 0;
}

function formatPoints(value) {
  return Number.isInteger(value) ? value : value.toFixed(1);
}

function App() {
  const [players, setPlayers] = useState(defaultPlayers);
  const [activeTab, setActiveTab] = useState("home");
  const [selectedPlayer, setSelectedPlayer] = useState(defaultPlayers[0]);
  const [selectedRoundId, setSelectedRoundId] = useState(1);
  const [selectedMatchupId, setSelectedMatchupId] = useState(null);
  const [scores, setScores] = useState({});
  const [handicaps, setHandicaps] = useState({});
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");

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

  useEffect(() => {
    async function loadScores() {
      const { data, error } = await supabase.from("golf_scores").select("*");

      if (error) {
        console.error("Error loading scores:", error);
        setConnectionStatus(`Offline: ${error.message}`);
        return;
      }

      const loadedScores = {};

      data.forEach((row) => {
        if (!loadedScores[row.round_id]) loadedScores[row.round_id] = {};
        if (!loadedScores[row.round_id][row.player]) loadedScores[row.round_id][row.player] = {};
        loadedScores[row.round_id][row.player][row.hole] =
          row.score === null ? "" : String(row.score);
      });

      setScores(loadedScores);
      setConnectionStatus("Live");
    }

    async function loadHandicaps() {
      const { data, error } = await supabase.from("golf_handicaps").select("*");

      if (error) {
        console.error("Error loading handicaps:", error);
        return;
      }

      const loadedHandicaps = {};
      data.forEach((row) => {
        loadedHandicaps[row.player] = row.strokes || 0;
      });

      setHandicaps(loadedHandicaps);
    }

    loadScores();
    loadHandicaps();

    const scoreChannel = supabase
      .channel("live-golf-scores")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "golf_scores" },
        (payload) => {
          const row = payload.new;
          if (!row) return;

          setScores((previousScores) => ({
            ...previousScores,
            [row.round_id]: {
              ...(previousScores[row.round_id] || {}),
              [row.player]: {
                ...((previousScores[row.round_id] || {})[row.player] || {}),
                [row.hole]: row.score === null ? "" : String(row.score),
              },
            },
          }));
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setConnectionStatus("Live");
      });

    const handicapChannel = supabase
      .channel("live-golf-handicaps")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "golf_handicaps" },
        (payload) => {
          const row = payload.new;
          if (!row) return;

          setHandicaps((previousHandicaps) => ({
            ...previousHandicaps,
            [row.player]: row.strokes || 0,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(scoreChannel);
      supabase.removeChannel(handicapChannel);
    };
  }, []);

  function getScore(roundId, player, holeNumber) {
    return scores?.[roundId]?.[player]?.[holeNumber] || "";
  }

  async function updateScore(roundId, player, holeNumber, value) {
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

    const cleanScore = value === "" ? null : Number(value);

    const { error } = await supabase.from("golf_scores").upsert(
      {
        round_id: roundId,
        player,
        hole: holeNumber,
        score: cleanScore,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "round_id,player,hole" }
    );

    if (error) {
      console.error("Error saving score:", error);
      setConnectionStatus("Save Error");
    } else {
      setConnectionStatus("Live");
    }
  }

  async function updateHandicap(player, value) {
    const cleanStrokes = value === "" ? 0 : Number(value);

    setHandicaps((previousHandicaps) => ({
      ...previousHandicaps,
      [player]: cleanStrokes,
    }));

    const { error } = await supabase.from("golf_handicaps").upsert(
      {
        player,
        strokes: cleanStrokes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "player" }
    );

    if (error) {
      console.error("Error saving handicap:", error);
      setConnectionStatus("Save Error");
    } else {
      setConnectionStatus("Live");
    }
  }

  function hasScore(roundId, player, holeNumber) {
    return getScore(roundId, player, holeNumber) !== "";
  }

  async function resetRound(roundId) {
    const { error } = await supabase
      .from("golf_scores")
      .update({ score: null, updated_at: new Date().toISOString() })
      .eq("round_id", roundId);

    if (error) {
      console.error("Error resetting round:", error);
      setConnectionStatus("Save Error");
      return;
    }

    setScores((previousScores) => ({
      ...previousScores,
      [roundId]: {},
    }));
  }

  function getRound(roundId) {
    return rounds.find((round) => round.id === roundId);
  }

  function getCourse(roundId) {
    return courses[getRound(roundId).courseKey];
  }

  function handicapApplies(roundId) {
    return roundId === 1 || roundId === 3;
  }

  function getHoleStrokes(roundId, player, holeNumber) {
    if (!handicapApplies(roundId)) return 0;

    const totalStrokes = Number(handicaps[player] || 0);
    if (!totalStrokes) return 0;

    const course = getCourse(roundId);
    const holeHcp = course.hcp[holeNumber - 1];

    const baseStrokes = Math.floor(totalStrokes / 18);
    const extraStrokes = totalStrokes % 18;

    return baseStrokes + (holeHcp <= extraStrokes ? 1 : 0);
  }

  function getNetScore(roundId, player, holeNumber) {
    const gross = Number(getScore(roundId, player, holeNumber));
    if (!gross) return "";
    return gross - getHoleStrokes(roundId, player, holeNumber);
  }

  function getPlayerTotal(roundId, player, start = 1, end = 18, net = false) {
    let total = 0;

    for (let hole = start; hole <= end; hole++) {
      const score = net ? getNetScore(roundId, player, hole) : getScore(roundId, player, hole);
      total += Number(score || 0);
    }

    return total;
  }

  function getScoringPlayerForRound(roundId, player) {
    if (roundId !== 2) return player;

    const pair = teams[2].find((team) => team.includes(player));
    return pair ? pair[0] : player;
  }

  function getScoreEntryLabel(roundId, player) {
    if (roundId !== 2) return player;

    const pair = teams[2].find((team) => team.includes(player));
    return pair ? `${pair[0]} / ${pair[1]} Scramble Score` : player;
  }

  function getStablefordSegment(teamA, teamB, start, end) {
    let teamAScore = 0;
    let teamBScore = 0;
    let holesCounted = 0;

    for (let hole = start; hole <= end; hole++) {
      const par = courses.jackFrost.par[hole - 1];
      const teamAHasScore = teamA.some((player) => hasScore(1, player, hole));
      const teamBHasScore = teamB.some((player) => hasScore(1, player, hole));

      if (teamAHasScore && teamBHasScore) {
        const teamABest = Math.max(
          ...teamA.map((player) =>
            getStablefordPoints(getNetScore(1, player, hole), par)
          )
        );

        const teamBBest = Math.max(
          ...teamB.map((player) =>
            getStablefordPoints(getNetScore(1, player, hole), par)
          )
        );

        teamAScore += teamABest;
        teamBScore += teamBBest;
        holesCounted += 1;
      }
    }

    return { teamAScore, teamBScore, holesCounted, higherIsBetter: true };
  }

  function getScramblePairSegment(pairA, pairB, start, end) {
    const playerA = pairA[0];
    const playerB = pairB[0];

    let teamAScore = 0;
    let teamBScore = 0;
    let holesCounted = 0;

    for (let hole = start; hole <= end; hole++) {
      const scoreA = Number(getScore(2, playerA, hole));
      const scoreB = Number(getScore(2, playerB, hole));

      if (scoreA && scoreB) {
        teamAScore += scoreA;
        teamBScore += scoreB;
        holesCounted += 1;
      }
    }

    return { teamAScore, teamBScore, holesCounted, higherIsBetter: false };
  }

  function getScrambleSideSegment(start, end) {
    const teamOnePairs = [teams[2][0], teams[2][1]];
    const teamTwoPairs = [teams[2][2], teams[2][3]];

    let teamAScore = 0;
    let teamBScore = 0;
    let holesCounted = 0;

    teamOnePairs.forEach((pairA, index) => {
      const pairB = teamTwoPairs[index];
      const result = getScramblePairSegment(pairA, pairB, start, end);

      teamAScore += result.teamAScore;
      teamBScore += result.teamBScore;
      holesCounted += result.holesCounted;
    });

    return { teamAScore, teamBScore, holesCounted, higherIsBetter: false };
  }

  function getSinglesMatchSegment(match, start, end) {
    const playerA = match[0];
    const playerB = match[1];

    let teamAScore = 0;
    let teamBScore = 0;
    let holesCounted = 0;

    for (let hole = start; hole <= end; hole++) {
      const netA = Number(getNetScore(3, playerA, hole));
      const netB = Number(getNetScore(3, playerB, hole));

      if (netA && netB) {
        if (netA < netB) teamAScore += 1;
        if (netB < netA) teamBScore += 1;
        holesCounted += 1;
      }
    }

    return { teamAScore, teamBScore, holesCounted, higherIsBetter: true };
  }

  function getSinglesSideSegment(start, end) {
    let teamAScore = 0;
    let teamBScore = 0;
    let holesCounted = 0;

    teams[3].forEach((match) => {
      const result = getSinglesMatchSegment(match, start, end);
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
    const roundOne = {
      front: getStablefordSegment(teams[1][0], teams[1][1], 1, 9),
      back: getStablefordSegment(teams[1][0], teams[1][1], 10, 18),
      full: getStablefordSegment(teams[1][0], teams[1][1], 1, 18),
    };

    const roundTwo = {
      front: getScrambleSideSegment(1, 9),
      back: getScrambleSideSegment(10, 18),
      full: getScrambleSideSegment(1, 18),
    };

    const roundThree = {
      front: getSinglesSideSegment(1, 9),
      back: getSinglesSideSegment(10, 18),
      full: getSinglesSideSegment(1, 18),
    };

    return {
      1: { ...roundOne, label: "Round 1", format: "Stableford" },
      2: { ...roundTwo, label: "Round 2", format: "Scramble" },
      3: { ...roundThree, label: "Round 3", format: "Singles" },
    };
  }, [scores, teams, handicaps]);

  const weekendScore = useMemo(() => {
    let team1 = 0;
    let team2 = 0;

    Object.values(roundSegments).forEach((round) => {
      [round.front, round.back, round.full].forEach((segment) => {
        const points = awardLivePoint(segment);
        team1 += points[0];
        team2 += points[1];
      });
    });

    return { team1, team2 };
  }, [roundSegments]);

  const matchupGroups = useMemo(() => {
    return [
      {
        roundId: 1,
        title: "Round 1",
        subtitle: "Best Ball Stableford",
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
        title: "Round 2",
        subtitle: "2-Man Scramble",
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
        title: "Round 3",
        subtitle: "Singles Matches",
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

  function getMatchupSegment(matchup, start, end) {
    if (matchup.type === "stableford") {
      return getStablefordSegment(
        matchup.sideAPlayers,
        matchup.sideBPlayers,
        start,
        end
      );
    }

    if (matchup.type === "scramble") {
      return getScramblePairSegment(
        matchup.sideAPlayers,
        matchup.sideBPlayers,
        start,
        end
      );
    }

    return getSinglesMatchSegment(
      [matchup.sideAPlayers[0], matchup.sideBPlayers[0]],
      start,
      end
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

    if (selectedPlayer === oldName) {
      setSelectedPlayer(newName);
    }
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

  function renderScorecardRow(roundId, player) {
    const front = getPlayerTotal(roundId, player, 1, 9);
    const back = getPlayerTotal(roundId, player, 10, 18);
    const total = front + back;

    const netFront = getPlayerTotal(roundId, player, 1, 9, true);
    const netBack = getPlayerTotal(roundId, player, 10, 18, true);
    const showNet = handicapApplies(roundId);

    return (
      <tr key={player}>
        <td className="scorecard-name">
          {player}
          {showNet && <small className="net-note"> Net {netFront + netBack || "-"}</small>}
        </td>

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
            {showNet && getHoleStrokes(roundId, player, hole) > 0 && (
              <div className="pop-dot">-{getHoleStrokes(roundId, player, hole)}</div>
            )}
          </td>
        ))}

        <td className="score-total">{showNet ? `${front || "-"} / ${netFront || "-"}` : front || "-"}</td>

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
            {showNet && getHoleStrokes(roundId, player, hole) > 0 && (
              <div className="pop-dot">-{getHoleStrokes(roundId, player, hole)}</div>
            )}
          </td>
        ))}

        <td className="score-total">{showNet ? `${back || "-"} / ${netBack || "-"}` : back || "-"}</td>
        <td className="score-total">{showNet ? `${total || "-"} / ${netFront + netBack || "-"}` : total || "-"}</td>
      </tr>
    );
  }

  function renderScrambleRow(pair) {
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

  function AppShell({ children }) {
    return (
      <div className="app">
        <header className="hero">
          <div className="hero-left">
            <p>Covid Classic</p>
            <h1>Live Weekend Scoreboard</h1>
            <span>Jack Frost · Ballyowen · 8-Man Cup</span>
          </div>

          <div className="scorebug">
            <div>
              <span>Team 1</span>
              <strong>{formatPoints(weekendScore.team1)}</strong>
            </div>
            <b>-</b>
            <div>
              <span>Team 2</span>
              <strong>{formatPoints(weekendScore.team2)}</strong>
            </div>
          </div>
        </header>

        <div className={`live-status ${connectionStatus === "Live" ? "is-live" : ""}`}>
          {connectionStatus === "Live" ? "● Live Sync On" : `● ${connectionStatus}`}
        </div>

        {!selectedMatchup && (
          <nav className="nav-tabs">
            <button className={activeTab === "home" ? "active" : ""} onClick={() => setActiveTab("home")}>
              Scoreboard
            </button>
            <button className={activeTab === "enter" ? "active" : ""} onClick={() => setActiveTab("enter")}>
              Enter Scores
            </button>
            <button className={activeTab === "matchups" ? "active" : ""} onClick={() => setActiveTab("matchups")}>
              Matchups
            </button>
            <button className={activeTab === "setup" ? "active" : ""} onClick={() => setActiveTab("setup")}>
              Setup
            </button>
          </nav>
        )}

        {children}
      </div>
    );
  }

  function HomeView() {
    return (
      <>
        <section className="main-card cup-card">
          <div className="cup-row">
            <div className="cup-team">
              <span>Team 1</span>
              <strong>{formatPoints(weekendScore.team1)}</strong>
              <small>{teams[1][0].join(" · ")}</small>
            </div>

            <div className="cup-vs">VS</div>

            <div className="cup-team">
              <span>Team 2</span>
              <strong>{formatPoints(weekendScore.team2)}</strong>
              <small>{teams[1][1].join(" · ")}</small>
            </div>
          </div>
        </section>

        <section className="round-strip">
          {[1, 2, 3].map((roundId) => {
            const round = roundSegments[roundId];
            const frontPoints = awardLivePoint(round.front);
            const backPoints = awardLivePoint(round.back);
            const fullPoints = awardLivePoint(round.full);
            const team1 = frontPoints[0] + backPoints[0] + fullPoints[0];
            const team2 = frontPoints[1] + backPoints[1] + fullPoints[1];

            return (
              <button
                className="round-status-card"
                key={roundId}
                onClick={() => {
                  setActiveTab("matchups");
                }}
              >
                <p>{round.label}</p>
                <h3>{round.format}</h3>
                <strong>{formatPoints(team1)} - {formatPoints(team2)}</strong>
                <span>{getSegmentStatus(round.full)}</span>
              </button>
            );
          })}
        </section>

        <section className="main-card">
          <div className="section-title">
            <div>
              <p>Match Center</p>
              <h2>Live Matchups</h2>
            </div>
          </div>

          <div className="matchup-list">
            {flatMatchups.map((matchup) => {
              const summary = getMatchupSummary(matchup);

              return (
                <button
                  className="matchup-card"
                  key={matchup.id}
                  onClick={() => setSelectedMatchupId(matchup.id)}
                >
                  <div>
                    <p>{rounds.find((r) => r.id === matchup.roundId).format}</p>
                    <h3>{matchup.title}</h3>
                    <span>{summary.status}</span>
                  </div>

                  <strong>{summary.full.teamAScore} - {summary.full.teamBScore}</strong>
                </button>
              );
            })}
          </div>
        </section>
      </>
    );
  }

  function EnterScoresView() {
    const round = rounds.find((item) => item.id === selectedRoundId);
    const course = courses[round.courseKey];
    const scoringPlayer = getScoringPlayerForRound(selectedRoundId, selectedPlayer);
    const scoreLabel = getScoreEntryLabel(selectedRoundId, selectedPlayer);

    const frontTotal = getPlayerTotal(selectedRoundId, scoringPlayer, 1, 9);
    const backTotal = getPlayerTotal(selectedRoundId, scoringPlayer, 10, 18);
    const netFront = getPlayerTotal(selectedRoundId, scoringPlayer, 1, 9, true);
    const netBack = getPlayerTotal(selectedRoundId, scoringPlayer, 10, 18, true);
    const showNet = handicapApplies(selectedRoundId);

    return (
      <section className="entry-layout">
        <aside className="entry-picker">
          <p>Enter Scores</p>
          <h2>Find Your Card</h2>

          <label>Player</label>
          <select value={selectedPlayer} onChange={(event) => setSelectedPlayer(event.target.value)}>
            {players.map((player) => (
              <option key={player} value={player}>{player}</option>
            ))}
          </select>

          <label>Round</label>
          <select value={selectedRoundId} onChange={(event) => setSelectedRoundId(Number(event.target.value))}>
            {rounds.map((roundOption) => (
              <option key={roundOption.id} value={roundOption.id}>
                {roundOption.name} · {roundOption.format}
              </option>
            ))}
          </select>

          <div className="entry-total-box">
            <span>{scoreLabel}</span>
            <strong>{frontTotal + backTotal || "-"}</strong>
            <small>
              OUT {frontTotal || "-"} · IN {backTotal || "-"}
              {showNet && (
                <>
                  <br />
                  NET {netFront + netBack || "-"} · Strokes {handicaps[scoringPlayer] || 0}
                </>
              )}
            </small>
          </div>
        </aside>

        <section className="phone-scorecard">
          <div className="phone-card-head">
            <div>
              <p>{round.name}</p>
              <h2>{scoreLabel}</h2>
              <span>{course.name}</span>
            </div>
          </div>

          <div className="hole-list">
            {course.par.map((par, index) => {
              const hole = index + 1;
              const pops = getHoleStrokes(selectedRoundId, scoringPlayer, hole);
              const netScore = getNetScore(selectedRoundId, scoringPlayer, hole);

              return (
                <div className="hole-row" key={hole}>
                  <div>
                    <strong>Hole {hole}</strong>
                    <span>
                      Par {par} · HCP {course.hcp[hole - 1]}
                      {showNet && pops > 0 ? ` · ${pops} stroke${pops > 1 ? "s" : ""}` : ""}
                      {showNet && netScore ? ` · Net ${netScore}` : ""}
                    </span>
                  </div>

                  <input
                    type="number"
                    min="1"
                    value={getScore(selectedRoundId, scoringPlayer, hole)}
                    onChange={(event) =>
                      updateScore(selectedRoundId, scoringPlayer, hole, event.target.value)
                    }
                    placeholder="-"
                  />
                </div>
              );
            })}
          </div>
        </section>
      </section>
    );
  }

  function MatchupsView() {
    return (
      <section className="main-card">
        <div className="section-title">
          <div>
            <p>Match Center</p>
            <h2>All Matchups</h2>
          </div>
        </div>

        <div className="matchup-groups">
          {matchupGroups.map((group) => (
            <div className="matchup-group" key={group.roundId}>
              <div className="group-head">
                <h3>{group.title}</h3>
                <span>{group.subtitle}</span>
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
                      <div>
                        <p>{group.subtitle}</p>
                        <h3>{matchup.title}</h3>
                        <span>{summary.status}</span>
                      </div>

                      <strong>{summary.full.teamAScore} - {summary.full.teamBScore}</strong>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  function SetupView() {
    return (
      <>
        <section className="main-card">
          <div className="section-title">
            <div>
              <p>Setup</p>
              <h2>Handicap Strokes</h2>
            </div>
          </div>

          <div className="players-grid">
            {players.map((player) => (
              <div className="handicap-box" key={player}>
                <label>{player}</label>
                <input
                  type="number"
                  min="0"
                  value={handicaps[player] || ""}
                  onChange={(event) => updateHandicap(player, event.target.value)}
                  placeholder="0"
                />
              </div>
            ))}
          </div>

          <p className="setup-note">
            Strokes apply to Stableford and Singles only. Scramble remains gross.
          </p>
        </section>

        <section className="main-card">
          <div className="section-title">
            <div>
              <p>Setup</p>
              <h2>Player Names</h2>
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

        <section className="main-card">
          <div className="section-title">
            <div>
              <p>Setup</p>
              <h2>Teams & Matches</h2>
            </div>
          </div>

          <div className="setup-grid">
            {rounds.map((round) => (
              <div className="setup-round" key={round.id}>
                <h3>{round.name}</h3>
                <span>{round.format}</span>

                {(teams[round.id] || []).map((team, teamIndex) => (
                  <div className="setup-team" key={teamIndex}>
                    <strong>
                      {round.format === "Singles Matches"
                        ? `Match ${teamIndex + 1}`
                        : `Team ${teamIndex + 1}`}
                    </strong>

                    {team.map((player, playerIndex) => (
                      <select
                        key={playerIndex}
                        value={player}
                        onChange={(event) =>
                          updateTeam(round.id, teamIndex, playerIndex, event.target.value)
                        }
                      >
                        {players.map((playerOption) => (
                          <option key={playerOption} value={playerOption}>{playerOption}</option>
                        ))}
                      </select>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      </>
    );
  }

  function ScorecardView() {
    const matchup = selectedMatchup;
    const round = rounds.find((item) => item.id === matchup.roundId);
    const course = courses[round.courseKey];
    const summary = getMatchupSummary(matchup);

    const outPar = course.par.slice(0, 9).reduce((sum, par) => sum + par, 0);
    const inPar = course.par.slice(9, 18).reduce((sum, par) => sum + par, 0);

    return (
      <>
        <div className="detail-actions">
          <button onClick={() => setSelectedMatchupId(null)}>← Back</button>
          <button onClick={() => resetRound(matchup.roundId)}>Reset Round</button>
        </div>

        <section className="detail-hero">
          <div>
            <p>{round.name} · {round.format}</p>
            <h2>{matchup.title}</h2>
            <span>{summary.status}</span>
          </div>

          <div className="detail-score-boxes">
            <div>
              <span>Front</span>
              <strong>{summary.front.teamAScore}-{summary.front.teamBScore}</strong>
            </div>
            <div>
              <span>Back</span>
              <strong>{summary.back.teamAScore}-{summary.back.teamBScore}</strong>
            </div>
            <div>
              <span>Total</span>
              <strong>{summary.full.teamAScore}-{summary.full.teamBScore}</strong>
            </div>
          </div>
        </section>

        <section className="scorecard-shell">
          <div className="scorecard-wrap">
            <table className="scorecard">
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
                  <th>{outPar + inPar}</th>
                </tr>

                <tr>
                  <th className="scorecard-name">HCP</th>
                  {course.hcp.slice(0, 9).map((hcp, index) => <th key={index}>{hcp}</th>)}
                  <th></th>
                  {course.hcp.slice(9, 18).map((hcp, index) => <th key={index}>{hcp}</th>)}
                  <th></th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {matchup.type === "stableford" && (
                  <>
                    <tr className="divider"><td colSpan="22">Team 1</td></tr>
                    {matchup.sideAPlayers.map((player) => renderScorecardRow(1, player))}
                    <tr className="divider"><td colSpan="22">Team 2</td></tr>
                    {matchup.sideBPlayers.map((player) => renderScorecardRow(1, player))}
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
                    {renderScorecardRow(3, matchup.sideAPlayers[0])}
                    {renderScorecardRow(3, matchup.sideBPlayers[0])}
                  </>
                )}

                <tr className="result-row">
                  <td className="scorecard-name">Result</td>

                  {FRONT_HOLES.map((hole) => <td key={hole}>{getHoleResult(matchup, hole)}</td>)}

                  <td>{summary.front.teamAScore}-{summary.front.teamBScore}</td>

                  {BACK_HOLES.map((hole) => <td key={hole}>{getHoleResult(matchup, hole)}</td>)}

                  <td>{summary.back.teamAScore}-{summary.back.teamBScore}</td>
                  <td>{summary.full.teamAScore}-{summary.full.teamBScore}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </>
    );
  }

  return (
    <AppShell>
      {selectedMatchup ? (
        <ScorecardView />
      ) : (
        <>
          {activeTab === "home" && <HomeView />}
          {activeTab === "enter" && <EnterScoresView />}
          {activeTab === "matchups" && <MatchupsView />}
          {activeTab === "setup" && <SetupView />}
        </>
      )}
    </AppShell>
  );
}

export default App;
