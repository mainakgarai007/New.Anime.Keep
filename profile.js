```javascript
/**
 * Anime.Keep - User Profile Module Engine
 * -----------------------------------------------------------------------------
 * Architect: Senior Frontend Developer, UI/UX Designer & JS Engineer
 * Purpose: This file coordinates user portfolio state management. It handles 
 * profile preferences, watch lists, continue-watching counters, active milestones, 
 * local database backups (Import/Export JSON blobs), theme overrides, 
 * and persistent storage hydration.
 */

// Global storage namespace constants
const SYSTEM_PROFILE_STORAGE_KEY = "anime_keep_user_profile_v2";
const SYSTEM_THEME_STORAGE_KEY = "anime_keep_theme_preference";
const SYSTEM_NOTIF_STORAGE_KEY = "anime_keep_notification_settings";

// Fallback template matching factory configurations
const PROFILE_FACTORY_DEFAULTS = {
  displayName: "OtakuKeep_99",
  handle: "ren_kurosawa",
  avatar: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=300&auto=format&fit=crop",
  banner: "https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1200&auto=format&fit=crop",
  bio: "Always searching for high-quality animation, robust worldbuilding, and complex logic systems. Frieren & Re:Zero enthusiast.",
  rank: "Senior Critic",
  stats: {
    total: 284,
    watching: 12,
    completed: 198,
    dropped: 10,
    ptw: 64,
    watchtimeMinutes: 65640 // ~1094 hours (pre-calculated raw minutes)
  },
  continueWatching: [
    { id: 1, title: "Frieren: Beyond Journey's End", currentEp: 14, totalEp: 28, poster: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=150&auto=format&fit=crop", progress: 50 },
    { id: 2, title: "Re:Zero Season 3", currentEp: 4, totalEp: 16, poster: "https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=150&auto=format&fit=crop", progress: 25 }
  ],
  activity: [
    { id: 101, action: "Completed anime project", target: "Frieren: Beyond Journey's End", time: "2 hours ago" },
    { id: 102, action: "Added new series to Plan to Watch", target: "Chainsaw Man Part 2", time: "1 day ago" },
    { id: 103, action: "Published critic rating log", target: "Pluto (8.7/10)", time: "3 days ago" }
  ],
  watchlist: [
    { id: 52991, title: "Frieren: Beyond Journey's End", score: "9.39", type: "TV Series", status: "Completed", episodesCount: 28 },
    { id: 50172, title: "Pluto", score: "8.65", type: "ONA Series", status: "Completed", episodesCount: 8 },
    { id: 54911, title: "Chainsaw Man", score: "8.54", type: "TV Series", status: "Watching", episodesCount: 12 }
  ],
  unlockedAchievements: ["crown", "feather"] // tracking active earned milestones keys
};

// Global active memory pointer
let activeProfileState = {};

// Selectors mapping
let profileDom = {};

/**
 * Main window hydration thread.
 */
document.addEventListener("DOMContentLoaded", () => {
  cacheProfileDomNodes();
  loadUserProfileState();
  initializeInterfaceEvents();
  applyThemePreferenceOnLaunch();
  recalculateDynamicPortfolioMetrics();
});

/**
 * Cache layout UI target DOM elements.
 */
function cacheProfileDomNodes() {
  profileDom = {
    // Text blocks
    displayName: document.getElementById('user-display-name'),
    handle: document.getElementById('user-handle'),
    bio: document.getElementById('user-bio'),
    rankTag: document.getElementById('user-rank-tag'),
    
    // Images
    avatar: document.getElementById('user-avatar'),
    banner: document.getElementById('user-banner'),
    
    // Counter metrics
    statTotal: document.getElementById('stat-total'),
    statWatching: document.getElementById('stat-watching'),
    statCompleted: document.getElementById('stat-completed'),
    statDropped: document.getElementById('stat-dropped'),
    statPtw: document.getElementById('stat-ptw'),
    statWatchtime: document.getElementById('stat-watchtime'),
    
    // Inner Dynamic Boards
    continueWatchingDeck: document.getElementById('continue-watching-deck'),
    activityTimeline: document.getElementById('activity-timeline'),
    watchlistTableBody: document.getElementById('watchlist-tbody'),
    watchlistTotalLabel: document.getElementById('watchlist-total-lbl'),
    
    // Interactive Forms & Customizers
    editModal: document.getElementById('edit-profile-modal'),
    inputDisplayName: document.getElementById('input-display-name'),
    inputHandle: document.getElementById('input-handle'),
    inputAvatar: document.getElementById('input-avatar'),
    inputBanner: document.getElementById('input-banner'),
    inputBio: document.getElementById('input-bio'),
    
    // System Utilities Elements
    toast: document.getElementById('toast-notification'),
    toastTitle: document.getElementById('toast-title'),
    toastBody: document.getElementById('toast-body'),
    shareBtn: document.getElementById('share-profile-btn')
  };
}

/**
 * Setup and bind interactive modular controls.
 */
function initializeInterfaceEvents() {
  // Setup standard profile link exporter
  if (profileDom.shareBtn) {
    profileDom.shareBtn.addEventListener('click', () => {
      const locationLink = window.location.href;
      exportProfileLinkToClipboard(locationLink);
    });
  }

  // Generate hidden file triggers in memory to support JSON import restoration
  const hiddenImportInput = document.createElement('input');
  hiddenImportInput.type = "file";
  hiddenImportInput.accept = ".json";
  hiddenImportInput.id = "system-profile-import-file";
  hiddenImportInput.className = "hidden";
  document.body.appendChild(hiddenImportInput);

  hiddenImportInput.addEventListener('change', (event) => {
    executeRestoreFromBackup(event);
  });

  // Create customized Action Row controls dynamically to extend profiles actions
  createSupplementalActionControls(hiddenImportInput);
}

/**
 * Dynamically attach backup and theme controls to action structures.
 */
function createSupplementalActionControls(fileInputRef) {
  const settingsContainer = document.querySelector('section .glass-panel h3[class*="Profile Actions"]');
  if (!settingsContainer) return;

  const parentBox = settingsContainer.parentNode;
  const actionsWrapper = parentBox.querySelector('.flex-col') || parentBox;

  // 1. Export Database Backups Action button
  const exportBtn = document.createElement('button');
  exportBtn.className = "w-full py-2.5 rounded-xl bg-brand-blue/10 hover:bg-brand-blue/20 border border-brand-blue/30 text-brand-blue text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-2 mb-2 shadow-sm";
  exportBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> <span>Export Portfolio JSON</span>`;
  exportBtn.onclick = () => executeBackupToLocalBlob();
  actionsWrapper.insertBefore(exportBtn, actionsWrapper.firstChild);

  // 2. Import Database Restoration Action button
  const importBtn = document.createElement('button');
  importBtn.className = "w-full py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-2 mb-2 shadow-sm";
  importBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-down"></i> <span>Import Portfolio JSON</span>`;
  importBtn.onclick = () => fileInputRef.click();
  actionsWrapper.insertBefore(importBtn, exportBtn);

  // 3. Dark Theme Override Toggle Action button
  const themeBtn = document.createElement('button');
  themeBtn.className = "w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/5 hover:border-white/10 text-slate-300 text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-2 mb-2 shadow-sm";
  themeBtn.innerHTML = `<i class="fa-solid fa-circle-half-stroke"></i> <span>Toggle Dark AMOLED</span>`;
  themeBtn.onclick = () => toggleSystemThemePreference();
  actionsWrapper.insertBefore(themeBtn, importBtn);
}

