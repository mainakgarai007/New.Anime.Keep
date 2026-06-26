```javascript
/**
 * Anime.Keep - Anime Details Module Engine
 * -----------------------------------------------------------------------------
 * Architect: Senior JavaScript Engineer & UI/UX Specialist
 * Purpose: Connects the details view to the Jikan (MAL) API, manages local storage
 * cache with a 24h Time-To-Live (TTL), provides fluid transitions, a dynamic
 * image gallery light-box modal, comment section persistence, and robust
 * exponential retry network handling.
 */

// Global Config & Storage Namespaces
const JIKAN_API_BASE = "https://api.jikan.moe/v4";
const REMINDERS_KEY = "anime_keep_reminders";
const COMMENTS_KEY = "anime_keep_comments_db";
const DETAIL_CACHE_PREFIX = "anime_keep_details_cache_";
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 Hours Cache TTL

// Global Application Instance State
const animePage = {
  id: null,
  metadata: null,
  bookmarks: JSON.parse(localStorage.getItem(REMINDERS_KEY) || "[]"),
  comments: []
};

// DOM References Cache Map
let dom = {};

/**
 * Main Initialization lifecycle triggered on DOM ready.
 */
document.addEventListener("DOMContentLoaded", async () => {
  cacheDomElements();
  parseTargetIdFromUrl();
  setupDynamicGalleryModal();
  bindInteractiveEventHandlers();
  
  // Clean up any historical expired detail caches from LocalStorage
  sweepExpiredCaches();

  // Load metadata and cast grids
  await loadAnimeDetailsProfile();
  
  // Hydrate user comments
  renderUserCommentsFeed();
});

/**
 * Cache and organize active DOM elements.
 */
function cacheDomElements() {
  dom = {
    shimmer: document.getElementById('details-shimmer'),
    contentView: document.getElementById('details-content-view'),
    
    // Header & Meta Elements
    shareBtn: document.getElementById('share-btn'),
    favoriteBtn: document.getElementById('favorite-btn'),
    banner: document.getElementById('anime-banner'),
    poster: document.getElementById('anime-poster'),
    typeBadge: document.getElementById('anime-type'),
    seasonYear: document.getElementById('anime-season-year'),
    statusBadge: document.getElementById('anime-status-badge'),
    
    title: document.getElementById('anime-title'),
    titleJapanese: document.getElementById('anime-title-japanese'),
    titleSynonyms: document.getElementById('anime-title-synonyms'),
    
    // Ratings & Scores Sidebar
    score: document.getElementById('anime-score'),
    rank: document.getElementById('anime-rank'),
    popularity: document.getElementById('anime-popularity'),
    
    // Production Metadata Sidebar
    studios: document.getElementById('anime-studios'),
    episodes: document.getElementById('anime-episodes'),
    duration: document.getElementById('anime-duration'),
    broadcast: document.getElementById('anime-broadcast'),
    rating: document.getElementById('anime-rating'),
    producers: document.getElementById('anime-producers'),
    streamingContainer: document.getElementById('streaming-container'),
    
    // Categorization Badges
    genres: document.getElementById('anime-genres'),
    themes: document.getElementById('anime-themes'),
    demographics: document.getElementById('anime-demographics'),
    
    // Synopsis & Media Panels
    synopsis: document.getElementById('anime-synopsis'),
    trailerSection: document.getElementById('trailer-section'),
    trailerContainer: document.getElementById('trailer-container'),
    charactersContainer: document.getElementById('characters-container'),
    screenshotsSection: document.getElementById('screenshots-section'),
    screenshotsContainer: document.getElementById('screenshots-container'),
    relatedSection: document.getElementById('related-section'),
    relatedContainer: document.getElementById('related-container'),
    recommendationsContainer: document.getElementById('recommendations-container'),
    reviewsContainer: document.getElementById('reviews-container'),
    
    // Interactive Comments Panel
    commentCountLabel: document.getElementById('comment-count-label'),
    commentTextarea: document.getElementById('comment-textarea'),
    postCommentBtn: document.getElementById('post-comment-btn'),
    commentsContainer: document.getElementById('comments-container'),
    
    // System Notifications Toast
    toast: document.getElementById('toast-notification'),
    toastTitle: document.getElementById('toast-title'),
    toastBody: document.getElementById('toast-body')
  };
}

/**
 * Extract active MAL ID from URL Search queries.
 * Fallback to Frieren (52991) if parameters are blank.
 */
function parseTargetIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const rawId = params.get('id');
  animePage.id = rawId ? parseInt(rawId) : 52991;
}

/**
 * Configure and register interactive listeners on UI elements.
 */
function bindInteractiveEventHandlers() {
  // Share Button Trigger
  if (dom.shareBtn) {
    dom.shareBtn.addEventListener('click', () => {
      const currentUrl = window.location.href;
      copyDetailsUrlToClipboard(currentUrl);
    });
  }

  // Favorite / Reminders alert subscription toggle
  if (dom.favoriteBtn) {
    dom.favoriteBtn.addEventListener('click', () => {
      toggleFavoriteState();
    });
  }

  // Comment Posting interface trigger
  if (dom.postCommentBtn) {
    dom.postCommentBtn.addEventListener('click', () => {
      publishNewCommentFromInput();
    });
  }
}

/**
 * High-performance, robust API fetch system wrapper.
 * Satisfies: Load Details, Load Characters, Load Staff, Load Recommendations, etc.
 * Orchestrates cache checking, fallback rendering, and async loading grids.
 */
async function loadAnimeDetailsProfile() {
  toggleLoaderState(true);

  // Check Local Cache to see if details are pre-saved
  const cachedDetails = localStorage.getItem(`${DETAIL_CACHE_PREFIX}${animePage.id}`);
  if (cachedDetails) {
    try {
      const parsed = JSON.parse(cachedDetails);
      if (Date.now() - parsed.timestamp < CACHE_EXPIRY_MS) {
        animePage.metadata = parsed.metadata;
        
        // Render from cache
        populatePageMetadata(parsed.metadata);
        renderAsyncSubGrids(parsed.metadata);
        
        toggleLoaderState(false);
        return;
      }
    } catch (e) {
      console.warn("Details cache corruption occurred. Refreshing from network API...");
    }
  }

  // Fallback to active API pull if cache is missing or expired
  await fetchDetailsFromNetwork();
}

/**
 * Network Controller: Hit concurrent Jikan v4 endpoints to assemble
 * high fidelity metadata with exponential backoff retries.
 */
async function fetchDetailsFromNetwork() {
  try {
    const fullDetailsUrl = `${JIKAN_API_BASE}/anime/${animePage.id}/full`;
    const response = await fetchWithRetry(fullDetailsUrl);

    if (response && response.data) {
      const fetchedMetadata = response.data;
      animePage.metadata = fetchedMetadata;

      // Update LocalStorage cache for offline support and zero-latency revisit
      const cacheObject = {
        timestamp: Date.now(),
        metadata: fetchedMetadata
      };
      localStorage.setItem(`${DETAIL_CACHE_PREFIX}${animePage.id}`, JSON.stringify(cacheObject));

      // Render profile
      populatePageMetadata(fetchedMetadata);
      renderAsyncSubGrids(fetchedMetadata);
      
      toggleLoaderState(false);
    } else {
      throw new Error("Empty details response returned from MAL database.");
    }
  } catch (err) {
    console.error("Critical Connection Failure during Jikan profile load:", err);
    triggerToastAlert("Connection Failed", "Unable to load live details. Showing cached fallback if available.", "triangle-exclamation");
    
    // Absolute worst-case scenario: Try loading historical cache regardless of expiry
    const staleCache = localStorage.getItem(`${DETAIL_CACHE_PREFIX}${animePage.id}`);
    if (staleCache) {
      const parsed = JSON.parse(staleCache);
      populatePageMetadata(parsed.metadata);
      renderAsyncSubGrids(parsed.metadata);
      toggleLoaderState(false);
    } else {
      showCriticalErrorState();
    }
  }
}

/**
 * Exponential backoff fetch adapter to survive rigid MAL / Jikan rate limiting.
 */
async function fetchWithRetry(url, maxAttempts = 5, initialDelay = 1000) {
  let delay = initialDelay;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(url);
      
      if (res.status === 429) {
        // Rate limited. Back off and try again.
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      
      if (!res.ok) throw new Error(`HTTP fetch error code ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt === maxAttempts - 1) throw err;
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
    }
  }
}

