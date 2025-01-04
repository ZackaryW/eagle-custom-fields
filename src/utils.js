const path = require('path');
const fs = require('fs');

/**
 * Gets the path of the current plugin's data directory
 * @returns {string} The full path to the plugin's data directory
 */
function getPluginDataPath() {
    // Get the current script's directory and go up two levels
    const currentScriptPath = __dirname;
    const pluginRootPath = path.dirname(currentScriptPath);
    const pluginDataPath = path.join(pluginRootPath, 'data');
    console.log('pluginDataPath', pluginDataPath);
    // Ensure the directory exists
    if (!fs.existsSync(pluginDataPath)) {
        fs.mkdirSync(pluginDataPath, { recursive: true });
    }
    
    return pluginDataPath;
}

class DbManager {
    constructor() {
        this.DbPath = path.join(getPluginDataPath(), 'db.json');
        this.Db = {};
        this.watcher = null;
        this.initialize();
    }

    initialize() {
        // Create Db file if it doesn't exist
        if (!fs.existsSync(this.DbPath)) {
            this.saveDb({});
        }

        // Load initial Db
        this.loadDb();
        
        // Watch for changes
        this.watcher = fs.watch(this.DbPath, (eventType) => {
            if (eventType === 'change') {
                this.loadDb();
            }
        });
    }

    loadDb() {
        try {
            const data = fs.readFileSync(this.DbPath, 'utf8');
            this.Db = JSON.parse(data);
        } catch (error) {
            console.error('Error loading Db:', error);
            this.Db = {};
        }
    }

    saveDb(newDb = null) {
        try {
            const DbToSave = newDb || this.Db;
            fs.writeFileSync(this.DbPath, JSON.stringify(DbToSave, null, 2));
            this.Db = DbToSave;
        } catch (error) {
            console.error('Error saving Db:', error);
        }
    }

    get(key) {
        return this.Db[key];
    }

    set(key, value) {
        this.Db[key] = value;
        this.saveDb();
    }

    append(key, value, noDup = true) {
        if (!this.Db[key]) {
            this.Db[key] = [];
        }

        if (noDup && this.Db[key] && this.Db[key].includes(value)) {
            return;
        }
 
        this.Db[key] = [...this.Db[key], value];

        this.saveDb();
    }

    getAll() {
        return {...this.Db};
    }

    destroy() {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
    }
}

const db = new DbManager();

class CustomFieldsReader {
    constructor() {
        this.cache = new Map();
    }

    _get(item) {
        const metadatapath = item.metadataFilePath;
        const tpath = path.join(path.dirname(metadatapath), 'customFields.json');
        
        if (!fs.existsSync(tpath)) {
            return {};
        }

        try {
            const stats = fs.statSync(tpath);
            const mtime = stats.mtime.getTime();

            // Check if we have a cached version and if the modified time matches
            const cached = this.cache.get(tpath);
            if (cached && cached.mtime === mtime) {
                return cached.data;
            }

            // Read and parse the metadata file
            const data = JSON.parse(fs.readFileSync(tpath, 'utf8'));
            
            // Cache the result with the modified time
            this.cache.set(tpath, {
                mtime,
                data
            });

            return data;

        } catch (error) {
            console.error('Error reading custom fields:', error);
            return {};
        }
    }

    _set(item, data) {
        const metadatapath = item.metadataFilePath;
        const tpath = path.join(path.dirname(metadatapath), 'customFields.json');
        fs.writeFileSync(tpath, JSON.stringify(data, null, 2));
    }

    get(items) {
        // if only one item, not array
        if (!Array.isArray(items)) {
            return this._get(items);
        }

        // Get all custom fields for each item
        const allFields = items.map(item => this._get(item));
        
        // Find fields that exist in all items with the same value
        const dominatorFields = {};
        
        if (allFields.length > 0) {
            // Start with all fields from first item
            Object.entries(allFields[0]).forEach(([key, value]) => {
                // Check if this field exists in all other items with same value
                const isCommonField = allFields.every(fields => 
                    fields[key] !== undefined && fields[key] === value
                );
                
                if (isCommonField) {
                    dominatorFields[key] = value;
                }
            });
        }
        
        return dominatorFields;
    }

    set(items, data) {
        // if only one item, not array
        if (!Array.isArray(items)) {
            return this._set(items, data);
        }

        // For each item, merge the new data with existing data
        items.forEach(item => {
            const existingData = this._get(item);
            const mergedData = {...existingData, ...data};
            this._set(item, mergedData);
        });
    }
    

    clearCache() {
        this.cache.clear();
    }
}

const customFieldsReader = new CustomFieldsReader();


module.exports = {
    db,
    customFieldsReader
}