/**
 * Hydrate state variables from LocalStorage.
 */
function loadUserProfileState() {
  const savedProfile = localStorage.getItem(SYSTEM_PROFILE_STORAGE_KEY);
  if (savedProfile) {
    try {
      activeProfileState = JSON.parse(savedProfile);
    } catch (e) {
      console.warn("User state read failed, restoring defaults...");
      activeProfileState = { ...PROFILE_FACTORY_DEFAULTS };
    }
  } else {
    activeProfileState = { ...PROFILE_FACTORY_DEFAULTS };
  }
}

/**
 * Hydrate current views elements with state variables.
 */
function hydrateUserProfileUi() {
  // Primary Info
  if (profileDom.displayName) profileDom.displayName.innerText = activeProfileState.displayName;
  if (profileDom.handle) profileDom.handle.innerText = `@${activeProfileState.handle}`;
  if (profileDom.bio) profileDom.bio.innerText = activeProfileState.bio;
  if (profileDom.rankTag) profileDom.rankTag.innerText = activeProfileState.rank || "Explorer";

  // Visual Assets
  if (profileDom.avatar) profileDom.avatar.src = activeProfileState.avatar;
  if (profileDom.banner) profileDom.banner.style.backgroundImage = `url('${activeProfileState.banner}')`;

  // General numerical statistics counters
  if (profileDom.statTotal) profileDom.statTotal.innerText = activeProfileState.stats.total;
  if (profileDom.statWatching) profileDom.statWatching.innerText = activeProfileState.stats.watching;
  if (profileDom.statCompleted) profileDom.statCompleted.innerText = activeProfileState.stats.completed;
  if (profileDom.statDropped) profileDom.statDropped.innerText = activeProfileState.stats.dropped;
  if (profileDom.statPtw) profileDom.statPtw.innerText = activeProfileState.stats.ptw;

  // Process Watch Time conversion display format
  if (profileDom.statWatchtime) {
    const rawMins = activeProfileState.stats.watchtimeMinutes || 0;
    const hours = Math.floor(rawMins / 60);
    profileDom.statWatchtime.innerText = `${hours.toLocaleString()}h`;
    
    // Sync days calculations labels directly on descriptions
    const computedDays = (hours / 24).toFixed(1);
    const subLabelSpan = profileDom.statWatchtime.nextElementSibling;
    if (subLabelSpan) {
      subLabelSpan.innerText = `~${computedDays} days active`;
    }
  }

  // Continue Watching Carousel Desk
  renderContinueWatchingProgressCards();

  // Dynamic Activity timelines lists
  renderDynamicRecentActivityLogs();

  // Watchlists Catalog database grids
  renderWatchlistCatalogGrid();

  // Re-evaluate Achievements
  evaluateMilestoneUnlockCriteria();
}

