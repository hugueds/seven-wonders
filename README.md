# 7 Wonders Table Companion

An unofficial companion for the **second edition base game**, used on one shared screen: searchable rules, endgame scoring, and game history.

## Run locally

Requires Node.js 22.12 or newer and npm.

After pushing this project to GitHub, clone it on your personal computer:

```sh
git clone https://github.com/YOUR-USERNAME/seven-wonders.git
cd seven-wonders
```

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). To share it with another device on the same home network, use the Network URL printed by Vite. The server already listens on all network interfaces. Your computer must allow incoming TCP connections on that port. Running directly on your personal computer avoids the company WSL firewall restriction. Game data is saved separately in each browser.

```sh
npm test
npm run build
npm run preview
```

For browser checks, install Chromium once and run:

```sh
npx playwright install chromium
npm run test:e2e
```

An existing Chromium executable can also be selected through `CHROMIUM_PATH`.

## At the table

Choose 3–7 players on the Scoreboard, then edit their names, colors, and optional Wonder selections. Play with the physical game and enter final scores when ready. Enter actual coins in Treasury, and counts of science symbols in Science. Wildcards are automatically assigned for the highest score. Enter guild points without counting scientific symbols a second time.

Scores update as you type. Invalid or empty numeric edits revert to the previous valid value when leaving the field. Finish game saves a snapshot to History; a rematch keeps the players and clears all score inputs. Rules remain accessible while scoring. The table scrolls horizontally on smaller screens.

## Saving

Active scores and finished games save automatically to this browser's local storage. Returning to the same app URL restores them. There are no accounts or server synchronization. Clearing browser data removes saved games, and private browsing may not retain them. A notice appears if browser storage cannot be used. Changing the app's host or port uses a different browser storage location.

## Rules and attribution

The Markdown reference is an original summary, with links to [Repos Production's official resources](https://www.rprod.com/en/games/7-wonders) and [FAQ](https://www.rprod.com/en/7-wonders/faq). Setup, trading, endgame scoring, and ties were cross-checked against the [accessible second edition rules](https://www.64ouncegames.com/pages/7-wonderssecond-editon). It is not a complete transcription of the publisher's rulebook. 7 Wonders was designed by Antoine Bauza and is published by Repos Production.

The app uses React, TypeScript, and Vite. Scoring is kept in pure functions; persisted state is versioned and validated on loading. No external API is required. Optional Google Fonts fall back to locally installed serif and sans-serif fonts when unavailable.
