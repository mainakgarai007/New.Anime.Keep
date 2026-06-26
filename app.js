```javascript
/**
 * Anime.Keep - Track • Organize • Discover • Watch • Connect
 * Production-Ready Standalone Client Application Architecture
 * Designed by a Senior Software Architect & JavaScript Engineer
 * * Features implemented:
 * - Direct style & component injection for standalone single-file execution
 * - Reactive State Management
 * - Robust Jikan v4 API engine with Debouncing, Caching, and Online/Offline Fallbacks
 * - Advanced Multi-tier Filtration (Genre, Status, Score, Type, Season, Year)
 * - Complete CRUD on Tracked Anime List with Modal forms and strict validations
 * - Fully animated custom Notification Toast pipeline
 * - Statistics Engine showing horizontal charts, averages, and aggregate progress
 * - System theme integrations (Light/Dark/AMOLED mode support)
 * - File-based Import / Export (JSON standard check)
 * - Productivity Keyboard Shortcuts & accessibility controls
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. DYNAMIC ASSET & STYLING INJECTOR
  // =========================================================================
  const injectDependencies = () => {
    // 1. Tailwind CSS
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }

    // Tailwind Custom Configuration
    window.tailwind = {
      config: {
        darkMode: 'class',
        theme: {
          extend: {
            fontFamily: {
              sans: ['Plus Jakarta Sans', 'sans-serif'],
              display: ['Outfit', 'sans-serif'],
            },
            colors: {
              brand: {
                50: '#f5f3ff',
                100: '#ede9fe',
                200: '#ddd6fe',
                300: '#c4b5fd',
                400: '#a78bfa',
                500: '#8b5cf6',
                600: '#7c3aed',
                700: '#6d28d9',
                800: '#5b21b6',
                900: '#4c1d95',
                950: '#2e1065',
              },
              dark: {
                50: '#f8fafc',
                100: '#f1f5f9',
                800: '#1e293b',
                900: '#0f172a',
                950: '#030712'
              }
            }
          }
        }
      }
    };

    // 2. FontAwesome Icons
    if (!document.getElementById('fontawesome-cdn')) {
      const link = document.createElement('link');
      link.id = 'fontawesome-cdn';
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
      document.head.appendChild(link);
    }

    // 3. Google Fonts
    if (!document.getElementById('google-fonts-cdn')) {
      const link = document.createElement('link');
      link.id = 'google-fonts-cdn';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap';
      document.head.appendChild(link);
    }

    // 4. Custom Application Keyframe Animations & CSS Variables
    if (!document.getElementById('anime-keep-custom-styles')) {
      const style = document.createElement('style');
      style.id = 'anime-keep-custom-styles';
      style.innerHTML = `
        /* Premium Smooth Scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        .dark ::-webkit-scrollbar-thumb {
          background: #4b5563;
          border-radius: 9999px;
        }
        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 9999px;
        }

        /* Fluid transitions */
        .page-transition {
          animation: pageFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .card-insert {
          animation: cardSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .card-delete {
          animation: cardFadeOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .modal-zoom {
          animation: modalScaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }

        @keyframes pageFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cardSlideIn {
          from { opacity: 0; transform: translateY(24px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes cardFadeOut {
          to { opacity: 0; transform: scale(0.9) translateY(-10px); height: 0; padding: 0; margin: 0; }
        }
        @keyframes modalScaleUp {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        /* Glassmorphism Accents */
        .glass-panel {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .dark .glass-panel {
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .amoled .glass-panel {
          background: rgba(0, 0, 0, 0.8);
          border: 1px solid #1e293b;
        }
        .amoled-bg {
          background-color: #000000 !important;
        }
        
        /* Disabled transitions configuration */
        .no-transitions * {
          transition: none !important;
          animation: none !important;
        }
      `;
      document.head.appendChild(style);
    }
  };

  // =========================================================================
  // 2. SYSTEM UTILITIES & CONFIGURATIONS
  // =========================================================================
  const Utils = {
    uuid: () => 'ak-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36),
    
    escapeHtml: (str) => {
      if (!str) return '';
      return str.replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
    },

    formatDate: (isoString) => {
      if (!isoString) return 'Unknown Date';
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    },

    debounce: (func, delay) => {
      let timeoutId;
      return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
      };
    }
  };

  // =========================================================================
  // 3. TOAST NOTIFICATION ENGINE
  // =========================================================================
  class NotificationManager {
    constructor() {
      this.container = null;
      this.init();
    }

    init() {
      let el = document.getElementById('ak-toast-container');
      if (!el) {
        el = document.createElement('div');
        el.id = 'ak-toast-container';
        el.className = 'fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full px-4 sm:px-0';
        document.body.appendChild(el);
      }
      this.container = el;
    }

    show(message, type = 'info', duration = 4000) {
      const id = Utils.uuid();
      const toast = document.createElement('div');
      toast.id = id;
      
      let themeClasses = '';
      let icon = '';
      
      switch (type) {
        case 'success':
          themeClasses = 'bg-emerald-500 text-white shadow-emerald-500/10';
          icon = 'fa-circle-check';
          break;
        case 'error':
          themeClasses = 'bg-rose-500 text-white shadow-rose-500/10';
          icon = 'fa-circle-xmark';
          break;
        case 'warning':
          themeClasses = 'bg-amber-500 text-white shadow-amber-500/10';
          icon = 'fa-triangle-exclamation';
          break;
        case 'info':
        default:
          themeClasses = 'bg-brand-600 text-white shadow-brand-500/10';
          icon = 'fa-circle-info';
          break;
      }

      toast.className = `transform translate-y-4 opacity-0 transition-all duration-300 ease-out flex items-center justify-between p-4 rounded-xl shadow-xl ${themeClasses}`;
      toast.innerHTML = `
        <div class="flex items-center gap-3">
          <i class="fa-solid ${icon} text-lg"></i>
          <p class="font-medium text-sm leading-snug">${Utils.escapeHtml(message)}</p>
        </div>
        <button class="ml-4 opacity-70 hover:opacity-100 transition-opacity" onclick="this.parentElement.remove()">
          <i class="fa-solid fa-xmark"></i>
        </button>
      `;

      this.container.appendChild(toast);

      // Trigger Animation Frame
      requestAnimationFrame(() => {
        toast.classList.remove('translate-y-4', 'opacity-0');
      });

      // Automated Destruction sequence
      setTimeout(() => {
        toast.classList.add('translate-y-[-10px]', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }
  }

  // =========================================================================
  // 4. PERSISTENT STORAGE CONTROLLER
  // =========================================================================
  class StorageManager {
    constructor() {
      this.storageKey = 'anime_keep_store_v2';
    }

    getDefaultState() {
      return {
        anime: [
          {
            id: 'ak-default-1',
            title: "Frieren: Beyond Journey's End",
            category: 'Watching',
            episodesWatched: 12,
            episodesTotal: 28,
            rating: 10,
            notes: "An emotional adventure with breathtaking artwork and score. Captures the slow beauty of passage of time perfectly.",
            isFavorite: true,
            genres: ['Fantasy', 'Adventure', 'Drama'],
            image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&auto=format&fit=crop&q=60', // Mock representation placeholder
            status: 'Currently Airing',
            createdAt: new Date().toISOString()
          },
          {
            id: 'ak-default-2',
            title: "Attack on Titan",
            category: 'Completed',
            episodesWatched: 87,
            episodesTotal: 87,
            rating: 9,
            notes: "One of the greatest modern epics. Incredible geopolitical plotting and superb action sequences.",
            isFavorite: true,
            genres: ['Action', 'Drama', 'Suspense'],
            image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&auto=format&fit=crop&q=60',
            status: 'Finished Airing',
            createdAt: new Date(Date.now() - 604800000).toISOString()
          }
        ],
        categories: ['Watching', 'Completed', 'Dropped', 'Waiting', 'Suggestions'],
        recentSearches: [],
        settings: {
          theme: 'dark', // 'light' or 'dark'
          amoled: false,
          animations: true
        }
      };
    }

    load() {
      try {
        const payload = localStorage.getItem(this.storageKey);
        if (!payload) {
          const fallback = this.getDefaultState();
          this.save(fallback);
          return fallback;
        }
        const state = JSON.parse(payload);
        // Ensure properties exist on migration
        if (!state.anime) state.anime = [];
        if (!state.categories) state.categories = ['Watching', 'Completed', 'Dropped', 'Waiting', 'Suggestions'];
        if (!state.recentSearches) state.recentSearches = [];
        if (!state.settings) state.settings = { theme: 'dark', amoled: false, animations: true };
        return state;
      } catch (err) {
        console.error('Failed to parse local storage payload', err);
        return this.getDefaultState();
      }
    }

    save(state) {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(state));
        return true;
      } catch (err) {
        console.error('Local storage state persistence failed', err);
        return false;
      }
    }

    reset() {
      try {
        localStorage.removeItem(this.storageKey);
        return true;
      } catch (err) {
        return false;
      }
    }
  }

  // =========================================================================
  // 5. JIKAN V4 SEARCH INTERACTION GATEWAY (API MODEL)
  // =========================================================================
  class JikanGateway {
    constructor(notifManager) {
      this.baseUrl = 'https://api.jikan.moe/v4';
      this.notifier = notifManager;
      this.searchCache = new Map(); // Keep requests cached during single execution
    }

    async searchAnime(query, filters = {}) {
      if (!navigator.onLine) {
        this.notifier.show('You are currently offline. Jikan Search is unavailable.', 'warning');
        return { error: 'Offline Mode active', results: [] };
      }

      // Build Query String Parameters
      let endpoint = `${this.baseUrl}/anime?q=${encodeURIComponent(query)}&sfw=true&limit=15`;
      
      // Append Advanced API Search Params
      if (filters.status) endpoint += `&status=${filters.status}`;
      if (filters.type) endpoint += `&type=${filters.type}`;
      if (filters.score) endpoint += `&min_score=${filters.score}`;
      
      // Cache hits checker
      if (this.searchCache.has(endpoint)) {
        return this.searchCache.get(endpoint);
      }

      try {
        const response = await this.fetchWithRetry(endpoint);
        if (!response.ok) {
          if (response.status === 429) {
            this.notifier.show('Jikan rate limit hit. Slow down!', 'warning');
            throw new Error('Jikan API 429 Too Many Requests');
          }
          throw new Error(`Jikan API Error: Server responded with status ${response.status}`);
        }

        const payload = await response.json();
        const results = (payload.data || []).map(item => ({
          malId: item.mal_id,
          title: item.title_english || item.title || 'Untitled',
          originalTitle: item.title,
          image: item.images?.jpg?.image_url || item.images?.webp?.image_url || '',
          episodesTotal: item.episodes || 0,
          status: item.status || 'Unknown',
          score: item.score || 0,
          genres: (item.genres || []).map(g => g.name),
          synopsis: item.synopsis || 'No summary available.',
          year: item.year || item.aired?.prop?.from?.year || 'Unknown',
          season: item.season || 'Unknown'
        }));

        this.searchCache.set(endpoint, results);
        return results;
      } catch (err) {
        console.error('Jikan API Query Failed', err);
        return [];
      }
    }

    // Dynamic Retrying with Exponential Backoff
    async fetchWithRetry(url, retries = 3, delay = 1000) {
      try {
        const response = await fetch(url);
        if (response.status === 429 && retries > 0) {
          await new Promise(res => setTimeout(res, delay));
          return this.fetchWithRetry(url, retries - 1, delay * 2);
        }
        return response;
      } catch (err) {
        if (retries > 0) {
          await new Promise(res => setTimeout(res, delay));
          return this.fetchWithRetry(url, retries - 1, delay * 2);
        }
        throw err;
      }
    }
  }

  // =========================================================================
  // 6. MAIN APPLICATION MODULE ARCHITECTURE
  // =========================================================================
  class AnimeKeepApp {
    constructor() {
      this.notifier = new NotificationManager();
      this.storage = new StorageManager();
      this.jikan = new JikanGateway(this.notifier);
      
      this.state = this.storage.load();
      
      // UI Session Control States
      this.activeTab = 'dashboard';
      this.dashboardCategory = 'All'; // "All" or explicit Tracking Category
      this.dashboardSearchQuery = '';
      this.discoverQuery = '';
      this.discoverFilters = {
        status: '',
        type: '',
        score: '',
      };
      
      this.selectedEditAnime = null;
      this.selectedDeleteAnimeId = null;

      // Ensure system preferences are handled
      this.applyThemeSettings();
    }

    init() {
      injectDependencies();
      
      // Inject root application structure dynamically
      this.renderAppShell();
      
      // Mount Application Interactive Handlers
      this.bindDOMEvents();
      this.bindShortcuts();
      
      // Trigger Initial Dynamic View Rendering
      this.renderActiveView();
      this.renderStatsDashboard();

      this.notifier.show('Anime.Keep initialized successfully!', 'success');
      
      // Setup network connectivity indicators
      window.addEventListener('online', () => {
        this.notifier.show('Internet connection restored. Discovery enabled.', 'info');
        this.updateNetworkBadge(true);
      });
      window.addEventListener('offline', () => {
        this.notifier.show('You are offline. Trackers remain operational, Discovery disabled.', 'warning');
        this.updateNetworkBadge(false);
      });
      this.updateNetworkBadge(navigator.onLine);
    }

    // =========================================================================
    // THEME & VIEW ADJUSTMENT ENGINE
    // =========================================================================
    applyThemeSettings() {
      const root = document.documentElement;
      const settings = this.state.settings;

      // Handle CSS transition suppression
      if (!settings.animations) {
        root.classList.add('no-transitions');
      } else {
        root.classList.remove('no-transitions');
      }

      // Handle Themes
      if (settings.theme === 'dark') {
        root.classList.add('dark');
        if (settings.amoled) {
          root.classList.add('amoled');
          document.body.classList.add('amoled-bg');
        } else {
          root.classList.remove('amoled');
          document.body.classList.remove('amoled-bg');
        }
      } else {
        root.classList.remove('dark', 'amoled');
        document.body.classList.remove('amoled-bg');
      }
    }

    updateNetworkBadge(isOnline) {
      const badge = document.getElementById('ak-network-badge');
      if (badge) {
        if (isOnline) {
          badge.className = "flex items-center gap-2 px-3 py-1 text-xs rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
          badge.innerHTML = `<span class="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span> Online`;
        } else {
          badge.className = "flex items-center gap-2 px-3 py-1 text-xs rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20";
          badge.innerHTML = `<span class="h-2 w-2 rounded-full bg-rose-500"></span> Offline`;
        }
      }
    }

    // =========================================================================
    // PRIMARY STRUCTURAL CODE (DOM INJECTION)
    // =========================================================================
    renderAppShell() {
      // Clean and inject structural markup
      document.body.innerHTML = `
        <div class="min-h-screen bg-slate-50 dark:bg-slate-900 amoled:bg-black text-slate-800 dark:text-slate-100 flex flex-col md:flex-row font-sans transition-colors duration-300">
          
          <!-- MOBILE NAVIGATION HEADER -->
          <header class="md:hidden flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-950 amoled:bg-zinc-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
            <div class="flex items-center gap-2">
              <div class="bg-brand-600 text-white h-9 w-9 rounded-xl flex items-center justify-center shadow-lg shadow
