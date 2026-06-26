/**
 * Anime.Keep - Watchlists & Collections Module Engine
 * -----------------------------------------------------------------------------
 * Architect: Senior Frontend Developer & UI/UX Specialist
 * Purpose: Manages user watchlists and curated anime collections. 
 * Supports CRUD actions, duplication, pinning, dynamic sorting, drag-and-drop 
 * reordering, multi-select bulk operations, and schema-validated JSON backup/restoration.
 */

// Storage Keys
const WATCHLISTS_DB_KEY = "anime_keep_watchlists_db";
const BACKUP_FILE_PREFIX = "anime_keep_watchlist_backup_";

// Core App State
let watchlistsState = {
  collections: [],
  selectedIds: [], // Tracks multi-select target IDs
  isBulkModeActive: false,
  draggedItemId: null,
  activeFilters: {
    search: "",
    sort: "PINNED",
    type: "ALL"
  }
};

// System Default Curated Collections (Pre-loaded for fresh installations)
const systemWatchlistDefaults = [
  {
    id: "sys_favs",
    title: "Masterpiece Tier (Favorites)",
    description: "Anime entries containing perfect rating values and flawless production metrics.",
    coverUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=400&auto=format&fit=crop",
    icon: "fa-heart",
    pinned: true,
    type: "SYSTEM",
    animeCount: 24,
    accentColor: "from-amber-500/10 to-amber-500/20 text-amber-400 border-amber-500/20",
    lastModified: Date.now() - 1000 * 60 * 60
  },
  {
    id: "sys_completed",
    title: "Archived Completions",
    description: "Entire catalog collections of completed anime broadcasts.",
    coverUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=400&auto=format&fit=crop",
    icon: "fa-star",
    pinned: false,
    type: "SYSTEM",
    animeCount: 198,
    accentColor: "from-emerald-500/10 to-emerald-500/20 text-emerald-400 border-emerald-500/20",
    lastModified: Date.now() - 1000 * 60 * 60 * 4
  },
  {
    id: "sys_watching",
    title: "Active Watching Queue",
    description: "Shows currently undergoing active weekly episode trackers.",
    coverUrl: "https://images.unsplash.com/photo-1541562232579-512a21360020?q=80&w=400&auto=format&fit=crop",
    icon: "fa-tv",
    pinned: true,
    type: "SYSTEM",
    animeCount: 12,
    accentColor: "from-brand-blue/10 to-brand-blue/20 text-brand-blue border-brand-blue/20",
    lastModified: Date.now()
  },
  {
    id: "sys_ptw",
    title: "Anticipated PTW Backlog",
    description: "Scheduled releases currently marked on Plan to Watch list parameters.",
    coverUrl: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?q=80&w=400&auto=format&fit=crop",
    icon: "fa-tags",
    pinned: false,
    type: "SYSTEM",
    animeCount: 64,
    accentColor: "from-brand-purple/10 to-brand-purple/20 text-brand-purple border-brand-purple/20",
    lastModified: Date.now() - 1000 * 60 * 60 * 24
  }
];

// Document Object Model references cache map
let uiElements = {};

/**
 * Main application initialization triggered on page load.
 */
document.addEventListener("DOMContentLoaded", () => {
  cacheDOMReferences();
  injectCustomUIStructures(); // Enhances HTML dynamically for bulk controls & modals
  loadWatchlistsFromDatabase();
  bindDashboardActionListeners();
  recalculateCollectionAnalytics();
});

/**
 * Cache layout DOM targets inside memory.
 */
