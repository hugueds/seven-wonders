import { describe, expect, it } from "vitest";
import { player, science, score, standings, parseState, cardTotals, wonderStageLimit, type Card, type Game } from "./game";

describe("science", () => {
  it("scores no symbols, sets, and uneven counts", () => {
    expect(science(0, 0, 0).points).toBe(0);
    expect(science(1, 1, 1).points).toBe(10);
    expect(science(3, 2, 1).points).toBe(21);
    expect(science(2, 2, 2).points).toBe(26);
  });
  it("chooses sets or repeated symbols to maximize wildcard points", () => {
    expect(science(1, 1, 0, 1).points).toBe(10);
    expect(science(4, 0, 0, 1).points).toBe(25);
    expect(science(0, 0, 0, 2).points).toBe(4);
    expect(science(1, 1, 1, 2).points).toBe(18);
  });
  it("matches an exhaustive independent allocation for multiple wildcards", () => {
    for (let a = 0; a < 4; a++)
      for (let b = 0; b < 4; b++)
        for (let c = 0; c < 4; c++) {
          let states = [[a, b, c]];
          for (let n = 0; n < 3; n++)
            states = states.flatMap((s) =>
              s.map((_, i) => s.map((v, j) => v + Number(i === j))),
            );
          const points = states.map(
            (s) => s.reduce((t, v) => t + v * v, 0) + 7 * Math.min(...s),
          );
          expect(science(a, b, c, 3).points).toBe(Math.max(...points));
        }
  });
});
describe("scores and results", () => {
  it("rounds coins down and includes military losses", () => {
    const p = { ...player(0), coins: 8, military: -6, civilian: 10 };
    expect(score(p)).toEqual({ scientific: 0, treasury: 2, total: 6 });
  });
  it("uses remaining coins to break a tie on points", () => {
    const a = { ...player(0), civilian: 10, coins: 1 };
    const b = { ...player(1), civilian: 10, coins: 2 };
    const result = standings([a, b]);
    expect(result[0].player.id).toBe(b.id);
    expect(result.filter((r) => r.winner)).toHaveLength(1);
  });
  it("shares victory when points and coins are equal", () => {
    const result = standings([
      player(0),
      player(1),
      { ...player(2), military: -1 },
    ]);
    expect(result.map((r) => r.rank)).toEqual([1, 1, 3]);
    expect(result.filter((r) => r.winner)).toHaveLength(2);
  });
});
describe("card scoring edge cases", () => {
  const players = [player(0), player(1), player(2)];
  const card = (id: string, color: string, effect?: Card["effect"], extras: Partial<Card> = {}): Card => ({ id, name: id, age: 3, color, effect, ...extras });
  const game = (cards: Record<string, Card[]>, extras: Partial<Game> = {}): Game => ({ ...baseGame(), cards, ...extras });
  const baseGame = (): Game => { const localPlayers = players.map(p=>({...p})); return { id: "cards", mode: "cards", players: localPlayers, seats: localPlayers.map(p=>p.id) }; };

  it("wraps both ends of the seating order for neighbor guilds", () => {
    const g = game({
      [players[0].id]: [card("Workers Guild", "purple", "guildBrown")],
      [players[1].id]: [card("brown-left", "brown")],
      [players[2].id]: [card("brown-right-1", "brown"), card("brown-right-2", "brown")],
    });
    expect(cardTotals(g)[players[0].id].guild).toBe(3);
  });
  it("counts own and both neighbors' brown and gray cards for commercial coin effects", () => {
    const g = game({
      [players[0].id]: [card("Vineyard", "yellow", "coinsAllBrown"), card("own-brown", "brown")],
      [players[1].id]: [card("left-brown", "brown")],
      [players[2].id]: [card("right-gray", "gray")],
    });
    expect(cardTotals(g)[players[0].id].coins).toBe(2);
  });
  it("scores Arena and Builders Guild from the entered Wonder stages", () => {
    const g = game({
      [players[0].id]: [card("Arena", "yellow", "vpStages"), card("Builders Guild", "purple", "guildStages")],
    }, { wonderStages: { [players[0].id]: 2, [players[1].id]: 1, [players[2].id]: 3 } });
    expect(cardTotals(g)[players[0].id].commercial).toBe(2);
    expect(cardTotals(g)[players[0].id].guild).toBe(4);
  });
  it("requires every stage for Decorators Guild, including four-stage Giza Night", () => {
    const g = game({ [players[0].id]: [card("Decorators Guild", "purple", "guildAllStages")] }, { wonderStages: { [players[0].id]: 3 } });
    g.players[0].city = "Giza";
    g.players[0].side = "Night";
    expect(wonderStageLimit("Giza", "Night")).toBe(4);
    expect(cardTotals(g)[players[0].id].guild).toBe(0);
    g.wonderStages![players[0].id] = 4;
    expect(cardTotals(g)[players[0].id].guild).toBe(7);
  });
  it("adds science from cards and an enabled Wonder symbol, while defaulting it off", () => {
    const noBonus = game({});
    expect(cardTotals(noBonus)[players[0].id].wildcards).toBe(0);
    const g = game({ [players[0].id]: [card("compass", "green", undefined, { science: "compass" }), card("Scientists Guild", "purple", "guildChoiceScience")] });
    expect(cardTotals(g)[players[0].id].compass).toBe(1);
    expect(cardTotals(g)[players[0].id].wildcards).toBe(1);
    expect(cardTotals(g)[players[0].id].scientific).toBe(4);
    g.wonderScience = { [players[0].id]: true };
    expect(cardTotals(g)[players[0].id].wildcards).toBe(2);
    expect(cardTotals(g)[players[0].id].scientific).toBe(10);
  });
  it("includes card shields and manually entered Wonder shields", () => {
    const g = game({ [players[0].id]: [card("red", "red", undefined, { shields: 2 })] }, { wonderShields: { [players[0].id]: 1 } });
    expect(cardTotals(g)[players[0].id].military).toBe(3);
  });
});
describe("saved games", () => {
  const game = { id: "game", players: [player(0), player(1), player(2)] };
  it("restores active games and completed snapshots", () => {
    const s = {
      version: 1,
      active: game,
      history: [{ ...game, completedAt: "2026-10-17T12:00:00Z" }],
    };
    const parsed = parseState(JSON.stringify(s));
    expect(parsed.version).toBe(2);
    expect(parsed.active).toMatchObject({ ...game, mode: "manual", cards: {}, wonderStages: {}, wonderScience: Object.fromEntries(game.players.map(p=>[p.id,false])), wonderShields: {}, seats: game.players.map(p=>p.id) });
    expect(parsed.history[0]).toMatchObject({ ...game, mode: "manual", completedAt: "2026-10-17T12:00:00Z", cards: {}, wonderStages: {}, wonderScience: Object.fromEntries(game.players.map(p=>[p.id,false])), wonderShields: {}, seats: game.players.map(p=>p.id) });
  });
  it("rejects malformed saves and unsupported versions", () => {
    for (const raw of [
      "no json",
      "{}",
      '{"version":2}',
      JSON.stringify({
        version: 1,
        active: { ...game, players: [{ ...player(0), coins: -1 }] },
        history: [],
      }),
    ])
      expect(() => parseState(raw)).toThrow();
  });
});
