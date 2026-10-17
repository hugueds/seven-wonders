import { describe, expect, it } from "vitest";
import { player, science, score, standings, parseState } from "./game";

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
describe("saved games", () => {
  const game = { id: "game", players: [player(0), player(1), player(2)] };
  it("restores active games and completed snapshots", () => {
    const s = {
      version: 1,
      active: game,
      history: [{ ...game, completedAt: "2026-10-17T12:00:00Z" }],
    };
    expect(parseState(JSON.stringify(s))).toEqual(s);
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
