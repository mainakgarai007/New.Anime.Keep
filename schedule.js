/**
 * Anime.Keep - Release Schedule Module Engine
 * -----------------------------------------------------------------------------
 * Architect: Senior JavaScript Engineer & Anime API Expert
 * Inspired by: AniList, LiveChart, Crunchyroll Calendar
 * * This module handles automated synchronization with the Jikan API (MAL),
 * manages offline HTML5 localStorage caches, controls UI transitions for 
 * skeleton loaders and modal detail drawers, runs real-time countdown loops,
 * and handles advanced timezone conversions.
 */

// Global constant keys & configurations
const JIKAN_API_ROOT = "https://api.jikan.moe/v4";
const LOCAL_STORAGE_CACHE_KEY = "anime_keep_schedule_cache";
const LOCAL_STORAGE_FAV_KEY = "anime_keep_reminders";
const LOCAL_STORAGE_PREF_KEY = "anime_keep_user_preferences";

// App state management container
let scheduleState = {
  weeklyData: [],       // All weekly airing shows fetched from API
  upcomingData: [],     // Pre-fetched upcoming seasonal releases
  filteredPool: [],     // Derived list after applying active filters
  favoritesList: [],    // Array of bookmarked anime ID integers
  activeTab: 'today',   // Current view filter: today, tomorrow, weekly, upcoming, trending, favorites
  activeDay: '',        // active day of week for the weekly schedule tab
  activeLang: 'all',    // audio tracks filter: all, sub, eng, hin, ben, multi
  activeFormat: 'ALL',  // media structure filter: ALL, tv, movie, ova, ona, special
  searchQuery: '',      // input query text search filter
  activeGenre: '',      // genre filter keyword string
  useLocalTimezone: true, // boolean toggle to shift JST to client local timezone
  lastSyncTimestamp: null,
  countdownIntervalId: null
};

// DOM references mapping
let domElements = {};

/**
 * Initialize core application lifecycle on DOM load.
 */
document.addEventListener("DOMContentLoaded", async () => {
  cacheDomElements();
  loadLocal(); // Hydrate user preferences and offline structures
  setDefaultDay();
  bindInteractiveUiEvents();
  
  // Load and render datasets
  await loadToday();
  
  // Initialize dynamic ticking processes
  startGlobalCountdownLoop();
  updateStorageStatsUi();
});

/**
 * Select and store active DOM nodes inside memory lookup map.
 */
function cacheDomElements() {
  domElements = {
    grid: document.getElementById('anime-cards-grid'),
    skeleton: document.getElementById('loading-skeleton-container'),
    emptyState: document.getElementById('empty-state-container'),
    emptyStateText: document.getElementById('empty-message-desc'),
    errorState: document.getElementById('error-state-container'),
    tabButtons: document.querySelectorAll('.schedule-tab-btn'),
    langButtons: document.querySelectorAll('.lang-tab-btn'),
    weekdayNavContainer: document.getElementById('weekly-days-nav'),
    weekdayButtons: document.querySelectorAll('.weekday-btn'),
    searchSectionWrapper: document.getElementById('search-filter-section'),
    searchToggleButton: document.getElementById('toggle-search-btn'),
    searchInputField: document.getElementById('anime-search-input'),
    clearSearchButton: document.getElementById('clear-search-btn'),
    formatSelector: document.getElementById('format-filter'),
    genreFilterTags: document.querySelectorAll('.genre-tag'),
    forceRefreshButton: document.getElementById('refresh-schedule-btn'),
    favoritesViewButton: document.getElementById('filter-favorites-btn'),
    favoritesCountBadge: document.getElementById('fav-count'),
    openSettingsBtn: document.getElementById('open-settings-btn'),
    closeSettingsBtn: document.getElementById('close-settings-btn'),
    settingsModalWrapper: document.getElementById('settings-modal'),
    timezoneSwitch: document.getElementById('timezone-toggle'),
    clearOfflineCacheBtn: document.getElementById('clear-cache-btn'),
    cacheSizeIndicator: document.getElementById('cache-size-lbl'),
    cacheAgeIndicator: document.getElementById('cache-age-lbl'),
    headerBannerClock: document.getElementById('next-release-time'),
    toastWrapper: document.getElementById('toast-notification'),
    toastTitleText: document.getElementById('toast-title'),
    toastBodyText: document.getElementById('toast-body'),
    apiRetryBtn: document.getElementById('retry-api-btn'),
    apiLoadCacheBtn: document.getElementById('load-cached-btn'),
    resetFiltersBtn: document.getElementById('reset-filters-btn'),
    detailsModalWrapper: document.getElementById('details-modal'),
    detailsCloseBtn: document.getElementById('close-details-btn'),
    modalTitle: document.getElementById('modal-title'),
    modalSynopsis: document.getElementById('modal-synopsis'),
    modalPoster: document.getElementById('modal-poster'),
    modalBannerBg: document.getElementById('modal-banner-bg'),
    modalStudio: document.getElementById('modal-studio'),
    modalEpisodes: document.getElementById('modal-episodes'),
    modalFormat: document.getElementById('modal-format'),
    modalGenres: document.getElementById('modal-genres'),
    modalAirTimeJst: document.getElementById('modal-air-time'),
    modalLocalTime: document.getElementById('modal-local-time'),
    modalRemindBtn: document.getElementById('modal-remind-btn'),
    modalWatchBtn: document.getElementById('modal-watch-btn'),
    modalShareBtn: document.getElementById('modal-share-btn')
  };
}

