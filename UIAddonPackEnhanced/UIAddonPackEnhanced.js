/*
    UI Add-on Pack Enhanced v1.0.2 by AAD
    ----------------------------
    https://github.com/AmateurAudioDude/FM-DX-Webserver-Plugin-UI-Addon-Pack-Enhanced
*/

'use strict';

(async () => {

const pluginVersion = '1.0.2';
const pluginName = "UI Add-on Pack Enhanced";
const pluginHomepageUrl = "https://github.com/AmateurAudioDude/FM-DX-Webserver-Plugin-UI-Addon-Pack-Enhanced";
const pluginUpdateUrl = "https://raw.githubusercontent.com/AmateurAudioDude/FM-DX-Webserver-Plugin-UI-Addon-Pack-Enhanced/refs/heads/main/UIAddonPackEnhanced/UIAddonPackEnhanced.js";
const pluginSetupOnlyNotify = true;
const CHECK_FOR_UPDATES = true;

// #################### CONFIGURATION #################### //

const UIAPE_ENABLE_KEY = "uiape_enabled";
const UIAPE_CONFIG_KEY = "uiape_config";
const UIAPE_USER_CONFIG_KEY = "uiape_user_config";
const ENABLE_PLUGIN_DEFAULT = true;
const UIAPE_EXPAND_CANVAS_ENABLED_KEY = "uiape_expand_canvas_feature_enabled";

// Best-effort early paint for "Expand Canvas"
try {
  if (localStorage.getItem(UIAPE_EXPAND_CANVAS_ENABLED_KEY) === "true" && localStorage.getItem("expandCanvasHeight") === "true") {
    const uiapeEarlyCanvasContainer = document.querySelector('.canvas-container');
    if (uiapeEarlyCanvasContainer) {
      const uiapeEarlySavedHeight = parseInt(localStorage.getItem('canvasHeight'), 10);
      uiapeEarlyCanvasContainer.style.height = `${Number.isFinite(uiapeEarlySavedHeight) ? Math.max(140, Math.min(uiapeEarlySavedHeight, 200)) : 172}px`;
    }
  }
} catch (error) {}

/*
    ADDING A NEW SETTING
    --------------------
    1. Add the key + default to UIAPE_DEFAULT_CONFIG:
         MY_NEW_FEATURE: false,

    2. Find the block of lines that each read "const X = UIAPE_CONFIG.X;",
       one per setting, and add yours to it in the same style:
         const MY_NEW_FEATURE = UIAPE_CONFIG.MY_NEW_FEATURE;

    3. Add it to the config panel - one line in the relevant section of uiapeControlSections:
         ["MY_NEW_FEATURE", "checkbox", "My New Feature", "Short help text shown under the label."],
       Available types: "checkbox", "number", "text", "color", "select"
       (select needs a 5th array element: [["value","Label"], ...]).

    4. Implement it - two paths:
       a) Pure CSS (instant, no reload): add an
            if (cfg.MY_NEW_FEATURE) { css += `...`; }
          block inside uiapeBuildLiveCss(cfg), and add the key to
          UIAPE_LIVE_CSS_KEYS so the panel applies it live and skips the
          "reload required" note.

       b) DOM/behavioral (moves elements, attaches listeners, etc.): implement
          it wherever makes sense using the const from step 2.
          If it needs to run on page load, wrap setup in
            uiapeOnDomReady(() => { ... })
          not a raw DOMContentLoaded listener - this file's top-level await
          means DOMContentLoaded may have already fired by the time a plain
          listener registered down here would attach.

    HOW TO MAKE A SETTING ADMIN-ONLY
    --------------------------------
    5. No code needed - as admin, open the panel and tick "Admin only" next to the
       setting itself. That toggles its key in and out of ADMIN_ONLY_KEYS (a normal,
       server-synced config value), which uiapeIsControlVisibleForCurrentUser() checks
       to hide the control from the panel for non-admins.

       Note: this only hides the control from the UI. The real security
       boundary is server-side - checkStrictAdmin on the
       POST /ui-addon-pack-enhanced-config endpoint (in
       UIAddonPackEnhanced_server.js) rejects non-admin saves regardless of
       what's visible in the panel.
*/

const UIAPE_PLUGIN_BUTTON_DEFAULT_LABELS = {
   1: "Spectrum",
   2: "Record",
   3: "RDS Logger",
   4: "More info",
   5: "Livemap",
   6: "Screenshot",
   7: "ES Alert",
   8: "ES Follow",
   9: "GPS",
  10: "URDS",
  11: "DX Alert",
  12: "STREAM",
  13: "NYE Countdown",
  14: "MPX/Signal",
  15: "RDS Expert",
  16: "Tropo",
  17: "DX Logbook",
  18: "RDS Decoder",
  19: "Scatter (Meteor)",
  20: "LightFX",
  21: "SysInfo",
  22: "Scatter (Airplane)",
  23: "Denoiser",
  24: "Mapviewer",
  25: "Validator",
  26: "FM Scale",
  27: "My Logs",
  28: "Video",
  29: "DX-Watchdog",
  30: "Analog Scale",
  31: "WebStats",
  32: "Custom Links (1)",
  33: "Custom Links (2)",
  34: "Custom Links (3)",
  35: "Custom Links (4)"
};

const UIAPE_PLUGIN_BUTTON_DEFAULT_MAP = {
   1: "spectrum-graph-button",
   2: "audio-record-button",
   3: "Log-on-off",
   4: "extended-desc-button",
   5: "LIVEMAP-on-off",
   6: "Screenshot",
   7: "ES-ALERT-on-off",
   8: "ES-FOLLOW-on-off",
   9: "GPS-on-off",
  10: "URDSupload-on-off",
  11: "DX-Alert-on-off",
  12: "Stream-on-off",
  13: "countdown-button",
  14: "mpx-signal-toggle-button",
  15: "rds-expert-button",
  16: "TROPO-BTN",
  17: "visual-logbook-map",
  18: "rdsm-btn",
  19: "METEORSCATTER-on-off",
  20: "lfx-header-btn",
  21: "SysInfo-on-off",
  22: "AIRPLANESCATTER-on-off",
  23: "Denoiser-on-off",
  24: "Mapviewer",
  25: "URDSValidator",
  26: "analog-scale-btn",
  27: "btn-mylogs-link",
  28: "social-record-btn",
  29: "btn-DX-Watchdog-link",
  30: "et-analog-scale-btn",
  31: "webstats-btn",
  32: "custom-links-btn-0",
  33: "custom-links-btn-1",
  34: "custom-links-btn-2",
  35: "custom-links-btn-3"
};

const UIAPE_SERVER_CONFIG_ENDPOINT = "/ui-addon-pack-enhanced-config";

// +++++++++++++++ STEP 5 +++++++++++++++ //

// Admin-only-ness is itself an admin-controlled setting (ADMIN_ONLY_KEYS, editable from the
// panel via the "Admin only" checkbox next to each control) rather than a fixed list in code.
//
// Reconciles a saved ADMIN_ONLY_KEYS/ADMIN_ONLY_KEYS_SEEN pair against the CURRENT code
// defaults. ADMIN_ONLY_KEYS_SEEN records every default-admin-only key this profile has ever
// been reconciled against. A code default not yet in SEEN (e.g. a key added by a later plugin
// update, on a profile saved before that update shipped) gets folded into the effective set
// here; a key already in SEEN is left exactly as the admin last set it, whether that's on or
// off - so a deliberate opt-out of a built-in default is never silently re-applied.
function uiapeReconcileAdminOnlyKeys(savedKeys, savedSeen) {
  const codeDefaults = UIAPE_DEFAULT_CONFIG.ADMIN_ONLY_KEYS || [];
  const seenSet = new Set(Array.isArray(savedSeen) ? savedSeen : []);
  const keysSet = new Set(Array.isArray(savedKeys) ? savedKeys : codeDefaults);

  codeDefaults.forEach(key => {
    if (!seenSet.has(key)) keysSet.add(key);
  });
  // Every current default, and anything the admin has manually added beyond the
  // defaults, now counts as decided - future default-list changes won't touch it again.
  codeDefaults.forEach(key => seenSet.add(key));
  keysSet.forEach(key => seenSet.add(key));

  return { keys: Array.from(keysSet), seen: Array.from(seenSet) };
}

// This always reads from the admin/server profile directly, never the merged/user-overridable
// config - otherwise a non-admin could locally override ADMIN_ONLY_KEYS itself and undo every
// restriction at once.
function uiapeGetAdminOnlyKeys() {
  const adminCfg = readUiapAdminConfig();
  return uiapeReconcileAdminOnlyKeys(adminCfg.ADMIN_ONLY_KEYS, adminCfg.ADMIN_ONLY_KEYS_SEEN).keys;
}

// Keys whose ONLY runtime effect is CSS appended to the live style element (see uiapeBuildLiveCss).
// These are applied instantly in the config panel without needing a page reload.
// Every other key is treated as reload-required.

// +++++++++++++++ STEP 4a +++++++++++++++ //

const UIAPE_LIVE_CSS_KEYS = new Set([
  "DISPLAY_CANVAS_IN_LANDSCAPE_MODE",
  "DISPLAY_CANVAS_IN_PORTRAIT_MODE",
  "ADD_PADDING_TO_PANELS",
  "GLOW_EFFECT_ON_FREQUENCY_INPUT",
  "REDUCE_HALF_OPACITY",
  "INCREASE_TOP_RIGHT_ICON_SIZE",
  "REDUCE_SIDEBAR_BLUR",
  "INCREASE_FREQUENCY_FONT_WEIGHT",
  "GRADIENT_BUTTONS",
  "INCLUDE_SCANNER_BUTTONS",
  "LED_GLOW_EFFECT_LARGE",
  "LED_GLOW_EFFECT_SMALL",
  "LED_GLOW_EFFECT_ICONS",
  "LED_GLOW_EFFECT_FREQ",
  "LED_GLOW_EFFECT_RDSPS",
  "SORT_PLUGIN_BUTTONS",
  "PLUGINS_USER_ORDER",
  "PANEL_STYLE_EFFECT",
  "PANEL_STYLE_EFFECT_SIGNAL_PANEL",
  "RDS_ICON_STYLE_REMOVE_RDS_ICON",
  "METRICS_MONITOR_PLUGIN_IS_INSTALLED",
  "RDS_ICON_STYLE_MOBILE",
  "RDS_ICON_SCALE",
  "LED_GLOW_EFFECT_ICONS_METRICS_MONITOR_PLUGIN",
  "REPLACE_MPX_LOGO_WITH_STEREO_LOGO_METRICS_MONITOR_PLUGIN",
  "APPLY_STEREO_ICON_GLOW_WITH_MISSING_RDS",
  "STEREO_ICON_SCALE",
  "STEREO_ICON_WIDTH",
  "RDS_INDICATOR_ICON_TYPE"
]);

// Live-preview state. Populated during load and while the panel is used.
let uiapeLiveStyleElement = null;              // dedicated <style> holding all live CSS
let uiapeRebuildRdsIconPanel = null;           // set inside the RDS/Stereo icons block, if it runs
let uiapeReapplyMultipathIndicator = null;     // set inside the multipath indicator block, if it runs
let uiapeMobileStatusBarConnectionFn = null;   // set inside the MOBILE_STATUS_BAR_CONNECTION block, so moveButtons() (a sibling block) can call it

// Parse-time position marker: our styles insert before this, so later plugin CSS (e.g. Metrics Monitor) wins cascade ties exactly as it does against the original synchronous plugin.
const uiapeStyleAnchor = document.createElement('style');
uiapeStyleAnchor.id = 'uiape-style-anchor';
document.head.appendChild(uiapeStyleAnchor);
let UIAPE_SAVED_BASELINE = null;              // snapshot of the last persisted config
const UIAPE_RELOAD_DIRTY_KEYS = new Set();    // changed reload-required keys awaiting a reload

async function uiapeFetchServerConfig() {
  try {
    const response = await fetch(UIAPE_SERVER_CONFIG_ENDPOINT, {
      method: "GET",
      cache: "no-store",
      headers: {
        "X-Plugin-Name": "UIAddonPackEnhanced"
      }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const config = payload && payload.config;

    return {
      config: config && typeof config === "object" && !Array.isArray(config) ? config : {},
      isAdmin: payload && payload.isAdmin === true
    };
  } catch (error) {
    console.warn(`[${pluginName}] Could not load server config. Falling back to bundled defaults.`, error);
    return { config: {}, isAdmin: false };
  }
}

function uiapeSaveServerConfig(config) {
  try {
    const payload = JSON.stringify({ config });

    // Do not use sendBeacon here: it cannot send the X-Plugin-Name header that the server bridge checks.
    return fetch(UIAPE_SERVER_CONFIG_ENDPOINT, {
      method: "POST",
      keepalive: false,
      headers: {
        "Content-Type": "application/json",
        "X-Plugin-Name": "UIAddonPackEnhanced"
      },
      body: payload
    }).then(response => {
      // Read the body before checking response.ok - error responses (400/413/500) carry
      // a specific reason in their JSON body that would otherwise be lost behind a
      // generic "HTTP <status>" message.
      return response.json().catch(() => ({})).then(payload => {
        if (!response.ok || !payload || payload.ok !== true) {
          throw new Error(payload?.error || `HTTP ${response.status}`);
        }
        console.log(`[${pluginName}] Server config saved`);
        return payload;
      });
    }).catch(error => {
      console.warn(`[${pluginName}] Could not save server config.`, error);
      return { ok: false, error: String(error && error.message || error) };
    });
  } catch (error) {
    console.warn(`[${pluginName}] Could not prepare server config save.`, error);
    return Promise.resolve({ ok: false, error: String(error && error.message || error) });
  }
}

const { config: UIAPE_SERVER_CONFIG, isAdmin: UIAPE_IS_ADMIN } = await uiapeFetchServerConfig();

// Server/shared profile. The server bridge stores it in plugins_configs/UIAddonPackEnhanced.json.
// Admin saves go to the server profile. Regular users get this profile as their default base
// and only their personal overrides stay in browser localStorage.
const UIAPE_BUNDLED_SITE_CONFIG = {
  ENABLE_PLUGIN: true
};

const UIAPE_SITE_CONFIG = { ...UIAPE_BUNDLED_SITE_CONFIG, ...UIAPE_SERVER_CONFIG };

function uiapeReadBootstrapConfig(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
}

const UIAPE_BOOT_SITE_CONFIG = { ...UIAPE_SITE_CONFIG };
const UIAPE_BOOT_USER_CONFIG = uiapeReadBootstrapConfig(UIAPE_USER_CONFIG_KEY);
const UIAPE_BOOT_USER_ENABLE_VALUE = localStorage.getItem(UIAPE_ENABLE_KEY);
const UIAPE_BOOT_SITE_ENABLE_VALUE = UIAPE_BOOT_SITE_CONFIG.ENABLE_PLUGIN === undefined
  ? ENABLE_PLUGIN_DEFAULT
  : UIAPE_BOOT_SITE_CONFIG.ENABLE_PLUGIN === true;

// Users are allowed to see the toggle/panel by design. Their personal enable switch is local.
// First visit defaults to ON and starts from the server/shared profile.
// Admins always follow the server-shared value directly (matching every other admin config
// read in this file) - otherwise a stale personal "uiape_enabled" localStorage flag from an
// earlier visit could silently override a server-side change the admin just made.
const ENABLE_PLUGIN = UIAPE_IS_ADMIN
  ? UIAPE_BOOT_SITE_ENABLE_VALUE
  : (UIAPE_BOOT_USER_ENABLE_VALUE === null
      ? UIAPE_BOOT_SITE_ENABLE_VALUE
      : UIAPE_BOOT_USER_ENABLE_VALUE === "true");

// +++++++++++++++ STEP 1 +++++++++++++++ //

const UIAPE_DEFAULT_CONFIG = {
  ENABLE_PLUGIN: ENABLE_PLUGIN_DEFAULT,
  CANVAS_FADE_EFFECT: false,

  RELOAD_BAN_WARNING: false,
  RELOAD_BAN_WARNING_MESSAGE: "Note: Several reloads within a short timespan may trigger a temporary ban.",

  BUTTON_FM_LIST_MOD: false,
  BUTTON_FM_LIST_MOD_MINIMUM_HIDE_DISTANCE: 200,

  MOVE_MOBILE_TRAY_TO_TOP: false,
  HIDE_MOBILE_TRAY: false,

  MOBILE_STATUS_BAR: false,
  MOBILE_STATUS_BAR_SHOW_USERS: false,
  MOBILE_STATUS_BAR_CONNECTION: false,

  SIDEBAR_ADDITIONS: false,
  SIDEBAR_ADDITIONS_EXPAND_CANVAS: false,
  SIDEBAR_ADDITIONS_HIDE_BACKGROUND: false,

  MULTIPLE_USERS_NOTICE: false,
  MULTIPLE_USERS_NOTICE_NATIVE_POPUP: false,
  MULTIPLE_USERS_NOTICE_MESSAGE_1: "This receiver is currently in use.",
  MULTIPLE_USERS_NOTICE_MESSAGE_2: "Please be considerate and mindful of other users before tuning.",

  RDS_FLAG_INDICATOR: false,

  MULTIPATH_INDICATOR: false,
  MULTIPATH_ATTACH_TO: "STEREO",
  MULTIPATH_LEFT_PADDING: -8,
  MULTIPATH_DISPLAY_MODE: "BOTH",
  IS_TEF_RADIO: false,

  TUNE_DELAY_ENABLE: false,
  TUNE_DELAY: 2,
  TUNE_DELAY_IF_MORE_THAN_ONE_USER: 45,

  DEFAULT_SIGNAL_UNIT: 0,

  VOLUME_PERCENTAGE_TOAST: false,

  DISPLAY_CANVAS_IN_LANDSCAPE_MODE: false,
  DISPLAY_CANVAS_IN_PORTRAIT_MODE: false,
  ADD_PADDING_TO_PANELS: false,
  GLOW_EFFECT_ON_FREQUENCY_INPUT: false,
  REDUCE_HALF_OPACITY: false,
  INCREASE_TOP_RIGHT_ICON_SIZE: false,
  REDUCE_SIDEBAR_BLUR: false,
  INCREASE_FREQUENCY_FONT_WEIGHT: false,

  GRADIENT_BUTTONS: false,
  INCLUDE_SCANNER_BUTTONS: false,

  LED_GLOW_EFFECT_ICONS: false,
  LED_GLOW_EFFECT_LARGE: false,
  LED_GLOW_EFFECT_SMALL: false,
  LED_GLOW_EFFECT_RDSPS: false,
  LED_GLOW_EFFECT_FREQ: false,

  DIM_INCOMPLETE_PI_CODE: false,

  STEREO_ICON_COLOR: "default",
  STEREO_ICON_COLOR_OFF: "",
  STEREO_ICON_SCALE: "100%",

  PANEL_STYLE_EFFECT: 0,
  PANEL_STYLE_EFFECT_SIGNAL_PANEL: false,

  RDS_ICON_STYLE: false,
  RDS_ICON_STYLE_MOBILE: false,
  METRICS_MONITOR_PLUGIN_IS_INSTALLED: false,
  IS_VISUALEQ_PLUGIN_ENABLED: false,

  RDS_ICON_PRESET: 1,
  RDS_ICON_SCALE: "100%",
  STEREO_ICON_WIDTH: 2,
  RDS_ICON_STYLE_MS_OFF_AS_LETTERS: false,

  RDS_INDICATOR_ICON_TYPE: 1,
  RDS_INDICATOR_ICON_COLOR: "",
  RDS_INDICATOR_ICON_COLOR_OFF: "",
  RDS_INDICATOR_ICON_GLOW_INTENSITY: 0.25,

  TP_INDICATOR_ICON_COLOR: "",
  TP_INDICATOR_ICON_COLOR_OFF: "",
  TA_INDICATOR_ICON_COLOR: "",
  TA_INDICATOR_ICON_COLOR_OFF: "",

  PTY_INDICATOR_COLOR: "",
  PTY_INDICATOR_COLOR_OFF: "",
  MS_INDICATOR_COLOR: "",
  MS_INDICATOR_COLOR_OFF: "",

  RDS_ICON_STYLE_REMOVE_RDS_ICON: false,
  BANDWIDTH_UPDATE_INTERVAL: 500,

  LED_GLOW_EFFECT_ICONS_RDS_ICON_STYLE_PTY: false,
  LED_GLOW_EFFECT_ICONS_RDS_ICON_STYLE_MS: false,
  LED_GLOW_EFFECT_ICONS_BANDWIDTH: false,
  LED_GLOW_EFFECT_ICONS_METRICS_MONITOR_PLUGIN: false,

  REPLACE_MPX_LOGO_WITH_STEREO_LOGO_METRICS_MONITOR_PLUGIN: false,
  APPLY_STEREO_ICON_GLOW_WITH_MISSING_RDS: false,

  RDS_ICON_STYLE_PRESETS: {
    user: {
      FIRST_ROW: ["PTY"],
      SECOND_ROW: ["TP", "TA", "ECC", "STEREO", "MS"],
      FIRST_ROW_GAP: 8,
      SECOND_ROW_GAP: 16,
      TP_TA_GAP: 8,
      MS_TOP_PADDING: 7,
      STEREO_ICON_SPACING: 1,
      PTY_HEIGHT: 20,
      MS_HEIGHT_MODE: "PTY",
      MS_HEIGHT: 20,
      TP_HEIGHT_MODE: "PTY",
      TP_HEIGHT: 20,
      TA_HEIGHT_MODE: "PTY",
      TA_HEIGHT: 20,
      BW_MARGIN_LEFT: -6,
      GAP_ROW_1: 1,
      GAP_ROW_2: 6
    },
    1: {
      FIRST_ROW: ["PTY"],
      SECOND_ROW: ["TP", "TA", "ECC", "STEREO", "MS"],
      FIRST_ROW_GAP: 8,
      SECOND_ROW_GAP: 16,
      TP_TA_GAP: 8,
      MS_TOP_PADDING: 7,
      STEREO_ICON_SPACING: 1,
      PTY_HEIGHT: 20,
      MS_HEIGHT_MODE: "PTY",
      MS_HEIGHT: 20,
      TP_HEIGHT_MODE: "PTY",
      TP_HEIGHT: 20,
      TA_HEIGHT_MODE: "PTY",
      TA_HEIGHT: 20,
      BW_MARGIN_LEFT: -6,
      GAP_ROW_1: 1,
      GAP_ROW_2: 6
    },
    2: {
      FIRST_ROW: ["STEREO", "RDS"],
      SECOND_ROW: ["ECC", "MS", "PTY", "TP", "TA"],
      FIRST_ROW_GAP: 8,
      SECOND_ROW_GAP: 8,
      TP_TA_GAP: 8,
      MS_TOP_PADDING: 7,
      STEREO_ICON_SPACING: 6,
      PTY_HEIGHT: 17,
      MS_HEIGHT_MODE: "PTY",
      MS_HEIGHT: 17,
      TP_HEIGHT_MODE: "PTY",
      TP_HEIGHT: 17,
      TA_HEIGHT_MODE: "PTY",
      TA_HEIGHT: 17,
      BW_MARGIN_LEFT: -6,
      GAP_ROW_1: -6,
      GAP_ROW_2: 0
    },
    3: {
      FIRST_ROW: ["PTY", "MS"],
      SECOND_ROW: ["ECC", "STEREO", "TP", "TA", "RDS"],
      FIRST_ROW_GAP: 8,
      SECOND_ROW_GAP: 16,
      TP_TA_GAP: 8,
      MS_TOP_PADDING: 9,
      STEREO_ICON_SPACING: 1,
      PTY_HEIGHT: 20,
      MS_HEIGHT_MODE: "PTY",
      MS_HEIGHT: 20,
      TP_HEIGHT_MODE: "PTY",
      TP_HEIGHT: 20,
      TA_HEIGHT_MODE: "PTY",
      TA_HEIGHT: 20,
      BW_MARGIN_LEFT: -6,
      GAP_ROW_1: 1,
      GAP_ROW_2: 6
    }
  },

  SORT_PLUGIN_BUTTONS: false,
  PLUGINS_USER_ORDER: "1",
  PLUGIN_BUTTON_DEFAULT_LABELS: { ...UIAPE_PLUGIN_BUTTON_DEFAULT_LABELS },
  PLUGIN_BUTTON_DEFAULT_MAP: { ...UIAPE_PLUGIN_BUTTON_DEFAULT_MAP },
  PLUGIN_BUTTON_CUSTOM_LABELS: {
    32: "Custom Links (1)",
    33: "Custom Links (2)",
    34: "Custom Links (3)",
    35: "Custom Links (4)"
  },
  PLUGIN_BUTTON_CUSTOM_MAP: {
    32: "custom-links-btn-0",
    33: "custom-links-btn-1",
    34: "custom-links-btn-2",
    35: "custom-links-btn-3"
  },

  HIDE_CONSOLE_LOGS: false,

  // Which settings are hidden from non-admin users in the config panel. Admin-editable
  // per-setting via the "Admin only" checkbox next to each control - see
  // uiapeIsControlVisibleForCurrentUser() and the "uiapeAdminOnlyKey" change handler.
  ADMIN_ONLY_KEYS: [
    "RDS_ICON_STYLE_REMOVE_RDS_ICON",
    "LED_GLOW_EFFECT_ICONS_METRICS_MONITOR_PLUGIN",
    "REPLACE_MPX_LOGO_WITH_STEREO_LOGO_METRICS_MONITOR_PLUGIN",
    "DEFAULT_SIGNAL_UNIT",
    "BANDWIDTH_UPDATE_INTERVAL",
    "BUTTON_FM_LIST_MOD_MINIMUM_HIDE_DISTANCE",
    "RELOAD_BAN_WARNING",
    "RELOAD_BAN_WARNING_MESSAGE",
    "MULTIPLE_USERS_NOTICE",
    "MULTIPLE_USERS_NOTICE_NATIVE_POPUP",
    "MULTIPLE_USERS_NOTICE_MESSAGE_1",
    "MULTIPLE_USERS_NOTICE_MESSAGE_2",
    "TUNE_DELAY_ENABLE",
    "TUNE_DELAY",
    "TUNE_DELAY_IF_MORE_THAN_ONE_USER",
    "IS_TEF_RADIO",
    "METRICS_MONITOR_PLUGIN_IS_INSTALLED",
    "IS_VISUALEQ_PLUGIN_ENABLED"
  ],
  // Tracks which keys this saved profile has already been reconciled against (see
  // uiapeReconcileAdminOnlyKeys()). Lets a later plugin update add a new key to the
  // ADMIN_ONLY_KEYS default list above and have it actually apply admin-only on
  // installs saved before that update, without overriding an admin's own explicit
  // opt-out of an existing default.
  ADMIN_ONLY_KEYS_SEEN: []
};

function uiapeIsPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function uiapeMergeRdsPresets(presets) {
  const incoming = uiapeIsPlainObject(presets) ? presets : {};
  const merged = {};
  ["user", "1", "2", "3"].forEach(id => {
    const base = UIAPE_DEFAULT_CONFIG.RDS_ICON_STYLE_PRESETS[id] || UIAPE_DEFAULT_CONFIG.RDS_ICON_STYLE_PRESETS[Number(id)] || {};
    const value = incoming[id] || incoming[Number(id)] || {};
    merged[id] = { ...base, ...(uiapeIsPlainObject(value) ? value : {}) };
  });
  return merged;
}

function uiapeNormalizePluginMap(map, fallback = {}) {
  return {
    ...(uiapeIsPlainObject(fallback) ? fallback : {}),
    ...(uiapeIsPlainObject(map) ? map : {})
  };
}

function uiapeNormalizeConfig(config) {
  const input = uiapeIsPlainObject(config) ? config : {};
  const merged = {
    ...UIAPE_DEFAULT_CONFIG,
    ...input
  };

  merged.RDS_ICON_STYLE_PRESETS = uiapeMergeRdsPresets(input.RDS_ICON_STYLE_PRESETS || merged.RDS_ICON_STYLE_PRESETS);
  merged.PLUGIN_BUTTON_DEFAULT_LABELS = uiapeNormalizePluginMap(input.PLUGIN_BUTTON_DEFAULT_LABELS, UIAPE_DEFAULT_CONFIG.PLUGIN_BUTTON_DEFAULT_LABELS);
  merged.PLUGIN_BUTTON_DEFAULT_MAP = uiapeNormalizePluginMap(input.PLUGIN_BUTTON_DEFAULT_MAP, UIAPE_DEFAULT_CONFIG.PLUGIN_BUTTON_DEFAULT_MAP);
  merged.PLUGIN_BUTTON_CUSTOM_LABELS = uiapeNormalizePluginMap(input.PLUGIN_BUTTON_CUSTOM_LABELS, UIAPE_DEFAULT_CONFIG.PLUGIN_BUTTON_CUSTOM_LABELS);
  merged.PLUGIN_BUTTON_CUSTOM_MAP = uiapeNormalizePluginMap(input.PLUGIN_BUTTON_CUSTOM_MAP, UIAPE_DEFAULT_CONFIG.PLUGIN_BUTTON_CUSTOM_MAP);

  const reconciledAdminOnly = uiapeReconcileAdminOnlyKeys(input.ADMIN_ONLY_KEYS, input.ADMIN_ONLY_KEYS_SEEN);
  merged.ADMIN_ONLY_KEYS = reconciledAdminOnly.keys;
  merged.ADMIN_ONLY_KEYS_SEEN = reconciledAdminOnly.seen;

  return merged;
}

function uiapeReadJsonConfig(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    console.warn(`[${pluginName}] Invalid stored UIAP config for ${key}. Using defaults.`, error);
    return {};
  }
}

function uiapeDetectAdminSession() {
  return UIAPE_IS_ADMIN;
}

// Runs callback immediately if the DOM is already ready, otherwise waits for DOMContentLoaded.
// Needed because this file's top-level IIFE is async and awaits a network fetch before reaching
// most feature code below; by the time execution resumes, DOMContentLoaded has usually already
// fired, so a plain addEventListener('DOMContentLoaded', ...) registered down here would never run.
function uiapeOnDomReady(callback) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", callback);
  } else {
    callback();
  }
}

/*
    Themed Popups v1.1.3 by AAD
    https://github.com/AmateurAudioDude/FM-DX-Webserver-Plugin-Themed-Popups
*/

uiapeOnDomReady(()=>{if(!window.hasCustomPopup){let styleElement=document.createElement("style"),cssCodeThemedPopups=".popup-plugin{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background-color:var(--color-2);color:var(--color-main-bright);padding:20px;border-radius:10px;box-shadow:0 4px 8px rgba(0,0,0,.4);opacity:0;transition:opacity .3s ease-in;z-index:9999;max-width:90vw;max-height:90vh;overflow:auto}@media (max-width:400px){.popup-plugin{padding:10px}}.popup-plugin-content{text-align:center}.popup-plugin button{margin-top:10px}.popup-plugin.open{opacity:.99}";styleElement.appendChild(document.createTextNode(cssCodeThemedPopups)),document.head.appendChild(styleElement)}});const isClickedOutsidePopup=!0;function alert(e,t){"undefined"==typeof t&&(t="OK"),popupOpened||(popup=document.createElement("div"),popup.classList.add("popup-plugin"),popup.innerHTML=`<div class="popup-plugin-content">${e.replace(/\n/g,"<br>")}<button id="popup-plugin-close">${t}</button></div>`,document.body.appendChild(popup),popup.querySelector("#popup-plugin-close").addEventListener("click",closePopup),popup.addEventListener("click",function(e){e.stopPropagation()}),setTimeout(function(){popup.classList.add("open"),popupOpened=!0,blurBackground(!0)},10))}function blurBackground(e){idModal&&(e?(idModal.style.display="block",setTimeout(function(){idModal.style.opacity="1"},40)):(setTimeout(function(){idModal.style.display="none"},400),idModal.style.opacity="0"))}let popupOpened=!1,popup,popupPromptOpened=!1,idModal=document.getElementById("myModal");function closePopup(e){e.stopPropagation(),popupOpened=!1,popup.classList.remove("open"),setTimeout(function(){popup.remove(),blurBackground(!1)},300);console.log(`[${pluginName}] Popup closed, user active.`);}document.addEventListener("keydown",function(e){popupOpened&&("Escape"===e.key||"Enter"===e.key)&&(closePopup(e),blurBackground(!1))}),isClickedOutsidePopup&&document.addEventListener("click",function(e){popupOpened&&!popup.contains(e.target)&&(closePopup(e),blurBackground(!1))});

function confirmAsync(n){return new Promise(function(e,t){let o,i=!1;function c(n){i&&(i=!1,o.classList.remove("open"),setTimeout(function(){o.remove()},300))}if(!i){o=document.createElement("div"),o.classList.add("popup-plugin"),o.innerHTML=`\n                <div class="popup-plugin-content">${n.replace(/\n/g,"<br>")}\n                    <button id="popup-plugin-confirm">OK</button>\n                    <button id="popup-plugin-cancel">Cancel</button>\n                </div>`,document.body.appendChild(o);let t=o.querySelector("#popup-plugin-confirm"),u=o.querySelector("#popup-plugin-cancel");t.addEventListener("click",function(){c(),e(!0)}),u.addEventListener("click",function(){c(),e(!1)}),document.addEventListener("keydown",function n(t){"Escape"===t.key&&i&&(t.preventDefault(),c(),e(!1),document.removeEventListener("keydown",n))}),o.addEventListener("click",function(n){n.stopPropagation()}),setTimeout(function(){o.classList.add("open"),i=!0},10)}})}

function readUiapAdminConfig() {
  // Server-side shared/default profile. This is what every browser receives first.
  // Admin edits are saved through UIAddonPackEnhanced_server.js into plugins_configs/UIAddonPackEnhanced.json.
  return { ...UIAPE_SITE_CONFIG };
}

function readUiapUserConfig() {
  return uiapeReadJsonConfig(UIAPE_USER_CONFIG_KEY);
}

function readUiapStoredConfig() {
  const adminConfig = readUiapAdminConfig();

  // Admin always edits/sees the shared server profile.
  if (uiapeDetectAdminSession()) return adminConfig;

  // Regular users always start from the server profile and may keep browser-local overrides.
  // Admin-only keys are ignored here rather than deleted from storage: if a user saved a
  // personal value before a setting became admin-only, this leaves it untouched in
  // localStorage so it applies again automatically if the setting is ever un-restricted.
  const userConfig = readUiapUserConfig();
  uiapeGetAdminOnlyKeys().forEach(key => delete userConfig[key]);

  return {
    ...adminConfig,
    ...userConfig
  };
}

function uiapeJsonEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function uiapeBuildUserOverrides(fullConfig) {
  const normalizedFullConfig = uiapeNormalizeConfig(fullConfig);
  const base = uiapeNormalizeConfig(readUiapAdminConfig());
  const overrides = {};

  Object.keys(normalizedFullConfig || {}).forEach(key => {
    if (!uiapeJsonEqual(normalizedFullConfig[key], base[key])) {
      overrides[key] = normalizedFullConfig[key];
    }
  });

  return overrides;
}

function writeUiapStoredConfig(config, profile) {
  const targetProfile = profile || (uiapeDetectAdminSession() ? "admin" : "user");
  const normalizedConfig = uiapeNormalizeConfig(config);

  if (targetProfile === "user") {
    const overrides = uiapeBuildUserOverrides(normalizedConfig);
    localStorage.setItem(UIAPE_USER_CONFIG_KEY, JSON.stringify(overrides, null, 2));
    localStorage.setItem(UIAPE_CONFIG_KEY, JSON.stringify(overrides, null, 2));
    return;
  }

  // Admin/default profile is shared server-side. Keep a local copy only for immediate UI refresh,
  // but the real shared source is plugins_configs/UIAddonPackEnhanced.json written by the server bridge.
  localStorage.setItem(UIAPE_CONFIG_KEY, JSON.stringify(normalizedConfig, null, 2));
  // Returned so callers that reload right after calling this can await it first - otherwise a
  // reload could happen before the POST finishes and fetch the still-old server value.
  return uiapeSaveServerConfig(normalizedConfig).then(result => {
    if (!result || result.ok !== true) {
      console.warn(`[${pluginName}] Admin config was not confirmed by the server. Check UIAddonPackEnhanced_server.js and file permissions.`);
    }
    return result;
  });
}

function ensureUiapDefaultConfig() {
  // The shared default profile lives on the server. No browser-local default is needed.
}

function getUiapConfig() {
  return uiapeNormalizeConfig(readUiapStoredConfig());
}

let UIAPE_CONFIG = getUiapConfig();
let UIAPE_CONFIG_DIRTY = false;

function getUiapPanelConfig() {
  return uiapeNormalizeConfig(UIAPE_CONFIG);
}

function markUiapConfigDirty() {
  UIAPE_CONFIG_DIRTY = true;
  const panel = document.getElementById("uiape-config-panel");
  if (!panel) return;
  panel.classList.add("uiape-config-dirty");
  const status = panel.querySelector("[data-uiape-save-status]");
  if (status) status.textContent = "Unsaved changes";
}

function markUiapConfigClean(message = "Saved") {
  UIAPE_CONFIG_DIRTY = false;
  const panel = document.getElementById("uiape-config-panel");
  if (!panel) return;
  panel.classList.remove("uiape-config-dirty");
  const status = panel.querySelector("[data-uiape-save-status]");
  if (status) status.textContent = message;
}

async function saveUiapConfig() {
  const targetProfile = uiapeDetectAdminSession() ? "admin" : "user";
  const normalizedConfig = uiapeNormalizeConfig(getUiapPanelConfig());

  if (targetProfile === "admin") {
    const result = await uiapeSaveServerConfig(normalizedConfig);
    if (!result || result.ok !== true) {
      const reason = result && result.error ? result.error : "Check server plugin and file permissions.";
      alert(`Could not save ${pluginName} server config.\n\n${reason}`);
      return;
    }
    localStorage.setItem(UIAPE_CONFIG_KEY, JSON.stringify(normalizedConfig, null, 2));
  } else {
    const overrides = uiapeBuildUserOverrides(normalizedConfig);
    localStorage.setItem(UIAPE_USER_CONFIG_KEY, JSON.stringify(overrides, null, 2));
    localStorage.setItem(UIAPE_CONFIG_KEY, JSON.stringify(overrides, null, 2));
    localStorage.setItem(UIAPE_ENABLE_KEY, normalizedConfig.ENABLE_PLUGIN === false ? "false" : "true");
  }

  // Reload-required changes were saved but are not visually applied on this page yet.
  const needsReload = UIAPE_RELOAD_DIRTY_KEYS.size > 0;

  // The saved config becomes the new baseline; live (CSS) changes are already visible.
  UIAPE_SAVED_BASELINE = JSON.parse(JSON.stringify(normalizedConfig));
  UIAPE_RELOAD_DIRTY_KEYS.clear();
  uiapeUpdateReloadNotice();
  markUiapConfigClean("Saved");

  if (needsReload) {
    const reloadCfg = getUiapPanelConfig();
    const reloadBanWarningLine = reloadCfg.RELOAD_BAN_WARNING && reloadCfg.RELOAD_BAN_WARNING_MESSAGE
      ? `<i>${reloadCfg.RELOAD_BAN_WARNING_MESSAGE}</i>\n\n`
      : "";
    const reloadNow = await confirmAsync(
      "Changes saved.\n\nSome of these settings will only take effect after the page reloads.\n\n" +
      "OK: reload now to apply them.\nCancel: changes apply on the next reload.\n\n" +
      reloadBanWarningLine
    );
    if (reloadNow) {
      location.reload();
      return;
    }
  }

  // Close the panel; live changes remain applied.
  const panel = document.getElementById("uiape-config-panel");
  const host = document.querySelector(".uiape-config-host.uiape-config-open");
  if (panel) panel.classList.remove("uiape-open");
  if (host) host.classList.remove("uiape-config-open");
}

function updateUiapConfig(key, value) {
  const next = uiapeNormalizeConfig({
    ...getUiapPanelConfig(),
    [key]: value
  });
  UIAPE_CONFIG = next;
  markUiapConfigDirty();
  uiapeAfterConfigChange(key);
  return next;
}

function uiapeValuesEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// Rebuild the live-CSS style element from the current draft config.
function uiapeRefreshLiveCss() {
  if (uiapeLiveStyleElement) {
    uiapeLiveStyleElement.textContent = uiapeBuildLiveCss(getUiapPanelConfig());
    // Keep it last among this plugin's styles but before the anchor, so other plugins' later CSS still wins ties like it does against the original.
    document.head.insertBefore(uiapeLiveStyleElement, uiapeStyleAnchor);
  }
}

// Show/hide the "reload required" note based on how many reload-required keys have changed.
function uiapeUpdateReloadNotice() {
  const note = document.querySelector("[data-uiape-reload-note]");
  if (note) note.hidden = UIAPE_RELOAD_DIRTY_KEYS.size === 0;
}

// Read fresh inside handleTextSocketMessage on every incoming station-data message
// (already firing continuously), so no explicit re-apply action is needed here -
// just don't flag them as "reload required" once the message loop picks them up.
const UIAPE_MESSAGE_DRIVEN_KEYS = new Set([
  "MS_INDICATOR_COLOR", "MS_INDICATOR_COLOR_OFF",
  "PTY_INDICATOR_COLOR", "PTY_INDICATOR_COLOR_OFF",
  "RDS_INDICATOR_ICON_COLOR", "RDS_INDICATOR_ICON_COLOR_OFF",
  "RDS_INDICATOR_ICON_GLOW_INTENSITY",
  "TP_INDICATOR_ICON_COLOR", "TP_INDICATOR_ICON_COLOR_OFF",
  "TA_INDICATOR_ICON_COLOR", "TA_INDICATOR_ICON_COLOR_OFF",
  "LED_GLOW_EFFECT_ICONS_RDS_ICON_STYLE_PTY",
  "LED_GLOW_EFFECT_ICONS_RDS_ICON_STYLE_MS",
  "RDS_ICON_STYLE_MS_OFF_AS_LETTERS",
  "BANDWIDTH_UPDATE_INTERVAL",
  "LED_GLOW_EFFECT_ICONS_BANDWIDTH",
  "RDS_FLAG_INDICATOR"
]);

// Called after every draft change. Live CSS keys apply instantly; all other keys are
// tracked (compared against the saved baseline) so we can warn a reload is needed.
function uiapeAfterConfigChange(key) {
  if (UIAPE_LIVE_CSS_KEYS.has(key)) {
    uiapeRefreshLiveCss();
    return;
  }
  if (key === "CANVAS_FADE_EFFECT") {
    if (getUiapPanelConfig().CANVAS_FADE_EFFECT) uiapeApplyCanvasFadeEffect();
    return;
  }
  if (key === "DIM_INCOMPLETE_PI_CODE") {
    checkPiForQuestionMark();
    return;
  }
  if (key === "VOLUME_PERCENTAGE_TOAST") {
    if (getUiapPanelConfig().VOLUME_PERCENTAGE_TOAST) {
      uiapeSetupVolumeToast();
    } else {
      uiapeTeardownVolumeToast();
    }
    return;
  }
  if (key === "STEREO_ICON_COLOR" || key === "STEREO_ICON_COLOR_OFF") {
    refreshAutoIconColorVars();
    return;
  }
  if (key === "RDS_ICON_PRESET" || key === "RDS_ICON_STYLE_PRESETS") {
    // Only rebuild when Enhanced owns the icon row; otherwise this would overwrite Metrics Monitor's panel.
    if (uiapeRebuildRdsIconPanel && getUiapPanelConfig().RDS_ICON_STYLE) uiapeRebuildRdsIconPanel();
    uiapeRefreshLiveCss();
    return;
  }
  if (
    key === "MULTIPATH_INDICATOR" ||
    key === "MULTIPATH_ATTACH_TO" ||
    key === "MULTIPATH_LEFT_PADDING" ||
    key === "MULTIPATH_DISPLAY_MODE"
  ) {
    if (uiapeReapplyMultipathIndicator) uiapeReapplyMultipathIndicator();
    return;
  }
  if (UIAPE_MESSAGE_DRIVEN_KEYS.has(key)) {
    return;
  }
  const baseline = UIAPE_SAVED_BASELINE || {};
  if (uiapeValuesEqual(getUiapPanelConfig()[key], baseline[key])) {
    UIAPE_RELOAD_DIRTY_KEYS.delete(key);
  } else {
    UIAPE_RELOAD_DIRTY_KEYS.add(key);
  }
  uiapeUpdateReloadNotice();
}

// Builds the CSS for all live-previewable visual features from a config object.
// Regenerated wholesale on every change so toggling a feature off cleanly removes its rules.
function uiapeBuildLiveCss(cfg) {
  let css = "";

  // +++++++++++++++ STEP 4a +++++++++++++++ //

  if (cfg.DISPLAY_CANVAS_IN_LANDSCAPE_MODE) {
    css += `
  /* [MOBILE] Display canvas graph at low height (v1.2.5+) */
  @media only screen and (min-width: 900px) and (max-device-width: 960px) {
    .canvas-container {
      display: block;
    }
  }
  `;
  }

  if (cfg.DISPLAY_CANVAS_IN_PORTRAIT_MODE) {
    css += `
  /* [MOBILE] Display canvas graph in portrait mode */
  @media only screen and (min-width: 240px) and (max-width: 480px) and (orientation: portrait) {
    canvas#signal-canvas {
      max-width: 100%;
    }
    .canvas-container {
      display: block;
      max-height: 120px;
      transform: scaleX(0.72) scaleY(0.72);
      margin: -4px auto -36px;
      width: auto;
    }
  }
  `;
  }

  if (cfg.ADD_PADDING_TO_PANELS) {
    css += `
  /* RADIOTEXT text padding */
  #rt-container {
    padding-left: 8px;
    padding-right: 8px;
  }

  /* PTY padding */
  #flags-container-desktop.panel-33.user-select-none {
    min-width: 240px;
  }

  /* PS padding */
  #ps-container {
    min-width: 200px;
  }
  `;
  }

  if (cfg.GLOW_EFFECT_ON_FREQUENCY_INPUT) {
    css += `
  /* Frequency key input glow effect */
  #wrapper #tune-buttons input[placeholder="Frequency"]:placeholder-shown {
    opacity: .85;
  }
  #wrapper #tune-buttons input[placeholder="Frequency"]:placeholder-shown:focus {
    opacity: .45;
  }
  input#commandinput:focus {
    box-shadow: 0 0 8px var(--color-4);
  }
  `;
  }

  if (cfg.REDUCE_HALF_OPACITY) {
    css += `
  /* Reduce half opacity 50% value */
  .opacity-half {
    opacity: 0.25 !important;
  }
  `;
  }

  if (cfg.INCREASE_TOP_RIGHT_ICON_SIZE) {
    css += `
  /* Increase size of top-right side icons */
  .wrapper-outer button.chatbutton,
  .wrapper-outer .settings,
  .wrapper-outer .users-online-container .fa-solid.fa-user,
  .wrapper-outer .users-online-container .users-online {
    font-size: 18px;
  }

  .wrapper-outer .users-online-container {
    width: 56px;
  }

  .wrapper-outer .users-online-container .users-online {
    min-width: 10px;
    margin-bottom: 1px;
    display: inline-block;
  }
  `;
  }

  if (cfg.REDUCE_SIDEBAR_BLUR) {
    css += `
  /* Side bar menu changes */
  .modal {
    transition: opacity 0.3s ease-in-out;
    backdrop-filter: blur(3px);
  }
  `;
  }

  if (cfg.INCREASE_FREQUENCY_FONT_WEIGHT) {
    const isChrome = /Chrome/.test(navigator.userAgent) && !/Edg|OPR|Brave/.test(navigator.userAgent);
    css += `
  /* Frequency font weight */
  #data-frequency {
  font-weight: ${isChrome ? 599 : 600};
  }
  `;
  }

  // Gradient buttons
  if (cfg.GRADIENT_BUTTONS) {
    if (cfg.INCLUDE_SCANNER_BUTTONS) {
      css += `
      #scanner-controls .dropdown:nth-of-type(1) input {
        border-radius: 14px 0 0 14px;
      }
      #scanner-controls .dropdown:nth-of-type(2) input {
        border-radius: 0;
      }
      #scanner-controls .dropdown:nth-of-type(3) input {
        border-radius: 0 14px 14px 0;
      }

      #scanner-controls .dropdown input {
        background-image: linear-gradient(var(--color-5), var(--color-3));
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
      }

      #scanner-controls .dropdown input:hover {
        background-image: linear-gradient(var(--color-3), var(--color-5));
        box-shadow: 0 10px 15px rgba(0, 0, 0, 0.2);
        transform: translateY(0.1px);
      }
    `;
    }

    css += `
    .playbutton, .data-eq, #data-ant input, #data-bw input, .data-ims,
    #freq-down, #search-down, #scanner-down,
    #freq-up, #search-up, #scanner-up,
    #button-presets-bank-dropdown input {
      background-image: linear-gradient(var(--color-5), var(--color-3));
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
    }

    .playbutton:hover, .data-eq:hover, #data-ant input:hover, #data-bw input:hover, .data-ims:hover,
    #freq-down:hover, #search-down:hover, #scanner-down:hover,
    #freq-up:hover, #search-up:hover, #scanner-up:hover,
    #Scan-on-off:hover, #button-presets-bank-dropdown input:hover {
      background-image: linear-gradient(var(--color-3), var(--color-5));
      box-shadow: 0 10px 15px rgba(0, 0, 0, 0.2);
      transform: translateY(0.1px);
    }

    html body div.wrapper-outer.main-content div#wrapper div.flex-container div.panel-100.no-bg div.flex-container div.panel-33.hide-phone.no-bg div.flex-container span.panel-100-real.m-0,
    #Scan-on-off {
      filter: brightness(117.5%);
      position: relative;
      z-index: 0;
      border-radius: 14px;
    }

    html body div.wrapper-outer.main-content div#wrapper div.flex-container div.panel-100.no-bg div.flex-container div.panel-33.hide-phone.no-bg div.flex-container span.panel-100-real.m-0::before,
    #Scan-on-off::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 100%);
      pointer-events: none;
      z-index: 1;
      border-radius: inherit;
    }
  `;
  }

  const anyGlow = cfg.LED_GLOW_EFFECT_LARGE || cfg.LED_GLOW_EFFECT_SMALL || cfg.LED_GLOW_EFFECT_ICONS || cfg.LED_GLOW_EFFECT_FREQ || cfg.LED_GLOW_EFFECT_RDSPS;

  if (anyGlow) {
    css += `
    :root {
      --glow-alpha-1: 0.4;
      --glow-alpha-2: 0.3;
      --glow-alpha-3: 0.2;
      --glow-alpha-4: 0.1;
    }
  `;
  }

  if (cfg.LED_GLOW_EFFECT_LARGE) {
    css += `
    .text-big, .text-small.text-gray.highest-signal-container,
  `;
  }

  if (cfg.LED_GLOW_EFFECT_SMALL) {
    css += `
     .text-small, #data-rt0, #data-rt1, #data-station-city,
  `;
  }

  if (cfg.LED_GLOW_EFFECT_ICONS) {
    css += `
    .wrapper-outer #wrapper #flags-container-desktop.panel-33.user-select-none h3 .opacity-full,
  `;
  }

  if (cfg.LED_GLOW_EFFECT_FREQ) {
    css += `
    #data-frequency,
  `;
  }

  if (cfg.LED_GLOW_EFFECT_RDSPS) {
    css += `
    #data-ps,
  `;
  }

  if (anyGlow) {
    css += `
    #placeholder-dummy {
      color: var(--text-color-default);
      text-shadow:
        0 0 5px rgba(255, 255, 255, var(--glow-alpha-1)),
        0 0 10px rgba(255, 255, 255, var(--glow-alpha-2)),
        0 0 20px rgba(238, 238, 238, var(--glow-alpha-3)),
        0 0 30px rgba(204, 204, 204, var(--glow-alpha-4));
    }
  `;
  }

  if (cfg.LED_GLOW_EFFECT_ICONS) {
    css += `
    .wrapper-outer #wrapper #flags-container-desktop.panel-33.user-select-none h3 .opacity-half {
      color: inherit;
      text-shadow: none;
    }

    .wrapper-outer #wrapper #flags-container-desktop.panel-33.user-select-none h3 .data-tp:not(:has(.opacity-half)),
    .wrapper-outer #wrapper #flags-container-desktop.panel-33.user-select-none h3 .data-ta:not(:has(.opacity-half)),
    .wrapper-outer #wrapper #flags-container-desktop.panel-33.user-select-none h3 span.data-ms:not(:has(.opacity-half)) {
      color: var(--text-color-default);
      text-shadow:
        0 0 5px rgba(255, 255, 255, var(--glow-alpha-1)),
        0 0 10px rgba(255, 255, 255, var(--glow-alpha-2)),
        0 0 20px rgba(238, 238, 238, var(--glow-alpha-3)),
        0 0 30px rgba(204, 204, 204, var(--glow-alpha-4));
    }

    .wrapper-outer #wrapper #flags-container-desktop.panel-33.user-select-none h3 .circle-container .circle,
    .wrapper-outer #wrapper .user-select-none .circle-container .circle {
      background-color: rgba(255, 255, 255, var(--glow-alpha-3));
      box-shadow:
        0 0 6px rgba(255, 255, 255, var(--glow-alpha-1)),
        0 0 12px rgba(238, 238, 238, var(--glow-alpha-2)),
        0 0 18px rgba(204, 204, 204, var(--glow-alpha-3)),
        0 0 24px rgba(170, 170, 170, var(--glow-alpha-4));
    }

    .wrapper-outer #wrapper #flags-container-desktop.panel-33.user-select-none h3 .circle-container.opacity-half .circle,
    .wrapper-outer #wrapper .user-select-none .circle-container.opacity-half .circle {
      background-color: inherit;
      box-shadow: none;
    }
  `;
  }

  // Sort plugin buttons: pure CSS "order" rules from PLUGINS_USER_ORDER, no DOM/interval
  // setup involved, so it lives here alongside the rest of the always-live CSS.
  if (cfg.SORT_PLUGIN_BUTTONS) {
    const sortButtonsDefaultMap = { ...(cfg.PLUGIN_BUTTON_DEFAULT_MAP || UIAPE_PLUGIN_BUTTON_DEFAULT_MAP) };
    const sortButtonsCustomMap = Object.fromEntries(
      Object.entries(cfg.PLUGIN_BUTTON_CUSTOM_MAP || {}).filter(([, id]) => String(id || '').trim())
    );
    const sortButtonsMap = { ...sortButtonsDefaultMap, ...sortButtonsCustomMap };

    const orderArray = String(cfg.PLUGINS_USER_ORDER || '')
      .split(',')
      .map(num => parseInt(num.trim()))
      .filter(Boolean);
    const orderedSet = new Set(orderArray);

    orderArray.forEach((num, index) => {
      const selector = uiapeCssId(sortButtonsMap[num]);
      if (selector) css += `${selector} { order: ${index + 1}; }\n`;
    });

    Object.entries(sortButtonsMap).forEach(([num, buttonId]) => {
      if (!orderedSet.has(parseInt(num))) {
        const selector = uiapeCssId(buttonId);
        if (selector) css += `${selector} { order: 999; }\n`;
      }
    });
  }

  // Panel style effect: pure CSS, no DOM/interval setup - safe to live-toggle.
  // The mobile-portrait skip check is kept exactly as the original JS check (not a media
  // query) per an earlier decision not to change this specific behavior.
  if (
    cfg.PANEL_STYLE_EFFECT &&
    !(/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) && window.innerHeight > window.innerWidth)
  ) {
    const panelStyleSelectors = `
      .chatbutton,
      .settings,
      .panel-100-real.m-0.flex-container.bg-phone.flex-phone-column,
      ${cfg.PANEL_STYLE_EFFECT_SIGNAL_PANEL ? '.panel-33.no-bg-phone,' : ''}
      .panel-25.m-0.hide-phone,
      .panel-30.m-0.hide-phone,
      .panel-33.hover-brighten,
      .panel-100.no-bg-phone,
      #volumeSlider,
      #ps-container,
      #flags-container-desktop,
      #pi-code-container,
      #freq-container,
      #rt-container,
      #signalPanel`;
    const panelStyleHoverSelectors = `
      .chatbutton:hover,
      .settings:hover,
      .panel-100-real.m-0.flex-container.bg-phone.flex-phone-column:hover,
      ${cfg.PANEL_STYLE_EFFECT_SIGNAL_PANEL ? '.panel-33.no-bg-phone:hover,' : ''}
      .panel-25.m-0.hide-phone:hover,
      .panel-30.m-0.hide-phone:hover,
      .panel-33.hover-brighten:hover,
      .panel-100.no-bg-phone:hover,
      #volumeSlider:hover,
      #ps-container:hover,
      #flags-container-desktop:hover,
      #pi-code-container:hover,
      #freq-container:hover,
      #rt-container:hover,
      #signalPanel:hover`;

    let panelStyleBackground, panelStyleBoxShadow, panelStyleBorder;
    if (cfg.PANEL_STYLE_EFFECT === 1) {
      panelStyleBackground = 'linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.05) 100%), var(--color-1-transparent)';
      panelStyleBoxShadow = '1px 1px 1px var(--color-1-transparent), -1px -1px 1px var(--color-3-transparent)';
    } else if (cfg.PANEL_STYLE_EFFECT === 2) {
      panelStyleBackground = 'linear-gradient(to bottom, rgba(0, 0, 0, 0.06) 0%, rgba(0, 0, 0, 0) 100%), var(--color-1-transparent)';
      panelStyleBoxShadow = 'inset 2px 2px 6px var(--color-1-transparent), inset -2px -2px 6px var(--color-3-transparent), 1px 1px 2px rgba(0,0,0,0.15)';
      panelStyleBorder = 'none';
    } else if (cfg.PANEL_STYLE_EFFECT === 3) {
      panelStyleBackground = 'linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.03) 100%), var(--color-1-transparent)';
      panelStyleBoxShadow = '1px 1px 3px var(--color-1-transparent), -1px -1px 3px var(--color-3-transparent)';
      panelStyleBorder = '1px solid rgba(255,255,255,0.18)';
    }

    if (panelStyleBackground) {
      css += `
  ${panelStyleSelectors} {
    border-radius: 10px;
    background: ${panelStyleBackground};
    box-shadow: ${panelStyleBoxShadow};
    ${panelStyleBorder ? `border: ${panelStyleBorder};` : ''}
    transition: box-shadow 0.2s ease;
  }

  ${panelStyleHoverSelectors} {
    box-shadow: -1px -1px 1px var(--color-1-transparent),
                 1px 1px 1px var(--color-3-transparent);
  }
  `;
    }
  }

  // RDS icon scale located here to decouple from "Metrics icon glow" for Metrics Monitor.
  if (!cfg.IS_VISUALEQ_PLUGIN_ENABLED && window.innerWidth > 360 && cfg.RDS_ICON_SCALE !== "100%") {
    css += `
#signalPanel > *:where(:not(#uiape-config-gear, #uiape-config-panel)) {
    transform: scale(${uiapeCssScaleValue(cfg.RDS_ICON_SCALE)});
    transform-origin: center;
}
`;
  }

  // RDS/Stereo Icons: mirrors (as property-level overrides, not full rule
  // duplicates) the static <style> block built once inside the MetricsMonitor-
  // derived block further down in the file, so these settings can update
  // without a reload. Only takes effect while the master RDS icon feature
  // (RDS_ICON_STYLE / LED_GLOW_EFFECT_ICONS_METRICS_MONITOR_PLUGIN /
  // RDS_ICON_STYLE_REMOVE_RDS_ICON) was already active at page load - turning
  // that master feature itself on/off still needs a reload.
  if (
    !cfg.IS_VISUALEQ_PLUGIN_ENABLED &&
    (cfg.RDS_ICON_STYLE || cfg.LED_GLOW_EFFECT_ICONS_METRICS_MONITOR_PLUGIN || cfg.RDS_ICON_STYLE_REMOVE_RDS_ICON) &&
    window.innerWidth > 360
  ) {
    const rdsPreset = uiapeGetActiveRdsPreset(cfg);
    const stereoCssScale = uiapeCssScaleValue(cfg.STEREO_ICON_SCALE, 1);
    const rdsGlowEnabled = !cfg.IS_VISUALEQ_PLUGIN_ENABLED && (cfg.LED_GLOW_EFFECT_ICONS && (cfg.RDS_ICON_STYLE || cfg.LED_GLOW_EFFECT_ICONS_METRICS_MONITOR_PLUGIN));

    css += `
${cfg.RDS_ICON_STYLE_REMOVE_RDS_ICON === true ? `
#rdsIcon {
  display: none !important;
}

.multipath-container {
  margin-left: 0 !important;
}

#eccWrapper {
  margin-left: 24px !important;
}
` : ""}

${cfg.METRICS_MONITOR_PLUGIN_IS_INSTALLED === false ? `
@media (max-width: 768px) {
  #signalPanel {
    margin-top: 0px !important;
    transform: none !important;
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box;
    padding-left: 8px;
    padding-right: 8px;
    ${cfg.RDS_ICON_STYLE_MOBILE === false ? "display: none !important;" : ""}
  }

  #signal-icons {
    flex-direction: column;
    align-items: center;
  }
}` : ""}

${cfg.METRICS_MONITOR_PLUGIN_IS_INSTALLED === false ? `
#signal-icons {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  margin: 0;
  position: relative;
  width: 100%;
}
` : ""}

${rdsGlowEnabled ? `
/* Glow effect for RDS_ICON_STYLE */
${cfg.REPLACE_MPX_LOGO_WITH_STEREO_LOGO_METRICS_MONITOR_PLUGIN && cfg.APPLY_STEREO_ICON_GLOW_WITH_MISSING_RDS ? '#stereoIcon[src*="stereo_on"],' : ''}
#signal-icons img.status-icon.icon-glow-on {
  filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.6))
          drop-shadow(0 0 6px rgba(255, 255, 255, 0.4))
          drop-shadow(0 0 9px rgba(238, 238, 238, 0.3));
}

