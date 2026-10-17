import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rulesText from "../7-wonders-2nd-edition-rules.md?raw";
import {
  wonders,
  player,
  science,
  score,
  standings,
  emptyState,
  parseState,
  type State,
  type Game,
  type Player,
  type Field,
} from "./game";
import "./styles.css";

const STORAGE = "seven-wonders-companion-v1";
function readSaved(): { state: State; warning: string } {
  try {
    const raw = localStorage.getItem(STORAGE);
    return { state: raw ? parseState(raw) : emptyState, warning: "" };
  } catch {
    return {
      state: emptyState,
      warning:
        "Saved games could not be read. You can still use the companion, but your previous data may be unavailable.",
    };
  }
}
const initial = readSaved();
const categories: { key: Field; label: string; hint: string; color: string }[] =
  [
    {
      key: "wonder",
      label: "Wonder",
      hint: "Points from completed stages",
      color: "#9a7946",
    },
    {
      key: "civilian",
      label: "Civilian",
      hint: "Blue card points",
      color: "#3d739f",
    },
    {
      key: "commercial",
      label: "Commercial",
      hint: "Yellow card points, excluding coins",
      color: "#ab851e",
    },
    {
      key: "guild",
      label: "Guilds",
      hint: "Purple card points, excluding science",
      color: "#876594",
    },
    {
      key: "military",
      label: "Military",
      hint: "Sum of victory and defeat tokens",
      color: "#ae4d45",
    },
    {
      key: "coins",
      label: "Treasury",
      hint: "Enter coins • every 3 coins = 1 point",
      color: "#ac852b",
    },
  ];
