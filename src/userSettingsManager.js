import { app } from "electron";
import path from "path";
import fs from "fs";

const userDataPath = app.getPath("userData");
const userSettingsPath = path.join(userDataPath, "settings.json");

const emptySettings = {
  blocked: [],
  liked: [],
};

class userSettingsManager {
  constructor() {
    if (!fs.existsSync(userDataPath)) fs.mkdirSync(userDataPath);
    if (!fs.existsSync(userSettingsPath)) {
      fs.writeFileSync(userSettingsPath, JSON.stringify(emptySettings));
      this.settings = emptySettings;
    } else {
      this.settings = JSON.parse(fs.readFileSync(userSettingsPath));
    }

    this.settings.blocked = new Set(this.settings.blocked);
    this.settings.liked = new Set(this.settings.liked);
  }
  saveSettings() {
    fs.writeFileSync(
      userSettingsPath,
      JSON.stringify({
        ...this.settings,
        blocked: Array.from(this.settings.blocked),
        liked: Array.from(this.settings.liked),
      })
    );
  }
  updateSetting(setting, value) {
    this.settings[setting] = value;
    this.saveSettings();
  }
  likeSummoner(summonerId) {
    if (this.settings.liked.has(summonerId)) {
      this.settings.liked.delete(summonerId);
    } else {
      this.settings.liked.add(summonerId);
    }
    this.saveSettings();
  }
  blockSummoner(summonerId) {
    console.log({ before: this.settings.blocked });
    if (this.settings.blocked.has(summonerId)) {
      this.settings.blocked.delete(summonerId);
    } else {
      this.settings.blocked.add(summonerId);
    }
    console.log({ after: this.settings.blocked });
    this.saveSettings();
  }
}

export default userSettingsManager;