/* Multipath icon glow effect */
#signal-icons .multipath-container.opacity-full .fa-mountain-sun {
  filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.6))
          drop-shadow(0 0 6px rgba(255, 255, 255, 0.4))
          drop-shadow(0 0 9px rgba(238, 238, 238, 0.3));
}
` : ''}

${cfg.RDS_ICON_STYLE ? `
#signal-icons #stereoIcon {
  transform: translateY(-1px) scale(${stereoCssScale});
}

#signal-icons #stereoIcon.stereo-on .circle-container .circle {
  border: ${cfg.STEREO_ICON_WIDTH}px solid;
  border-color: var(--uiape-stereo-icon-color);
}

#signal-icons #stereoIcon.stereo-off .circle-container .circle {
  border: ${cfg.STEREO_ICON_WIDTH}px solid;
  border-color: var(--uiape-stereo-icon-color-off);
}
` : ''}

${rdsGlowEnabled ? `
/* Stereo icon glow effect for RDS_ICON_STYLE */
#signal-icons #stereoIcon.stereo-on .circle-container .circle {
  background-color: rgba(255, 255, 255, 0.2);
  box-shadow:
    0 0 6px rgba(255, 255, 255, 0.4),
    0 0 12px rgba(238, 238, 238, 0.3),
    0 0 18px rgba(204, 204, 204, 0.2),
    0 0 24px rgba(170, 170, 170, 0.1);
}

#signal-icons #stereoIcon.stereo-on .circle-container .circle::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 1.5px solid var(--uiape-stereo-icon-color);
  opacity: 0.15;
}
` : ''}

${cfg.RDS_ICON_STYLE ? `
#signal-icons #stereoIcon.stereo-off .circle-container .circle,
#signal-icons #stereoIcon.stereo-off .circle-container {
  ${cfg.REDUCE_HALF_OPACITY === true ? "opacity: 0.9;" : ""}
}

#tpIcon {
  height: ${uiapeResolveLiveRdsIconHeight(rdsPreset, "TP", rdsPreset.PTY_HEIGHT)}px !important;
}

#taIcon {
  height: ${uiapeResolveLiveRdsIconHeight(rdsPreset, "TA", rdsPreset.PTY_HEIGHT)}px !important;
}

#ptyIconOverlay {
  height: ${uiapeResolveLiveRdsIconHeight(rdsPreset, "MS", rdsPreset.PTY_HEIGHT)}px !important;
}

#rdsIcon {
  height: ${cfg.RDS_INDICATOR_ICON_TYPE === 1 ? 14 : 18}px !important;
  width: auto !important;
}
` : ''}
`;
  }

  return css;
}

function uiapeCssId(id) {
  const clean = String(id || '').trim();
  if (!clean) return '';
  if (window.CSS && typeof CSS.escape === 'function') return `#${CSS.escape(clean)}`;
  return `#${clean.replace(/([ #;?%&,.+*~\':"!^$[\]()=>|\/])/g, '\\$1')}`;
}

// Declared at top level (not inside the ENABLE_PLUGIN gate further below) so
// uiapeAfterConfigChange() can call these directly - a function declared inside an
// if-block in strict mode is only visible within that block, not hoisted out to here.
// The MutationObserver setup and gated initial call remain inside ENABLE_PLUGIN as before;
// only the function bodies themselves needed to move.
function checkPiForQuestionMark() {
  const dataPi = document.querySelector('#data-pi');
  if (!dataPi) return;
  const shouldDim = getUiapPanelConfig().DIM_INCOMPLETE_PI_CODE && dataPi.textContent.includes('?');
  dataPi.classList.toggle('opacity-half', shouldDim);
}

function uiapeApplyCanvasFadeEffect() {
  const canvasGraph = document.querySelector('.wrapper-outer #wrapper .canvas-container #signal-canvas');
  if (!canvasGraph) return;
  // Avoids style mutations so it can't trigger other plugins' MutationObservers.
  canvasGraph.getAnimations().forEach(anim => anim.cancel());
  canvasGraph.animate(
    [{ opacity: 0 }, { opacity: 1 }],
    { duration: 300, easing: 'ease-in', fill: 'none' }
  );
}

// Creates the volume toast + attaches its listeners to #volumeSlider; no-ops if already
// active. Paired with uiapeTeardownVolumeToast() so VOLUME_PERCENTAGE_TOAST can be
// toggled live in the panel instead of only taking effect on the next reload.
let uiapeVolumeToastState = null;

function uiapeSetupVolumeToast() {
  if (uiapeVolumeToastState) return;
  const slider = document.getElementById('volumeSlider');
  if (!slider) {
    console.warn(`[${pluginName}] Missing #volumeSlider`);
    return;
  }

  const toast = document.createElement('div');
  toast.id = 'volumeToast';
  toast.innerHTML = `<div id="toastContent" class="text-small" style="font-size: 14px; display: flex; align-items: center; justify-content: center; width: 100%;">
                        <span id="speakerIcon" style="flex-shrink: 0; width: 20px; text-align: center;">
                          <i class="fa-solid fa-volume-high"></i> <!-- Default icon -->
                        </span>
                        <span id="toastValue" style="flex-grow: 1; text-align: center;"></span>
                      </div>`;
  document.body.appendChild(toast);

  const toastStyle = toast.style;
  Object.assign(toastStyle, {
    position: 'fixed',
    bottom: '64px',
    left: '50%',
    transform: 'translateX(-50%) translateY(20px)',
    background: 'var(--color-2-transparent, rgba(0,0,0,0.7))',
    color: 'var(--color-text, #fff)',
    padding: '8px 0px 8px 18px',
    borderRadius: '14px',
    fontSize: '16px',
    opacity: '0',
    pointerEvents: 'none',
    transition: 'opacity 0.4s ease, transform 0.6s ease',
    zIndex: '99',
    width: '96px',
    textAlign: 'center',
  });

  let fadeOutTimeout;

  function showToast() {
    const speakerIcon = document.getElementById('speakerIcon');
    const volumeValue = Math.round(slider.value * 100);

    // Dynamically change icon
    if (volumeValue === 0) {
      speakerIcon.innerHTML = `<i class="fa-solid fa-volume-xmark" style="margin-right: 1.5px;"></i>`;
    } else if (volumeValue > 0 && volumeValue < 50) {
      speakerIcon.innerHTML = `<i class="fa-solid fa-volume-low" style="margin-right: 5px;"></i>`;
    } else {
      speakerIcon.innerHTML = `<i class="fa-solid fa-volume-high"></i>`;
    }

    // Update volume number
    const valueSpan = document.getElementById('toastValue');
    valueSpan.textContent = volumeValue;

    // Reset any running animations
    clearTimeout(fadeOutTimeout);

    // Trigger animation
    toastStyle.opacity = '1';
    toastStyle.transform = 'translateX(-50%) translateY(0px)';

    // Slow fade
    fadeOutTimeout = setTimeout(() => {
      toastStyle.opacity = '0';
      toastStyle.transform = 'translateX(-50%) translateY(20px)';
    }, 1500);
  }

  slider.addEventListener('mousedown', showToast);
  slider.addEventListener('input', showToast);

  uiapeVolumeToastState = { toast, slider, showToast };
}

function uiapeTeardownVolumeToast() {
  if (!uiapeVolumeToastState) return;
  const { toast, slider, showToast } = uiapeVolumeToastState;
  slider.removeEventListener('mousedown', showToast);
  slider.removeEventListener('input', showToast);
  toast.remove();
  uiapeVolumeToastState = null;
}

function migrateUiapPluginButtonMapV7() {
  const cfg = getUiapConfig();
  const map = { ...(cfg.PLUGIN_BUTTON_CUSTOM_MAP || {}) };
  const labels = { ...(cfg.PLUGIN_BUTTON_CUSTOM_LABELS || {}) };
  let changed = false;

  // v5/v6 used 31/32/33 for Custom Links. v7 reserves 31 for WebStats
  // and shifts editable Custom Link slots to 32/33/34, leaving 35 as an empty custom slot.
  const oldCustomLinksAt31 =
    map[31] === "custom-links-btn-0" &&
    map[32] === "custom-links-btn-1" &&
    map[33] === "custom-links-btn-2";

  if (oldCustomLinksAt31) {
    map[32] = "custom-links-btn-0";
    map[33] = "custom-links-btn-1";
    map[34] = "custom-links-btn-2";
    delete map[31];

    labels[32] = "Custom Links (1)";
    labels[33] = "Custom Links (2)";
    labels[34] = "Custom Links (3)";
    delete labels[31];
    changed = true;
  }

  if (map[31]) {
    // 31 is now a built-in WebStats slot; preserve user-entered 31 by moving it to 35 if possible.
    if (!map[35]) {
      map[35] = map[31];
      labels[35] = labels[31] || "Custom Plugin (35)";
    }
    delete map[31];
    delete labels[31];
    changed = true;
  }

  if (!Object.prototype.hasOwnProperty.call(map, 35)) {
    map[35] = "";
    labels[35] = labels[35] || "Custom Plugin (35)";
    changed = true;
  }

  if (!changed) return;

  writeUiapStoredConfig({
    ...cfg,
    PLUGIN_BUTTON_CUSTOM_MAP: map,
    PLUGIN_BUTTON_CUSTOM_LABELS: labels
  });
  UIAPE_CONFIG = getUiapConfig();
}

migrateUiapPluginButtonMapV7();

// Snapshot the persisted config so the panel can tell live changes from reload-required ones,
// and can revert unsaved changes when closed.
UIAPE_SAVED_BASELINE = JSON.parse(JSON.stringify(getUiapPanelConfig()));


function createUiapNativeEnableToggle() {
  if (window.location.pathname === '/setup') return;

  const adminConfig = { ...UIAPE_DEFAULT_CONFIG, ...readUiapAdminConfig() };
  const isAdmin = uiapeDetectAdminSession();

  // Toggle is visible to everyone. Admin writes the shared server default; users write only their browser-local enable choice.
  if (document.getElementById("uiape-enable-plugin")) return;

  const modalContent = document.querySelector(".modal-panel-content");
  if (!modalContent) return;

  const formGroups = modalContent.querySelectorAll(".form-group");
  if (!formGroups.length) return;

  const wrapper = document.createElement("div");
  wrapper.className = "form-group";
  wrapper.id = "uiape-enable-plugin-group";
  wrapper.innerHTML = `
    <div class="switch flex-container flex-phone flex-phone-column flex-phone-center">
      <input type="checkbox" tabindex="0" id="uiape-enable-plugin" aria-label="Enable ${pluginName}">
      <label for="uiape-enable-plugin" class="tooltip" data-tooltip="Enable or disable ${pluginName}. Reload is required."></label>
      <span class="text-smaller text-uppercase text-bold color-4 p-10">Enable UI Add-ons</span>
    </div>
  `;

  formGroups[formGroups.length - 1].insertAdjacentElement("afterend", wrapper);

  const checkbox = wrapper.querySelector("#uiape-enable-plugin");
  if (isAdmin) {
    checkbox.checked = adminConfig.ENABLE_PLUGIN !== false;
  } else {
    const userEnabled = localStorage.getItem(UIAPE_ENABLE_KEY);
    checkbox.checked = userEnabled === null ? true : userEnabled === "true";
    if (userEnabled === null) localStorage.setItem(UIAPE_ENABLE_KEY, "true");
  }

  checkbox.addEventListener("change", async function () {
    const enabled = this.checked;

    if (isAdmin) {
      ensureUiapDefaultConfig();
      await writeUiapStoredConfig({
        ...getUiapConfig(),
        ENABLE_PLUGIN: enabled
      }, "admin");
    } else {
      // User toggle is browser-local and never overwrites the admin/default profile.
      localStorage.setItem(UIAPE_ENABLE_KEY, enabled ? "true" : "false");
    }

    location.reload();
  });
}

function installUiapNativeEnableToggle() {
  if (window.location.pathname === '/setup') return;

  const tryInstall = () => createUiapNativeEnableToggle();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", tryInstall);
  } else {
    tryInstall();
  }

  const observer = new MutationObserver(tryInstall);
  observer.observe(document.body, { childList: true, subtree: true });
}

installUiapNativeEnableToggle();