/**
 * Render active continue watching lists cards.
 */
function renderContinueWatchingProgressCards() {
  if (!profileDom.continueWatchingDeck) return;

  const shows = activeProfileState.continueWatching || [];
  if (shows.length === 0) {
    profileDom.continueWatchingDeck.innerHTML = `
      <div class="col-span-1 sm:col-span-2 p-6 text-center rounded-2xl bg-white/5 border border-white/5 text-sm font-semibold text-slate-500">
        No active series in your viewing deck currently.
      </div>
    `;
    return;
  }

  profileDom.continueWatchingDeck.innerHTML = shows.map(item => `
    <div class="glass-card rounded-2xl p-4 flex items-center justify-between border border-white/5 gap-4 relative overflow-hidden group animate-fade-in">
      <div class="flex items-center gap-4 flex-grow min-w-0">
        <div class="w-14 h-20 rounded-xl bg-slate-900 overflow-hidden shrink-0 border border-white/5 shadow-md">
          <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" src="${item.poster}" alt="${item.title}" loading="lazy">
        </div>
        <div class="flex-grow min-w-0">
          <h4 class="text-sm font-bold text-slate-200 line-clamp-1 group-hover:text-white transition-colors cursor-pointer" onclick="window.location.href='anime.html?id=${item.id}'">${item.title}</h4>
          <span class="text-[10px] text-slate-500 font-extrabold uppercase mt-1 block">Episode ${item.currentEp} of ${item.totalEp}</span>
          <div class="w-full h-1.5 rounded-full bg-slate-950 mt-2 overflow-hidden">
            <div class="h-full bg-brand-blue rounded-full progress-bar-fill" style="width: ${item.progress}%"></div>
          </div>
        </div>
      </div>
      <button onclick="progressWatchingSeriesProgress(${item.id})" class="w-10 h-10 rounded-xl bg-brand-blue/15 hover:bg-brand-blue text-brand-blue hover:text-white border border-brand-blue/20 transition-all flex items-center justify-center shrink-0 active:scale-95 shadow-md" title="Log Episode Completed">
        <i class="fa-solid fa-play text-xs"></i>
      </button>
    </div>
  `).join('');
}

