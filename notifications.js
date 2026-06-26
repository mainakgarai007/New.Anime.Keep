/**
 * Anime.Keep - Notifications & Smart Recommendations Engine
 * -----------------------------------------------------------------------------
 * Architect: Senior Frontend Developer, UI/UX Designer & Anime API Expert
 * Purpose: This file governs the core notification inbox, sound indicators,
 * swipe-to-dismiss handlers, real-time background sync routines, and a
 * multi-tier smart recommendation generator pulling from the Jikan (MAL) API.
 */

// Storage Keys
const NOTIFS_DB_KEY = "anime_keep_notifications_db";
const FAVORITES_DB_KEY = "anime_keep_reminders";
const USER_PROFILE_DB_KEY = "anime_keep_user_profile_v2";
const SETTINGS_DB_KEY = "anime_keep_user_settings_v2";
const JIKAN_RECOMMENDATION_API_URL = "https://api.jikan.moe/v4";

// Audio Context For Notification Sound (Synthesized with Web Audio API)
let audioCtxInstance = null;

// Global Memory State Container
let notificationEngineState = {
  notifications: [],
  favorites: [],
  userProfile: null,
  activeTab: "all",
  searchQuery: "",
  soundEnabled: true,
  backgroundSyncIntervalId: null,
  autoRefreshIntervalId: null
};

// Cached DOM Map
let domNodes = {};

/**
 * Initialize core lifecycle when DOM is fully compiled.
 */
document.addEventListener("DOMContentLoaded", () => {
  cacheDOMSelectors();
  hydrateLocalDatabaseStates();
  setupDynamicInterfaceAdditions();
  bindInteractiveControls();
  
  // Start active recommendation and tracking processes
  fetchSmartRecommendations();
  startBackgroundTrackerDaemon();
  startAutoRefreshDaemon();
  
  // Initial draw
  applyFiltersAndRender();
});

/**
 * Capture and store active DOM nodes inside memory lookup map.
 */