function NumberInput({
  value,
  onChange,
  label,
  min = 0,
  max = 999,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
  min?: number;
  max?: number;
}) {
  const [draft, setDraft] = useState(String(value));
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {
    setDraft(String(value));
    setInvalid(false);
  }, [value]);
  return (
    <input
      className="number"
      type="number"
      inputMode={min < 0 ? "text" : "numeric"}
      min={min}
      max={max}
      step="1"
      aria-label={label}
      aria-invalid={invalid}
      title={`Whole number from ${min} to ${max}`}
      value={draft}
      onChange={(e) => {
        const next = e.target.value;
        setDraft(next);
        const n = Number(next);
        const valid =
          next.trim() !== "" && Number.isInteger(n) && n >= min && n <= max;
        setInvalid(!valid);
        if (valid) onChange(n);
      }}
      onBlur={() => {
        setDraft(String(value));
        setInvalid(false);
      }}
    />
  );
}
function PlayerMark({ p }: { p: Player }) {
  return (
    <span
      className="player-mark"
      style={{ background: p.color }}
      aria-hidden="true"
    >
      {p.name.slice(0, 1).toUpperCase()}
    </span>
  );
}
function Results({ game }: { game: Game }) {
  return (
    <div className="results-list">
      {standings(game.players).map(({ player: p, rank, winner }) => (
        <div className={`result ${winner ? "winning" : ""}`} key={p.id}>
          <span className="rank">{rank.toString().padStart(2, "0")}</span>
          <PlayerMark p={p} />
          <div className="result-name">
            <strong>{p.name}</strong>
            <small>
              {[p.city, p.city ? p.side : "", winner ? "Winner" : ""]
                .filter(Boolean)
                .join(" · ") || "City builder"}
            </small>
          </div>
          <strong className="result-total">
            {score(p).total}
            <small>points</small>
          </strong>
        </div>
      ))}
    </div>
  );
}
const sections = rulesText
  .split(/\n(?=## )/)
  .map((text, i) => ({
    id: `rules-${i}`,
    title: i === 0 ? "Overview" : text.match(/^## (.*)/)?.[1] || "Rules",
    text,
  }));
function Rules() {
  const [query, setQuery] = useState("");
  const matches = sections.filter((s) =>
    s.text.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">A little help at the table</span>
          <h1>The rules, within reach.</h1>
          <p>Find an answer and get back to building your civilization.</p>
        </div>
        <span className="edition">BASE GAME · 2ND EDITION</span>
      </div>
      <div className="rules-layout">
        <aside className="panel rules-nav">
          <label className="search-label" htmlFor="rules-search">
            Search the rules
          </label>
          <div className="search">
            <span aria-hidden="true">⌕</span>
            <input
              id="rules-search"
              type="search"
              placeholder="Science, trading, ties…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <nav aria-label="Rule sections">
            {matches.map((s) => (
              <a href={`#${s.id}`} key={s.id}>
                {s.title}
                <span aria-hidden="true">↗</span>
              </a>
            ))}
          </nav>
          <div className="rule-note">
            A quick reference for your table.
            <br />
            <a
              href="https://www.rprod.com/en/games/7-wonders"
              target="_blank"
              rel="noreferrer"
            >
              Official rules & game aids ↗
            </a>
          </div>
        </aside>
        <article className="panel rule-content" aria-label="Rules reference">
          {!matches.length ? (
            <div className="empty">
              <h2>No matching rules</h2>
              <p>Try a shorter phrase such as “coins” or “Wonder”.</p>
              <button onClick={() => setQuery("")}>Clear search</button>
            </div>
          ) : (
            <>
              <p className="muted small" role="status">
                {query
                  ? `${matches.length} matching sections`
                  : "An original summary of the official rules"}
              </p>
              {matches.map((s) => (
                <section id={s.id} key={s.id}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {s.text}
                  </ReactMarkdown>
                </section>
              ))}
            </>
          )}
        </article>
      </div>
    </>
  );
}
function Breakdown({ game }: { game: Game }) {
  return (
    <div className="table-scroll">
      <table className="breakdown">
        <caption>Final score breakdown</caption>
        <thead>
          <tr>
            <th>Category</th>
            {game.players.map((p) => (
              <th key={p.id}>{p.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map((c) => (
            <tr key={c.key}>
              <th>
                {c.label}
                {c.key === "coins" && " points"}
              </th>
              {game.players.map((p) => (
                <td key={p.id}>
                  {c.key === "coins" ? score(p).treasury : p[c.key]}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <th>Science</th>
            {game.players.map((p) => (
              <td key={p.id}>{score(p).scientific}</td>
            ))}
          </tr>
          <tr>
            <th>Coins remaining</th>
            {game.players.map((p) => (
              <td key={p.id}>{p.coins}</td>
            ))}
          </tr>
          <tr className="total-row">
            <th>Total</th>
            {game.players.map((p) => (
              <td key={p.id}>{score(p).total}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
function App() {
  const [state, setState] = useState<State>(initial.state);
  const [warning, setWarning] = useState(initial.warning);
  const [tab, setTab] = useState("Scoreboard");
  const [count, setCount] = useState(3);
  const [selected, setSelected] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{
    title: string;
    text: string;
    action: () => void;
  } | null>(null);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(state));
    } catch {
      setWarning(
        "Browser saving is unavailable. Keep this page open to retain your current game.",
      );
    }
  }, [state]);
  const active = state.active;
  function start(players = Array.from({ length: count }, (_, i) => player(i))) {
    setState((s) => ({ ...s, active: { id: crypto.randomUUID(), players } }));
    setTab("Scoreboard");
  }
  function update(id: string, patch: Partial<Player>) {
    setState((s) => ({
      ...s,
      active: s.active
        ? {
            ...s.active,
            players: s.active.players.map((p) =>
              p.id === id ? { ...p, ...patch } : p,
            ),
          }
        : null,
    }));
  }
  function confirm(title: string, text: string, action: () => void) {
    setDialog({ title, text, action });
  }
  function finish() {
    if (!active) return;
    confirm(
      "Finish this game?",
      "Save these scores to your history. Check that all players have entered their final points and coins.",
      () => {
        const finished = structuredClone({
          ...active,
          completedAt: new Date().toISOString(),
        });
        setState((s) => ({
          ...s,
          active: null,
          history: [finished, ...s.history],
        }));
        setSelected(finished.id);
        setTab("History");
      },
    );
  }
  function rematch(game: Game) {
    const action = () =>
      start(
        game.players.map((p, i) => ({
          ...player(i),
          name: p.name,
          color: p.color,
          city: p.city,
          side: p.side,
        })),
      );
    if (active)
      confirm(
        "Replace the current game?",
        "Your unfinished scores will be discarded. Completed games stay in History.",
        action,
      );
    else action();
  }
  const selectedGame = state.history.find((g) => g.id === selected);
  return (
    <>
      <header className="site-header">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setTab("Scoreboard");
          }}
        >
          <span className="brand-icon" aria-hidden="true">
            Ⅶ
          </span>
          <span>
            7 WONDERS<small>THE TABLE COMPANION</small>
          </span>
        </a>
        <nav className="tabs" aria-label="Main navigation">
          {["Rules", "Scoreboard", "History"].map((t) => (
            <button
              key={t}
              aria-current={tab === t ? "page" : undefined}
              className={tab === t ? "active" : ""}
              onClick={() => setTab(t)}
            >
              {t}
              {t === "History" && state.history.length > 0 && (
                <span className="badge">{state.history.length}</span>
              )}
            </button>
          ))}
        </nav>
        <button
          className="fullscreen"
          onClick={async () => {
            try {
              if (document.fullscreenElement) await document.exitFullscreen();
              else await document.documentElement.requestFullscreen();
            } catch {
              setWarning(
                "Fullscreen is unavailable in this browser. You can use the browser’s zoom controls instead.",
              );
            }
          }}
          aria-label="Toggle fullscreen"
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6" /></svg><span>Fullscreen</span>
        </button>
      </header>
      {warning && (
        <div className="notice" role="status">
          {warning}
          <button aria-label="Dismiss message" onClick={() => setWarning("")}>
            ×
          </button>
        </div>
      )}
      <main>
        {tab === "Rules" && <Rules />}
        {tab === "Scoreboard" && (
          <>
            <div className="page-heading">
              <div>
                <span className="eyebrow">Great cities. Good company.</span>
                <h1>Every civilization counts.</h1>
                <p>
                  Your table, your wonders, your final scores. We’ll do the
                  arithmetic.
                </p>
              </div>
              <span className="edition">BASE GAME · 2ND EDITION</span>
            </div>
            {!active ? (
              <div className="welcome panel">
                <div className="temple" aria-hidden="true">
                  <div className="pediment" />
                  <div className="columns">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="steps" />
                </div>
                <span className="eyebrow">Gather your civilizations</span>
                <h2>A place for everyone at the table.</h2>
                <p>
                  Play with your cards and Wonder boards.
                  <br />
                  When it’s time to count, bring your scores here.
                </p>
                <label htmlFor="players-count">Players</label>
                <div
                  className="player-count"
                  role="group"
                  aria-label="Number of players"
                >
                  {[3, 4, 5, 6, 7].map((n) => (
                    <button
                      key={n}
                      aria-pressed={count === n}
                      className={count === n ? "chosen" : ""}
                      onClick={() => setCount(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <button className="primary" onClick={() => start()}>
                  Set up the table <span aria-hidden="true">→</span>
                </button>
                <p className="muted small">
                  Saved automatically in this browser.
                </p>
              </div>
            ) : (
              <>
                <div className="toolbar">
                  <div>
                    <span className="status-dot" /> Game in progress{" "}
                    <span className="muted">
                      · {active.players.length} players
                    </span>
                  </div>
                  <div className="toolbar-actions">
                    <button
                      onClick={() =>
                        confirm(
                          "Start a new table?",
                          "This discards the unfinished game. Completed results stay in History.",
                          () => setState((s) => ({ ...s, active: null })),
                        )
                      }
                    >
                      New game
                    </button>
                    <button className="primary" onClick={finish}>
                      Finish game <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </div>
                <section
                  className="panel score-panel"
                  aria-label="Player scores"
                >
                  <div className="table-scroll">
                    <table className="score-table">
                      <caption className="sr-only">
                        Enter each player’s final score by category
                      </caption>
                      <thead>
                        <tr>
                          <th className="category-heading">
                            <span className="eyebrow">THE SCORE SHEET</span>
                            <h2>Build your legacy.</h2>
                            <p>
                              Enter final points below.
                              <br />
                              Science & treasury are calculated.
                            </p>
                          </th>
                          {active.players.map((p) => (
                            <th
                              key={p.id}
                              className="player-heading"
                              style={{ borderTopColor: p.color }}
                            >
                              <div className="player-top">
                                <PlayerMark p={p} />
                                <label
                                  className="color-label"
                                  title={`Color for ${p.name}`}
                                >
                                  <span className="sr-only">
                                    Color for {p.name}
                                  </span>
                                  <input
                                    type="color"
                                    value={p.color}
                                    onChange={(e) =>
                                      update(p.id, { color: e.target.value })
                                    }
                                  />
                                </label>
                              </div>
                              <input
                                className="name-input"
                                aria-label={`Name for ${p.name}`}
                                maxLength={30}
                                value={p.name}
                                onChange={(e) =>
                                  update(p.id, { name: e.target.value })
                                }
                                onBlur={() => {
                                  if (!p.name.trim())
                                    update(p.id, {
                                      name: `Player ${active.players.indexOf(p) + 1}`,
                                    });
                                }}
                              />
                              <select
                                aria-label={`Wonder for ${p.name}`}
                                value={p.city}
                                onChange={(e) =>
                                  update(p.id, { city: e.target.value })
                                }
                              >
                                <option value="">Choose a Wonder</option>
                                {wonders.map((w) => (
                                  <option key={w}>{w}</option>
                                ))}
                              </select>
                              <select
                                className="side-select"
                                aria-label={`Wonder side for ${p.name}`}
                                value={p.side}
                                onChange={(e) =>
                                  update(p.id, {
                                    side: e.target.value as Player["side"],
                                  })
                                }
                              >
                                <option>Day</option>
                                <option>Night</option>
                              </select>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {categories.map((c) => (
                          <tr key={c.key}>
                            <th scope="row">
                              <span
                                className="category-symbol"
                                style={{ color: c.color }}
                                aria-hidden="true"
                              >
                                ◆
                              </span>
                              <span>
                                {c.label}
                                <small>{c.hint}</small>
                              </span>
                            </th>
                            {active.players.map((p) => (
                              <td key={p.id}>
                                <NumberInput
                                  value={p[c.key]}
                                  min={c.key === "military" ? -100 : 0}
                                  label={`${p.name}: ${c.label}${c.key === "coins" ? " coins" : " points"}`}
                                  onChange={(n) => update(p.id, { [c.key]: n })}
                                />
                                {c.key === "coins" && (
                                  <small className="calculated">
                                    = {score(p).treasury} points
                                  </small>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                        <tr className="science-row">
                          <th scope="row">
                            <span
                              className="category-symbol science-symbol"
                              aria-hidden="true"
                            >
                              ✳
                            </span>
                            <span>
                              Science
                              <small>
                                Count symbols, including Wonder effects.
                                <br />
                                Wildcards choose the best combination.
                              </small>
                            </span>
                          </th>
                          {active.players.map((p) => {
                            const best = science(
                              p.compass,
                              p.tablet,
                              p.gear,
                              p.wildcards,
                            );
                            return (
                              <td key={p.id}>
                                <div className="science-inputs">
                                  {(
                                    [
                                      "compass",
                                      "tablet",
                                      "gear",
                                      "wildcards",
                                    ] as const
                                  ).map((f, i) => (
                                    <label key={f}>
                                      <span>
                                        {
                                          ["Compass", "Tablet", "Gear", "Wild"][
                                            i
                                          ]
                                        }
                                      </span>
                                      <NumberInput
                                        value={p[f]}
                                        max={f === "wildcards" ? 10 : 999}
                                        label={`${p.name}: ${f}`}
                                        onChange={(n) =>
                                          update(p.id, { [f]: n })
                                        }
                                      />
                                    </label>
                                  ))}
                                </div>
                                <strong className="science-points">
                                  {best.points} <small>points</small>
                                </strong>
                                <small className="calculated">
                                  {best.counts.map((n) => `${n}²`).join(" + ")}{" "}
                                  + {best.sets} × 7
                                </small>
                              </td>
                            );
                          })}
                        </tr>
                        <tr className="total-row">
                          <th scope="row">
                            Total points<small>Military losses included</small>
                          </th>
                          {active.players.map((p) => (
                            <td key={p.id}>
                              <strong>{score(p).total}</strong>
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>
                <div className="score-foot">
                  <span>✦ Equal scores? Remaining coins break the tie.</span>
                  <button
                    className="text-button"
                    onClick={() => setTab("Rules")}
                  >
                    Check a rule ↗
                  </button>
                </div>
                <p className="muted small">
                  Scores save as you enter them. Empty or invalid entries revert
                  to the last valid value when you leave the field.
                </p>
              </>
            )}
          </>
        )}
        {tab === "History" && (
          <>
            <div className="page-heading">
              <div>
                <span className="eyebrow">Stories from your table</span>
                <h1>Legacies worth remembering.</h1>
                <p>
                  Every close finish and science victory, saved in this browser.
                </p>
              </div>
              <span className="edition">
                {state.history.length} COMPLETED{" "}
                {state.history.length === 1 ? "GAME" : "GAMES"}
              </span>
            </div>
            {!state.history.length ? (
              <div className="panel empty">
                <span className="empty-icon" aria-hidden="true">
                  ♜
                </span>
                <h2>Your first legacy awaits.</h2>
                <p>Finish a game on the Scoreboard to save its results here.</p>
                <button
                  className="primary"
                  onClick={() => setTab("Scoreboard")}
                >
                  Go to Scoreboard →
                </button>
              </div>
            ) : (
              <div className="history-layout">
                <aside className="history-list">
                  {state.history.map((g) => {
                    const winners = standings(g.players).filter(
                      (r) => r.winner,
                    );
                    return (
                      <button
                        className={`panel history-card ${(selectedGame?.id || state.history[0].id) === g.id ? "selected" : ""}`}
                        key={g.id}
                        onClick={() => setSelected(g.id)}
                      >
                        <span className="eyebrow">
                          {new Date(g.completedAt!).toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric", year: "numeric" },
                          )}
                        </span>
                        <strong>
                          {winners.map((w) => w.player.name).join(" & ")}
                        </strong>
                        <span>
                          {winners.length > 1 ? "Shared victory" : "Victory"} ·{" "}
                          {score(winners[0].player).total} points
                        </span>
                        <small>
                          {g.players.length} players ·{" "}
                          {g.players.map((p) => p.name).join(", ")}
                        </small>
                      </button>
                    );
                  })}
                </aside>
                {(() => {
                  const game = selectedGame || state.history[0];
                  return (
                    <section className="panel history-detail">
                      <div className="section-heading">
                        <div>
                          <span className="eyebrow">THE FINAL STANDINGS</span>
                          <h2>A civilization well built.</h2>
                        </div>
                        <span className="muted small">
                          {new Date(game.completedAt!).toLocaleTimeString(
                            undefined,
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </span>
                      </div>
                      <Results game={game} />
                      <Breakdown game={game} />
                      <div className="history-actions">
                        <button
                          className="danger-text"
                          onClick={() =>
                            confirm(
                              "Delete this result?",
                              "This completed game will be permanently removed from this browser.",
                              () => {
                                setState((s) => ({
                                  ...s,
                                  history: s.history.filter(
                                    (g) => g.id !== game.id,
                                  ),
                                }));
                                setSelected(null);
                              },
                            )
                          }
                        >
                          Delete result
                        </button>
                        <button
                          className="primary"
                          onClick={() => rematch(game)}
                        >
                          Play again with this table →
                        </button>
                      </div>
                    </section>
                  );
                })()}
              </div>
            )}
          </>
        )}
      </main>
      <footer>
        <span>Ⅶ &nbsp; Made for the moments around the table.</span>
        <span>7 Wonders · Second Edition · Unofficial companion</span>
      </footer>
      {dialog && (
        <ConfirmDialog
          title={dialog.title}
          text={dialog.text}
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            dialog.action();
            setDialog(null);
          }}
        />
      )}
    </>
  );
}
function ConfirmDialog({
  title,
  text,
  onCancel,
  onConfirm,
}: {
  title: string;
  text: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const ref = React.useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      aria-labelledby="confirm-title"
    >
      <h2 id="confirm-title">{title}</h2>
      <p>{text}</p>
      <div className="dialog-actions">
        <button autoFocus onClick={onCancel}>
          Cancel
        </button>
        <button className="primary" onClick={onConfirm}>
          Confirm
        </button>
      </div>
    </dialog>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