/**
 * Configure target day index alignment on launch.
 */
function setDefaultDay() {
  const weekdayMapping = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const localDayIndex = new Date().getDay();
  scheduleState.activeDay = weekdayMapping[localDayIndex];
  
  // Style active weekday button element directly
  if (domElements.weekdayButtons) {
    domElements.weekdayButtons.forEach(btn => {
      if (btn.getAttribute('data-day') === scheduleState.activeDay) {
        btn.className = "weekday-btn flex-1 min-w-[70px] py-2 px-1 text-center rounded-xl text-xs font-semibold transition-all bg-brand-blue/20 text-brand-blue border border-brand-blue/30 shadow-sm";
      } else {
        btn.className = "weekday-btn flex-1 min-w-[70px] py-2 px-1 text-center rounded-xl text-xs font-medium transition-all text-slate-400 hover:bg-white/5";
      }
    });
  }
}

/**
 * Connect action listeners, change states, input triggers, and focus boundaries.
 */
function bindInteractiveUiEvents() {
  // Master navigation tabs click handlers
  if (domElements.tabButtons) {
    domElements.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetView = btn.getAttribute('data-tab');
        switchActiveTab(targetView);
      });
    });
  }

  // Weekday selection row triggers (Weekly View sub-menu)
  if (domElements.weekdayButtons) {
    domElements.weekdayButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        domElements.weekdayButtons.forEach(b => {
          b.className = "weekday-btn flex-1 min-w-[70px] py-2 px-1 text-center rounded-xl text-xs font-medium transition-all text-slate-400 hover:bg-white/5";
        });
        btn.className = "weekday-btn flex-1 min-w-[70px] py-2 px-1 text-center rounded-xl text-xs font-semibold transition-all bg-brand-blue/20 text-brand-blue border border-brand-blue/30 shadow-sm";
        
        scheduleState.activeDay = btn.getAttribute('data-day');
        applyFiltersAndRender();
      });
    });
  }

  // Language tags trigger
  if (domElements.langButtons) {
    domElements.langButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        domElements.langButtons.forEach(b => {
          b.className = "lang-tab-btn px-4 py-1.5 rounded-full text-xs font-medium transition-all border border-white/5 bg-white/5 text-slate-300 hover:bg-white/10";
        });
        btn.className = "lang-tab-btn px-4 py-1.5 rounded-full text-xs font-semibold transition-all border border-brand-blue/30 bg-brand-blue/10 text-brand-blue shadow-sm";
        
        scheduleState.activeLang = btn.getAttribute('data-lang');
        applyFiltersAndRender();
      });
    });
  }

  // Live search key triggers with high accuracy debounce wrappers
  if (domElements.searchInputField) {
    domElements.searchInputField.addEventListener('input', (event) => {
      searchAnime(event.target.value);
    });
  }

  if (domElements.clearSearchButton) {
    domElements.clearSearchButton.addEventListener('click', () => {
      domElements.searchInputField.value = '';
      searchAnime('');
    });
  }

  // Expandable header search navigation drawer handler
  if (domElements.searchToggleButton) {
    domElements.searchToggleButton.addEventListener('click', () => {
      const panel = domElements.searchSectionWrapper;
      if (panel.classList.contains('max-h-0')) {
        panel.classList.replace('max-h-0', 'max-h-[500px]');
        domElements.searchToggleButton.className = "w-10 h-10 rounded-xl glass-card flex items-center justify-center bg-brand-blue/15 text-brand-blue border-brand-blue/40 shadow-inner";
        domElements.searchInputField.focus();
      } else {
        panel.classList.replace('max-h-[500px]', 'max-h-0');
        domElements.searchToggleButton.className = "w-10 h-10 rounded-xl glass-card flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all text-slate-300";
      }
    });
  }

  // Media physical structure change filter option
  if (domElements.formatSelector) {
    domElements.formatSelector.addEventListener('change', (event) => {
      scheduleState.activeFormat = event.target.value;
      applyFiltersAndRender();
    });
  }

  // Genre mini capsule lists click mappings
  if (domElements.genreFilterTags) {
    domElements.genreFilterTags.forEach(tag => {
      tag.addEventListener('click', () => {
        const val = tag.getAttribute('data-genre');
        if (scheduleState.activeGenre === val) {
          scheduleState.activeGenre = '';
          tag.className = "genre-tag px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 text-xs text-slate-300 transition-all active:scale-95";
        } else {
          domElements.genreFilterTags.forEach(t => t.className = "genre-tag px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 text-xs text-slate-300 transition-all active:scale-95");
          scheduleState.activeGenre = val;
          tag.className = "genre-tag px-3 py-1.5 rounded-lg bg-brand-blue/20 text-brand-blue border border-brand-blue/30 text-xs font-semibold transition-all active:scale-95";
        }
        applyFiltersAndRender();
      });
    });
  }

  // Settings system toggles & configurations
  if (domElements.openSettingsBtn) {
    domElements.openSettingsBtn.addEventListener('click', () => toggleModal(domElements.settingsModalWrapper, true));
  }
  if (domElements.closeSettingsBtn) {
    domElements.closeSettingsBtn.addEventListener('click', () => toggleModal(domElements.settingsModalWrapper, false));
  }
  if (domElements.settingsModalWrapper) {
    domElements.settingsModalWrapper.addEventListener('click', (e) => {
      if (e.target === domElements.settingsModalWrapper) toggleModal(domElements.settingsModalWrapper, false);
    });
  }

  // Timezone display switcher bindings
  if (domElements.timezoneSwitch) {
    domElements.timezoneSwitch.addEventListener('change', (e) => {
      scheduleState.useLocalTimezone = e.target.checked;
      saveLocal();
      applyFiltersAndRender();
      triggerToastNotification("Timezone Modified", `Schedules adjusted to show ${scheduleState.useLocalTimezone ? 'Local User Time' : 'Tokyo Station Broadcast (JST)'}.`, "clock");
    });
  }

  // Local storage management interactions
  if (domElements.clearOfflineCacheBtn) {
    domElements.clearOfflineCacheBtn.addEventListener('click', () => {
      localStorage.removeItem(LOCAL_STORAGE_CACHE_KEY);
      triggerToastNotification("Offline Cache Flushed", "All dynamic offline lists cleared successfully.", "trash-can");
      updateStorageStatsUi();
    });
  }

  // Force system synchronized network pull button triggers
  if (domElements.forceRefreshButton) {
    domElements.forceRefreshButton.addEventListener('click', () => refreshSchedule());
  }

  // API error rescue actions triggers
  if (domElements.apiRetryBtn) {
    domElements.apiRetryBtn.addEventListener('click', () => refreshSchedule());
  }
  if (domElements.apiLoadCacheBtn) {
    domElements.apiLoadCacheBtn.addEventListener('click', () => {
      loadLocal();
      applyFiltersAndRender();
    });
  }

  // Complete filter state reset helper
  if (domElements.resetFiltersBtn) {
    domElements.resetFiltersBtn.addEventListener('click', () => {
      scheduleState.searchQuery = '';
      scheduleState.activeGenre = '';
      scheduleState.activeFormat = 'ALL';
      scheduleState.activeLang = 'all';
      
      if (domElements.searchInputField) domElements.searchInputField.value = '';
      if (domElements.clearSearchButton) domElements.clearSearchButton.classList.add('hidden');
      if (domElements.formatSelector) domElements.formatSelector.value = 'ALL';
      
      if (domElements.genreFilterTags) {
        domElements.genreFilterTags.forEach(t => t.className = "genre-tag px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 text-xs text-slate-300 transition-all active:scale-95");
      }
      if (domElements.langButtons) {
        domElements.langButtons.forEach(b => b.className = "lang-tab-btn px-4 py-1.5 rounded-full text-xs font-medium transition-all border border-white/5 bg-white/5 text-slate-300 hover:bg-white/10");
        const defaultAllBtn = document.querySelector('button[data-lang="all"]');
        if (defaultAllBtn) defaultAllBtn.className = "lang-tab-btn px-4 py-1.5 rounded-full text-xs font-semibold transition-all border border-brand-blue/30 bg-brand-blue/10 text-brand-blue shadow-sm";
      }
      applyFiltersAndRender();
    });
  }

  // Favorites Tab Direct Action button
  if (domElements.favoritesViewButton) {
    domElements.favoritesViewButton.addEventListener('click', () => {
      if (scheduleState.activeTab === 'favorites') {
        switchActiveTab('today');
      } else {
        switchActiveTab('favorites');
      }
    });
  }

  // Details Modal close interaction triggers
  if (domElements.detailsCloseBtn) {
    domElements.detailsCloseBtn.addEventListener('click', () => toggleModal(domElements.detailsModalWrapper, false, true));
  }
  if (domElements.detailsModalWrapper) {
    domElements.detailsModalWrapper.addEventListener('click', (e) => {
      if (e.target === domElements.detailsModalWrapper) toggleModal(domElements.detailsModalWrapper, false, true);
    });
  }
}

