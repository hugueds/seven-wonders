import React, { useEffect, useRef, useState } from "react";
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
    return { ...p, wonder: totals.wonder, civilian: totals.civilian, commercial: totals.commercial, guild: totals.guild, military: p.military, coins: totals.coins, scoringCoins: totals.scoringCoins, compass: totals.compass, tablet: totals.tablet, gear: totals.gear, wildcards: totals.wildcards };
  }
  return withWonderScoring(p, stages);
}
function formatMatchDuration(milliseconds: number) {
  const totalMinutes = Math.max(0, Math.floor(milliseconds / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours ? `${hours} hr ${minutes} min` : `${minutes} min`;
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
  const automatic = cardTotals(game) as Record<string, { wonder:number; civilian:number; commercial:number; guild:number; military:number; coins:number; scoringCoins:number; scientific:number; compass:number; tablet:number; gear:number; wildcards:number; automatic:number }>;
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
function CardModeScoreboard({ game, update }: { game: Game; update: (id: string, patch: Partial<Player>) => void }) {
  const totals = cardTotals(game) as Record<string, { wonder:number; civilian:number; commercial:number; guild:number; military:number; coins:number; scoringCoins:number; scientific:number; compass:number; tablet:number; gear:number; wildcards:number }>;
  return <section className="panel score-panel card-mode-score-panel" aria-label="Card mode scoreboard"><div className="table-scroll"><table className="score-table"><caption className="card-score-caption">Card mode scoreboard</caption><thead><tr><th className="category-heading"><span className="eyebrow">CARD MODE</span><h2>Build your legacy.</h2><p>Card and Wonder scoring effects update automatically.</p></th>{game.players.map(p=><th className="player-heading" key={p.id} style={{borderTopColor:p.color}}><PlayerMark p={p}/><span className="name-display">{p.name}</span><small className="selected-wonder">{p.city ? `${p.city} (${p.side})` : "Wonder not selected"}</small></th>)}</tr></thead><tbody>
    <tr><th scope="row"><span className="category-symbol" style={{color:"#9a7946"}} aria-hidden="true">◆</span>Wonder<small>Calculated from built stages</small></th>{game.players.map(p=><td key={p.id}><span className="calculated">{game.wonderStages?.[p.id]??0} stages built</span><strong className="science-points">{totals[p.id].wonder} <small>points</small></strong></td>)}</tr>
    <tr><th scope="row"><span className="category-symbol" style={{color:"#ac852b"}} aria-hidden="true">●</span>Coins<small>Enter final coins manually, including bonuses</small></th>{game.players.map(p=><td key={p.id}><NumberInput value={p.coins} label={`${p.name}: Coins`} onChange={n=>update(p.id,{coins:n})}/><small className="calculated">= {Math.floor(totals[p.id].scoringCoins/3)} points</small></td>)}</tr>
    <tr><th scope="row"><span className="category-symbol" style={{color:"#ae4d45"}} aria-hidden="true">✕</span>Military<small>Enter the final military score manually</small></th>{game.players.map(p=><td key={p.id}><small className="calculated">{totals[p.id].military} card shields (reference)</small><NumberInput value={p.military} min={-100} label={`${p.name}: Military points`} onChange={n=>update(p.id,{military:n})}/></td>)}</tr>
    {([["Civilian","civilian","#3d739f","▮"],["Commercial","commercial","#ab851e","●"]] as const).map(([label,key,color,symbol])=><tr key={key}><th scope="row"><span className="category-symbol" style={{color}} aria-hidden="true">{symbol}</span>{label}<small>From selected cards</small></th>{game.players.map(p=><td key={p.id}><NumberInput value={totals[p.id][key]} label={`${p.name}: ${label}`} readOnly onChange={()=>{}}/></td>)}</tr>)}
    <tr className="science-row"><th scope="row"><span className="category-symbol science-symbol" aria-hidden="true">✳</span>Science<small>Symbols from cards and Wonder</small></th>{game.players.map(p=><td key={p.id}><div className="science-inputs">{([["Compass","compass"],["Tablet","tablet"],["Gear","gear"],["Wild","wildcards"]] as const).map(([label,key])=><label key={key}><span>{label}</span><NumberInput value={totals[p.id][key]} label={`${p.name}: ${label}`} readOnly onChange={()=>{}}/></label>)}</div><strong className="science-points">{totals[p.id].scientific} <small>points</small></strong></td>)}</tr>
    <tr><th scope="row"><span className="category-symbol" style={{color:"#876594"}} aria-hidden="true">?</span>Guilds<small>From selected cards</small></th>{game.players.map(p=><td key={p.id}><NumberInput value={totals[p.id].guild} label={`${p.name}: Guilds`} readOnly onChange={()=>{}}/></td>)}</tr>
    <tr className="total-row"><th scope="row">Total points</th>{game.players.map(p=><td key={p.id}><strong>{totals[p.id].wonder+totals[p.id].civilian+totals[p.id].commercial+totals[p.id].guild+p.military+totals[p.id].scientific+Math.floor(totals[p.id].scoringCoins/3)}</strong></td>)}</tr>
    </tbody></table></div></section>;
}
function normalizeCardText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
}
function textSimilarity(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return 1 - row[b.length] / Math.max(a.length, b.length, 1);
}
function rankCardMatches(text: string) {
  const words = normalizeCardText(text);
  return cardCatalog.map((card) => {
    const nameWords = normalizeCardText(card.name);
    const target = nameWords.join("");
    let best = 0;
    const lengths = new Set([Math.max(1, nameWords.length - 1), nameWords.length, nameWords.length + 1]);
    for (const length of lengths) {
      for (let start = 0; start + length <= words.length; start++) {
        const chunk = words.slice(start, start + length).join("");
        best = Math.max(best, textSimilarity(target, chunk));
      }
    }
    return { card, confidence: best };
  }).sort((a, b) => b.confidence - a.confidence || a.card.name.localeCompare(b.card.name)).slice(0, 8);
}
function CardScanner({ playerName, apiKey, onAdd }: { playerName: string; apiKey: string; onAdd: (cards: Card[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Array<{ text: string; matches: ReturnType<typeof rankCardMatches>; cardId: string }>>([]);
  const [recognizedText, setRecognizedText] = useState("");
  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }, [imageUrl]);
  async function scan(file?: File) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setRows([]);
    setRecognizedText("");
    setBusy(true);
    setStatus(apiKey ? "Sending photo to OCR.space…" : "Loading the on-device OCR engine…");
    let worker: Awaited<ReturnType<typeof import("tesseract.js").createWorker>> | undefined;
    try {
      let text = "";
      if (apiKey.trim()) {
        const body = new FormData(); body.append("apikey", apiKey.trim()); body.append("language", "eng"); body.append("isOverlayRequired", "true"); body.append("OCREngine", "2"); body.append("file", file);
        const response = await fetch("https://api.ocr.space/parse/image", { method: "POST", body });
        if (!response.ok) throw new Error(`OCR.space returned HTTP ${response.status}`);
        const result = await response.json() as { IsErroredOnProcessing?: boolean; ErrorMessage?: string[] | string; ParsedResults?: Array<{ ParsedText?: string; TextOverlay?: { Lines?: Array<{ LineText?: string }> } }> };
        if (result.IsErroredOnProcessing) throw new Error(Array.isArray(result.ErrorMessage) ? result.ErrorMessage.join("; ") : result.ErrorMessage || "OCR.space could not read the image");
        const parsed = result.ParsedResults?.[0];
        if (!parsed) throw new Error("OCR.space returned no text results");
        text = parsed.ParsedText?.trim() ?? "";
        const overlayLines = parsed.TextOverlay?.Lines?.map((line) => line.LineText?.trim() ?? "").filter(Boolean) ?? [];
        const lines = overlayLines.length ? overlayLines : text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        setRecognizedText(text);
        setRowsForScan(lines, text);
      } else {
        const { createWorker } = await import("tesseract.js");
        worker = await createWorker("eng", undefined, { logger: (message) => {
          const percent = Math.round(message.progress * 100);
          setStatus(`${message.status.replace(/\b\w/g, (letter) => letter.toUpperCase())}${message.progress ? ` · ${percent}%` : "…"}`);
        } });
        const { data } = await worker.recognize(url, { rotateAuto: true });
        text = data.text.trim(); setRecognizedText(text);
        setRowsForScan(text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean), text);
      }
    } catch (error) {
      setStatus(`Could not scan this photo: ${error instanceof Error ? error.message : "OCR failed"}`);
    } finally {
      await worker?.terminate().catch(() => undefined);
      setBusy(false);
    }
  }
  function setRowsForScan(lines: string[], text: string) {
      const candidates = lines.filter((line) => line.length >= 4);
      const found = candidates.map((line) => {
        const matches = rankCardMatches(line).slice(0, 5);
        const best = matches[0];
        return { text: line, matches, cardId: best && best.confidence >= 0.62 ? best.card.id : "" };
      }).filter((row) => row.matches.length && row.matches[0].confidence >= 0.28);
      const deduped = found.filter((row, index) => found.findIndex((other) => other.matches[0]?.card.id === row.matches[0]?.card.id) === index).slice(0, 15);
      setRows(deduped);
      setStatus(deduped.length ? `Review the possible cards found for ${playerName}. Select the cards you want to add.` : text ? "No clear card names found. Try a closer, sharper photo with card names facing the camera." : "No text found. Try a closer, sharper photo.");
  }
  const updateRow = (index: number, key: "cardId", value: string) => setRows((current) => current.map((row, i) => i === index ? { ...row, [key]: value } : row));
  const addSelected = () => { const cards = rows.filter((row) => row.cardId).map((row) => cardCatalog.find((card) => card.id === row.cardId)).filter((card): card is Card => !!card); if (!cards.length) return; onAdd(cards); setStatus(`Added ${cards.length} card${cards.length === 1 ? "" : "s"} for ${playerName}.`); setRows([]); setRecognizedText(""); setImageUrl(""); };
  return <div className="card-scanner"><input ref={fileRef} className="sr-only" type="file" accept="image/*" capture="environment" aria-label={`Take or choose a photo of ${playerName}'s cards`} onChange={(e) => { void scan(e.currentTarget.files?.[0]); e.currentTarget.value = ""; }}/><button type="button" className="scan-card-button" disabled={busy} onClick={() => fileRef.current?.click()}>{apiKey.trim() ? "Scan cards with OCR.space" : "Scan player’s cards"}</button><small className="scan-privacy">Photograph one player’s laid-out cards with names facing up. Without a key, scanning stays on this device and downloads the OCR engine.</small>{status && <div className="scan-result" aria-live="polite">{imageUrl && <img className="scan-preview" src={imageUrl} alt="Cards photo preview"/>}<div className="scan-result-content"><p>{status}</p>{rows.length > 0 && <><div className="scan-batch-list">{rows.map((row, index) => <label className="scan-batch-row" key={`${row.text}-${index}`}><input type="checkbox" checked={!!row.cardId} onChange={(e) => updateRow(index, "cardId", e.target.checked ? row.matches[0]?.card.id ?? "" : "")}/><span className="scan-ocr-text">{row.text}</span><select aria-label={`${playerName}: Match for detected text ${row.text}`} value={row.cardId} onChange={(e) => updateRow(index, "cardId", e.target.value)}><option value="">Skip</option>{row.matches.map(({ card, confidence }) => <option key={card.id} value={card.id}>{card.name} · {Math.round(confidence * 100)}%</option>)}<optgroup label="All cards">{cardCatalog.filter((card) => !row.matches.some((match) => match.card.id === card.id)).map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</optgroup></select></label>)}</div><button type="button" className="primary" disabled={!rows.some((row) => row.cardId)} onClick={addSelected}>Add {rows.filter((row) => row.cardId).length} selected cards</button></>}{recognizedText && <details><summary>See detected text</summary><pre>{recognizedText}</pre></details>}</div></div>}</div>;
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
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);
  const [ocrKey, setOcrKey] = useState(() => { try { return localStorage.getItem(`${STORAGE}-ocrspace-key`) ?? ""; } catch { return ""; } });
  const [clockNow, setClockNow] = useState(Date.now());
  const [selected, setSelected] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{
    title: string;
    text: string;
    action: () => void;
  } | null>(null);
  useEffect(() => {
    if (!state.active) return;
    const timer = window.setInterval(() => setClockNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [Boolean(state.active)]);
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
  const automatic = active ? cardTotals(active) as Record<string, { wonder:number; civilian:number; commercial:number; guild:number; military:number; coins:number; scoringCoins:number; scientific:number; compass:number; tablet:number; gear:number; wildcards:number; automatic:number }> : {};
  function start(players = Array.from({ length: count }, (_, i) => player(i))) {
    setState((s) => ({ ...s, active: { id: crypto.randomUUID(), startedAt: new Date().toISOString(), players } }));
    setTab("Scoreboard");
  }
  function startCardMode() {
    const players = Array.from({ length: count }, (_, i) => player(i));
    setState((s) => ({ ...s, active: { id: crypto.randomUUID(), startedAt: new Date().toISOString(), players, mode: "cards", seats: players.map((p) => p.id), cards: {}, wonderStages: {} } }));
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
  function swapSeat(position: number, playerId: string) {
    setState((s) => {
      if (!s.active) return s;
      const seats = [...(s.active.seats ?? s.active.players.map((p) => p.id))];
      const otherPosition = seats.indexOf(playerId);
      if (otherPosition < 0) return s;
      [seats[position], seats[otherPosition]] = [seats[otherPosition], seats[position]];
      return { ...s, active: { ...s.active, seats } };
    });
  }
  function reorderPlayer(targetId: string) {
    if (!draggedPlayerId || draggedPlayerId === targetId) return;
    setState((s) => {
      if (!s.active) return s;
      const players = [...s.active.players];
      const from = players.findIndex((p) => p.id === draggedPlayerId);
      const to = players.findIndex((p) => p.id === targetId);
      if (from < 0 || to < 0) return s;
      const [moved] = players.splice(from, 1);
      players.splice(to, 0, moved);
      return { ...s, active: { ...s.active, players } };
    });
    setDraggedPlayerId(null);
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
                      · {active.players.length} players
                      {active.startedAt && <> · Started {new Date(active.startedAt).toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"})} · {formatMatchDuration(clockNow-Date.parse(active.startedAt))} elapsed</>}
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
                              {active.mode === "cards" ? (
                                <span className="name-display">{p.name}</span>
                              ) : (
                                <input
                                  className="name-input"
                                  aria-label={`Name for ${p.name}`}
                                  maxLength={30}
                                  value={p.name}
                                  onChange={(e) => update(p.id, { name: e.target.value })}
                                  onBlur={() => {
                                    if (!p.name.trim()) update(p.id, { name: `Player ${active.players.indexOf(p) + 1}` });
                                  }}
                                />
                              )}
                              {active.mode === "cards" ? (
                                <small className="selected-wonder">
                                  {p.city ? `${p.city} (${p.side})` : "Wonder not selected"}
                                </small>
                              ) : (
                                <>
                                  <select
                                    aria-label={`Wonder for ${p.name}`}
                                    value={p.city}
                                    onChange={(e) => updateWonder(p.id, { city: e.target.value })}
                                  >
                                    <option value="">Choose a Wonder</option>
                                    {wonders.map((w) => <option key={w}>{w}</option>)}
                                  </select>
                                  <select
                                    className="side-select"
                                    aria-label={`Wonder side for ${p.name}`}
                                    value={p.side}
                                    onChange={(e) => updateWonder(p.id, { side: e.target.value as Player["side"] })}
                                  >
                                    <option>Day</option>
                                    <option>Night</option>
                                  </select>
                                </>
                              )}
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
                                    {active.mode === "cards" ? (
                                      <small className="calculated">{active.wonderStages?.[p.id] ?? 0} stages built</small>
                                    ) : (
                                      <NumberInput
                                        value={active.wonderStages?.[p.id] ?? 0}
                                        max={wonderStageLimit(p.city, p.side)}
                                        label={`${p.name}: Wonder stages built`}
                                        onChange={(n) => updateStages(p.id, n)}
                                      />
                                    )}
                                    <small className="calculated">
                                      {(Object.prototype.hasOwnProperty.call(active.wonderStages ?? {}, p.id) ? wonderBonus(p.city, p.side, active.wonderStages?.[p.id] ?? 0).points : p.wonder)} Wonder points
                                    </small>
                                  </>
                                ) : active.mode === "cards" && c.key === "military" ? (
                                  <div className="military-card-score">
                                    <span>{automatic[p.id].military} card shields (reference)</span>
                                    <NumberInput value={p.military} min={-100} label={`${p.name}: military points`} onChange={(n) => update(p.id, { military: n })} />
                                    <small>Enter the final result manually</small>
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
                                    = {active.mode === "cards" ? Math.floor(automatic[p.id].scoringCoins/3) : score(scoredPlayer(active,p)).treasury} points
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
                                  {best.counts.map((n) => `${n}²`).join(" + ")}{" "}
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
            <div className="page-heading"><div><span className="eyebrow">Card based scoring</span><h1>Set up your table.</h1><p>Choose the number of players to begin entering cards and scoring.</p></div><span className="edition">BASE GAME · 2ND EDITION</span></div>
            <div className="welcome panel"><div className="temple" aria-hidden="true"><div className="pediment"/><div className="columns"><i/><i/><i/><i/><i/></div><div className="steps"/></div><span className="eyebrow">Gather your civilizations</span><h2>A place for everyone at the table.</h2><label htmlFor="card-players-count">Players</label><div className="player-count" role="group" aria-label="Number of players">{[3,4,5,6,7].map(n=><button key={n} aria-pressed={count===n} className={count===n?"chosen":""} onClick={()=>setCount(n)}>{n}</button>)}</div><button className="primary" onClick={startCardMode}>Set up the table <span aria-hidden="true">→</span></button><p className="muted small">Saved automatically in this browser.</p></div>
          </>
        )}
        {tab === "Cards" && active && (
          <>
            <div className="page-heading"><div><span className="eyebrow">Card based scoring</span><h1>Count the city.</h1><p>Select built cards; adjacent seating powers guild and neighbor effects.</p></div><span className="edition">BASE GAME · 2ND EDITION</span></div>
            <div className="toolbar"><div>Seating order is clockwise, wrapping at the ends.</div></div>
            <div className="toolbar"><div><span className="status-dot"/> Game in progress <span className="muted">· {active.players.length} players{active.startedAt && <> · Started {new Date(active.startedAt).toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"})} · {formatMatchDuration(clockNow-Date.parse(active.startedAt))} elapsed</>}</span></div><div className="toolbar-actions"><button onClick={randomizeWonders}>Randomize Wonders &amp; Sides</button><button onClick={()=>confirm("Start a new table?","This discards the unfinished game. Completed results stay in History.",()=>setState(s=>({...s,active:null})))}>New game</button><button className="primary" onClick={finish}>Finish game <span aria-hidden="true">→</span></button></div></div>
            <section className="panel cards-panel seating-panel"><div className="seating-heading"><div><h2>Player positions</h2><p>Guilds count the players immediately beside you. Positions wrap around the table.</p></div><span className="clockwise">Clockwise ↓</span></div><div className="seat-grid">{(active.seats??active.players.map(p=>p.id)).map((id,i)=>{const seatIds=active.seats??active.players.map(p=>p.id);const seated=active.players.find(p=>p.id===id)!;const left=active.players.find(p=>p.id===seatIds[(i+seatIds.length-1)%seatIds.length])!;const right=active.players.find(p=>p.id===seatIds[(i+1)%seatIds.length])!;return <article className="seat-position" key={`seat-${i}`}><label>Seat {i+1}<select aria-label={`Player in seat ${i+1}`} value={id} onChange={e=>swapSeat(i,e.target.value)}>{active.players.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><div className="seat-player" style={{borderColor:seated.color}}><PlayerMark p={seated}/><input className="position-name-input" aria-label={`Name for ${seated.name}`} maxLength={30} value={seated.name} onChange={e=>update(seated.id,{name:e.target.value})} onBlur={()=>{if(!seated.name.trim())update(seated.id,{name:`Player ${active.players.indexOf(seated)+1}`})}}/></div><div className="seat-neighbors"><span title="Player to the left">← {left.name}</span><span title="Player to the right">{right.name} →</span></div></article>})}</div></section>
            <section className="panel ocr-settings"><label>OCR.space API key<input type="password" autoComplete="off" spellCheck={false} placeholder="Optional — leave blank for local OCR" value={ocrKey} onChange={e=>{const value=e.target.value;setOcrKey(value);try{localStorage.setItem(`${STORAGE}-ocrspace-key`,value)}catch{}}}/></label><small>Saved only in this browser. Scans using the key are sent to OCR.space.</small></section>
            <div className="card-player-grid">{active.players.map(p=>{const selectedCards=active.cards?.[p.id]??[];const colorOrder=["brown","gray","red","blue","green","yellow","purple"];const orderColor=(color:string)=>colorOrder.indexOf(color);const orderedSelected=selectedCards.map((card,index)=>({card,index})).sort((a,b)=>orderColor(a.card.color)-orderColor(b.card.color)||a.card.name.localeCompare(b.card.name));const totals=cardTotals(active)[p.id] as Record<string,number>;const types=colorOrder.filter(color=>cardCatalog.some(card=>card.color===color));return <section className={`panel cards-panel player-order-card ${draggedPlayerId && draggedPlayerId!==p.id ? "player-order-target" : ""}`} key={p.id} style={{borderTop:`3px solid ${p.color}`}} onDragOver={e=>{if(draggedPlayerId){e.preventDefault();e.dataTransfer.dropEffect="move"}}} onDrop={e=>{e.preventDefault();reorderPlayer(p.id)}}><h2>{p.name}<span className="player-drag-handle" draggable aria-label={`Drag ${p.name} to change view order`} title="Drag to change view order" onDragStart={e=>{e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",p.id);setDraggedPlayerId(p.id)}} onDragEnd={()=>setDraggedPlayerId(null)}>{"\u28FF"}</span></h2><div className="card-wonder-setup"><label>Wonder<select aria-label={`${p.name}: Wonder`} value={p.city} onChange={e=>updateWonder(p.id,{city:e.target.value})}><option value="">Choose a Wonder</option>{wonders.map(w=><option key={w}>{w}</option>)}</select></label><label>Side<select aria-label={`${p.name}: Wonder side`} value={p.side} onChange={e=>updateWonder(p.id,{side:e.target.value as Player["side"]})}><option>Day</option><option>Night</option></select></label><label>Stages built<NumberInput value={active.wonderStages?.[p.id]??0} max={wonderStageLimit(p.city,p.side)} label={`${p.name}: Wonder stages built`} onChange={n=>updateStages(p.id,n)}/></label></div><div className="card-add"><label className="mobile-card-picker">Card<select id={`card-${p.id}`} multiple size={6} aria-label={`${p.name}: Select cards`}>{types.map(type=><optgroup key={type} label={type}>{cardCatalog.filter(c=>c.color===type).sort((a,b)=>a.name.localeCompare(b.name)).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>)}</select></label><details className="desktop-card-picker"><summary>Select cards</summary><div className="card-picker-popup"><input className="card-picker-search" type="search" placeholder="Search cards" aria-label={`${p.name}: Search cards`} onInput={e=>{const q=e.currentTarget.value.toLowerCase();e.currentTarget.parentElement?.querySelectorAll<HTMLElement>(".card-picker-option").forEach(row=>row.hidden=!row.dataset.name?.includes(q))}}/>{types.map(type=><div className="card-picker-group" key={type}><strong>{type}</strong>{cardCatalog.filter(c=>c.color===type).sort((a,b)=>a.name.localeCompare(b.name)).map(c=><label className="card-picker-option" data-name={c.name.toLowerCase()} key={c.id}><input type="checkbox" value={c.id}/>{c.name}</label>)}</div>)}</div></details><button onClick={e=>{const root=e.currentTarget.closest(".card-add")!;const mobile=root.querySelector(`#card-${p.id}`) as HTMLSelectElement;const ids=Array.from(mobile.selectedOptions).map(o=>o.value);root.querySelectorAll<HTMLInputElement>(".desktop-card-picker input[type=checkbox]:checked").forEach(box=>ids.push(box.value));const cards=Array.from(new Set(ids)).map(id=>cardCatalog.find(c=>c.id===id)).filter((c):c is Card=>!!c);if(cards.length)setState(s=>({...s,active:s.active?{...s.active,mode:"cards",cards:{...s.active.cards,[p.id]:[...(s.active.cards?.[p.id]??[]),...cards]}}:null}));Array.from(mobile.options).forEach(o=>o.selected=false);root.querySelectorAll<HTMLInputElement>(".desktop-card-picker input[type=checkbox]").forEach(box=>box.checked=false);const popup=root.querySelector("details");if(popup)popup.open=false}}>Add cards</button></div><CardScanner playerName={p.name} apiKey={ocrKey} onAdd={cards=>setState(s=>({...s,active:s.active?{...s.active,mode:"cards",cards:{...s.active.cards,[p.id]:[...(s.active.cards?.[p.id]??[]),...cards]}}:null}))}/><ul className="selected-cards">{orderedSelected.map(({card:c,index:i})=><li className={`selected-card ${c.color}`} key={`${c.id}-${i}`}><span>{c.name}</span><button aria-label={`Remove ${c.name}`} onClick={()=>setState(s=>({...s,active:s.active?{...s.active,cards:{...s.active.cards,[p.id]:(s.active.cards?.[p.id]??[]).filter((_,j)=>j!==i)}}:null}))}>×</button></li>)}</ul><div className="auto-scores">{[["Civilian",totals.civilian],["Coins",totals.coins],["Military shields",totals.military],["Commercial",totals.commercial],["Guilds",totals.guild],["Science",totals.scientific]].map(([label,n])=><span key={String(label)}>{label}<strong>{n}</strong></span>)}</div><small className="calculated card-science-count">Science symbols: {totals.compass} compass · {totals.tablet} tablet · {totals.gear} gear · {totals.wildcards} wild</small></section>})}</div>
            <CardModeScoreboard game={active} update={update}/>
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
                          <span className="report-brand">SEVEN WONDERS · TABLE REPORT</span>
                          <span className="eyebrow">THE FINAL STANDINGS</span>
                          <h2>A civilization well built.</h2>
                          <p className="report-meta">{new Date(game.completedAt!).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })} · {game.players.length} players{game.startedAt && <> · Started {new Date(game.startedAt).toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"})} · Match length {formatMatchDuration(Date.parse(game.completedAt!)-Date.parse(game.startedAt))}</>}</p>
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
                      {game.mode === "cards" && (
                        <section className="report-card-choices">
                          <h3>Cards played</h3>
                          <div className="report-card-grid">
                            {game.players.map((p) => (
                              <div className="report-card-player" key={p.id}>
                                <h4>{p.name}</h4>
                                {(game.cards?.[p.id] ?? []).length ? (
                                  <ul>{game.cards![p.id].map((card, i) => <li key={`${card.id}-${i}`}>{card.name}</li>)}</ul>
                                ) : <small>No cards recorded</small>}
                              </div>
                            ))}
                          </div>
                        </section>
                      )}
                      <div className="history-actions">
                        <button className="print-report" onClick={() => window.print()}>Print report</button>
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
