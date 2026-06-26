/**
 * Anime.Keep — Comprehensive Rest client & Library Management Engine (MG Style)
 * -----------------------------------------------------------------------------
 * Architect: Senior Frontend Developer, UI/UX Designer & Product Specialist
 * Stack: Pure ES6+ Modern JavaScript Client Model (No external runtime dependencies)
 * Integrations: Jikan v4 REST API Proxy, HTML5 Browser localStorages System
 * * This engine handles CRUD cataloging, deep statistics ledgers, Jikan API proxied searches 
 * with debounce, advanced filtering, modal and sidebar drawer animations, persistent 
 * toast alerts, keyboard shortcuts, and full offline sync capabilities.
 */

// Global Configuration Space
const CONFIG = {
  JIKAN_API_BASE: "https://api.jikan.moe/v4",
  API_TIMEOUT: 8000,
  DEBOUNCE_DELAY: 300,
  STORAGE_KEYS: {
    ANIME: "anime_keep_library_data",
    SETTINGS: "anime_keep_user_settings",
    RECENT_SEARCH: "anime_keep_recent_searches_logs"
  }
};

// Application State Management
class AppState {
  constructor() {
    this.animeList = [];
    this.recentSearches = [];
    this.settings = {
      amoledMode: true,
      darkTheme: true,
      animationsFluid: true
    };
    this.activeSearchQuery = "";
    this.activeFilters = {
      genre: "ALL",
      status: "ALL",
      season: "ALL",
      year: "ALL",
      score: "ALL",
      language: "ALL"
    };
    this.isOffline = !navigator.onLine;
    this.activeEditId = null;
    this.activeDeleteId = null;
  }
}

const State = new AppState();

// =============================================================================
// 1. TOAST NOTIFICATION SYSTEM
// =============================================================================
class ToastNotificationManager {
  constructor() {
    this.container = this.createContainer();
  }

  createContainer() {
    let el = document.getElementById("toast-notification-center");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast-notification-center";
      el.className = "fixed bottom-6 left-6 z-[100] flex flex-col gap-3 max-w-sm w-[90%]";
      document.body.appendChild(el);
    }
    return el;
  }

  show(title, message, type = "info") {
    const toast = document.createElement("div");
    
    // Choose icons based on classification parameters
    let iconClass = "fa-info-circle text-brand-blue";
    let borderClass = "border-brand-blue/30";
    let bgGlow = "shadow-brand-blue/10";
    
    if (type === "success") {
      iconClass = "fa-check-circle text-emerald-400";
      borderClass = "border-emerald-500/20";
      bgGlow = "shadow-emerald-500/5";
    } else if (type === "warning") {
      iconClass = "fa-exclamation-triangle text-amber-500";
      borderClass = "border-amber-500/20";
      bgGlow = "shadow-amber-500/5";
    } else if (type === "error") {
      iconClass = "fa-triangle-exclamation text-rose-500";
      borderClass = "border-rose-500/20";
      bgGlow = "shadow-rose-500/5";
    }

    toast.className = `glass-panel rounded-2xl p-4 border ${borderClass} shadow-2xl ${bgGlow} flex items-center gap-3.5 transform translate-y-4 opacity-0 transition-all duration-300 animate-slide`;
    toast.innerHTML = `
      <div class="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
        <i class="fa-solid ${iconClass} text-base"></i>
      </div>
      <div class="flex-grow">
        <h5 class="font-bold text-xs text-white font-display">${title}</h5>
        <p class="text-slate-400 text-[11px] mt-0.5 leading-tight">${message}</p>
      </div>
    `;

    this.container.appendChild(toast);

    // Trigger Entrance transitions
    setTimeout(() => {
      toast.classList.remove("translate-y-4", "opacity-0");
    }, 10);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      toast.classList.add("translate-y-4", "opacity-0");
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}

const Toasts = new ToastNotificationManager();

