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

const TEAM_BRANDING = {
  team1: {
    name: "Chips Don't Lie",
    subtitle: "(feat. Wyclef Green)",
    captain: "Mike Paladino",
    members: ["Al Brown", "Mike Luddy", "Pat Lavelle"],
    logo: "/logos/chips-dont-lie-clean.png",
  },
  team2: {
    name: "Weapons of Grass Destruction",
    subtitle: "(W.O.G.D.)",
    captain: "Matt Brooks",
    members: ["Charles Mayer", "Kevin Gilmore", "Jason Spendley"],
    logo: "/logos/weapons-of-grass-clean.png",
  },
};

const LOCKED_TEAM_1 = ["Al Brown", "Mike Luddy", "Mike Paladino", "Pat Lavelle"];
const LOCKED_TEAM_2 = ["Charles Mayer", "Kevin Gilmore", "Jason Spendley", "Matt Brooks"];

const DEFAULT_TEAMS = {
  1: [
    [LOCKED_TEAM_1[0], LOCKED_TEAM_1[1]],
    [LOCKED_TEAM_1[2], LOCKED_TEAM_1[3]],
    [LOCKED_TEAM_2[0], LOCKED_TEAM_2[1]],
    [LOCKED_TEAM_2[2], LOCKED_TEAM_2[3]],
  ],
  2: [
    [LOCKED_TEAM_1[0], LOCKED_TEAM_1[1]],
    [LOCKED_TEAM_1[2], LOCKED_TEAM_1[3]],
    [LOCKED_TEAM_2[0], LOCKED_TEAM_2[1]],
    [LOCKED_TEAM_2[2], LOCKED_TEAM_2[3]],
  ],
  3: [
    [LOCKED_TEAM_1[0], LOCKED_TEAM_2[0]],
    [LOCKED_TEAM_1[1], LOCKED_TEAM_2[1]],
    [LOCKED_TEAM_1[2], LOCKED_TEAM_2[2]],
    [LOCKED_TEAM_1[3], LOCKED_TEAM_2[3]],
  ],
};

const JACK_FROST = {
  name: "Jack Frost National",
  par: [4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 3, 5, 4, 4, 4, 3, 4, 5],
  hcp: [11, 5, 17, 7, 15, 3, 9, 13, 1, 8, 18, 2, 10, 6, 14, 16, 12, 4],
};

const SPLIT_ROCK_NORTH = {
  name: "Split Rock North Course",
  par: [5, 4, 3, 4, 5, 4, 5, 4, 4, 4, 5, 4, 3, 5, 4, 3, 4, 4],
  hcp: [13, 17, 7, 1, 3, 15, 11, 5, 9, 2, 10, 16, 4, 6, 8, 18, 12, 14],
};

const rounds = [
  {
    id: 1,
    name: "Saturday AM",
    shortName: "SAT AM",
    courseKey: "jackFrost",
    format: "Best Ball Stableford",
  },
  {
    id: 2,
    name: "Saturday PM",
    shortName: "SAT PM",
    courseKey: "splitRockNorth",
    format: "2-Man Scramble",
  },
  {
    id: 3,
    name: "Sunday AM",
    shortName: "SUN AM",
    courseKey: "jackFrost",
    format: "Singles Matches",
  },
];

const RACE_TO = 16.5;
const TOTAL_WEEKEND_POINTS = 32;

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

function roundHalfUp(value) {
  return Math.floor(value + 0.5);
}

function TeamLogo({ src, alt, size = 56 }) {
  if (!src) {
    return (
      <div
        className="team-logo-fallback"
        style={{ width: size, height: size }}
        aria-label={alt}
      >
        {alt?.slice(0, 2).toUpperCase() || "T"}
      </div>
    );
  }

  return (
    <img
      className="team-logo"
      src={src}
      alt={alt}
      style={{ width: size, height: size }}
    />
  );
}