function cacheDOMReferences() {
  uiElements = {
    grid: document.getElementById('collections-grid'),
    pinnedGrid: document.getElementById('pinned-lists-grid'),
    pinnedSection: document.getElementById('pinned-section'),
    searchInput: document.getElementById('watchlist-search-input'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    sortSelector: document.getElementById('sort-selector'),
    typeSelector: document.getElementById('type-selector'),
    emptyState: document.getElementById('empty-state-container'),
    createModal: document.getElementById('create-modal'),
    
    // Inputs inside Create modal
    inputTitle: document.getElementById('input-title'),
    inputDesc: document.getElementById('input-desc'),
    inputCover: document.getElementById('input-cover'),
    inputIcon: document.getElementById('input-icon'),
    inputPinned: document.getElementById('input-pinned'),
    
    // Metric Cards
    metricTotalLists: document.getElementById('metric-total-lists'),
    metricPinnedLists: document.getElementById('metric-pinned-lists'),
    metricSystemLists: document.getElementById('metric-system-lists'),
    metricTotalAnime: document.getElementById('metric-total-anime'),
    
    // Notifications Snackbar
    toast: document.getElementById('toast-notification'),
    toastTitle: document.getElementById('toast-title'),
    toastBody: document.getElementById('toast-body'),
    
    resetFiltersBtn: document.getElementById('reset-filters-btn')
  };
}

/**
 * Dynamically inject advanced UI elements into watchlists.html.
 * This satisfies multi-select controls, JSON import triggers, and custom confirmation panels.
 */
function injectCustomUIStructures() {
  // 1. Create JSON Import File Trigger (Hidden)
  if (!document.getElementById('hidden-import-file-input')) {
    const importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.id = 'hidden-import-file-input';
    importInput.accept = '.json';
    importInput.className = 'hidden';
    importInput.addEventListener('change', executeImportRestoration);
    document.body.appendChild(importInput);
  }

  // 2. Inject Dynamic Bulk Mode Actions Bar
  if (!document.getElementById('bulk-actions-toolbar')) {
    const bulkToolbar = document.createElement('div');
    bulkToolbar.id = 'bulk-actions-toolbar';
    bulkToolbar.className = "fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] transform translate-y-32 opacity-0 pointer-events-none transition-all duration-300 glass-panel rounded-2xl border border-brand-blue/30 px-6 py-4 shadow-2xl flex items-center gap-6 max-w-xl w-[90%]";
    bulkToolbar.innerHTML = `
      <div class="flex flex-col">
        <span id="bulk-selection-count" class="font-black text-xs text-white">0 Selected</span>
        <span class="text-[10px] text-slate-500 font-semibold uppercase">Multi-select Active</span>
      </div>
      <div class="h-8 w-px bg-white/10"></div>
      <div class="flex items-center gap-2 flex-grow justify-end">
        <button onclick="applyBulkPinToggle()" class="px-3.5 py-2 rounded-xl bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95">
          <i class="fa-solid fa-thumbtack text-brand-cyan"></i> Pin/Unpin
        </button>
        <button onclick="triggerBulkDeleteConfirmation()" class="px-3.5 py-2 rounded-xl bg-rose-950/20 border border-rose-500/15 hover:bg-rose-950/40 text-rose-500 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95">
          <i class="fa-solid fa-trash-can"></i> Delete
        </button>
        <button onclick="deactivateBulkSelectionMode()" class="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95">
          Cancel
        </button>
      </div>
    `;
    document.body.appendChild(bulkToolbar);
  }

  // 3. Inject Custom Confirmation Dialog Modal (Replaces browser confirm)
  if (!document.getElementById('custom-confirm-modal')) {
    const confirmModal = document.createElement('div');
    confirmModal.id = 'custom-confirm-modal';
    confirmModal.className = "fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm opacity-0 pointer-events-none transition-all duration-300";
    confirmModal.innerHTML = `
      <div class="glass-panel rounded-2xl border border-white/10 w-full max-w-sm overflow-hidden transform scale-95 transition-all duration-300 shadow-2xl">
        <div class="px-6 py-5 border-b border-white/5 flex items-center gap-3 bg-slate-950/40">
          <div class="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
            <i class="fa-solid fa-triangle-exclamation text-sm"></i>
          </div>
          <h3 id="confirm-modal-title" class="text-sm font-bold text-white">Confirm Operation</h3>
        </div>
        <div class="p-6">
          <p id="confirm-modal-desc" class="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Are you sure you want to perform this action?
          </p>
        </div>
        <div class="px-6 py-4 border-t border-white/5 bg-[#04040a] flex items-center justify-end gap-3 shrink-0">
          <button id="confirm-modal-cancel-btn" class="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-all">Cancel</button>
          <button id="confirm-modal-action-btn" class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold transition-all active:scale-95 shadow-md shadow-rose-600/20">Confirm</button>
        </div>
      </div>
    `;
    document.body.appendChild(confirmModal);
  }

  // 4. Inject Watchlist Backup Options inside search filtering wrapper dynamically
  const toolbarContainer = document.querySelector('section.glass-panel');
  if (toolbarContainer && !document.getElementById('backup-actions-container')) {
    const backupBox = document.createElement('div');
    backupBox.id = 'backup-actions-container';
    backupBox.className = "flex items-center gap-2 border-t md:border-t-0 border-white/5 pt-3 md:pt-0 w-full md:w-auto";
    backupBox.innerHTML = `
      <button onclick="triggerJsonBackupDownload()" class="w-full md:w-auto px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5" title="Export Watchlist Backup File">
        <i class="fa-solid fa-file-export"></i> <span>Export</span>
      </button>
      <button onclick="triggerJsonRestoreSelector()" class="w-full md:w-auto px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5" title="Import Watchlist Restoration File">
        <i class="fa-solid fa-file-import"></i> <span>Import</span>
      </button>
      <button id="bulk-toggle-trigger-btn" onclick="activateBulkSelectionMode()" class="w-full md:w-auto px-4 py-2.5 rounded-xl bg-brand-blue/15 hover:bg-brand-blue/25 border border-brand-blue/25 text-brand-blue text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5" title="Toggle Multi-Select Mode">
        <i class="fa-solid fa-check-double"></i> <span>Bulk Edit</span>
      </button>
    `;
    toolbarContainer.appendChild(backupBox);
  }
}

/**
 * Parse and load persistent collections state from LocalStorage.
 */
function loadWatchlistsFromDatabase() {
  const serializedCollections = localStorage.getItem(WATCHLISTS_DB_KEY);
  if (serializedCollections) {
    try {
      watchlistsState.collections = JSON.parse(serializedCollections);
    } catch (e) {
      console.warn("Watchlists cache recovery failed. Loading defaults...");
      watchlistsState.collections = [...systemWatchlistDefaults];
    }
  } else {
    // Zero-state default load
    watchlistsState.collections = [...systemWatchlistDefaults];
    saveWatchlistsToDatabase();
  }
}

/**
 * Commit current watchlists collection arrays back to LocalStorage database.
 */
function saveWatchlistsToDatabase() {
  localStorage.setItem(WATCHLISTS_DB_KEY, JSON.stringify(watchlistsState.collections));
}

/**
 * Set up dynamic visual triggers.
 */
function bindDashboardActionListeners() {
  // Live search bar filter with debounce wrapper
  let inputTimer;
  if (uiElements.searchInput) {
    uiElements.searchInput.addEventListener('input', (event) => {
      const val = event.target.value.trim();
      watchlistsState.activeFilters.search = val;

      if (val.length > 0) {
        uiElements.clearSearchBtn.classList.remove('hidden');
      } else {
        uiElements.clearSearchBtn.classList.add('hidden');
      }

      clearTimeout(inputTimer);
      inputTimer = setTimeout(() => {
        applyFiltersAndRender();
      }, 200);
    });
  }

  // Clear query criteria
  if (uiElements.clearSearchBtn) {
    uiElements.clearSearchBtn.addEventListener('click', () => {
      uiElements.searchInput.value = '';
      watchlistsState.activeFilters.search = '';
      uiElements.clearSearchBtn.classList.add('hidden');
      applyFiltersAndRender();
    });
  }

  // Sort parameter dropdown mapping
  if (uiElements.sortSelector) {
    uiElements.sortSelector.addEventListener('change', (event) => {
      watchlistsState.activeFilters.sort = event.target.value;
      applyFiltersAndRender();
    });
  }

  // Type categorizations dropdown mapping
  if (uiElements.typeSelector) {
    uiElements.typeSelector.addEventListener('change', (event) => {
      watchlistsState.activeFilters.type = event.target.value;
      applyFiltersAndRender();
    });
  }

  // Complete filter criteria reset trigger
  if (uiElements.resetFiltersBtn) {
    uiElements.resetFiltersBtn.addEventListener('click', () => {
      uiElements.searchInput.value = '';
      watchlistsState.activeFilters.search = '';
      uiElements.clearSearchBtn.classList.add('hidden');
      
      uiElements.sortSelector.value = 'PINNED';
      watchlistsState.activeFilters.sort = 'PINNED';
      
      uiElements.typeSelector.value = 'ALL';
      watchlistsState.activeFilters.type = 'ALL';
      
      applyFiltersAndRender();
    });
  }
}

/**
 * Filter Pipeline: Transforms raw collections dataset based on user options.
 */
function processFilterPipeline() {
  let filtered = [...watchlistsState.collections];

  // 1. Match type categorization properties
  const typeFilter = watchlistsState.activeFilters.type;
  if (typeFilter === 'SYSTEM') {
    filtered = filtered.filter(item => item.type === 'SYSTEM');
  } else if (typeFilter === 'CUSTOM') {
    filtered = filtered.filter(item => item.type === 'CUSTOM');
  } else if (typeFilter === 'PINNED_ONLY') {
    filtered = filtered.filter(item => item.pinned === true);
  }

  // 2. Match search queries tags
  const searchQuery = watchlistsState.activeFilters.search.toLowerCase();
  if (searchQuery.length > 0) {
    filtered = filtered.filter(item => {
      const matchTitle = item.title && item.title.toLowerCase().includes(searchQuery);
      const matchDesc = item.description && item.description.toLowerCase().includes(searchQuery);
      return matchTitle || matchDesc;
    });
  }

  // 3. Process sorting calculations
  const sortingChoice = watchlistsState.activeFilters.sort;
  if (sortingChoice === 'NAME_ASC') {
    filtered.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortingChoice === 'NAME_DESC') {
    filtered.sort((a, b) => b.title.localeCompare(a.title));
  } else if (sortingChoice === 'SIZE_DESC') {
    filtered.sort((a, b) => (b.animeCount || 0) - (a.animeCount || 0));
  } else if (sortingChoice === 'SIZE_ASC') {
    filtered.sort((a, b) => (a.animeCount || 0) - (b.animeCount || 0));
  } else if (sortingChoice === 'PINNED') {
    // Sort pinned priority on top
    filtered.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });
  }

  return filtered;
}