/**
 * Handle switching active navigation tabs and configuring secondary view modules.
 */
function switchActiveTab(targetView) {
  scheduleState.activeTab = targetView;
  
  // Style target navigation buttons visually
  if (domElements.tabButtons) {
    domElements.tabButtons.forEach(btn => {
      const btnTab = btn.getAttribute('data-tab');
      if (btnTab === targetView) {
        btn.className = "schedule-tab-btn relative px-4 py-2.5 text-sm font-semibold rounded-lg transition-all text-brand-blue bg-brand-blue/10";
        // Append active indicator line
        if (!btn.querySelector('.tab-active-line')) {
          const activeLine = document.createElement('span');
          activeLine.className = 'absolute bottom-0 left-0 right-0 h-0.5 tab-active-line rounded-full';
          btn.appendChild(activeLine);
        }
      } else {
        btn.className = "schedule-tab-btn relative px-4 py-2.5 text-sm font-medium rounded-lg transition-all text-slate-400 hover:text-white hover:bg-white/5";
        const indicator = btn.querySelector('.tab-active-line');
        if (indicator) indicator.remove();
      }
    });
  }

  // Sync favorites control buttons highlights
  if (domElements.favoritesViewButton) {
    if (targetView === 'favorites') {
      domElements.favoritesViewButton.className = "px-3.5 py-1.5 rounded-lg border border-yellow-500 bg-yellow-500 text-slate-950 text-xs font-bold flex items-center gap-2 transition-all shadow-md scale-105";
    } else {
      domElements.favoritesViewButton.className = "px-3.5 py-1.5 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-500 text-xs font-semibold flex items-center gap-2 hover:bg-yellow-500/20 active:scale-95 transition-all";
    }
  }

  // Toggle Day Selection sub-tab visibility for the "Weekly Calendar" View
  if (domElements.weekdayNavContainer) {
    if (targetView === 'weekly') {
      domElements.weekdayNavContainer.classList.remove('hidden');
    } else {
      domElements.weekdayNavContainer.classList.add('hidden');
    }
  }

  applyFiltersAndRender();
}