// =============================================================================
// 2. MODAL & PREFERENCES CONFIG MANAGERS
// =============================================================================
class ModalController {
  constructor() {
    this.activeModal = null;
  }

  open(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.remove("opacity-0", "pointer-events-none");
    const container = modal.firstElementChild;
    if (container) {
      container.classList.remove("scale-95");
      container.classList.add("scale-100");
    }
    this.activeModal = modal;
    
    // Accessibility focus setups
    modal.setAttribute("aria-hidden", "false");
    const firstInput = container.querySelector("input, select, textarea");
    if (firstInput) setTimeout(() => firstInput.focus(), 150);
  }

  close(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.add("opacity-0", "pointer-events-none");
    const container = modal.firstElementChild;
    if (container) {
      container.classList.remove("scale-100");
      container.classList.add("scale-95");
    }
    modal.setAttribute("aria-hidden", "true");
    if (this.activeModal === modal) this.activeModal = null;
  }

  closeAll() {
    const modals = document.querySelectorAll('div[role="dialog"]');
    modals.forEach(modal => {
      modal.classList.add("opacity-0", "pointer-events-none");
      const container = modal.firstElementChild;
      if (container) {
        container.classList.remove("scale-100");
        container.classList.add("scale-95");
      }
      modal.setAttribute("aria-hidden", "true");
    });
    this.activeModal = null;
  }
}

const Modals = new ModalController();

// =============================================================================
// 3. SECURE LOCAL STORAGE DATA MANAGERS
// =============================================================================
class StorageManager {
  static saveState() {
    try {
      localStorage.setItem(CONFIG.STORAGE_KEYS.ANIME, JSON.stringify(State.animeList));
      localStorage.setItem(CONFIG.STORAGE_KEYS.SETTINGS, JSON.stringify(State.settings));
      localStorage.setItem(CONFIG.STORAGE_KEYS.RECENT_SEARCH, JSON.stringify(State.recentSearches));
      Logger.info("Persisted state variables successfully committed to Storage.");
    } catch (e) {
      Logger.error("Error writing metrics state to localStorage:", e);
      Toasts.show("Save Interrupted", "Browser storage is full or has disabled caching.", "error");
    }
  }

  static restoreState() {
    try {
      const savedAnime = localStorage.getItem(CONFIG.STORAGE_KEYS.ANIME);
      const savedSettings = localStorage.getItem(CONFIG.STORAGE_KEYS.SETTINGS);
      const savedSearch = localStorage.getItem(CONFIG.STORAGE_KEYS.RECENT_SEARCH);

      if (savedAnime) State.animeList = JSON.parse(savedAnime);
      if (savedSettings) State.settings = JSON.parse(savedSettings);
      if (savedSearch) State.recentSearches = JSON.parse(savedSearch);

      Logger.info("System state fully rehydrated from browser sandbox.");
    } catch (e) {
      Logger.error("Failed to parse local stored variables:", e);
      Toasts.show("Restoration Failure", "Corrupted offline datasets were detected and reset.", "warning");
    }
  }

  static wipeAllData() {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.ANIME);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.RECENT_SEARCH);
    State.animeList = [];
    State.settings = { amoledMode: true, darkTheme: true, animationsFluid: true };
    State.recentSearches = [];
    this.saveState();
  }
}

// =============================================================================
// 4. JIKAN REST API CONNECTOR
// =============================================================================
class JikanAPIService {
  static async searchAnime(query, filters = {}) {
    if (State.isOffline) {
      Logger.warn("Network request blocked: Client is offline.");
      throw new Error("OFFLINE");
    }

    let url = `${CONFIG.JIKAN_API_BASE}/anime?q=${encodeURIComponent(query)}&limit=8`;

    // Append filter query params if configured
    if (filters.status && filters.status !== "ALL") {
      url += `&status=${filters.status.toLowerCase()}`;
    }
    if (filters.score && filters.score !== "ALL") {
      url += `&min_score=${filters.score}`;
    }

    try {
      const response = await fetch(url);
      if (response.status === 429) {
        throw new Error("RATE_LIMIT");
      }
      if (!response.ok) {
        throw new Error(`HTTP_${response.status}`);
      }
      const result = await response.json();
      return result.data || [];
    } catch (err) {
      Logger.error("API Call error:", err);
      throw err;
    }
  }