function normalizeHexColor(color, fallback = "") {
  if (typeof color !== "string") return fallback;

  const value = color.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(value)) return value;
  if (/^#[0-9A-Fa-f]{3}$/.test(value)) {
    return "#" + value.slice(1).split("").map(ch => ch + ch).join("");
  }

  const toHex = n => Math.max(0, Math.min(255, Number(n))).toString(16).padStart(2, "0");

  const rgbMatch = value.match(/rgba?\s*\(\s*(\d{1,3})\s*(?:,|\s)\s*(\d{1,3})\s*(?:,|\s)\s*(\d{1,3})/i);
  if (rgbMatch) {
    return `#${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`;
  }

  // FM-DX themes may expose RGB triplets as custom properties, e.g. "88, 219, 171".
  const rgbTripletMatch = value.match(/^\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*$/);
  if (rgbTripletMatch) {
    return `#${toHex(rgbTripletMatch[1])}${toHex(rgbTripletMatch[2])}${toHex(rgbTripletMatch[3])}`;
  }

  return fallback;
}

function getThemeAccentIconColor() {
  const rootStyle = getComputedStyle(document.documentElement);
  const candidates = [
    "--color-main-bright",
    "--color-4",
    "--color-3"
  ];

  for (const name of candidates) {
    const hex = normalizeHexColor(rootStyle.getPropertyValue(name));
    if (hex) return hex;
  }

  return "";
}

function resolveIconColor(color, fallback = "") {
  if (color === "auto") return getThemeAccentIconColor();
  return color || fallback;
}


// +++++++++++++++ STEP 2 +++++++++++++++ //

// #################### CANVAS GRAPH FADE IN #################### //

// Fades in the signal graph on page load.
const CANVAS_FADE_EFFECT = UIAPE_CONFIG.CANVAS_FADE_EFFECT;
// #################### FMLIST BUTTON #################### //

// Reduces the size of the FMLIST button and relocates it to the top-right corner of the 'TX info' panel.
const BUTTON_FM_LIST_MOD = UIAPE_CONFIG.BUTTON_FM_LIST_MOD;
// Minimum distance in km of radio station before FMLIST button becomes visible.
const BUTTON_FM_LIST_MOD_MINIMUM_HIDE_DISTANCE = UIAPE_CONFIG.BUTTON_FM_LIST_MOD_MINIMUM_HIDE_DISTANCE;
// #################### NATIVE MOBILE TRAY #################### //

// Moves the mobile tray to the top of page.
const MOVE_MOBILE_TRAY_TO_TOP = UIAPE_CONFIG.MOVE_MOBILE_TRAY_TO_TOP;
// Hide mobile tray except play button.
const HIDE_MOBILE_TRAY = UIAPE_CONFIG.HIDE_MOBILE_TRAY;
// #################### MOBILE STATUS BAR #################### //

// On mobile devices, shows a fixed status bar at the top of the webpage, designed similar to the mobile phone's status bar.
// Although all three can be independently set, it's recommended to have them all set to either 'true' or 'false'.
const MOBILE_STATUS_BAR = UIAPE_CONFIG.MOBILE_STATUS_BAR;
// Status bar icon: Users online icon moved from the dropdown menu to status bar.
const MOBILE_STATUS_BAR_SHOW_USERS = UIAPE_CONFIG.MOBILE_STATUS_BAR_SHOW_USERS;
// Status bar icon: Audio stream status in the form of a signal strength icon.
const MOBILE_STATUS_BAR_CONNECTION = UIAPE_CONFIG.MOBILE_STATUS_BAR_CONNECTION;
// #################### SIDEBAR MENU ADDITIONS #################### //

// Enables additional options to the side bar settings menu. Each option can then be individually set.
const SIDEBAR_ADDITIONS = UIAPE_CONFIG.SIDEBAR_ADDITIONS;
// Side bar option to increase the canvas height, which affects the signal graph, and plugins, such as "Spectrum Graph" and "RDS Logger".
const SIDEBAR_ADDITIONS_EXPAND_CANVAS = UIAPE_CONFIG.SIDEBAR_ADDITIONS_EXPAND_CANVAS;
// Cached for the early-paint check above (top of file), so it reflects an admin disabling this feature too.
try { localStorage.setItem(UIAPE_EXPAND_CANVAS_ENABLED_KEY, SIDEBAR_ADDITIONS_EXPAND_CANVAS ? "true" : "false"); } catch (error) {}
// Side bar option to hide the background image.
const SIDEBAR_ADDITIONS_HIDE_BACKGROUND = UIAPE_CONFIG.SIDEBAR_ADDITIONS_HIDE_BACKGROUND;
// #################### MULTIPLE USERS POPUP #################### //

// Displays a popup if 2 or more users are connected, admins excluded.
const MULTIPLE_USERS_NOTICE = UIAPE_CONFIG.MULTIPLE_USERS_NOTICE;
const MULTIPLE_USERS_NOTICE_NATIVE_POPUP = UIAPE_CONFIG.MULTIPLE_USERS_NOTICE_NATIVE_POPUP;
const MULTIPLE_USERS_NOTICE_MESSAGE_1 = UIAPE_CONFIG.MULTIPLE_USERS_NOTICE_MESSAGE_1;
const MULTIPLE_USERS_NOTICE_MESSAGE_2 = UIAPE_CONFIG.MULTIPLE_USERS_NOTICE_MESSAGE_2;
// #################### RDS FLAG BULLET POINT #################### //

// Displays a bullet point next to the current RADIOTEXT being decoded, either A or B.
const RDS_FLAG_INDICATOR = UIAPE_CONFIG.RDS_FLAG_INDICATOR;
// #################### MULTIPATH ICON #################### //

// Adds a multipath icon alongside the stereo/mono icon.
const MULTIPATH_INDICATOR = UIAPE_CONFIG.MULTIPATH_INDICATOR;
// When RDS_ICON_STYLE is enabled, choose which icon the multipath indicator attaches to.
// The multipath icon will appear to the right of the selected icon.
// Options: "STEREO", "PTY", "MS", "ECC", "TP", "TA", "RDS"
const MULTIPATH_ATTACH_TO = UIAPE_CONFIG.MULTIPATH_ATTACH_TO;
// Adjustable multipath icon spacing when not attached to Stereo/Mono icon.
const MULTIPATH_LEFT_PADDING = UIAPE_CONFIG.MULTIPATH_LEFT_PADDING;
// Multipath display mode.
// Options: "ICON", "TEXT", "BOTH".
const MULTIPATH_DISPLAY_MODE = UIAPE_CONFIG.MULTIPATH_DISPLAY_MODE;
// Set to true if using a TEF radio or false if using a TEF module. Based on the assumption TEF radio MP peaks around 40%.
const IS_TEF_RADIO = UIAPE_CONFIG.IS_TEF_RADIO;
// #################### NEW USER TUNING DELAY #################### //

// Enables new user tune delay, admins excluded.
const TUNE_DELAY_ENABLE = UIAPE_CONFIG.TUNE_DELAY_ENABLE;
// Sets a delay in seconds before a new user can begin tuning, admins excluded.
// NOTE: Set to 0 to disable.
const TUNE_DELAY = UIAPE_CONFIG.TUNE_DELAY;
// Sets a delay in seconds, with an on screen timer, before a new user can begin tuning if at least one user is already online.
// NOTE: Set to 0 to disable.
const TUNE_DELAY_IF_MORE_THAN_ONE_USER = UIAPE_CONFIG.TUNE_DELAY_IF_MORE_THAN_ONE_USER;
// #################### NEW USER DEFAULTS #################### //

// Default signal unit for new users.
// 0 = default, 1 = dbf, 2 = dbuv, 3 = dbm
const DEFAULT_SIGNAL_UNIT = UIAPE_CONFIG.DEFAULT_SIGNAL_UNIT;
// #################### VOLUME TOAST NOTIFICATION #################### //

// Displays a toast notification near the bottom of the webpage whenever the volume is changed.
const VOLUME_PERCENTAGE_TOAST = UIAPE_CONFIG.VOLUME_PERCENTAGE_TOAST;
// #################### MISCELLANEOUS CSS VISUAL STYLES #################### //

// Displays canvas in landscape mode with limited height (mobile).
const DISPLAY_CANVAS_IN_LANDSCAPE_MODE = UIAPE_CONFIG.DISPLAY_CANVAS_IN_LANDSCAPE_MODE;
// Displays canvas in portrait mode (mobile).
const DISPLAY_CANVAS_IN_PORTRAIT_MODE = UIAPE_CONFIG.DISPLAY_CANVAS_IN_PORTRAIT_MODE;
// Adds padding to panels, effective in limited-width windows.
const ADD_PADDING_TO_PANELS = UIAPE_CONFIG.ADD_PADDING_TO_PANELS;
// Adds a glow effect around the 'Frequency' key input while focused.
const GLOW_EFFECT_ON_FREQUENCY_INPUT = UIAPE_CONFIG.GLOW_EFFECT_ON_FREQUENCY_INPUT;
// Reduces 'half opacity' value, to appear dimmer.
const REDUCE_HALF_OPACITY = UIAPE_CONFIG.REDUCE_HALF_OPACITY;
// Slightly increases size of top-right icons.
const INCREASE_TOP_RIGHT_ICON_SIZE = UIAPE_CONFIG.INCREASE_TOP_RIGHT_ICON_SIZE;
// Slightly reduces blur effect when sidebar menu is open.
const REDUCE_SIDEBAR_BLUR = UIAPE_CONFIG.REDUCE_SIDEBAR_BLUR;
// Increases frequency font weight.
const INCREASE_FREQUENCY_FONT_WEIGHT = UIAPE_CONFIG.INCREASE_FREQUENCY_FONT_WEIGHT;
// Adds a gradient effect to the buttons
const GRADIENT_BUTTONS = UIAPE_CONFIG.GRADIENT_BUTTONS;
const INCLUDE_SCANNER_BUTTONS = UIAPE_CONFIG.INCLUDE_SCANNER_BUTTONS;
// Adds a glowing effect.
const LED_GLOW_EFFECT_ICONS = UIAPE_CONFIG.LED_GLOW_EFFECT_ICONS; // Enables glow effect for RDS icons, such as the Stereo/Mono icon.
const LED_GLOW_EFFECT_LARGE = UIAPE_CONFIG.LED_GLOW_EFFECT_LARGE; // Enables glow effect for large text/digits, which might annoy users.
const LED_GLOW_EFFECT_SMALL = UIAPE_CONFIG.LED_GLOW_EFFECT_SMALL; // Enables glow effect for small text/digits, which might annoy users.
const LED_GLOW_EFFECT_RDSPS = UIAPE_CONFIG.LED_GLOW_EFFECT_RDSPS; // Enables glow effect for RDS PS text, which might annoy users.
const LED_GLOW_EFFECT_FREQ = UIAPE_CONFIG.LED_GLOW_EFFECT_FREQ;  // Enables glow effect for frequency digits, which might annoy users.

// Dims the PI CODE font for incomplete PI decodes. Read live via getUiapPanelConfig()
// in checkPiForQuestionMark() instead of snapshotted here, so it can apply instantly.
// Sets the hex color code for stereo icon.
// Use a 6-digit hex color, e.g. "#FF0000" for bright red, "auto" for the theme accent, or "default" for native styling.
const STEREO_ICON_COLOR = UIAPE_CONFIG.STEREO_ICON_COLOR;
const STEREO_ICON_COLOR_OFF = UIAPE_CONFIG.STEREO_ICON_COLOR_OFF;
// Panel edge style effect.
// Valid options are 0 (disabled), 1, 2, or 3. Read live from cfg inside uiapeBuildLiveCss()
// instead of snapshotted here - see UIAPE_LIVE_CSS_KEYS.
// #################### RDS ICON STYLING (Highpoint2000) #################### //

// Enables RDS icons.
const RDS_ICON_STYLE = UIAPE_CONFIG.RDS_ICON_STYLE;
const RDS_ICON_STYLE_MOBILE = UIAPE_CONFIG.RDS_ICON_STYLE_MOBILE;
const METRICS_MONITOR_PLUGIN_IS_INSTALLED = UIAPE_CONFIG.METRICS_MONITOR_PLUGIN_IS_INSTALLED;
const IS_VISUALEQ_PLUGIN_ENABLED = UIAPE_CONFIG.IS_VISUALEQ_PLUGIN_ENABLED;

// RDS icon style presets. See below to configure user preset.
// Options: 0 = user-defined, 1 = preset 1, 2 = preset 2, 3 = preset 3.
const RDS_ICON_PRESET = UIAPE_CONFIG.RDS_ICON_PRESET;
// RDS/stereo icon sizes are read live from config in uiapeBuildLiveCss.

function uiapeCssScaleValue(value, factor = 1) {
  const raw = typeof value === "string" ? value.trim() : value;
  let numeric = 1;

  if (typeof raw === "string" && raw.endsWith("%")) {
    numeric = parseFloat(raw) / 100;
  } else {
    numeric = parseFloat(raw);
  }

  if (!Number.isFinite(numeric) || numeric <= 0) numeric = 1;
  const scaled = numeric * factor;
  return Number(scaled.toFixed(4)).toString();
}

// Resolves the active RDS_ICON_STYLE_PRESETS entry from a (possibly live) config
// object. Kept separate from the RDS/Stereo icons block's own preset resolution
// below so it stays reachable even when that block hasn't executed (feature off).
function uiapeGetActiveRdsPreset(cfg) {
  const presets = cfg.RDS_ICON_STYLE_PRESETS || {};
  const preset = cfg.RDS_ICON_PRESET === 0 ? presets.user : (presets[cfg.RDS_ICON_PRESET] || presets[1]);
  return preset || {};
}

function uiapeResolveLiveRdsIconHeight(preset, prefix, ptyHeight) {
  const mode = preset[`${prefix}_HEIGHT_MODE`];
  const customHeight = Number(preset[`${prefix}_HEIGHT`]);
  return mode === "CUSTOM" && Number.isFinite(customHeight) ? customHeight : ptyHeight;
}

// RDS/stereo icon CSS scales are computed live in uiapeBuildLiveCss (rdsCssScale/stereoCssScale).
// Stereo icon circle thickness. Read live via cfg.STEREO_ICON_WIDTH in uiapeBuildLiveCss.
// Uses "MS" letters instead of icons for dimmed Music/Speech icons.
const RDS_ICON_STYLE_MS_OFF_AS_LETTERS = UIAPE_CONFIG.RDS_ICON_STYLE_MS_OFF_AS_LETTERS;
// Select RDS indicator icon type: 1, or 2.
const RDS_INDICATOR_ICON_TYPE = UIAPE_CONFIG.RDS_INDICATOR_ICON_TYPE;
// Use a 6-digit hex color, e.g. "#FF0000" for bright red, or "auto" for the theme accent (not 100% accurate).
const RDS_INDICATOR_ICON_COLOR = UIAPE_CONFIG.RDS_INDICATOR_ICON_COLOR;
// Use a 6-digit hex color, e.g. "#FF0000" for bright red (not 100% accurate).
const RDS_INDICATOR_ICON_COLOR_OFF = UIAPE_CONFIG.RDS_INDICATOR_ICON_COLOR_OFF;
// RDS glow intensity.
const RDS_INDICATOR_ICON_GLOW_INTENSITY = UIAPE_CONFIG.RDS_INDICATOR_ICON_GLOW_INTENSITY;
// Optional custom colors for TP / TA image indicators.
// Empty string keeps the native icon color. Use "auto" or "#RRGGBB" to override.
const TP_INDICATOR_ICON_COLOR = UIAPE_CONFIG.TP_INDICATOR_ICON_COLOR;
const TP_INDICATOR_ICON_COLOR_OFF = UIAPE_CONFIG.TP_INDICATOR_ICON_COLOR_OFF;
const TA_INDICATOR_ICON_COLOR = UIAPE_CONFIG.TA_INDICATOR_ICON_COLOR;
const TA_INDICATOR_ICON_COLOR_OFF = UIAPE_CONFIG.TA_INDICATOR_ICON_COLOR_OFF;
// Optional custom colors for PTY and Music/Speech text indicators.
// Defaults preserve the current white/gray behavior. Use "auto" or "#RRGGBB" to override.
const PTY_INDICATOR_COLOR = UIAPE_CONFIG.PTY_INDICATOR_COLOR;
const PTY_INDICATOR_COLOR_OFF = UIAPE_CONFIG.PTY_INDICATOR_COLOR_OFF;
const MS_INDICATOR_COLOR = UIAPE_CONFIG.MS_INDICATOR_COLOR;
const MS_INDICATOR_COLOR_OFF = UIAPE_CONFIG.MS_INDICATOR_COLOR_OFF;
const ACTIVE_STEREO_ICON_COLOR = resolveIconColor(STEREO_ICON_COLOR);
const ACTIVE_RDS_INDICATOR_ICON_COLOR = resolveIconColor(RDS_INDICATOR_ICON_COLOR);
const ACTIVE_RDS_INDICATOR_ICON_COLOR_OFF = resolveIconColor(RDS_INDICATOR_ICON_COLOR_OFF, "");

function refreshAutoIconColorVars(cfg) {
  const c = cfg || getUiapPanelConfig();
  const root = document.documentElement;
  root.style.setProperty("--uiape-stereo-icon-color", resolveIconColor(c.STEREO_ICON_COLOR));
  root.style.setProperty("--uiape-stereo-icon-color-off", c.STEREO_ICON_COLOR_OFF === "" ? "#696969" : resolveIconColor(c.STEREO_ICON_COLOR_OFF, ""));
}

refreshAutoIconColorVars();

// Removes RDS indicator icon. Could be useful when using the multipath icon with Metrics Monitor plugin.
const RDS_ICON_STYLE_REMOVE_RDS_ICON = UIAPE_CONFIG.RDS_ICON_STYLE_REMOVE_RDS_ICON;
// Bandwidth update interval in milliseconds.
const BANDWIDTH_UPDATE_INTERVAL = UIAPE_CONFIG.BANDWIDTH_UPDATE_INTERVAL;
// Enables glow effect for RDS icons.
const LED_GLOW_EFFECT_ICONS_RDS_ICON_STYLE_PTY = UIAPE_CONFIG.LED_GLOW_EFFECT_ICONS_RDS_ICON_STYLE_PTY;
const LED_GLOW_EFFECT_ICONS_RDS_ICON_STYLE_MS = UIAPE_CONFIG.LED_GLOW_EFFECT_ICONS_RDS_ICON_STYLE_MS;
const LED_GLOW_EFFECT_ICONS_BANDWIDTH = UIAPE_CONFIG.LED_GLOW_EFFECT_ICONS_BANDWIDTH;
// Enables glow effect for Metrics Monitor plugin icons.
const LED_GLOW_EFFECT_ICONS_METRICS_MONITOR_PLUGIN = UIAPE_CONFIG.LED_GLOW_EFFECT_ICONS_METRICS_MONITOR_PLUGIN;
// Replaces Metrics Monitor plugin MPX indicator icon with stereo icon.
const REPLACE_MPX_LOGO_WITH_STEREO_LOGO_METRICS_MONITOR_PLUGIN = UIAPE_CONFIG.REPLACE_MPX_LOGO_WITH_STEREO_LOGO_METRICS_MONITOR_PLUGIN;
const APPLY_STEREO_ICON_GLOW_WITH_MISSING_RDS = UIAPE_CONFIG.APPLY_STEREO_ICON_GLOW_WITH_MISSING_RDS;
// RDS icon order configuration.

//
//   PTY    = Programme Type
//   MS     = Music/Speech indicator
//   ECC    = Extended Country Code
//   STEREO = Stereo/Mono indicator
//   TP     = Traffic Programme
//   TA     = Traffic Announcement
//   RDS    = RDS signal indicator
//   BW     = Current bandwidth
//

// === Preset definitions ===
// Resolved live from config via uiapeGetActiveRdsPreset() (near uiapeBuildLiveCss),
// not a load-time snapshot, so preset edits/switches don't need a reload.
// #################### PLUGIN BUTTON ORDER #################### //

// SORT_PLUGIN_BUTTONS / PLUGINS_USER_ORDER / PLUGIN_BUTTON_CUSTOM_MAP are read live from cfg
// inside uiapeBuildLiveCss() instead of snapshotted here - see UIAPE_LIVE_CSS_KEYS.
// Set the plugin order by specifying the corresponding numbers from below.
// Example format: "1, 2, 11, 4" - this defines the display order.
// Mapping of plugin IDs to their corresponding button element IDs.
// Use these numbers in 'PLUGINS_USER_ORDER' to control which plugins appear and in what order.
//
//    1:       Spectrum
//    2:       Record
//    3:       RDS Logger
//    4:       More info
//    5:       Livemap
//    6:       Screenshot
//    7:       ES Alert
//    8:       ES Follow
//    9:       GPS
//   10:       URDS
//   11:       DX Alert
//   12:       STREAM
//   13:       NYE Countdown
//   14:       MPX/Signal
//   15:       RDS Expert
//   16:       Tropo
//   17:       DX Logbook
//   18:       RDS Decoder
//   19:       Scatter (Meteor)
//   20:       LightFX
//   21:       SysInfo
//   22:       Scatter (Airplane)
//   23:       Denoiser
//   24:       Mapviewer
//   25:       Validator
//   26:       FM Scale
//   27:       My Logs
//   28:       Video
//   29:       DX-Watchdog
//   30:       Analog Scale
//   31:       Custom Links (1)
//   32:       Custom Links (2)
//   33:       Custom Links (3)
//

// #################### CONSOLE LOG SETTINGS #################### //

// This will suppress browser console log entries for the website. Warnings and errors are still shown.
// Most users can ignore this setting.
const HIDE_CONSOLE_LOGS = UIAPE_CONFIG.HIDE_CONSOLE_LOGS;
// ########################################################################################################################

















if (ENABLE_PLUGIN) {

let styleFixesElement = document.createElement('style');
styleFixesElement.textContent = `
/*** BUG FIXES & REGRESSIONS ***/

/* Invisible text cursor for input with Firefox */
input[readonly] {
    caret-color: transparent;
    user-select: none;
}

/* Admin panel (User Management) */
.wrapper-outer #wrapper.setup-wrapper.admin-wrapper.panel-full .panel-full #users.panel-full input#banlist-add-ip.input-text.w-100,
.wrapper-outer #wrapper.setup-wrapper.admin-wrapper.panel-full .panel-full #users.panel-full input#banlist-add-reason.input-text.w-150 {
    width: 100% !important;
}
`;

document.head.appendChild(styleFixesElement);

}

