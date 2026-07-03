/*
    UI Add-on Pack Enhanced v1.0.1 by AAD

    //// Server-side config bridge ////
    Stores the shared/default UI Add-on Pack profile in plugins_configs/UIAddonPackEnhanced.json.
    Admin writes this profile; regular users read it as their default base.
*/

'use strict';

const pluginName = "UI Add-on Pack Enhanced";

// Library imports
const fs = require('fs');
const path = require('path');

// File imports
const { logInfo, logWarn, logError } = require('../../server/console');
const endpointsRouter = require('../../server/endpoints');

// Configuration paths
const rootDir = path.dirname(require.main.filename);

function resolveConfigFolderPath() {
    // FM-DX Webserver normally uses plugins_configs (plural), same as Inactivity Monitor.
    // The plugin_configs fallback is kept for local installs where the folder was named differently.
    const preferred = path.join(rootDir, 'plugins_configs');
    const legacy = path.join(rootDir, 'plugin_configs');
    if (fs.existsSync(preferred)) return preferred;
    if (fs.existsSync(legacy)) return legacy;
    return preferred;
}

const configFolderPath = resolveConfigFolderPath();
const configFilePath = path.join(configFolderPath, 'UIAddonPackEnhanced.json');

// Keep this intentionally small. The client plugin merges this shared profile over its complete UIAP_DEFAULT_CONFIG.
// After the admin saves from the panel, the JSON file will contain the full shared/default profile.
const defaultConfig = {
    ENABLE_PLUGIN: true
};

let sharedConfig = { ...defaultConfig };

function sanitizeConfig(config) {
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
        return { ...defaultConfig };
    }

    // Keep plain JSON-compatible values only.
    return JSON.parse(JSON.stringify({
        ...defaultConfig,
        ...config
    }));
}

function writeJsonFileAtomic(filePath, data) {
    const json = JSON.stringify(data, null, 2);
    const tmpPath = `${filePath}.tmp`;
    const fd = fs.openSync(tmpPath, 'w');
    try {
        fs.writeFileSync(fd, json, 'utf-8');
        fs.fsyncSync(fd);
    } finally {
        fs.closeSync(fd);
    }
    fs.renameSync(tmpPath, filePath);

    // Verify the content really landed where expected.
    const verifyRaw = fs.readFileSync(filePath, 'utf-8');
    JSON.parse(verifyRaw || '{}');
    return { bytes: Buffer.byteLength(verifyRaw, 'utf-8') };
}

function ensureConfigFile() {
    if (!fs.existsSync(configFolderPath)) {
        logInfo(`[${pluginName}] Creating plugins_configs folder...`);
        fs.mkdirSync(configFolderPath, { recursive: true });
    }

    if (!fs.existsSync(configFilePath)) {
        logInfo(`[${pluginName}] Creating default UIAddonPackEnhanced.json file...`);
        writeJsonFileAtomic(configFilePath, defaultConfig);
    }
}

function loadConfig(isReloaded) {
    try {
        ensureConfigFile();

        const raw = fs.readFileSync(configFilePath, 'utf-8');
        const parsed = JSON.parse(raw || '{}');
        sharedConfig = sanitizeConfig(parsed);

        // Ensure essential keys exist.
        const needsUpdate = parsed.ENABLE_PLUGIN === undefined;
        if (needsUpdate) {
            writeJsonFileAtomic(configFilePath, sharedConfig);
            logInfo(`[${pluginName}] Updated UIAddonPack.json with missing keys at ${configFilePath}`);
        }

        logInfo(`[${pluginName}] ${isReloaded ? 'Reloaded' : 'Loaded'} shared config from UIAddonPackEnhanced.json`);
    } catch (error) {
        sharedConfig = { ...defaultConfig };
        logError(`[${pluginName}] Error loading shared config: ${error.message}`);
    }
}

function saveConfig(config) {
    try {
        ensureConfigFile();

        sharedConfig = sanitizeConfig(config);
        const result = writeJsonFileAtomic(configFilePath, sharedConfig);

        logInfo(`[${pluginName}] Saved shared config to ${configFilePath} (${result.bytes} bytes)`);
        return true;
    } catch (error) {
        logError(`[${pluginName}] Error saving shared config: ${error.message}`);
        return false;
    }
}

function watchConfigFile() {
    try {
        fs.watch(configFilePath, (eventType) => {
            if (eventType === 'change') {
                clearTimeout(watchConfigFile.debounceTimer);
                watchConfigFile.debounceTimer = setTimeout(() => loadConfig('re'), 500);
            }
        });
    } catch (error) {
        logWarn(`[${pluginName}] Could not watch UIAddonPackEnhanced.json: ${error.message}`);
    }
}

function isPluginRequest(req) {
    return (req.get('X-Plugin-Name') || '') === 'UIAddonPackEnhanced';
}

function isAdminRequest(req) {
    return req.session?.isAdminAuthenticated === true;
}

function readJsonBody(req, callback) {
    if (req.body && typeof req.body === 'object') {
        callback(null, req.body);
        return;
    }

    let raw = '';
    req.setEncoding('utf8');

    req.on('data', chunk => {
        raw += chunk;
        if (raw.length > 2_000_000) {
            req.destroy();
        }
    });

    req.on('end', () => {
        try {
            callback(null, raw ? JSON.parse(raw) : {});
        } catch (error) {
            callback(error);
        }
    });

    req.on('error', callback);
}

loadConfig(false);
watchConfigFile();

endpointsRouter.get('/ui-addon-pack-enhanced-config', (req, res) => {
    if (!isPluginRequest(req)) {
        res.status(403).json({ error: 'Unauthorised' });
        return;
    }

    res.json({
        ok: true,
        path: configFilePath,
        isAdmin: isAdminRequest(req),
        config: sharedConfig
    });
});

endpointsRouter.post('/ui-addon-pack-enhanced-config', (req, res) => {
    if (!isPluginRequest(req)) {
        res.status(403).json({ error: 'Unauthorised' });
        return;
    }

    if (!isAdminRequest(req)) {
        res.status(403).json({ ok: false, error: 'Admin only' });
        return;
    }

    readJsonBody(req, (error, body) => {
        if (error) {
            res.status(400).json({ ok: false, error: 'Invalid JSON' });
            return;
        }

        const config = body && body.config ? body.config : body;
        const saved = saveConfig(config);

        if (!saved) {
            res.status(500).json({ ok: false, error: 'Could not save config' });
            return;
        }

        res.json({
            ok: true,
            path: configFilePath,
            config: sharedConfig
        });
    });
});
