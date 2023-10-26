#!/usr/bin/env node

import { readFile } from "fs/promises";
import { spawnSync, spawn } from "child_process";

import chokidar from "chokidar";
import { WebSocketServer, WebSocket } from "ws";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const readEventFile = async function (eventfile) {
  const content = await readFile(eventfile);
  const lines = content.toString().trim().split("\n");
  const events = lines.map((line) => line.trim().split("]")[1]);
  return events;
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

        socket.on("message", async (data) => {
          if (data.toString() === "INITIAL_STATE") {
            const events = await readEventFile(eventfile);

            // Find the initial state

            for (let i = events.length - 1; i >= 0; i--) {
              const event = events[i];
              if (event === "Sitted" || event.startsWith("Stand Up")) {
                console.log("Initial State: ", event);
                socket.send(
                  JSON.stringify({
                    initialState: event.startsWith("Stand Up")
                      ? "Stand Up"
                      : "Sitted",
                  })
                );
                break;
              }
            }
          }
        });
      });

      const watcher = chokidar.watch(eventfile);
      watcher.on("change", async () => {
        const events = await readEventFile(eventfile);
        const type = events[events.length - 1];
        console.log("Event file changed, latest event detected:", type);

        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type }));
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

      yargs.option("no-clone", {
        type: "boolean",
        default: false,
        describe: "Whether to clone the repo",
      });
    },

    handler: ({ port, noClone }) => {
      if (!noClone) {
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
      }

      spawn(`npx serve -s build -p ${port}`, {
        cwd: process.cwd() + "/ea-lcd",
        stdio: "inherit",
        shell: true,
      });
    },
  })
  .help()
  .parserConfiguration({ "boolean-negation": false }).argv;