if (ENABLE_PLUGIN && window.location.pathname !== '/setup') {


// #################### UI ADD-ON PACK ENHANCED CONFIG PANEL #################### //

function uiapeIsCurrentUserAdmin() {
  return uiapeDetectAdminSession();
}

function uiapeCanShowConfigPanel() {
  // Gear/panel is visible to everyone. Admin edits the server/shared profile; users edit local overrides.
  return true;
}

function createUiapConfigLauncher() {
    if (!uiapeCanShowConfigPanel()) {
      document.getElementById("uiape-config-gear")?.remove();
      document.getElementById("uiape-config-panel")?.remove();
      return;
    }
    const existingGear = document.getElementById("uiape-config-gear");
    const existingPanel = document.getElementById("uiape-config-panel");
    if (existingGear && existingPanel && existingGear.isConnected && existingPanel.isConnected) return;
    if (existingGear && !existingGear.isConnected) existingGear.remove();
    if (existingPanel && !existingPanel.isConnected) existingPanel.remove();

    let style = document.getElementById("uiape-config-panel-style");
    if (!style) {
    style = document.createElement("style");
    style.id = "uiape-config-panel-style";
    document.head.appendChild(style);
    }
    style.textContent = `
      #uiape-config-gear {
        position: absolute !important;
        right: 6px !important;
        top: 6px !important;
        left: auto !important;
        bottom: auto !important;
        transform: none !important;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        border: 1px solid color-mix(in srgb, var(--color-4, #888) 62%, transparent);
        background: var(--color-2);
        color: var(--color-4, #fff);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        box-shadow: 0 2px 10px rgba(0,0,0,.26);
        z-index: 899 !important;
        pointer-events: none !important;
        visibility: visible !important;
        opacity: 0 !important;
        transition: opacity .16s ease, filter .16s ease;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        line-height: 1;
        padding: 0;
      }

      #signalPanel.uiape-config-host:hover > #uiape-config-gear,
      .uiape-config-host:hover > #uiape-config-gear,
      .uiape-config-host.uiape-config-open > #uiape-config-gear {
        opacity: 1 !important;
        pointer-events: auto !important;
      }

      #uiape-config-gear:hover {
        filter: brightness(1.15);
      }

      .uiape-config-fallback-host > #uiape-config-gear {
        position: fixed !important;
        right: 60px !important;
        top: 176px !important;
        opacity: 0.8 !important;
        pointer-events: auto !important;
        z-index: 899 !important;
      }

      #uiape-config-panel {
        position: fixed;
        right: 12px;
        bottom: 12px;
        top: auto;
        left: auto;
        width: min(420px, calc(100vw - 24px));
        max-height: min(620px, calc(100vh - 70px));
        overflow: hidden;
        border-radius: 16px;
        border: 1px solid color-mix(in srgb, var(--color-main-bright, var(--color-4)) 42%, var(--color-2));
        background: var(--color-1, #111);
        color: var(--color-text, var(--color-4));
        backdrop-filter: none;
        -webkit-backdrop-filter: none;
        box-shadow:
          0 12px 36px rgba(0,0,0,.45),
          inset 0 1px 0 color-mix(in srgb, var(--color-4) 14%, transparent);
        z-index: 900 !important;
        display: none;
        font-size: 13px;
        text-align: left !important;
        box-sizing: border-box;
        touch-action: none;
      }

      #uiape-config-panel.uiape-open {
        display: flex;
        flex-direction: column;
      }

      #signalPanel.uiape-config-host,
      .uiape-config-host {
        position: relative !important;
        z-index: 2 !important;
        isolation: auto !important;
      }

      body.uiape-native-modal-open #signalPanel.uiape-config-host,
      body.uiape-native-modal-open .uiape-config-host {
        z-index: 1 !important;
      }

      #uiape-config-panel,
      #uiape-config-panel .uiape-config-section,
      #uiape-config-panel .uiape-config-section-title,
      #uiape-config-panel .uiape-config-label,
      #uiape-config-panel .uiape-config-label strong,
      #uiape-config-panel .uiape-config-label span,
      #uiape-config-panel .uiape-config-muted,
      #uiape-config-panel .uiape-preset-summary,
      #uiape-config-panel .uiape-plugin-map,
      #uiape-config-panel input,
      #uiape-config-panel textarea,
      #uiape-config-panel select {
        text-align: left !important;
      }

      #uiape-config-panel .uiape-config-close,
      #uiape-config-panel .uiape-plugin-order-add,
      #uiape-config-panel .uiape-plugin-order-remove,
      #uiape-config-panel .uiape-mini-button,
      #uiape-config-panel .uiape-config-footer button {
        text-align: center !important;
      }

      .uiape-config-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        min-height: 36px;
        padding: 8px 10px 8px 12px;
        border-bottom: 1px solid color-mix(in srgb, var(--color-4, #888) 26%, transparent);
        background:
          linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.02)),
          color-mix(in srgb, var(--color-5, #222) 86%, var(--color-1, #111));
        cursor: move;
        user-select: none;
      }

      .uiape-config-header > div:first-child {
        min-width: 0;
        flex: 1 1 auto;
      }

      .uiape-config-title {
        font-weight: 700;
        letter-spacing: .02em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 1.15;
      }

      .uiape-config-header .uiape-config-muted {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 11px;
        line-height: 1.2;
      }

      .uiape-config-close {
        flex: 0 0 24px;
        width: 24px;
        height: 24px;
        border: 1px solid color-mix(in srgb, var(--color-4, #888) 22%, transparent);
        border-radius: 50%;
        background: color-mix(in srgb, var(--color-3) 70%, var(--color-2));
        color: inherit;
        cursor: pointer;
        font-size: 14px;
        line-height: 1;
        padding: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .uiape-config-close:hover {
        background: color-mix(in srgb, var(--color-4) 20%, var(--color-3));
      }

      .uiape-config-body {
        padding: 10px 12px;
        overflow: auto;
        flex: 1 1 auto;
        min-height: 0;
      }

      .uiape-config-section {
        border: 1px solid color-mix(in srgb, var(--color-4, #888) 24%, transparent);
        border-radius: 12px;
        padding: 10px;
        margin-bottom: 10px;
        background: color-mix(in srgb, var(--color-2, #222) 86%, var(--color-1, #111));
        backdrop-filter: none;
        -webkit-backdrop-filter: none;
      }

      .uiape-config-section-title {
        font-weight: 700;
        margin-bottom: 6px;
        color: var(--color-4, #fff);
      }

      .uiape-config-muted {
        opacity: .76;
        line-height: 1.45;
      }

      .uiape-config-row {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: center;
        text-align: left !important;
        gap: 10px;
        padding: 7px 0;
        border-top: 1px solid color-mix(in srgb, var(--color-4, #888) 12%, transparent);
      }

      .uiape-config-row:first-of-type {
        border-top: 0;
      }

      .uiape-config-row-admin-only {
        margin: 0 -10px;
        padding-left: 10px;
        padding-right: 10px;
        border-radius: 6px;
        background: color-mix(in srgb, black 16%, transparent);
      }

      .uiape-config-label {
        min-width: 0;
      }

      .uiape-config-label strong {
        display: block;
        font-size: 12px;
        line-height: 1.2;
      }

      .uiape-config-label span {
        display: block;
        margin-top: 2px;
        font-size: 11px;
        opacity: .68;
        line-height: 1.25;
      }

      .uiape-admin-only-toggle {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: 5px;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: .03em;
        opacity: .7;
        cursor: pointer;
        user-select: none;
      }

      .uiape-admin-only-toggle input[type="checkbox"] {
        width: 12px;
        height: 12px;
        margin: 0;
        accent-color: var(--color-main-bright, var(--color-4));
      }

      .uiape-config-control {
        min-width: 116px;
        display: flex;
        justify-content: flex-end;
        text-align: left !important;
      }

      .uiape-config-control input[type="text"],
      .uiape-config-control input[type="number"],
      .uiape-config-control select {
        width: 116px;
        box-sizing: border-box;
        border: 1px solid color-mix(in srgb, var(--color-4, #888) 32%, transparent);
        border-radius: 8px;
        background: color-mix(in srgb, var(--color-2, #222) 74%, black);
        color: inherit;
        padding: 5px 7px;
        font-size: 12px;
      }

      .uiape-config-control input[type="checkbox"] {
        width: 18px;
        height: 18px;
        accent-color: var(--color-main-bright, var(--color-4));
      }



      .uiape-config-control-wide {
        display: block;
      }

      .uiape-config-control-wide .uiape-config-control {
        margin-top: 7px;
        justify-content: stretch;
      }

      .uiape-config-control textarea,
      .uiape-config-control-wide textarea {
        width: 100%;
        height: 30px;
        min-height: 30px;
        max-height: 160px;
        box-sizing: border-box;
        border: 1px solid color-mix(in srgb, var(--color-4, #888) 32%, transparent);
        border-radius: 8px;
        background: color-mix(in srgb, var(--color-2, #222) 74%, black);
        color: inherit;
        padding: 4px 7px;
        font-size: 12px;
        line-height: 18px;
        resize: vertical;
      }



      #uiape-config-panel textarea[data-uiape-key="PLUGINS_USER_ORDER"] {
        height: 50px !important;
        min-height: 50px !important;
        max-height: 180px !important;
        resize: vertical !important;
      }

      #uiape-config-panel code {
        font-family: inherit !important;
        font-size: inherit !important;
        font-weight: 700 !important;
        color: var(--color-main-bright, var(--color-4)) !important;
        background: transparent !important;
        padding: 0 !important;
      }

      .uiape-color-combo {
        display: flex;
        gap: 5px;
        align-items: center;
        justify-content: flex-end;
      }

      .uiape-color-combo select {
        width: 88px !important;
      }

      .uiape-color-combo input[type="color"] {
        width: 30px;
        height: 28px;
        padding: 1px;
        border: 1px solid color-mix(in srgb, var(--color-4, #888) 32%, transparent);
        border-radius: 8px;
        background: transparent;
        cursor: pointer;
      }

      .uiape-preset-summary {
        margin: 7px 0 9px;
        padding: 8px;
        border-radius: 10px;
        background: color-mix(in srgb, var(--color-4, #fff) 8%, transparent);
        font-size: 11px;
        line-height: 1.45;
      }

      .uiape-preset-summary code,
      .uiape-plugin-map code {
        opacity: .9;
      }

      .uiape-plugin-map {
        margin-top: 8px;
        columns: 2;
        column-gap: 18px;
        font-size: 11px;
        line-height: 1.55;
        opacity: .86;
      }

      .uiape-plugin-map > div {
        break-inside: avoid;
        margin-bottom: 3px;
      }

      .uiape-plugin-order-add,
      .uiape-plugin-order-remove {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 16px !important;
        height: 16px !important;
        min-width: 16px !important;
        max-width: 16px !important;
        margin: 0 0 0 4px !important;
        padding: 0 !important;
        border-radius: 4px !important;
        font-size: 10px !important;
        line-height: 1 !important;
        vertical-align: 1px;
        box-sizing: border-box !important;
        white-space: nowrap !important;
      }

      .uiape-plugin-edit-map {
        margin-top: 8px;
        display: grid;
        gap: 4px;
      }

      .uiape-plugin-edit-row {
        display: inline-grid;
        grid-template-columns: 30px 118px 154px 18px 18px;
        gap: 4px;
        align-items: center;
        width: max-content;
        max-width: 100%;
      }

      .uiape-plugin-edit-row input {
        min-width: 0;
        width: 100%;
        box-sizing: border-box;
        border: 1px solid color-mix(in srgb, var(--color-4, #888) 32%, transparent);
        border-radius: 6px;
        background: color-mix(in srgb, var(--color-2, #222) 74%, black);
        color: inherit;
        padding: 3px 6px;
        font-size: 11px;
        height: 30px !important;
        min-height: 30px !important;
        max-height: 30px !important;
        line-height: 16px !important;
      }

      .uiape-plugin-edit-row input {
        height: 30px !important;
        min-height: 30px !important;
        max-height: 30px !important;
        line-height: 16px !important;
        padding-top: 2px !important;
        padding-bottom: 2px !important;
      }

      .uiape-plugin-edit-head {
        opacity: .68;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: .04em;
      }

      .uiape-mini-button {
        border: 1px solid color-mix(in srgb, var(--color-4, #888) 35%, transparent);
        border-radius: 8px;
        background: color-mix(in srgb, var(--color-3) 72%, var(--color-2));
        color: inherit;
        padding: 5px 8px;
        cursor: pointer;
        font-size: 11px;
        margin-top: 7px;
      }

      .uiape-config-warning {
        margin-top: 8px;
        padding: 7px 8px;
        border-radius: 9px;
        background: color-mix(in srgb, var(--color-4, #fff) 10%, transparent);
        font-size: 11px;
        opacity: .82;
      }

      .uiape-config-footer {
        display: flex;
        gap: 6px;
        justify-content: flex-end;
        align-items: center;
        flex-wrap: nowrap;
        padding: 9px 12px;
        border-top: 1px solid color-mix(in srgb, var(--color-4, #888) 30%, transparent);
        background: color-mix(in srgb, var(--color-5, #222) 82%, var(--color-1, #111));
        flex: 0 0 auto;
        position: sticky;
        bottom: 0;
        z-index: 2;
      }

      .uiape-config-footer button {
        border: 1px solid color-mix(in srgb, var(--color-4, #888) 45%, transparent);
        border-radius: 10px;
        background: color-mix(in srgb, var(--color-3) 72%, var(--color-2));
        color: inherit;
        padding: 6px 8px;
        cursor: pointer;
        white-space: nowrap;
        flex: 0 0 auto;
        box-sizing: border-box;
      }

      .uiape-config-footer button[data-uiape-action="save-all"] {
        min-width: 118px;
        max-width: 140px;
        padding-left: 8px;
        padding-right: 8px;
      }

      .uiape-config-footer button[data-uiape-action="reload"],
      .uiape-config-footer button[data-uiape-action="reset"] {
        min-width: 58px;
        max-width: 70px;
      }

      .uiape-config-footer button:hover {
        filter: brightness(1.12);
      }

      .uiape-config-save-status {
        margin-right: 6px;
        align-self: center;
        font-size: 11px;
        font-weight: 700;
        color: #f7fbff;
        text-shadow:
            0 1px 2px rgba(0,0,0,.72),
            0 0 6px rgba(255,255,255,.32);
        opacity: 1;
        white-space: nowrap;
      }

      #uiape-config-panel.uiape-config-dirty .uiape-config-save-status {
        opacity: 1;
      }

      @media (max-width: 720px) {
        #uiape-config-panel {
          right: 10px;
          bottom: 10px;
          top: auto;
          width: min(360px, calc(100vw - 20px));
          max-height: calc(100vh - 64px);
        }
      }
    `;

    function findUiapHost() {
        //return null;
        const candidates = [
            document.getElementById("signalPanel"),
            document.querySelector("#signalPanel"),
            document.querySelector("#signalPanel #signal-icons")?.closest("#signalPanel"),
            document.getElementById("flags-container-desktop"),
            document.querySelector(".wrapper-outer #wrapper #flags-container-desktop")
        ].filter(Boolean);

        for (const el of candidates) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) return el;
        }

        return null;
    }

    function getUiapFallbackHost() {
        let fallback = document.getElementById("uiape-config-fallback-host");
        if (!fallback) {
          fallback = document.createElement("div");
          fallback.id = "uiape-config-fallback-host";
          fallback.className = "uiape-config-fallback-host uiape-config-host";
          document.body.appendChild(fallback);
        }
        return fallback;
    }

    function attachLauncher() {
        let host = findUiapHost();
        const usingFallbackHost = !host;
        if (!host) host = getUiapFallbackHost();

        const staleGear = document.getElementById("uiape-config-gear");
        const stalePanel = document.getElementById("uiape-config-panel");
        if (staleGear) staleGear.remove();
        if (stalePanel) stalePanel.remove();

        host.classList.add("uiape-config-host");
        host.classList.toggle("uiape-config-fallback-host", usingFallbackHost);

        const gear = document.createElement("button");
        gear.id = "uiape-config-gear";
        gear.type = "button";
        gear.title = "UI Add-on settings";
        gear.textContent = "\u2699";

        const panel = document.createElement("div");
        panel.id = "uiape-config-panel";
        const isUiapAdmin = uiapeIsCurrentUserAdmin();
        panel.innerHTML = `
          <div class="uiape-config-header">
            <div>
              <div class="uiape-config-title">UI Add-ons</div>
              <div class="uiape-config-muted">Configuration panel \u00B7 v${pluginVersion}</div>
            </div>
            <button type="button" class="uiape-config-close" aria-label="Close">\u2715</button>
          </div>
          <div class="uiape-config-body">
            <div class="uiape-config-section">
              <div class="uiape-config-section-title">Core / General Settings</div>
              <div data-uiape-controls="core"></div>
              <!--<div class="uiape-config-warning">Changes are kept as a draft until you press <strong>Save All & Reload</strong>. Admin saves go to <code>plugins_configs/UIAddonPackEnhanced.json</code>; user saves stay as browser-local overrides.</div>-->
            </div>
            <div class="uiape-config-section">
              <div class="uiape-config-section-title">Mobile / Sidebar / Users</div>
              <div data-uiape-controls="mobile"></div>
            </div>
            <div class="uiape-config-section">
              <div class="uiape-config-section-title">Tuning Settings</div>
              <div data-uiape-controls="tuning"></div>
            </div>
            <div class="uiape-config-section">
              <div class="uiape-config-section-title">Visual Styling</div>
              <div data-uiape-controls="visual"></div>
            </div>
            <div class="uiape-config-section">
              <div class="uiape-config-section-title">RDS / Stereo Icons</div>
              <div data-uiape-controls="rds"></div>
            </div>
            <div class="uiape-config-section">
              <div class="uiape-config-section-title">Plugin Buttons</div>
              <div data-uiape-controls="plugins"></div>
            </div>
            <div class="uiape-config-section">
              <div class="uiape-config-section-title">Console Logs</div>
              <div data-uiape-controls="console"></div>
            </div>
          </div>
          <div class="uiape-config-reload-note" data-uiape-reload-note hidden style="padding:8px 12px;font-size:12px;line-height:1.4;color:var(--color-4);background:color-mix(in srgb, var(--color-3) 55%, transparent);border-top:1px solid color-mix(in srgb, var(--color-4) 20%, transparent);">Some changed settings only take effect after a page reload. Saving now will ask to reload.</div>
          <div class="uiape-config-footer">
            <span class="uiape-config-save-status" data-uiape-save-status>Saved</span>
            <button type="button" data-uiape-action="save-all">Save</button>
            <button type="button" data-uiape-action="reload">Reload</button>
            <button type="button" data-uiape-action="reset">Reset</button>
          </div>
        `;

        host.appendChild(gear);
        document.body.appendChild(panel);

        function clampUiapPanelToViewport() {
          if (!panel.classList.contains("uiape-open")) return;
          const margin = 8;
          panel.style.maxHeight = `${Math.max(260, window.innerHeight - margin * 2)}px`;
          const rect = panel.getBoundingClientRect();
          const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
          const maxTop = Math.max(margin, window.innerHeight - rect.height - margin);
          if (rect.left < margin || rect.left > maxLeft || rect.top < margin || rect.top > maxTop) {
            const nextLeft = Math.max(margin, Math.min(rect.left, maxLeft));
            const nextTop = Math.max(margin, Math.min(rect.top, maxTop));
            panel.style.left = `${nextLeft}px`;
            panel.style.top = `${nextTop}px`;
            panel.style.right = "auto";
            panel.style.bottom = "auto";
          }
        }

        function resetUiapPanelPositionIfUnset() {
          if (!panel.style.left && !panel.style.top) {
            panel.style.right = "12px";
            panel.style.bottom = "12px";
            panel.style.left = "auto";
            panel.style.top = "auto";
          }
        }

        function togglePanel(force) {
          const open = typeof force === "boolean" ? force : !panel.classList.contains("uiape-open");
          panel.classList.toggle("uiape-open", open);
          host.classList.toggle("uiape-config-open", open);
          if (open) {
            resetUiapPanelPositionIfUnset();
            requestAnimationFrame(clampUiapPanelToViewport);
          }
        }

        const openFromGear = (event) => {
          event.preventDefault();
          event.stopPropagation();
          togglePanel();
        };

        gear.addEventListener("click", openFromGear, true);

        ["click", "pointerdown", "mousedown", "mouseup"].forEach(type => {
          panel.addEventListener(type, (event) => event.stopPropagation());
        });

        panel.querySelector(".uiape-config-close").addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          // Discard unsaved changes: restore the saved baseline and undo any live preview.
          if (UIAPE_CONFIG_DIRTY && UIAPE_SAVED_BASELINE) {
            UIAPE_CONFIG = JSON.parse(JSON.stringify(UIAPE_SAVED_BASELINE));
            UIAPE_RELOAD_DIRTY_KEYS.clear();
            uiapeRefreshLiveCss();
            uiapeUpdateReloadNotice();
            uiapeRenderAllControls();
            markUiapConfigClean();
          }
          togglePanel(false);
        });

        function makeUiapPanelDraggable() {
          const header = panel.querySelector(".uiape-config-header");
          if (!header || header.dataset.uiapeDragBound === "true") return;
          header.dataset.uiapeDragBound = "true";

          let dragging = false;
          let startX = 0;
          let startY = 0;
          let startLeft = 0;
          let startTop = 0;

          const clamp = (value, min, max) => Math.max(min, Math.min(max < min ? min : max, value));

          header.addEventListener("pointerdown", (event) => {
            if (event.button !== 0 || event.target.closest("button, input, select, textarea")) return;
            panel.style.maxHeight = `${Math.max(260, window.innerHeight - 16)}px`;
            const rect = panel.getBoundingClientRect();
            dragging = true;
            startX = event.clientX;
            startY = event.clientY;
            startLeft = rect.left;
            startTop = rect.top;
            panel.style.left = `${rect.left}px`;
            panel.style.top = `${rect.top}px`;
            panel.style.right = "auto";
            panel.style.bottom = "auto";
            panel.classList.add("uiape-dragging");
            header.setPointerCapture?.(event.pointerId);
            event.preventDefault();
          });

          header.addEventListener("pointermove", (event) => {
            if (!dragging) return;
            const rect = panel.getBoundingClientRect();
            const nextLeft = clamp(startLeft + event.clientX - startX, 6, window.innerWidth - rect.width - 6);
            const nextTop = clamp(startTop + event.clientY - startY, 6, window.innerHeight - rect.height - 6);
            panel.style.left = `${nextLeft}px`;
            panel.style.top = `${nextTop}px`;
          });

          const stopDrag = (event) => {
            if (!dragging) return;
            dragging = false;
            panel.classList.remove("uiape-dragging");
            header.releasePointerCapture?.(event.pointerId);
            clampUiapPanelToViewport();
          };

          header.addEventListener("pointerup", stopDrag);
          header.addEventListener("pointercancel", stopDrag);
        }

        makeUiapPanelDraggable();
        window.addEventListener("resize", clampUiapPanelToViewport);

        function updateUiapNativeModalState() {
          const visibleModal = Array.from(document.querySelectorAll(".modal, .modal-panel, #myModal")).some(el => {
            if (!el || el.contains(panel)) return false;
            const st = getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return st.display !== "none" && st.visibility !== "hidden" && Number(st.opacity || 1) !== 0 && (rect.width > 0 || rect.height > 0 || el.id === "myModal");
          });
          document.body.classList.toggle("uiape-native-modal-open", visibleModal);
        }

        updateUiapNativeModalState();
        const nativeModalObserver = new MutationObserver(updateUiapNativeModalState);
        nativeModalObserver.observe(document.body, { attributes: true, childList: true, subtree: true, attributeFilter: ["class", "style"] });

        const UIAPE_COLOR_KEYS = new Set([
          "STEREO_ICON_COLOR",
          "STEREO_ICON_COLOR_OFF",
          "RDS_INDICATOR_ICON_COLOR",
          "RDS_INDICATOR_ICON_COLOR_OFF",
          "TP_INDICATOR_ICON_COLOR",
          "TP_INDICATOR_ICON_COLOR_OFF",
          "TA_INDICATOR_ICON_COLOR",
          "TA_INDICATOR_ICON_COLOR_OFF",
          "PTY_INDICATOR_COLOR",
          "PTY_INDICATOR_COLOR_OFF",
          "MS_INDICATOR_COLOR",
          "MS_INDICATOR_COLOR_OFF"
        ]);

        const UIAPE_PLUGIN_BUTTON_DEFAULTS = [
          [1, "Spectrum", "spectrum-graph-button"], [2, "Record", "audio-record-button"], [3, "RDS Logger", "Log-on-off"],
          [4, "More info", "extended-desc-button"], [5, "Livemap", "LIVEMAP-on-off"], [6, "Screenshot", "Screenshot"],
          [7, "ES Alert", "ES-ALERT-on-off"], [8, "ES Follow", "ES-FOLLOW-on-off"], [9, "GPS", "GPS-on-off"],
          [10, "URDS", "URDSupload-on-off"], [11, "DX Alert", "DX-Alert-on-off"], [12, "STREAM", "Stream-on-off"],
          [13, "NYE Countdown", "countdown-button"], [14, "MPX/Signal", "mpx-signal-toggle-button"], [15, "RDS Expert", "rds-expert-button"],
          [16, "Tropo", "TROPO-BTN"], [17, "DX Logbook", "visual-logbook-map"], [18, "RDS Decoder", "rdsm-btn"],
          [19, "Scatter (Meteor)", "METEORSCATTER-on-off"], [20, "LightFX", "lfx-header-btn"], [21, "SysInfo", "SysInfo-on-off"],
          [22, "Scatter (Airplane)", "AIRPLANESCATTER-on-off"], [23, "Denoiser", "Denoiser-on-off"], [24, "Mapviewer", "Mapviewer"],
          [25, "Validator", "URDSValidator"], [26, "FM Scale", "analog-scale-btn"], [27, "My Logs", "btn-mylogs-link"],
          [28, "Video", "social-record-btn"], [29, "DX-Watchdog", "btn-DX-Watchdog-link"],
          [30, "Analog Scale", "et-analog-scale-btn"], [31, "WebStats", "webstats-btn"],
          [32, "Custom Links (1)", "custom-links-btn-0"], [33, "Custom Links (2)", "custom-links-btn-1"], [34, "Custom Links (3)", "custom-links-btn-2"], [35, "Custom Plugin (35)", ""]
        ];

        const UIAPE_RDS_PRESET_FIELDS = [
          ["FIRST_ROW", "text", "First row", "Comma-separated icons. Example: PTY, MS"],
          ["SECOND_ROW", "text", "Second row", "Comma-separated icons. Example: TP, TA, ECC, STEREO, MS"],
          ["FIRST_ROW_GAP", "number", "First row gap", "Horizontal gap for first row."],
          ["SECOND_ROW_GAP", "number", "Second row gap", "Horizontal gap for second row."],
          ["TP_TA_GAP", "number", "TP / TA gap", "Special gap between TP and TA."],
          ["MS_TOP_PADDING", "number", "MS top padding", "Vertical alignment for MS."],
          ["STEREO_ICON_SPACING", "number", "Stereo icon spacing", "Spacing around Stereo icon."],
          ["PTY_HEIGHT", "number", "PTY height", "PTY indicator height."],
          ["MS_HEIGHT_MODE", "select", "MS height mode", "Follow PTY or use custom height.", [["PTY","Follow PTY"],["CUSTOM","Custom height"]]],
          ["MS_HEIGHT", "number", "MS custom height", "Used only when MS height mode is Custom."],
          ["TP_HEIGHT_MODE", "select", "TP height mode", "Follow PTY or use custom height.", [["PTY","Follow PTY"],["CUSTOM","Custom height"]]],
          ["TP_HEIGHT", "number", "TP custom height", "Used only when TP height mode is Custom."],
          ["TA_HEIGHT_MODE", "select", "TA height mode", "Follow PTY or use custom height.", [["PTY","Follow PTY"],["CUSTOM","Custom height"]]],
          ["TA_HEIGHT", "number", "TA custom height", "Used only when TA height mode is Custom."],
          ["BW_MARGIN_LEFT", "number", "BW margin left", "Bandwidth left offset."],
          ["GAP_ROW_1", "number", "Row 1 vertical gap", "Preset row 1 vertical adjustment."],
          ["GAP_ROW_2", "number", "Row 2 vertical gap", "Preset row 2 vertical adjustment."]
        ];

        // +++++++++++++++ STEP 3 +++++++++++++++ //

        const uiapeControlSections = {
          core: [
            ["CANVAS_FADE_EFFECT", "checkbox", "Canvas fade effect", "Fade in the signal graph on page load."],
            ["RELOAD_BAN_WARNING", "checkbox", "Reload ban warning", "Shows a warning message in the save/reload prompt."],
            ["RELOAD_BAN_WARNING_MESSAGE", "text", "Reload ban warning message", "Shown in the save/reload prompt when the warning above is enabled."],
            ["BUTTON_FM_LIST_MOD", "checkbox", "FMList button mod", "Move/reduce the FMLIST button."],
            ["BUTTON_FM_LIST_MOD_MINIMUM_HIDE_DISTANCE", "number", "FMList hide distance", "Minimum distance in km before FMLIST button appears."]
          ],
          mobile: [
            ["MOVE_MOBILE_TRAY_TO_TOP", "checkbox", "Move mobile tray to top (mobile)", "Relocates the native mobile tray."],
            ["HIDE_MOBILE_TRAY", "checkbox", "Hide mobile tray (mobile)", "Hides the mobile tray except play button."],
            ["MOBILE_STATUS_BAR", "checkbox", "Mobile status bar (mobile)", "Shows fixed mobile status bar."],
            ["MOBILE_STATUS_BAR_SHOW_USERS", "checkbox", "Status bar users (mobile)", "Moves online users icon to status bar."],
            ["MOBILE_STATUS_BAR_CONNECTION", "checkbox", "Status bar connection (mobile)", "Shows audio stream status icon."],
            ["SIDEBAR_ADDITIONS", "checkbox", "Sidebar additions", "Enables extra sidebar options."],
            ["SIDEBAR_ADDITIONS_EXPAND_CANVAS", "checkbox", "Sidebar expand canvas (enable Sidebar additions)", "Adds canvas height option."],
            ["SIDEBAR_ADDITIONS_HIDE_BACKGROUND", "checkbox", "Sidebar hide background (enable Sidebar additions)", "Adds background hide option."],
            ["MULTIPLE_USERS_NOTICE", "checkbox", "Multiple users notice", "Shows notice when more users are connected."],
            ["MULTIPLE_USERS_NOTICE_NATIVE_POPUP", "checkbox", "Native popup notice", "Uses native popup style for multiple users notice."],
            ["MULTIPLE_USERS_NOTICE_MESSAGE_1", "text", "Notice message 1", "First line of the multiple users notice."],
            ["MULTIPLE_USERS_NOTICE_MESSAGE_2", "text", "Notice message 2", "Second line of the multiple users notice."]
          ],
          tuning: [
            ["TUNE_DELAY_ENABLE", "checkbox", "Tune delay", "Enables delay for new users."],
            ["TUNE_DELAY", "number", "Tune delay seconds", "Delay before a new user can tune."],
            ["TUNE_DELAY_IF_MORE_THAN_ONE_USER", "number", "Delay with active users", "Delay when at least one user is already online."],
            ["DEFAULT_SIGNAL_UNIT", "select", "Default signal unit", "0 default, 1 dBf, 2 dB\u00B5V, 3 dBm.", [["0","Default"],["1","dBf"],["2","dB\u00B5V"],["3","dBm"]]]
          ],
          visual: [
            ["DISPLAY_CANVAS_IN_LANDSCAPE_MODE", "checkbox", "Canvas in landscape (mobile)", "Mobile landscape canvas display."],
            ["DISPLAY_CANVAS_IN_PORTRAIT_MODE", "checkbox", "Canvas in portrait (mobile)", "Mobile portrait canvas display."],
            ["ADD_PADDING_TO_PANELS", "checkbox", "Add panel padding", "Adds padding to RT/PTY/PS panels."],
            ["GLOW_EFFECT_ON_FREQUENCY_INPUT", "checkbox", "Frequency input glow", "Glow around frequency input while focused."],
            ["REDUCE_HALF_OPACITY", "checkbox", "Reduce half opacity", "Makes inactive elements dimmer."],
            ["INCREASE_TOP_RIGHT_ICON_SIZE", "checkbox", "Larger top-right icons", "Slightly increases top-right icon size."],
            ["REDUCE_SIDEBAR_BLUR", "checkbox", "Reduce sidebar blur", "Uses lighter blur when sidebar opens."],
            ["INCREASE_FREQUENCY_FONT_WEIGHT", "checkbox", "Bolder frequency", "Increases frequency font weight."],
            ["GRADIENT_BUTTONS", "checkbox", "Gradient buttons", "Adds gradient styling to buttons."],
            ["INCLUDE_SCANNER_BUTTONS", "checkbox", "Gradient includes scanner buttons", "Extends gradient styling to scanner controls."],
            ["LED_GLOW_EFFECT_ICONS", "checkbox", "Glow icons", "Glow effect for icon indicators."],
            ["LED_GLOW_EFFECT_LARGE", "checkbox", "Glow large text", "Glow effect for large text/digits."],
            ["LED_GLOW_EFFECT_SMALL", "checkbox", "Glow small text", "Glow effect for small text/digits."],
            ["LED_GLOW_EFFECT_RDSPS", "checkbox", "Glow RDS PS", "Glow effect for RDS PS text."],
            ["LED_GLOW_EFFECT_FREQ", "checkbox", "Glow frequency", "Glow effect for frequency digits."],
            ["DIM_INCOMPLETE_PI_CODE", "checkbox", "Dim incomplete PI", "Dims PI when it contains question marks."],
            ["PANEL_STYLE_EFFECT", "select", "Panel style effect", "Panel edge style preset.", [["0","Disabled"],["1","Style 1"],["2","Style 2"],["3","Style 3"]]],
            ["PANEL_STYLE_EFFECT_SIGNAL_PANEL", "checkbox", "Signal panel style", "Applies panel style effect to signal panel."],
            ["VOLUME_PERCENTAGE_TOAST", "checkbox", "Volume toast", "Displays toast when volume changes."]
          ],
          rds: [
            ["RDS_ICON_STYLE", "checkbox", "Enable UI Addon Icons Style", "Enables RDS, PTY, TP, TA icons."],
            ["RDS_ICON_STYLE_MOBILE", "checkbox", "Enable UI Addon Icons Style on mobile", "Enables UI Addon Icons Style on mobile."],

            ["STEREO_ICON_COLOR", "color", "Stereo icon color", "default, auto, or custom #RRGGBB."],
            ["STEREO_ICON_COLOR_OFF", "color", "Stereo off color", "default, auto, or custom #RRGGBB."],
            ["STEREO_ICON_WIDTH", "number", "Stereo icon width", "Stereo circle thickness."],
            ["STEREO_ICON_SCALE", "text", "Stereo icon scale", "Example: 100%, 110%, 120%. Normalised to match RDS visual size."],
            ["APPLY_STEREO_ICON_GLOW_WITH_MISSING_RDS", "checkbox", "Stereo glow without RDS", "Keeps stereo glow when RDS is missing."],

            ["RDS_ICON_SCALE", "text", "RDS icon scale", "Example: 100%, 110%, 120%."],
            ["RDS_ICON_STYLE_MS_OFF_AS_LETTERS", "checkbox", "MS off as letters", "Uses MS letters for dimmed Music/Speech icons."],
            ["RDS_INDICATOR_ICON_TYPE", "select", "RDS indicator type", "RDS indicator icon type.", [["1","Type 1"],["2","Type 2"]]],
            ["RDS_INDICATOR_ICON_COLOR", "color", "RDS icon color", "default, auto, or custom #RRGGBB."],
            ["RDS_INDICATOR_ICON_COLOR_OFF", "color", "RDS off color", "default, auto, or custom #RRGGBB."],
            ["RDS_INDICATOR_ICON_GLOW_INTENSITY", "number", "RDS glow intensity", "Numeric glow intensity."],
            ["TP_INDICATOR_ICON_COLOR", "color", "TP color", "default, auto, or custom #RRGGBB."],
            ["TP_INDICATOR_ICON_COLOR_OFF", "color", "TP off color", "default, auto, or custom #RRGGBB."],
            ["TA_INDICATOR_ICON_COLOR", "color", "TA color", "default, auto, or custom #RRGGBB."],
            ["TA_INDICATOR_ICON_COLOR_OFF", "color", "TA off color", "default, auto, or custom #RRGGBB."],
            ["PTY_INDICATOR_COLOR", "color", "PTY color", "default, auto, or custom #RRGGBB."],
            ["PTY_INDICATOR_COLOR_OFF", "color", "PTY off color", "default, auto, or custom #RRGGBB."],
            ["MS_INDICATOR_COLOR", "color", "MS color", "default, auto, or custom #RRGGBB."],
            ["MS_INDICATOR_COLOR_OFF", "color", "MS off color", "default, auto, or custom #RRGGBB."],
            ["RDS_ICON_STYLE_REMOVE_RDS_ICON", "checkbox", "Remove RDS icon", "Useful with multipath/Metrics Monitor setups."],
            ["RDS_FLAG_INDICATOR", "checkbox", "RDS flag indicator", "Shows A/B bullet next to radiotext."],
            ["MULTIPATH_INDICATOR", "checkbox", "Multipath indicator", "Adds multipath icon/text."],
            ["MULTIPATH_ATTACH_TO", "select", "Multipath attach to", "Target icon for multipath indicator.", [["STEREO","STEREO"],["PTY","PTY"],["MS","MS"],["ECC","ECC"],["TP","TP"],["TA","TA"],["RDS","RDS"]]],
            ["MULTIPATH_LEFT_PADDING", "number", "Multipath left padding", "Spacing when not attached to Stereo/Mono."],
            ["MULTIPATH_DISPLAY_MODE", "select", "Multipath display mode", "Icon, text, or both.", [["ICON","ICON"],["TEXT","TEXT"],["BOTH","BOTH"]]],
            ["IS_TEF_RADIO", "checkbox", "TEF radio mode", "Uses TEF radio MP assumption."],
            ["METRICS_MONITOR_PLUGIN_IS_INSTALLED", "checkbox", "Metrics Monitor installed", "Enable if Metrics Monitor plugin is installed."],
            ["IS_VISUALEQ_PLUGIN_ENABLED", "checkbox", "VisualEQ enabled", "Enable if VisualEQ plugin is installed."],
            ["BANDWIDTH_UPDATE_INTERVAL", "number", "Bandwidth update interval", "Milliseconds."],
            ["LED_GLOW_EFFECT_ICONS_RDS_ICON_STYLE_PTY", "checkbox", "PTY icon glow", "Glow effect for PTY RDS icon style."],
            ["LED_GLOW_EFFECT_ICONS_RDS_ICON_STYLE_MS", "checkbox", "MS icon glow", "Glow effect for MS RDS icon style."],
            ["LED_GLOW_EFFECT_ICONS_BANDWIDTH", "checkbox", "Bandwidth icon glow", "Glow effect for bandwidth."],
            ["LED_GLOW_EFFECT_ICONS_METRICS_MONITOR_PLUGIN", "checkbox", "Metrics icon glow", "Glow for Metrics Monitor icons."],
            ["REPLACE_MPX_LOGO_WITH_STEREO_LOGO_METRICS_MONITOR_PLUGIN", "checkbox", "Replace MPX with stereo", "Metrics Monitor compatibility option."],
            ["RDS_ICON_PRESET", "select", "RDS icon preset", "0 user, 1 preset 1, 2 preset 2, 3 preset 3.", [["0","User editable"],["1","Preset 1"],["2","Preset 2"],["3","Preset 3"]]]
          ],
          plugins: [
            ["SORT_PLUGIN_BUTTONS", "checkbox", "Sort plugin buttons", "Enables custom plugin button order."],
            ["PLUGINS_USER_ORDER", "textarea", "Plugin order", "Comma-separated plugin numbers. Example: 1, 2, 11, 4."]
          ],
          console: [
            ["HIDE_CONSOLE_LOGS", "checkbox", "Hide console logs", "Suppresses normal console logs. Warnings/errors remain."]
          ]
        };

        function uiapeEscapeHtml(value) {
          return String(value).replace(/[&<>"']/g, ch => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
          }[ch]));
        }

        function uiapeIsHexColor(value) {
          return /^#[0-9A-Fa-f]{6}$/.test(String(value || ""));
        }

        function uiapeColorMode(value) {
          if (value === "auto") return "auto";
          if (uiapeIsHexColor(value)) return "custom";
          return "default";
        }

        function uiapeDefaultColorValue(key) {
          const def = UIAPE_DEFAULT_CONFIG[key];
          return uiapeIsHexColor(def) ? def : "#ffffff";
        }

        function uiapeRenderColorControl(key, value) {
          const mode = uiapeColorMode(value);
          const pickerValue = uiapeIsHexColor(value) ? value : uiapeDefaultColorValue(key);
          return `
            <div class="uiape-color-combo" data-uiape-color-combo="${key}">
              <select data-uiape-color-mode="${key}">
                <option value="default" ${mode === "default" ? "selected" : ""}>default</option>
                <option value="auto" ${mode === "auto" ? "selected" : ""}>auto</option>
                <option value="custom" ${mode === "custom" ? "selected" : ""}>#RRGGBB</option>
              </select>
              <input type="color" data-uiape-color-picker="${key}" value="${uiapeEscapeHtml(pickerValue)}" ${mode === "custom" ? "" : "hidden"}>
            </div>
          `;
        }

        function uiapeRenderControl(def) {
          const key = def[0];
          const type = def[1];
          const label = def[2];
          const help = def[3] || "";
          const options = def[4] || [];
          const config = getUiapPanelConfig();
          const value = config[key];

          let controlHtml = "";
          if (type === "checkbox") {
            controlHtml = `<input type="checkbox" data-uiape-key="${key}" ${value ? "checked" : ""}>`;
          } else if (type === "select") {
            controlHtml = `<select data-uiape-key="${key}" data-uiape-type="select">` + options.map(option => {
              const optionValue = option[0];
              const optionLabel = option[1];
              return `<option value="${uiapeEscapeHtml(optionValue)}" ${String(value) === String(optionValue) ? "selected" : ""}>${uiapeEscapeHtml(optionLabel)}</option>`;
            }).join("") + `</select>`;
          } else if (type === "color") {
            controlHtml = uiapeRenderColorControl(key, value);
          } else if (type === "textarea") {
            controlHtml = `<textarea data-uiape-key="${key}">${uiapeEscapeHtml(value ?? "")}</textarea>`;
          } else {
            controlHtml = `<input type="${type}" data-uiape-key="${key}" value="${uiapeEscapeHtml(value ?? "")}">`;
          }

          // Admin-only visible: lets an admin restrict any individual setting to admins,
          // right from the row itself, instead of editing ADMIN_ONLY_KEYS by hand.
          let adminOnlyToggleHtml = "";
          let isAdminOnlyRow = false;
          if (uiapeDetectAdminSession()) {
            const adminOnlyKeys = Array.isArray(config.ADMIN_ONLY_KEYS) ? config.ADMIN_ONLY_KEYS : [];
            isAdminOnlyRow = adminOnlyKeys.includes(key);
            adminOnlyToggleHtml = `
              <label class="uiape-admin-only-toggle" title="Hide this setting from non-admin users">
                <input type="checkbox" data-uiape-admin-only-key="${key}" ${isAdminOnlyRow ? "checked" : ""}>
                Admin only
              </label>
            `;
          }

          const rowClass = (type === "textarea" ? "uiape-config-row uiape-config-control-wide" : "uiape-config-row")
            + (isAdminOnlyRow ? " uiape-config-row-admin-only" : "");
          return `
            <div class="${rowClass}">
              <div class="uiape-config-label">
                <strong>${uiapeEscapeHtml(label)}</strong>
                <span>${uiapeEscapeHtml(help)}</span>
                ${adminOnlyToggleHtml}
              </div>
              <div class="uiape-config-control">${controlHtml}</div>
            </div>
          `;
        }

        function uiapeArrayText(value) {
          return Array.isArray(value) ? value.join(", ") : String(value ?? "");
        }

        function uiapePresetLine(name, preset) {
          if (!preset) return "";
          return `<div><strong>${uiapeEscapeHtml(name)}:</strong> row 1 <code>${uiapeEscapeHtml(uiapeArrayText(preset.FIRST_ROW))}</code> \u00B7 row 2 <code>${uiapeEscapeHtml(uiapeArrayText(preset.SECOND_ROW))}</code></div>`;
        }

        function uiapeRenderRdsPresetEditor() {
          const config = getUiapPanelConfig();
          const presets = config.RDS_ICON_STYLE_PRESETS || UIAPE_DEFAULT_CONFIG.RDS_ICON_STYLE_PRESETS;
          const userPreset = presets.user || UIAPE_DEFAULT_CONFIG.RDS_ICON_STYLE_PRESETS.user;
          const summary = [1, 2, 3].map(id => uiapePresetLine(`Preset ${id}`, presets[id])).join("");
          const isAdmin = uiapeDetectAdminSession();
          const adminOnlyKeys = Array.isArray(config.ADMIN_ONLY_KEYS) ? config.ADMIN_ONLY_KEYS : [];
          const fields = UIAPE_RDS_PRESET_FIELDS.filter(uiapeIsControlVisibleForCurrentUser).map(field => {
            const key = field[0];
            const type = field[1];
            const label = field[2];
            const help = field[3];
            const rawValue = userPreset[key];
            const value = Array.isArray(rawValue) ? rawValue.join(", ") : rawValue;
            const inputHtml = type === "select"
              ? `<select data-uiape-preset-field="${key}">${(field[4] || []).map(opt => `<option value="${uiapeEscapeHtml(opt[0])}" ${String(value) === String(opt[0]) ? "selected" : ""}>${uiapeEscapeHtml(opt[1])}</option>`).join("")}</select>`
              : `<input type="${type}" data-uiape-preset-field="${key}" value="${uiapeEscapeHtml(value ?? "")}">`;
            const isAdminOnlyRow = adminOnlyKeys.includes(key);
            const adminOnlyToggleHtml = isAdmin ? `
              <label class="uiape-admin-only-toggle" title="Hide this setting from non-admin users">
                <input type="checkbox" data-uiape-admin-only-key="${key}" ${isAdminOnlyRow ? "checked" : ""}>
                Admin only
              </label>
            ` : "";
            return `
              <div class="uiape-config-row${isAdminOnlyRow ? " uiape-config-row-admin-only" : ""}">
                <div class="uiape-config-label">
                  <strong>${uiapeEscapeHtml(label)}</strong>
                  <span>${uiapeEscapeHtml(help)}</span>
                  ${adminOnlyToggleHtml}
                </div>
                <div class="uiape-config-control">
                  ${inputHtml}
                </div>
              </div>
            `;
          }).join("");
          // The summary, help text, and copy button are all just reference material for
          // choosing/acting on RDS_ICON_PRESET, so they follow that setting's own admin-only
          // status rather than always being shown.
          const showRdsPresetInfo = uiapeIsControlVisibleForCurrentUser(["RDS_ICON_PRESET"]);
          return `
            ${showRdsPresetInfo ? `
            <div class="uiape-preset-summary">
              ${summary}
              <div style="margin-top:6px;">For custom ordering, set <code>RDS icon preset</code> to <code>User editable</code>, then edit the user preset below.</div>
              <button type="button" class="uiape-mini-button" data-uiape-action="copy-active-rds-preset">Copy selected preset to User</button>
            </div>
            ` : ""}
            ${fields}
          `;
        }

        function uiapeBasePluginButtonMap() {
          const config = getUiapPanelConfig();
          return {
            ...(UIAPE_DEFAULT_CONFIG.PLUGIN_BUTTON_DEFAULT_MAP || {}),
            ...(config.PLUGIN_BUTTON_DEFAULT_MAP || {})
          };
        }

        function uiapePluginLabel(num, fallback) {
          const config = getUiapPanelConfig();
          const labels = {
            ...(UIAPE_DEFAULT_CONFIG.PLUGIN_BUTTON_DEFAULT_LABELS || {}),
            ...(config.PLUGIN_BUTTON_DEFAULT_LABELS || {}),
            ...(UIAPE_DEFAULT_CONFIG.PLUGIN_BUTTON_CUSTOM_LABELS || {}),
            ...(config.PLUGIN_BUTTON_CUSTOM_LABELS || {})
          };
          return labels[num] || fallback || `Custom Plugin (${num})`;
        }

        function uiapeGetPluginCustomMap() {
          const config = getUiapPanelConfig();
          return {
            ...(UIAPE_DEFAULT_CONFIG.PLUGIN_BUTTON_CUSTOM_MAP || {}),
            ...(config.PLUGIN_BUTTON_CUSTOM_MAP || {})
          };
        }

        function uiapePluginButtonId(num, fallbackId) {
          const baseMap = uiapeBasePluginButtonMap();
          const customMap = uiapeGetPluginCustomMap();
          return customMap[num] || baseMap[num] || fallbackId || "";
        }

        function uiapePluginRowsForPanel() {
          const baseNums = UIAPE_PLUGIN_BUTTON_DEFAULTS.map(item => item[0]);
          const customNums = Object.keys(uiapeGetPluginCustomMap()).map(Number).filter(Number.isFinite);
          return Array.from(new Set([...baseNums, ...customNums])).sort((a, b) => a - b);
        }

        function uiapeRenderPluginOrderHelper() {
          // Every button/field here reads or writes PLUGINS_USER_ORDER directly, so the whole
          // helper follows that setting's own admin-only status rather than always being shown.
          if (!uiapeIsControlVisibleForCurrentUser(["PLUGINS_USER_ORDER"])) return "";

          const byNum = new Map(UIAPE_PLUGIN_BUTTON_DEFAULTS.map(item => [item[0], item]));
          const customMap = uiapeGetPluginCustomMap();
          return `
            <div class="uiape-preset-summary">
              Enable <code>Sort plugin buttons</code>, then write the wanted sequence in <code>Plugin order</code>. Use the small <code>+</code> / <code>-</code> next to each title to add or remove that number. For unknown buttons, add a new number below and paste the real DOM id, e.g. <code>webstats-btn</code>.
            </div>
            <div class="uiape-plugin-map">
              ${uiapePluginRowsForPanel().map(num => {
                const item = byNum.get(num);
                const label = uiapePluginLabel(num, item?.[1]);
                return `<div><code>${num}</code> = ${uiapeEscapeHtml(label)} <button type="button" class="uiape-mini-button uiape-plugin-order-add" data-uiape-action="append-plugin-order" data-uiape-plugin-num="${num}" title="Add ${num} to order">+</button><button type="button" class="uiape-mini-button uiape-plugin-order-remove" data-uiape-action="remove-plugin-order" data-uiape-plugin-num="${num}" title="Remove ${num} from order">-</button></div>`;
              }).join("")}
            </div>
            <div class="uiape-preset-summary" style="margin-top:8px;">
              Editable button map. You can edit the plugin order manually directly or use +/- to add or remove from the predefined plugins id list. You can edit IDs <code>32-35</code> to any existing button id, or add more numbers for extra buttons not included in the original list.
            </div>
            <div class="uiape-plugin-edit-map">
              <div class="uiape-plugin-edit-row uiape-plugin-edit-head"><span>No.</span><span>Label</span><span>Button DOM id</span><span></span><span></span></div>
              ${uiapePluginRowsForPanel().filter(num => num >= 32 || (customMap[num] && num !== 30 && num !== 31)).map(num => {
                const item = byNum.get(num);
                const label = uiapePluginLabel(num, item?.[1]);
                const id = uiapePluginButtonId(num, item?.[2]);
                return `<div class="uiape-plugin-edit-row"><code>${num}</code><input type="text" data-uiape-custom-plugin-label="${num}" value="${uiapeEscapeHtml(label)}"><input type="text" data-uiape-custom-plugin-map="${num}" value="${uiapeEscapeHtml(id)}" placeholder="button-id"><button type="button" class="uiape-mini-button uiape-plugin-order-add" data-uiape-action="append-plugin-order" data-uiape-plugin-num="${num}" title="Add ${num} to order">+</button><button type="button" class="uiape-mini-button uiape-plugin-order-remove" data-uiape-action="remove-plugin-order" data-uiape-plugin-num="${num}" title="Remove ${num} from order">-</button></div>`;
              }).join("")}
            </div>
            <button type="button" class="uiape-mini-button" data-uiape-action="add-plugin-map-row">Add custom button number</button>
          `;
        }

        function uiapeIsControlVisibleForCurrentUser(def) {
          const key = def && def[0];
          if (!key) return true;
          if (uiapeDetectAdminSession()) return true;
          return !uiapeGetAdminOnlyKeys().includes(key);
        }

        function uiapeRenderAllControls() {
          const isAdmin = uiapeDetectAdminSession();
          Object.keys(uiapeControlSections).forEach(sectionName => {
            const target = panel.querySelector(`[data-uiape-controls="${sectionName}"]`);
            if (!target) return;
            const visibleDefs = uiapeControlSections[sectionName].filter(uiapeIsControlVisibleForCurrentUser);
            target.innerHTML = visibleDefs.map(uiapeRenderControl).join("");

            // "rds" and "plugins" always render extra content below the plain controls,
            // so they're never considered empty even if every checkbox/input is admin-only.
            const hasExtraContent = sectionName === "rds" || sectionName === "plugins";
            if (sectionName === "rds") target.insertAdjacentHTML("beforeend", uiapeRenderRdsPresetEditor());
            if (sectionName === "plugins") target.insertAdjacentHTML("beforeend", uiapeRenderPluginOrderHelper());

            // Hide the whole section (title included) when it has no controls this user can see.
            const sectionEl = target.closest(".uiape-config-section");
            if (sectionEl) sectionEl.hidden = visibleDefs.length === 0 && !hasExtraContent;
          });
        }

        function uiapeParseList(value) {
          return String(value || "").split(",").map(item => item.trim()).filter(Boolean);
        }

        function uiapeUpdateUserPresetField(field, value) {
          const config = getUiapPanelConfig();
          const presets = {
            ...UIAPE_DEFAULT_CONFIG.RDS_ICON_STYLE_PRESETS,
            ...(config.RDS_ICON_STYLE_PRESETS || {})
          };
          const currentUser = {
            ...UIAPE_DEFAULT_CONFIG.RDS_ICON_STYLE_PRESETS.user,
            ...(presets.user || {})
          };
          const modeFields = ["MS_HEIGHT_MODE", "TP_HEIGHT_MODE", "TA_HEIGHT_MODE"];
          const nextValue = field === "FIRST_ROW" || field === "SECOND_ROW"
            ? uiapeParseList(value)
            : modeFields.includes(field)
              ? String(value || "PTY")
              : Number(value);
          const isValidValue = Array.isArray(nextValue) || modeFields.includes(field) || Number.isFinite(nextValue);
          const nextPresets = {
            ...presets,
            user: {
              ...currentUser,
              [field]: isValidValue ? nextValue : UIAPE_DEFAULT_CONFIG.RDS_ICON_STYLE_PRESETS.user[field]
            }
          };
          updateUiapConfig("RDS_ICON_STYLE_PRESETS", nextPresets);
        }

        uiapeRenderAllControls();

        panel.addEventListener("change", (event) => {
          const field = event.target;

          const colorModeKey = field?.dataset?.uiapeColorMode;
          if (colorModeKey) {
            const picker = panel.querySelector(`[data-uiape-color-picker="${colorModeKey}"]`);
            const mode = field.value;
            if (picker) picker.hidden = mode !== "custom";
            if (mode === "custom") {
              updateUiapConfig(colorModeKey, picker?.value || uiapeDefaultColorValue(colorModeKey));
            } else if (mode === "auto") {
              updateUiapConfig(colorModeKey, "auto");
            } else {
              updateUiapConfig(colorModeKey, UIAPE_DEFAULT_CONFIG[colorModeKey]);
            }
            return;
          }

          const colorPickerKey = field?.dataset?.uiapeColorPicker;
          if (colorPickerKey) {
            updateUiapConfig(colorPickerKey, field.value);
            return;
          }

          const presetField = field?.dataset?.uiapePresetField;
          if (presetField) {
            uiapeUpdateUserPresetField(presetField, field.value);
            return;
          }

          const adminOnlyKey = field?.dataset?.uiapeAdminOnlyKey;
          if (adminOnlyKey) {
            const draftConfig = getUiapPanelConfig();
            const current = Array.isArray(draftConfig.ADMIN_ONLY_KEYS) ? [...draftConfig.ADMIN_ONLY_KEYS] : [];
            const currentSeen = Array.isArray(draftConfig.ADMIN_ONLY_KEYS_SEEN) ? [...draftConfig.ADMIN_ONLY_KEYS_SEEN] : [];
            const idx = current.indexOf(adminOnlyKey);
            if (field.checked) {
              if (idx === -1) current.push(adminOnlyKey);
            } else if (idx !== -1) {
              current.splice(idx, 1);
            }
            // Mark as decided either way, so a future default-list change never
            // silently overrides this specific choice again.
            if (!currentSeen.includes(adminOnlyKey)) currentSeen.push(adminOnlyKey);
            updateUiapConfig("ADMIN_ONLY_KEYS", current);
            updateUiapConfig("ADMIN_ONLY_KEYS_SEEN", currentSeen);
            return;
          }

          const customPluginLabel = field?.dataset?.uiapeCustomPluginLabel;
          if (customPluginLabel) {
            const labels = {
              ...(UIAPE_DEFAULT_CONFIG.PLUGIN_BUTTON_CUSTOM_LABELS || {}),
              ...(getUiapPanelConfig().PLUGIN_BUTTON_CUSTOM_LABELS || {})
            };
            labels[customPluginLabel] = field.value || `Custom Plugin (${customPluginLabel})`;
            updateUiapConfig("PLUGIN_BUTTON_CUSTOM_LABELS", labels);
            uiapeRenderAllControls();
            return;
          }

          const customPluginMap = field?.dataset?.uiapeCustomPluginMap;
          if (customPluginMap) {
            const map = {
              ...(UIAPE_DEFAULT_CONFIG.PLUGIN_BUTTON_CUSTOM_MAP || {}),
              ...(getUiapPanelConfig().PLUGIN_BUTTON_CUSTOM_MAP || {})
            };
            map[customPluginMap] = field.value.trim();
            updateUiapConfig("PLUGIN_BUTTON_CUSTOM_MAP", map);
            uiapeRenderAllControls();
            return;
          }

          const key = field?.dataset?.uiapeKey;
          if (!key) return;

          let value;
          if (field.type === "checkbox") {
            value = field.checked;
          } else if (field.type === "number") {
            value = Number(field.value);
            if (!Number.isFinite(value)) value = UIAPE_DEFAULT_CONFIG[key];
          } else if (field.tagName === "SELECT") {
            const defaultValue = UIAPE_DEFAULT_CONFIG[key];
            value = typeof defaultValue === "number" ? Number(field.value) : field.value;
          } else {
            value = field.value;
          }

          updateUiapConfig(key, value);
        });

        panel.addEventListener("click", async (event) => {
          const action = event.target?.dataset?.uiapeAction;
          if (!action) return;

          if (action === "copy-active-rds-preset") {
            const config = getUiapPanelConfig();
            const presetId = String(config.RDS_ICON_PRESET || 1);
            const presets = config.RDS_ICON_STYLE_PRESETS || UIAPE_DEFAULT_CONFIG.RDS_ICON_STYLE_PRESETS;
            const selected = presets[presetId] || UIAPE_DEFAULT_CONFIG.RDS_ICON_STYLE_PRESETS[presetId] || UIAPE_DEFAULT_CONFIG.RDS_ICON_STYLE_PRESETS[1];
            const nextPresets = {
              ...UIAPE_DEFAULT_CONFIG.RDS_ICON_STYLE_PRESETS,
              ...presets,
              user: JSON.parse(JSON.stringify(selected))
            };
            updateUiapConfig("RDS_ICON_STYLE_PRESETS", nextPresets);
            updateUiapConfig("RDS_ICON_PRESET", 0);
            uiapeRenderAllControls();
            return;
          }


          if (action === "add-plugin-map-row") {
            const config = getUiapPanelConfig();
            const map = {
              ...(UIAPE_DEFAULT_CONFIG.PLUGIN_BUTTON_CUSTOM_MAP || {}),
              ...(config.PLUGIN_BUTTON_CUSTOM_MAP || {})
            };
            const labels = {
              ...(UIAPE_DEFAULT_CONFIG.PLUGIN_BUTTON_CUSTOM_LABELS || {}),
              ...(config.PLUGIN_BUTTON_CUSTOM_LABELS || {})
            };
            const existingNums = [
              ...UIAPE_PLUGIN_BUTTON_DEFAULTS.map(item => item[0]),
              ...Object.keys(map).map(Number).filter(Number.isFinite)
            ];
            const nextNum = Math.max(35, ...existingNums) + 1;
            map[nextNum] = "";
            labels[nextNum] = `Custom Plugin (${nextNum})`;
            updateUiapConfig("PLUGIN_BUTTON_CUSTOM_MAP", map);
            updateUiapConfig("PLUGIN_BUTTON_CUSTOM_LABELS", labels);
            uiapeRenderAllControls();
            return;
          }

          if (action === "append-plugin-order") {
            const num = event.target?.dataset?.uiapePluginNum;
            const orderField = panel.querySelector('[data-uiape-key="PLUGINS_USER_ORDER"]');
            if (num && orderField) {
              const current = String(orderField.value || "").split(",").map(x => x.trim()).filter(Boolean);
              if (!current.includes(num)) current.push(num);
              orderField.value = current.join(", ");
              updateUiapConfig("PLUGINS_USER_ORDER", orderField.value);
            }
            return;
          }

          if (action === "remove-plugin-order") {
            const num = event.target?.dataset?.uiapePluginNum;
            const orderField = panel.querySelector('[data-uiape-key="PLUGINS_USER_ORDER"]');
            if (num && orderField) {
              const current = String(orderField.value || "").split(",").map(x => x.trim()).filter(Boolean);
              const next = current.filter(x => x !== String(num));
              orderField.value = next.join(", ");
              updateUiapConfig("PLUGINS_USER_ORDER", orderField.value);
            }
            return;
          }

          if (action === "save-all") {
            saveUiapConfig();
            return;
          }

          if (action === "reload") {
            if (UIAPE_CONFIG_DIRTY && !(await confirmAsync("Discard unsaved UI Add-on changes and reload?"))) return;
            location.reload();
          }

          if (action === "reset") {
            const isAdmin = uiapeDetectAdminSession();
            const message = isAdmin
              ? `Reset shared ${pluginName} server\nconfig to plugin defaults and reload?`
              : `Reset your personal ${pluginName} overrides and reload?`;
            if (!(await confirmAsync(message))) return;

            if (isAdmin) {
              const resetConfig = {
                ...UIAPE_DEFAULT_CONFIG,
                ENABLE_PLUGIN: true
              };
              await writeUiapStoredConfig(resetConfig, "admin");
            } else {
              localStorage.removeItem(UIAPE_USER_CONFIG_KEY);
              localStorage.setItem(UIAPE_ENABLE_KEY, "true");
            }

            location.reload();
          }
        });

        return true;
    }

    attachLauncher();

    const observer = new MutationObserver(() => {
        const gear = document.getElementById("uiape-config-gear");
        const panel = document.getElementById("uiape-config-panel");
        const host = findUiapHost();
        if (!gear || !panel || !gear.isConnected || !panel.isConnected || (host && gear.parentElement !== host)) {
            attachLauncher();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
        const gear = document.getElementById("uiape-config-gear");
        const panel = document.getElementById("uiape-config-panel");
        if (!gear || !panel || !gear.isConnected || !panel.isConnected) attachLauncher();
    }, 800);

    // Extra repair loop for RDS/Stereo icon rebuilds: when #signalPanel is rewritten,
    // the gear can be removed with innerHTML. Reattach it without touching saved settings.
    setInterval(() => {
        const host = findUiapHost() || document.getElementById("uiape-config-fallback-host");
        const gear = document.getElementById("uiape-config-gear");
        const panel = document.getElementById("uiape-config-panel");
        if (!host || !panel) {
            attachLauncher();
            return;
        }
        if (!gear || !gear.isConnected || gear.parentElement !== host) {
            attachLauncher();
            return;
        }
        host.classList.add("uiape-config-host");
        host.style.setProperty("z-index", "2", "important");
    }, 1200);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createUiapConfigLauncher);
} else {
    createUiapConfigLauncher();
}