/**
 * Increment watching counters for series inside continue watching deck.
 */
window.progressWatchingSeriesProgress = function(showId) {
  const show = activeProfileState.continueWatching.find(i => i.id === showId);
  if (!show) return;

  if (show.currentEp < show.totalEp) {
    show.currentEp++;
    show.progress = Math.round((show.currentEp / show.totalEp) * 100);
    
    // Add 24 minutes per episode to total watchTime metric
    activeProfileState.stats.watchtimeMinutes += 24;

    triggerToastNotification("Progress Logged", `Advanced ${show.title} to Episode ${show.currentEp}.`, "circle-play");
  } else {
    // Series Completed sequence
    activeProfileState.continueWatching = activeProfileState.continueWatching.filter(i => i.id !== showId);
    activeProfileState.stats.completed++;
    activeProfileState.stats.watching = Math.max(0, activeProfileState.stats.watching - 1);
    activeProfileState.stats.watchtimeMinutes += 24;

    // Log Complete Event
    recordActivityLog("Finished Series Broadcaster", show.title);
    triggerToastNotification("Anime Milestone Completed!", `Outstanding! You finished ${show.title}.`, "crown");
  }

  commitUserProfileState();
  recalculateDynamicPortfolioMetrics();
};

/**
 * Record dynamic custom activities into timeline.
 */
function recordActivityLog(action, target) {
  if (!activeProfileState.activity) activeProfileState.activity = [];
  
  activeProfileState.activity.unshift({
    id: Date.now(),
    action: action,
    target: target,
    time: "Just now"
  });

  // Keep logs list small to avoid inflating LocalStorage limits
  activeProfileState.activity = activeProfileState.activity.slice(0, 10);
}

/**
 * Render dynamic activity logs on layout.
 */
function renderDynamicRecentActivityLogs() {
  if (!profileDom.activityTimeline) return;

  const logs = activeProfileState.activity || [];
  if (logs.length === 0) {
    profileDom.activityTimeline.innerHTML = `<span class="text-xs text-slate-500 font-semibold italic">No recent log timeline feeds recorded.</span>`;
    return;
  }

  profileDom.activityTimeline.innerHTML = logs.slice(0, 3).map(log => `
    <div class="relative flex flex-col gap-1 activity-node animate-fade-in pl-1">
      <span class="absolute -left-[25px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#18182b] border-2 border-brand-pink shadow-md activity-node-bullet"></span>
      <div class="text-xs font-bold text-slate-200">
        ${log.action} • <span class="text-brand-blue font-extrabold hover:underline cursor-pointer">${log.target}</span>
      </div>
      <span class="text-[10px] text-slate-500 font-semibold">${log.time}</span>
    </div>
  `).join('');
}

/**
 * Render complete watchlists datasets.
 */
function renderWatchlistCatalogGrid() {
  if (!profileDom.watchlistTableBody || !profileDom.watchlistTotalLabel) return;

  const list = activeProfileState.watchlist || [];
  profileDom.watchlistTotalLabel.innerText = `${list.length} Items`;

  if (list.length === 0) {
    profileDom.watchlistTableBody.innerHTML = `
      <tr>
        <td colspan="4" class="py-12 text-center text-slate-500 font-semibold text-xs">Your personal database watchlists is empty.</td>
      </tr>
    `;
    return;
  }

  profileDom.watchlistTableBody.innerHTML = list.map(item => `
    <tr class="hover:bg-white/5 transition-colors cursor-pointer group animate-fade-in" onclick="window.location.href='anime.html?id=${item.id}'">
      <td class="py-3.5 font-bold text-slate-200 group-hover:text-white group-hover:underline transition-all">${item.title}</td>
      <td class="py-3.5 text-center font-black text-amber-400 rating-amber-score">★ ${item.score}</td>
      <td class="py-3.5 text-slate-400 text-center">${item.type}</td>
      <td class="py-3.5 text-center">
        <span class="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${item.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20'}">
          ${item.status}
        </span>
      </td>
    </tr>
  `).join('');
}

