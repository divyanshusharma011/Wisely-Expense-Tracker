// ============================================================
//  database.js — sql.js SQLite connection + schema bootstrap
//
//  sql.js is a pure-JS SQLite port (no native compilation).
//  The database lives in a single file: server/db/wisely.db
//  On first run it is created and the schema is applied.
// ============================================================

const path = require('path');
const fs   = require('fs');
const initSqlJs = require('sql.js');

const DB_PATH     = path.join(__dirname, 'wisely.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// sql.js wasm file location — needed for Railway/production
const WASM_PATH = path.join(require.resolve('sql.js'), '..', 'sql-wasm.wasm');

// Singleton — module keeps one DB instance in memory
let _db = null;

// ----------------------------------------------------------------
//  persist()  —  write the in-memory database back to disk
//  Call after every write operation so the file stays current.
// ----------------------------------------------------------------
function persist(db) {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// ----------------------------------------------------------------
//  initDatabase()  —  load or create the SQLite database
//  Returns a Promise that resolves to { db, persist }
// ----------------------------------------------------------------
async function initDatabase() {
    if (_db) return { db: _db, persist: () => persist(_db) };

    const SQL = await initSqlJs({
        locateFile: () => WASM_PATH,
    });

    // Load existing file, or start with an empty database
    if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        _db = new SQL.Database(fileBuffer);
        console.log('  [DB] Loaded existing database from:', DB_PATH);
    } else {
        _db = new SQL.Database();
        console.log('  [DB] Created new database at:', DB_PATH);
    }

    // Apply schema (CREATE TABLE IF NOT EXISTS — safe to run every time)
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    _db.run(schema);
    persist(_db);

    console.log('  [DB] Schema applied successfully.');
    return { db: _db, persist: () => persist(_db) };
}

// ----------------------------------------------------------------
//  getDb()  —  synchronous accessor after initDatabase() has run
// ----------------------------------------------------------------
function getDb() {
    if (!_db) throw new Error('Database not initialized. Call initDatabase() first.');
    return _db;
}

module.exports = { initDatabase, getDb, persist: (db) => persist(db || _db) };
