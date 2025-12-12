import { store } from "../main.js";
import { embed } from "../util.js";
import { score } from "../score.js";
import { fetchEditors, fetchList } from "../content.js";
import Spinner from "../components/Spinner.js";
import LevelAuthors from "../components/List/LevelAuthors.js";

const roleIconMap = {
  owner: "crown",
  admin: "user-gear",
  helper: "user-shield",
  dev: "code",
  trial: "user-lock",
};

export default {
  components: { Spinner, LevelAuthors },
  data: () => ({
    list: [],
    editors: [],
    loading: true,
    selected: 0,
    errors: [],
    searchQuery: "",
    roleIconMap,
    store,
  }),
  computed: {
    filteredList() {
      if (!this.searchQuery) return this.list;
      return this.list.filter(([level, err]) => {
        if (!level || !level.name) return false;
        return level.name.toLowerCase().includes(this.searchQuery.toLowerCase());
      });
    },
    selectedLevel() {
      return this.filteredList[this.selected]
        ? this.filteredList[this.selected][0]
        : null;
    },
    // Compute the original rank (index) in the full list for display purposes.
    selectedIndexInFullList() {
      if (!this.selectedLevel) return this.selected + 1;
      return (
        this.list.findIndex(
          (item) => item[0] && item[0].id === this.selectedLevel.id
        ) + 1
      );
    },
  },
  watch: {
    // Reset the selected index when the search query changes.
    searchQuery() {
      this.selected = 0;
    },
  },
  methods: {
    embed,
    score,
    getOriginalRank(level) {
      let index = this.list.findIndex(
        (item) => item[0] && item[0].id === level.id
      );
      return index >= 0 ? index + 1 : this.selected + 1;
    },
  },
  async mounted() {
    this.list = await fetchList();
    this.editors = await fetchEditors();
    if (!this.list) {
      this.errors = [
        "Failed to load list. Retry in a few minutes or notify list staff.",
      ];
    } else {
      this.errors.push(
        ...this.list
          .filter(([_, err]) => err)
          .map(([_, err]) => `Failed to load level. (${err}.json\nsomeone probably forgot to put a value somewhere)`)
      );
      if (!this.editors) {
        this.errors.push("Failed to load list editors.");
      }
    }
    this.loading = false;
  },
  template: `
    <main v-if="loading">
      <Spinner></Spinner>
    </main>
    <main v-else class="page-list">
      <div class="list-container">
        <!-- Search Bar -->
        <div class="search-bar">
          <input type="text" v-model="searchQuery" placeholder="Search levels..." />
        </div>
        <table class="list" v-if="filteredList.length">
          <tr v-for="(item, i) in filteredList" :key="i">
            <td class="rank">
              <p v-if="getOriginalRank(item[0]) <= 200" class="type-label-lg">
                #{{ getOriginalRank(item[0]) }}
              </p>
              <p v-else class="type-label-lg">Legacy</p>
            </td>
            <td class="level" :class="{ 'active': selected === i, 'error': !item[0] }">
              <button @click="selected = i">
                <span class="type-label-lg">
                  {{ item[0]?.name || \`Error (\${item[1]}.json)\` }}
                </span>
                <span class="type-label-lg">
                  {{ item[0]?.decimalDiff || \`Error (\${item[1]}.json)\` }}
                </span>
              </button>
            </td>
          </tr>
        </table>
        <p v-if="filteredList.length === 0">No levels match your search.</p>
      </div>
      <div class="level-container" v-if="selectedLevel">
        <div class="level">
          <h1>{{ selectedLevel.name }}</h1>
          <LevelAuthors :author="selectedLevel.author" :creators="selectedLevel.creators" :verifier="selectedLevel.verifier"></LevelAuthors>
          <p>{{ selectedLevel.description || 'No description was provided for this tower yet'}}</p>
          <p>{{ "Skillsets: " + selectedLevel.skillsets || 'No skillsets have been added for this tower yet'}}</p>
          <iframe class="video" id="videoframe" :src="embed(selectedLevel.showcase || selectedLevel.verification)" frameborder="0"></iframe>
          <ul class="stats">
            <li>
              <div class="type-title-sm">Points when completed</div>
              <p>
                {{
                  score(getOriginalRank(selectedLevel), 100, selectedLevel.floorToQualify)
                }}
              </p>
            </li>
            <li>
              <div class="type-title-sm">ID</div>
              <p>{{ selectedLevel.id }}</p>
            </li>
            <li>
              <div class="type-title-sm">DIFFICULTY</div>
              <p>{{ selectedLevel.difficulty || 'Any' }}</p>
            </li>
            <li>
              <div class="type-title-sm">DIFFICULTY RATING</div>
              <p>{{ selectedLevel.decimalDiff || 'Any' }}</p>
            </li>
            <li>
              <div class="type-title-sm">SYMBOLS</div>
              <p>{{ selectedLevel.symbols || 'None' }}</p>
            </li>
            <li>
              <div class="type-title-sm">VERSION</div>
              <p>{{ selectedLevel.version || 'Any' }}</p>
            </li>
          </ul>
          <h2>Records</h2>
          <p v-if="selectedIndexInFullList <= 100">
            Reach floor <strong>{{ selectedLevel.floorToQualify }}</strong> to qualify
          </p>
          <p v-else-if="selectedIndexInFullList <= 200">
            <strong>100%</strong> to qualify
          </p>
          <p v-else>This level does not accept new records.</p>
          <table class="records">
            <tr v-for="record in selectedLevel.records" class="record">
              <td class="percent">
                <p>Floor {{ record.floor }}</p>
              </td>
              <td class="user">
                <a :href="record.link" target="_blank" class="type-label-lg">{{ record.user }}</a>
              </td>
              <td class="mobile">
                <img v-if="record.mobile" :src="\`/assets/phone-landscape\${store.dark ? '-dark' : ''}.svg\`" alt="Mobile">
              </td>
              <td>
                <p>{{ record.hz }}</p>
              </td>
            </tr>
          </table>
        </div>
      </div>
      <div v-else class="level" style="height: 100%; justify-content: center; align-items: center;">
        
      </div>
      <div class="meta-container">
        <div class="meta">
          <div class="errors" v-show="errors.length > 0">
            <p class="error" v-for="error of errors">{{ error }}</p>
          </div>
          <div class="og">
            <p class="type-label-md">
              Website layout made by
              <a href="https://tsl.pages.dev/" target="_blank">TheShittyList</a>
            </p>
            <br>
            <p class="type-label-md">
              Website search bar and packs made by
              <a href="https://consistencychallenge.pages.dev/#/" target="_blank">CCL</a>
            </p>
            <br>
            <p class="type-label-md">
              Additional help from 
              <a href="https://www.youtube.com/@ChefGD1" target="_blank">ChefGD</a>
            </p>
          </div> 
          <template v-if="editors">
            <h3>List Editors</h3>
            <ol class="editors">
              <li v-for="editor in editors" :key="editor.name">
                <img :src="\`/assets/\${roleIconMap[editor.role]}\${store.dark ? '-dark' : ''}.svg\`" :alt="editor.role">
                <a v-if="editor.link" class="type-label-lg link" target="_blank" :href="editor.link">{{ editor.name }}</a>
                <p v-else>{{ editor.name }}</p>
              </li>
            </ol>
          </template>
        <p>Official list for GDToH.</p>
        <h3>Legend</h3>
        <p>↓ = nerfed</p>
        <p>↑ = buffed</p>
        <p>⇑ = difficulty placed higher than original</p>
        <p>⇓ = difficulty placed lower than original</p>
        <p>✔ = whitelisted</p>
        <h3>Soul Crushing Difficulties:</h3>
        <p>🟂 Insane</p>
        <p>✦ Extreme</p>
        <p>★ Terrifying</p>
        <p>✶ Catastrophic</p>
        <p>✷ Horrific</p>
        <p>✸ Unreal</p>
        <p>✹ Nil</p>
        <h3>Level Requirements</h3>
        <p>Level must be submitted, may not have to be whitelisted.</p>
        <p>Level must be at least 5 floors long.</p>
		    <p>Level must be physically possible.</p>
		    <p>Level must have a somewhat definitive difficulty.</p>
        <p>Towers must have a somewhat moderate amount of quality, or be historically significant to the game. No, your shitty "new top 1" doesn't count as historically significant.</p>
		    <h3>Submission Requirements</h3>
        <p>Please provide recordings of completions or verifications, also only SC Towers will be added to this list as of right now.</p>
        </div>
      </div>
    </main>
  `,
};