function cacheDOMSelectors() {
  domNodes = {
    // Structural Views
    notifList: document.getElementById('notifications-list'),
    emptyInbox: document.getElementById('empty-inbox-view'),
    recomShimmer: document.getElementById('recom-shimmer'),
    recomContainer: document.getElementById('smart-recom-container'),
    
    // Quick Actions
    markAllReadBtn: document.getElementById('mark-all-read-btn'),
    clearNotificationsBtn: document.getElementById('clear-notifications-btn'),
    
    // Filtering Elements
    searchInput: document.getElementById('notif-search-input'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    tabBtns: document.querySelectorAll('.notif-tab-btn'),
    
    // Badges Counters
    badgeAll: document.getElementById('badge-all'),
    badgeUnread: document.getElementById('badge-unread'),
    
    // Global Snackbars
    toast: document.getElementById('toast-notification'),
    toastTitle: document.getElementById('toast-title'),
    toastBody: document.getElementById('toast-body')
  };
}

/**
 * Create dynamic audio switches and touch-swipe overlays directly inside the layout.
 */
function setupDynamicInterfaceAdditions() {
  // 1. Injected Notification Sound Toggle in header actions bar
  const headerRightGroup = document.querySelector('header .flex.items-center');
  if (headerRightGroup && !document.getElementById('audio-toggle-btn')) {
    const soundBtn = document.createElement('button');
    soundBtn.id = "audio-toggle-btn";
    soundBtn.className = "w-10 h-10 rounded-xl glass-card flex items-center justify-center hover:bg-white/5 active:scale-95 transition-all text-brand-blue border border-brand-blue/20";
    soundBtn.title = "Toggle Notification Sounds";
    soundBtn.innerHTML = `<i class="fa-solid fa-volume-high"></i>`;
    soundBtn.onclick = toggleNotificationSoundState;
    headerRightGroup.insertBefore(soundBtn, headerRightGroup.firstChild);
  }

  // 2. Injected Smart Recommendation Tabs on the side panel
  const recommendationAsideHeader = document.querySelector('aside .glass-panel h3');
  if (recommendationAsideHeader && !document.getElementById('recom-sub-tabs')) {
    const subTabs = document.createElement('div');
    subTabs.id = "recom-sub-tabs";
    subTabs.className = "flex gap-1.5 mt-3 border-t border-white/5 pt-2.5 overflow-x-auto scrollbar-none";
    subTabs.innerHTML = `
      <button onclick="changeRecommendationCategory('trending')" id="rec-tab-trending" class="px-2.5 py-1 rounded-lg bg-brand-blue/15 text-brand-blue text-[9px] font-black uppercase tracking-wider">Trending</button>
      <button onclick="changeRecommendationCategory('genre')" id="rec-tab-genre" class="px-2.5 py-1 rounded-lg bg-white/5 text-slate-400 text-[9px] font-semibold uppercase tracking-wider">For You</button>
      <button onclick="changeRecommendationCategory('gems')" id="rec-tab-gems" class="px-2.5 py-1 rounded-lg bg-white/5 text-slate-400 text-[9px] font-semibold uppercase tracking-wider">Gems</button>
    `;
    recommendationAsideHeader.parentNode.insertBefore(subTabs, recommendationAsideHeader.nextSibling);
  }
}

/**
 * Retrieve variables, reminders lists, and historical states from LocalStorage.
 */
function hydrateLocalDatabaseStates() {
  // Load Notifications Database
  const savedNotifs = localStorage.getItem(NOTIFS_DB_KEY);
  if (savedNotifs) {
    try {
      notificationEngineState.notifications = JSON.parse(savedNotifs);
    } catch (e) {
      console.error("Inbox data restoration failed. Loading fallbacks...");
      notificationEngineState.notifications = getSystemFallbackNotifications();
    }
  } else {
    notificationEngineState.notifications = getSystemFallbackNotifications();
    saveInboxToLocalStorage();
  }

  // Load Bookmarked/Favorites List
  const savedFavs = localStorage.getItem(FAVORITES_DB_KEY);
  if (savedFavs) {
    try {
      notificationEngineState.favorites = JSON.parse(savedFavs);
    } catch (e) {
      notificationEngineState.favorites = [];
    }
  }

  // Load Custom User Profile Specs
  const savedProfile = localStorage.getItem(USER_PROFILE_DB_KEY);
  if (savedProfile) {
    try {
      notificationEngineState.userProfile = JSON.parse(savedProfile);
    } catch (e) {
      notificationEngineState.userProfile = null;
    }
  }

  // Load General settings preferences (including sound toggles)
  const savedSettings = localStorage.getItem(SETTINGS_DB_KEY);
  if (savedSettings) {
    try {
      const parsed = JSON.parse(savedSettings);
      notificationEngineState.soundEnabled = parsed.soundEnabled !== undefined ? parsed.soundEnabled : true;
    } catch (e) {
      notificationEngineState.soundEnabled = true;
    }
  }
}

/**
 * Standard simulated notifications array factory block.
 */
function getSystemFallbackNotifications() {
  return [
    {
      id: "notif_" + Date.now() + "_1",
      type: "release",
      title: "Episode Airing Now",
      description: "Ep 28 of Frieren: Beyond Journey's End (Japanese Subbed) is now broadcasting live on official networks.",
      time: "10m ago",
      read: false,
      poster: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=150&auto=format&fit=crop",
      animeId: 52991,
      timestamp: Date.now() - 1000 * 60 * 10
    },
    {
      id: "notif_" + Date.now() + "_2",
      type: "recommendation",
      title: "Recommended Review Match",
      description: "Based on your appreciation of high fantasy worldbuilding, community members suggest reading review logs for 'Tower of God'.",
      time: "1h ago",
      read: false,
      poster: "https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=150&auto=format&fit=crop",
      animeId: 40591,
      timestamp: Date.now() - 1000 * 60 * 60
    },
    {
      id: "notif_" + Date.now() + "_3",
      type: "system",
      title: "Offline Storage Sync Complete",
      description: "Schedules caching engine cleared 48 expired records from your LocalStorage database successfully.",
      time: "4h ago",
      read: true,
      poster: null,
      animeId: null,
      timestamp: Date.now() - 1000 * 60 * 60 * 4
    }
  ];
}

/**
 * Configure UI action triggers, key events, and swipe motions.
 */
function bindInteractiveControls() {
  // Real-time search criteria mapping
  if (domNodes.searchInput) {
    domNodes.searchInput.addEventListener('input', (event) => {
      const val = event.target.value.trim();
      notificationEngineState.searchQuery = val;
      
      if (val.length > 0) {
        domNodes.clearSearchBtn.classList.remove('hidden');
      } else {
        domNodes.clearSearchBtn.classList.add('hidden');
      }
      applyFiltersAndRender();
    });
  }

  if (domNodes.clearSearchBtn) {
    domNodes.clearSearchBtn.addEventListener('click', () => {
      domNodes.searchInput.value = '';
      notificationEngineState.searchQuery = '';
      domNodes.clearSearchBtn.classList.add('hidden');
      applyFiltersAndRender();
    });
  }

  // Main Categories Tabs Selector Buttons
  if (domNodes.tabBtns) {
    domNodes.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        domNodes.tabBtns.forEach(b => {
          b.className = "notif-tab-btn px-4 py-2 text-xs font-semibold rounded-xl transition-all text-slate-400 hover:text-white hover:bg-white/5 shrink-0 flex items-center gap-1.5";
        });
        btn.className = "notif-tab-btn px-4 py-2 text-xs font-bold rounded-xl transition-all bg-brand-blue/15 text-brand-blue border border-brand-blue/25 shrink-0 flex items-center gap-1.5";
        
        notificationEngineState.activeTab = btn.getAttribute('data-tab');
        applyFiltersAndRender();
      });
    });
  }

  // Mark all inbox entries as read status
  if (domNodes.markAllReadBtn) {
    domNodes.markAllReadBtn.addEventListener('click', () => {
      notificationEngineState.notifications.forEach(notif => notif.read = true);
      saveInboxToLocalStorage();
      applyFiltersAndRender();
      triggerToastAlert("Inbox Updated", "All notifications have been marked as read.", "envelope-open");
    });
  }

  // Wipes notifications database logs entirely
  if (domNodes.clearNotificationsBtn) {
    domNodes.clearNotificationsBtn.addEventListener('click', () => {
      notificationEngineState.notifications = [];
      saveInboxToLocalStorage();
      applyFiltersAndRender();
      triggerToastAlert("Inbox Empty", "Cleared all alerts history logs.", "trash-can");
    });
  }
}

