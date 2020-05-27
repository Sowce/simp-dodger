<script>
import Fragment from "./fragment";
import { ipcRenderer, remote } from "electron";

export default {
  computed: {
    profileIconURL() {
      return `https://ddragon.leagueoflegends.com/cdn/${this.lastVersion}/img/profileicon/${this.summonerInfos.profileIconId}.png`;
    },
    teamList() {
      let team = this.sessionInfos?.myTeam;

      if (!team) return null;

      return team.map((teamMember) => ({
        ...teamMember,
        blocked: this.settings.blocked.has(teamMember.summonerId),
        liked: this.settings.liked.has(teamMember.summonerId),
      }));
    },
  },
  data: function() {
    return {
      checkInterval: 0,
      summonerInfos: null,
      sessionInfos: {},
      champions: [],
      lastVersion: "",
      sessionInterval: null,
      settings: {},
    };
  },
  mounted() {
    let newSettings = ipcRenderer.sendSync("fetchSettings");
    this.settings = {
      ...newSettings,
      blocked: new Set(newSettings.blocked),
      liked: new Set(newSettings.liked),
    };

    this.initSummonerInfos();
    ipcRenderer.on("lostClient", () => {
      this.summonerInfos = null;
      this.sessionInfos = {};
      clearInterval(this.sessionInterval);
      this.initSummonerInfos();
    });
  },
  methods: {
    initSummonerInfos() {
      this.lastVersion = ipcRenderer.sendSync("fetchLastVersion");
      this.summonerInfos = ipcRenderer.sendSync("fetchLoLClient");
      if (!this.summonerInfos) {
        return setTimeout(this.initSummonerInfos, 5000);
      }
      this.refreshSession();
      this.champions = ipcRenderer.sendSync("fetchChampions");
    },
    refreshSession() {
      this.sessionInfos = ipcRenderer.sendSync("fetchSession");
      this.sessionInterval = setTimeout(this.refreshSession, 5000);
    },
    championInfos(id) {
      return this.champions.find((champion) => champion.key == id);
    },
    championPicture(imgName) {
      return `https://ddragon.leagueoflegends.com/cdn/${this.lastVersion}/img/champion/${imgName}`;
    },
    minimizeApp() {
      remote.getCurrentWindow().minimize();
    },
    closeApp() {
      remote.getCurrentWindow().close();
    },
    teamMemberBackground(teamMember) {
      if (teamMember.championId === 0) return "";
      let skinId = teamMember.selectedSkinId % 1000;
      let championName = this.championInfos(teamMember.championId).id;
      let url = `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${championName}_${skinId}.jpg`;

      return `background-image: url("${url}");`;
    },
    blockSummoner(summonerId) {
      let newSettings = ipcRenderer.sendSync("blockSummoner", summonerId);
      this.settings = {
        ...newSettings,
        blocked: new Set(newSettings.blocked),
        liked: new Set(newSettings.liked),
      };
    },
    likeSummoner(summonerId) {
      let newSettings = ipcRenderer.sendSync("likeSummoner", summonerId);
      this.settings = {
        ...newSettings,
        blocked: new Set(newSettings.blocked),
        liked: new Set(newSettings.liked),
      };
    },
  },
  components: { Fragment },
};
</script>

<template>
  <div id="app" v-cloak>
    <Fragment v-if="summonerInfos">
      <div class="profile">
        <div class="actionButtons">
          <div class="drag">&nbsp;</div>
          <div class="btn minimize" @click="minimizeApp">
            <font-awesome-icon icon="window-minimize" />
          </div>
          <div class="btn close" @click="closeApp">
            <font-awesome-icon icon="times" />
          </div>
        </div>
        <div class="summoner-icon">
          <div class="summoner-level-container">
            <div class="summoner-level">{{ summonerInfos.summonerLevel }}</div>
          </div>
          <img :src="profileIconURL" alt="" />
        </div>
        <div class="infos">
          <div class="summoner-name">{{ summonerInfos.displayName }}</div>
          <div>
            XP:
            {{ summonerInfos.xpSinceLastLevel }}/{{
              summonerInfos.xpUntilNextLevel
            }}
            ({{ summonerInfos.percentCompleteForNextLevel }}%)
          </div>
        </div>
      </div>

      <div class="teamList" v-if="teamList">
        <div
          :class="
            `teamMember team-${teamMember.team} ${
              teamMember.blocked ? 'blocked' : ''
            } ${teamMember.liked ? 'liked' : ''}`
          "
          v-for="(teamMember, index) in teamList"
          :key="index"
        >
          <div class="background" :style="teamMemberBackground(teamMember)">
            &nbsp;
          </div>
          <div class="champion-picture">
            <img
              v-if="teamMember.championId !== 0"
              :src="
                championPicture(championInfos(teamMember.championId).image.full)
              "
              alt=""
            />
            <div class="noChampionSelected" v-else>
              <font-awesome-icon icon="question" />
            </div>
          </div>

          <div class="infos">
            <div class="summoner-name">
              {{ teamMember.displayName }}
            </div>
            <div class="actions">
              <div class="action" @click="blockSummoner(teamMember.summonerId)">
                <i>
                  <font-awesome-icon icon="user-lock" />
                </i>
                <span>
                  {{ teamMember.blocked ? "Unblock" : "Block" }}
                </span>
              </div>
              <div class="action" @click="likeSummoner(teamMember.summonerId)">
                <i>
                  <font-awesome-icon icon="thumbs-up" />
                </i>
                <span>
                  Like
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="noTeam" v-else>
        Waiting to enter Champion Select...
      </div>
    </Fragment>
    <Fragment v-else>
      <div class="actionButtons">
        <div class="drag">&nbsp;</div>
        <div class="btn minimize" @click="minimizeApp">
          <font-awesome-icon icon="window-minimize" />
        </div>
        <div class="btn close" @click="closeApp">
          <font-awesome-icon icon="times" />
        </div>
      </div>
      <div class="noClient">
        <div>
          <font-awesome-icon icon="circle-notch" size="3x" spin />
        </div>
        <div class="content">Waiting for League Client...</div>
      </div>
    </Fragment>
  </div>
