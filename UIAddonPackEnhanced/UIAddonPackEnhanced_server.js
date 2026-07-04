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

// Hard safety cap on the saved config file. This is enforced in writeJsonFileAtomic,
// the single choke point every write goes through, so it holds regardless of caller.
const MAX_CONFIG_FILE_BYTES = 100 * 1024; // 100 KB

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

// Defends against a compromised/malicious admin session flooding a single input
// field (a notice message, a custom label, a preset row, etc) with a huge string
// to bloat the file. Checked on every save, in addition to the whole-file cap in
// writeJsonFileAtomic - that cap alone would reject the save but not say why.
const MAX_CONFIG_FIELD_STRING_LENGTH = 2000;

function findOversizedStringField(value, fieldPath) {
    if (typeof value === 'string') {
        return value.length > MAX_CONFIG_FIELD_STRING_LENGTH ? (fieldPath || '(root)') : null;
    }
    if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
            const found = findOversizedStringField(value[i], `${fieldPath}[${i}]`);
            if (found) return found;
        }
        return null;
    }
    if (value && typeof value === 'object') {
        for (const key of Object.keys(value)) {
            const found = findOversizedStringField(value[key], fieldPath ? `${fieldPath}.${key}` : key);
            if (found) return found;
        }
        return null;
    }
    return null;
}

function writeJsonFileAtomic(filePath, data) {
    const json = JSON.stringify(data, null, 2);

    const sizeBytes = Buffer.byteLength(json, 'utf-8');
    if (sizeBytes > MAX_CONFIG_FILE_BYTES) {
        const error = new Error(
            `Config would be ${(sizeBytes / 1024).toFixed(1)} KB, exceeding the ${(MAX_CONFIG_FILE_BYTES / 1024).toFixed(0)} KB limit`
        );
        error.tooLarge = true;
        throw error;
    }

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

        const sanitized = sanitizeConfig(config);

        const oversizedField = findOversizedStringField(sanitized, '');
        if (oversizedField) {
            const error = new Error(
                `Field "${oversizedField}" exceeds the ${MAX_CONFIG_FIELD_STRING_LENGTH}-character limit for a single value`
            );
            error.tooLarge = true;
            throw error;
        }

        const result = writeJsonFileAtomic(configFilePath, sanitized);
        sharedConfig = sanitized;

        logInfo(`[${pluginName}] Saved shared config (${result.bytes} bytes)`);
        return { ok: true };
    } catch (error) {
        logError(`[${pluginName}] Error saving shared config: ${error.message}`);
        return { ok: false, error: error.message, tooLarge: error.tooLarge === true };
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

function checkStrictAdmin(req, res, next) {
    if (isAdminRequest(req)) return next();
    return res.status(401).json({ error: 'Unauthorised' });
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
        isAdmin: isAdminRequest(req),
        config: sharedConfig
    });
});

endpointsRouter.post('/ui-addon-pack-enhanced-config', checkStrictAdmin, (req, res) => {
    if (!isPluginRequest(req)) {
        res.status(403).json({ error: 'Unauthorised' });
        return;
    }

    readJsonBody(req, (error, body) => {
        if (error) {
            res.status(400).json({ ok: false, error: 'Invalid JSON' });
            return;
        }

        const config = body && body.config ? body.config : body;
        const result = saveConfig(config);

        if (!result.ok) {
            res.status(result.tooLarge ? 413 : 500).json({ ok: false, error: result.error || 'Could not save config' });
            return;
        }

        res.json({
            ok: true,
            config: sharedConfig
        });
    });
});