function TeamBadge({ teamKey, fallback, size = 54 }) {
  const team = TEAM_BRANDING[teamKey];

  if (team?.logo) {
    return (
      <img
        className="team-badge-logo"
        src={team.logo}
        alt={team.name || fallback}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="team-badge-fallback"
      style={{ width: size, height: size }}
      aria-label={fallback}
    >
      {fallback}
    </div>
  );
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

  const [scrambleDriveCounts, setScrambleDriveCounts] = useState({
    "0": { a: 0, b: 0 },
    "1": { a: 0, b: 0 },
  });

  const [teams, setTeams] = useState(() => {
    try {
      const saved = localStorage.getItem("covid-classic-matchups");
      return saved ? JSON.parse(saved) : DEFAULT_TEAMS;
    } catch {
      return DEFAULT_TEAMS;
    }
  });

  useEffect(() => {
    localStorage.setItem("covid-classic-matchups", JSON.stringify(teams));
  }, [teams]);

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

  function getRound(roundId) {
    return rounds.find((round) => round.id === roundId);
  }

  function getCourse(roundId) {
    const round = getRound(roundId);

    if (round.courseKey === "jackFrost") return JACK_FROST;
    if (round.courseKey === "splitRockNorth") return SPLIT_ROCK_NORTH;

    return JACK_FROST;
  }

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

  function getStablefordHoleStrokes(player, holeNumber) {
    const totalStrokes = Number(handicaps[player] || 0);
    if (!totalStrokes) return 0;

    const course = getCourse(1);
    const holeHcp = course.hcp[holeNumber - 1];

    const baseStrokes = Math.floor(totalStrokes / 18);
    const extraStrokes = totalStrokes % 18;

    return baseStrokes + (holeHcp <= extraStrokes ? 1 : 0);
  }

  function getSinglesMatchStrokeInfo(playerA, playerB) {
    const hcpA = Number(handicaps[playerA] || 0);
    const hcpB = Number(handicaps[playerB] || 0);

    if (hcpA === hcpB) {
      return { receiver: null, strokes: 0 };
    }

    return hcpA > hcpB
      ? { receiver: playerA, strokes: hcpA - hcpB }
      : { receiver: playerB, strokes: hcpB - hcpA };
  }

  function getSinglesHoleStrokes(playerA, playerB, player, holeNumber) {
    const { receiver, strokes } = getSinglesMatchStrokeInfo(playerA, playerB);
    if (!receiver || strokes <= 0 || receiver !== player) return 0;

    const course = getCourse(3);
    const holeHcp = course.hcp[holeNumber - 1];

    return holeHcp <= strokes ? 1 : 0;
  }

  function getScrambleMatchStrokeInfo(pairA, pairB) {
    const teamAHcp = roundHalfUp(
      (Number(handicaps[pairA[0]] || 0) + Number(handicaps[pairA[1]] || 0)) * 0.25
    );
    const teamBHcp = roundHalfUp(
      (Number(handicaps[pairB[0]] || 0) + Number(handicaps[pairB[1]] || 0)) * 0.25
    );

    if (teamAHcp === teamBHcp) {
      return {
        teamAHcp,
        teamBHcp,
        receiver: null,
        strokes: 0,
      };
    }

    return teamAHcp > teamBHcp
      ? {
          teamAHcp,
          teamBHcp,
          receiver: "A",
          strokes: teamAHcp - teamBHcp,
        }
      : {
          teamAHcp,
          teamBHcp,
          receiver: "B",
          strokes: teamBHcp - teamAHcp,
        };
  }

  function getScrambleHoleStrokes(pairA, pairB, side, holeNumber) {
    const { receiver, strokes } = getScrambleMatchStrokeInfo(pairA, pairB);
    if (!receiver || strokes <= 0 || receiver !== side) return 0;

    const course = getCourse(2);
    const holeHcp = course.hcp[holeNumber - 1];

    return holeHcp <= strokes ? 1 : 0;
  }

  function getNetScore(roundId, player, holeNumber, context = null) {
    const gross = Number(getScore(roundId, player, holeNumber));
    if (!gross) return "";

    if (roundId === 1) {
      return gross - getStablefordHoleStrokes(player, holeNumber);
    }

    if (roundId === 3 && context?.opponent) {
      return gross - getSinglesHoleStrokes(player, context.opponent, player, holeNumber);
    }

    return gross;
  }

  function getPlayerTotal(roundId, player, start = 1, end = 18, net = false, context = null) {
    let total = 0;

    for (let hole = start; hole <= end; hole++) {
      const score = net ? getNetScore(roundId, player, hole, context) : getScore(roundId, player, hole);
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

    const course = getCourse(1);

    for (let hole = start; hole <= end; hole++) {
      const par = course.par[hole - 1];
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
      const grossA = Number(getScore(2, playerA, hole));
      const grossB = Number(getScore(2, playerB, hole));

      if (grossA && grossB) {
        const netA = grossA - getScrambleHoleStrokes(pairA, pairB, "A", hole);
        const netB = grossB - getScrambleHoleStrokes(pairA, pairB, "B", hole);

        teamAScore += netA;
        teamBScore += netB;
        holesCounted += 1;
      }
    }

    return { teamAScore, teamBScore, holesCounted, higherIsBetter: false };
  }

  function getSinglesMatchSegment(match, start, end) {
    const playerA = match[0];
    const playerB = match[1];

    let teamAScore = 0;
    let teamBScore = 0;
    let holesCounted = 0;

    for (let hole = start; hole <= end; hole++) {
      const netA = Number(getNetScore(3, playerA, hole, { opponent: playerB }));
      const netB = Number(getNetScore(3, playerB, hole, { opponent: playerA }));

      if (netA && netB) {
        if (netA < netB) teamAScore += 1;
        if (netB < netA) teamBScore += 1;
        holesCounted += 1;
      }
    }

    return { teamAScore, teamBScore, holesCounted, higherIsBetter: true };
  }

  function awardLivePoint(segment, pointValue = 1) {
    if (!segment.holesCounted) return [0, 0];

    if (segment.teamAScore === segment.teamBScore) {
      return [pointValue / 2, pointValue / 2];
    }

    if (segment.higherIsBetter) {
      return segment.teamAScore > segment.teamBScore ? [pointValue, 0] : [0, pointValue];
    }

    return segment.teamAScore < segment.teamBScore ? [pointValue, 0] : [0, pointValue];
  }

  function getRoundCupPoints(roundId) {
    let team1 = 0;
    let team2 = 0;

    if (roundId === 1 || roundId === 2) {
      const pairings =
        roundId === 1
          ? [
              [teams[1][0], teams[1][2]],
              [teams[1][1], teams[1][3]],
            ]
          : [
              [teams[2][0], teams[2][2]],
              [teams[2][1], teams[2][3]],
            ];

      pairings.forEach(([sideA, sideB]) => {
        const front =
          roundId === 1
            ? getStablefordSegment(sideA, sideB, 1, 9)
            : getScramblePairSegment(sideA, sideB, 1, 9);

        const back =
          roundId === 1
            ? getStablefordSegment(sideA, sideB, 10, 18)
            : getScramblePairSegment(sideA, sideB, 10, 18);

        const full =
          roundId === 1
            ? getStablefordSegment(sideA, sideB, 1, 18)
            : getScramblePairSegment(sideA, sideB, 1, 18);

        const frontPoints = awardLivePoint(front, 1);
        const backPoints = awardLivePoint(back, 1);
        const fullPoints = awardLivePoint(full, 2);

        team1 += frontPoints[0] + backPoints[0] + fullPoints[0];
        team2 += frontPoints[1] + backPoints[1] + fullPoints[1];
      });
    }

    if (roundId === 3) {
      teams[3].forEach((match) => {
        const front = getSinglesMatchSegment(match, 1, 9);
        const back = getSinglesMatchSegment(match, 10, 18);
        const full = getSinglesMatchSegment(match, 1, 18);

        const frontPoints = awardLivePoint(front, 1);
        const backPoints = awardLivePoint(back, 1);
        const fullPoints = awardLivePoint(full, 2);

        team1 += frontPoints[0] + backPoints[0] + fullPoints[0];
        team2 += frontPoints[1] + backPoints[1] + fullPoints[1];
      });
    }

    return { team1, team2 };
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

  function getSegmentWinnerLabel(segment) {
    if (!segment.holesCounted) return "Not Started";
    if (segment.teamAScore === segment.teamBScore) return "Halved";

    if (segment.higherIsBetter) {
      return segment.teamAScore > segment.teamBScore ? "Team 1" : "Team 2";
    }

    return segment.teamAScore < segment.teamBScore ? "Team 1" : "Team 2";
  }

  const weekendScore = useMemo(() => {
    const round1 = getRoundCupPoints(1);
    const round2 = getRoundCupPoints(2);
    const round3 = getRoundCupPoints(3);

    return {
      team1: round1.team1 + round2.team1 + round3.team1,
      team2: round1.team2 + round2.team2 + round3.team2,
    };
  }, [scores, teams, handicaps]);

  const matchupGroups = useMemo(() => {
    return [
      {
        roundId: 1,
        title: "Saturday AM",
        subtitle: "Jack Frost • Best Ball Stableford",
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
        title: "Saturday PM",
        subtitle: "Split Rock North • 2-Man Scramble",
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
            pairIndex: 0,
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
            pairIndex: 1,
          },
        ],
      },
      {
        roundId: 3,
        title: "Sunday AM",
        subtitle: "Jack Frost • Singles",
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
  const selectedMatchup = flatMatchups.find((matchup) => matchup.id === selectedMatchupId);

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

  function renderScorecardRow(roundId, player, context = null) {
    const front = getPlayerTotal(roundId, player, 1, 9);
    const back = getPlayerTotal(roundId, player, 10, 18);
    const total = front + back;

    const netFront = getPlayerTotal(roundId, player, 1, 9, true, context);
    const netBack = getPlayerTotal(roundId, player, 10, 18, true, context);
    const showNet = roundId === 1 || roundId === 3;

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
            {showNet && context?.opponent && getSinglesHoleStrokes(player, context.opponent, player, hole) > 0 && (
              <span className="pop-star" aria-label="Handicap stroke">*</span>
            )}
            {showNet && !context?.opponent && roundId === 1 && getStablefordHoleStrokes(player, hole) > 0 && (
              <span className="pop-star" aria-label="Handicap stroke">
                {getStablefordHoleStrokes(player, hole) > 1 ? "**" : "*"}
              </span>
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
            {showNet && context?.opponent && getSinglesHoleStrokes(player, context.opponent, player, hole) > 0 && (
              <span className="pop-star" aria-label="Handicap stroke">*</span>
            )}
            {showNet && !context?.opponent && roundId === 1 && getStablefordHoleStrokes(player, hole) > 0 && (
              <span className="pop-star" aria-label="Handicap stroke">
                {getStablefordHoleStrokes(player, hole) > 1 ? "**" : "*"}
              </span>
            )}
          </td>
        ))}

        <td className="score-total">{showNet ? `${back || "-"} / ${netBack || "-"}` : back || "-"}</td>
        <td className="score-total">{showNet ? `${total || "-"} / ${netFront + netBack || "-"}` : total || "-"}</td>
      </tr>
    );
  }

  function renderScrambleRow(pair, opponentPair, sideKey) {
    const scoringPlayer = pair[0];
    let grossFront = 0;
    let grossBack = 0;
    let netFront = 0;
    let netBack = 0;

    return (
      <tr key={pair.join("-")}>
        <td className="scorecard-name">
          {pair.join(" / ")}
          <small className="net-note">
            Net{" "}
            {(() => {
              let netTotal = 0;
              for (let hole = 1; hole <= 18; hole++) {
                const gross = Number(getScore(2, scoringPlayer, hole) || 0);
                const net = gross
                  ? gross - getScrambleHoleStrokes(pair, opponentPair, sideKey, hole)
                  : 0;
                netTotal += net;
              }
              return netTotal || "-";
            })()}
          </small>
        </td>

        {FRONT_HOLES.map((hole) => {
          const gross = Number(getScore(2, scoringPlayer, hole) || 0);
          const stroke = getScrambleHoleStrokes(pair, opponentPair, sideKey, hole);
          const net = gross ? gross - stroke : 0;
          grossFront += gross;
          netFront += net;

          return (
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
              {stroke > 0 && (
                <span className="pop-star" aria-label="Handicap stroke">
                  *
                </span>
              )}
            </td>
          );
        })}

        <td className="score-total">{`${grossFront || "-"} / ${netFront || "-"}`}</td>

        {BACK_HOLES.map((hole) => {
          const gross = Number(getScore(2, scoringPlayer, hole) || 0);
          const stroke = getScrambleHoleStrokes(pair, opponentPair, sideKey, hole);
          const net = gross ? gross - stroke : 0;
          grossBack += gross;
          netBack += net;

          return (
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
              {stroke > 0 && (
                <span className="pop-star" aria-label="Handicap stroke">
                  *
                </span>
              )}
            </td>
          );
        })}

        <td className="score-total">{`${grossBack || "-"} / ${netBack || "-"}`}</td>
        <td className="score-total">{`${grossFront + grossBack || "-"} / ${netFront + netBack || "-"}`}</td>
      </tr>
    );
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
    const team1Needed = Math.max(0, RACE_TO - weekendScore.team1);
    const team2Needed = Math.max(0, RACE_TO - weekendScore.team2);
    const leadPercent = Math.max(
      0,
      Math.min(100, (weekendScore.team1 / TOTAL_WEEKEND_POINTS) * 100)
    );

    return (
      <div className="rc-page">
        <div className="rc-topline">
          <div className="rc-brand">INTERSTATE INVITATIONAL 2026</div>
          <div className={`rc-live-pill ${connectionStatus === "Live" ? "is-live" : ""}`}>
            {connectionStatus === "Live" ? "● Live" : `● ${connectionStatus}`}
          </div>
        </div>

        <header className="rc-score-header">
          <div className="rc-score-meta improved-score-meta">
            <div className="score-team-card left">
              <div className="score-team-brand">
                <TeamLogo
                  src={TEAM_BRANDING.team1.logo}
                  alt={TEAM_BRANDING.team1.name}
                  size={40}
                />
                <div className="score-team-copy">
                  <span>{TEAM_BRANDING.team1.name}</span>
                  <small>{TEAM_BRANDING.team1.subtitle}</small>
                </div>
              </div>
              <div className="score-team-winline">
                <strong>{formatPoints(team1Needed)}</strong>
                <span>more to win</span>
              </div>
            </div>

            <div className="score-race-card">
              <strong>Race to {RACE_TO}</strong>
              <span>{formatPoints(weekendScore.team1 + weekendScore.team2)} / {TOTAL_WEEKEND_POINTS} points claimed</span>
            </div>

            <div className="score-team-card right">
              <div className="score-team-copy right-align">
                <span>{TEAM_BRANDING.team2.name}</span>
                <small>{TEAM_BRANDING.team2.subtitle}</small>
              </div>
              <div className="score-team-winline">
                <strong>{formatPoints(team2Needed)}</strong>
                <span>more to win</span>
              </div>
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
            <span>Front 9: {getSegmentWinnerLabel(summary.front)}</span>
            <span>Back 9: {getSegmentWinnerLabel(summary.back)}</span>
            <span>18 Holes: {getSegmentWinnerLabel(summary.full)}</span>
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
              <p style={{ marginTop: "8px", letterSpacing: "normal", textTransform: "none" }}>
                Scoring: Front 9 = 1 point · Back 9 = 1 point · 18 Holes = 2 points
              </p>
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
          <div className="rc-roster-card red branded-roster-card">
            <div className="roster-brand-head">
              <TeamLogo
                src={TEAM_BRANDING.team1.logo}
                alt={TEAM_BRANDING.team1.name}
                size={52}
              />
              <div>
                <p>{TEAM_BRANDING.team1.name}</p>
                {TEAM_BRANDING.team1.subtitle && (
                  <small>{TEAM_BRANDING.team1.subtitle}</small>
                )}
                <strong>{formatPoints(weekendScore.team1)}</strong>
              </div>
            </div>

            <span>
              Captain: {TEAM_BRANDING.team1.captain}
              <br />
              {LOCKED_TEAM_1.join(" · ")}
            </span>
          </div>

          <div className="rc-roster-card blue branded-roster-card">
            <div className="roster-brand-head">
              <TeamLogo
                src={TEAM_BRANDING.team2.logo}
                alt={TEAM_BRANDING.team2.name}
                size={52}
              />
              <div>
                <p>{TEAM_BRANDING.team2.name}</p>
                {TEAM_BRANDING.team2.subtitle && (
                  <small>{TEAM_BRANDING.team2.subtitle}</small>
                )}
                <strong>{formatPoints(weekendScore.team2)}</strong>
              </div>
            </div>

            <span>
              Captain: {TEAM_BRANDING.team2.captain}
              <br />
              {LOCKED_TEAM_2.join(" · ")}
            </span>
          </div>
        </section>
      </>
    );
  }

  function EnterScoresView() {
    const round = rounds.find((item) => item.id === selectedRoundId);
    const course = getCourse(selectedRoundId);
    const scoringPlayer = getScoringPlayerForRound(selectedRoundId, selectedPlayer);
    const scoreLabel = getScoreEntryLabel(selectedRoundId, selectedPlayer);

    const frontTotal = getPlayerTotal(selectedRoundId, scoringPlayer, 1, 9);
    const backTotal = getPlayerTotal(selectedRoundId, scoringPlayer, 10, 18);
    const netFront = selectedRoundId === 1
      ? getPlayerTotal(selectedRoundId, scoringPlayer, 1, 9, true)
      : frontTotal;
    const netBack = selectedRoundId === 1
      ? getPlayerTotal(selectedRoundId, scoringPlayer, 10, 18, true)
      : backTotal;
    const showNet = selectedRoundId === 1;

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
              const pops =
                selectedRoundId === 1
                  ? getStablefordHoleStrokes(scoringPlayer, hole)
                  : 0;
              const netScore =
                selectedRoundId === 1
                  ? getNetScore(selectedRoundId, scoringPlayer, hole)
                  : "";

              return (
                <div className="hole-row" key={hole}>
                  <div>
                    <strong>Hole {hole}</strong>
                    <span>
                      Par {par} · HCP {course.hcp[hole - 1]}
                      {selectedRoundId === 1 && pops > 0 ? ` · ${pops} stroke${pops > 1 ? "s" : ""}` : ""}
                      {selectedRoundId === 1 && netScore ? ` · Net ${netScore}` : ""}
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
            Stableford uses full individual handicap. Singles use handicap difference only. Scramble uses 25% of combined pair handicap and applies only the difference.
          </p>
        </section>

        <section className="main-card">
          <div className="section-title">
            <div>
              <p>Teams</p>
              <h2>Locked 4-Person Teams</h2>
            </div>
          </div>

          <div className="setup-grid">
            <div className="setup-round">
              <h3>{TEAM_BRANDING.team1.name}</h3>
              <span>Captain: {TEAM_BRANDING.team1.captain}</span>
              <div className="players-grid readonly-grid">
                {LOCKED_TEAM_1.map((player) => (
                  <div key={player} className="readonly-player">
                    {player}
                  </div>
                ))}
              </div>
            </div>

            <div className="setup-round">
              <h3>{TEAM_BRANDING.team2.name}</h3>
              <span>Captain: {TEAM_BRANDING.team2.captain}</span>
              <div className="players-grid readonly-grid">
                {LOCKED_TEAM_2.map((player) => (
                  <div key={player} className="readonly-player">
                    {player}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="main-card">
          <div className="section-title">
            <div>
              <p>Setup</p>
              <h2>Round Matchups</h2>
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
                        : round.id === 2
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
                          <option key={playerOption} value={playerOption}>
                            {playerOption}
                          </option>
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
    const course = getCourse(matchup.roundId);
    const summary = getMatchupSummary(matchup);

    const outPar = course.par.slice(0, 9).reduce((sum, par) => sum + par, 0);
    const inPar = course.par.slice(9, 18).reduce((sum, par) => sum + par, 0);

    const singlesInfo =
      matchup.type === "singles"
        ? getSinglesMatchStrokeInfo(matchup.sideAPlayers[0], matchup.sideBPlayers[0])
        : null;

    return (
      <>
        <div className="detail-actions">
          <button onClick={() => setSelectedMatchupId(null)}>← Back</button>
          <button onClick={() => resetRound(matchup.roundId)}>Reset Round</button>
        </div>

        <section className="match-detail-shell">
          <div className="match-detail-team team1">
            <div className="match-detail-team-head">
              <TeamLogo src={TEAM_BRANDING.team1.logo} alt={TEAM_BRANDING.team1.name} size={34} />
              <div>
                <p>{matchup.sideAName}</p>
                <h2>{matchup.sideAPlayers.join(" / ")}</h2>
              </div>
            </div>
          </div>

          <div className="match-detail-center">
            <p>{round.name} · {round.format}</p>
            <strong>{summary.status}</strong>
            <div className="match-detail-score-row">
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

          <div className="match-detail-team team2">
            <div className="match-detail-team-head right">
              <div>
                <p>{matchup.sideBName}</p>
                <h2>{matchup.sideBPlayers.join(" / ")}</h2>
              </div>
              <TeamLogo src={TEAM_BRANDING.team2.logo} alt={TEAM_BRANDING.team2.name} size={34} />
            </div>
          </div>
        </section>

        {matchup.type === "scramble" && (
          <>
            <section className="main-card" style={{ marginTop: "14px" }}>
              <div className="section-title">
                <div>
                  <p>Scramble Rules</p>
                  <h2>Handicap</h2>
                </div>
              </div>

              {(() => {
                const info1 = getScrambleMatchStrokeInfo(teams[2][0], teams[2][2]);
                const info2 = getScrambleMatchStrokeInfo(teams[2][1], teams[2][3]);

                return (
                  <>
                    <p>
                      Match 1 handicap — Team 1 Pair 1: <strong>{info1.teamAHcp}</strong> · Team 2 Pair 1: <strong>{info1.teamBHcp}</strong> ·
                      Strokes applied: <strong>{info1.strokes}</strong> to{" "}
                      <strong>
                        {info1.receiver === "A"
                          ? "Team 1 Pair 1"
                          : info1.receiver === "B"
                          ? "Team 2 Pair 1"
                          : "Neither Side"}
                      </strong>
                    </p>

                    <p style={{ marginTop: "10px" }}>
                      Match 2 handicap — Team 1 Pair 2: <strong>{info2.teamAHcp}</strong> · Team 2 Pair 2: <strong>{info2.teamBHcp}</strong> ·
                      Strokes applied: <strong>{info2.strokes}</strong> to{" "}
                      <strong>
                        {info2.receiver === "A"
                          ? "Team 1 Pair 2"
                          : info2.receiver === "B"
                          ? "Team 2 Pair 2"
                          : "Neither Side"}
                      </strong>
                    </p>
                  </>
                );
              })()}
            </section>

            <section className="main-card" style={{ marginTop: "14px" }}>
              <div className="section-title">
                <div>
                  <p>Scramble Drives</p>
                  <h2>Drive Tracker</h2>
                </div>
              </div>

              <div className="players-grid">
                {[
                  { pairIndex: "0", side: "a", player: teams[2][0][0] },
                  { pairIndex: "0", side: "b", player: teams[2][0][1] },
                  { pairIndex: "1", side: "a", player: teams[2][1][0] },
                  { pairIndex: "1", side: "b", player: teams[2][1][1] },
                ].map(({ pairIndex, side, player }) => {
                  const value = scrambleDriveCounts[pairIndex]?.[side] || 0;
                  const complete = value >= 6;

                  return (
                    <div
                      key={`${pairIndex}-${side}-${player}`}
                      className="handicap-box"
                      style={{
                        border: complete ? "2px solid #0c6a36" : "2px solid rgba(163,22,45,.25)",
                        borderRadius: "12px",
                        padding: "12px",
                        background: complete ? "rgba(12,106,54,.08)" : "rgba(163,22,45,.05)"
                      }}
                    >
                      <label>{player} drives used</label>
                      <input
                        type="number"
                        min="0"
                        max="18"
                        value={value}
                        onChange={(event) => updateDriveCount(pairIndex, side, event.target.value)}
                      />
                      <p
                        style={{
                          margin: "8px 0 0",
                          fontWeight: 800,
                          color: complete ? "#0c6a36" : "#a3162d"
                        }}
                      >
                        {complete ? "Met minimum ✓" : `Needs ${Math.max(0, 6 - Number(value))} more`}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {matchup.type === "singles" && singlesInfo && (
          <section className="main-card" style={{ marginTop: "14px" }}>
            <div className="section-title">
              <div>
                <p>Singles Rules</p>
                <h2>Stroke Difference</h2>
              </div>
            </div>
            <p>
              Strokes applied: <strong>{singlesInfo.strokes}</strong> to <strong>{singlesInfo.receiver ?? "Neither Player"}</strong>
            </p>
          </section>
        )}

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
                    {renderScrambleRow(matchup.sideAPlayers, matchup.sideBPlayers, "A")}
                    {renderScrambleRow(matchup.sideBPlayers, matchup.sideAPlayers, "B")}
                  </>
                )}

                {matchup.type === "singles" && (
                  <>
                    {renderScorecardRow(3, matchup.sideAPlayers[0], { opponent: matchup.sideBPlayers[0] })}
                    {renderScorecardRow(3, matchup.sideBPlayers[0], { opponent: matchup.sideAPlayers[0] })}
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
