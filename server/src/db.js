const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'netpulse.db');

// Ensure data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');
    initializeSchema();
  }
  return db;
}

function initializeSchema() {
  const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
    console.log('[DB] Schema initialized from schema.sql');
  } else {
    console.warn('[DB] schema.sql not found, skipping schema initialization');
  }
}

/**
 * Run a SELECT query — returns array of rows
 */
function queryAll(sql, params = []) {
  try {
    const stmt = getDb().prepare(sql);
    return stmt.all(...params);
  } catch (err) {
    console.error('[DB] Query error:', err.message);
    throw err;
  }
}

/**
 * Run a SELECT query — returns single row
 */
function queryOne(sql, params = []) {
  try {
    const stmt = getDb().prepare(sql);
    return stmt.get(...params);
  } catch (err) {
    console.error('[DB] Query error:', err.message);
    throw err;
  }
}

/**
 * Run an INSERT/UPDATE/DELETE — returns { changes, lastInsertRowid }
 */
function run(sql, params = []) {
  try {
    const stmt = getDb().prepare(sql);
    return stmt.run(...params);
  } catch (err) {
    console.error('[DB] Run error:', err.message);
    throw err;
  }
}

/**
 * Run multiple statements in a transaction
 */
function transaction(fn) {
  const trans = getDb().transaction(fn);
  return trans();
}

function testConnection() {
  try {
    getDb();
    console.log('[DB] SQLite database ready:', DB_PATH);
    return true;
  } catch (err) {
    console.error('[DB] Failed to open database:', err.message);
    return false;
  }
}

function close() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, queryAll, queryOne, run, transaction, testConnection, close };
