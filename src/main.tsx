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
  cardCatalog,
  cardTotals,
  wonderBonus,
  wonderStageLimit,
  withWonderScoring,
  type Card,
} from "./game";
import "./styles.css";

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  });
}

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
      key: "coins",
      label: "Coins",
      hint: "Enter coins apart from Wonder stage rewards",
      color: "#ac852b",
    },
    {
      key: "military",
      label: "Military",
      hint: "Sum of victory and defeat tokens",
      color: "#ae4d45",
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
  ];
function NumberInput({
  value,
  onChange,
  label,
  min = 0,
  max = 999,
  readOnly = false,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
  min?: number;
  max?: number;
  readOnly?: boolean;
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
      readOnly={readOnly}
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
function scoredPlayer(game: Game, p: Player): Player {
  if (!Object.prototype.hasOwnProperty.call(game.wonderStages ?? {}, p.id) && game.mode !== "cards") return p;
  const stages = game.wonderStages?.[p.id] ?? 0;
  const wonder = wonderBonus(p.city, p.side, stages);
  if (game.mode === "cards") {
    const totals = cardTotals(game)[p.id];
    return { ...p, wonder: totals.wonder, civilian: totals.civilian, commercial: totals.commercial, guild: totals.guild, military: p.military + totals.military, coins: totals.coins, compass: totals.compass, tablet: totals.tablet, gear: totals.gear, wildcards: totals.wildcards };
  }
  return withWonderScoring(p, stages);
}
function Results({ game }: { game: Game }) {
  const scoringPlayers = game.players.map((p) => scoredPlayer(game, p));
  return (
    <div className="results-list">
      {standings(scoringPlayers).map(({ player: p, rank, winner }) => (
        <div className={`result ${winner ? "winning" : ""}`} key={p.id}>
          <span className="rank">{rank.toString().padStart(2, "0")}</span>
          <PlayerMark p={p} />
          <div className="result-name">
            <strong>{p.name}</strong>
            <small>
              {[p.city ? `${p.city} (${p.side})` : "Wonder not selected", winner ? "Winner" : ""]
                .filter(Boolean)
                .join(" · ")}
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
        <span className="edition">BASE GAME Â· 2ND EDITION</span>
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
              placeholder="Science, trading, tiesâ€¦"
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
              <p>Try a shorter phrase such as â€œcoinsâ€ or â€œWonderâ€.</p>
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
  const automatic = cardTotals(game) as Record<string, { wonder:number; civilian:number; commercial:number; guild:number; military:number; coins:number; scientific:number; compass:number; tablet:number; gear:number; wildcards:number; automatic:number }>;
  const scoringPlayers = game.players.map((p) => scoredPlayer(game, p));
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
          {categories.slice(0, -1).map((c) => (
            <tr key={c.key}>
              <th>
                {c.label}
                {c.key === "coins" && " points"}
              </th>
              {game.players.map((p) => (
                <td key={p.id}>
                  {c.key === "coins" ? score(scoringPlayers.find((x) => x.id === p.id)!).treasury : c.key === "wonder" ? automatic[p.id].wonder : c.key === "military" ? scoringPlayers.find((x) => x.id === p.id)!.military : game.mode === "cards" && ["civilian","commercial","guild"].includes(c.key) ? automatic[p.id][c.key as "civilian"|"commercial"|"guild"] : p[c.key]}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <th>Science</th>
            {game.players.map((p) => (
              <td key={p.id}>{score(scoringPlayers.find((x) => x.id === p.id)!).scientific}</td>
            ))}
          </tr>
          {categories.slice(-1).map((c) => (
            <tr key={c.key}>
              <th>{c.label}</th>
              {game.players.map((p) => (
              <td key={p.id}>{game.mode === "cards" ? automatic[p.id].guild : p[c.key]}</td>
              ))}
            </tr>
          ))}
          <tr>
            <th>Coins remaining</th>
            {game.players.map((p) => (
              <td key={p.id}>{scoringPlayers.find((x) => x.id === p.id)!.coins}</td>
            ))}
          </tr>
          <tr className="total-row">
            <th>Total</th>
            {game.players.map((p) => (
              <td key={p.id}>{score(scoringPlayers.find((x) => x.id === p.id)!).total}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
function CardModeScoreboard({ game, update, updateStages, updateWonder }: { game: Game; update: (id: string, patch: Partial<Player>) => void; updateStages: (id: string, stages: number) => void; updateWonder: (id: string, patch: Partial<Player>) => void }) {
  const totals = cardTotals(game) as Record<string, { wonder:number; civilian:number; commercial:number; guild:number; military:number; coins:number; scientific:number; compass:number; tablet:number; gear:number; wildcards:number }>;
  return <section className="panel score-panel card-mode-score-panel" aria-label="Card mode scoreboard"><div className="table-scroll"><table className="score-table"><caption>Card mode scoreboard</caption><thead><tr><th className="category-heading"><span className="eyebrow">CARD MODE</span><h2>Build your legacy.</h2><p>Card and Wonder scoring effects update automatically.</p></th>{game.players.map(p=><th className="player-heading" key={p.id} style={{borderTopColor:p.color}}><PlayerMark p={p}/><input className="name-input" aria-label={`Name for ${p.name}`} maxLength={30} value={p.name} onChange={e=>update(p.id,{name:e.target.value})} onBlur={()=>{if(!p.name.trim())update(p.id,{name:`Player ${game.players.indexOf(p)+1}`})}}/><select aria-label={`Wonder for ${p.name}`} value={p.city} onChange={e=>updateWonder(p.id,{city:e.target.value})}><option value="">Choose a Wonder</option>{wonders.map(w=><option key={w}>{w}</option>)}</select><select className="side-select" aria-label={`Wonder side for ${p.name}`} value={p.side} onChange={e=>updateWonder(p.id,{side:e.target.value as Player["side"]})}><option>Day</option><option>Night</option></select></th>)}</tr></thead><tbody>
    <tr><th scope="row"><span className="category-symbol" style={{color:"#9a7946"}} aria-hidden="true">◆</span>Wonder<small>Points and scoreable stage effects</small></th>{game.players.map(p=><td key={p.id}><NumberInput value={game.wonderStages?.[p.id]??0} max={wonderStageLimit(p.city,p.side)} label={`${p.name}: Wonder stages built`} onChange={n=>updateStages(p.id,n)}/><small className="calculated">{totals[p.id].wonder} points from stages</small></td>)}</tr>
    <tr><th scope="row"><span className="category-symbol" style={{color:"#ac852b"}} aria-hidden="true">●</span>Coins<small>Card and Wonder bonus coins add automatically</small></th>{game.players.map(p=><td key={p.id}><NumberInput value={p.coins} label={`${p.name}: Coins`} onChange={n=>update(p.id,{coins:n})}/><small className="calculated">= {Math.floor(totals[p.id].coins/3)} points</small></td>)}</tr>
    <tr><th scope="row"><span className="category-symbol" style={{color:"#ae4d45"}} aria-hidden="true">✕</span>Military<small>Card shields plus conflict tokens</small></th>{game.players.map(p=><td key={p.id}><small className="calculated">{totals[p.id].military} card shields</small><NumberInput value={p.military} min={-100} label={`${p.name}: Conflict tokens`} onChange={n=>update(p.id,{military:n})}/></td>)}</tr>
    {([["Civilian","civilian","#3d739f","▮"],["Commercial","commercial","#ab851e","●"]] as const).map(([label,key,color,symbol])=><tr key={key}><th scope="row"><span className="category-symbol" style={{color}} aria-hidden="true">{symbol}</span>{label}<small>From selected cards</small></th>{game.players.map(p=><td key={p.id}><NumberInput value={totals[p.id][key]} label={`${p.name}: ${label}`} readOnly onChange={()=>{}}/></td>)}</tr>)}
    <tr className="science-row"><th scope="row"><span className="category-symbol science-symbol" aria-hidden="true">✳</span>Science<small>Symbols from cards and Wonder</small></th>{game.players.map(p=><td key={p.id}><div className="science-inputs">{([["Compass","compass"],["Tablet","tablet"],["Gear","gear"],["Wild","wildcards"]] as const).map(([label,key])=><label key={key}><span>{label}</span><NumberInput value={totals[p.id][key]} label={`${p.name}: ${label}`} readOnly onChange={()=>{}}/></label>)}</div><strong className="science-points">{totals[p.id].scientific} <small>points</small></strong></td>)}</tr>
    <tr><th scope="row"><span className="category-symbol" style={{color:"#876594"}} aria-hidden="true">?</span>Guilds<small>From selected cards</small></th>{game.players.map(p=><td key={p.id}><NumberInput value={totals[p.id].guild} label={`${p.name}: Guilds`} readOnly onChange={()=>{}}/></td>)}</tr>
    <tr className="total-row"><th scope="row">Total points</th>{game.players.map(p=><td key={p.id}><strong>{totals[p.id].wonder+totals[p.id].civilian+totals[p.id].commercial+totals[p.id].guild+totals[p.id].military+p.military+totals[p.id].scientific+Math.floor(totals[p.id].coins/3)}</strong></td>)}</tr>
    </tbody></table></div></section>;
}
function App() {
  const [state, setState] = useState<State>(initial.state);
  const [warning, setWarning] = useState(initial.warning);
  const [tab, setTab] = useState(() => {
    try {
      const savedTab = localStorage.getItem(`${STORAGE}-tab`);
      return ["Rules", "Scoreboard", "Cards", "History"].includes(savedTab ?? "")
        ? savedTab!
        : initial.state.active?.mode === "cards"
          ? "Cards"
          : "Scoreboard";
    } catch {
      return initial.state.active?.mode === "cards" ? "Cards" : "Scoreboard";
    }
  });
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
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE}-tab`, tab);
    } catch {
      // Keep the current page usable when browser storage is unavailable.
    }
  }, [tab]);
  const active = state.active;
  const automatic = active ? cardTotals(active) as Record<string, { wonder:number; civilian:number; commercial:number; guild:number; military:number; coins:number; scientific:number; compass:number; tablet:number; gear:number; wildcards:number; automatic:number }> : {};
  function start(players = Array.from({ length: count }, (_, i) => player(i))) {
    setState((s) => ({ ...s, active: { id: crypto.randomUUID(), players } }));
    setTab("Scoreboard");
  }
  function startCardMode() {
    const players = Array.from({ length: count }, (_, i) => player(i));
    setState((s) => ({ ...s, active: { id: crypto.randomUUID(), players, mode: "cards", seats: players.map((p) => p.id), cards: {}, wonderStages: {} } }));
    setTab("Cards");
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
  function updateStages(id: string, stages: number) {
    setState((s) => ({ ...s, active: s.active ? { ...s.active, wonderStages: { ...s.active.wonderStages, [id]: stages } } : null }));
  }
  function updateWonder(id: string, patch: Partial<Player>) {
    setState((s) => {
      if (!s.active) return s;
      const current = s.active.players.find((p) => p.id === id);
      if (!current) return s;
      const next = { ...current, ...patch };
      const stages = Math.min(s.active.wonderStages?.[id] ?? 0, wonderStageLimit(next.city, next.side));
      return {
        ...s,
        active: {
          ...s.active,
          players: s.active.players.map((p) => p.id === id ? next : p),
          wonderStages: { ...s.active.wonderStages, [id]: stages },
        },
      };
    });
  }
  function randomizeWonders() {
    setState((s) => {
      if (!s.active) return s;
      const available = [...wonders];
      for (let i = available.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [available[i], available[j]] = [available[j], available[i]];
      }
      const players = s.active.players.map((p, i) => ({
        ...p,
        city: available[i],
        side: (Math.random() < 0.5 ? "Day" : "Night") as Player["side"],
      }));
      const wonderStages = { ...s.active.wonderStages };
      players.forEach((p) => {
        if (Object.prototype.hasOwnProperty.call(wonderStages, p.id)) {
          wonderStages[p.id] = Math.min(wonderStages[p.id], wonderStageLimit(p.city, p.side));
        }
      });
      return { ...s, active: { ...s.active, players, wonderStages } };
    });
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
          {["Rules", "Manual mode", "Card mode", "History"].map((t) => {
            const page = t === "Manual mode" ? "Scoreboard" : t === "Card mode" ? "Cards" : t;
            return (
            <button
              key={t}
              aria-current={tab === page || (t === "Card mode" && tab === "Card scoreboard") ? "page" : undefined}
              className={tab === page || (t === "Card mode" && tab === "Card scoreboard") ? "active" : ""}
              onClick={() => {
                if (t === "Manual mode") setState(s=>({...s,active:s.active?{...s.active,mode:"manual"}:null}));
                if (t === "Card mode") setState(s=>({...s,active:s.active?{...s.active,mode:"cards"}:null}));
                setTab(page);
              }}
            >
              {t}
              {t === "History" && state.history.length > 0 && (
                <span className="badge">{state.history.length}</span>
              )}
            </button>
          );})}
        </nav>
        <button
          className="fullscreen"
          onClick={async () => {
            try {
              if (document.fullscreenElement) await document.exitFullscreen();
              else await document.documentElement.requestFullscreen();
            } catch {
              setWarning(
                "Fullscreen is unavailable in this browser. You can use the browserâ€™s zoom controls instead.",
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
        {(tab === "Scoreboard" || tab === "Card scoreboard") && (
          <>
            <div className="page-heading">
              <div>
                <span className="eyebrow">Great cities. Good company.</span>
                <h1>Every civilization counts.</h1>
                <p>
                  Your table, your wonders, your final scores. Weâ€™ll do the
                  arithmetic.
                </p>
              </div>
              <span className="edition">BASE GAME Â· 2ND EDITION</span>
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
                  When itâ€™s time to count, bring your scores here.
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
                      Â· {active.players.length} players
                    </span>
                  </div>
                  <div className="toolbar-actions">
                    {active.mode === "cards" && <button onClick={() => setTab("Cards")}>Edit cards</button>}
                    <button onClick={randomizeWonders}>Randomize Wonders &amp; Sides</button>
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
                        Enter each playerâ€™s final score by category
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
                                  updateWonder(p.id, { city: e.target.value })
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
                                  updateWonder(p.id, {
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
                        {categories.slice(0, -1).map((c) => (
                          <tr key={c.key}>
                            <th scope="row">
                              <span
                                className="category-symbol"
                                style={{ color: c.color }}
                                aria-hidden="true"
                              >
                                â—†
                              </span>
                              <span>
                                {c.label}
                                <small>{c.hint}</small>
                              </span>
                            </th>
                            {active.players.map((p) => (
                              <td key={p.id}>
                                {c.key === "wonder" ? (
                                  <>
                                    <NumberInput
                                      value={active.wonderStages?.[p.id] ?? 0}
                                      max={wonderStageLimit(p.city, p.side)}
                                      label={`${p.name}: Wonder stages built`}
                                      onChange={(n) => updateStages(p.id, n)}
                                    />
                                    <small className="calculated">
                                      {(Object.prototype.hasOwnProperty.call(active.wonderStages ?? {}, p.id) ? wonderBonus(p.city, p.side, active.wonderStages?.[p.id] ?? 0).points : p.wonder)} Wonder points
                                    </small>
                                  </>
                                ) : active.mode === "cards" && c.key === "military" ? (
                                  <div className="military-card-score">
                                    <span>{automatic[p.id].military} card shields</span>
                                    <NumberInput value={p.military} min={-100} label={`${p.name}: conflict tokens`} onChange={(n) => update(p.id, { military: n })} />
                                    <small>Conflict tokens</small>
                                  </div>
                                ) : (
                                  <NumberInput
                                    value={active.mode === "cards" && ["civilian","commercial"].includes(c.key) ? automatic[p.id][c.key as "civilian"|"commercial"] : active.mode === "cards" && c.key === "guild" ? automatic[p.id].guild : p[c.key]}
                                    min={c.key === "military" ? -100 : 0}
                                    label={`${p.name}: ${c.label}${c.key === "coins" ? " coins" : " points"}`}
                                    readOnly={active.mode === "cards" && ["civilian","commercial","guild"].includes(c.key)}
                                    onChange={(n) => update(p.id, { [c.key]: n })}
                                  />
                                )}
                                {c.key === "coins" && (
                                  <small className="calculated">
                                    = {active.mode === "cards" ? Math.floor(automatic[p.id].coins/3) : score(scoredPlayer(active,p)).treasury} points
                                  </small>
                                )}
                                {c.key === "military" && active.mode !== "cards" && wonderBonus(p.city, p.side, active.wonderStages?.[p.id] ?? 0).shields > 0 && (
                                  <small className="calculated">+{wonderBonus(p.city, p.side, active.wonderStages?.[p.id] ?? 0).shields} Wonder shields</small>
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
                              âœ³
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
                            const best = active.mode === "cards" ? { points:automatic[p.id].scientific, counts:[automatic[p.id].compass,automatic[p.id].tablet,automatic[p.id].gear], sets:0 } : science(
                              p.compass,
                              p.tablet,
                              p.gear,
                              p.wildcards + wonderBonus(p.city, p.side, active.wonderStages?.[p.id] ?? 0).wildcards,
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
                                  value={active.mode === "cards" ? automatic[p.id][f] : p[f]}
                                        max={f === "wildcards" ? 10 : 999}
                                        label={`${p.name}: ${f}`}
                                        readOnly={active.mode === "cards"}
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
                                  {best.counts.map((n) => `${n}Â²`).join(" + ")}{" "}
                                  + {best.sets} × 7
                                </small>                                {active.mode !== "cards" && wonderBonus(p.city, p.side, active.wonderStages?.[p.id] ?? 0).wildcards > 0 && (
                                  <small className="calculated">Includes {wonderBonus(p.city, p.side, active.wonderStages?.[p.id] ?? 0).wildcards} Wonder science wildcard</small>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                        {categories.slice(-1).map((c) => (
                          <tr key={c.key}>
                            <th scope="row">
                              <span
                                className="category-symbol"
                                style={{ color: c.color }}
                                aria-hidden="true"
                              >
                                â—†
                              </span>
                              <span>
                                {c.label}
                                <small>{c.hint}</small>
                              </span>
                            </th>
                            {active.players.map((p) => (
                              <td key={p.id}>
                                <NumberInput
                                  value={active.mode === "cards" ? automatic[p.id].guild : p[c.key]}
                                  label={`${p.name}: ${c.label} points`}
                                  readOnly={active.mode === "cards"}
                                  onChange={(n) => update(p.id, { [c.key]: n })}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                        <tr className="total-row">
                          <th scope="row">
                            Total points<small>Military losses included</small>
                          </th>
                          {active.players.map((p) => (
                            <td key={p.id}>
                              <strong>{score(scoredPlayer(active,p)).total}</strong>
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
        {tab === "Cards" && !active && (
          <>
            <div className="page-heading"><div><span className="eyebrow">Card based scoring</span><h1>Set up your table.</h1><p>Choose the number of players to begin entering cards and scoring.</p></div><span className="edition">BASE GAME Â· 2ND EDITION</span></div>
            <div className="welcome panel"><div className="temple" aria-hidden="true"><div className="pediment"/><div className="columns"><i/><i/><i/><i/><i/></div><div className="steps"/></div><span className="eyebrow">Gather your civilizations</span><h2>A place for everyone at the table.</h2><label htmlFor="card-players-count">Players</label><div className="player-count" role="group" aria-label="Number of players">{[3,4,5,6,7].map(n=><button key={n} aria-pressed={count===n} className={count===n?"chosen":""} onClick={()=>setCount(n)}>{n}</button>)}</div><button className="primary" onClick={startCardMode}>Set up the table <span aria-hidden="true">→</span></button><p className="muted small">Saved automatically in this browser.</p></div>
          </>
        )}
        {tab === "Cards" && active && (
          <>
            <div className="page-heading"><div><span className="eyebrow">Card based scoring</span><h1>Count the city.</h1><p>Select built cards; adjacent seating powers guild and neighbor effects.</p></div><span className="edition">BASE GAME Â· 2ND EDITION</span></div>
            <div className="toolbar"><div>Seating order is clockwise, wrapping at the ends.</div></div>
            <div className="toolbar"><div><span className="status-dot"/> Game in progress <span className="muted">Â· {active.players.length} players</span></div><div className="toolbar-actions"><button onClick={randomizeWonders}>Randomize Wonders &amp; Sides</button><button onClick={()=>confirm("Start a new table?","This discards the unfinished game. Completed results stay in History.",()=>setState(s=>({...s,active:null})))}>New game</button><button className="primary" onClick={finish}>Finish game <span aria-hidden="true">→</span></button></div></div>
            <section className="panel cards-panel"><h2>Seat order</h2><div className="seat-grid">{active.players.map((p,i)=><label key={p.id}>{p.name}<select value={(active.seats??active.players.map(x=>x.id))[i]} onChange={e=>setState(s=>{if(!s.active)return s;const seats=[...(s.active.seats??s.active.players.map(x=>x.id))];const j=seats.indexOf(e.target.value);[seats[i],seats[j]]=[seats[j],seats[i]];return {...s,active:{...s.active,seats}}})}>{(active.seats??active.players.map(x=>x.id)).map(id=><option key={id} value={id}>{active.players.find(x=>x.id===id)?.name}</option>)}</select></label>)}</div></section>
            <div className="card-player-grid">{active.players.map(p=>{const selectedCards=active.cards?.[p.id]??[];const usedCardIds=new Set(Object.values(active.cards??{}).flat().map(card=>card.id));const totals=cardTotals(active)[p.id] as Record<string,number>;const types=[...new Set(cardCatalog.map(c=>c.color))];return <section className="panel cards-panel" key={p.id} style={{borderTop:`3px solid ${p.color}`}}><h2>{p.name}</h2><div className="card-wonder-setup"><label>Wonder<select aria-label={`${p.name}: Wonder`} value={p.city} onChange={e=>updateWonder(p.id,{city:e.target.value})}><option value="">Choose a Wonder</option>{wonders.map(w=><option key={w}>{w}</option>)}</select></label><label>Side<select aria-label={`${p.name}: Wonder side`} value={p.side} onChange={e=>updateWonder(p.id,{side:e.target.value as Player["side"]})}><option>Day</option><option>Night</option></select></label><label>Stages built<NumberInput value={active.wonderStages?.[p.id]??0} max={wonderStageLimit(p.city,p.side)} label={`${p.name}: Wonder stages built`} onChange={n=>updateStages(p.id,n)}/></label></div><div className="card-add"><label>Card<select id={`card-${p.id}`} defaultValue=""><option value="" disabled>Select a card</option>{types.map(type=><optgroup key={type} label={{brown:"Brown · Raw materials",gray:"Gray · Manufactured goods",blue:"Blue · Civilian",red:"Red · Military",green:"Green · Science",yellow:"Yellow · Commercial",purple:"Purple · Guilds"}[type]??type}>{cardCatalog.filter(c=>c.color===type&&!usedCardIds.has(c.id)).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>)}</select></label><button onClick={()=>{const card=cardCatalog.find(c=>c.id===(document.getElementById(`card-${p.id}`) as HTMLSelectElement).value);if(card&&!usedCardIds.has(card.id))setState(s=>({...s,active:s.active?{...s.active,mode:"cards",cards:{...s.active.cards,[p.id]:[...(s.active.cards?.[p.id]??[]),card]}}:null}))}}>Add card</button></div><ul className="selected-cards">{selectedCards.map((c,i)=><li className={`selected-card ${c.color}`} key={`${c.id}-${i}`}><span>{c.name}</span><button aria-label={`Remove ${c.name}`} onClick={()=>setState(s=>({...s,active:s.active?{...s.active,cards:{...s.active.cards,[p.id]:(s.active.cards?.[p.id]??[]).filter((_,j)=>j!==i)}}:null}))}>×</button></li>)}</ul><div className="auto-scores">{[["Civilian",totals.civilian],["Coins",totals.coins],["Military shields",totals.military],["Commercial",totals.commercial],["Guilds",totals.guild],["Science",totals.scientific]].map(([label,n])=><span key={String(label)}>{label}<strong>{n}</strong></span>)}</div><small className="calculated card-science-count">Science symbols: {totals.compass} compass · {totals.tablet} tablet · {totals.gear} gear · {totals.wildcards} wild</small></section>})}</div>
            <CardModeScoreboard game={active} update={update} updateStages={updateStages} updateWonder={updateWonder}/>
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
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z" />
                    <path d="M4 5.5v13A2.5 2.5 0 0 1 6.5 16H20M8 7h8M8 10h6" />
                  </svg>
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
                    const winners = standings(g.players.map((p) => scoredPlayer(g, p))).filter(
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
                          {winners.length > 1 ? "Shared victory" : "Victory"} Â·{" "}
                          {score(winners[0].player).total} points
                        </span>
                        <small>
                          {g.players.length} players Â·{" "}
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
        <span>7 Wonders Â· Second Edition Â· Unofficial companion</span>
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