/**
 * High-performance, multi-layered API fetch container.
 * This satisfies: Load Today, Load Upcoming, Load Weekly.
 */
async function loadToday() {
  toggleLoaderUi(true);

  // Attempt to recover previous schedules and states from localStorage first
  const offlineCache = localStorage.getItem(LOCAL_STORAGE_CACHE_KEY);
  if (offlineCache) {
    try {
      const parsedCache = JSON.parse(offlineCache);
      // Valid cache period: 6 hours before forcing reload
      if (Date.now() - parsedCache.timestamp < 1000 * 60 * 60 * 6) {
        scheduleState.weeklyData = parsedCache.weekly;
        scheduleState.upcomingData = parsedCache.upcoming;
        scheduleState.lastSyncTimestamp = parsedCache.timestamp;
        
        toggleLoaderUi(false);
        applyFiltersAndRender();
        return;
      }
    } catch (e) {
      console.warn("Storage corruption found, proceeding to API synchronize...", e);
    }
  }

  // If local recovery failed or has expired, pull active data from Jikan endpoints
  await fetchScheduleFromJikanNetwork();
}

/**
 * Handle Upcoming Release lists pre-loading directly from server.
 */
async function loadUpcoming() {
  if (scheduleState.upcomingData && scheduleState.upcomingData.length > 0) {
    return scheduleState.upcomingData;
  }
  // Otherwise, fallback to pulling fresh lists from the Jikan servers
  await fetchScheduleFromJikanNetwork();
  return scheduleState.upcomingData;
}

