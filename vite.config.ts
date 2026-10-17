import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";

const certificateDirectory = ".certificates";
const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const pagesBase = process.env.GITHUB_ACTIONS === "true" && repositoryName
  ? `/${repositoryName}/`
  : "/";

export default defineConfig(({ command }) => ({
  base: pagesBase,
  plugins: [react()],
  ...(command === "serve"
    ? {
        server: {
          host: "0.0.0.0",
          port: 443,
          strictPort: true,
          https: {
            pfx: readFileSync(`${certificateDirectory}/sevenwonders.pfx`),
            passphrase: readFileSync(`${certificateDirectory}/sevenwonders.password`, "utf8").trim(),
          },
          allowedHosts: ["sevenwonders.tplinkdns.com"],
        },
      }
    : {}),
}));