/**
 * Main Metadata population thread. Updates all descriptive selectors on the page.
 */
function populatePageMetadata(anime) {
  // Page Title Update
  document.title = `Anime.Keep - ${anime.title_english || anime.title || 'Details'}`;

  // Direct Text binds
  if (dom.title) dom.title.innerText = anime.title_english || anime.title || 'Untitled';
  if (dom.titleJapanese) dom.titleJapanese.innerText = anime.title_japanese || '';
  
  // Alternative names mapping
  if (dom.titleSynonyms) {
    const names = [];
    if (anime.title_synonyms && anime.title_synonyms.length > 0) names.push(...anime.title_synonyms);
    if (anime.title_english && anime.title_english !== anime.title) names.push(anime.title);
    dom.titleSynonyms.innerText = names.length > 0 ? `Alt Titles: ${names.join(', ')}` : '';
  }

  // Type & Status Badges
  if (dom.typeBadge) dom.typeBadge.innerText = anime.type || 'TV Series';
  if (dom.seasonYear) dom.seasonYear.innerText = `${anime.season ? anime.season.toUpperCase() : ''} ${anime.year ? anime.year : ''}`;
  
  if (dom.statusBadge) {
    dom.statusBadge.innerText = anime.status || 'Planned';
    if (anime.airing) {
      dom.statusBadge.className = "px-2 py-0.5 rounded-lg text-[9px] font-bold tracking-tight bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse";
    } else {
      dom.statusBadge.className = "px-2 py-0.5 rounded-lg text-[9px] font-bold tracking-tight bg-slate-800 text-slate-400 border border-white/5";
    }
  }

  // Posters & Backdrops
  const posterUrl = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || '';
  if (dom.poster) dom.poster.src = posterUrl;
  
  const backdropUrl = anime.trailer?.images?.maximum_image_url || anime.trailer?.images?.large_image_url || posterUrl;
  if (dom.banner) dom.banner.style.backgroundImage = `url('${backdropUrl}')`;

  // Statistics
  if (dom.score) dom.score.innerText = anime.score ? anime.score.toFixed(2) : '--';
  if (dom.rank) dom.rank.innerText = anime.rank ? `#${anime.rank}` : '#--';
  if (dom.popularity) dom.popularity.innerText = anime.popularity ? `#${anime.popularity}` : '#--';

  // Production Properties
  if (dom.studios) dom.studios.innerText = anime.studios && anime.studios.length > 0 ? anime.studios.map(s => s.name).join(', ') : 'N/A';
  if (dom.episodes) dom.episodes.innerText = anime.episodes ? `${anime.episodes} Episodes` : 'Episodes: TBA';
  if (dom.duration) dom.duration.innerText = anime.duration || 'Duration Pending';
  if (dom.rating) dom.rating.innerText = anime.rating || 'Unrated';
  if (dom.broadcast) dom.broadcast.innerText = anime.broadcast?.string || 'Schedules Pending (TBA)';
  if (dom.producers) dom.producers.innerText = anime.producers && anime.producers.length > 0 ? anime.producers.map(p => p.name).join(', ') : 'None registered';

  // Synopsis with Expandable "Read More" functionality
  if (dom.synopsis) {
    const rawSynopsis = anime.synopsis || "No description overview recorded yet for this entry.";
    dom.synopsis.innerText = rawSynopsis;
    setupSynopsisTruncation(rawSynopsis);
  }

  // Categories & Badges
  renderCategorizationBadges(anime);
  
  // Streaming Links
  renderStreamingBroadcasters(anime.streaming || []);

  // Update Notification Bell indicator
  updateAlertIconUi();
}

