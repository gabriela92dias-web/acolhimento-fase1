const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const NOMES_ETAPAS = {
  '142': 'Tratamento Iniciado', '143': 'Desistência',
  '84156215': 'Leads de Entrada', '84344103': 'Atendimento Geral',
  '93699043': 'Espera Consulta Social', '93773471': 'Sem Receita/Renovação',
  '93773655': 'Novo Cadastro Acompanhar', '93774271': 'Ativa Cadastro Legado',
  '93775739': 'Confirmação Agendamento', '93951855': 'Pedido em Andamento',
  '94158415': 'Visita Catálogo', '99679520': 'Atendimento Encerrado',
  '83444291': 'Leads de Entrada (Suporte)', '83444295': 'Suporte Cadastro',
  '83444299': 'Em Resolução', '93680059': 'Atualização Cadastral',
  '93680063': 'Outros Assuntos', '93680103': 'Problemas no Acesso',
  '93769883': 'Problemas com Produtos',
  '90305571': 'Leads de Entrada (Shopify)', '90305575': 'Produção',
  '90305579': 'Pedidos', '90305583': 'Entrega', '90305587': 'Encerrado (Shopify)',
  '91338571': 'Leads de Entrada (Cadastro)', '91338575': 'Contato Inicial',
  '91338579': 'Oferta Feita', '91338583': 'Negociação', '101951988': 'Negociação (Saúde)',
};
const NOMES_PIPELINES = {
  '10971751': 'Acolhimento', '10996515': 'Suporte', '11619884': 'Cadastro Legado',
  '11641228': 'Hospital', '11713164': 'Associar', '11740483': 'Shopify',
  '12454579': 'Aqui Ads', '12454691': 'HospitalOne', '12958676': 'DF', '13222108': 'Comentou Saúde',
};
const NOMES_USUARIOS = { '13059891': 'Alexandre', '8171024': 'Adapta', '0': 'Sistema' };

const agentes = [{ id: '1', nome: 'Clara' }, { id: '2', nome: 'Thiago' }];

function turnoComPausas(turno) {
  if (!turno) return null;
  const pausas = db.prepare('SELECT * FROM pausas WHERE turno_id = ? ORDER BY id').all(turno.id);
  return { ...turno, id: String(turno.id), pausas };
}

// ── ATENDIMENTOS ──