  static async fetchSeasonalSpotlight() {
    if (State.isOffline) return null;
    try {
      const res = await fetch(`${CONFIG.JIKAN_API_BASE}/seasons/now?limit=1`);
      if (res.ok) {
        const payload = await res.json();
        return payload.data?.[0] || null;
      }
    } catch (e) {
      Logger.warn("Spotlight prefetch error:", e);
    }
    return null;
  }
}

// =============================================================================
// 5. THE GRAPHICAL RENDERING ENGINE (DOM LAYOUT UPDATER)
// =============================================================================
class DOMRenderer {
  static initModalsForms() {
    // 1. Programmatically Inject Add Anime Modal Forms
    const addModal = document.getElementById("addAnimeModal");
    if (addModal) {
      addModal.innerHTML = `
        <div class="w-full max-w-lg rounded-3xl border border-white/10 bg-[#07070e] p-6 shadow-2xl transform scale-95 transition-transform duration-300">
          <div class="flex justify-between items-center border-b border-white/5 pb-4 mb-4">
            <h3 id="add-modal-title" class="font-display font-extrabold text-lg text-white">Add Anime To Keep</h3>
            <button class="modal-close-trigger w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <form id="addAnimeForm" class="flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold text-slate-400 uppercase tracking-wider">Anime Name</label>
              <input type="text" id="add_name" required class="w-full px-4 py-3 bg-[#020205] border border-white/5 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/30 transition-all" placeholder="Enter title name...">
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold text-slate-400 uppercase tracking-wider">Keep Category</label>
                <select id="add_category" class="w-full px-4 py-3 bg-[#020205] border border-white/5 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-brand-blue/50 cursor-pointer">
                  <option value="Watching">📺 Ongoing Anime</option>
                  <option value="Waiting">⏳ Waiting</option>
                  <option value="Completed">✅ Completed</option>
                  <option value="Dropped">❌ Dropped</option>
                  <option value="Suggestions">✨ Suggestions</option>
                </select>
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold text-slate-400 uppercase tracking-wider">Episodes Watched</label>
                <input type="number" id="add_episodes" min="0" value="0" class="w-full px-4 py-3 bg-[#020205] border border-white/5 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/30 transition-all">
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold text-slate-400 uppercase tracking-wider">Rating Score (1-10)</label>
                <input type="number" id="add_rating" min="0" max="10" step="0.5" class="w-full px-4 py-3 bg-[#020205] border border-white/5 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/30 transition-all" placeholder="Optional rating...">
              </div>
              <div class="flex flex-col gap-1.5 justify-center pt-4 sm:pt-0">
                <label class="flex items-center gap-2.5 cursor-pointer text-slate-300 select-none">
                  <input type="checkbox" id="add_favorite" class="w-4 h-4 rounded text-brand-blue bg-[#020205] border-white/5 focus:ring-0">
                  <span class="text-xs font-bold uppercase tracking-wider">Pin to Favorites</span>
                </label>
              </div>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold text-slate-400 uppercase tracking-wider">Personal Notes</label>
              <textarea id="add_notes" rows="3" class="w-full px-4 py-3 bg-[#020205] border border-white/5 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/30 transition-all resize-none" placeholder="Write thoughts or notes here..."></textarea>
            </div>
            <div class="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-white/5">
              <button type="button" class="modal-close-trigger px-5 py-2.5 rounded-xl hover:bg-white/5 font-semibold text-xs text-slate-400 hover:text-white transition-all">Cancel</button>
              <button type="submit" class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-blue to-brand-purple hover:opacity-90 font-bold text-xs text-white shadow-lg active:scale-95 transition-all">Save To Keep</button>
            </div>
          </form>
        </div>
      `;
    }

    // 2. Programmatically Inject Edit Anime Modal Forms
    const editModal = document.getElementById("editAnimeModal");
    if (editModal) {
      editModal.innerHTML = `
        <div class="w-full max-w-lg rounded-3xl border border-white/10 bg-[#07070e] p-6 shadow-2xl transform scale-95 transition-transform duration-300">
          <div class="flex justify-between items-center border-b border-white/5 pb-4 mb-4">
            <h3 id="edit-modal-title" class="font-display font-extrabold text-lg text-white">Edit Library Item</h3>
            <button class="modal-close-trigger w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <form id="editAnimeForm" class="flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold text-slate-400 uppercase tracking-wider">Anime Name</label>
              <input type="text" id="edit_name" required class="w-full px-4 py-3 bg-[#020205] border border-white/5 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/30 transition-all">
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold text-slate-400 uppercase tracking-wider">Keep Category</label>
                <select id="edit_category" class="w-full px-4 py-3 bg-[#020205] border border-white/5 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-brand-blue/50 cursor-pointer">
                  <option value="Watching">📺 Ongoing Anime</option>
                  <option value="Waiting">⏳ Waiting</option>
                  <option value="Completed">✅ Completed</option>
                  <option value="Dropped">❌ Dropped</option>
                  <option value="Suggestions">✨ Suggestions</option>
                </select>
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold text-slate-400 uppercase tracking-wider">Episodes Watched</label>
                <input type="number" id="edit_episodes" min="0" class="w-full px-4 py-3 bg-[#020205] border border-white/5 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/30 transition-all">
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold text-slate-400 uppercase tracking-wider">Rating Score (1-10)</label>
                <input type="number" id="edit_rating" min="0" max="10" step="0.5" class="w-full px-4 py-3 bg-[#020205] border border-white/5 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/30 transition-all">
              </div>
              <div class="flex flex-col gap-1.5 justify-center pt-4 sm:pt-0">
                <label class="flex items-center gap-2.5 cursor-pointer text-slate-300 select-none">
                  <input type="checkbox" id="edit_favorite" class="w-4 h-4 rounded text-brand-blue bg-[#020205] border-white/5 focus:ring-0">
                  <span class="text-xs font-bold uppercase tracking-wider">Pin to Favorites</span>
                </label>
              </div>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold text-slate-400 uppercase tracking-wider">Personal Notes</label>
              <textarea id="edit_notes" rows="3" class="w-full px-4 py-3 bg-[#020205] border border-white/5 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/30 transition-all resize-none"></textarea>
            </div>
            <div class="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-white/5">
              <button type="button" class="modal-close-trigger px-5 py-2.5 rounded-xl hover:bg-white/5 font-semibold text-xs text-slate-400 hover:text-white transition-all">Cancel</button>
              <button type="submit" class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-blue to-brand-purple hover:opacity-90 font-bold text-xs text-white shadow-lg active:scale-95 transition-all">Save Changes</button>
            </div>
          </form>
        </div>
      `;
    }

    // 3. Programmatically Inject Delete Confirmation Modal Forms
    const delModal = document.getElementById("deleteConfirmModal");
    if (delModal) {
      delModal.innerHTML = `
        <div class="w-full max-w-sm rounded-3xl border border-white/10 bg-[#07070e] p-6 shadow-2xl transform scale-95 transition-transform duration-300">
          <div class="flex justify-between items-center border-b border-white/5 pb-4 mb-4">
            <h3 id="delete-modal-title" class="font-display font-extrabold text-base text-white">Confirm Removal</h3>
            <button class="modal-close-trigger w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="flex flex-col gap-4 mt-2">
            <p class="text-sm text-slate-400 leading-relaxed">Are you absolutely sure you want to delete <b class="text-white" id="delete_target_title">this item</b> permanently from your Keep library?</p>
            <div class="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
              <button type="button" class="modal-clo