/**
 * Expandable Synopsis Logic. Appends a dynamic read toggle button.
 */
function setupSynopsisTruncation(text) {
  if (text.length < 380) return;

  const truncatePoint = 340;
  const truncatedText = text.substring(0, truncatePoint) + '...';
  dom.synopsis.innerText = truncatedText;

  // Create toggler link
  const toggleBtn = document.createElement('button');
  toggleBtn.className = "text-brand-blue font-extrabold text-xs mt-3 flex items-center gap-1.5 hover:underline focus:outline-none transition-all";
  toggleBtn.innerHTML = `Read Full Synopsis <i class="fa-solid fa-chevron-down text-[9px]"></i>`;

  toggleBtn.onclick = () => {
    if (dom.synopsis.innerText === truncatedText) {
      dom.synopsis.innerText = text;
      toggleBtn.innerHTML = `Collapse Synopsis <i class="fa-solid fa-chevron-up text-[9px]"></i>`;
    } else {
      dom.synopsis.innerText = truncatedText;
      toggleBtn.innerHTML = `Read Full Synopsis <i class="fa-solid fa-chevron-down text-[9px]"></i>`;
    }
  };

  dom.synopsis.parentNode.appendChild(toggleBtn);
}

/**
 * Categorization badges rendering (genres, themes, demographics).
 */
