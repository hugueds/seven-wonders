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
export function wonderStageLimit(city: string, side: Player["side"]) {
  if (city === "Giza" && side === "Night") return 4;
  if (side === "Night" && ["Babylon", "Rhodes"].includes(city)) return 2;
  return 3;
}
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
export type Card = { id: string; name: string; age: 1 | 2 | 3; color: string; points?: number; shields?: number; science?: "compass" | "tablet" | "gear" | "wildcards"; effect?: "coins3" | "coinsBrown" | "coinsGray" | "coinsAllBrown" | "coinsAllGray" | "vpYellow" | "vpBrown" | "vpGray" | "vpRed" | "vpStages" | "guildBrown" | "guildGray" | "guildBlue" | "guildYellow" | "guildRed" | "guildGreen" | "guildStages" | "guildAllStages" | "guildChoiceScience" | "guildShipowner" | "guildCoins" };
export type Game = { id: string; players: Player[]; completedAt?: string; mode?: "manual" | "cards"; seats?: string[]; cards?: Record<string, Card[]>; wonderStages?: Record<string, number>; wonderScience?: Record<string, boolean>; wonderShields?: Record<string, number> };
export type State = { version: 2; active: Game | null; history: Game[] };
export const cardCatalog: Card[] = [
  ...[["Lumber Yard",1,"brown"],["Stone Pit",1,"brown"],["Clay Pool",1,"brown"],["Ore Vein",1,"brown"],["Tree Farm",1,"brown"],["Excavation",1,"brown"],["Clay Pit",1,"brown"],["Timber Yard",1,"brown"],["Forest Cave",1,"brown"],["Loom",1,"gray"],["Glassworks",1,"gray"],["Press",1,"gray"]].map(([name,age,color])=>({id:String(name),name:String(name),age:Number(age) as 1,color:String(color)})),
  ...[["Sawmill",2,"brown"],["Quarry",2,"brown"],["Brickyard",2,"brown"],["Foundry",2,"brown"],["Loom",2,"gray"],["Glassworks",2,"gray"],["Press",2,"gray"]].map(([name,age,color])=>({id:`${name}-${age}`,name:String(name),age:Number(age) as 2,color:String(color)})),
  ...[["Baths",1,3],["Altar",1,3],["Theater",1,3],["Statue",2,4],["Aqueduct",2,5],["Temple",2,4],["Courthouse",2,4],["Pantheon",3,7],["Gardens",3,5],["Town Hall",3,6],["Palace",3,8],["Senate",3,6]].map(([name,age,points])=>({id:String(name),name:String(name),age:Number(age) as 1|2|3,color:"blue",points:Number(points)})),
  ...[["Stockade",1,1],["Barracks",1,1],["Guard Tower",1,1],["Stables",2,2],["Archery Range",2,2],["Training Ground",2,2],["Walls",2,2],["Horse Breeders",2,2],["Castrum",3,3],["Fortifications",3,3],["Circus",3,3],["Arsenal",3,3],["Siege Workshop",3,3]].map(([name,age,shields])=>({id:String(name),name:String(name),age:Number(age) as 1|2|3,color:"red",shields:Number(shields)})),
  ...[["Apothecary",1,"compass"],["Workshop",1,"gear"],["Scriptorium",1,"tablet"],["Dispensary",2,"compass"],["Laboratory",2,"gear"],["Library",2,"tablet"],["School",2,"tablet"],["Lodge",3,"compass"],["Academy",3,"compass"],["Observatory",3,"gear"],["Study",3,"gear"],["University",3,"tablet"]].map(([name,age,science])=>({id:String(name),name:String(name),age:Number(age) as 1|2|3,color:"green",science:String(science) as Card["science"]})),
  {id:"Tavern",name:"Tavern",age:1,color:"yellow",effect:"coins3"},{id:"Vineyard",name:"Vineyard",age:2,color:"yellow",effect:"coinsAllBrown"},{id:"Bazar",name:"Bazar",age:2,color:"yellow",effect:"coinsAllGray"},
  ...[["Lighthouse", "vpYellow"],["Haven","vpBrown"],["Chamber of Commerce","vpGray"],["Ludus","vpRed"],["Arena","vpStages"]].map(([name,effect])=>({id:name,name,age:3 as const,color:"yellow",effect:effect as Card["effect"]})),
  ...[["Workers Guild","guildBrown"],["Craftsmens Guild","guildGray"],["Magistrates Guild","guildBlue"],["Traders Guild","guildYellow"],["Builders Guild","guildStages"],["Spies Guild","guildRed"],["Philosophers Guild","guildGreen"],["Decorators Guild","guildAllStages"],["Scientists Guild","guildChoiceScience"],["Shipowners Guild","guildShipowner"]].map(([name,effect])=>({id:name,name,age:3 as const,color:"purple",effect:effect as Card["effect"]})),
];
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
export function cardTotals(game: Game) {
  const players = game.players;
  const seats = game.seats ?? players.map((p) => p.id);
  const byId = new Map(players.map((p) => [p.id, p]));
  const cards = game.cards ?? {};
  return Object.fromEntries(players.map((p) => {
    const own = cards[p.id] ?? [];
    const idx = seats.indexOf(p.id);
    const neighbors = [byId.get(seats[(idx + seats.length - 1) % seats.length])!, byId.get(seats[(idx + 1) % seats.length])!];
    const near = neighbors.flatMap(n => cards[n.id] ?? []);
    let civilian = 0, commercial = 0, guild = 0, military = game.wonderShields?.[p.id] ?? 0, compass = p.compass, tablet = p.tablet, gear = p.gear, wildcards = p.wildcards, coins = p.coins;
    own.forEach(c => {
      if (c.points) civilian += c.points;
      if (c.shields) military += c.shields;
      if (c.science === "compass") compass++;
      if (c.science === "tablet") tablet++;
      if (c.science === "gear") gear++;
      if (c.science === "wildcards") wildcards++;
      switch (c.effect) {
        case "coins3": coins += 5; break;
        case "coinsAllBrown": coins += own.filter(x=>x.color==="brown").length + near.filter(x=>x.color==="brown").length; break;
        case "coinsAllGray": coins += own.filter(x=>x.color==="gray").length + near.filter(x=>x.color==="gray").length; break;
        case "vpYellow": commercial += own.filter(x=>x.color==="yellow").length; break;
        case "vpBrown": commercial += own.filter(x=>x.color==="brown").length; break;
        case "vpGray": commercial += 2*own.filter(x=>x.color==="gray").length; break;
        case "vpRed": commercial += own.filter(x=>x.color==="red").length; break;
        case "vpStages": commercial += game.wonderStages?.[p.id] ?? 0; break;
        case "guildBrown": guild += near.filter(x=>x.color==="brown").length; break;
        case "guildGray": guild += 2*near.filter(x=>x.color==="gray").length; break;
        case "guildBlue": guild += near.filter(x=>x.color==="blue").length; break;
        case "guildYellow": guild += near.filter(x=>x.color==="yellow").length; break;
        case "guildRed": guild += near.filter(x=>x.color==="red").length; break;
        case "guildGreen": guild += near.filter(x=>x.color==="green").length; break;
        case "guildStages": guild += (game.wonderStages?.[neighbors[0].id] ?? 0) + (game.wonderStages?.[neighbors[1].id] ?? 0); break;
        case "guildAllStages": guild += (game.wonderStages?.[p.id] ?? 0) >= wonderStageLimit(p.city, p.side) ? 7 : 0; break;
        case "guildChoiceScience": wildcards++; break;
        case "guildShipowner": guild += own.filter(x=>["brown","gray","purple"].includes(x.color)).length; break;
        case "guildCoins": guild += Math.floor(coins/3); break;
      }
    });
    if (game.wonderScience?.[p.id] ?? false) wildcards++;
    const scientific = science(compass, tablet, gear, wildcards).points;
    const automatic = civilian + commercial + guild + military + scientific + Math.floor(coins / 3);
    return [p.id, { civilian, commercial, guild, military, compass, tablet, gear, wildcards, coins, scientific, automatic }];
  }));
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
export const emptyState: State = { version: 2, active: null, history: [] };
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
    (v.mode === undefined || ["manual", "cards"].includes(v.mode)) &&
    (v.seats === undefined || (Array.isArray(v.seats) && v.seats.length === v.players.length && new Set(v.seats).size === v.players.length && v.seats.every((id) => v.players.some((p) => p.id === id)))) &&
    (v.cards === undefined || (typeof v.cards === "object" && Object.entries(v.cards).every(([id, cards]) => v.players.some((p) => p.id === id) && Array.isArray(cards) && cards.every((c) => !!c && typeof c.id === "string" && typeof c.name === "string" && [1, 2, 3].includes(c.age) && typeof c.color === "string")))) &&
    (v.wonderStages === undefined || (typeof v.wonderStages === "object" && Object.entries(v.wonderStages).every(([id, n]) => v.players.some((p) => p.id === id) && Number.isSafeInteger(n) && Number(n) >= 0 && Number(n) <= 10))) &&
    (v.wonderScience === undefined || (typeof v.wonderScience === "object" && Object.entries(v.wonderScience).every(([id, enabled]) => v.players.some((p) => p.id === id) && typeof enabled === "boolean"))) &&
    (v.wonderShields === undefined || (typeof v.wonderShields === "object" && Object.entries(v.wonderShields).every(([id, n]) => v.players.some((p) => p.id === id) && Number.isSafeInteger(n) && Number(n) >= 0 && Number(n) <= 20))) &&
    new Set(v.players.map((p) => p.id)).size === v.players.length &&
    (v.completedAt === undefined ||
      (typeof v.completedAt === "string" &&
        Number.isFinite(Date.parse(v.completedAt))))
  );
};
export function parseState(raw: string): State {
  const s = JSON.parse(raw) as { version: number; active: Game | null; history: Game[] };
  if (
    !s ||
    ![1, 2].includes(s.version) ||
    !(s.active === null || validGame(s.active)) ||
    !Array.isArray(s.history) ||
    !s.history.every((g) => validGame(g) && !!g.completedAt)
  )
    throw new Error("Invalid saved game");
  const normalizeGame = (g: Game): Game => ({
    mode: "manual",
    ...g,
    seats: g.seats ?? g.players.map((p) => p.id),
    cards: g.cards ?? {},
    wonderStages: g.wonderStages ?? {},
    wonderScience: Object.fromEntries(g.players.map((p) => [p.id, g.wonderScience?.[p.id] ?? false])),
    wonderShields: g.wonderShields ?? {},
  });
  return {
    version: 2,
    active: s.active ? normalizeGame(s.active) : null,
    history: s.history.map(normalizeGame),
  };
}