/**
 * Filter Pipeline: Selects notifications matching active tabs and searches.
 */
function getFilteredInboxList() {
  let list = [...notificationEngineState.notifications];

  // 1. Match tab categories
  if (notificationEngineState.activeTab === 'unread') {
    list = list.filter(n => n.read === false);
  } else if (notificationEngineState.activeTab !== 'all') {
    list = list.filter(n => n.type === notificationEngineState.activeTab);
  }

  // 2. Match text queries
  if (notificationEngineState.searchQuery.length > 0) {
    const query = notificationEngineState.searchQuery.toLowerCase();
    list = list.filter(n => {
      const matchTitle = n.title && n.title.toLowerCase().includes(query);
      const matchDesc = n.description && n.description.toLowerCase().includes(query);
      return matchTitle || matchDesc;
    });
  }

  // Sort descending by timestamp milestone
  return list.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Dynamic State Renderer: Compiles notifications list markup.
 */
function applyFiltersAndRender() {
  const list = getFilteredInboxList();
  
  updateCountersAndBadges();

  if (list.length === 0) {
    domNodes.notifList.classList.add('hidden');
    domNodes.emptyInbox.classList.remove('hidden');
    return;
  }

  domNodes.emptyInbox.classList.add('hidden');
  domNodes.notifList.classList.remove('hidden');

  domNodes.notifList.innerHTML = list.map(item => buildNotificationCardHtml(item)).join('');
  
  // Attach Mobile Touch Swipe listener elements for responsive dismiss gestures
  attachMobileSwipeGestures();
}

/**
 * Build Single Notification card layout template.
 */
function buildNotificationCardHtml(item) {
  const isRead = item.read;
  const categoryIcon = getAlertCategoryIcon(item.type);
  const actionButton = item.animeId 
    ? `<button onclick="window.location.href='anime.html?id=${item.animeId}'" class="px-3 py-1.5 rounded-lg bg-brand-blue/15 hover:bg-brand-blue text-brand-blue hover:text-white font-extrabold text-[10px] sm:text-xs transition-all flex items-center gap-1 active:scale-95 shadow-sm">View Details <i class="fa-solid fa-chevron-right text-[8px] pl-0.5"></i></button>`
    : '';

  return `
    <article class="glass-panel rounded-2xl p-4 sm:p-5 border border-white/5 hover:border-white/10 transition-all flex gap-4 relative group overflow-hidden ${isRead ? 'opacity-70' : 'bg-gradient-to-r from-blue-950/15 via-slate-950/40 to-transparent border-l-2 border-l-brand-blue animate-pulse'}" 
             data-id="${item.id}"
             style="content-visibility: auto;">
      
      <!-- Left Profile Art -->
      <div class="shrink-0 flex items-center justify-center">
        ${item.poster ? `
          <div class="w-11 sm:w-14 aspect-[3/4] rounded-lg bg-slate-900 border border-white/10 overflow-hidden shadow-inner shrink-0">
            <img class="w-full h-full object-cover" src="${item.poster}" alt="Cover" loading="lazy">
          </div>
        ` : `
          <div class="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center shrink-0">
            ${categoryIcon}
          </div>
        `}
      </div>

      <!-- Detail description block -->
      <div class="flex-grow min-w-0 pr-6">
        <div class="flex items-center gap-2">
          <h4 class="text-xs sm:text-sm font-black text-slate-100 line-clamp-1">${item.title}</h4>
          ${!isRead ? `<span class="w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse"></span>` : ''}
        </div>
        <p class="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2 sm:line-clamp-none">${item.description}</p>
        
        <div class="flex items-center gap-3 mt-3">
          <span class="text-[10px] text-slate-500 font-semibold">${item.time}</span>
          <span class="text-[10px] text-slate-600 font-bold uppercase tracking-wider">${item.type}</span>
        </div>
      </div>

      <!-- Floating Controls Panel Option triggers -->
      <div class="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onclick="event.stopPropagation()">
        ${actionButton}
        <button onclick="toggleSingleNotificationReadState('${item.id}')" class="w-7 h-7 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-300 flex items-center justify-center active:scale-90 transition-all" title="${isRead ? 'Mark Unread' : 'Mark Read'}">
          <i class="fa-regular ${isRead ? 'fa-envelope' : 'fa-envelope-open'} text-xs"></i>
        </button>
        <button onclick="deleteSingleNotificationAlert('${item.id}')" class="w-7 h-7 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-500 flex items-center justify-center transition-all active:scale-90" title="Delete Notification">
          <i class="fa-solid fa-trash-can text-xs"></i>
        </button>
      </div>

    </article>
  `;
}

/**
 * Return specific visual Category Icons.
 */
function getAlertCategoryIcon(type) {
  switch (type) {
    case 'release':
      return `<i class="fa-solid fa-circle-play text-brand-blue"></i>`;
    case 'recommendation':
      return `<i class="fa-solid fa-compass text-brand-purple"></i>`;
    case 'system':
      return `<i class="fa-solid fa-microchip text-brand-cyan"></i>`;
    case 'community':
      return `<i class="fa-solid fa-user-group text-brand-pink"></i>`;
    default:
      return `<i class="fa-solid fa-bell text-slate-400"></i>`;
  }
}

/**
 * Swipe-to-Dismiss controller for premium mobile touch interactivity.
 */
function attachMobileSwipeGestures() {
  const cards = document.querySelectorAll('#notifications-list article');
  
  cards.forEach(card => {
    let startX = 0;
    let distanceX = 0;
    const swipeThreshold = 120; // threshold displacement in pixels
    const notifId = card.getAttribute('data-id');

    card.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
    }, { passive: true });

    card.addEventListener('touchmove', (e) => {
      const currentX = e.touches[0].clientX;
      distanceX = currentX - startX;

      // Restrict swipe direction to left-only for dismissal
      if (distanceX < 0) {
        card.style.transform = `translateX(${distanceX}px)`;
        card.style.opacity = `${1 - Math.abs(distanceX) / 280}`;
      }
    }, { passive: true });

    card.addEventListener('touchend', () => {
      if (distanceX < -swipeThreshold) {
        // Trigger complete dismiss sequence
        card.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        card.style.transform = 'translateX(-100%)';
        card.style.opacity = '0';
        
        setTimeout(() => {
          deleteSingleNotificationAlert(notifId, false); // silent delete, no double toasts
        }, 300);
      } else {
        // Snap back to normal
        card.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
        card.style.transform = 'translateX(0)';
        card.style.opacity = '1';
      }
      distanceX = 0;
    });
  });
}