function renderCategorizationBadges(anime) {
  if (dom.genres) {
    dom.genres.innerHTML = anime.genres && anime.genres.length > 0
      ? anime.genres.map(g => `<span class="px-3.5 py-1 rounded-full text-xs font-bold tracking-tight bg-brand-blue/15 text-brand-blue border border-brand-blue/20 shadow-sm">${g.name}</span>`).join('')
      : '';
  }
  if (dom.themes) {
    dom.themes.innerHTML = anime.themes && anime.themes.length > 0
      ? anime.themes.map(t => `<span class="px-3.5 py-1 rounded-full text-xs font-bold tracking-tight bg-brand-purple/15 text-brand-purple border border-brand-purple/20 shadow-sm">${t.name}</span>`).join('')
      : '';
  }
  if (dom.demographics) {
    dom.demographics.innerHTML = anime.demographics && anime.demographics.length > 0
      ? anime.demographics.map(d => `<span class="px-3.5 py-1 rounded-full text-xs font-bold tracking-tight bg-brand-pink/15 text-brand-pink border border-brand-pink/20 shadow-sm">${d.name}</span>`).join('')
      : '';
  }
}

/**
 * Stream services mappings.
 */
function renderStreamingBroadcasters(services) {
  if (!dom.streamingContainer) return;

  if (services && services.length > 0) {
    dom.streamingContainer.innerHTML = services.map(st => `
      <a href="${st.url}" target="_blank" class="flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-brand-blue/15 hover:border-brand-blue/30 border border-white/5 transition-all text-xs font-black text-slate-300 hover:text-white group">
        <span>${st.name}</span>
        <i class="fa-solid fa-circle-play text-brand-blue group-hover:scale-110 transition-all"></i>
      </a>
    `).join('');
  } else {
    dom.streamingContainer.innerHTML = `
      <div class="p-4 text-center rounded-xl bg-white/5 border border-white/5 text-xs font-semibold text-slate-500">
        No live stream distribution records mapped.
      </div>
    `;
  }
}

/**
 * Asynchronously fetch secondary grids to optimize payload speeds.
 */
async function renderAsyncSubGrids(anime) {
  // Render promo video if recorded
  renderPromoTrailer(anime.trailer);

  // Parallel asynchronous fetching for performance optimization
  fetchAndRenderCastGrids();
  fetchAndRenderRelations();
  fetchAndRenderRecommendations();
  fetchAndRenderCriticReviews();
}

/**
 * Video Promotional Trailers Integration.
 */
