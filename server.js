const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Store em memória (Fase 1)
const atendimentos = [];
let nextId = 1;

/**
 * POST /api/atendimentos/auto
 * Recebe: { kommoContactId, nome, telefone }
 * Se existir atendimento ativo com esse kommoContactId → retorna
 * Se não → cria novo (status ativo, data_inicio now)
 */
app.post('/api/atendimentos/auto', (req, res) => {
  const { kommoContactId, nome, telefone } = req.body || {};

  if (!kommoContactId) {
    return res.status(400).json({ erro: 'kommoContactId é obrigatório' });
  }

  const existente = atendimentos.find(
    (a) => a.kommoContactId === String(kommoContactId) && a.status === 'ativo'
  );

  if (existente) {
    return res.status(200).json(existente);
  }

  const novo = {
    id: String(nextId++),
    nome: nome || '',
    telefone: telefone || '',
    kommoContactId: String(kommoContactId),
    status: 'ativo',
    data_inicio: new Date().toISOString(),
  };

  atendimentos.push(novo);
  res.status(201).json(novo);
});

/**
 * GET /api/atendimentos/:id
 */
app.get('/api/atendimentos/:id', (req, res) => {
  const a = atendimentos.find((x) => x.id === req.params.id);
  if (!a) return res.status(404).json({ erro: 'Atendimento não encontrado' });
  res.json(a);
});

/**
 * PATCH /api/atendimentos/:id — Fase 2: controle de status
 * Body: { status: "encerrado" } ou { status: "ativo" }
 */
app.patch('/api/atendimentos/:id', (req, res) => {
  const a = atendimentos.find((x) => x.id === req.params.id);
  if (!a) return res.status(404).json({ erro: 'Atendimento não encontrado' });

  const { status } = req.body || {};
  if (status !== 'ativo' && status !== 'encerrado') {
    return res.status(400).json({ erro: 'status deve ser "ativo" ou "encerrado"' });
  }

  a.status = status;
  if (status === 'encerrado') {
    a.data_encerrado = new Date().toISOString();
  } else {
    delete a.data_encerrado;
  }

  res.json(a);
});

// widget.html e index.html na raiz (para deploy sem pasta public no repo)
app.get('/widget.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'widget.html'));
});
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).end();
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`Acolhimento rodando em http://localhost:${PORT} (Fase 1 + 2)`);
});