/**
 * Mark individual notification read status.
 */
window.toggleSingleNotificationReadState = function(id) {
  const target = notificationEngineState.notifications.find(n => n.id === id);
  if (!target) return;

  target.read = !target.read;
  saveInboxToLocalStorage();
  applyFiltersAndRender();
  triggerToastAlert("State Altered", `Alert marked as ${target.read ? 'read' : 'unread'}.`, "envelope-open");
};

/**
 * Remove individual notification from cache timeline.
 */
window.deleteSingleNotificationAlert = function(id, triggerAlertToast = true) {
  const target = notificationEngineState.notifications.find(n => n.id === id);
  if (!target) return;

  notificationEngineState.notifications = notificationEngineState.notifications.filter(n => n.id !== id);
  saveInboxToLocalStorage();
  applyFiltersAndRender();
  
  if (triggerAlertToast) {
    triggerToastAlert("Alert Erased", "The selected notification has been deleted from your log history.", "trash-can");
  }
};

/**
 * Generate fresh sample mock notifications on demand.
 */
window.generateSampleDemoNotifications = function() {
  notificationEngineState.notifications = getSystemFallbackNotifications();
  saveInboxToLocalStorage();
  applyFiltersAndRender();
  triggerToastAlert("Schedules Hydrated", "Imported simulated notifications calendar inbox logs.", "arrow-rotate-left");
  playNotificationSound();
};