/**
 * Customizer modal open / close utilities.
 */
window.openProfileEditModal = function() {
  if (!profileDom.editModal) return;

  // Pre-fill fields
  profileDom.inputDisplayName.value = activeProfileState.displayName;
  profileDom.inputHandle.value = activeProfileState.handle;
  profileDom.inputAvatar.value = activeProfileState.avatar;
  profileDom.inputBanner.value = activeProfileState.banner;
  profileDom.inputBio.value = activeProfileState.bio;

  profileDom.editModal.classList.remove('opacity-0', 'pointer-events-none');
  profileDom.editModal.firstElementChild.classList.replace('scale-95', 'scale-100');
};

window.closeProfileEditModal = function() {
  if (!profileDom.editModal) return;

  profileDom.editModal.classList.add('opacity-0', 'pointer-events-none');
  profileDom.editModal.firstElementChild.classList.replace('scale-100', 'scale-95');
};

/**
 * Commit profile modal changes to persistent memory.
 */
window.saveUserProfilePreferences = function() {
  const newName = profileDom.inputDisplayName.value.trim();
  const newHandle = profileDom.inputHandle.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  const newAvatar = profileDom.inputAvatar.value.trim();
  const newBanner = profileDom.inputBanner.value.trim();
  const newBio = profileDom.inputBio.value.trim();

  // Client-side validations
  if (newName.length < 3) {
    triggerToastNotification("Validation Fault", "Display Name must contain at least 3 characters.", "triangle-exclamation");
    return;
  }
  if (newHandle.length < 3) {
    triggerToastNotification("Validation Fault", "Unique Handle must contain at least 3 characters.", "triangle-exclamation");
    return;
  }

  // Hydrate state properties
  activeProfileState.displayName = newName;
  activeProfileState.handle = newHandle;
  
  // Validate Image Url structures before applying
  if (isValidUrlString(newAvatar)) activeProfileState.avatar = newAvatar;
  if (isValidUrlString(newBanner)) activeProfileState.banner = newBanner;
  
  activeProfileState.bio = newBio;

  // Record Update activity log
  recordActivityLog("Modified personal parameters", "User Bio Configs");

  commitUserProfileState();
  closeProfileEditModal();
  recalculateDynamicPortfolioMetrics();
  triggerToastNotification("Profile Saved", "Your customize profile preferences have been successfully updated.", "user-check");
};

/**
 * Clean URL checking regex wrapper.
 */
function isValidUrlString(str) {
  try {
    new URL(str);
    return true;
  } catch (_) {
    return false;  
  }
}

/**
 * Compute derived anime counters based on active watchlist contents.
 */
function calculateLocalDatabaseAnimeStats() {
  const watchList = activeProfileState.watchlist || [];
  
  // Recalculate states counts based on contents array
  const activeStats = {
    total: watchList.length,
    watching: 0,
    completed: 0,
    dropped: 0,
    ptw: 0,
    watchtimeMinutes: activeProfileState.stats.watchtimeMinutes // carry watchtime over
  };

  watchList.forEach(anime => {
    switch (anime.status.toLowerCase()) {
      case 'watching':
        activeStats.watching++;
        break;
      case 'completed':
        activeStats.completed++;
        break;
      case 'dropped':
        activeStats.dropped++;
        break;
      case 'plan to watch':
      case 'ptw':
        activeStats.ptw++;
        break;
    }
  });

  // As