// #################### GENERAL SETTINGS #################### //

// Suppress all console logs
if (HIDE_CONSOLE_LOGS) console.log = function() {};

// Admin status comes from the server session (UIAPE_IS_ADMIN, set at the top of this file via
// uiapeFetchServerConfig()), not from scanning the page for login text - that client-side check
// could be spoofed by injecting the same text into the DOM. Anywhere admin status previously
// relied on isTuneAuthenticated now uses uiapeDetectAdminSession() / UIAPE_IS_ADMIN instead.
if (UIAPE_IS_ADMIN) {
    console.log(`[${pluginName}] Logged in as administrator`);
}

// #################### ADDITIONAL CSS STYLES #################### //

let styleElement = document.createElement('style');
styleElement.id = 'uiape-live-style';
styleElement.textContent = uiapeBuildLiveCss(getUiapPanelConfig());
uiapeLiveStyleElement = styleElement;

document.head.insertBefore(styleElement, uiapeStyleAnchor);

// +++++++++++++++ STEP 4b (start) +++++++++++++++ //
// DOM/behavioral feature blocks start here and run down through the rest of the file.
// If your new feature resembles one already below (e.g. CANVAS FADE, FMLIST BUTTON,
// MOVE MOBILE TRAY, TUNE DELAY), place its "if (MY_NEW_FEATURE) { ... }" block next
// to that one instead of here - proximity to similar features matters more than
// being first.

if (STEREO_ICON_COLOR !== "default") {
    const styleId = "custom-circle-style";
    let existingStyle = document.getElementById(styleId);
    if (!existingStyle) {
      existingStyle = document.createElement("style");
      existingStyle.id = styleId;
      document.head.appendChild(existingStyle);
    }
    existingStyle.textContent = `.circle.data-st { border: 2px solid var(--uiape-stereo-icon-color) }`;

    function clamp(num, min, max) {
      return Math.min(Math.max(num, min), max);
    }

    function multiplyRgb(rgb, factors) {
      return {
        r: clamp(Math.round(rgb.r * factors[0]), 0, 255),
        g: clamp(Math.round(rgb.g * factors[1]), 0, 255),
        b: clamp(Math.round(rgb.b * factors[2]), 0, 255),
      };
    }

    function rgbaString(rgb, alpha) {
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
    }

    function hexToRgb(hex) {
      const hexClean = hex.replace('#', '');
      const bigint = parseInt(hexClean, 16);
      return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
      };
    }

    // Slightly lighten multipliers by +0.05 capped at 1.0
    function lightenMultiplier(m) {
      return m.map(x => Math.min(x + 0.05, 1));
    }

    // Read alpha CSS vars and boost by 10%
    const style = getComputedStyle(document.documentElement);
    const alphaBoost = 1.1;

    const alphas = [
      (parseFloat(style.getPropertyValue('--glow-alpha-1')) || 0.6) * alphaBoost,
      (parseFloat(style.getPropertyValue('--glow-alpha-2')) || 0.4) * alphaBoost,
      (parseFloat(style.getPropertyValue('--glow-alpha-3')) || 0.3) * alphaBoost,
      (parseFloat(style.getPropertyValue('--glow-alpha-4')) || 0.2) * alphaBoost,
    ].map(a => Math.min(a, 1)); // clamp max at 1

    const backgroundAlpha = alphas[2]; // glow-alpha-3

    function applyGlow() {
      const styleId = "custom-circle-style";
      let existingStyle = document.getElementById(styleId);
      if (!existingStyle) {
        existingStyle = document.createElement("style");
        existingStyle.id = styleId;
        document.head.appendChild(existingStyle);
      }

      const circles = document.querySelectorAll('.wrapper-outer #wrapper .circle-container .circle.data-st');

      circles.forEach(el => {
        if (el.classList.contains('opacity-half') || el.closest('.opacity-half')) {
          el.style.backgroundColor = 'inherit';
          el.style.boxShadow = 'none';

          existingStyle.textContent = `.circle.data-st { border: 2px solid var(--uiape-stereo-icon-color-off) }`;

          return;
        }

        existingStyle.textContent = `.circle.data-st { border: 2px solid var(--uiape-stereo-icon-color) }`;

        if (!LED_GLOW_EFFECT_ICONS) return;

        const borderColor = getComputedStyle(el).borderColor;
        let baseRgb;

        if (borderColor.startsWith('rgb')) {
          const [r, g, b] = borderColor.match(/\d+/g).map(Number);
          baseRgb = { r, g, b };
        } else if (borderColor.startsWith('#')) {
          baseRgb = hexToRgb(borderColor);
        } else {
          baseRgb = { r: 255, g: 255, b: 255 };
        }

        const baseMultipliers = [
          [1.0, 1.0, 1.0],
          [0.93, 1.12, 0.92],
          [0.8, 0.8, 0.8],
          [0.65, 0.8, 0.8],
          [0.53, 0.68, 0.68]
        ];

        const multipliers = baseMultipliers.map(lightenMultiplier);

        const glowColors = multipliers.slice(1).map((m, i) =>
          rgbaString(multiplyRgb(baseRgb, m), alphas[i])
        );

        el.style.backgroundColor = rgbaString(multiplyRgb(baseRgb, multipliers[0]), backgroundAlpha);
        el.style.boxShadow = `
          0 0 6px ${glowColors[0]},
          0 0 12px ${glowColors[1]},
          0 0 18px ${glowColors[2]},
          0 0 24px ${glowColors[3]}
        `;
      });
    }

    applyGlow();

    // MutationObserver
    const targetNode = document.querySelector('#flags-container-desktop');
    const observer = new MutationObserver(mutations => {
      for(const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          applyGlow();
        }
      }
    });

    if (targetNode) {
      observer.observe(targetNode, { attributes: true, subtree: true, attributeFilter: ['class'] });
    }

    const themeObserver = new MutationObserver(() => {
      refreshAutoIconColorVars();
      applyGlow();
    });

    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
}

// MutationObserver
const observer = new MutationObserver(checkPiForQuestionMark);

const dataPiElement = document.querySelector('#data-pi');
if (dataPiElement) {
  observer.observe(dataPiElement, {
    childList: true,
    subtree: true
  });
}

checkPiForQuestionMark();

// #################### CANVAS GRAPH FADE IN #################### //

if (CANVAS_FADE_EFFECT) uiapeApplyCanvasFadeEffect();

// #################### FMLIST BUTTON REPOSITION #################### //

if (BUTTON_FM_LIST_MOD) {
const buttonFMLIST = document.querySelector('.wrapper-outer #wrapper .flex-container .panel-100 button.log-fmlist');
const targetContainer = document.querySelector('.wrapper-outer #wrapper .flex-container .panel-100.no-bg .flex-container.flex-phone.flex-phone-column .panel-33.hover-brighten.tooltip');
const miniPopup = document.querySelector('.wrapper-outer #wrapper .flex-container .panel-100 button.tooltip .mini-popup-content');

if (buttonFMLIST && targetContainer) {
  targetContainer.appendChild(buttonFMLIST);
  targetContainer.style.position = 'relative';
  buttonFMLIST.style.position = 'absolute';
  buttonFMLIST.style.top = '0';
  buttonFMLIST.style.right = '0';
  buttonFMLIST.style.margin = '6px';
  buttonFMLIST.style.transform = 'scale(0.5)';
  buttonFMLIST.style.transformOrigin = 'top right';
}

if (miniPopup) {
  miniPopup.style.transform = 'scale(1.75)';
  miniPopup.style.left = '-60px';
  miniPopup.style.top = '80px';
}

// Hide button when distance is close
// CSS code
let styleElement = document.createElement('style');
styleElement.textContent = `
.wrapper-outer #wrapper button.log-fmlist {
  display: none;
}
`;
document.head.appendChild(styleElement);

function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

const updateDistance = () => {
  const distanceElement = document.querySelector('.wrapper-outer #wrapper #data-station-container #data-station-distance');
  const FmListElement = document.querySelector('.wrapper-outer #wrapper button.log-fmlist');
  const containerElement = document.querySelector('.wrapper-outer #wrapper #data-station-container');
  if (containerElement && getComputedStyle(containerElement).display === 'none') {
    if (FmListElement) FmListElement.style.display = 'none';
  } else {
    if (distanceElement) {
      const distanceText = distanceElement.textContent;

      let distanceNumber = 0;
      let numberMatch = distanceText.match(/(\d+)\s*km/); // Check for km
      if (numberMatch) {
        distanceNumber = parseInt(numberMatch[1], 10);
      } else {
        numberMatch = distanceText.match(/(\d+)\s*mi/); // Check for mi
        if (numberMatch) {
          distanceNumber = (parseInt(numberMatch[1], 10) * 1.6093).toFixed(0);
        }
      }

      if (numberMatch) {
        if (distanceNumber > BUTTON_FM_LIST_MOD_MINIMUM_HIDE_DISTANCE) {
          if (FmListElement) FmListElement.style.display = 'block';
        }
      }
    }
  }
};

setInterval(function() {
  updateDistance();
}, 1000);
}

// #################### SIDE BAR MENU SETTINGS #################### //

if (SIDEBAR_ADDITIONS) {
// Function for side bar buttons
function createAdditionalCheckbox({ checkboxId, labelText, tooltipText, localStorageKey, onChangeCallback }) {
    function insertHtmlAfterLastCheckbox() {
        const checkboxes = document.querySelectorAll('.modal-panel-content .form-group');
        if (checkboxes.length > 0) {
            const newDiv = document.createElement('div');
            newDiv.className = 'form-group';
            newDiv.innerHTML = `
                <div class="switch flex-container flex-phone flex-phone-column flex-phone-center">
                    <input type="checkbox" tabindex="0" id="${checkboxId}" aria-label="${labelText}">
                    <label for="${checkboxId}" class="tooltip" data-tooltip="${tooltipText}"></label>
                    <span class="text-smaller text-uppercase text-bold color-4 p-10">${labelText}</span>
                </div>
            `;
            checkboxes[checkboxes.length - 1].insertAdjacentElement('afterend', newDiv);
        } else {
            console.warn(`[${pluginName}] No checkboxes found to insert after.`);
        }
    }
    
    insertHtmlAfterLastCheckbox();

    if (localStorage.getItem(localStorageKey) === "true") {
        document.getElementById(checkboxId).checked = true;
    }

    document.getElementById(checkboxId).addEventListener("change", function () {
        let isChecked = this.checked;
        localStorage.setItem(localStorageKey, isChecked);
        if (onChangeCallback) {
            onChangeCallback();
        }
    });

    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const bodyElement = document.body;
                if (window.getComputedStyle(bodyElement).background !== 'none') {
                    observer.disconnect();
                    if (onChangeCallback) {
                        onChangeCallback();
                    }
                }
            }
        }
    });

    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
}

if (SIDEBAR_ADDITIONS_EXPAND_CANVAS) {
    // SIDE BAR MENU BUTTON "EXPAND CANVAS"
    createAdditionalCheckbox({
        checkboxId: "expand-canvas-height",
        labelText: "Expand Canvas",
        tooltipText: "Enable to expand plugin canvas height.",
        localStorageKey: "expandCanvasHeight",
        onChangeCallback: function () {
            // style code also below
            expandCanvasHeight();
        }
    });

    let canvasCenteringObserver = null;

    function centerMetricsMonitorPanels() {
        const cc = document.querySelector('.canvas-container');
        if (!cc) return;
        const h = cc.offsetHeight;
        const translateY = Math.floor((h - 160) / 2);
        ['mm-mpx-combo-flex', 'mm-signal-analyzer-flex', 'mm-scope-flex'].forEach(function(id) {
            const el = document.getElementById(id);
            if (el) el.style.transform = 'translate(10px, ' + translateY + 'px)';
        });
    }

    function expandCanvasHeight() {
        const style = document.createElement('style');
        style.id = "expandCanvasStyle";
        style.innerHTML = `
            .canvas-container { height: 172px; }
            @media only screen and (min-width: 769px) and (max-height: 720px) {
                .canvas-container { height: 120px; }
            }
        `;
        
        // Remove previous styles to avoid conflicts
        const existingStyle = document.getElementById("expandCanvasStyle");
        if (existingStyle) {
            existingStyle.remove();
        }

        const canvasContainer = document.querySelector('.canvas-container');
        
        disableHeightAdjustment();

        // Check if "expandCanvasHeight" is set to "true"
        if (localStorage.getItem("expandCanvasHeight") === "true") {
            // Apply fixed height when enabled
            document.head.appendChild(style);
            if (canvasContainer) {
                const savedHeight = localStorage.getItem('canvasHeight');
                if (savedHeight && !isNaN(savedHeight)) {
                    const height = parseInt(savedHeight, 10);
                    const clampedHeight = Math.max(minHeight, Math.min(height, maxHeight)); // minHeight to maxHeight
                    canvasContainer.style.height = `${clampedHeight}px`;
                } else {
                    // Use default expanded height if no saved height
                    canvasContainer.style.height = "172px";
                }
            }
            enableHeightAdjustment(); // Enable mouse dragging to adjust height
        } else {
            if (canvasContainer) {
                canvasContainer.style.height = "140px"; // Set to default height when disabled
            }
        }
        centerMetricsMonitorPanels();
    }

    // Function to enable height adjustment via mouse dragging
    let isDragging = false;
    let canvasContainer;
    const resizeEdge = 22;   // Draggable area size
    const minHeight = 140;   // Minimum height in px
    const maxHeight = 200;   // Maximum height in px
    let heightDisplayBox;
    let hideTimeout;
    let isDoubleClickProcessing = false;  // Flag to prevent double execution

    let handleMouseMove, handleMouseDown, handleDoubleClick;

    // Floating box to show height
    function createHeightDisplayBox() {
        heightDisplayBox = document.createElement('div');
        heightDisplayBox.style.position = 'fixed';
        heightDisplayBox.style.top = '10px';
        heightDisplayBox.style.right = '10px';
        heightDisplayBox.style.backgroundColor = 'var(--color-5-transparent)';
        heightDisplayBox.style.color = 'var(--color-1)';
        heightDisplayBox.style.padding = '5px 10px';
        heightDisplayBox.style.fontSize = '12px';
        heightDisplayBox.style.borderRadius = '4px';
        heightDisplayBox.style.boxShadow = '0 0 5px rgba(0, 0, 0, 0.2)';
        heightDisplayBox.style.display = 'none';
        heightDisplayBox.style.zIndex = '10';
        document.body.appendChild(heightDisplayBox);
    }

    function updateHeightDisplayBox(height) {
        if (heightDisplayBox) {
            heightDisplayBox.textContent = `${height} px`;
        }
    }

    function enableHeightAdjustment() {
        canvasContainer = document.querySelector('.canvas-container');
        if (!canvasContainer) return;

        createHeightDisplayBox();

        handleMouseMove = function (e) {
            const rect = canvasContainer.getBoundingClientRect();
            const isNearBottomEdge = e.clientY > rect.bottom - resizeEdge;

            if (isNearBottomEdge && !isDragging) {
                canvasContainer.style.cursor = 'ns-resize'; // Change cursor to vertical resize
            } else if (!isDragging) {
                canvasContainer.style.cursor = 'default'; // Reset cursor
            }
        };

        canvasContainer.addEventListener('mousemove', handleMouseMove);

        // Define mousedown handler
        handleMouseDown = function (e) {
            if (e.button !== 0) return;  // Only allow left mouse button

            const rect = canvasContainer.getBoundingClientRect();
            if (e.clientY > rect.bottom - resizeEdge) {
                isDragging = true;

                clearTimeout(hideTimeout);

                // Disable text selection during dragging
                document.body.style.userSelect = 'none';

                // Temporary CSS rule to force ns-resize cursor globally
                const dragCursorStyle = document.createElement('style');
                dragCursorStyle.id = 'canvas-drag-cursor-override';
                dragCursorStyle.innerHTML = `
                    *, *:hover, *:active, *:focus {
                        cursor: ns-resize !important;
                    }
                `;
                document.head.appendChild(dragCursorStyle);

                const startY = e.clientY;
                const startHeight = canvasContainer.offsetHeight;

                heightDisplayBox.style.display = 'block';
                updateHeightDisplayBox(startHeight);

                // Mouse move event to adjust the height
                function onMouseMove(moveEvent) {
                    if (isDragging) {
                        const diffY = moveEvent.clientY - startY;
                        let newHeight = startHeight + diffY;

                        // Clamp the new height within specified range
                        newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));

                        canvasContainer.style.height = newHeight + 'px';
                        //canvasContainer.style.transition = 'height 0.5s ease';
                        updateHeightDisplayBox(newHeight); // Update the height value in the box
                        centerMetricsMonitorPanels();
                    }
                }

                // Mouse up event to stop dragging
                function onMouseUp() {
                    isDragging = false;

                    document.body.style.userSelect = 'auto';

                    // Remove temporary cursor override CSS
                    const dragCursorStyle = document.getElementById('canvas-drag-cursor-override');
                    if (dragCursorStyle) {
                        dragCursorStyle.remove();
                    }

                    canvasContainer.style.cursor = 'default';

                    clearTimeout(hideTimeout);
                    hideTimeout = setTimeout(() => {
                        heightDisplayBox.style.display = 'none';
                    }, 1000);

                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);

                    localStorage.setItem('canvasHeight', canvasContainer.offsetHeight);
                }

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            }
        };

        canvasContainer.addEventListener('mousedown', handleMouseDown);

        handleDoubleClick = function (e) {
            if (localStorage.getItem("expandCanvasHeight") !== "true") {
                return;
            }

            // Double-click in the draggable area only
            const rect = canvasContainer.getBoundingClientRect();
            const isInDraggableArea = e.clientY > rect.bottom - resizeEdge;
            if (!isInDraggableArea) {
                return;
            }

            // Prevent double execution
            if (isDoubleClickProcessing) {
                return;
            }

            isDoubleClickProcessing = true;
            setTimeout(() => {
                isDoubleClickProcessing = false;
            }, 300);

            // Prevent event bubbling
            e.preventDefault();
            e.stopPropagation();

            const currentHeight = canvasContainer.offsetHeight;

            if (currentHeight === maxHeight) {
                const newHeight = localStorage.getItem("expandCanvasHeight") === "true" ? 172 : 140;
                canvasContainer.style.height = `${newHeight}px`;
            } else {
                canvasContainer.style.height = `${maxHeight}px`;
            }

            centerMetricsMonitorPanels();
            clearTimeout(hideTimeout);
            updateHeightDisplayBox(canvasContainer.offsetHeight);
            heightDisplayBox.style.display = 'block';

            hideTimeout = setTimeout(() => {
                heightDisplayBox.style.display = 'none';
            }, 1000);
        };

        canvasContainer.addEventListener('dblclick', handleDoubleClick);
    }

    // Function to disable height adjustment
    function disableHeightAdjustment() {
        if (canvasContainer) {
            canvasContainer.style.cursor = 'default';
        }

        isDragging = false;

        // Remove all mouse events related to dragging
        if (canvasContainer) {
            if (handleMouseMove) {
                canvasContainer.removeEventListener('mousemove', handleMouseMove);
            }
            if (handleMouseDown) {
                canvasContainer.removeEventListener('mousedown', handleMouseDown);
            }
            if (handleDoubleClick) {
                canvasContainer.removeEventListener('dblclick', handleDoubleClick);
            }
        }

        if (heightDisplayBox) {
            heightDisplayBox.style.display = 'none';
        }

        handleMouseMove = null;
        handleMouseDown = null;
        handleDoubleClick = null;
    }

    function setupCanvasCenteringObserver() {
        const cc = document.querySelector('.canvas-container');
        if (!cc) return;
        canvasCenteringObserver = new MutationObserver(function(mutations) {
            for (var i = 0; i < mutations.length; i++) {
                if (mutations[i].addedNodes.length > 0) {
                    centerMetricsMonitorPanels();
                    return;
                }
            }
        });
        canvasCenteringObserver.observe(cc, { childList: true });
    }

    expandCanvasHeight();
    setupCanvasCenteringObserver();
}

if (SIDEBAR_ADDITIONS_HIDE_BACKGROUND) {
// SIDE BAR MENU BUTTON "HIDE BACKGROUND"
createAdditionalCheckbox({
    checkboxId: "hide-bg-image",
    labelText: "Hide Background",
    tooltipText: "Enable to hide the background image.",
    localStorageKey: "bgImageHidden",
    onChangeCallback: function () {
        const bgImage = localStorage.getItem('bgImage');
        if (bgImage && bgImage.length > 5 && localStorage.getItem('theme') !== 'theme9' && localStorage.getItem('bgImageHidden') !== 'true') {
            document.body.style.background = `url(${bgImage}) top center / cover fixed no-repeat var(--color-main)`;
        } else {
            document.body.style.background = 'var(--color-main)';
        }
    }
});
}
}

// #################### MOVE MOBILE TRAY #################### //

if (MOVE_MOBILE_TRAY_TO_TOP) {
    function moveTray() {
        uiapeOnDomReady(function () {
            const mobileTray = document.getElementById("mobileTray");
            const playButton = mobileTray?.querySelector(".playbutton");

            // This whole feature is mobile-only (matches the 720px breakpoint used just below
            // for the content padding). Without this check, HIDE_MOBILE_TRAY's inline
            // "display: block" on the tray/play button overrides the .hide-desktop class's
            // CSS rule regardless of viewport, leaving the play button visible on desktop too.
            const isMobileViewport = window.innerWidth < 720;

            if (mobileTray && isMobileViewport) {
                // Move tray to top
                document.body.insertBefore(mobileTray, document.body.firstChild);

                // Position tray at top
                Object.assign(mobileTray.style, {
                    position: "fixed",
                    top: "0",
                    left: "0",
                    width: "100%",
                    zIndex: "15",
                });

                if (HIDE_MOBILE_TRAY) {
                    mobileTray.style.display = "block";
                    mobileTray.style.background = "none";
                    mobileTray.style.backdropFilter = "none";
                    mobileTray.style.border = "none";
                    mobileTray.style.boxShadow = "none";
                    mobileTray.style.padding = "0";

                    // Hide all except play button
                    const children = Array.from(mobileTray.children);
                    children.forEach(child => {
                        if (!child.classList.contains("playbutton")) {
                            child.style.display = "none";
                        } else {
                            child.style.display = "block";
                            child.style.position = "absolute";
                            child.style.top = "35px";
                            child.style.left = "50%";
                            child.style.transform = "translateX(-50%)";
                        }
                    });
                }

                else if (playButton) {
                    Object.assign(playButton.style, {
                        position: "absolute",
                        top: "35px",
                        left: "50%",
                        transform: "translateX(-50%)",
                    });
                }
            } else if (mobileTray && !isMobileViewport) {
                // Resized back up to desktop width: clear any inline overrides from a previous
                // mobile-width pass so .hide-desktop's own CSS rule can hide the tray again.
                ["position", "top", "left", "width", "zIndex", "display", "background", "backdropFilter", "border", "boxShadow", "padding"].forEach(prop => {
                    mobileTray.style[prop] = "";
                });
                Array.from(mobileTray.children).forEach(child => {
                    ["display", "position", "top", "left", "transform"].forEach(prop => {
                        child.style[prop] = "";
                    });
                });
            }

            // Adjust content padding
            const wrapper = document.querySelector('.wrapper-outer.dashboard-panel');
            if (wrapper) {
                if (window.innerWidth < 720) {
                    wrapper.style.setProperty('padding-top', '110px');
                } else {
                    wrapper.style.setProperty('padding-top', '20px', 'important');
                }
            }
        });
    }

    moveTray();

    window.addEventListener('resize', moveTray);
}

if (HIDE_MOBILE_TRAY && !MOVE_MOBILE_TRAY_TO_TOP) {
    uiapeOnDomReady(function () {
        const mobileTray = document.querySelector("div#mobileTray.hide-desktop");

        // Mobile-only, same 720px breakpoint used elsewhere in this file. Without this,
        // the inline "display: block" below overrides .hide-desktop's own CSS rule
        // regardless of viewport, leaving the play button visible on desktop too.
        if (mobileTray && window.innerWidth < 720) {
            // Hide all except .playbutton
            const children = Array.from(mobileTray.children);
            children.forEach(child => {
                if (!child.classList.contains("playbutton")) {
                    child.style.display = "none";
                } else {
                    child.style.display = "block";
                    child.style.position = "absolute";
                }
            });

            mobileTray.style.display = "block";
            mobileTray.style.background = "none";
            mobileTray.style.backdropFilter = "none";
            mobileTray.style.border = "none";
            mobileTray.style.boxShadow = "none";
            mobileTray.style.padding = "0";
        }
    });
}

// #################### STATUS BAR FOR DISPLAYS WITH LIMITED WIDTH #################### //

