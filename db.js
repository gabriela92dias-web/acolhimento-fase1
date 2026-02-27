const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'data.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS atendimentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT DEFAULT '',
    telefone TEXT DEFAULT '',
    kommoContactId TEXT NOT NULL,
    agente TEXT DEFAULT '',
    agenteId TEXT DEFAULT '',
    status TEXT DEFAULT 'ativo',
    data_inicio TEXT NOT NULL,
    data_encerrado TEXT,
    encerrado_por TEXT,
    encerrado_por_id TEXT
  );

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    leadId TEXT NOT NULL,
    leadNome TEXT DEFAULT '',
    statusId TEXT DEFAULT '',
    statusAnteriorId TEXT DEFAULT '',
    pipelineId TEXT DEFAULT '',
    pipelineAnteriorId TEXT DEFAULT '',
    responsavelId TEXT DEFAULT '',
    modificadoPorId TEXT DEFAULT '',
    preco TEXT DEFAULT '',
    accountId TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS turnos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agente TEXT NOT NULL,
    entrada TEXT NOT NULL,
    saida TEXT
  );

  CREATE TABLE IF NOT EXISTS pausas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    turno_id INTEGER NOT NULL,
    inicio TEXT NOT NULL,
    fim TEXT,
    FOREIGN KEY (turno_id) REFERENCES turnos(id)
  );

  CREATE INDEX IF NOT EXISTS idx_atend_contact ON atendimentos(kommoContactId, status);
  CREATE INDEX IF NOT EXISTS idx_logs_lead ON logs(leadId);
  CREATE INDEX IF NOT EXISTS idx_turnos_agente ON turnos(agente);
`);

module.exports = db;