/**
 * Toggle Audio notification beeping permissions.
 */
window.toggleNotificationSoundState = function() {
  notificationEngineState.soundEnabled = !notificationEngineState.soundEnabled;
  
  // Persist choice inside settings
  const settings = JSON.parse(localStorage.getItem(SETTINGS_DB_KEY) || "{}");
  settings.soundEnabled = notificationEngineState.soundEnabled;
  localStorage.setItem(SETTINGS_DB_KEY, JSON.stringify(settings));

  const audioBtn = document.getElementById('audio-toggle-btn');
  if (audioBtn) {
    if (notificationEngineState.soundEnabled) {
      audioBtn.className = "w-10 h-10 rounded-xl glass-card flex items-center justify-center hover:bg-white/5 active:scale-95 transition-all text-brand-blue border border-brand-blue/20";
      audioBtn.innerHTML = `<i class="fa-solid fa-volume-high"></i>`;
      triggerToastNotificationSoundTest();
    } else {
      audioBtn.className = "w-10 h-10 rounded-xl glass-card flex items-center justify-center hover:bg-white/5 active:scale-95 transition-all text-slate-500 border border-white/5";
      audioBtn.innerHTML = `<i class="fa-solid fa-volume-xmark"></i>`;
    }
  }

  triggerToastAlert("Audio Altered", `System sounds are now ${notificationEngineState.soundEnabled ? 'activated' : 'muted'}.`, "volume-high");
};

/**
 * Play a synthesized notification alert chime using Web Audio API oscillators.
 */
function playNotificationSound() {
  if (!notificationEngineState.soundEnabled) r