if (MOBILE_STATUS_BAR) {
uiapeOnDomReady(function () {
    function moveButtons() {
        if (MOBILE_STATUS_BAR_CONNECTION && /Mobi|Android/i.test(navigator.userAgent) && window.matchMedia("(orientation: landscape)").matches && uiapeMobileStatusBarConnectionFn) uiapeMobileStatusBarConnectionFn(true);

        const wrapper = document.querySelector('.wrapper-outer.dashboard-panel');
        const pluginContent = document.querySelector('.dashboard-panel-plugin-content');

        if (window.innerWidth < 720) {
            if (!document.querySelector("#button-container")) {
                wrapper.style.setProperty('padding-top', '30px');
                // Create new div
                const buttonContainer = document.createElement("div");
                buttonContainer.id = "button-container";
                buttonContainer.style.backgroundColor = "var(--color-1)";
                wrapper.insertBefore(buttonContainer, wrapper.firstChild);

                // Get buttons

                const streamSignalMeter = document.querySelector("#stream-signal-meter");
                const usersOnlineContainer = document.querySelector(".users-online-container") || document.querySelector("#users-online-container");
                const chatButton = document.querySelector(".chatbutton");
                const settingsButton = document.querySelector(".settings") || document.querySelector("#settings");

                // Move buttons into new div in order from left to right
                if (streamSignalMeter) buttonContainer.appendChild(streamSignalMeter);
                if (usersOnlineContainer && MOBILE_STATUS_BAR_SHOW_USERS) buttonContainer.appendChild(usersOnlineContainer);
                if (chatButton) buttonContainer.appendChild(chatButton);
                if (settingsButton) buttonContainer.appendChild(settingsButton);

                buttonContainer.style.position = "fixed";
                buttonContainer.style.top = "0";
                buttonContainer.style.left = "0";
                buttonContainer.style.width = "100%";
                buttonContainer.style.height = "48px";
                buttonContainer.style.maxHeight = "48px";
                buttonContainer.style.zIndex = "1";
                buttonContainer.style.opacity = "0.99";
                buttonContainer.style.padding = "0";
                buttonContainer.style.backgroundColor = "var(--color-1)";
                buttonContainer.style.display = "flex";
                buttonContainer.style.justifyContent = "space-between";
                buttonContainer.style.alignItems = "center";
                buttonContainer.style.margin = "0";
                buttonContainer.style.whiteSpace = "nowrap";

                const elements = [chatButton, MOBILE_STATUS_BAR_SHOW_USERS ? usersOnlineContainer : null, streamSignalMeter, settingsButton];
                elements.forEach(element => {
                    if (element) {
                        element.style.margin = "0px 16px 0px 16px";
                        element.style.verticalAlign = "top";
                        element.style.position = "static";
                        element.style.whiteSpace = "nowrap";
                        element.style.color = "var(--color-text)";
                        element.style.display = 'block';
                    }
                });

                // Set padding-top for wrapper
                const buttonHeight = buttonContainer.offsetHeight || 10;
                const adjustedMargin = buttonHeight - 20;
                wrapper.style.marginTop = adjustedMargin + "px";
                wrapper.style.zIndex = "12";
            }
        } else {
            // Remove div and move buttons back
            wrapper.style.removeProperty("margin-top");

            const buttonContainer = document.querySelector("#button-container");
            if (buttonContainer) {
                // Move buttons back to original position
                const streamSignalMeter = document.querySelector("#stream-signal-meter");
                const usersOnlineContainer = document.querySelector(".users-online-container") || document.querySelector("#users-online-container");
                const chatButton = document.querySelector(".chatbutton");
                const settingsButton = document.querySelector(".settings");

                // Place after because of Weather plugin or others
                if (pluginContent) {
                    if (settingsButton) pluginContent.after(settingsButton);
                    if (chatButton) pluginContent.after(chatButton);
                    if (usersOnlineContainer && MOBILE_STATUS_BAR_SHOW_USERS) pluginContent.after(usersOnlineContainer);
                    if (streamSignalMeter) pluginContent.after(streamSignalMeter);
                }

                buttonContainer.remove();

                const elements = [chatButton, MOBILE_STATUS_BAR_SHOW_USERS ? usersOnlineContainer : null, streamSignalMeter, settingsButton];
                elements.forEach(element => {
                    if (element) {
                        element.style.position = '';
                        element.style.display = '';
                        element.style.margin = '';
                        element.style.verticalAlign = '';
                        element.style.color = '';

                        element.style.backgroundColor = '';
                        element.style.border = '';
                    }
                });

                wrapper.style.setProperty('padding-top', '20px', 'important');
            }
        }
    }

    function debounceMoveButtons(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    const debouncedMoveButtons = debounceMoveButtons(moveButtons, 100);

    // Initial check
    moveButtons();

    window.addEventListener('resize', debouncedMoveButtons);
});
}

// #################### USER ICON WARNING COLOUR ON HIGH PING #################### //

if (MOBILE_STATUS_BAR_SHOW_USERS) {
// High ping check
setInterval(function() {
    let pingNumber = document.getElementById('current-ping')?.textContent.match(/\d+/)?.[0] || null;
    let iconUser = document.querySelector('i.fa-solid.fa-user');
    if (pingNumber > 800) {
        document.querySelector('i.fa-solid.fa-user').style.color = '#E21';
        iconUser.title = 'High ping detected';
    } else {
        document.querySelector('i.fa-solid.fa-user').style.removeProperty('color');
        iconUser.removeAttribute('title');
    }
}, 5000);

// ### ALWAYS SHOW USERS ONLINE ON MOBILE DEVICES ### //
// Skipped when MOBILE_STATUS_BAR is also on - moveButtons() then owns positioning this element instead, to avoid both fighting over position/top/right.
if (!MOBILE_STATUS_BAR && /Mobi|Android/i.test(navigator.userAgent) && !window.matchMedia("(orientation: landscape)").matches) {
    let styleElementUsers = document.createElement('style');
        styleElementUsers.textContent = `
        .wrapper-outer.dashboard-panel {
            padding-top: 30px !important;
        }
        `;
    document.head.appendChild(styleElementUsers);

    // Show online users on mobile
    if (window.innerWidth < 924) {
        let element = document.querySelector(".users-online-container") || document.getElementById('users-online-container');
        if (element) {
            element.classList.replace('hide-phone', 'show-phone');
            element.style.display = 'block';
            element.style.position = 'fixed';
            element.style.top = '-40px';
            element.style.right = '0px';
            element.style.color = 'var(--color-text)';
        }
    }
}
}

// #################### USER SIGNAL CONNECTION ON MOBILE DEVICES #################### //

if (MOBILE_STATUS_BAR_CONNECTION) {
function mobileStatusBarConnection(force) {
    if (/Mobi|Android/i.test(navigator.userAgent) && !window.matchMedia("(orientation: landscape)").matches || force) {
      
    // Create the WebSocket connection
    const currentURL = new URL(window.location.href);
    const WebserverURL = currentURL.hostname;
    const WebserverPath = currentURL.pathname.replace(/setup/g, '');
    const WebserverPORT = currentURL.port || (currentURL.protocol === 'https:' ? '443' : '80');
    const protocol = currentURL.protocol === 'https:' ? 'wss:' : 'ws:';
    const WEBSOCKET_URL = `${protocol}//${WebserverURL}:${WebserverPORT}${WebserverPath}data_plugins`;
    let wsSendSocket, elapsedTimeExtra, endTimeConnectionWatchdogTemp;
    let platform = 'unspecified'; // linux, win32, unspecified

    if (platform === 'win32') elapsedTimeExtra = 200; else if (platform === 'unspecified') elapsedTimeExtra = 100; else elapsedTimeExtra = 0;

    let elapsedTimeConnectionWatchdog = 0;
    let elapsedTimeConnectionWatchdogPeak = 0;

    let styleElementSCSM = document.createElement('style');
    styleElementSCSM.textContent = `
    @media only screen and (min-width: 768px) {
        #stream-signal-meter {
            display: none;
        }
    }

    .wrapper-outer.dashboard-panel {
        padding-top: 30px !important;
    }

    @media screen and (orientation: landscape) {
        #stream-signal-meter  {
            display: none !important;
        }
        .wrapper-outer.dashboard-panel {
            padding-top: 20px !important;
        }
    }

    #stream-signal-meter {
        background: transparent;
        border: 0;
        color: var(--color-text);
        position: absolute;
        top: 15px;
        right: 15px;
        font-size: 16px;
        width: 48px;
        height: 48px;
        line-height: 48px;
        text-align: center;
        border-radius: 14px;
        transition: 500ms ease background;
        cursor: pointer;
    }

    #stream-signal-meter:hover {
        background: var(--color-3);
    }

    .meter-container {
      opacity: 1;
      visibility: visible;
      transition: opacity 1.5s ease-in, visibility 1.5s ease-in;
    }

    .meter-container.fade-out {
      opacity: 0;
      visibility: hidden;
    }

    .meter-container.fade-in {
      opacity: 1;
      visibility: visible;
    }
    `;
    document.head.appendChild(styleElementSCSM);

    // Create and update stream signal meter
    function createSignalMeter(elapsedTimeConnectionWatchdog) {
        // Find the container to append the signal meter to
        const userOnlineContainer = document.querySelector(".users-online-container") || document.getElementById('users-online-container');

        // Create a wrapper for the signal meter
        const meterWrapper = document.createElement('div');
        meterWrapper.id = 'stream-signal-meter';
        meterWrapper.classList.add('show-phone');
        meterWrapper.style.position = 'fixed';
        meterWrapper.style.top = '-38px';
        meterWrapper.style.right = '48px';
        meterWrapper.style.display = 'flex';
        meterWrapper.style.flexDirection = 'column';
        meterWrapper.style.alignItems = 'center';
        meterWrapper.style.imageRendering = 'auto';
        meterWrapper.style.maxHeight = '80px';

        // Create a container for the signal meter
        const meterContainer = document.createElement('div');
        meterContainer.classList.add('meter-container');
        meterContainer.style.display = 'flex';
        meterContainer.style.flexDirection = 'row';
        meterContainer.style.alignItems = 'flex-end';
        meterContainer.style.width = '39px';
        meterContainer.style.height = '0px';
        meterContainer.style.margin = '40px 0 0 0';
        meterContainer.style.padding = '2px';
        meterContainer.style.boxSizing = 'border-box';
        meterContainer.style.visibility = 'visible';
        meterContainer.style.imageRendering = 'auto';

        meterContainer.style.marginTop = '22px';
        meterContainer.style.marginLeft = '15px';
        meterContainer.classList.add('fade-in', 'fa-solid', 'fa-lg', 'fa-stop');

        // Calculate bar width
        const totalWidth = 39; // Adjusted total width of meterContainer
        const numberOfBars = 5; // Number of bars
        const totalMargin = 4; // Total horizontal margin (2px each side of bar)
        const barWidth = (totalWidth - totalMargin) / numberOfBars;

        // Create bars
        const bars = [];
        for (let i = 0; i < 5; i++) {
            const bar = document.createElement('div');
            bar.style.width = `${barWidth}px`;
            bar.style.margin = '0 2px';
            bar.style.height = `${4 * (i + 1)}px`; // Incrementing height
            bar.style.backgroundColor = '#212223';
            bar.style.transition = 'background-color 0.3s';
            bar.style.visibility = 'hidden';
            bar.classList.add('bar-style');
            bars.push(bar);
            meterContainer.appendChild(bar);
        }



        // Function to update the signal bars based on elapsed time
        function updateSignalBars() {
          if (typeof Stream !== 'undefined') {
            if (elapsedTimeConnectionWatchdog === undefined || Stream == null) {
              setTimeout(() => {
                meterContainer.style.marginTop = '22px';
                meterContainer.style.marginLeft = '15px';
                meterContainer.classList.add('fade-out', 'fa-solid', 'fa-lg', 'fa-stop');

                const barsVisibility = document.querySelectorAll('.bar-style');
                barsVisibility.forEach(bar => {
                    bar.style.visibility = 'hidden';
                });

                return;
              }, 1000);
            } else {
              setTimeout(() => {
                meterContainer.style.margin = '32px 0 0 4px';
                meterContainer.classList.remove('fade-out', 'fa-solid', 'fa-lg', 'fa-stop');
                meterContainer.classList.add('fade-in');

                const barsVisibility = document.querySelectorAll('.bar-style');
                barsVisibility.forEach(bar => {
                    bar.style.visibility = 'visible';
                });

              }, 2000);
            }
          }

            let numBars;
            let colorBars;

            if (elapsedTimeConnectionWatchdog > 600 + elapsedTimeExtra) {
                numBars = 0;
                colorBars = '#212223';
            } else if (elapsedTimeConnectionWatchdog < (250 + (elapsedTimeExtra / 2))) {
                numBars = 5;
                colorBars = '#E6E6EE';
            } else if (elapsedTimeConnectionWatchdog < 300 + elapsedTimeExtra) {
                numBars = 4;
                colorBars = '#E3E3E6';
            } else if (elapsedTimeConnectionWatchdog < 400 + elapsedTimeExtra) {
                numBars = 3;
                colorBars = '#FFA50F';
            } else if (elapsedTimeConnectionWatchdog < 500 + elapsedTimeExtra) {
                numBars = 2;
                colorBars = '#FE0E0E';
            } else {
                numBars = 1;
                colorBars = '#FE0E0E';
            }

            // Update bar colours
            for (let i = 0; i < 5; i++) {
                if (i < numBars) {
                    bars[i].style.backgroundColor = colorBars;
                } else {
                    bars[i].style.backgroundColor = '#2E2628';
                }
            }
        }

        // Initial update
        updateSignalBars();

        // Append the container to the wrapper
        meterWrapper.appendChild(meterContainer);

        // Insert the wrapper after the specified element
        if (userOnlineContainer !== null) {
          userOnlineContainer.parentNode.insertBefore(meterWrapper, userOnlineContainer.nextSibling);
        }

        // Return a function to update the signal meter
        return function(newElapsedTime) {
            elapsedTimeConnectionWatchdog = newElapsedTime;
            updateSignalBars();
        };
    }

    setInterval(() => {
        if (typeof Stream !== 'undefined') {
            endTimeConnectionWatchdogTemp = performance.now();
            if (elapsedTimeConnectionWatchdogPeak < (endTimeConnectionWatchdogTemp - window.startTimeConnectionWatchdog)) {
                elapsedTimeConnectionWatchdogPeak = endTimeConnectionWatchdogTemp - window.startTimeConnectionWatchdog;
            }
        }
    }, 100);

    const updateSignalMeter = createSignalMeter(elapsedTimeConnectionWatchdog);

    setInterval(() => {
            updateSignalMeter(elapsedTimeConnectionWatchdogPeak);
            //console.log("Stream elapsed time peak:", elapsedTimeConnectionWatchdogPeak, "ms");
            elapsedTimeConnectionWatchdogPeak = 0;
    }, 1000);

    }
}

// Exposes mobileStatusBarConnection to moveButtons().
uiapeMobileStatusBarConnectionFn = mobileStatusBarConnection;

mobileStatusBarConnection();

// #stream-signal-meter needs to end up inside the status bar.
if (MOBILE_STATUS_BAR) {
    const uiapeExistingBar = document.querySelector("#button-container");
    const uiapeMeterEl = document.getElementById("stream-signal-meter");
    if (uiapeExistingBar && uiapeMeterEl) {
        uiapeExistingBar.insertBefore(uiapeMeterEl, uiapeExistingBar.firstChild);
        uiapeMeterEl.style.margin = "0px 16px 0px 16px";
        uiapeMeterEl.style.verticalAlign = "top";
        uiapeMeterEl.style.position = "static";
        uiapeMeterEl.style.whiteSpace = "nowrap";
        uiapeMeterEl.style.color = "var(--color-text)";
        uiapeMeterEl.style.display = "block";
    }
}
}

// #################### USER NOTICE FOR MULTIPLE USERS ONLINE #################### //

if (MULTIPLE_USERS_NOTICE) {
// Popup using togglePopup from modal.js
const popupId = "#popup-panel-mobile-settings";
function popupMethod(selector, title, contentHtml) {
    const $popup = $(selector);
    const $header = $popup.find(".popup-header");
    const $title = $header.find("p.color-4");
    if ($title.length && !$title.hasClass("popup-title")) $title.addClass("popup-title");
    $popup.find(".popup-title").text(title);
    $popup.find(".popup-content").html(`<p style="text-align: center;">${contentHtml}</p>`);
    setTimeout(() => {
        togglePopup(selector);
    }, 100);
}

let intervalIdUsersOnline = setInterval(function() {
    const usersOnlineElement = document.querySelector('.users-online-container') || document.getElementById('users-online-container');
    if (usersOnlineElement) {
        const usersOnline = parseInt(usersOnlineElement.textContent.trim());
        if (document.body.textContent.includes("You are logged in as an administrator.") || document.body.textContent.includes("You are logged in as an adminstrator.") || document.body.textContent.includes("You are logged in and can control the receiver.")) return;
        if (usersOnline >= 2) {
            if (MULTIPLE_USERS_NOTICE_NATIVE_POPUP) {
                popupMethod(popupId, MULTIPLE_USERS_NOTICE_MESSAGE_1, `${MULTIPLE_USERS_NOTICE_MESSAGE_2}<br><br>`);
            } else {
                if (usersOnline >= 2) alert(`<div class="popup-plugin-content">${MULTIPLE_USERS_NOTICE_MESSAGE_1}<br><br>${MULTIPLE_USERS_NOTICE_MESSAGE_2}<br><br></div>`, `OK`);
            }
        }
            
        clearInterval(intervalIdUsersOnline);
    }
}, 2000);
// Stop checking after 15 seconds
setTimeout(function() {
    clearInterval(intervalIdUsersOnline);
}, 15000);
}

// #################### RDS FLAG INDICATOR #################### //
// Runs unconditionally (not gated behind "if (RDS_FLAG_INDICATOR)") so the
// toggle itself is live: handle_RDS_FLAG_INDICATOR reads the current config on
// every message and adds/removes the bullet accordingly, instead of the setup
// only existing when the flag happened to be true at page load.
let uiapeRdsFlagLastProcessedTime = 0;
let uiapeRdsFlagReconnectAttempts = 0;
let uiapeRdsFlagDomReady = false;

const UIAPE_RDS_FLAG_TIMEOUT_DURATION = 75;

uiapeOnDomReady(() => {
    uiapeRdsFlagDomReady = true;
});

function uiapeConnectRdsFlagWebSocket() {
    if (window.socket.readyState === WebSocket.OPEN) {
        uiapeRdsFlagReconnectAttempts = 0;
    }

    window.socket.addEventListener('message', (event) => {
        handle_RDS_FLAG_INDICATOR(event);
    });

    window.socket.addEventListener('close', () => {
        console.log(`[${pluginName}] RDS_FLAG_INDICATOR: WebSocket closed. Attempting to reconnect...`);
        uiapeAttemptReconnectRdsFlag();
    });

    window.socket.addEventListener('error', (err) => {
        uiapeAttemptReconnectRdsFlag();
    });
}

function uiapeAttemptReconnectRdsFlag() {
    if (uiapeRdsFlagReconnectAttempts >= 500) return;

    setTimeout(() => {
        uiapeRdsFlagReconnectAttempts++;
        uiapeConnectRdsFlagWebSocket();
    }, 10000);
}

function handle_RDS_FLAG_INDICATOR(event) {
    const rtElement0 = document.querySelector('#data-rt0');
    const rtElement1 = document.querySelector('#data-rt1');

    if (!getUiapPanelConfig().RDS_FLAG_INDICATOR) {
        if (rtElement0 && rtElement0.querySelector('span.bullet')) rtElement0.removeChild(rtElement0.querySelector('span.bullet'));
        if (rtElement1 && rtElement1.querySelector('span.bullet')) rtElement1.removeChild(rtElement1.querySelector('span.bullet'));
        return;
    }

    const now = Date.now();

    if (now - uiapeRdsFlagLastProcessedTime < UIAPE_RDS_FLAG_TIMEOUT_DURATION) return;
    uiapeRdsFlagLastProcessedTime = now;

    const { rt_flag } = JSON.parse(event.data);
    const bullet = document.createElement('span');

    if (rtElement0 && rtElement0.querySelector('span.bullet')) rtElement0.removeChild(rtElement0.querySelector('span.bullet'));
    if (rtElement1 && rtElement1.querySelector('span.bullet')) rtElement1.removeChild(rtElement1.querySelector('span.bullet'));

    bullet.classList.add('bullet');
    bullet.textContent = '\u2022 ';
    bullet.style.position = 'absolute';
    bullet.style.marginLeft = '-18px';

    if (rtElement0) rtElement0.style.position = 'relative';
    if (rtElement1) rtElement1.style.position = 'relative';

    function updateBulletPoint(rt_flag) {
      if (rt_flag === 0 && rtElement0) {
        rtElement0.insertBefore(bullet, rtElement0.firstChild);
      } else if (rt_flag === 1 && rtElement1) {
        rtElement1.insertBefore(bullet, rtElement1.firstChild);
      }
    }

    if (uiapeRdsFlagDomReady) updateBulletPoint(rt_flag);
}

uiapeConnectRdsFlagWebSocket();

// #################### MULTIPATH INDICATOR #################### //

// Runs unconditionally on wide-enough viewports (not gated behind
// "if (MULTIPATH_INDICATOR)") so the toggle itself is live: addRandomIcon reads
// the current config on every call and adds/removes/rebuilds the icon
// accordingly, instead of the setup only existing when the flag happened to be
// true at page load.
if (innerWidth > 360) {
// PTY padding
const flagsContainer = document.querySelector('#flags-container-desktop.panel-33.user-select-none');
if (flagsContainer) {
  flagsContainer.style.paddingLeft = '2px';
  flagsContainer.style.paddingRight = '2px';
}

let uiapeMultipathDataFreq = 0;
let uiapeMultipathPrevFreq = 0;
let uiapeMultipathSig = 0;
let uiapeMultipathSigDisplay = "-";
let uiapeMultipathSigRaw = 0;
let uiapeMultipathTooltip = 0;
let uiapeMultipathTooltipSigRaw = 0;
let uiapeMultipathLastProcessedTime = 0;
let uiapeLastMultipathResult = false;

const UIAPE_MULTIPATH_THRESHOLD = 40;
const UIAPE_SIGNAL_THRESHOLD = 25;
const UIAPE_MULTIPATH_TIMEOUT_DURATION = 800;

socket.addEventListener("message", (event) => {
    const now = Date.now();

    if (now - uiapeMultipathLastProcessedTime < UIAPE_MULTIPATH_TIMEOUT_DURATION) return;
    uiapeMultipathLastProcessedTime = now;

    const { sigRaw, freq } = JSON.parse(event.data);

    if (sigRaw) {
        const sigRawValues = sigRaw.split(',');
        if (sigRawValues.length >= 2) {
            uiapeMultipathSigDisplay = sigRawValues[0].slice(2).trim();
            uiapeMultipathSig = Number(uiapeMultipathSigDisplay);

            function smoothInterpolation(sigRawValue) {
                if (sigRawValue <= 3) {
                  return 0;
                } else if (sigRawValue >= 40) {
                  return 100;
                }

                const normValue = (sigRawValue - 3) / (40 - 3);
                const smoothValue = Math.pow(normValue, 1);
                const scaledValue = smoothValue * 100;
                return parseInt(scaledValue);
            }

            uiapeMultipathSigRaw = Number(sigRawValues[1]);

            if (!getUiapPanelConfig().IS_TEF_RADIO) {
                uiapeMultipathTooltip = uiapeMultipathSigRaw;
            } else {
                uiapeMultipathTooltip = smoothInterpolation(uiapeMultipathSigRaw);
            }
            uiapeMultipathTooltipSigRaw = (uiapeMultipathSig > UIAPE_SIGNAL_THRESHOLD) ? uiapeMultipathTooltip + '%' : '-';
        } else {
            console.error(`[${pluginName}] Multipath indicator sigRaw data format invalid`);
        }
    }

    if (freq || document.getElementById("data-frequency").textContent) {
        uiapeMultipathDataFreq = Number(freq) || Number(document.getElementById("data-frequency").textContent);
        if (freq !== 0 && uiapeMultipathPrevFreq !== uiapeMultipathDataFreq) {
            uiapeMultipathPrevFreq = uiapeMultipathDataFreq;
            uiapeMultipathSigRaw = 0;
            uiapeMultipathTooltip = 0;
            addRandomIcon(false);
            return;
        }
        uiapeMultipathPrevFreq = uiapeMultipathDataFreq;
    }

    if (uiapeMultipathSig > UIAPE_SIGNAL_THRESHOLD && uiapeMultipathTooltip > UIAPE_MULTIPATH_THRESHOLD) {
        addRandomIcon(true);
    } else if (uiapeMultipathSig > (UIAPE_SIGNAL_THRESHOLD * 1.333) && uiapeMultipathTooltip > (UIAPE_MULTIPATH_THRESHOLD / 1.333)) {
        addRandomIcon('half');
    } else {
        addRandomIcon(false);
    }

    function initTooltipsMultipath(target = null) {
        // Define scope: all tooltips or specific one if target is provided
        const tooltips = target ? $(target) : $('.tooltip');
        
        // Unbind existing event handlers before rebinding to avoid duplication
        tooltips.off('mouseenter mouseleave');
        
        tooltips.hover(function () {
            if ($(this).closest('.popup-content').length) {
                return;
            }
            
            var tooltipText = $(this).data('tooltip');
            var placement = $(this).data('tooltip-placement') || 'top'; // Default to 'top'
            
            // Clear existing timeouts
            $(this).data('timeout', setTimeout(() => {
                //$('.tooltip-wrapper').remove();
                
                var tooltip = $(`
                    <div class="tooltip-wrapper">
                        <div class="tooltiptext">${tooltipText}</div>
                    </div>
                `);
                    $('body').append(tooltip);
                    
                    var tooltipEl = $('.tooltiptext');
                    var tooltipWidth = tooltipEl.outerWidth();
                    var tooltipHeight = tooltipEl.outerHeight();
                    var targetEl = $(this);
                    var targetOffset = targetEl.offset();
                    var targetWidth = targetEl.outerWidth();
                    var targetHeight = targetEl.outerHeight();
                    
                    // Compute position
                    var posX, posY;
                    switch (placement) {
                        case 'bottom':
                        posX = targetOffset.left + targetWidth / 2 - tooltipWidth / 2;
                        posY = targetOffset.top + targetHeight + 10;
                        break;
                        case 'left':
                        posX = targetOffset.left - tooltipWidth - 10;
                        posY = targetOffset.top + targetHeight / 2 - tooltipHeight / 2;
                        break;
                        case 'right':
                        posX = targetOffset.left + targetWidth + 10;
                        posY = targetOffset.top + targetHeight / 2 - tooltipHeight / 2;
                        break;
                        case 'top':
                        default:
                        posX = targetOffset.left + targetWidth / 2 - tooltipWidth / 2;
                        posY = targetOffset.top - tooltipHeight - 10;
                        break;
                    }
                    
                    // Apply positioning
                    tooltipEl.css({ top: posY, left: posX, opacity: 1 });

                    // For touchscreen devices
                    if ((/Mobi|Android|iPhone|iPad|iPod|Opera Mini/i.test(navigator.userAgent)) && ('ontouchstart' in window || navigator.maxTouchPoints)) {
                        setTimeout(() => { $('.tooltiptext').remove(); }, 5000);
                    }
                    
                }, 300));
            }, function () {
                clearTimeout($(this).data('timeout'));
                
                setTimeout(() => {
                    $('.tooltip-wrapper').fadeOut(300, function () {
                        $(this).remove(); 
                    });
                }, 100); 
            });
            
            $('.popup-content').off('mouseenter').on('mouseenter', function () {
                clearTimeout($('.tooltip').data('timeout'));
                $('.tooltip-wrapper').fadeOut(300, function () {
                    $(this).remove(); 
                });
            });
    }

    if (typeof initTooltipsMultipath === 'function') initTooltipsMultipath();
});

function addRandomIcon(result) {
    uiapeLastMultipathResult = result;
    const cfg = getUiapPanelConfig();

    // Check if RDS_ICON_STYLE mode is active
    const isRdsStyleMode = !!document.querySelector('#signalPanel #signal-icons');

    // Map icon names to their element IDs/selectors
    const iconIdMap = {
        'STEREO': '#stereoIcon',
        'PTY': '#ptyLabel',
        'MS': '#msIcon',
        'ECC': '#eccWrapper',
        'TP': '#tpIcon',
        'TA': '#taIcon',
        'RDS': '#rdsIcon'
    };

    const attachToId = iconIdMap[String(cfg.MULTIPATH_ATTACH_TO || 'STEREO').toUpperCase()] || '#stereoIcon';

    const targetSpan = isRdsStyleMode
        ? document.querySelector(`#signalPanel #signal-icons ${attachToId}`)
        : document.querySelector('.wrapper-outer #wrapper .flex-container .flex-container #flags-container-desktop.panel-33.user-select-none span.pointer.stereo-container');

  if (targetSpan) {
    // Search the whole document, not just the new target's parent - the previous
    // icon can live under a different parent if MULTIPATH_ATTACH_TO just changed
    // (pre-existing bug, shared with the original plugin, only ever visible now
    // that attach-to no longer requires a reload).
    const existingIcon = document.querySelector('span.multipath-container');
    if (existingIcon) {
      existingIcon.remove();
    }

    if (!cfg.MULTIPATH_INDICATOR) return;

    const iconSpan = document.createElement('span');
    iconSpan.classList.add('multipath-container');
    //if (!cfg.METRICS_MONITOR_PLUGIN_IS_INSTALLED) {
        iconSpan.style.marginLeft = `${!cfg.IS_VISUALEQ_PLUGIN_ENABLED && (cfg.RDS_ICON_STYLE || isRdsStyleMode) ? cfg.MULTIPATH_LEFT_PADDING : 8}px`;
        iconSpan.style.marginTop = `${!cfg.IS_VISUALEQ_PLUGIN_ENABLED && (cfg.RDS_ICON_STYLE || isRdsStyleMode) ? 0 : 2}px`;
    //}
    iconSpan.style.verticalAlign = 'middle';
    iconSpan.style.fontSize = '16px';
    iconSpan.style.position = 'relative';

    if (!result) {
      iconSpan.classList.remove('opacity-full');
      iconSpan.classList.add('opacity-half');
      iconSpan.style.color = 'var(--color-text)';
    } else {
      if (result === 'half') {
          iconSpan.style.opacity = '0.5';
      } else {
          iconSpan.style.opacity = '1';
      }
      iconSpan.style.color = 'var(--color-text)';
      iconSpan.classList.remove('opacity-half');
      iconSpan.classList.add('opacity-full');
      iconSpan.style.color = 'var(--color-text)';
    }

    const iconElement = document.createElement('div');
    iconElement.className = 'fa-solid fa-mountain-sun';
    //iconElement.className = 'fa-solid fa-mountain-city';
    //iconElement.className = 'fa-solid fa-link-slash';
    //iconElement.className = 'fa-solid fa-building-shield';
    //iconElement.className = 'fa-solid fa-mountain';

    const displayMode = String(cfg.MULTIPATH_DISPLAY_MODE || "ICON").toUpperCase();
    const showMultipathIcon = displayMode !== "TEXT";
    const showMultipathText = displayMode !== "ICON";

    const signalText = (Number.isFinite(uiapeMultipathSig) && uiapeMultipathSigDisplay !== "") ? uiapeMultipathSigDisplay : "-";
    const multipathText = uiapeMultipathTooltipSigRaw || "-";
    const tooltipText = `Multipath/Co-channel indicator. <br><strong>Signal: ${signalText} dBf, Multipath: ${multipathText}`;

    const textElement = document.createElement('span');
    textElement.classList.add('multipath-rfmp-text');
    textElement.innerHTML = `<span>RF: ${signalText} dBf</span><span>MP: ${multipathText}</span>`;

    if (showMultipathIcon) iconSpan.appendChild(iconElement);
    if (showMultipathText) iconSpan.appendChild(textElement);

    if (isRdsStyleMode) {
      iconSpan.classList.add('tooltip');
      iconSpan.setAttribute('data-tooltip', tooltipText);
    } else {
      const tooltipSpan = document.createElement('span');
      tooltipSpan.classList.add('overlay', 'tooltip');
      tooltipSpan.setAttribute('data-tooltip', tooltipText);
      if (showMultipathIcon) iconElement.appendChild(tooltipSpan);
      else iconSpan.appendChild(tooltipSpan);
    }

    targetSpan.parentNode.insertBefore(iconSpan, targetSpan.nextSibling);

    if (typeof initTooltipsMultipath === 'function') initTooltipsMultipath();
  } else {
    console.error(`[${pluginName}] Multipath indicator target span not found!`);
  }
}

// Exposes addRandomIcon to uiapeAfterConfigChange (defined earlier, at top-level
// scope, outside this gated block) so MULTIPATH_INDICATOR and its sub-settings
// can re-apply immediately instead of waiting for the next signal message.
uiapeReapplyMultipathIndicator = () => addRandomIcon(uiapeLastMultipathResult);

addRandomIcon(false);
}

// #################### TUNE DELAY #################### //

if (TUNE_DELAY_ENABLE) {
if (TUNE_DELAY || TUNE_DELAY_IF_MORE_THAN_ONE_USER) {
const tuneDelay = TUNE_DELAY * 1000;
let onScreenTimerDelay = TUNE_DELAY_IF_MORE_THAN_ONE_USER;
let showIcon = !!onScreenTimerDelay;
let displayIcon = true;
let lockTuning;
let lockIconTimeoutId = null; // lets userUnlockTuning cancel a pending icon-insert before it fires

uiapeOnDomReady(() => {
    if (uiapeDetectAdminSession()) return;

    // Intercept keybinds while locked, but allow keys inside #popup-panel-chat
    document.addEventListener('keydown', (e) => {
      if (!lockTuning) return; // no lock, do nothing

      const chatPanel = document.getElementById('popup-panel-chat');
      if (chatPanel && chatPanel.contains(e.target)) {
        // allow key events inside the chat
        return;
      }

      const loginForm = document.getElementById('login-form');
      if (loginForm && loginForm.contains(e.target)) {
        // allow key events inside
        return;
      }

      // Modifier-key combos (Ctrl/Alt/Shift/Meta) are never used by the webserver's own tuning shortcuts.
      if (e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) {
        return;
      }

      // Only block the specific bare keys used by the webserver's own tuning shortcuts.
      const tuningKeys = ['b', 'r', 's', 'u', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'delete', 'f1', 'f2', 'f3', 'f4'];
      if (!tuningKeys.includes(e.key.toLowerCase())) {
        return;
      }

      // block everything else
      e.stopImmediatePropagation();
      e.preventDefault();
    }, true);

    // Intercept stereo/mono toggle clicks
    document.addEventListener('click', (e) => {
      if (!lockTuning) return;
      if (e.target.closest('.stereo-container')) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    }, true);

    function lockIconStatus() {
      if (showIcon) {
        const tunerName = document.querySelector('.dashboard-panel-plugin-content');
        const panel = document.querySelector('.dashboard-panel .panel-100-real');
        const lockIcon = panel?.querySelector('.user-requests-lock');
        if (lockIcon) panel.removeChild(lockIcon);

        const lockIconHTML = '<i style="padding: 10px 6px 12px 6px; font-size: 18px; color: var(--color-4);" class="fa-solid fa-lock pointer user-requests-lock" aria-label="Tuner is currently locked."></i>';
        lockIconTimeoutId = setTimeout(() => {
            if (displayIcon) tunerName.insertAdjacentHTML('afterend', lockIconHTML);
            displayIcon = false; // prevent double display
        }, (TUNE_DELAY * 1000) + 1000);

        const isMobilePortrait = window.innerWidth <= 768 && window.innerHeight > window.innerWidth;
        if (isMobilePortrait) {
          const lockIcon = panel?.querySelector('.user-requests-lock');
          if (lockIcon) {
            lockIcon.style.position = 'absolute';
            lockIcon.style.bottom = '10px';
            lockIcon.style.right = '12px';          
          }
        }
      }
    }

    function userLockTuning() {
      lockTuning = true;

      // Buttons
      const elementScannerDown = document.getElementById('scanner-down');
      const elementScannerUp = document.getElementById('scanner-up');
      const elementSearchDown = document.getElementById('search-down');
      const elementSearchUp = document.getElementById('search-up');
      const elementFreqDown = document.getElementById('freq-down');
      const elementFreqUp = document.getElementById('freq-up');

      // Disable scanner/search buttons
      if (elementScannerDown && elementScannerUp) {
        elementScannerDown.disabled = true;
        elementScannerUp.disabled = true;
      } else if (elementSearchDown && elementSearchUp) {
        elementSearchDown.disabled = true;
        elementSearchUp.disabled = true;
      }

      // Disable freq buttons
      if (elementFreqDown) elementFreqDown.disabled = true;
      if (elementFreqUp) elementFreqUp.disabled = true;

      // Disable click on containers
      const containers = [
        document.querySelector('.data-eq'),
        document.querySelector('.data-ims'),
        document.getElementById('data-ant'),
        document.getElementById('data-ant-phone'),
        document.getElementById('data-bw'),
        document.getElementById('freq-container'),
        document.getElementById('tune-buttons'),
        document.getElementById('plugin-button-presets'),
        ...document.querySelectorAll('.stereo-container')
      ];

      containers.forEach(el => {
        if (el) el.style.pointerEvents = 'none';
      });

      lockIconStatus();
    }

    userLockTuning();

    function userUnlockTuning(tuneDelay) {
      // Cancel the pending lock-icon insert immediately - it's fixed to page-load time and can otherwise still fire after this unlock is already decided.
      clearTimeout(lockIconTimeoutId);
      setTimeout(() => {
        lockTuning = false;

        // Buttons
        const elementScannerDown = document.getElementById('scanner-down');
        const elementScannerUp = document.getElementById('scanner-up');
        const elementSearchDown = document.getElementById('search-down');
        const elementSearchUp = document.getElementById('search-up');
        const elementFreqDown = document.getElementById('freq-down');
        const elementFreqUp = document.getElementById('freq-up');

        // Re-enable scanner/search buttons
        if (elementScannerDown && elementScannerUp) {
          elementScannerDown.disabled = false;
          elementScannerUp.disabled = false;
        } else if (elementSearchDown && elementSearchUp) {
          elementSearchDown.disabled = false;
          elementSearchUp.disabled = false;
        }

        // Re-enable freq buttons
        if (elementFreqDown) elementFreqDown.disabled = false;
        if (elementFreqUp) elementFreqUp.disabled = false;

        // Re-enable click on containers
        const containers = [
          document.querySelector('.data-eq'),
          document.querySelector('.data-ims'),
          document.getElementById('data-ant'),
          document.getElementById('data-ant-phone'),
          document.getElementById('data-bw'),
          document.getElementById('freq-container'),
          document.getElementById('tune-buttons'),
          document.getElementById('plugin-button-presets'),
          ...document.querySelectorAll('.stereo-container')
        ];

        containers.forEach(el => {
          if (el) el.style.pointerEvents = 'auto';
        });

        document.querySelectorAll(".dashboard-panel-plugin-list").forEach(el => {
            el.style.pointerEvents = "auto";
        });

        // Remove lock icon
        if (showIcon) {
          displayIcon = false;
          const tunerName = document.querySelector('.dashboard-panel .panel-100-real');
          const lockIcon = tunerName?.querySelector('.user-requests-lock');
          if (lockIcon) {
            const panel = lockIcon.closest('.panel-100-real');
            panel?.removeChild(lockIcon);
          }
        }
      }, tuneDelay);
    }

    if (TUNE_DELAY_IF_MORE_THAN_ONE_USER && TUNE_DELAY_IF_MORE_THAN_ONE_USER < TUNE_DELAY) onScreenTimerDelay = TUNE_DELAY;
    if (TUNE_DELAY > TUNE_DELAY_IF_MORE_THAN_ONE_USER) userUnlockTuning(tuneDelay);

    let userOnlineCount = 0;
    let lastProcessedTime = 0;
    let isFirstTimeRun = true;
    let timeoutScheduled = false;

    const TIMEOUT_DURATION = 500;

    // Define the handler as a named function
    function handleMessage(event) {
        if (isFirstTimeRun) {
            if (!timeoutScheduled) {
                timeoutScheduled = true;
                setTimeout(() => {
                    isFirstTimeRun = false;
                }, 1000);
            }
            return;
        }

        const now = Date.now();
        if (now - lastProcessedTime < TIMEOUT_DURATION) return;
        lastProcessedTime = now;

        const { users } = JSON.parse(event.data);

        if (users > -1) {
            userOnlineCount = Number(users);

            if (userOnlineCount >= 2 && onScreenTimerDelay && !isCountdownTimerRunning) {
                lockIconStatus();
                userCountdownTimer();
                document.getElementById("tune-buttons").style.pointerEvents = "none";
                document.querySelectorAll(".dashboard-panel-plugin-list").forEach(el => {
                    el.style.pointerEvents = "none";
                });
            }

            if (userOnlineCount <= 1) {
                if (!isCountdownTimerRunning) {
                    userUnlockTuning(tuneDelay);
                } else {
                    userUnlockTuning(0);
                }
                document.getElementById("ui-addon-countdown-wrapper")?.remove();

                document.querySelectorAll(".dashboard-panel-plugin-list").forEach(el => {
                    el.style.pointerEvents = "auto";
                });

                socket.removeEventListener("message", handleMessage);
            }

            if (userOnlineCount === 0) userUnlockTuning(0);
        }
    }

    socket.addEventListener("message", handleMessage);

    let isCountdownTimerRunning = false;
    
    function userCountdownTimer() {
        isCountdownTimerRunning = true;
        // Set countdown time in seconds
        let countdownTime = onScreenTimerDelay;

        // Function for end of countdown
        function onCountdownEnd() {
            document.getElementById("ui-addon-countdown-wrapper")?.remove();
            userUnlockTuning(0);
        }

        let isTimerMinimized = false;

        function createTimer() {
            const wrapper = document.createElement('div');
            wrapper.id = "ui-addon-countdown-wrapper";
            wrapper.style.position = 'fixed';
            wrapper.style.top = '29%';
            wrapper.style.left = '50%';
            wrapper.style.transform = 'translate(-50%, -50%)';
            wrapper.style.zIndex = '99';
            wrapper.style.fontFamily = "'Titillium Web', sans-serif";
            wrapper.style.fontSize = '48px';
            wrapper.style.color = 'var(--color-1)';
            wrapper.style.backgroundColor = 'var(--color-4)';
            wrapper.style.padding = '10px 24px 0px 24px';
            wrapper.style.borderRadius = '14px';
            wrapper.style.boxShadow = '0 0 14px var(--color-2)';
            wrapper.style.opacity = '0.9';
            wrapper.style.cursor = 'pointer';
            wrapper.style.transition = 'transform 0.3s ease';
            wrapper.style.userSelect = 'none';

            wrapper.addEventListener('click', () => {
                isTimerMinimized = !isTimerMinimized;
                if (isTimerMinimized) {
                    wrapper.style.transform = 'translate(-50%, -50%) scale(0.5)';
                } else {
                    wrapper.style.transform = 'translate(-50%, -50%) scale(1)';
                }
            });

            const timerText = document.createElement('div');
            timerText.id = 'timer';
            wrapper.appendChild(timerText);

            document.body.appendChild(wrapper);
        }

        // Update timer display
        function updateDisplay(seconds) {
            const timerElement = document.getElementById("timer");
            if (timerElement) {
                timerElement.innerHTML = `
                  <div style="text-align: center;">
                    <div style="font-size: 20px; text-transform: uppercase; margin-bottom: 0;">
                      Tuner in use
                    </div>
                    <div style="font-size: 18px; text-transform: uppercase; margin-bottom: -12px;">
                      Time remaining before tuning is unlocked
                    </div>
                    <div style="font-size: 36px;">${seconds}</div>
                  </div>
                `;
            }
        }

        // Start countdown
        function startCountdown(duration, callback) {
            let remaining = duration;
            updateDisplay(remaining);

            const intervalId = setInterval(() => {
                remaining--;
                if (remaining >= 0) {
                    updateDisplay(remaining);
                }

                if (remaining < 0) {
                    clearInterval(intervalId);
                    callback();
                }
            }, 1000);
        }

        createTimer();
        startCountdown(countdownTime, onCountdownEnd);
    }
});
}
}

// +++++++++++++++ STEP 4b (fallback) +++++++++++++++ //
// End of the DOM/behavioral feature blocks. If your new feature doesn't resemble
// anything above, add its own new section here: a header comment followed by
// "if (MY_NEW_FEATURE) { ... }", same shape as the sections above it.

// #################### DEFAULT SIGNAL UNIT #################### //

if (DEFAULT_SIGNAL_UNIT) {
if (!localStorage.getItem('signalUnit')) {
  switch (DEFAULT_SIGNAL_UNIT) {
    case 1:
      localStorage.setItem('signalUnit', 'dbf');
      break;
    case 2:
      localStorage.setItem('signalUnit', 'dbuv');
      break;
    case 3:
      localStorage.setItem('signalUnit', 'dbm');
      break;
    default:
      // Ignore
  }
}
}

// #################### VOLUME PERCENTAGE #################### //

if (VOLUME_PERCENTAGE_TOAST) uiapeSetupVolumeToast();

// #################### SORT PLUGIN BUTTON ORDER #################### //

// SORT_PLUGIN_BUTTONS / PLUGINS_USER_ORDER now live in uiapeBuildLiveCss() (see UIAPE_LIVE_CSS_KEYS)
// so the ordering CSS applies instantly from the panel without needing a reload.

if (!IS_VISUALEQ_PLUGIN_ENABLED && (RDS_ICON_STYLE || LED_GLOW_EFFECT_ICONS_METRICS_MONITOR_PLUGIN || RDS_ICON_STYLE_REMOVE_RDS_ICON) && innerWidth > 360) {

const isFirefox = /firefox/i.test(navigator.userAgent);

// Preset resolution used to be a fixed snapshot here (ACTIVE_PRESET etc, computed
// once from RDS_ICON_PRESET at load). It's now resolved fresh on every call via
// uiapeGetActiveRdsPreset()/uiapeResolveLiveRdsIconHeight() (top-level, near
// uiapeBuildLiveCss), so insertSignalPanel() can safely rebuild the icon panel
// whenever RDS_ICON_PRESET or RDS_ICON_STYLE_PRESETS changes.

/////////////////////////////////////////////////////////////////
///                                                           ///
///  METRICSMONITOR CLIENT SCRIPT FOR FM-DX-WEBSERVER (V1.0a) ///
///                                                           ///
///  by Highpoint               last update: 27.11.2025       ///
///                                                           ///
///  https://github.com/Highpoint2000/metricsmonitor          ///
///                                                           ///
/////////////////////////////////////////////////////////////////

//
// --------------------------------------------------------------
//  CSS
// --------------------------------------------------------------
//
const style = document.createElement('style');
style.innerHTML = `
#signalPanel {
  display: flex;
  justify-content: flex-start;
  flex-direction: column;
  padding: 10px;
  box-sizing: border-box;
}

#signal-icons img.status-icon {
  height: 14px;
  width: auto;
  display: block;
  opacity: 0.9;
  user-select: none;
  pointer-events: none;
}

#signal-icons .multipath-container {
  position: relative;
  cursor: pointer;
  pointer-events: auto;
}

#signal-icons .multipath-rfmp-text,
.multipath-container .multipath-rfmp-text {
  display: inline-flex;
  flex-direction: column;
  gap: 1px;
  margin-left: 4px;
  margin-bottom: 4px;
  width: 46px;
  min-width: 46px;
  line-height: 1;
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0;
  vertical-align: middle;
  align-items: flex-start;
  text-align: left;
  white-space: nowrap;
}

.multipath-rfmp-text span {
    font-size: 105%;
}

#signalPanel.compact-meters #signal-icons img.status-icon {
  height: 10px;
}

#signal-icons #stereoIcon {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 0;
  margin-right: 1px;
  transform: translateY(-1px);
  transform-origin: center;
}

#signal-icons #stereoIcon .circle-container {
  display: flex;
  gap: 2px;
}

#signal-icons #stereoIcon.stereo-off .circle-container .circle,
#signal-icons #stereoIcon.stereo-off .circle-container {
  box-shadow: none;
  background-color: inherit;
}

#signal-icons .tooltip {
  position: relative;
  cursor: pointer;
}

#signal-icons #stereoIcon.tooltip::after,
#signal-icons .multipath-container.tooltip::after {
  display: none !important;
}

${RDS_ICON_STYLE ? `
/* PTY Label (Enhanced-owned row only; Metrics Monitor styles its own #ptyLabel) */
#ptyLabel {
  font-size: 13px;
  color: #fff;
  text-align: center;
  min-width: 96px;
  position: relative;
  border: 1px solid #fff;
  border-radius: 3px;
  padding: 0 4px;
  box-sizing: border-box;
  margin: 0;
  flex-shrink: 0;
}
` : ''}

/* BW Label */
#bwLabel {
  font-size: 13px;
  color: #fff;
  text-align: center;
  min-width: 64px;
  position: relative;
  border: 1px solid #fff;
  border-radius: 3px;
  padding: 0 4px;
  box-sizing: border-box;
  margin: 0;
  flex-shrink: 0;
}

/* ECC Wrapper */
#eccWrapper {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  opacity: 0.9;
}
`;
// Before the live style element so live-toggle rules can still override these static ones.
document.head.insertBefore(style, uiapeLiveStyleElement || uiapeStyleAnchor);

// Keep the UIAP config launcher above the signal icons after RDS/Stereo icons rebuild, without letting the signal panel cover native modals.
const uiapeConfigPanelSignalHardeningStyle = document.createElement('style');
uiapeConfigPanelSignalHardeningStyle.id = 'uiape-config-panel-signal-hardening-style';
uiapeConfigPanelSignalHardeningStyle.textContent = `
  #signalPanel.uiape-config-host {
    position: relative !important;
    z-index: 2 !important;
    isolation: auto !important;
  }
  body.uiape-native-modal-open #signalPanel.uiape-config-host {
    z-index: 1 !important;
  }
  #signalPanel.uiape-config-host #uiape-config-gear {
    transform: none !important;
    z-index: 899 !important;
  }
  #uiape-config-panel {
    transform: none !important;
    z-index: 900 !important;
    text-align: left !important;
    background: var(--color-1, #111) !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }
  #uiape-config-panel,
  #uiape-config-panel .uiape-config-section,
  #uiape-config-panel .uiape-config-label,
  #uiape-config-panel .uiape-config-label strong,
  #uiape-config-panel .uiape-config-label span,
  #uiape-config-panel .uiape-config-muted,
  #uiape-config-panel .uiape-preset-summary,
  #uiape-config-panel .uiape-plugin-map,
  #uiape-config-panel input,
  #uiape-config-panel textarea,
  #uiape-config-panel select {
    text-align: left !important;
  }
  #uiape-config-panel .uiape-config-close,
  #uiape-config-panel .uiape-plugin-order-add,
  #uiape-config-panel .uiape-mini-button,
  #uiape-config-panel .uiape-config-footer button {
    text-align: center !important;
  }
  #uiape-config-panel textarea {
    height: 30px !important;
    min-height: 30px !important;
    max-height: 160px !important;
    line-height: 18px !important;
    resize: vertical !important;
  }
  #uiape-config-panel textarea[data-uiape-key="PLUGINS_USER_ORDER"] {
    height: 50px !important;
    min-height: 50px !important;
    max-height: 180px !important;
  }
  #uiape-config-panel .uiape-plugin-edit-row input {
    height: 30px !important;
    min-height: 30px !important;
    max-height: 30px !important;
    line-height: 16px !important;
    padding-top: 2px !important;
    padding-bottom: 2px !important;
  }
  #uiape-config-panel code {
    font-family: inherit !important;
    font-size: inherit !important;
    font-weight: 700 !important;
    color: var(--color-main-bright, var(--color-4)) !important;
    background: transparent !important;
    padding: 0 !important;
  }

`;
document.head.appendChild(uiapeConfigPanelSignalHardeningStyle);

//
// --------------------------------------------------------------
//  Logging helpers
// --------------------------------------------------------------
//
function logInfo(...msg) {
  console.log("[UIAddonPackEnhanced (MetricsMonitor)]", ...msg);
}

function logError(...msg) {
  console.error("[UIAddonPackEnhanced (MetricsMonitor)]", ...msg);
}

//
// --------------------------------------------------------------
//  WebSocket URLs
// --------------------------------------------------------------
//
const currentURL     = window.location;
const WebserverPORT  = currentURL.port || (currentURL.protocol === 'https:' ? '443' : '80');
const protocol       = currentURL.protocol === 'https:' ? 'wss:' : 'ws:';
const WebserverURL   = currentURL.hostname;
const WebserverPath  = '';

const WEBSOCKET_URL  = `${protocol}//${WebserverURL}:${WebserverPORT}${WebserverPath}/data_plugins`;

//
// --------------------------------------------------------------
//  TextSocket (RDS / PTY / ECC / TP / TA / RDS)
// --------------------------------------------------------------
//
let TextSocket;
let levels = { hf: 0 };

const PTY_TABLE = [
  "PTY", "News", "Current Affairs", "Info",
  "Sport", "Education", "Drama", "Culture", "Science", "Varied",
  "Pop Music", "Rock Music", "Easy Listening", "Light Classical",
  "Serious Classical", "Other Music", "Weather", "Finance",
  "Children's Programmes", "Social Affairs", "Religion", "Phone-in",
  "Travel", "Leisure", "Jazz Music", "Country Music", "National Music",
  "Oldies Music", "Folk Music", "Documentary"
];

// webp images
let rds_off_webp_1, rds_on_webp_1, rds_off_webp_2, rds_on_webp_2;

rds_off_webp_1 = 'data:image/webp;base64,UklGRlQEAABXRUJQVlA4TEgEAAAv/kEoEA8wbdM2bfMf8JDb2FZgMRchmZASKIXSIHNbm7kNSiAkWPEC4L7HfjmP6P8E4HenZPx0F5H4U7L+UtvEnRyLZso+moxN0UhUyNlZyN5rxCoZPIekCkZi0A9Fla2C7j2IA1AZoSqTdPMUVN5IVFXOSRWsvKYRRZWsgqZfyFZJMxQPVZiHKppJZJVYiUbIpHNWnqtXvFXgHibqglXkGhMANKvGJa4zXhetMjeuJKvCvYz7jHCTAYDOZTNnVK50hafkSjELTGXyhyLzMOlD6cbghBh2jYkfykxnwocKMxj/IfmO+8C7yY+IuOW1ejVO5TFE8BtzKUCVwnjMW16TAExF+46sAcDIm7mrNg79EDQeQEuMA6ZmLgCmqm4cgEfzWvVd1ABAjYphVVXPUhb8UXQrzE1S5M1ebpTl/QaAppFT17Qlfapt8gces+djMKiarqpWdckLNuVSuTN/7v25oRiXip3YPUsG0BTPkjbdIv9fmkWxyx94F2Haqds9G6dwmmTQlnghmKXPJIthV03Kz4k/9dO7REW4ERURwDxMkQh0iy5SiGIVviNBJwcRCQoYZVXd+FuZEbcbh6YZi1cMTaAC0DfuS1nzUv4bopEtbiXOc21TgPqhuHkXj6l6F6d4N4NIzDl/q1iknfuIfAxLBDrjl8lF4DGodsEgEHOBYm4aEw38Dl9JBu5aAB4mG+ALVSV0AdCYQpUTmKLLjFjIbhKiS7uieTTvjXjPAxiMU4UbmeiKyjkAfVOXbPQwXoVd1rRdPdQL+QMOACYRNOlKYoZdsOqqxj2UW8bmWZIVzDIOySTiIcYpKqLZYLB9rHAnUJhMI5Lda9CvvCIRaEu0qx+bi0cTKQe8JvlT7VuyOkUl+vJvKQbhAuaFKRKAztQNNEPxd5EvZKJ/6VkK0LlnEw5h46zapbF4aj8Wz2Roq4m36jbQzCVYjSX90ms0F39w7xKt5hLtXqt3cRtZw62xJKP6c8/GGzlFNmq35oJ+o2/cJwo1F6xjA9LtZMWpLWI0l0JU/zlRBZtn40yeTSaeuKknEZFiVZa+SUTLTFF5Rk7vJjJl82jqBVF12bQlq4JF2wViiDOB3bvzxCth6Ye65EMk6qHK3lFxGUti5pIM5gHklLzMT7CFEZFF1qjKdpmoIuKBR5GA91JSJGBsAvBwhXg0kXhERBxENy4Foi1nrxI7T3TOMf2Su9CWeHJmIAcHnT81RWFeqlDtTmbmpWAVrTL13AmM0AlAX8IpWnmicpGqmq5wxHMrGRVYhc9kpnGewiYbRaZzDsBY/KmcBheYwYGbN5xVsRCbAvalsuK9kM0S4QhnEqlOheW1eilPNcorxsabgK4UvpI5MEXTN8EiKl4ibeYCIlo4xSDinUkUKBvhNW2TDKKmEvgK1POQVc8m65JuHOJORKRcgf45OFXdlIMcvQF2Gb/bN+GH6ga/PEQk/hSmJJwB';
rds_on_webp_1  = 'data:image/webp;base64,UklGRlwEAABXRUJQVlA4TFAEAAAv/UEoEA8w//M///Mf8KDbSFZo21oIA5MQCIXQ4OklhvQSQfoJYGKgvYwFsxacH0BE/yeAfpc50U9PZg6/VJmZyy8NwWFT+Zg1fAwma5M1HLB6YovKe6cpVtGgH6KGvVExmIesSkbsdd+BRUMK1JCo47PXsDMqqgZElTdipxlAVkUrr5kXklXULEWHMtKhrGEwqYpVUVQkqtiKHdauOCuPdSTovFXABuKJaFgNLGITcbpglbB1JVpl7EPomYIxWMTEkhVb5StT4ZB6J5t5pCHpoYB0JD4UbyysAMtuIOGhhEzEP5SRhbiHyjP8wrdJnZlJflafgnWOFheE6HuHZSZqnLF+y2kiEWnqM3XjiWilDTNzIaLPhGgevMYR0YiKpWFmLkSkaxsioq6ZVnMXFEW0oBhWTdVFFuTfoF1UpM22ikxE3SKL70cqMDVDRJNmNjbph/pbxaJppqqJZNBEEnWTf4h+7/u5pVg28ZTtil236iJupkUy6f9fwyLbpQc+UZAhwp0uWMEmQzFEuODN4jPxqWaSLeZb7E5T+FNQ+BvBYB2YORBNi8mcgWzwCf8Oe7PKzF5RjZKOpbuVED4s4YiqZgmnWBqv6Rt6KWkG5N4omiXKtQixQ4iIZSZqD4XNt+uqT5Di2ywgYt8mvZWRc9zRI+WtsglEE2AnGA9E3aDZeQMPMDMXDW8GEgzcpjwTDeiaJ+pI0pUnmqZimYgGkqF8qkjWJaBa1B0hRRd3WdM1341wzxHRAljnbyRgKhpGRDQ3TSSjjjhNOSTN2LVDu5AeIIl4TbwSkWXnraZqYB0iuTZdRKtqlk7RJFA/0ToFRTBbQNl1o0J3PETQAKLdZzCvfMyBaIhg1x5j6Wgw5wN9Jump8VTdkKIBU/wnsoG/QDeY2RNNpImiWop/oryQgPlSF5loYn3jD38Fm41LS/yB9ks4JJG2mTiraVMVbuOtloi/9NnQxh3oE8GKZbD7rD5Bsm78rSWiUfu5vnFGpEhG4xYzc6F5Y27oiQwxM5fNEgWouyoKMEQxYpmB5l6rOm/TBdv0TQJ62LRDFdkqi7mJwEhIVjmgAt8mIHnTNc2usmqWzRBJ5S3GzgOLbardt3PAx17MQxPpEIB2aLwnKIglIkCbaMD7gjAnwU+gGajMhYjqJqiSXQIaMzuirohE36WoiERr44k6loGuCUBnZqbKunXJA0OcnarYOWBihMxLdGGIcGCzgiyoGLjTUGTkgzI07iSEL3mrYJWgfscDFYtENIU/BSsHNCxATTMVBPZb0Sib+WcSMjAH1U0yCsjEiIiWcKd8WphHFlQwukJW2aLYZOiDkuK7kMwiQCe2CdCEvPisPshBA3KKtXEWheCGFHolYRXJmrnxFgGjD4gbZuaCBAtSLiDcYTBrBuA0YxMNgqadCj1SSH1Kqr5Juqhbh4DkG4X0/UCqtsm7enIGdZcOvzg3/oeaKPTLi5nDTxFzpDM=';

rds_off_webp_2 = 'data:image/webp;base64,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';
rds_on_webp_2  = 'data:image/webp;base64,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';

function uiapeGetRdsIconWebp(isOn) {
  const type = getUiapPanelConfig().RDS_INDICATOR_ICON_TYPE;
  return type === 1
    ? (isOn ? rds_on_webp_1 : rds_off_webp_1)
    : (isOn ? rds_on_webp_2 : rds_off_webp_2);
}

const off_opacity = REDUCE_HALF_OPACITY === true ? '0.6' : '0.9';

async function setupTextSocket() {
  if (TextSocket && TextSocket.readyState !== WebSocket.CLOSED) {
    return;
  } else {
      setTimeout(setupTextSocket, 10000);
  }

  try {
    TextSocket = await window.socket;

    TextSocket.addEventListener("open", () => {
      logInfo("TextSocket connected.");
    });

    TextSocket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      handleTextSocketMessage(message);
    });

    TextSocket.addEventListener("error", (error) => {
      logError("TextSocket error:", error);
    });

    TextSocket.addEventListener("close", () => {
      setTimeout(() => {
          logInfo("TextSocket closed.");
      }, 800);
      setTimeout(setupTextSocket, 5000);
    });
  } catch (error) {
    logError("Failed to setup TextSocket:", error);
    setTimeout(setupTextSocket, 5000);
  }
}