/**
 * Network Engine: Synchronize schedule metadata directly from endpoints 
 * using robust exponential retry backoff.
 */
async function fetchScheduleFromJikanNetwork() {
  toggleLoaderUi(true);

  try {
    // Construct request endpoints
    const schedulesUrl = `${JIKAN_API_ROOT}/schedules`;
    const upcomingUrl = `${JIKAN_API_ROOT}/seasons/upcoming`;

    // Concurrently trigger queries to schedules & upcoming pools
    const [weeklyRes, upcomingRes] = await Promise.all([
      executeNetworkCallWithBackoff(schedulesUrl),
      executeNetworkCallWithBackoff(upcomingUrl)
    ]);

    if (weeklyRes && weeklyRes.data && upcomingRes && upcomingRes.data) {
      // Hydrate local cache properties & append language metadata properties
      scheduleState.weeklyData = weeklyRes.data.map((anime, index) => assignDynamicAudioIdentifiers(anime, index));
      scheduleState.upcomingData = upcomingRes.data.map((anime, index) => assignDynamicAudioIdentifiers(anime, index + 100));
      scheduleState.lastSyncTimestamp = Date.now();

      // Commit to cache
      const rawStoreObject = {
        timestamp: scheduleState.lastSyncTimestamp,
        weekly: scheduleState.weeklyData,
        upcoming: scheduleState.upcomingData
      };
      
      localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(rawStoreObject));
      
      toggleLoaderUi(false);
      applyFiltersAndRender();
      updateStorageStatsUi();
      triggerToastNotification("Sync Complete", "Synchronized real-time Japanese broadcast schedules.", "cloud-arrow-down");
    } else {
      throw new Error("Target dataset structural error during response read.");
    }
  } catch (err) {
    console.error("Critical Connection Error inside Jikan controller:", err);
    toggleLoaderUi(false);