app.post('/api/atendimentos/auto', (req, res) => {
  const { kommoContactId, nome, telefone, agente, agenteId } = req.body || {};
  if (!kommoContactId) return res.status(400).json({ erro: 'kommoContactId é obrigatório' });

  const existente = db.prepare('SELECT * FROM atendimentos WHERE kommoContactId = ? AND status = ?').get(String(kommoContactId), 'ativo');
  if (existente) return res.json({ ...existente, id: String(existente.id) });

  const info = db.prepare(
    'INSERT INTO atendimentos (nome, telefone, kommoContactId, agente, agenteId, status, data_inicio) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(nome || '', telefone || '', String(kommoContactId), agente || '', agenteId || '', 'ativo', new Date().toISOString());

  const novo = db.prepare('SELECT * FROM atendimentos WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ ...novo, id: String(novo.id) });
});

app.get('/api/atendimentos', (req, res) => {
  const { status } = req.query;
  let lista;
  if (status === 'ativo' || status === 'encerrado') {
    lista = db.prepare('SELECT * FROM atendimentos WHERE status = ?').all(status);
  } else {
    lista = db.prepare('SELECT * FROM atendimentos').all();
  }
  const ativos = db.prepare('SELECT COUNT(*) as c FROM atendimentos WHERE status = ?').get('ativo').c;
  const encerrados = db.prepare('SELECT COUNT(*) as c FROM atendimentos WHERE status = ?').get('encerrado').c;
  res.json({ total: lista.length, ativos, encerrados, atendimentos: lista.map((a) => ({ ...a, id: String(a.id) })) });
});

app.get('/api/atendimentos/:id', (req, res) => {
  const a = db.prepare('SELECT * FROM atendimentos WHERE id = ?').get(req.params.id);
  if (!a) return res.status(404).json({ erro: 'Atendimento não encontrado' });
  res.json({ ...a, id: String(a.id) });
});

app.patch('/api/atendimentos/:id', (req, res) => {
  const a = db.prepare('SELECT * FROM atendimentos WHERE id = ?').get(req.params.id);
  if (!a) return res.status(404).json({ erro: 'Atendimento não encontrado' });

  const { status, agente, agenteId } = req.body || {};
  if (status !== 'ativo' && status !== 'encerrado') return res.status(400).json({ erro: 'status deve ser "ativo" ou "encerrado"' });

  if (status === 'encerrado') {
    db.prepare('UPDATE atendimentos SET status = ?, data_encerrado = ?, encerrado_por = ?, encerrado_por_id = ? WHERE id = ?')
      .run('encerrado', new Date().toISOString(), agente || '', agenteId || '', a.id);
  } else {
    db.prepare('UPDATE atendimentos SET status = ?, data_encerrado = NULL, encerrado_por = NULL, encerrado_por_id = NULL WHERE id = ?')
      .run('ativo', a.id);
  }

  const updated = db.prepare('SELECT * FROM atendimentos WHERE id = ?').get(a.id);
  res.json({ ...updated, id: String(updated.id) });
});

// ── RELATÓRIO AGENTES ──

app.get('/api/relatorio/agentes', (req, res) => {
  const todos = db.prepare('SELECT * FROM atendimentos').all();
  const porAgente = {};
  todos.forEach((a) => {
    const nome = a.agente || 'Não identificado';
    if (!porAgente[nome]) porAgente[nome] = { agente: nome, total: 0, ativos: 0, encerrados: 0, tempos: [] };
    porAgente[nome].total++;
    if (a.status === 'ativo') { porAgente[nome].ativos++; }
    else {
      porAgente[nome].encerrados++;
      if (a.data_inicio && a.data_encerrado) porAgente[nome].tempos.push(new Date(a.data_encerrado) - new Date(a.data_inicio));
    }
  });
  const resultado = Object.values(porAgente).map((ag) => ({
    agente: ag.agente, total: ag.total, ativos: ag.ativos, encerrados: ag.encerrados,
    tempoMedioSegundos: ag.tempos.length > 0 ? Math.round(ag.tempos.reduce((s, t) => s + t, 0) / ag.tempos.length / 1000) : 0,
  })).sort((a, b) => b.total - a.total);
  res.json({ totalAgentes: resultado.length, totalAtendimentos: todos.length, agentes: resultado });
});

// ── WEBHOOK KOMMO ──

app.use('/api/webhook/kommo', express.urlencoded({ extended: true }));
app.post('/api/webhook/kommo', (req, res) => {
  const body = req.body || {};
  const now = new Date().toISOString();
  let count = 0;
  try {
    const leadsData = typeof body.leads === 'string' ? JSON.parse(body.leads) : (body.leads || {});
    const insert = db.prepare('INSERT INTO logs (tipo, timestamp, leadId, leadNome, statusId, statusAnteriorId, pipelineId, pipelineAnteriorId, responsavelId, modificadoPorId, preco, accountId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    ['add', 'update', 'status', 'delete'].forEach((tipo) => {
      const items = leadsData[tipo] || [];
      (Array.isArray(items) ? items : [items]).forEach((lead) => {
        if (!lead || !lead.id) return;
        insert.run(tipo, now, String(lead.id), lead.name || '', String(lead.status_id || ''), String(lead.old_status_id || ''), String(lead.pipeline_id || ''), String(lead.old_pipeline_id || ''), String(lead.responsible_user_id || ''), String(lead.modified_user_id || ''), lead.price || '', String(lead.account_id || ''));
        count++;
      });
    });
  } catch (e) { console.error('[Webhook] Erro:', e.message); }
  console.log(`[Webhook] ${count} evento(s)`);
  res.json({ ok: true, registrados: count });
});

// ── LOGS ──

app.get('/api/logs', (req, res) => {
  const { leadId, tipo } = req.query;
  let lista;
  if (leadId && tipo) lista = db.prepare('SELECT * FROM logs WHERE leadId = ? AND tipo = ? ORDER BY id DESC').all(leadId, tipo);
  else if (leadId) lista = db.prepare('SELECT * FROM logs WHERE leadId = ? ORDER BY id DESC').all(leadId);
  else if (tipo) lista = db.prepare('SELECT * FROM logs WHERE tipo = ? ORDER BY id DESC').all(tipo);
  else lista = db.prepare('SELECT * FROM logs ORDER BY id DESC').all();

  res.json({
    total: lista.length,
    logs: lista.map((l) => ({
      ...l, id: String(l.id),
      statusNome: NOMES_ETAPAS[l.statusId] || l.statusId,
      statusAnteriorNome: NOMES_ETAPAS[l.statusAnteriorId] || l.statusAnteriorId || '',
      pipelineNome: NOMES_PIPELINES[l.pipelineId] || l.pipelineId,
      responsavelNome: NOMES_USUARIOS[l.responsavelId] || l.responsavelId,
      modificadoPorNome: NOMES_USUARIOS[l.modificadoPorId] || l.modificadoPorId,
    })),
  });
});

// ── RELATÓRIO FUNIL ──

app.get('/api/relatorio/funil', (req, res) => {
  const allLogs = db.prepare('SELECT * FROM logs ORDER BY id').all();
  const porEtapa = {}, porAgente = {}, porLead = {};

  allLogs.forEach((log) => {
    if (!porLead[log.leadId]) porLead[log.leadId] = [];
    porLead[log.leadId].push(log);
    const ek = log.statusId || 'desconhecida';
    if (!porEtapa[ek]) porEtapa[ek] = { statusId: ek, entradas: 0, leads: new Set() };
    porEtapa[ek].entradas++; porEtapa[ek].leads.add(log.leadId);
    const ak = log.responsavelId || log.modificadoPorId || 'desconhecido';
    if (!porAgente[ak]) porAgente[ak] = { agenteId: ak, movimentacoes: 0, leads: new Set() };
    porAgente[ak].movimentacoes++; porAgente[ak].leads.add(log.leadId);
  });

  const temposPorEtapa = {};
  Object.values(porLead).forEach((ll) => {
    ll.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    for (let i = 0; i < ll.length - 1; i++) {
      const e = ll[i].statusId;
      if (!temposPorEtapa[e]) temposPorEtapa[e] = [];
      temposPorEtapa[e].push(new Date(ll[i + 1].timestamp) - new Date(ll[i].timestamp));
    }
  });

  res.json({
    totalLogs: allLogs.length,
    totalLeads: Object.keys(porLead).length,
    etapas: Object.values(porEtapa).map((e) => {
      const t = temposPorEtapa[e.statusId] || [];
      return { statusId: e.statusId, nome: NOMES_ETAPAS[e.statusId] || e.statusId, entradas: e.entradas, leadsUnicos: e.leads.size, tempoMedioSegundos: t.length > 0 ? Math.round(t.reduce((s, v) => s + v, 0) / t.length / 1000) : 0 };
    }).sort((a, b) => b.entradas - a.entradas),
    agentes: Object.values(porAgente).map((a) => ({ agenteId: a.agenteId, nome: NOMES_USUARIOS[a.agenteId] || a.agenteId, movimentacoes: a.movimentacoes, leadsUnicos: a.leads.size })).sort((a, b) => b.movimentacoes - a.movimentacoes),
  });
});

// ── TURNOS ──

app.get('/api/agentes', (req, res) => { res.json({ agentes }); });

app.post('/api/turnos/entrar', (req, res) => {
  const { agente } = req.body || {};
  if (!agente) return res.status(400).json({ erro: 'agente é obrigatório' });
  const ativo = db.prepare('SELECT * FROM turnos WHERE agente = ? AND saida IS NULL').get(agente);
  if (ativo) return res.json(turnoComPausas(ativo));
  const info = db.prepare('INSERT INTO turnos (agente, entrada) VALUES (?, ?)').run(agente, new Date().toISOString());
  res.status(201).json(turnoComPausas(db.prepare('SELECT * FROM turnos WHERE id = ?').get(info.lastInsertRowid)));
});

app.post('/api/turnos/sair', (req, res) => {
  const { agente } = req.body || {};
  if (!agente) return res.status(400).json({ erro: 'agente é obrigatório' });
  const ativo = db.prepare('SELECT * FROM turnos WHERE agente = ? AND saida IS NULL').get(agente);
  if (!ativo) return res.status(404).json({ erro: 'Nenhum turno ativo' });
  db.prepare('UPDATE pausas SET fim = ? WHERE turno_id = ? AND fim IS NULL').run(new Date().toISOString(), ativo.id);
  db.prepare('UPDATE turnos SET saida = ? WHERE id = ?').run(new Date().toISOString(), ativo.id);
  res.json(turnoComPausas(db.prepare('SELECT * FROM turnos WHERE id = ?').get(ativo.id)));
});

app.post('/api/turnos/pausar', (req, res) => {
  const { agente } = req.body || {};
  if (!agente) return res.status(400).json({ erro: 'agente é obrigatório' });
  const ativo = db.prepare('SELECT * FROM turnos WHERE agente = ? AND saida IS NULL').get(agente);
  if (!ativo) return res.status(404).json({ erro: 'Nenhum turno ativo' });
  const pausaAberta = db.prepare('SELECT * FROM pausas WHERE turno_id = ? AND fim IS NULL').get(ativo.id);
  if (pausaAberta) {
    db.prepare('UPDATE pausas SET fim = ? WHERE id = ?').run(new Date().toISOString(), pausaAberta.id);
  } else {
    db.prepare('INSERT INTO pausas (turno_id, inicio) VALUES (?, ?)').run(ativo.id, new Date().toISOString());
  }
  res.json(turnoComPausas(db.prepare('SELECT * FROM turnos WHERE id = ?').get(ativo.id)));
});

app.get('/api/turnos', (req, res) => {
  const { agente } = req.query;
  let lista = agente ? db.prepare('SELECT * FROM turnos WHERE agente = ? ORDER BY id DESC').all(agente) : db.prepare('SELECT * FROM turnos ORDER BY id DESC').all();
  const todosAtivos = db.prepare('SELECT * FROM turnos WHERE saida IS NULL').all();
  const online = [], pausados = [];
  todosAtivos.forEach((t) => {
    const p = db.prepare('SELECT * FROM pausas WHERE turno_id = ? AND fim IS NULL').get(t.id);
    (p ? pausados : online).push(t.agente);
  });
  res.json({ total: lista.length, online, pausados, turnos: lista.map(turnoComPausas) });
});

// ── ROTAS HTML ──

app.get('/painel', (req, res) => { res.sendFile(path.join(__dirname, 'painel.html')); });
app.get('/widget.html', (req, res) => { res.sendFile(path.join(__dirname, 'widget.html')); });
app.get('/gadget.html', (req, res) => { res.sendFile(path.join(__dirname, 'gadget.html')); });
app.get('/widget-preview.html', (req, res) => { res.sendFile(path.join(__dirname, 'widget-preview.html')); });
app.get('/arquitetura', (req, res) => { res.sendFile(path.join(__dirname, 'arquitetura.html')); });
app.get('/analise', (req, res) => { res.sendFile(path.join(__dirname, 'analise-heuristica.html')); });
app.get('/dashboard', (req, res) => { res.sendFile(path.join(__dirname, 'dashboard.html')); });
app.get('/relatorio', (req, res) => { res.sendFile(path.join(__dirname, 'relatorio.html')); });
app.get('/funil', (req, res) => { res.sendFile(path.join(__dirname, 'funil.html')); });
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).end();
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => { console.log(`Acolhimento rodando em http://localhost:${PORT} (SQLite)`); });