// Music/Speech
function ensurePtyOverlayIcon() {
    // Check if MS icon already exists
    let icon = document.getElementById("ptyIconOverlay");

    if (!icon) {
        //  Ccreate MS if not in the configured rows it with absolute positioning next to PTY
        icon = document.createElement("span");
        icon.id = "ptyIconOverlay";

        icon.style.color = "#fff";
        icon.style.fontSize = "13px";
        icon.style.lineHeight = "1.4";
        icon.style.border = "1px solid #696969";
        icon.style.borderRadius = "3px";
        icon.style.padding = "0 8px";
        icon.style.opacity = "0.9";
        icon.style.display = "inline-flex";
        icon.style.alignItems = "center";
        icon.style.justifyContent = "center";
        icon.style.height = "17px";
        icon.style.minWidth = "30px";

        // Use absolute positioning next to PTY
        icon.style.position = "absolute";
        icon.style.top = "50%";
        icon.style.transform = "translateY(-50%)";
        icon.style.marginTop = "1px";

        const ptyLabel = document.getElementById("ptyLabel");
        if (ptyLabel && ptyLabel.parentNode) {
            ptyLabel.parentNode.style.position = "relative";
            if (RDS_ICON_STYLE) ptyLabel.parentNode.appendChild(icon);
        }
    }
    return icon;
}

let lastBwUpdate = 0; // Used for bandwidth

