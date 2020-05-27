"use strict";

import { app, protocol, BrowserWindow, ipcMain } from "electron";
import {
  createProtocol,
  /* installVueDevtools */
} from "vue-cli-plugin-electron-builder/lib";

import https from "https";
import fetch from "node-fetch";
import path from "path";
import fs from "fs";
import userSettingsManager from "./userSettingsManager";

const userSettings = new userSettingsManager();

const isDevelopment = process.env.NODE_ENV !== "production";

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { secure: true, standard: true } },
]);

const agent = new https.Agent({
  rejectUnauthorized: false,
});

let lolURL;
let lastVersion;
let champions = [];

ipcMain.on("fetchChampions", async (event) => {
  if (!lolURL) lolURL = fetchLoLClient();
  if (!lastVersion) await fetchLatestVersion();

  if (champions.length > 0) return (event.returnValue = champions);

  let response = await fetch(
    `https://ddragon.leagueoflegends.com/cdn/${lastVersion}/data/en_US/champion.json`,
    {
      agent,
    }
  );
  let data = await response.json();

  champions = Array.from(Object.values(data.data));
  event.returnValue = champions;
});

ipcMain.on("fetchLoLClient", async (event) => {
  try {
    lolURL = fetchLoLClient();
    let response = await fetch(makeURL("lol-summoner/v1/current-summoner"), {
      agent,
    });
    let data = await response.json();
    event.returnValue = data;
  } catch (err) {
    console.error(err);
    event.returnValue = null;
  }
});

ipcMain.on("fetchSettings", (event) => {
  console.log({ from: userSettings.settings });

  event.returnValue = {
    ...userSettings.settings,
    blocked: Array.from(userSettings.settings.blocked),
    liked: Array.from(userSettings.settings.liked),
  };
});

ipcMain.on("blockSummoner", (event, summonerId) => {
  userSettings.blockSummoner(summonerId);
  event.returnValue = {
    ...userSettings.settings,
    blocked: Array.from(userSettings.settings.blocked),
    liked: Array.from(userSettings.settings.liked),
  };
});
ipcMain.on("likeSummoner", (event, summonerId) => {
  userSettings.likeSummoner(summonerId);
  event.returnValue = {
    ...userSettings.settings,
    blocked: Array.from(userSettings.settings.blocked),
    liked: Array.from(userSettings.settings.liked),
  };
});

ipcMain.on("fetchLocale", async (event) => {
  if (!lolURL) lolURL = fetchLoLClient();
  if (!lastVersion) await fetchLatestVersion();

  let response = await fetch(makeURL("riotclient/region-locale"), {
    agent,
  });
  let data = await response.json();

  if (data.errorCode) return (event.returnValue = null);

  event.returnValue = data;
});

ipcMain.on("fetchLastVersion", async (event) => {
  if (!lastVersion) await fetchLatestVersion();
  event.returnValue = lastVersion;
});

ipcMain.on("fetchSession", async (event) => {
  console.log("fetchSession");
  try {
    if (!lolURL) lolURL = fetchLoLClient();
    if (!lastVersion) await fetchLatestVersion();

    let response = await fetch(makeURL("lol-champ-select/v1/session"), {
      agent,
    });
    let data = await response.json();
    if (data.errorCode) return (event.returnValue = null);
    if ("myTeam" in data) {
      for (let i in data.myTeam) {
        data.myTeam[i] = {
          ...data.myTeam[i],
          displayName: (await getSummonerInfos(data.myTeam[i].summonerId))
            .displayName,
        };
      }
    }
    event.returnValue = data;
  } catch (err) {
    console.error("Sessions lost");
    event.returnValue = null;
    event.sender.send("lostClient");
  }
});

const getSummonerInfos = async (summonerId) => {
  if (summonerId == 0) return { displayName: "Bot" };
  if (!lolURL) lolURL = fetchLoLClient();
  if (!lastVersion) await fetchLatestVersion();
  let response = await fetch(
    makeURL(`lol-summoner/v1/summoners/${summonerId}`),
    {
      agent,
    }
  );
  return await response.json();
};

const makeURL = (path) => `https://${lolURL}/${path}`;

const fetchLatestVersion = async () => {
  console.log("fetchLatestVersion");
  if (!lolURL) lolURL = fetchLoLClient();

  let response = await fetch(
    "https://ddragon.leagueoflegends.com/api/versions.json",
    { agent }
  );
  let data = await response.json();
  lastVersion = data[0];
};

const fetchLoLClient = () => {
  console.log("fetchLoLClient");
  let files = fs.readdirSync(
    "C:/Riot Games/League of Legends/Logs/LeagueClient Logs"
  );

  files = files.filter((fileName) => fileName.includes("LeagueClientUx.log"));

  files.sort();
  files.reverse();

  let logs = fs.readFileSync(
    `C:/Riot Games/League of Legends/Logs/LeagueClient Logs/${files[0]}`
  );

  let adresses = String(logs).match(/riot:[a-z0-9\-_]+@127.0.0.1:[0-9]+/gi);

  if (!adresses) {
    let tokens = String(logs).match(/--remoting-auth-token=[a-z0-9-_]+/gi);
    let ports = String(logs).match(/--riotclient-app-port=[0-9]+/gi);

    let port = ports[ports.length - 1].split("=")[1];
    let token = tokens[tokens.length - 1].split("=")[1];
    let addr = `riot:${token}@127.0.0.1:${port}`;

    return addr;
  }

  return adresses[adresses.length - 1];
};

function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
    width: 400,
    height: 539,
    frame: false,
    icon: path.join(__static, "icon.png"),
    resizable: false,
    backgroundColor: "#101112",
    maximizable: false,
    titleBarStyle: "customButtonsOnHover",
    webPreferences: {
      nodeIntegration: true,
    },
  });

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    win.loadURL(process.env.WEBPACK_DEV_SERVER_URL);
    if (!process.env.IS_TEST) win.webContents.openDevTools();
  } else {
    createProtocol("app");
    // Load the index.html when not in development
    win.loadURL("app://./index.html");
  }

  win.on("closed", () => {
    win = null;
  });
}

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
});

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.on("ready", async () => {
    if (isDevelopment && !process.env.IS_TEST) {
      // Install Vue Devtools
      // Devtools extensions are broken in Electron 6.0.0 and greater
      // See https://github.com/nklayman/vue-cli-plugin-electron-builder/issues/378 for more info
      // Electron will not launch with Devtools extensions installed on Windows 10 with dark mode
      // If you are not using Windows 10 dark mode, you may uncomment these lines
      // In addition, if the linked issue is closed, you can upgrade electron and uncomment these lines
      // try {
      //   await installVueDevtools()
      // } catch (e) {
      //   console.error('Vue Devtools failed to install:', e.toString())
      // }
    }
    createWindow();
  });
}
// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === "win32") {
    process.on("message", (data) => {
      if (data === "graceful-exit") {
        app.quit();
      }
    });
  } else {
    process.on("SIGTERM", () => {
      app.quit();
    });
  }
}