function renderPromoTrailer(trailer) {
  if (!dom.trailerSection || !dom.trailerContainer) return;

  if (trailer && trailer.youtube_id) {
    dom.trailerSection.classList.remove('hidden');
    dom.trailerContainer.innerHTML = `
      <iframe class="w-full h-full" src="https://www.youtube.com/embed/${trailer.youtube_id}" title="Official PV" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
    `;
  } else {
    dom.trailerSection.classList.add('hidden');
  }
}

/**
 * Cast & Voice Actors Staff Renderer.
 */
async function fetchAndRenderCastGrids() {
  if (!dom.charactersContainer) return;

  try {
    const castUrl = `${JIKAN_API_BASE}/anime/${animePage.id}/characters`;
    const response = await fetchWithRetry(castUrl);

    if (response && response.data && response.data.length > 0) {
      // Limit to main 8 primary records to avoid clogging layout views
      const slicedStaff = response.data.slice(0, 8);
      
      dom.charactersContainer.innerHTML = slicedStaff.map(member => {
        const charName = member.character?.name || 'Unknown Char';
        const charRole = member.role || 'Supporting';
        const charImg = member.character?.images?.jpg?.image_url || '';
        
        // Isolate primary Japanese Voice Actor (VA)
        const jaVa = member.voice_actors?.find(va => va.language === 'Japanese');
        const vaName = jaVa ? jaVa.person.name : 'VA TBA';
        const vaImg = jaVa ? jaVa.person.images.jpg.image_url : '';

        return `
          <div class="glass-card rounded-xl p-3 flex items-center justify-between border border-white/5 gap-3">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-xl bg-slate-800 border border-white/10 overflow-hidden shrink-0">
                <img class="w-full h-full object-cover" src="${charImg}" alt="${charName}" loading="lazy">
              </div>
              <div>
                <h5 class="text-xs sm:text-sm font-black text-slate-200 line-clamp-1">${charName}</h5>
                <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wide">${charRole}</span>
              </div>
            </div>
            
            ${jaVa ? `
              <div class="flex items-center gap-3 text-right">
                <div>
                  <h5 class="text-xs sm:text-sm font-bold text-slate-300 line-clamp-1">${vaName}</h5>
                  <span class="text-[10px] text-brand-blue font-bold uppercase tracking-wide">Japanese VA</span>
                </div>
                <div class="w-11 h-11 rounded-xl bg-slate-800 border border-white/10 overflow-hidden shrink-0">
                  <img class="w-full h-full object-cover" src="${vaImg}" alt="${vaName}" loading="lazy">
                </div>
              </div>
            ` : `
              <span class="text-[10px] text-slate-500 font-bold italic">VA Pending</span>
            `}
          </div>
        `;
      }).join('');
    } else {
      dom.charactersContainer.innerHTML = `
        <div class="col-span-1 md:col-span-2 p-6 text-center rounded-2xl bg-white/5 border border-white/5 text-sm text-slate-500 font-semibold">
          No cast or voice staff data registered.
        </div>
      `;
    }
  } catch (e) {
    dom.charactersContainer.innerHTML = `
      <div class="col-span-1 md:col-span-2 p-6 text-center rounded-2xl bg-white/5 border border-white/5 text-sm text-slate-500 font-semibold">
        Voice actors list failed to load.
      </div>
    `;
  }
}

/**
 * Related Media Iterations mapping.
 */
async function fetchAndRenderRelations() {
  if (!dom.relatedSection || !dom.relatedContainer) return;

  try {
    const relUrl = `${JIKAN_API_BASE}/anime/${animePage.id}/relations`;
    const response = await fetchWithRetry(relUrl);

    if (response && response.data && response.data.length > 0) {
      dom.relatedSection.classList.remove('hidden');
      
      // Flatten arrays from relation sub-groups
      const relationsList = [];
      response.data.forEach(relGroup => {
        relGroup.entry.forEach(ent => {
          relationsList.push({
            type: relGroup.relation,
            title: ent.name,
            malId: ent.mal_id
          });
        });
      });

      dom.relatedContainer.innerHTML = relationsList.slice(0, 4).map(item => `
        <div
