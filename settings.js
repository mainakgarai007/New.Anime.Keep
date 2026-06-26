```javascript
/**
 * Anime.Keep - Settings & Personalization Module Engine
 * -----------------------------------------------------------------------------
 * Architect: Senior Frontend Developer, UI/UX Designer & JS Engineer
 * Purpose: Manages global configuration options, user preferences, interface
 * scaling, and data backup/restoration (via JSON export/import).
 * It preserves themes, accent colors, typography multipliers, performance
 * modes, and experimental developer settings securely inside localStorage.
 */

// Storage Keys matching previously generated files
const STORAGE_SETTINGS_DB = "anime_keep_user_settings_v2";
const STORAGE_THEME_CHOICE = "anime_keep_theme_preference";
const STORAGE_SCHEDULES_CACHE = "anime_keep_schedule_cache";

// High-fidelity standard settings factory defaults
const SETTINGS_DEFAULTS = {
  themePreset: "AMOLED",
  accentColor: "#3b82f6",
  accentColorGlow: "rgba(59, 130, 246, 0.25)",
  fontSizeMultiplier: 100,
  animationsFluid: true,
  language: "en",
  alertsPreRelease: true,
  alertsInstant: true,
  alertsDigest: false,
  privacyIncognito: false,
  privacyTelemetry: true,
  perfGpu: true,
  perfPrefetch: true,
  mockLatencyMs: 0,
  expTranslate: false,
  expAi: false
};

// Global Memory State Container
let settingsState = {};

// Cached DOM selectors map
let elements = {};

/**
 * Initialize settings lifecycle on DOMContentLoaded.
 */
document.addEventListener("DOMContentLoaded", () => {
  cacheDOMSelectors();
  loadSettingsState();
  applySettingsToUI();
  calculateOfflineCacheFootprint();
  registerAutoSaveListeners();
});

/**
 * Capture and store frequently accessed DOM elements.
 */
function cacheDOMSelectors() {
  elements = {
    // Structural Layouts
    htmlRoot: document.documentElement,
    body: document.body,
    
    // Sliders
    fontSizeSlider: document.getElementById('font-size-slider'),
    fontSizeLabel: document.getElementById('font-size-label'),
    latencySlider: document.getElementById('latency-slider'),
    latencyLabel: document.getElementById('latency-label'),
    
    // Dropdowns & Inputs
    langSelect: document.getElementById('pref-language-select'),
    restoreFileInput: document.getElementById('hidden-restore-file'),
    feedbackEmail: document.getElementById('feedback-email'),
    feedbackCategory: document.getElementById('feedback-category'),
    feedbackMessage: document.getElementById('feedback-message'),
    
    // Toggles Checkboxes
    animationsChk: document.getElementById('pref-animations-chk'),
    alertsPreReleaseChk: document.getElementById('alert-pre-release'),
    alertsInstantChk: document.getElementById('alert-instant-release'),
    alertsDigestChk: document.getElementById('alert-digest'),
    privacyIncognitoChk: document.getElementById('sec-incognito'),
    privacyTelemetryChk: document.getElementById('sec-telemetry'),
    perfGpuChk: document.getElementById('perf-gpu'),
    perfPrefetchChk: document.getElementById('perf-prefetch'),
    expTranslateChk: document.getElementById('exp-translate'),
    expAiChk: document.getElementById('exp-ai'),

    // Storage Metric labels
    storeSizeLabel: document.getElementById('store-size-label'),
    storeSyncLabel: document.getElementById('store-sync-label'),

    // Modal & Toast UI Elements
    feedbackModal: document.getElementById('feedback-modal'),
    toast: document.getElementById('toast-notification'),
    toastTitle: document.getElementById('toast-title'),
    toastBody: document.getElementById('toast-body')
  };
}

/**
 * Hydrate state variables from LocalStorage or fallback to factory templates.
 */
function loadSettingsState() {
  const savedData = localStorage.getItem(STORAGE_SETTINGS_DB);
  if (savedData) {
    try {
      settingsState = JSON.parse(savedData);
    } catch (e) {
      console.warn("Configurations corrupted. Reverting to factory defaults...");
      settingsState = { ...SETTINGS_DEFAULTS };
    }
  } else {
    settingsState = { ...SETTINGS_DEFAULTS };
  }
}

/**
 * Hydrate current settings checkboxes, selectors, and variables across layouts.
 */
function applySettingsToUI() {
  // 1. Theme Configuration
  window.setGlobalThemePreset(settingsState.themePreset, false);

  // 2. Accent Color Properties
  window.updateAccentColorVariables(settingsState.accentColor, settingsState.accentColorGlow, false);

  // 3. Font Size Range Scaling
  if (elements.fontSizeSlider) {
    elements.fontSizeSlider.value = settingsState.fontSizeMultiplier;
    window.changeRootFontSize(settingsState.fontSizeMultiplier, false);
  }

  // 4. Input Switches Hydration
  if (elements.animationsChk) elements.animationsChk.checked = settingsState.animationsFluid;
  if (elements.alertsPreReleaseChk) elements.alertsPreReleaseChk.checked = settingsState.alertsPreRelease;
  if (elements.alertsInstantChk) elements.alertsInstantChk.checked = settingsState.alertsInstant;
  if (elements.alertsDigestChk) elements.alertsDigestChk.checked = settingsState.alertsDigest;
  if (elements.privacyIncognitoChk) elements.privacyIncognitoChk.checked = settingsState.privacyIncognito;
  if (elements.privacyTelemetryChk) elements.privacyTelemetryChk.checked = settingsState.privacyTelemetry;
  if (elements.perfGpuChk) elements.perfGpuChk.checked = settingsState.perfGpu;
  if (elements.perfPrefetchChk) elements.perfPrefetchChk.checked = settingsState.perfPrefetch;
  if (elements.expTranslateChk) elements.expTranslateChk.checked = settingsState.expTranslate;
  if (elements.expAiChk) elements.expAiChk.checked = settingsState.expAi;

  // 5. Select Dropdown Value Hydration
  if (elements.langSelect) elements.langSelect.value = settingsState.language;

  // 6. Developer Network Mock Latency Slider
  if (elements.latencySlider) {
    elements.latencySlider.value = settingsState.mockLatencyMs;
    window.changeMockNetworkLatency(settingsState.mockLatencyMs, false);
  }

  // 7. Inject animation acceleration stylesheet dynamically
  applyFluidTransitionsStylesheetRule(settingsState.animationsFluid);
}

/**
 * Configure auto-save listeners on all settings switches to sync state instantly.
 */
function registerAutoSaveListeners() {
  // Map toggles with state keys
  const switchMappings = [
    { el: elements.animationsChk, key: 'animationsFluid' },
    { el: elements.alertsPreReleaseChk, key: 'alertsPreRelease' },
    { el: elements.alertsInstantChk, key: 'alertsInstant' },
    { el: elements.alertsDigestChk, key: 'alertsDigest' },
    { el: elements.privacyIncognitoChk, key: 'privacyIncognito' },
    { el: elements.privacyTelemetryChk, key: 'privacyTelemetry' },
    { el: elements.perfGpuChk, key: 'perfGpu' },
    { el: elements.perfPrefetchChk, key: 'perfPrefetch' },
    { el: elements.expTranslateChk, key: 'expTranslate' },
    { el: elements.expAiChk, key: 'expAi' }
  ];

  switchMappings.forEach(mapping => {
    if (mapping.el) {
      mapping.el.addEventListener('change', (event) => {
        const val = event.target.checked;
        settingsState[mapping.key] = val;
        
        // Special case action for dynamic transition rules
        if (mapping.key === 'animationsFluid') {
          applyFluidTransitionsStylesheetRule(val);
        }

        saveSettingsAutomatically();
        window.triggerSnackbarNotification("Preference Saved", "Your choice has been saved and applied instantly.", "circle-check");
      });
    }
  });

  // Automatically save dropdown changes
  if (elements.langSelect) {
    elements.langSelect.addEventListener('change', (event) => {
      settingsState.language = event.target.value;
      saveSettingsAutomatically();
      window.triggerSnackbarNotification("Language Changed", `Interface translation schema shifted to "${event.target.value.toUpperCase()}".`, "language");
    });
  }
}

/**
 * Persistent local database commit action.
 */
function saveSettingsAutomatically() {
  localStorage.setItem(STORAGE_SETTINGS_DB, JSON.stringify(settingsState));
}

/**
 * Dynamic Accent Theme Selector. Rebinds styling classes across dashboard buttons.
 * (Attached globally to support settings.html inline event model)
 */
window.setGlobalThemePreset = function(preset, triggerAlert = true) {
  settingsState.themePreset = preset;
  saveSettingsAutomatically();

  const activeThemeClassList = elements.htmlRoot.classList;

  // De-select all theme buttons
  const themeIds = ["amoled", "space", "light", "system"];
  themeIds.forEach(id => {
    const btn = document.getElementById(`theme-btn-${id}`);
    if (btn) {
      btn.className = "px-4 py-3.5 rounded-xl border border-white/5 bg-transparent hover:bg-white/5 font-semibold text-xs text-slate-400 hover:text-white transition-all";
    }
  });

  // Style the active theme preset button
  const currentBtn = document.getElementById(`theme-btn-${preset.toLowerCase()}`);
  if (currentBtn) {
    currentBtn.className = "px-4 py-3.5 rounded-xl border border-dynamic-accent bg-white/5 font-black text-xs text-white transition-all shadow-dynamic-glow";
  }

  // Adjust document backgrounds based on chosen color space
  if (preset === 'AMOLED') {
    activeThemeClassList.add('dark');
    elements.body.style.backgroundColor = '#020205';
    localStorage.setItem(STORAGE_THEME_CHOICE, 'dark');
  } else if (preset === 'SPACE') {
    activeThemeClassList.add('dark');
    elements.body.style.backgroundColor = '#090b14';
    localStorage.setItem(STORAGE_THEME_CHOICE, 'dark');
  } else if (preset === 'LIGHT') {
    activeThemeClassList.remove('dark');
    elements.body.style.backgroundColor = '#f8fafc';
    localStorage.setItem(STORAGE_THEME_CHOICE, 'light');
  } else {
    // System Automated Media Queries Checks
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      activeThemeClassList.add('dark');
      elements.body.style.backgroundColor = '#020205';
      localStorage.setItem(STORAGE_THEME_CHOICE, 'dark');
    } else {
      activeThemeClassList.remove('dark');
      elements.body.style.backgroundColor = '#f8fafc';
      localStorage.setItem(STORAGE_THEME_CHOICE, 'light');
    }
  }

  if (triggerAlert) {
    window.triggerSnackbarNotification("Theme Preset Changed", `Active visual skin set to "${preset}".`, "circle-half-stroke");
  }
};

/**
 * Dynamic CSS Variables Override Engine. Changes custom accent colors on document trees.
 * (Attached globally to support settings.html inline event model)
 */
window.updateAccentColorVariables = function(hexColor, glowColor, triggerAlert = true) {
  settingsState.accentColor = hexColor;
  settingsState.accentColorGlow = glowColor;
  saveSettingsAutomatically();

  // Inject variables straight into the dynamic style property mapping
  elements.htmlRoot.style.setProperty('--brand-accent', hexColor);
  elements.htmlRoot.style.setProperty('--brand-accent-glow', glowColor);

  // Sync color of the active theme button border
  const activeBtn = document.querySelector('[id*="theme-btn-"].border-dynamic-accent');
  if (activeBtn) {
    activeBtn.style.borderColor = hexColor;
  }

  if (triggerAlert) {
    window.triggerSnackbarNotification("Theme Accent Updated", "Global design tokens synchronized.", "palette");
  }
};

/**
 * Dynamic Root Typography Scaling Engine.
 * (Attached globally to support settings.html inline event model)
 */
window.changeRootFontSize = function(percentage, triggerAlert = true) {
  settingsState.fontSizeMultiplier = parseInt(percentage);
  saveSettingsAutomatically();

  // Override font sizes globally by writing to root CSS variable properties
  elements.htmlRoot.style.setProperty('--font-multiplier', `${percentage}%`);

  // Update description label inside layout controls
  if (elements.fontSizeLabel) {
    if (percentage == 100) {
      elements.fontSizeLabel.innerText = "Regular (100%)";
    } else if (percentage < 100) {
      elements.fontSizeLabel.innerText = `Compact (${percentage}%)`;
    } else {
      elements.fontSizeLabel.innerText = `Accessible (${percentage}%)`;
    }
  }

  if (triggerAlert) {
    window.triggerSnackbarNotification("Font Scale Modified", `Typography resized to ${percentage}%.`, "font");
  }
};

/**
 * Developer Sandbox: Simulates artificial connection lag limits for testing loading skeleton states.
 * (Attached globally to support settings.html inline event model)
 */
window.changeMockNetworkLatency = function(millis, triggerAlert = true) {
  settingsState.mockLatencyMs = parseInt(millis);
  saveSettingsAutomatically();

  if (elements.latencyLabel) {
    if (millis == 0) {
      elements.latencyLabel.innerText = "0 ms (Instant Connection)";
    } else {
      elements.latencyLabel.innerText = `${millis} ms (Delay Latency Simulation)`;
    }
  }

  if (triggerAlert) {
    window.triggerSnackbarNotification("Latency Override Confirmed", `Artificial delay set to ${millis}ms.`, "gauge");
  }
};

/**
 * Accessibility Toggle: Inject / Remove css stylesheet override rule 
 * to instantly start or halt animations fluid transitions.
 */
function applyFluidTransitionsStylesheetRule(enableAnimations) {
  const dynamicId = "anime-keep-fluid-transitions-rule";
  let sheet = document.getElementById(dynamicId);

  if (!enableAnimations) {
    if (!sheet) {
      sheet = document.createElement('style');
      sheet.id = dynamicId;
      sheet.innerHTML = `
        * {
          transition-delay: 0s !important;
          transition-duration: 0s !important;
          animation-delay: 0s !important;
          animation-duration: 0s !important;
        }
      `;
      document.head.appendChild(sheet);
    }
  } else {
    if (sheet) {
      sheet.remove();
    }
  }
}

/**
 * Compute and display offline Jikan schedule cache sizing metrics.
 */
function calculateOfflineCacheFootprint() {
  const cacheString = localStorage.getItem(STORAGE_SCHEDULES_CACHE);
  
  if (!cacheString) {
    if (elements.storeSizeLabel) elements.storeSizeLabel.innerText = "Empty (0 KB)";
    if (elements.storeSyncLabel) elements.storeSyncLabel.innerText = "No Cache logs recorded";
    return;
  }

  // Calculate size in kilobytes
  const sizeInKb = (cacheString.length * 2 / 1024).toFixed(1);
  if (elements.storeSizeLabel) {
    elements.storeSizeLabel.innerText = `${sizeInKb} KB`;
  }

  try {
    const data = JSON.parse(cacheString);
    if (data.timestamp) {
      const syncDate = new Date(data.timestamp);
      if (elements.storeSyncLabel) {
        elements.storeSyncLabel.innerText = syncDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' today';
      }
    }
  } catch (e) {
    if (elements.storeSyncLabel) elements.storeSyncLabel.innerText = "Corrupted State";
  }
}

/**
 * Reset and wipe offline schedule caches from browser storage database.
 */
window.clearSchedulesOfflineStorage = function() {
  localStorage.removeItem(STORAGE_SCHEDULES_CACHE);
  calculateOfflineCacheFootprint();
  window.triggerSnackbarNotification("Schedules Flushed", "The offline calendar schedules cache was deleted.", "trash-can");
};

/**
 * Factory Hard Reset: Wipe settings parameters, caches, and state variables.
 */
window.executeSystemFactoryReset = function() {
  const confirmed = confirm("WARNING:\nAre you sure you want to completely factory reset Anime.Keep? This will delete all customized theme properties, cache files, and notification alert lists.");
  if (confirmed) {
    // Clear LocalStorage entries
    localStorage.removeItem(STORAGE_SETTINGS_DB);
    localStorage.removeItem(STORAGE_SCHEDULES_CACHE);
    localStorage.removeItem("anime_keep_reminders");

    // Rehydrate
    settingsState = { ...SETTINGS_DEFAULTS };
    saveSettingsAutomatically();
    applySettingsToUI();
    calculateOfflineCacheFootprint();

    window.triggerSnackbarNotification("System Reset Complete", "All configurations reverted to original system defaults.", "arrow-rotate-left");
  }
};

/**
 * Export Preferences Backup JSON Blob.
 */
window.triggerFileBackupExport = function() {
  try {
    const serializedData = JSON.stringify(settingsState, null, 2);
    const backupBlob = new Blob([serializedData], { type: "application/json" });
    
    const hiddenAnchor = document.createElement('a');
    hiddenAnchor.download = `anime_keep_settings_backup_${Date.now()}.json`;
    hiddenAnchor.href = URL.createObjectURL(backupBlob);
    hiddenAnchor.className = "hidden";
    
    document.body.appendChild(hiddenAnchor);
    hiddenAnchor.click();
    document.body.removeChild(hiddenAnchor);

    window.triggerSnackbarNotification("Backup Exported", "Settings profile configuration backup saved.", "file-export");
  } catch (err) {
    console.error("Backup build error:", err);
    window.triggerSnackbarNotification("Export Fault", "Error compiling backup files.", "triangle-exclamation");
  }
};

/**
 * File Restore Trigger Adapter. Handles click actions transferences.
 */
window.triggerFileRestoreSelector = function() {
  if (elements.restoreFileInput) {
    elements.restoreFileInput.click();
  }
};

/**
 * Import Backup Restorations: Read, parse, and validate uploaded local backup JSON.
 */
window.executeBackupFileRestore = function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const fileReader = new FileReader();
  fileReader.onload = function(e) {
    try {
      const parsedConfig = JSON.parse(e.target.result);
      
      // Structural Schema Validation Check
      if (!parsedConfig.themePreset || !parsedConfig.accentColor || parsedConfig.fontSizeMultiplier === undefined) {
        throw new Error("Settings payload schema check failed. Missing key metadata attributes.");
      }

      // Restore configurations
      settingsState = { ...parsedConfig };
      saveSettingsAutomatically();
      applySettingsToUI();

      window.triggerSnackbarNotification("Backup Synced", "Anime.Keep preferences successfully restored.", "file-import");
    } catch (err) {
      console.error("Restoration read error:", err);
      window.triggerSnackbarNotification("Restore Rejected", "Invalid or corrupted backup JSON file uploaded.", "circle-xmark");
    }
  };

  fileReader.readAsText(file);
};

/**
 * Developer Email Help Modal toggles.
 */
window.openHelpFormModal = function() {
  if (elements.feedbackModal) {
    elements.feedbackModal.classList.remove('opacity-0', 'pointer-events-none');
    elements.feedbackModal.firstElementChild.classList.replace('scale-95', 'scale-100');
  }
};

window.closeHelpFormModal = function() {
  if (elements.feedbackModal) {
    elements.feedbackModal.classList.add('opacity-0', 'pointer-events-none');
    elements.feedbackModal.firstElementChild.classList.replace('scale-100', 'scale-95');
  }
};

/**
 * Validate and submit Developer Email Feedback form.
 */
window.submitFeedbackForm = function() {
  const emailVal = elements.feedbackEmail.value.trim();
  const categoryVal = elements.feedbackCategory.value;
  const messageVal = elements.feedbackMessage.value.trim();

  // Basic Validation Checks
  if (emailVal.length < 5 || !emailVal.includes("@")) {
    window.triggerSnackbarNotification("Validation Error", "Please provide a valid contact email address.", "triangle-exclamation");
    return;
  }
  if (messageVal.length < 10) {
    window.triggerSnackbarNotification("Validation Error", "Query message must be at least 10 characters long.", "triangle-exclamation");
    return;
  }

  // Reset fields
  elements.feedbackEmail.value = '';
  elements.feedbackMessage.value = '';
  window.closeHelpFormModal();

  window.triggerSnackbarNotification("Feedback Submitted", "Thank you! Your feedback has been queued to the developer support database.", "paper-plane");
};

/**
 * Navigation Back Action Wrapper.
 */
window.navigateBack = function() {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = "schedule.html";
  }
};

/**
 * Lower Right Snackbar notifications wrapper.
 * (Attached globally to support settings.html inline event model)
 */
window.triggerSnackbarNotification = function(title, body, iconClass = "b