/**
 * Main rendering loop that populates both the standard and pinned collection grids.
 */
function applyFiltersAndRender() {
  const dataset = processFilterPipeline();

  // Handle empty state displays
  if (dataset.length === 0) {
    uiElements.grid.classList.add('hidden');
    uiElements.pinnedSection.classList.add('hidden');
    uiElements.emptyState.classList.remove('hidden');
    return;
  }

  uiElements.emptyState.classList.add('hidden');
  uiElements.grid.classList.remove('hidden');

  // Render pinned collection highlights grid block
  const pinnedItems = dataset.filter(item => item.pinned === true);
  if (pinnedItems.length > 0 && watchlistsState.activeFilters.type !== 'SYSTEM' && watchlistsState.activeFilters.type !== 'CUSTOM') {
    uiElements.pinnedSection.classList.remove('hidden');
    uiElements.pinnedGrid.innerHTML = pinnedItems.map(item => buildWatchlistCardMarkup(item)).join('');
  } else {
    uiElements.pinnedSection.classList.add('hidden');
  }

  // Render standard collections list grid
  uiElements.grid.innerHTML = dataset.map(item => buildWatchlistCardMarkup(item)).join('');

  // Re-attach HTML5 Drag-and-drop listener elements
  setupDragAndDropSorting();
}

