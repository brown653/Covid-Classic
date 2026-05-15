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
  "Matt Brooks",
  "Pat Lavelle",
];

const PLAYER_PHOTOS = {
  "Al Brown": "/avatars/al-brown.jpg",
  "Charles Mayer": "/avatars/charles-mayer.jpg",
  "Mike Luddy": "/avatars/mike-luddy.jpg",
  "Mike Paladino": "/avatars/mike-paladino.jpg",
  "Kevin Gilmore": "/avatars/kevin-gilmore.jpg",
  "Jason Spendley": "/avatars/jason-spendley.jpg",
  "Matt Brooks": "/avatars/matt-brooks.jpg",
  "Pat Lavelle": "/avatars/pat-lavelle.jpg",
};

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

const RACE_TO = 12.5;
const TOTAL_WEEKEND_POINTS = 24;

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
      ["Al Brown", "Charles Mayer"],
      ["Mike Luddy", "Mike Paladino"],
      ["Kevin Gilmore", "Jason Spendley"],
      ["Matt Brooks", "Pat Lavelle"],
    ],
    2: [
      ["Al Brown", "Charles Mayer"],
      ["Mike Luddy", "Mike Paladino"],
      ["Kevin Gilmore", "Jason Spendley"],
      ["Matt Brooks", "Pat Lavelle"],
    ],
    3: [
      ["Al Brown", "Kevin Gilmore"],
      ["Charles Mayer", "Jason Spendley"],
      ["Mike Luddy", "Matt Brooks"],
      ["Mike Paladino", "Pat Lavelle"],
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

  function getStablefordSideSegment(start, end) {
    const teamOnePairs = [teams[1][0], teams[1][1]];
    const teamTwoPairs = [teams[1][2], teams[1][3]];

    let teamAScore = 0;
    let teamBScore = 0;
    let holesCounted = 0;

    teamOnePairs.forEach((pairA, index) => {
      const pairB = teamTwoPairs[index];
      const result = getStablefordSegment(pairA, pairB, start, end);

      teamAScore += result.teamAScore;
      teamBScore += result.teamBScore;
      holesCounted += result.holesCounted;
    });

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

  function getTeamPairMatchesForRound(roundId) {
    return [
      [teams[roundId][0], teams[roundId][2]],
      [teams[roundId][1], teams[roundId][3]],
    ];
  }

  function getPairMatchSegmentForRound(roundId, pairA, pairB, start, end) {
    if (roundId === 1) return getStablefordSegment(pairA, pairB, start, end);
    return getScramblePairSegment(pairA, pairB, start, end);
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
      front: getStablefordSideSegment(1, 9),
      back: getStablefordSideSegment(10, 18),
      full: getStablefordSideSegment(1, 18),
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

    [1, 2].forEach((roundId) => {
      getTeamPairMatchesForRound(roundId).forEach(([pairA, pairB]) => {
        [
          getPairMatchSegmentForRound(roundId, pairA, pairB, 1, 9),
          getPairMatchSegmentForRound(roundId, pairA, pairB, 10, 18),
          getPairMatchSegmentForRound(roundId, pairA, pairB, 1, 18),
        ].forEach((segment) => {
          const points = awardLivePoint(segment);
          team1 += points[0];
          team2 += points[1];
        });
      });
    });

    teams[3].forEach((match) => {
      [
        getSinglesMatchSegment(match, 1, 9),
        getSinglesMatchSegment(match, 10, 18),
        getSinglesMatchSegment(match, 1, 18),
      ].forEach((segment) => {
        const points = awardLivePoint(segment);
        team1 += points[0];
        team2 += points[1];
      });
    });

    return { team1, team2 };
  }, [roundSegments, scores, teams, handicaps]);

  const matchupGroups = useMemo(() => {
    return [
      {
        roundId: 1,
        title: "Round 1",
        subtitle: "Best Ball Stableford",
        items: [
          {
            id: "stableford-1",
            roundId: 1,
            type: "stableford",
            title: `${teams[1][0].join(" / ")} vs ${teams[1][2].join(" / ")}`,
            sideAName: "Team 1 Pair 1",
            sideBName: "Team 2 Pair 1",
            sideAPlayers: teams[1][0],
            sideBPlayers: teams[1][2],
          },
          {
            id: "stableford-2",
            roundId: 1,
            type: "stableford",
            title: `${teams[1][1].join(" / ")} vs ${teams[1][3].join(" / ")}`,
            sideAName: "Team 1 Pair 2",
            sideBName: "Team 2 Pair 2",
            sideAPlayers: teams[1][1],
            sideBPlayers: teams[1][3],
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
              <span className="pop-star" aria-label="Handicap stroke">{getHoleStrokes(roundId, player, hole) > 1 ? "**" : "*"}</span>
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
              <span className="pop-star" aria-label="Handicap stroke">{getHoleStrokes(roundId, player, hole) > 1 ? "**" : "*"}</span>
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

  function getRoundCupPoints(roundId) {
    let team1 = 0;
    let team2 = 0;

    if (roundId === 1 || roundId === 2) {
      getTeamPairMatchesForRound(roundId).forEach(([pairA, pairB]) => {
        [
          getPairMatchSegmentForRound(roundId, pairA, pairB, 1, 9),
          getPairMatchSegmentForRound(roundId, pairA, pairB, 10, 18),
          getPairMatchSegmentForRound(roundId, pairA, pairB, 1, 18),
        ].forEach((segment) => {
          const points = awardLivePoint(segment);
          team1 += points[0];
          team2 += points[1];
        });
      });
      return { team1, team2 };
    }

    teams[3].forEach((match) => {
      [
        getSinglesMatchSegment(match, 1, 9),
        getSinglesMatchSegment(match, 10, 18),
        getSinglesMatchSegment(match, 1, 18),
      ].forEach((segment) => {
        const points = awardLivePoint(segment);
        team1 += points[0];
        team2 += points[1];
      });
    });

    return { team1, team2 };
  }

  function getMatchResultLabel(matchup) {
    const full = getMatchupSegment(matchup, 1, 18);
    if (!full.holesCounted) return "Not Started";
    if (full.teamAScore === full.teamBScore) return "A/S";

    const leader = getMatchLeader(matchup);
    const leaderLabel = leader === "team1" ? "Team 1" : "Team 2";
    return `${leaderLabel} ${Math.abs(full.teamAScore - full.teamBScore)} UP`;
  }

  function getMatchLeader(matchup) {
    const full = getMatchupSegment(matchup, 1, 18);
    if (!full.holesCounted || full.teamAScore === full.teamBScore) return "tie";
    if (full.higherIsBetter) return full.teamAScore > full.teamBScore ? "team1" : "team2";
    return full.teamAScore < full.teamBScore ? "team1" : "team2";
  }

  function getSegmentPointLabel(segment) {
    const points = awardLivePoint(segment);
    return `${formatPoints(points[0])}-${formatPoints(points[1])}`;
  }

  function getPlayerInitials(player) {
    return player
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  function PlayerAvatarRow({ players: avatarPlayers, side }) {
    return (
      <div className={`rc-avatar-row ${side === "team2" ? "team2" : "team1"}`}>
        {avatarPlayers.map((player) => (
          <div className="rc-avatar-card" key={player}>
            <div className="rc-avatar-circle" aria-label={`${player} headshot`}>
              {PLAYER_PHOTOS[player] ? (
                <img src={PLAYER_PHOTOS[player]} alt={player} />
              ) : (
                <span>{getPlayerInitials(player)}</span>
              )}
            </div>
            <small>{player.split(" ")[0]}</small>
          </div>
        ))}
      </div>
    );
  }

  function getStartedRoundId() {
    for (const roundId of [3, 2, 1]) {
      const group = matchupGroups.find((item) => item.roundId === roundId);
      if (group?.items.some((matchup) => getMatchupSegment(matchup, 1, 18).holesCounted > 0)) {
        return roundId;
      }
    }
    return 1;
  }

  function AppShell({ children }) {
    const leadPercent = Math.max(
      0,
      Math.min(100, (weekendScore.team1 / TOTAL_WEEKEND_POINTS) * 100)
    );
    const team1Needed = Math.max(0, RACE_TO - weekendScore.team1);
    const team2Needed = Math.max(0, RACE_TO - weekendScore.team2);

    return (
      <div className="rc-page">
        <div className="rc-topline">
          <div className="rc-brand">COVID CLASSIC</div>
          <div className={`rc-live-pill ${connectionStatus === "Live" ? "is-live" : ""}`}>
            {connectionStatus === "Live" ? "● Live" : `● ${connectionStatus}`}
          </div>
        </div>

        <header className="rc-score-header">
          <div className="rc-score-meta">
            <div className="rc-team-meta rc-team-one">
              <span>Team 1</span>
              <strong>{formatPoints(team1Needed)}</strong>
              <small>more to win</small>
            </div>

            <div className="rc-race-meta">
              <strong>Race to {RACE_TO}</strong>
              <span>{formatPoints(weekendScore.team1 + weekendScore.team2)} / {TOTAL_WEEKEND_POINTS} points claimed</span>
            </div>

            <div className="rc-team-meta rc-team-two">
              <small>more to win</small>
              <strong>{formatPoints(team2Needed)}</strong>
              <span>Team 2</span>
            </div>
          </div>

          <div className="rc-score-bar" aria-label="Weekend score progress">
            <div className="rc-score-bar-red" style={{ width: `${leadPercent}%` }} />
            <div className="rc-score-bar-score rc-left-score">{formatPoints(weekendScore.team1)}</div>
            <div className="rc-score-bar-score rc-right-score">{formatPoints(weekendScore.team2)}</div>
          </div>
        </header>

        {!selectedMatchup && (
          <nav className="rc-nav">
            <button className={activeTab === "home" ? "active" : ""} onClick={() => setActiveTab("home")}>Scoring</button>
            <button className={activeTab === "enter" ? "active" : ""} onClick={() => setActiveTab("enter")}>Enter Scores</button>
            <button className={activeTab === "matchups" ? "active" : ""} onClick={() => setActiveTab("matchups")}>All Matches</button>
            <button className={activeTab === "setup" ? "active" : ""} onClick={() => setActiveTab("setup")}>Setup</button>
          </nav>
        )}

        {children}
      </div>
    );
  }

  function RyderMatchCard({ matchup, matchNumber }) {
    const summary = getMatchupSummary(matchup);
    const leader = getMatchLeader(matchup);
    const resultLabel = getMatchResultLabel(matchup);
    const holesPlayed = getMatchupSegment(matchup, 1, 18).holesCounted;

    return (
      <button className={`rc-match-card leader-${leader}`} onClick={() => setSelectedMatchupId(matchup.id)}>
        <div className={`rc-match-side rc-side-red ${leader === "team1" ? "leading" : ""}`}>
          <div className="rc-player-dot">T1</div>
          <div className="rc-side-content">
            <PlayerAvatarRow players={matchup.sideAPlayers} side="team1" />
          </div>
        </div>

        <div className={`rc-match-center ${leader === "team1" ? "red-leader" : leader === "team2" ? "blue-leader" : "tie-leader"}`}>
          <p>Match {matchNumber} <span>{holesPlayed >= 18 ? "Final" : holesPlayed ? `Thru ${holesPlayed}` : "Upcoming"}</span></p>
          <strong>{resultLabel}</strong>
          <div className="rc-points-row">
            <span>Front {getSegmentPointLabel(summary.front)}</span>
            <span>Back {getSegmentPointLabel(summary.back)}</span>
            <span>Total {getSegmentPointLabel(summary.full)}</span>
          </div>
        </div>

        <div className={`rc-match-side rc-side-blue ${leader === "team2" ? "leading" : ""}`}>
          <div className="rc-side-content">
            <PlayerAvatarRow players={matchup.sideBPlayers} side="team2" />
          </div>
          <div className="rc-player-dot">T2</div>
        </div>

        <div className="rc-hole-strip">
          {Array.from({ length: 18 }, (_, index) => {
            const hole = index + 1;
            const result = getHoleResult(matchup, hole);
            return (
              <span
                key={hole}
                className={`rc-hole-dot ${result === "T1" ? "red" : result === "T2" ? "blue" : result === "E" ? "even" : ""}`}
              >
                {hole}
              </span>
            );
          })}
        </div>
      </button>
    );
  }

  function HomeView() {
    const currentRoundId = selectedRoundId || getStartedRoundId();
    const currentGroup = matchupGroups.find((group) => group.roundId === currentRoundId) || matchupGroups[0];
    const otherGroups = matchupGroups.filter((group) => group.roundId !== currentGroup.roundId);
    const currentRoundPoints = getRoundCupPoints(currentGroup.roundId);

    return (
      <>
        <section className="rc-session-tabs">
          {matchupGroups.map((group) => (
            <button
              key={group.roundId}
              className={currentGroup.roundId === group.roundId ? "active" : ""}
              onClick={() => setSelectedRoundId(group.roundId)}
            >
              <span>{group.title}</span>
              <strong>{group.subtitle}</strong>
            </button>
          ))}
        </section>

        <section className="rc-session-card">
          <div className="rc-section-head">
            <div>
              <p>Current Round Live Score</p>
              <h2>{currentGroup.title} — {currentGroup.subtitle}</h2>
            </div>
            <div className="rc-session-score">
              {formatPoints(currentRoundPoints.team1)} - {formatPoints(currentRoundPoints.team2)}
            </div>
          </div>

          <div className="rc-match-stack">
            {currentGroup.items.map((matchup, index) => (
              <RyderMatchCard key={matchup.id} matchup={matchup} matchNumber={index + 1} />
            ))}
          </div>
        </section>

        <section className="rc-other-rounds">
          {otherGroups.map((group) => {
            const points = getRoundCupPoints(group.roundId);
            return (
              <button
                className="rc-round-summary"
                key={group.roundId}
                onClick={() => setSelectedRoundId(group.roundId)}
              >
                <p>{group.title}</p>
                <h3>{group.subtitle}</h3>
                <strong>{formatPoints(points.team1)} - {formatPoints(points.team2)}</strong>
                <span>View session</span>
              </button>
            );
          })}
        </section>

        <section className="rc-team-footer">
          <div className="rc-roster-card red">
            <div>
              <p>Team 1</p>
              <strong>{formatPoints(weekendScore.team1)}</strong>
            </div>
            <span>{[...teams[1][0], ...teams[1][1]].join(" · ")}</span>
          </div>

          <div className="rc-roster-card blue">
            <div>
              <p>Team 2</p>
              <strong>{formatPoints(weekendScore.team2)}</strong>
            </div>
            <span>{[...teams[1][2], ...teams[1][3]].join(" · ")}</span>
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
                        : round.id === 1
                        ? teamIndex < 2
                          ? `Team 1 Pair ${teamIndex + 1}`
                          : `Team 2 Pair ${teamIndex - 1}`
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
    const detailLeader = getMatchLeader(matchup);

    const outPar = course.par.slice(0, 9).reduce((sum, par) => sum + par, 0);
    const inPar = course.par.slice(9, 18).reduce((sum, par) => sum + par, 0);

    return (
      <>
        <div className="detail-actions">
          <button onClick={() => setSelectedMatchupId(null)}>← Back</button>
          <button onClick={() => resetRound(matchup.roundId)}>Reset Round</button>
        </div>

        <section className={`detail-hero leader-${detailLeader}`}>
          <div className="detail-side detail-side-red">
            <div className="detail-team-badge">T1</div>
            <div>
              <p>{matchup.sideAName}</p>
              <h2>{matchup.sideAPlayers.join(" / ")}</h2>
            </div>
          </div>

          <div className={`detail-center ${detailLeader === "team1" ? "red-leader" : detailLeader === "team2" ? "blue-leader" : "tie-leader"}`}>
            <p>{round.name} · {round.format}</p>
            <strong>{summary.status}</strong>
            <div className="detail-score-boxes">
              <div>
                <span>Front</span>
                <b>{summary.front.teamAScore}-{summary.front.teamBScore}</b>
              </div>
              <div>
                <span>Back</span>
                <b>{summary.back.teamAScore}-{summary.back.teamBScore}</b>
              </div>
              <div>
                <span>Total</span>
                <b>{summary.full.teamAScore}-{summary.full.teamBScore}</b>
              </div>
            </div>
          </div>

          <div className="detail-side detail-side-blue">
            <div>
              <p>{matchup.sideBName}</p>
              <h2>{matchup.sideBPlayers.join(" / ")}</h2>
            </div>
            <div className="detail-team-badge">T2</div>
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
                    <tr className="divider"><td colSpan="22">{matchup.sideAName}</td></tr>
                    {matchup.sideAPlayers.map((player) => renderScorecardRow(1, player))}
                    <tr className="divider"><td colSpan="22">{matchup.sideBName}</td></tr>
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
