export const colors = [
  "#b65a3a",
  "#377c82",
  "#917441",
  "#776291",
  "#507757",
  "#b16b87",
  "#516392",
];
export const wonders = [
  "Alexandria",
  "Babylon",
  "Ephesus",
  "Giza",
  "Halicarnassus",
  "Olympia",
  "Rhodes",
];
export const fields = [
  "wonder",
  "civilian",
  "commercial",
  "guild",
  "military",
  "coins",
  "compass",
  "tablet",
  "gear",
  "wildcards",
] as const;
export type Field = (typeof fields)[number];
export type Player = {
  id: string;
  name: string;
  color: string;
  city: string;
  side: "Day" | "Night";
} & Record<Field, number>;
export type Game = { id: string; players: Player[]; completedAt?: string };
export type State = { version: 1; active: Game | null; history: Game[] };
export function player(index: number): Player {
  return {
    id: crypto.randomUUID(),
    name: `Player ${index + 1}`,
    color: colors[index % colors.length],
    city: "",
    side: "Day",
    ...Object.fromEntries(fields.map((f) => [f, 0])),
  } as Player;
}
export function science(
  compass: number,
  tablet: number,
  gear: number,
  wildcards = 0,
) {
  let best = { points: -1, counts: [compass, tablet, gear], sets: 0 };
  for (let a = 0; a <= wildcards; a++)
    for (let b = 0; b <= wildcards - a; b++) {
      const counts = [compass + a, tablet + b, gear + wildcards - a - b];
      const sets = Math.min(...counts);
      const points = counts.reduce((sum, n) => sum + n * n, 0) + sets * 7;
      if (points > best.points) best = { points, counts, sets };
    }
  return best;
}
export function score(p: Player) {
  const scientific = science(p.compass, p.tablet, p.gear, p.wildcards).points;
  return {
    scientific,
    treasury: Math.floor(p.coins / 3),
    total:
      p.wonder +
      p.civilian +
      p.commercial +
      p.guild +
      p.military +
      scientific +
      Math.floor(p.coins / 3),
  };
}
export function standings(players: Player[]) {
  const sorted = [...players].sort(
    (a, b) => score(b).total - score(a).total || b.coins - a.coins,
  );
  return sorted.map((p, i) => ({
    player: p,
    rank:
      sorted.findIndex(
        (other) =>
          score(other).total === score(p).total && other.coins === p.coins,
      ) + 1,
    winner:
      score(p).total === score(sorted[0]).total && p.coins === sorted[0].coins,
    position: i,
  }));
}
export const emptyState: State = { version: 1, active: null, history: [] };
const validPlayer = (p: unknown): p is Player => {
  if (!p || typeof p !== "object") return false;
  const v = p as Player;
  return (
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    /^#[0-9a-f]{6}$/i.test(v.color) &&
    typeof v.city === "string" &&
    ["Day", "Night"].includes(v.side) &&
    fields.every(
      (f) =>
        Number.isSafeInteger(v[f]) &&
        v[f] >= (f === "military" ? -100 : 0) &&
        v[f] <= (f === "wildcards" ? 10 : 999),
    )
  );
};
const validGame = (g: unknown): g is Game => {
  if (!g || typeof g !== "object") return false;
  const v = g as Game;
  return (
    typeof v.id === "string" &&
    Array.isArray(v.players) &&
    v.players.length >= 3 &&
    v.players.length <= 7 &&
    v.players.every(validPlayer) &&
    new Set(v.players.map((p) => p.id)).size === v.players.length &&
    (v.completedAt === undefined ||
      (typeof v.completedAt === "string" &&
        Number.isFinite(Date.parse(v.completedAt))))
  );
};
export function parseState(raw: string): State {
  const s = JSON.parse(raw) as State;
  if (
    !s ||
    s.version !== 1 ||
    !(s.active === null || validGame(s.active)) ||
    !Array.isArray(s.history) ||
    !s.history.every((g) => validGame(g) && !!g.completedAt)
  )
    throw new Error("Invalid saved game");
  return s;
}