</template>

<style>
:root {
  --profile-height: 114px;
}

body {
  color: white;
  background-color: #101112;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  min-height: 100vh;
  margin: 0 !important;
  -webkit-user-select: none;
}

.noTeam {
  animation: fadein 1s;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.25em;
  height: calc(100vh - var(--profile-height));
}

.actionButtons {
  position: fixed;
  right: 0px;
  top: 0px;
  z-index: 500;
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 38px;
}

.actionButtons .btn {
  padding: 0.5em 1em;
  transition: all 250ms ease-in;
  background: transparent;
  -webkit-app-region: no-drag;
}

.actionButtons .drag {
  flex-grow: 1;
  -webkit-app-region: drag;
}

.actionButtons .btn.close:hover {
  background: red;
}

.actionButtons .btn.minimize:hover {
  background: darkcyan;
}

.teamList {
  animation: fadein 1s;
  height: calc(100vh - var(--profile-height));
  display: flex;
  flex-wrap: nowrap;
  justify-content: flex-start;
  align-items: center;
  flex-direction: column;
  gap: 0.5em;
}

.teamMember {
  animation: fadein 1s;
  border-bottom: 1px solid black;
  /* padding: 0.5em; */
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  height: 85px;
  width: 100vw;
  z-index: 1;
}

.teamMember .background {
  width: 100vw;
  background-size: cover;
  position: absolute;
  left: 0px;
  z-index: 0;
  height: 85px;
  filter: brightness(55%);
}

.teamMember .infos .summoner-name {
  transition: color 250ms linear;
  font-size: 1.5em;
  z-index: 1;
  padding-top: 0.5em;
}

.teamMember.blocked .infos .summoner-name,
.teamMember.blocked.liked .infos .summoner-name {
  color: rgb(255, 46, 46);
}

.teamMember.liked .infos .summoner-name {
  color: hsl(197, 73%, 41%);
}

.teamMember img {
  border-radius: 50%;
  box-sizing: border-box;
  height: 64px;
  width: 64px;
  z-index: 1;
}

.profile {
  animation: fadein 1.5s;
  height: var(--profile-height);
  width: 100%;
  display: flex;
  flex-wrap: nowrap;
  flex-direction: row;
  gap: 0.5em;
  background: hsl(197, 71%, 8%);
  background: linear-gradient(
    0deg,
    hsl(197, 71%, 8%) 0%,
    hsl(197, 71%, 20%) 100%
  );
  color: rgb(219, 217, 212);
  padding: 1em;
  -webkit-app-region: drag;
  box-sizing: border-box;
  border-bottom: 2px solid rgba(92, 92, 92, 0.25);
}

.profile img {
  border-radius: 50%;
  height: 75px;
  width: 75px;
  box-sizing: border-box;
  border: 3px solid #d0a85c;
}

.profile .summoner-level-container {
  position: absolute;
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  justify-content: center;
  width: 75px;
  height: 75px;
  /* margin-top: 100px; */
}

.profile .summoner-level {
  box-sizing: border-box;
  text-align: center;
  padding: 0.25em 0.5em;
  background: #363636;
  border: 2px solid #d0a85c;
  border-radius: 15%;
  font-size: 0.75em;
  opacity: 0.8;
  transform: translateY(25%);
}

.teamMember .infos {
  flex-grow: 1;
  margin-left: 1em;
  display: flex;
  flex-wrap: nowrap;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.5em;
}

.profile .infos {
  margin-left: 1em;
  display: flex;
  flex-wrap: nowrap;
  flex-direction: column;
  justify-content: center;
  gap: 1em;
  z-index: 1;
}

.profile .infos .summoner-name {
  font-size: 2em;
}

.teamMember .champion-picture {
  height: 64px;
  width: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: black;
  border: 2px solid #d0a85c;
  z-index: 1;
  margin: 0.5em 0em 0.5em 0.5em;
}

.teamMember .infos .actions {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  z-index: 1;
}

.teamMember .infos .actions .action {
  width: 140px;
  background-color: #1e2328;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.15em;
  transition: all 250ms ease-out;
  border: 1px solid;
  border-image-slice: 1;
  border-width: 1px;
  border-style: solid;
  border-image-source: linear-gradient(to bottom, #c3a464, #6b5028);
  transform: translateY(-10px);
}

.teamMember .infos .actions .action:hover {
  background-color: rgba(92, 92, 92, 0.5);
}

.teamMember .infos .actions .action :first-child {
  margin-right: 0.2em;
}

.noClient {
  width: 100%;
  height: -webkit-fill-available;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.noClient .content {
  margin-top: 1em;
  font-size: 1em;
  color: white;
}

@keyframes fadein {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

#app:not([v-cloak]) {
  animation: fadein 1s;
}

#app[v-cloak] {
  display: none;
}
</style>