function handleTextSocketMessage(message) {
  // Re-read config-derived values on every message (instead of the module-level
  // snapshots taken at page load) so colour/glow/opacity settings below apply
  // in real time, since this handler already fires continuously as station
  // data streams in.
  const liveRdsCfg = getUiapPanelConfig();
  const MS_INDICATOR_COLOR = liveRdsCfg.MS_INDICATOR_COLOR;
  const MS_INDICATOR_COLOR_OFF = liveRdsCfg.MS_INDICATOR_COLOR_OFF;
  const LED_GLOW_EFFECT_ICONS_RDS_ICON_STYLE_MS = liveRdsCfg.LED_GLOW_EFFECT_ICONS_RDS_ICON_STYLE_MS;
  const RDS_ICON_STYLE_MS_OFF_AS_LETTERS = liveRdsCfg.RDS_ICON_STYLE_MS_OFF_AS_LETTERS;
  const PTY_INDICATOR_COLOR = liveRdsCfg.PTY_INDICATOR_COLOR;
  const PTY_INDICATOR_COLOR_OFF = liveRdsCfg.PTY_INDICATOR_COLOR_OFF;
  const LED_GLOW_EFFECT_ICONS_RDS_ICON_STYLE_PTY = liveRdsCfg.LED_GLOW_EFFECT_ICONS_RDS_ICON_STYLE_PTY;
  const REDUCE_HALF_OPACITY = liveRdsCfg.REDUCE_HALF_OPACITY;
  const off_opacity = REDUCE_HALF_OPACITY === true ? '0.6' : '0.9';
  const RDS_INDICATOR_ICON_COLOR = liveRdsCfg.RDS_INDICATOR_ICON_COLOR;
  const RDS_INDICATOR_ICON_COLOR_OFF = liveRdsCfg.RDS_INDICATOR_ICON_COLOR_OFF;
  const LED_GLOW_EFFECT_ICONS = liveRdsCfg.LED_GLOW_EFFECT_ICONS;
  const RDS_INDICATOR_ICON_GLOW_INTENSITY = liveRdsCfg.RDS_INDICATOR_ICON_GLOW_INTENSITY;
  const TP_INDICATOR_ICON_COLOR = liveRdsCfg.TP_INDICATOR_ICON_COLOR;
  const TP_INDICATOR_ICON_COLOR_OFF = liveRdsCfg.TP_INDICATOR_ICON_COLOR_OFF;
  const TA_INDICATOR_ICON_COLOR = liveRdsCfg.TA_INDICATOR_ICON_COLOR;
  const TA_INDICATOR_ICON_COLOR_OFF = liveRdsCfg.TA_INDICATOR_ICON_COLOR_OFF;
  const BANDWIDTH_UPDATE_INTERVAL = liveRdsCfg.BANDWIDTH_UPDATE_INTERVAL;
  const LED_GLOW_EFFECT_ICONS_BANDWIDTH = liveRdsCfg.LED_GLOW_EFFECT_ICONS_BANDWIDTH;
  const STEREO_ICON_COLOR = liveRdsCfg.STEREO_ICON_COLOR;

  // HF-Level
  if (message.sig !== undefined) {
    levels.hf = Math.round((message.sig - 7) * 10) / 10;
  }

  // --- PTY ---
  if (message.pty !== undefined) {
    let ptyIndex = Number(message.pty);
    if (Number.isNaN(ptyIndex) || ptyIndex < 0 || ptyIndex >= PTY_TABLE.length) {
      ptyIndex = 0;
    }
    const ptyText = PTY_TABLE[ptyIndex];

    const ptyLabel = document.getElementById("ptyLabel");
    const ptyIcon = ensurePtyOverlayIcon();

    if (ptyLabel) {
      ptyLabel.textContent = ptyText;

      // --- message.ms ---
      ptyIcon.innerHTML = "";

      if (message.ms === 0) {
        ptyIcon.innerHTML = `<i class="fa-solid fa-microphone" style="position: relative; top: ${isFirefox ? '0' : '1'}px; min-width: 12px;"></i>`;
        applyTextIndicatorColor(ptyIcon, true, MS_INDICATOR_COLOR, MS_INDICATOR_COLOR_OFF, LED_GLOW_EFFECT_ICONS_RDS_ICON_STYLE_MS);
        ptyIcon.style.opacity = "0.9";
      } else if (message.ms === 1) {
        ptyIcon.innerHTML = `<i class="fa-solid fa-music" style="position: relative; top: ${isFirefox ? '0' : '1'}px; min-width: 12px;"></i>`;
        applyTextIndicatorColor(ptyIcon, true, MS_INDICATOR_COLOR, MS_INDICATOR_COLOR_OFF, LED_GLOW_EFFECT_ICONS_RDS_ICON_STYLE_MS);
        ptyIcon.style.opacity = "0.9";
      } else {
        if (ptyText === "PTY") {
          ptyIcon.innerHTML = `
            <span style="position: relative; display: inline-block; min-width: 12px; min-height: 13px;">
              ${RDS_ICON_STYLE_MS_OFF_AS_LETTERS === false ?
              `<i class="fa-solid fa-music" style="position: absolute; top: ${isFirefox ? '0.5' : '1'}px; left: 0; opacity: 0.15;"></i>
              <i class="fa-solid fa-microphone" style="position: absolute; top: ${isFirefox ? '0.5' : '1'}px; left: 1.5px; opacity: 0.1;"></i>`
              :
              `<i class="fa-solid fa-m" style="font-size: 10px; position: absolute; top: ${isFirefox ? '1' : '1'}px; left: -2.5px; opacity: 0.33;"></i>
              <i class="fa-solid fa-s" style="font-size: 10px; position: absolute; top: ${isFirefox ? '1' : '1'}px; left: 8.5px; opacity: 0.33;"></i>`}
            </span>
          `;
        } else {
          ptyIcon.innerHTML = `
            <span style="position: relative; display: inline-block; min-width: 12px; min-height: 13px;">
              <i class="fa-solid fa-question" style="font-size: 10px; position: absolute; top: ${isFirefox ? '0.5' : '1'}px; left: 0; opacity: 0.33; min-width: 12px; min-height: 13px;"></i>
            </span>`;
        }
        ptyIcon.style.border = "1px solid #696969";
        applyTextIndicatorColor(ptyIcon, false, MS_INDICATOR_COLOR, MS_INDICATOR_COLOR_OFF, LED_GLOW_EFFECT_ICONS_RDS_ICON_STYLE_MS);
        ptyIcon.style.opacity = off_opacity;
      }

      // PTY label styling
      if (ptyText === "PTY") {
        applyTextIndicatorColor(ptyLabel, false, PTY_INDICATOR_COLOR, PTY_INDICATOR_COLOR_OFF, LED_GLOW_EFFECT_ICONS_RDS_ICON_STYLE_PTY);
        ptyLabel.style.fontWeight = "bold";
        if (REDUCE_HALF_OPACITY) ptyLabel.style.opacity = off_opacity;
      } else {
        applyTextIndicatorColor(ptyLabel, true, PTY_INDICATOR_COLOR, PTY_INDICATOR_COLOR_OFF, LED_GLOW_EFFECT_ICONS_RDS_ICON_STYLE_PTY);
        ptyLabel.style.fontWeight = "600";
        if (REDUCE_HALF_OPACITY) ptyLabel.style.opacity = '1';
      }
    }

    // Background color of the signal panel depending on PTY presence
    const panel = document.getElementById('signalPanel');
    if (panel) {
      if (ptyText !== "PTY") {
        panel.style.setProperty('background-color', 'var(--color-2-transparent)', 'important');
      } else {
        panel.style.setProperty('background-color', 'var(--color-1-transparent)', 'important');
      }
    }
  }

  // --- ECC ---
  const eccWrapper = document.getElementById('eccWrapper');
  if (eccWrapper) {
    // Clear previous content each update
    eccWrapper.innerHTML = "";

    const hasEcc = message.ecc !== undefined && message.ecc !== null && message.ecc !== "";

    if (!hasEcc) {
      const noEcc = document.createElement('span');
      noEcc.textContent = 'ECC';
      noEcc.style.color = '#696969';
      noEcc.style.fontSize = '13px';
      noEcc.style.fontWeight = 'bold';
      noEcc.style.border = "1px solid #696969";
      noEcc.style.borderRadius = "3px";
      noEcc.style.padding = '0 3px 0 3px';
      noEcc.style.display = 'inline-flex';
      noEcc.style.alignItems = 'center';
      noEcc.style.height = '17px';
      noEcc.style.paddingBottom = '0.5px'; // Value that aligns for both Firefox and Chrome
      if (REDUCE_HALF_OPACITY) noEcc.style.opacity = off_opacity;
      eccWrapper.appendChild(noEcc);
    } else {
      const eccSpan = document.querySelector('.data-flag');
      if (eccSpan && eccSpan.innerHTML.trim() !== "") {
      const newSpan = eccSpan.cloneNode(true);
      newSpan.style.marginLeft = "5.25px"; // Reduce margin to align flag icons
      newSpan.style.marginTop = "0";
      newSpan.style.transform = "translateY(0)";
      newSpan.style.display = "inline-flex";
      newSpan.style.alignItems = "center";
      newSpan.style.height = "17px";
      newSpan.style.lineHeight = "17px";
      eccWrapper.appendChild(newSpan);
      } else {
        // Fallback
        const noEcc = document.createElement('span');
        noEcc.textContent = 'ECC';
        noEcc.style.color = '#696969';
        noEcc.style.fontSize = '13px';
        eccWrapper.appendChild(noEcc);
      }
    }
  }

  // --- Stereo ---
  const stereoIcon = document.getElementById('stereoIcon');
  if (stereoIcon) {
    if (message.st === true) {
      stereoIcon.classList.add('stereo-on');
      stereoIcon.classList.remove('stereo-off');
    } else {
      stereoIcon.classList.add('stereo-off');
      stereoIcon.classList.remove('stereo-on');
    }
  }

    /**
     * Convert any hex colour to a CSS filter to recolour a white icon.
     * Optionally add a glowing effect with customisable intensity.
     */
    function colorToFilter(hexColor, addGlow = false, glowIntensity = 1.0, customFilter = {}) {
        if (!/^#[0-9A-Fa-f]{6}$/.test(hexColor)) {
            console.warn(`[${pluginName}] Invalid hex color. Please use a valid hex color (e.g., #RRGGBB).`);
            return '';
        }
    
        const { r, g, b } = hexToRgb(hexColor);
    
        // Neutral colours need a direct grayscale filter.
        if (r === g && g === b) {
            const neutral = `brightness(0) saturate(100%) invert(${Math.round((r / 255) * 100)}%)`;
            if (addGlow && glowIntensity > 0 && r > 0) {
                return neutral + createGlowEffect(hexColor, glowIntensity);
            }
            return neutral;
        }
    
        const rNorm = r / 255;
        const gNorm = g / 255;
        const bNorm = b / 255;
    
        const luma = 0.2126 * rNorm + 0.7152 * gNorm + 0.0722 * bNorm;
    
        let invert = 1 - luma;
        invert = Math.max(0.08, Math.min(0.92, invert));
    
        const maxRGB = Math.max(rNorm, gNorm, bNorm);
        const minRGB = Math.min(rNorm, gNorm, bNorm);
    
        let saturation = Math.round((maxRGB - minRGB) * 4200);
        saturation = Math.max(1800, Math.min(saturation, 4200));
    
        const hue = rgbToHue(rNorm, gNorm, bNorm);
    
        let sepiaOffset = 48;
    
        if (hue > 330 || hue < 30) {
            sepiaOffset = 38;      // reds
        } else if (hue >= 90 && hue < 170) {
            sepiaOffset = 30;      // greens
        } else if (hue >= 170 && hue < 260) {
            sepiaOffset = 22;      // cyan / blue
        } else if (hue >= 260 && hue < 330) {
            sepiaOffset = 36;      // magenta
        }
    
        let filterHue =
            luma < 0.08 || luma > 0.95
                ? 0
                : ((hue - sepiaOffset + 360) % 360);
    
        filterHue = ((filterHue % 360) + 360) % 360;
    
        let brightness = customFilter.brightness ?? 108;
        let contrast = customFilter.contrast ?? 122;
    
        if (luma < 0.18) {
            brightness += 8;
            contrast += 6;
        }
    
        if (luma > 0.75) {
            brightness -= 4;
            contrast += 4;
        }
    
        const isRed = hue > 340 || hue < 18;
        const isBrownOrange = hue >= 18 && hue < 45 && luma < 0.55;
    
        if (isRed) {
            saturation = Math.round(saturation * 1.34);
            brightness += 12;
            contrast += 8;
        }
    
        if (isBrownOrange) {
            saturation = Math.round(saturation * 1.28);
            brightness += 10;
            contrast += 6;
        }
    
        saturation = Math.max(1800, Math.min(saturation, 5200));
    
        const filter = [
            `invert(${Math.round(invert * 100)}%)`,
            `sepia(8%)`,
            `saturate(${Math.round(saturation)}%)`,
            `hue-rotate(${Math.round(filterHue)}deg)`,
            `brightness(${Math.round(brightness)}%)`,
            `contrast(${Math.round(contrast)}%)`
        ].join(' ');
    
        if (addGlow && glowIntensity > 0) {
            return filter + createGlowEffect(hexColor, glowIntensity);
        }
    
        return filter;
    }

    // Convert hex to RGB
    function hexToRgb(hexColor) {
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        return { r, g, b };
    }

    // Calculate Hue from RGB
    function rgbToHue(r, g, b) {
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0;

        if (max !== min) {
            if (max === r) h = ((g - b) / (max - min) + 6) % 6;
            else if (max === g) h = (b - r) / (max - min) + 2;
            else h = (r - g) / (max - min) + 4;
            h *= 60;
        }
        return h;
    }

    // Create glow effect using rgba
    function createGlowEffect(hexColor, glowIntensity) {
        const { r, g, b } = hexToRgb(hexColor);
        const alpha = glowIntensity;

        // Create a glowing effect with multiple drop shadows
        const glow = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        return [
            ` drop-shadow(0 0 3px ${glow})`,
            ` drop-shadow(0 0 6px ${glow})`,
            ` drop-shadow(0 0 9px ${glow})`
        ].join(' ');
    }


    const RDS_AUTO_FILTER_CACHE = new Map();

    function clampCssFilterValue(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function multiplyCssMatrix(a, b) {
        return [
            a[0] * b[0] + a[1] * b[5] + a[2] * b[10],
            a[0] * b[1] + a[1] * b[6] + a[2] * b[11],
            a[0] * b[2] + a[1] * b[7] + a[2] * b[12],
            0, 0,
            a[5] * b[0] + a[6] * b[5] + a[7] * b[10],
            a[5] * b[1] + a[6] * b[6] + a[7] * b[11],
            a[5] * b[2] + a[6] * b[7] + a[7] * b[12],
            0, 0,
            a[10] * b[0] + a[11] * b[5] + a[12] * b[10],
            a[10] * b[1] + a[11] * b[6] + a[12] * b[11],
            a[10] * b[2] + a[11] * b[7] + a[12] * b[12],
            0, 0,
            0, 0, 0, 1, 0
        ];
    }

    function applyCssFilterToRgb(rgb, values) {
        let r = 0;
        let g = 0;
        let b = 0;

        // invert
        const invertAmount = values[0] / 100;
        r = invertAmount + r * (1 - 2 * invertAmount);
        g = invertAmount + g * (1 - 2 * invertAmount);
        b = invertAmount + b * (1 - 2 * invertAmount);

        // sepia
        let matrix = [
            0.393 + 0.607 * (1 - values[1] / 100), 0.769 - 0.769 * (1 - values[1] / 100), 0.189 - 0.189 * (1 - values[1] / 100), 0, 0,
            0.349 - 0.349 * (1 - values[1] / 100), 0.686 + 0.314 * (1 - values[1] / 100), 0.168 - 0.168 * (1 - values[1] / 100), 0, 0,
            0.272 - 0.272 * (1 - values[1] / 100), 0.534 - 0.534 * (1 - values[1] / 100), 0.131 + 0.869 * (1 - values[1] / 100), 0, 0,
            0, 0, 0, 1, 0
        ];
        let nr = r * matrix[0] + g * matrix[1] + b * matrix[2];
        let ng = r * matrix[5] + g * matrix[6] + b * matrix[7];
        let nb = r * matrix[10] + g * matrix[11] + b * matrix[12];
        r = nr; g = ng; b = nb;

        // saturate
        matrix = [
            0.213 + 0.787 * values[2] / 100, 0.715 - 0.715 * values[2] / 100, 0.072 - 0.072 * values[2] / 100, 0, 0,
            0.213 - 0.213 * values[2] / 100, 0.715 + 0.285 * values[2] / 100, 0.072 - 0.072 * values[2] / 100, 0, 0,
            0.213 - 0.213 * values[2] / 100, 0.715 - 0.715 * values[2] / 100, 0.072 + 0.928 * values[2] / 100, 0, 0,
            0, 0, 0, 1, 0
        ];
        nr = r * matrix[0] + g * matrix[1] + b * matrix[2];
        ng = r * matrix[5] + g * matrix[6] + b * matrix[7];
        nb = r * matrix[10] + g * matrix[11] + b * matrix[12];
        r = nr; g = ng; b = nb;

        // hue-rotate
        const angle = values[3] / 180 * Math.PI;
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);
        matrix = [
            0.213 + cos * 0.787 - sin * 0.213, 0.715 - cos * 0.715 - sin * 0.715, 0.072 - cos * 0.072 + sin * 0.928, 0, 0,
            0.213 - cos * 0.213 + sin * 0.143, 0.715 + cos * 0.285 + sin * 0.140, 0.072 - cos * 0.072 - sin * 0.283, 0, 0,
            0.213 - cos * 0.213 - sin * 0.787, 0.715 - cos * 0.715 + sin * 0.715, 0.072 + cos * 0.928 + sin * 0.072, 0, 0,
            0, 0, 0, 1, 0
        ];
        nr = r * matrix[0] + g * matrix[1] + b * matrix[2];
        ng = r * matrix[5] + g * matrix[6] + b * matrix[7];
        nb = r * matrix[10] + g * matrix[11] + b * matrix[12];
        r = nr; g = ng; b = nb;

        // brightness + contrast
        r *= values[4] / 100;
        g *= values[4] / 100;
        b *= values[4] / 100;
        r = (r - 0.5) * values[5] / 100 + 0.5;
        g = (g - 0.5) * values[5] / 100 + 0.5;
        b = (b - 0.5) * values[5] / 100 + 0.5;

        rgb.r = clampCssFilterValue(Math.round(r * 255), 0, 255);
        rgb.g = clampCssFilterValue(Math.round(g * 255), 0, 255);
        rgb.b = clampCssFilterValue(Math.round(b * 255), 0, 255);
    }

    function rdsAutoFilterLoss(target, values) {
        const rgb = { r: 0, g: 0, b: 0 };
        applyCssFilterToRgb(rgb, values);
        return Math.abs(rgb.r - target.r) + Math.abs(rgb.g - target.g) + Math.abs(rgb.b - target.b);
    }

    function solveRdsAutoFilter(hexColor) {
        const target = hexToRgb(hexColor);

        if (target.r === 0 && target.g === 0 && target.b === 0) {
            return 'brightness(0) saturate(100%)';
        }
        if (target.r === 255 && target.g === 255 && target.b === 255) {
            return 'brightness(0) saturate(100%) invert(100%)';
        }

        const cacheKey = hexColor.toUpperCase();
        if (RDS_AUTO_FILTER_CACHE.has(cacheKey)) return RDS_AUTO_FILTER_CACHE.get(cacheKey);

        let best = { values: [50, 20, 3750, 0, 100, 100], loss: Infinity };
        const starts = [
            [50, 100, 3750, 0, 100, 100],
            [40, 100, 5000, 120, 100, 100],
            [60, 100, 5000, 240, 100, 100],
            [70, 80, 3000, 300, 120, 100],
            [30, 100, 7500, 60, 100, 110]
        ];
        const steps = [30, 30, 3000, 90, 40, 40];

        for (const seed of starts) {
            let current = seed.slice();
            let currentLoss = rdsAutoFilterLoss(target, current);
            let localSteps = steps.slice();

            for (let round = 0; round < 28; round++) {
                let improved = false;

                for (let i = 0; i < current.length; i++) {
                    for (const direction of [-1, 1]) {
                        const next = current.slice();
                        next[i] += localSteps[i] * direction;
                        next[0] = clampCssFilterValue(next[0], 0, 100);
                        next[1] = clampCssFilterValue(next[1], 0, 100);
                        next[2] = clampCssFilterValue(next[2], 0, 10000);
                        next[3] = ((next[3] % 360) + 360) % 360;
                        next[4] = clampCssFilterValue(next[4], 0, 200);
                        next[5] = clampCssFilterValue(next[5], 0, 200);

                        const loss = rdsAutoFilterLoss(target, next);
                        if (loss < currentLoss) {
                            current = next;
                            currentLoss = loss;
                            improved = true;
                        }
                    }
                }

                if (!improved) localSteps = localSteps.map(step => step * 0.55);
                if (Math.max(...localSteps) < 0.25 || currentLoss === 0) break;
            }

            if (currentLoss < best.loss) best = { values: current, loss: currentLoss };
        }

        const v = best.values;
        const filter = [
            'brightness(0)',
            'saturate(100%)',
            `invert(${Math.round(v[0])}%)`,
            `sepia(${Math.round(v[1])}%)`,
            `saturate(${Math.round(v[2])}%)`,
            `hue-rotate(${Math.round(v[3])}deg)`,
            `brightness(${Math.round(v[4])}%)`,
            `contrast(${Math.round(v[5])}%)`
        ].join(' ');

        RDS_AUTO_FILTER_CACHE.set(cacheKey, filter);
        return filter;
    }

    function clearRdsIndicatorInlinePaint(rdsIcon) {
        // Keep the original image-based rendering intact. Only clear properties
        // that were introduced by earlier mask experiments.
        rdsIcon.style.filter = '';
        rdsIcon.style.backgroundColor = '';
        rdsIcon.style.webkitMaskImage = '';
        rdsIcon.style.webkitMaskSize = '';
        rdsIcon.style.webkitMaskRepeat = '';
        rdsIcon.style.webkitMaskPosition = '';
        rdsIcon.style.maskImage = '';
        rdsIcon.style.maskSize = '';
        rdsIcon.style.maskRepeat = '';
        rdsIcon.style.maskPosition = '';
        rdsIcon.style.display = '';
        rdsIcon.style.width = '';
        rdsIcon.style.height = '';
        rdsIcon.style.objectFit = '';
    }

    function getComputedStereoIconHex() {
        const stereoIcon = document.querySelector('.circle.data-st');
        if (stereoIcon) {
            const borderColor = getComputedStyle(stereoIcon).borderColor;
            const computedHex = normalizeHexColor(borderColor);
            if (computedHex) return computedHex;
        }

        const cssVarHex = normalizeHexColor(
            getComputedStyle(document.documentElement).getPropertyValue('--uiape-stereo-icon-color')
        );
        if (cssVarHex) return cssVarHex;

        return resolveIconColor(STEREO_ICON_COLOR);
    }

    function resolveStatusIconColor(color, fallback = "") {
        return color === "auto"
            ? getComputedStereoIconHex()
            : resolveIconColor(color, fallback);
    }

    function applyTextIndicatorColor(icon, isOn, activeColorSetting, offColorSetting, glowEnabled, glowIntensity = RDS_INDICATOR_ICON_GLOW_INTENSITY) {
        const activeColor = resolveStatusIconColor(activeColorSetting, "");
        const offColor = resolveStatusIconColor(offColorSetting, "");
        
        const color = isOn
            ? (activeColor || "#FFFFFF")
            : (offColor || "#696969");

        icon.style.color = color;
        icon.style.borderColor = color;

        if (isOn && glowEnabled && color) {
            icon.style.filter = createGlowEffect(color, glowIntensity);
        } else {
            icon.style.filter = "none";
        }
    }

    function applyRdsIndicatorColor(rdsIcon, isOn) {
        const activeColor = resolveStatusIconColor(RDS_INDICATOR_ICON_COLOR, "");
        
        const offColor = RDS_INDICATOR_ICON_COLOR_OFF === ""
            ? "#696969"
            : resolveStatusIconColor(RDS_INDICATOR_ICON_COLOR_OFF, "");

        clearRdsIndicatorInlinePaint(rdsIcon);

        if (isOn) {
            if (activeColor) {
                rdsIcon.style.filter = colorToFilter(
                    activeColor,
                    LED_GLOW_EFFECT_ICONS,
                    RDS_INDICATOR_ICON_GLOW_INTENSITY
                );
            } else if (offColor) {
                rdsIcon.style.filter = '';
            }
        } else {
            if (offColor) {
                rdsIcon.style.filter = colorToFilter(offColor, false, 0);
            } else if (activeColor) {
                rdsIcon.style.filter = '';
            }
        }
    }




  // --- RDS ---
  const rdsIcon = document.getElementById('rdsIcon');
  if (rdsIcon) {
    if (message.rds === true) {
      rdsIcon.src = uiapeGetRdsIconWebp(true);
      if (REDUCE_HALF_OPACITY) rdsIcon.style.opacity = '0.9';
      if (LED_GLOW_EFFECT_ICONS) rdsIcon.classList.add('icon-glow-on');
      applyRdsIndicatorColor(rdsIcon, true);
    } else {
      rdsIcon.src = uiapeGetRdsIconWebp(false);
      if (REDUCE_HALF_OPACITY) rdsIcon.style.opacity = off_opacity;
      rdsIcon.classList.remove('icon-glow-on');
      applyRdsIndicatorColor(rdsIcon, false);
    }

    if (!rdsIcon.dataset.uiapeThemeObserver) {
      rdsIcon.dataset.uiapeThemeObserver = "1";
      const rdsThemeObserver = new MutationObserver(() => {
        applyRdsIndicatorColor(
          rdsIcon,
          rdsIcon.classList.contains('icon-glow-on')
        );
      });
      rdsThemeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
    }
  }

  // --- TP ---
  const tpIcon = document.getElementById('tpIcon');
  if (tpIcon) {
    const tpOn = message.tp === 1;
    if (LED_GLOW_EFFECT_ICONS && tpOn) {
      tpIcon.classList.add('icon-glow-on');
      if (REDUCE_HALF_OPACITY) tpIcon.style.opacity = '0.9';
    } else {
      tpIcon.classList.remove('icon-glow-on');
      if (REDUCE_HALF_OPACITY && !tpOn) {
          tpIcon.style.opacity = off_opacity;
      } else {
          tpIcon.style.opacity = '0.9';
      }
    }
    applyTextIndicatorColor(tpIcon, tpOn, TP_INDICATOR_ICON_COLOR, TP_INDICATOR_ICON_COLOR_OFF, LED_GLOW_EFFECT_ICONS);
  }

  // --- TA ---
  const taIcon = document.getElementById('taIcon');
  if (taIcon) {
    const taOn = message.ta === 1;
    if (LED_GLOW_EFFECT_ICONS && taOn) {
      taIcon.classList.add('icon-glow-on');
      if (REDUCE_HALF_OPACITY) taIcon.style.opacity = '0.9';
    } else {
      taIcon.classList.remove('icon-glow-on');
      if (REDUCE_HALF_OPACITY && !taOn) {
          taIcon.style.opacity = off_opacity;
      } else {
          taIcon.style.opacity = '0.9';
      }
    }
    applyTextIndicatorColor(taIcon, taOn, TA_INDICATOR_ICON_COLOR, TA_INDICATOR_ICON_COLOR_OFF, LED_GLOW_EFFECT_ICONS);
  }

  // --- BW (Bandwidth) ---
  function updateBwFromSigRaw(message) {
    const now = Date.now();
    if (now - lastBwUpdate < BANDWIDTH_UPDATE_INTERVAL) return;
    lastBwUpdate = now;

    const bwLabel = document.getElementById('bwLabel');
    if (!bwLabel) return;

    let sigValue = 0;

    if (typeof message.sigRaw === "string") {
        const parts = message.sigRaw.split(',');
        if (parts.length >= 4) {
            const parsed = Number(parts[3]);
            if (!isNaN(parsed)) {
                sigValue = Math.floor(parsed);
            }
        }
    }

    bwLabel.textContent = sigValue;

    if (sigValue > 64) {
        bwLabel.style.color = "#fff";
        bwLabel.style.borderColor = "#fff";
        bwLabel.style.fontWeight = "600";
        if (REDUCE_HALF_OPACITY) bwLabel.style.opacity = '0.9';
        if (LED_GLOW_EFFECT_ICONS_BANDWIDTH) {
            bwLabel.style.filter = `drop-shadow(0 0 3px rgba(255, 255, 255, 0.5))
                                     drop-shadow(0 0 6px rgba(255, 255, 255, 0.4))
                                     drop-shadow(0 0 9px rgba(238, 238, 238, 0.3))`;
        }
    } else {
        bwLabel.style.color = "#696969";
        bwLabel.style.borderColor = "#696969";
        bwLabel.style.fontWeight = "bold";
        if (REDUCE_HALF_OPACITY) bwLabel.style.opacity = off_opacity;
        if (LED_GLOW_EFFECT_ICONS_BANDWIDTH) bwLabel.style.filter = 'none';
    }

    bwLabel.textContent += ' kHz';
  }

  updateBwFromSigRaw(message);

  // --- Stereo (MPX plugin) ---
  const stereoIconPlugin = document.getElementById('stereoIcon');
  if (stereoIconPlugin) {
    const stOn = (message.st && !message.stForced) || (message.rds && stereoIconPlugin.getAttribute('data-current-src')?.includes('mpx_on'));
    if (LED_GLOW_EFFECT_ICONS && stOn) {
      stereoIconPlugin.classList.add('icon-glow-on');
      if (REDUCE_HALF_OPACITY) stereoIconPlugin.style.opacity = '0.9';
    } else {
      stereoIconPlugin.classList.remove('icon-glow-on');
      if (REDUCE_HALF_OPACITY && !stOn) {
          stereoIconPlugin.style.opacity = off_opacity;
      } else {
          stereoIconPlugin.style.opacity = '0.9';
      }
    }
  }
}

//
// --------------------------------------------------------------
//  Panel (Icons + MPX-Canvas)
// --------------------------------------------------------------
//

// Helper function to create individual icon elements
function createIconElement(iconType, preset) {
  switch (iconType.toUpperCase()) {
    case 'PTY': {
      const ptyLabel = document.createElement('span');
      ptyLabel.id = 'ptyLabel';
      ptyLabel.textContent = 'PTY';
      ptyLabel.style.color = '#696969';
      ptyLabel.style.fontSize = '14px';
      ptyLabel.style.fontWeight = 'bold';
      ptyLabel.style.border = '1px solid #696969';
      ptyLabel.style.borderRadius = '3px';
      ptyLabel.style.padding = '0 2px';
      ptyLabel.style.display = 'inline-flex';
      ptyLabel.style.alignItems = 'center';
      ptyLabel.style.justifyContent = 'center';
      ptyLabel.style.paddingBottom = isFirefox ? '2px' : '1px'; // Firefox
      ptyLabel.style.height = preset.PTY_HEIGHT + 'px';
      if (REDUCE_HALF_OPACITY) ptyLabel.style.opacity = off_opacity;
      return ptyLabel;
    }
    case 'BW': {
      const bwLabel = document.createElement('span');
      bwLabel.id = 'bwLabel';
      bwLabel.textContent = 'BW';
      bwLabel.style.color = '#696969';
      bwLabel.style.fontSize = '16px';
      bwLabel.style.fontWeight = 'bold';
      bwLabel.style.border = '0px solid #696969';
      bwLabel.style.borderRadius = '3px';
      bwLabel.style.padding = '0 2px';
      bwLabel.style.marginLeft = preset.BW_MARGIN_LEFT + 'px';
      bwLabel.style.display = 'inline-flex';
      bwLabel.style.alignItems = 'center';
      bwLabel.style.justifyContent = 'right';
      bwLabel.style.paddingBottom = isFirefox ? '1px' : '1px'; // Firefox
      bwLabel.style.height = preset.PTY_HEIGHT + 'px';
      if (REDUCE_HALF_OPACITY) bwLabel.style.opacity = off_opacity;
      return bwLabel;
    }
    case 'MS': {
      // Music/Speech icon
      const msIcon = document.createElement('span');
      msIcon.id = 'ptyIconOverlay';
      msIcon.style.color = "#fff";
      msIcon.style.fontSize = "12px";
      msIcon.style.lineHeight = "1.4";
      msIcon.style.border = "1px solid #696969";
      msIcon.style.borderRadius = "3px";
      msIcon.style.padding = `${preset.MS_TOP_PADDING}px 8px`;
      msIcon.style.opacity = off_opacity;
      msIcon.style.display = "inline-flex";
      msIcon.style.alignItems = "center";
      msIcon.style.justifyContent = "center";
      msIcon.style.height = uiapeResolveLiveRdsIconHeight(preset, "MS", preset.PTY_HEIGHT) + "px";
      msIcon.style.minWidth = "30px";
      // Initial state, question mark
      msIcon.innerHTML = `
        <span style="position: relative; display: inline-block; min-width: 12px; min-height: 13px;">
          <i class="fa-solid fa-question" style="font-size: 10px; position: absolute; top: ${isFirefox ? '0.5' : '1'}px; left: 0; opacity: 0.33; min-width: 12px; min-height: 13px;"></i>
        </span>`;
      return msIcon;
    }
    case 'ECC': {
      const eccWrapper = document.createElement('span');
      eccWrapper.id = 'eccWrapper';
      eccWrapper.style.display = 'inline-flex';
      eccWrapper.style.alignItems = 'center';
      eccWrapper.style.whiteSpace = 'nowrap';
      const eccSpan = document.querySelector('.data-flag');
      if (eccSpan && eccSpan.innerHTML.trim() !== "") {
        eccWrapper.appendChild(eccSpan.cloneNode(true));
      } else {
        const noEcc = document.createElement('span');
        noEcc.textContent = 'ECC';
        noEcc.style.color = '#696969';
        noEcc.style.fontSize = '13px';
        noEcc.style.fontWeight = 'bold';
        noEcc.style.border = "1px solid #696969";
        noEcc.style.borderRadius = "3px";
        noEcc.style.padding = '0 3px 0 3px';
        noEcc.style.display = 'inline-flex';
        noEcc.style.alignItems = 'center';
        noEcc.style.height = '17px';
        noEcc.style.paddingBottom = isFirefox ? '1px' : '0';
        if (REDUCE_HALF_OPACITY) noEcc.style.opacity = off_opacity;
        eccWrapper.appendChild(noEcc);
      }
      return eccWrapper;
    }
    case 'STEREO': {
      const stereoSource = document.querySelector('.stereo-container');
      if (stereoSource) {
        const stereoClone = stereoSource.cloneNode(true);
        stereoClone.id = 'stereoIcon';
        stereoClone.removeAttribute('style');
        stereoClone.classList.add("tooltip");
        stereoClone.setAttribute("data-tooltip", "Stereo / Mono toggle.<br><strong>Click to toggle.</strong>");
        stereoClone.style.marginRight = preset.STEREO_ICON_SPACING + 'px';
        return stereoClone;
      }
      return null;
    }
    case 'TP': {
      const tpLabel = document.createElement('span');
      tpLabel.id = 'tpIcon';
      tpLabel.textContent = 'TP';
      tpLabel.style.color = '#696969';
      tpLabel.style.fontSize = '13px';
      tpLabel.style.fontWeight = 'bold';
      tpLabel.style.border = '1px solid #696969';
      tpLabel.style.borderRadius = '3px';
      tpLabel.style.padding = '0 3px';
      tpLabel.style.display = 'inline-flex';
      tpLabel.style.alignItems = 'center';
      tpLabel.style.justifyContent = 'center';
      tpLabel.style.height = uiapeResolveLiveRdsIconHeight(preset, "TP", preset.PTY_HEIGHT) + 'px';
      tpLabel.style.boxSizing = 'border-box';
      tpLabel.style.minWidth = '30px';
      tpLabel.style.paddingBottom = isFirefox ? '1px' : '0';
      if (REDUCE_HALF_OPACITY) tpLabel.style.opacity = off_opacity;
      return tpLabel;
    }

    case 'TA': {
      const taLabel = document.createElement('span');
      taLabel.id = 'taIcon';
      taLabel.textContent = 'TA';
      taLabel.style.color = '#696969';
      taLabel.style.fontSize = '13px';
      taLabel.style.fontWeight = 'bold';
      taLabel.style.border = '1px solid #696969';
      taLabel.style.borderRadius = '3px';
      taLabel.style.padding = '0 3px';
      taLabel.style.display = 'inline-flex';
      taLabel.style.alignItems = 'center';
      taLabel.style.justifyContent = 'center';
      taLabel.style.height = uiapeResolveLiveRdsIconHeight(preset, "TA", preset.PTY_HEIGHT) + 'px';
      taLabel.style.boxSizing = 'border-box';
      taLabel.style.minWidth = '30px';
      taLabel.style.paddingBottom = isFirefox ? '1px' : '0';
      if (REDUCE_HALF_OPACITY) taLabel.style.opacity = off_opacity;
      return taLabel;
    }
    case 'RDS': {
      const img = document.createElement('img');
      img.className = 'status-icon';
      img.id = 'rdsIcon';
      img.alt = 'rdsIcon';
      img.src = uiapeGetRdsIconWebp(false);
      return img;
    }
    default:
      console.warn(`${pluginName} Unknown icon type: ${iconType}`);
      return null;
  }
}

// Helper function to create a row of icons
function createIconRow(iconList, isFirstRow, preset) {
  const row = document.createElement('div');
  row.style.display = 'flex';
  row.style.alignItems = 'center';
  row.style.justifyContent = 'center';
  row.style.width = '100%';
  row.style.flexWrap = 'nowrap';

  if (isFirstRow) {
    row.style.gap = preset.FIRST_ROW_GAP + 'px';
    row.style.transform = `translateY(${preset.GAP_ROW_1}px)`;
  } else {
    row.style.gap = preset.SECOND_ROW_GAP + 'px';
    row.style.transform = `translateY(${preset.GAP_ROW_2}px)`;
  }

  // Filter out empty strings from the icon list
  const filteredList = iconList.filter(iconType => iconType && iconType.trim() !== '');

  // Check if TP and TA are adjacent in the list
  let i = 0;
  while (i < filteredList.length) {
    const iconType = filteredList[i].toUpperCase();
    const nextIconType = i + 1 < filteredList.length ? filteredList[i + 1].toUpperCase() : null;

    // Check if TP and TA are adjacent (in either order)
    if ((iconType === 'TP' && nextIconType === 'TA') || (iconType === 'TA' && nextIconType === 'TP')) {
      // Create a wrapper for TP-TA pair with smaller gap
      const tpTaWrapper = document.createElement('span');
      tpTaWrapper.style.display = 'inline-flex';
      tpTaWrapper.style.alignItems = 'center';
      tpTaWrapper.style.gap = preset.TP_TA_GAP + 'px';

      const firstIcon = createIconElement(filteredList[i], preset);
      const secondIcon = createIconElement(filteredList[i + 1], preset);
      if (firstIcon) tpTaWrapper.appendChild(firstIcon);
      if (secondIcon) tpTaWrapper.appendChild(secondIcon);

      row.appendChild(tpTaWrapper);
      i += 2; // Skip both TP and TA
    } else {
      const iconElement = createIconElement(iconType, preset);
      if (iconElement) {
        row.appendChild(iconElement);
      }
      i++;
    }
  }

  return row;
}

// Re-resolves the active preset from live config on every call (instead of using
// the RDS_ICON_STYLE_FIRST_ROW/SECOND_ROW snapshots taken once at load), and always
// clears/rebuilds #flags-container-desktop from scratch, so this is safe to call
// again whenever RDS_ICON_PRESET or RDS_ICON_STYLE_PRESETS changes.
function insertSignalPanel() {
  // On the first call this renames the container's id to #signalPanel, so a
  // rebuild (preset/order change) must also look it up by that id - otherwise
  // every call after the first silently no-ops here.
  const signalPanelElement = document.querySelector('#flags-container-desktop') || document.querySelector('#signalPanel');
  if (!signalPanelElement) {
    console.error(`[${pluginName}] Signal panel container not found.`);
    return;
  }

  const preset = uiapeGetActiveRdsPreset(getUiapPanelConfig());

  // The config gear button lives as a direct child of this same element (see
  // findUiapHost()/attachLauncher()). innerHTML below would delete it, which a
  // watchdog elsewhere detects and "fixes" by tearing down and recreating the
  // config panel from scratch - closing it while a user is mid-edit. Detach and
  // reattach it synchronously so it's never actually missing when observed.
  const existingGear = signalPanelElement.querySelector(':scope > #uiape-config-gear');

  signalPanelElement.id = 'signalPanel';
  signalPanelElement.innerHTML = '';

  if (existingGear) signalPanelElement.appendChild(existingGear);

  signalPanelElement.style.cssText = `
    min-height: 90px;
    width: 32.9%;
    padding: 10px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    overflow: hidden;
  `;

  // ICON-BAR
  const iconsBar = document.createElement('div');
  iconsBar.id = 'signal-icons';

  // Force vertical stacking with centered content
  iconsBar.style.position = 'relative';
  iconsBar.style.display = 'flex';
  iconsBar.style.flexDirection = 'column';
  iconsBar.style.alignItems = 'center';
  iconsBar.style.gap = '4px';
  iconsBar.style.width = '100%';

  signalPanelElement.appendChild(iconsBar);

  // Create first row using configurable array
  if (Array.isArray(preset.FIRST_ROW) && preset.FIRST_ROW.length > 0) {
    const firstRow = createIconRow(preset.FIRST_ROW, true, preset);
    iconsBar.appendChild(firstRow);
  }

  // Create second row using configurable array
  if (Array.isArray(preset.SECOND_ROW) && preset.SECOND_ROW.length > 0) {
    const secondRow = createIconRow(preset.SECOND_ROW, false, preset);
    iconsBar.appendChild(secondRow);
  }
}

// Exposes insertSignalPanel to uiapeAfterConfigChange (defined earlier, at top-level
// scope, outside this gated block) so an RDS_ICON_PRESET/RDS_ICON_STYLE_PRESETS
// change can rebuild the panel without a reload.
uiapeRebuildRdsIconPanel = insertSignalPanel;

//
// --------------------------------------------------------------
//  Init
// --------------------------------------------------------------
//
function initMetricsMonitor() {
  if (RDS_ICON_STYLE) insertSignalPanel();
  setupTextSocket();
}

// Must run unconditionally (like the original's DOMContentLoaded path); a readyState check here would skip setupTextSocket() since this async file resumes after DOM ready.
uiapeOnDomReady(initMetricsMonitor);

}

// PANEL_STYLE_EFFECT / PANEL_STYLE_EFFECT_SIGNAL_PANEL now live in uiapeBuildLiveCss()
// (see UIAPE_LIVE_CSS_KEYS) so the panel styling applies instantly from the panel
// without needing a reload.

if (REPLACE_MPX_LOGO_WITH_STEREO_LOGO_METRICS_MONITOR_PLUGIN) {
uiapeOnDomReady(function () {
    setTimeout(() => {
      const stereoIcon = document.getElementById("stereoIcon");

      function updateStereoIcon() {
        if (stereoIcon?.classList.contains("stereo-off")) {
          stereoIcon.src = "./js/plugins/MetricsMonitor/images/stereo_off.png";
          stereoIcon.style.filter = "none";
        } else if (stereoIcon?.classList.contains("stereo-on")) {
          stereoIcon.src = "./js/plugins/MetricsMonitor/images/stereo_on.png";
          stereoIcon.style.filter = "";
          stereoIcon.style.opacity = "0.9";
        }
      }

      // Run once on page load
      updateStereoIcon();

      // Watch for class changes
      const observer = new MutationObserver(updateStereoIcon);
      if (stereoIcon) observer.observe(stereoIcon, { attributes: true, attributeFilter: ["class"] });
    }, 3000);
});
}

}

// Function for update notification in /setup
function checkUpdate(setupOnly, pluginName, urlUpdateLink, urlFetchLink) {
    if (setupOnly && window.location.pathname !== '/setup') return;

    let pluginVersionCheck = typeof pluginVersion !== 'undefined' ? pluginVersion : typeof plugin_version !== 'undefined' ? plugin_version : typeof PLUGIN_VERSION !== 'undefined' ? PLUGIN_VERSION : 'Unknown';

    // Function to check for updates
    async function fetchFirstLine() {
        const urlCheckForUpdate = urlFetchLink;

        try {
            const response = await fetch(urlCheckForUpdate);
            if (!response.ok) {
                throw new Error(`[${pluginName}] update check HTTP error! status: ${response.status}`);
            }

            const text = await response.text();
            const lines = text.split('\n');

            let version;

            if (lines.length > 2) {
                const versionLine = lines.find(line => line.includes("const pluginVersion =") || line.includes("const plugin_version =") || line.includes("const PLUGIN_VERSION ="));
                if (versionLine) {
                    const match = versionLine.match(/const\s+(?:pluginVersion|plugin_version|PLUGIN_VERSION)\s*=\s*['"]([^'"]+)['"]/);
                    if (match) {
                        version = match[1];
                    }
                }
            }

            if (!version) {
                const firstLine = lines[0].trim();
                version = /^\d/.test(firstLine) ? firstLine : "Unknown"; // Check if first character is a number
            }

            return version;
        } catch (error) {
            console.error(`[${pluginName}] error fetching file:`, error);
            return null;
        }
    }

    // Check for updates
    fetchFirstLine().then(newVersion => {
        if (newVersion) {
            if (newVersion !== pluginVersionCheck) {
                let updateConsoleText = "There is a new version of this plugin available";
                // Any custom code here
                
                console.log(`[${pluginName}] ${updateConsoleText}`);
                setupNotify(pluginVersionCheck, newVersion, pluginName, urlUpdateLink);
            }
        }
    });

    function setupNotify(pluginVersionCheck, newVersion, pluginName, urlUpdateLink) {
        if (window.location.pathname === '/setup') {
          const pluginSettings = document.getElementById('plugin-settings');
          if (pluginSettings) {
            const currentText = pluginSettings.textContent.trim();
            const newText = `<a href="${urlUpdateLink}" target="_blank">[${pluginName}] Update available: ${pluginVersionCheck} --> ${newVersion}</a><br>`;

            if (currentText === 'No plugin settings are available.') {
              pluginSettings.innerHTML = newText;
            } else {
              pluginSettings.innerHTML += ' ' + newText;
            }
          }

          const updateIcon = document.querySelector('.wrapper-outer #navigation .sidenav-content .fa-puzzle-piece') || document.querySelector('.wrapper-outer .sidenav-content') || document.querySelector('.sidenav-content');

          const redDot = document.createElement('span');
          redDot.style.display = 'block';
          redDot.style.width = '12px';
          redDot.style.height = '12px';
          redDot.style.borderRadius = '50%';
          redDot.style.backgroundColor = '#FE0830' || 'var(--color-main-bright)'; // Theme colour set here as placeholder only
          redDot.style.marginLeft = '82px';
          redDot.style.marginTop = '-12px';

          updateIcon.appendChild(redDot);
        }
    }
}

// UIAP config panel late z-index repair: keep the signal panel below native modal overlays,
// but keep the gear available after RDS/Stereo icon rebuilds.
(function installUiapLateZIndexRepair() {
  if (window.location.pathname === '/setup') return;
  const style = document.createElement('style');
  style.id = 'uiape-config-late-zindex-repair-v14';
  style.textContent = `
    #signalPanel.uiape-config-host,
    #flags-container-desktop.uiape-config-host {
      position: relative !important;
      z-index: 2 !important;
      isolation: auto !important;
    }
    body.uiape-native-modal-open #signalPanel.uiape-config-host,
    body.uiape-native-modal-open #flags-container-desktop.uiape-config-host {
      z-index: 1 !important;
    }
    #signalPanel.uiape-config-host > #uiape-config-gear,
    #flags-container-desktop.uiape-config-host > #uiape-config-gear {
      z-index: 60 !important;
      pointer-events: none !important;
    }
    #signalPanel.uiape-config-host:hover > #uiape-config-gear,
    #flags-container-desktop.uiape-config-host:hover > #uiape-config-gear,
    #signalPanel.uiape-config-host.uiape-config-open > #uiape-config-gear,
    #flags-container-desktop.uiape-config-host.uiape-config-open > #uiape-config-gear {
      opacity: 1 !important;
      visibility: visible !important;
      pointer-events: auto !important;
    }
    #uiape-config-panel {
      z-index: 900 !important;
    }
  `;
  document.head.appendChild(style);
})();

if (CHECK_FOR_UPDATES) checkUpdate(pluginSetupOnlyNotify, pluginName, pluginHomepageUrl, pluginUpdateUrl);

})();
