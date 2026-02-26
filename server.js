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
  const { kommoContactId, nome, telefone, agente, agenteId } = req.body || {};

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
    agente: agente || '',
    agenteId: agenteId || '',
    status: 'ativo',
    data_inicio: new Date().toISOString(),
  };

  atendimentos.push(novo);
  res.status(201).json(novo);
});

/**
 * GET /api/atendimentos
 * Lista todos os atendimentos. Filtros opcionais: ?status=ativo|encerrado
 */
app.get('/api/atendimentos', (req, res) => {
  const { status } = req.query;
  let lista = atendimentos;
  if (status === 'ativo' || status === 'encerrado') {
    lista = atendimentos.filter((a) => a.status === status);
  }
  res.json({
    total: lista.length,
    ativos: atendimentos.filter((a) => a.status === 'ativo').length,
    encerrados: atendimentos.filter((a) => a.status === 'encerrado').length,
    atendimentos: lista,
  });
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

  const { status, agente, agenteId } = req.body || {};
  if (status !== 'ativo' && status !== 'encerrado') {
    return res.status(400).json({ erro: 'status deve ser "ativo" ou "encerrado"' });
  }

  a.status = status;
  if (status === 'encerrado') {
    a.data_encerrado = new Date().toISOString();
    if (agente) a.encerrado_por = agente;
    if (agenteId) a.encerrado_por_id = agenteId;
  } else {
    delete a.data_encerrado;
    delete a.encerrado_por;
    delete a.encerrado_por_id;
  }

  res.json(a);
});

/**
 * GET /api/relatorio/agentes
 * Relatório agrupado por agente
 */
app.get('/api/relatorio/agentes', (req, res) => {
  const porAgente = {};

  atendimentos.forEach((a) => {
    const nomeAgente = a.agente || 'Não identificado';
    if (!porAgente[nomeAgente]) {
      porAgente[nomeAgente] = { agente: nomeAgente, total: 0, ativos: 0, encerrados: 0, tempoMedio: 0, tempos: [] };
    }
    porAgente[nomeAgente].total++;
    if (a.status === 'ativo') {
      porAgente[nomeAgente].ativos++;
    } else {
      porAgente[nomeAgente].encerrados++;
      if (a.data_inicio && a.data_encerrado) {
        const duracao = new Date(a.data_encerrado) - new Date(a.data_inicio);
        porAgente[nomeAgente].tempos.push(duracao);
      }
    }
  });

  const resultado = Object.values(porAgente).map((ag) => {
    const tempoMedio = ag.tempos.length > 0
      ? Math.round(ag.tempos.reduce((s, t) => s + t, 0) / ag.tempos.length / 1000)
      : 0;
    return {
      agente: ag.agente,
      total: ag.total,
      ativos: ag.ativos,
      encerrados: ag.encerrados,
      tempoMedioSegundos: tempoMedio,
    };
  }).sort((a, b) => b.total - a.total);

  res.json({
    totalAgentes: resultado.length,
    totalAtendimentos: atendimentos.length,
    agentes: resultado,
  });
});

// widget.html e index.html na raiz (para deploy sem pasta public no repo)
app.get('/widget.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'widget.html'));
});
app.get('/gadget.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'gadget.html'));
});
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});
app.get('/relatorio', (req, res) => {
  res.sendFile(path.join(__dirname, 'relatorio.html'));
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