/**
 * Watchlist Collection HTML card markup compiler.
 * Extends card UI functionality to handle inline multi-select checkbox triggers.
 */
function buildWatchlistCardMarkup(item) {
  const isPinned = item.pinned;
  const isSelected = watchlistsState.selectedIds.includes(item.id);
  const typeLabel = item.type === 'SYSTEM' ? 'Curated' : 'Custom';
  const customAccent = item.accentColor || 'from-brand-blue/10 to-brand-blue/20 text-brand-blue border-brand-blue/20';
  const coverBannerImage = item.coverUrl || 'https://images.unsplash.com/photo-1541562232579-512a21360020?q=80&w=400&auto=format&fit=crop';

  return `
    <article class="glass-card rounded-2xl overflow-hidden flex flex-col h-[290px] group relative cursor-pointer" 
             draggable="true" 
             data-id="${item.id}"
             onclick="handleCollectionCardClick('${item.id}', event)">
      
      <!-- Top Cover Image Frame Area -->
      <div class="relative h-2/5 w-full overflow-hidden shrink-0">
        <img src="${coverBannerImage}" alt="${item.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy">
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
        
        <!-- Top Left Meta Group Badges -->
        <div class="absolute top-3 left-3 flex items-center gap-1.5">
          <span class="px-2 py-0.5 rounded text-[9px] font-extrabold tracking-widest bg-slate-950/85 backdrop-blur-md text-slate-400 border border-white/5 uppercase">
            ${typeLabel}
          </span>
          <span class="px-2 py-0.5 rounded text-[9px] font-black text-brand-cyan bg-brand-cyan/15 border border-brand-cyan/25 uppercase">
            <i class="fa-solid fa-arrows-up-down-left-right text-[8px] mr-0.5"></i> Move
          </span>
        </div>

        <!-- Custom checkboxes overlay injected dynamically when bulk selections are enabled -->
        <div class="absolute top-3 right-3 flex items-center gap-2" onclick="event.stopPropagation()">
          ${watchlistsState.isBulkModeActive ? `
            <input type="checkbox" 
                   class="w-5 h-5 rounded-lg border-2 border-white/10 bg-slate-950/80 text-brand-blue focus:ring-brand-blue cursor-pointer"
                   ${isSelected ? 'checked' : ''} 
                   onchange="toggleSingleCardSelection('${item.id}')">
          ` : `
            <button onclick="toggleCollectionPinState('${item.id}')" 
                    class="w-7 h-7 rounded-lg ${isPinned ? 'bg-brand-cyan text-slate-950 shadow-md' : 'bg-slate-950/85 text-slate-400 hover:text-white'} border border-white/5 flex items-center justify-center transition-all active:scale-90" 
                    title="Pin Collection">
              <i class="fa-solid fa-thumbtack text-xs ${isPinned ? 'rotate-45' : ''}"></i>
            </button>
          `}
        </div>
      </div>

      <!-- Detail Card Description Block -->
      <div class="p-4 flex flex-col justify-between flex-grow bg-slate-950/40 relative">
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <!-- Graphical Icon Indicator -->
            <div class="w-7 h-7 rounded-lg bg-gradient-to-tr ${customAccent} border flex items-center justify-center shri
