#!/usr/bin/env node

import { readFile } from "fs/promises";
import { spawnSync, spawn } from "child_process";

import chokidar from "chokidar";
import { WebSocketServer, WebSocket } from "ws";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const lastEvent = async function (eventfile) {
  const content = await readFile(eventfile);
  const lines = content.toString().trim().split("\n");
  const lastLine = lines[lines.length - 1];
  const [, event] = lastLine.split("]");

  return event;
};

yargs(hideBin(process.argv))
  .command({
    command: "start-events-server [eventfile]",
    desc: "Start events server",

    builder: (yargs) => {
      yargs
        .option("port", {
          type: "number",
          default: 9000,
          describe: "The port the events server will be listening on",
        })
        .positional("eventfile", {
          type: "string",
          describe: "The file to watch for events",
        });
    },

    handler: async ({ port, eventfile }) => {
      const wss = new WebSocketServer({ port });

      wss.on("connection", async (socket) => {
        console.log("Connected to UI");
      });

      const watcher = chokidar.watch(eventfile);
      watcher.on("change", async () => {
        const event = await lastEvent(eventfile);
        console.log("Event file changed, latest event detected:", event);

        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ event }));
          }
        });
      });
    },
  })
  .command({
    command: "start-ui-server",
    desc: "Start UI server",

    builder: (yargs) => {
      yargs.option("port", {
        type: "number",
        default: 3000,
        describe: "The port the events server will be listening on",
      });
    },

    handler: ({ port }) => {
      spawnSync("rm -rf ea-lcd", {
        cwd: process.cwd(),
        stdio: "inherit",
        shell: true,
      });

      spawnSync("git clone https://github.com/brianle1301/ea-lcd", {
        cwd: process.cwd(),
        stdio: "inherit",
        shell: true,
      });

      spawnSync("cd ea-lcd", {
        cwd: process.cwd(),
        stdio: "inherit",
        shell: true,
      });

      spawnSync("npm install", {
        cwd: process.cwd() + "/ea-lcd",
        stdio: "inherit",
        shell: true,
      });

      spawnSync("npm run build", {
        cwd: process.cwd() + "/ea-lcd",
        stdio: "inherit",
        shell: true,
      });

      spawn(`npx serve -s build -p ${port}`, {
        cwd: process.cwd() + "/ea-lcd",
        stdio: "inherit",
        shell: true,
      });
    },
  })
  .help().argv;