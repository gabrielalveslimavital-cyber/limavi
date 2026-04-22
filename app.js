// ===================== LIMAVI FISIOTERAPIA - APP.JS =====================

// ─── STORAGE HELPERS ───────────────────────────────────────────────────────
const DB = {
  get: (k, def = []) => { try { const v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : def; } catch { return def; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  del: (k) => localStorage.removeItem(k),
  id: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
};

// ─── INITIAL DATA ──────────────────────────────────────────────────────────
function initData() {
  if (!localStorage.getItem('limavi_init')) {
    DB.set('profissionais', [{
      id: 'admin001', nome: 'Administrador', email: 'admin@limavi.com',
      senha: 'limavi2024', perfil: 'admin', crefito: '', tel: '', esp: 'Gestão'
    }]);
    DB.set('pacientes', []);
    DB.set('agendamentos', []);
    DB.set('evolucoes', []);
    DB.set('anamneses', []);
    localStorage.setItem('limavi_init', '1');
  }
}

// ─── AUTH ──────────────────────────────────────────────────────────────────
let currentUser = null;

function showLogin() {
  // Força a tela de login a aparecer e a do app a sumir instantaneamente
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app-screen').style.display = 'none';
  
  document.getElementById('login-screen').classList.add('active');
  document.getElementById('app-screen').classList.remove('active');
  currentUser = null;
}

function showApp(user) {
  currentUser = user;
  document.getElementById('user-badge').textContent = user.nome;
  const isAdmin = user.perfil === 'admin';
  document.getElementById('nav-profissionais').style.display = isAdmin ? '' : 'none';
  document.getElementById('nav-relatorios').style.display = isAdmin ? '' : 'none';
  
  // Destranca visualmente o app somente após a validação dos dados
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-screen').style.display = 'block';
  
  document.getElementById('login-screen').classList.remove('active');
  document.getElementById('app-screen').classList.add('active');
  navigate('dashboard');
}


function doLogin() {
  const email = document.getElementById('login-user').value.trim().toLowerCase();
  const senha = document.getElementById('login-pass').value;
  if (!email || !senha) { showLoginError('Preencha e-mail e senha.'); return; }
  const profs = DB.get('profissionais');
  const user = profs.find(p => p.email.toLowerCase() === email && p.senha === senha);
  if (!user) { showLoginError('E-mail ou senha incorretos.'); return; }
  showLoginError('', false);
  DB.set('limavi_session', { id: user.id, exp: Date.now() + 8 * 3600 * 1000 });
  showApp(user);
}

function doCadastro() {
  const nome = document.getElementById('cad-nome').value.trim();
  const email = document.getElementById('cad-email').value.trim().toLowerCase();
  const crefito = document.getElementById('cad-crefito').value.trim();
  const senha = document.getElementById('cad-senha').value;
  const senha2 = document.getElementById('cad-senha2').value;

  if (!nome || !email || !senha) { showCadError('Preencha todos os campos obrigatórios (*).'); return; }
  if (senha.length < 6) { showCadError('A senha deve ter no mínimo 6 caracteres.'); return; }
  if (senha !== senha2) { showCadError('As senhas não conferem.'); return; }

  const profs = DB.get('profissionais');
  if (profs.find(p => p.email.toLowerCase() === email)) { showCadError('Este e-mail já está cadastrado.'); return; }

  const novoUser = { id: DB.id(), nome, email, senha, crefito, tel: '', perfil: 'fisioterapeuta', esp: '' };
  profs.push(novoUser);
  DB.set('profissionais', profs);
  DB.set('limavi_session', { id: novoUser.id, exp: Date.now() + 8 * 3600 * 1000 });
  showCadError('', false);
  toast('Conta criada! Bem-vindo(a), ' + nome.split(' ')[0] + '!');
  showApp(novoUser);
}

function doLogout() {
  DB.del('limavi_session');
  currentUser = null;
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
  showLoginError('', false);
  switchTab('login');
  closeMenu();
  showLogin();
}

function showLoginError(msg, show = true) {
  const el = document.getElementById('login-error');
  el.textContent = msg; el.classList.toggle('hidden', !show);
}
function showCadError(msg, show = true) {
  const el = document.getElementById('cad-error');
  el.textContent = msg; el.classList.toggle('hidden', !show);
}

function togglePass(id) {
  const el = document.getElementById(id);
  el.type = el.type === 'password' ? 'text' : 'password';
}

function switchTab(tab) {
  document.getElementById('painel-login').classList.toggle('hidden', tab !== 'login');
  document.getElementById('painel-cadastro').classList.toggle('hidden', tab !== 'cadastro');
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-cadastro').classList.toggle('active', tab === 'cadastro');
  showLoginError('', false); showCadError('', false);
}

// ─── NAVEGAÇÃO ─────────────────────────────────────────────────────────────
function navigate(page) {
  if (!currentUser) { showLogin(); return; }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');
  const link = document.querySelector('.nav-link[data-page="' + page + '"]');
  if (link) link.classList.add('active');
  closeMenu();
  if (page === 'dashboard') renderDashboard();
  if (page === 'pacientes') renderPacientes();
  if (page === 'agenda') renderAgenda();
  if (page === 'evolucoes') renderEvolucoes();
  if (page === 'anamneses') renderAnamneses();
  if (page === 'profissionais') renderProfissionais();
  if (page === 'relatorios') document.getElementById('relatorio-output').innerHTML = '';
}

// ─── SIDEBAR ───────────────────────────────────────────────────────────────
function toggleMenu() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('active');
}
function closeMenu() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('active');
}

// ─── MODAIS ────────────────────────────────────────────────────────────────
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  ['pac-id','ag-id','ev-id','an-id','pf-id'].forEach(f => { const x = document.getElementById(f); if (x) x.value = ''; });
  const today = fmtDateISO(new Date());
  ['ag-data','ev-data','an-data'].forEach(f => { const x = document.getElementById(f); if (x && !x.value) x.value = today; });
  el.classList.remove('hidden');
  populateSelects();
}
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

function populateSelects() {
  const pacs = DB.get('pacientes');
  const profs = DB.get('profissionais');
  const pacOpts = '<option value="">Selecione o paciente</option>' + pacs.map(p => '<option value="' + p.id + '">' + p.nome + '</option>').join('');
  const profOpts = '<option value="">Selecione</option>' + profs.map(p => '<option value="' + p.id + '">' + p.nome + '</option>').join('');
  ['ag-pac','ev-pac','an-pac'].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = pacOpts; });
  ['ag-prof','ev-prof','pac-prof'].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = profOpts; });
}

// ─── TOAST ─────────────────────────────────────────────────────────────────
function toast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3200);
}

// ─── DASHBOARD ─────────────────────────────────────────────────────────────
function renderDashboard() {
  const pacs = DB.get('pacientes');
  const ags = DB.get('agendamentos');
  const evs = DB.get('evolucoes');
  const today = fmtDateISO(new Date());
  const todayAgs = ags.filter(a => a.data === today);
  const upcoming = ags.filter(a => a.data >= today && a.status !== 'cancelado')
    .sort((a,b) => (a.data+a.hora).localeCompare(b.data+b.hora)).slice(0,6);

  document.getElementById('stats-grid').innerHTML =
    '<div class="stat-card"><div class="stat-icon">👤</div><div><div class="stat-num">' + pacs.length + '</div><div class="stat-label">Pacientes</div></div></div>' +
    '<div class="stat-card" style="border-color:#e69c2a"><div class="stat-icon">📅</div><div><div class="stat-num">' + todayAgs.length + '</div><div class="stat-label">Hoje</div></div></div>' +
    '<div class="stat-card" style="border-color:#3aaa72"><div class="stat-icon">📋</div><div><div class="stat-num">' + evs.length + '</div><div class="stat-label">Evoluções</div></div></div>' +
    '<div class="stat-card" style="border-color:#4aa896"><div class="stat-icon">📝</div><div><div class="stat-num">' + DB.get('anamneses').length + '</div><div class="stat-label">Anamneses</div></div></div>';

  document.getElementById('upcoming-list').innerHTML = upcoming.length
    ? upcoming.map(function(a) {
        var pac = pacs.find(function(p) { return p.id === a.pacienteId; });
        return '<div class="upcoming-item"><span class="item-time">' + a.hora + '</span><div><div class="item-name">' + (pac ? pac.nome : 'N/D') + '</div><div class="item-sub">' + fmtDate(a.data) + ' · ' + statusTag(a.status) + '</div></div></div>';
      }).join('')
    : '<div class="empty-state"><div class="empty-icon">📅</div>Sem agendamentos futuros</div>';

  var recentPacs = pacs.slice().reverse().slice(0,5);
  document.getElementById('recent-patients').innerHTML = recentPacs.length
    ? recentPacs.map(function(p) {
        return '<div class="recent-item"><div class="card-avatar">' + initials(p.nome) + '</div><div><div class="item-name">' + p.nome + '</div><div class="item-sub">' + idade(p.dataNasc) + ' anos · ' + (p.tel || '—') + '</div></div></div>';
      }).join('')
    : '<div class="empty-state"><div class="empty-icon">👤</div>Nenhum paciente cadastrado</div>';
}

// ─── PACIENTES ─────────────────────────────────────────────────────────────
function renderPacientes() {
  var query = ((document.getElementById('search-paciente') || {}).value || '').toLowerCase();
  var pacs = DB.get('pacientes').filter(function(p) {
    return !query || p.nome.toLowerCase().includes(query) || (p.tel||'').includes(query);
  });
  document.getElementById('pacientes-list').innerHTML = pacs.length
    ? pacs.map(function(p) {
        return '<div class="list-card" onclick="detalhePaciente(\'' + p.id + '\')">' +
          '<div class="card-avatar">' + initials(p.nome) + '</div>' +
          '<div class="card-body"><div class="card-name">' + p.nome + '</div>' +
          '<div class="card-sub">' + idade(p.dataNasc) + ' anos · ' + (p.tel||'—') + ' · ' + (p.convenio||'Particular') + '</div></div>' +
          '<div class="card-actions" onclick="event.stopPropagation()">' +
          '<button class="btn-primary btn-sm" onclick="editarPaciente(\'' + p.id + '\')">✏️</button>' +
          '<button class="btn-danger btn-sm" onclick="deletarPaciente(\'' + p.id + '\')">🗑</button></div></div>';
      }).join('')
    : '<div class="empty-state"><div class="empty-icon">👤</div>Nenhum paciente encontrado</div>';
}

function editarPaciente(id) {
  var pac = DB.get('pacientes').find(function(p) { return p.id === id; });
  if (!pac) return;
  var profs = DB.get('profissionais');
  document.getElementById('pac-prof').innerHTML = '<option value="">Selecione</option>' + profs.map(function(p) { return '<option value="' + p.id + '"' + (pac.profId === p.id ? ' selected' : '') + '>' + p.nome + '</option>'; }).join('');
  document.getElementById('pac-id').value = pac.id;
  document.getElementById('pac-nome').value = pac.nome;
  document.getElementById('pac-nasc').value = pac.dataNasc;
  document.getElementById('pac-cpf').value = pac.cpf || '';
  document.getElementById('pac-tel').value = pac.tel || '';
  document.getElementById('pac-email').value = pac.email || '';
  document.getElementById('pac-sexo').value = pac.sexo || '';
  document.getElementById('pac-end').value = pac.end || '';
  document.getElementById('pac-convenio').value = pac.convenio || '';
  document.getElementById('pac-obs').value = pac.obs || '';
  document.getElementById('modal-paciente-title').textContent = 'Editar Paciente';
  document.getElementById('modal-paciente').classList.remove('hidden');
  populateSelects();
  document.getElementById('pac-prof').value = pac.profId || '';
}

function salvarPaciente() {
  var nome = document.getElementById('pac-nome').value.trim();
  var nasc = document.getElementById('pac-nasc').value;
  var tel = document.getElementById('pac-tel').value.trim();
  if (!nome || !nasc || !tel) { toast('Preencha os campos obrigatórios (*)', 'error'); return; }
  var pacs = DB.get('pacientes');
  var id = document.getElementById('pac-id').value;
  var data = {
    id: id || DB.id(), nome: nome, dataNasc: nasc, tel: tel,
    cpf: document.getElementById('pac-cpf').value,
    email: document.getElementById('pac-email').value,
    sexo: document.getElementById('pac-sexo').value,
    end: document.getElementById('pac-end').value,
    convenio: document.getElementById('pac-convenio').value,
    obs: document.getElementById('pac-obs').value,
    profId: document.getElementById('pac-prof').value,
  };
  if (id) { var i = pacs.findIndex(function(p) { return p.id === id; }); pacs[i] = data; } else { pacs.push(data); }
  DB.set('pacientes', pacs);
  closeModal('modal-paciente');
  toast(id ? 'Paciente atualizado!' : 'Paciente cadastrado!');
  renderPacientes(); renderDashboard();
}

function deletarPaciente(id) {
  if (!confirm('Excluir este paciente?')) return;
  DB.set('pacientes', DB.get('pacientes').filter(function(p) { return p.id !== id; }));
  toast('Paciente excluído.'); renderPacientes(); renderDashboard();
}

function detalhePaciente(id) {
  var pac = DB.get('pacientes').find(function(p) { return p.id === id; });
  if (!pac) return;
  var evs = DB.get('evolucoes').filter(function(e) { return e.pacienteId === id; });
  var ags = DB.get('agendamentos').filter(function(a) { return a.pacienteId === id; });
  var ans = DB.get('anamneses').filter(function(a) { return a.pacienteId === id; });
  var prof = DB.get('profissionais').find(function(p) { return p.id === pac.profId; });
  var sexMap = {M:'Masculino',F:'Feminino',O:'Outro'};
  document.getElementById('detalhe-pac-nome').textContent = pac.nome;
  document.getElementById('detalhe-pac-body').innerHTML =
    '<div class="detail-section"><h4>Dados Pessoais</h4><div class="detail-grid">' +
    '<div class="detail-item"><label>Nome</label><span>' + pac.nome + '</span></div>' +
    '<div class="detail-item"><label>Nascimento</label><span>' + fmtDate(pac.dataNasc) + ' (' + idade(pac.dataNasc) + ' anos)</span></div>' +
    '<div class="detail-item"><label>CPF</label><span>' + (pac.cpf||'—') + '</span></div>' +
    '<div class="detail-item"><label>Sexo</label><span>' + (sexMap[pac.sexo]||'—') + '</span></div>' +
    '<div class="detail-item"><label>Telefone</label><span>' + (pac.tel||'—') + '</span></div>' +
    '<div class="detail-item"><label>Email</label><span>' + (pac.email||'—') + '</span></div>' +
    '<div class="detail-item"><label>Convênio</label><span>' + (pac.convenio||'Particular') + '</span></div>' +
    '<div class="detail-item"><label>Profissional</label><span>' + (prof?prof.nome:'—') + '</span></div>' +
    '</div></div>' +
    '<div class="detail-section"><h4>Histórico · ' + evs.length + ' evolução(ões) · ' + ags.length + ' agendamento(s) · ' + ans.length + ' anamnese(s)</h4>' +
    '<div class="timeline">' +
    (evs.slice(-5).reverse().map(function(e) {
      return '<div class="timeline-item"><div class="tl-date">📋 ' + fmtDate(e.data) + '</div><div class="tl-body"><div class="tl-label">Sessão ' + (e.sessao||'—') + ' · EVA ' + (e.eva != null ? e.eva : '—') + '/10</div><div>' + (e.plano||'—').substring(0,90) + '</div></div></div>';
    }).join('') || '<div class="text-muted">Sem evoluções ainda.</div>') +
    '</div></div>';
  document.getElementById('btn-editar-pac').onclick = function() { closeModal('modal-detalhe-pac'); editarPaciente(id); };
  document.getElementById('modal-detalhe-pac').classList.remove('hidden');
}

// ─── AGENDA ────────────────────────────────────────────────────────────────
var currentWeekOffset = 0;

function renderAgenda() {
  var ags = DB.get('agendamentos');
  var pacs = DB.get('pacientes');
  var today = new Date();
  var startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + currentWeekOffset * 7);
  startOfWeek.setHours(0,0,0,0);
  var days = [];
  for (var i = 0; i < 7; i++) { var d = new Date(startOfWeek); d.setDate(startOfWeek.getDate()+i); days.push(d); }
  document.getElementById('week-label').textContent = fmtDate(fmtDateISO(days[0])) + ' — ' + fmtDate(fmtDateISO(days[6]));
  var todayStr = fmtDateISO(new Date());
  var dnames = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  document.getElementById('agenda-grid').innerHTML = days.map(function(d) {
    var ds = fmtDateISO(d);
    var dayAgs = ags.filter(function(a) { return a.data === ds; }).sort(function(a,b) { return a.hora.localeCompare(b.hora); });
    var isToday = ds === todayStr;
    return '<div class="agenda-day"><div class="agenda-day-header ' + (isToday?'today':'') + '">' + dnames[d.getDay()] + ' · ' + d.getDate() + '/' + (d.getMonth()+1) + (isToday?' · Hoje':'') + '</div>' +
      '<div class="agenda-slots">' +
      (dayAgs.length ? dayAgs.map(function(a) {
        var pac = pacs.find(function(p) { return p.id === a.pacienteId; });
        return '<div class="agenda-slot" onclick="editarAgendamento(\'' + a.id + '\')">' +
          '<span class="slot-time">' + a.hora + '</span>' +
          '<span class="slot-name">' + (pac?pac.nome:'N/D') + '</span>' +
          statusTag(a.status) + '</div>';
      }).join('') : '<div class="empty-day">Sem agendamentos</div>') +
      '</div></div>';
  }).join('');
}

function changeWeek(dir) { currentWeekOffset += dir; renderAgenda(); }

function editarAgendamento(id) {
  var ag = DB.get('agendamentos').find(function(a) { return a.id === id; });
  if (!ag) return;
  populateSelects();
  document.getElementById('ag-id').value = ag.id;
  document.getElementById('ag-pac').value = ag.pacienteId;
  document.getElementById('ag-prof').value = ag.profId;
  document.getElementById('ag-data').value = ag.data;
  document.getElementById('ag-hora').value = ag.hora;
  document.getElementById('ag-dur').value = ag.duracao || 50;
  document.getElementById('ag-status').value = ag.status;
  document.getElementById('ag-tipo').value = ag.tipo || 'sessao';
  document.getElementById('ag-obs').value = ag.obs || '';
  document.getElementById('modal-ag-title').textContent = 'Editar Agendamento';
  document.getElementById('modal-agendamento').classList.remove('hidden');
}

function salvarAgendamento() {
  var pacId = document.getElementById('ag-pac').value;
  var data = document.getElementById('ag-data').value;
  var hora = document.getElementById('ag-hora').value;
  var profId = document.getElementById('ag-prof').value;
  if (!pacId || !data || !hora || !profId) { toast('Preencha os campos obrigatórios', 'error'); return; }
  var ags = DB.get('agendamentos');
  var id = document.getElementById('ag-id').value;
  var ag = {
    id: id || DB.id(), pacienteId: pacId, profId: profId, data: data, hora: hora,
    duracao: document.getElementById('ag-dur').value,
    status: document.getElementById('ag-status').value,
    tipo: document.getElementById('ag-tipo').value,
    obs: document.getElementById('ag-obs').value,
  };
  if (id) { var i = ags.findIndex(function(a) { return a.id === id; }); ags[i] = ag; } else { ags.push(ag); }
  DB.set('agendamentos', ags);
  closeModal('modal-agendamento');
  toast(id ? 'Agendamento atualizado!' : 'Agendamento criado!');
  renderAgenda(); renderDashboard();
}

// ─── EVOLUÇÕES ─────────────────────────────────────────────────────────────
function renderEvolucoes() {
  var query = ((document.getElementById('search-evolucao')||{}).value||'').toLowerCase();
  var pacs = DB.get('pacientes');
  var evs = DB.get('evolucoes').filter(function(e) {
    if (!query) return true;
    var pac = pacs.find(function(p) { return p.id === e.pacienteId; });
    return pac && pac.nome.toLowerCase().includes(query);
  }).sort(function(a,b) { return b.data.localeCompare(a.data); });
  document.getElementById('evolucoes-list').innerHTML = evs.length
    ? evs.map(function(e) {
        var pac = pacs.find(function(p) { return p.id === e.pacienteId; });
        return '<div class="list-card"><div class="card-avatar">📋</div><div class="card-body">' +
          '<div class="card-name">' + (pac?pac.nome:'N/D') + '</div>' +
          '<div class="card-sub">' + fmtDate(e.data) + ' · Sessão ' + (e.sessao||'—') + ' · EVA: ' + (e.eva != null ? e.eva : '—') + '/10</div>' +
          '<div class="card-sub mt-8">' + (e.subj||'').substring(0,60) + '</div></div>' +
          '<div class="card-actions">' +
          '<button class="btn-primary btn-sm" onclick="editarEvolucao(\'' + e.id + '\')">✏️</button>' +
          '<button class="btn-danger btn-sm" onclick="deletarEvolucao(\'' + e.id + '\')">🗑</button></div></div>';
      }).join('')
    : '<div class="empty-state"><div class="empty-icon">📋</div>Nenhuma evolução encontrada</div>';
}

function editarEvolucao(id) {
  var e = DB.get('evolucoes').find(function(x) { return x.id === id; });
  if (!e) return;
  populateSelects();
  document.getElementById('ev-id').value = e.id;
  document.getElementById('ev-pac').value = e.pacienteId;
  document.getElementById('ev-data').value = e.data;
  document.getElementById('ev-prof').value = e.profId || '';
  document.getElementById('ev-sessao').value = e.sessao || '';
  document.getElementById('ev-subj').value = e.subj || '';
  document.getElementById('ev-obj').value = e.obj || '';
  document.getElementById('ev-aval').value = e.aval || '';
  document.getElementById('ev-plano').value = e.plano || '';
  document.getElementById('ev-eva').value = e.eva != null ? e.eva : '';
  document.getElementById('ev-alta').value = e.alta || 'nao';
  document.getElementById('modal-ev-title').textContent = 'Editar Evolução';
  document.getElementById('modal-evolucao').classList.remove('hidden');
}

function salvarEvolucao() {
  var pacId = document.getElementById('ev-pac').value;
  var data = document.getElementById('ev-data').value;
  if (!pacId || !data) { toast('Selecione o paciente e a data', 'error'); return; }
  var evs = DB.get('evolucoes');
  var id = document.getElementById('ev-id').value;
  var ev = {
    id: id || DB.id(), pacienteId: pacId, data: data,
    profId: document.getElementById('ev-prof').value,
    sessao: document.getElementById('ev-sessao').value,
    subj: document.getElementById('ev-subj').value,
    obj: document.getElementById('ev-obj').value,
    aval: document.getElementById('ev-aval').value,
    plano: document.getElementById('ev-plano').value,
    eva: document.getElementById('ev-eva').value,
    alta: document.getElementById('ev-alta').value,
  };
  if (id) { var i = evs.findIndex(function(e) { return e.id === id; }); evs[i] = ev; } else { evs.push(ev); }
  DB.set('evolucoes', evs);
  closeModal('modal-evolucao');
  toast(id ? 'Evolução atualizada!' : 'Evolução registrada!');
  renderEvolucoes(); renderDashboard();
}

function deletarEvolucao(id) {
  if (!confirm('Excluir esta evolução?')) return;
  DB.set('evolucoes', DB.get('evolucoes').filter(function(e) { return e.id !== id; }));
  toast('Evolução excluída.'); renderEvolucoes();
}

// ─── ANAMNESES ─────────────────────────────────────────────────────────────
function renderAnamneses() {
  var query = ((document.getElementById('search-anamnese')||{}).value||'').toLowerCase();
  var pacs = DB.get('pacientes');
  var ans = DB.get('anamneses').filter(function(a) {
    if (!query) return true;
    var pac = pacs.find(function(p) { return p.id === a.pacienteId; });
    return pac && pac.nome.toLowerCase().includes(query);
  }).sort(function(a,b) { return b.data.localeCompare(a.data); });
  document.getElementById('anamneses-list').innerHTML = ans.length
    ? ans.map(function(a) {
        var pac = pacs.find(function(p) { return p.id === a.pacienteId; });
        return '<div class="list-card"><div class="card-avatar">📝</div><div class="card-body">' +
          '<div class="card-name">' + (pac?pac.nome:'N/D') + '</div>' +
          '<div class="card-sub">' + fmtDate(a.data) + ' · ' + (a.diag||'Sem diagnóstico') + '</div>' +
          '<div class="card-sub mt-8">' + (a.queixa||'').substring(0,60) + '</div></div>' +
          '<div class="card-actions">' +
          '<button class="btn-primary btn-sm" onclick="editarAnamnese(\'' + a.id + '\')">✏️</button>' +
          '<button class="btn-danger btn-sm" onclick="deletarAnamnese(\'' + a.id + '\')">🗑</button></div></div>';
      }).join('')
    : '<div class="empty-state"><div class="empty-icon">📝</div>Nenhuma anamnese encontrada</div>';
}

function editarAnamnese(id) {
  var a = DB.get('anamneses').find(function(x) { return x.id === id; });
  if (!a) return;
  populateSelects();
  ['an-id','an-pac','an-data','an-queixa','an-hda','an-pessoais','an-familiares','an-meds','an-alergia','an-prof-pac','an-habitos','an-diag','an-exames','an-objetivos','an-obs-fisio'].forEach(function(f) {
    var key = f.replace('an-','');
    var map = {'id':'id','pac':'pacienteId','data':'data','queixa':'queixa','hda':'hda','pessoais':'pessoais','familiares':'familiares','meds':'meds','alergia':'alergia','prof-pac':'profPac','habitos':'habitos','diag':'diag','exames':'exames','objetivos':'objetivos','obs-fisio':'obsFisio'};
    var el = document.getElementById(f); if (el) el.value = a[map[key]] || '';
  });
  document.getElementById('modal-an-title').textContent = 'Editar Anamnese';
  document.getElementById('modal-anamnese').classList.remove('hidden');
}

function salvarAnamnese() {
  var pacId = document.getElementById('an-pac').value;
  var data = document.getElementById('an-data').value;
  var queixa = document.getElementById('an-queixa').value;
  if (!pacId || !data || !queixa) { toast('Preencha os campos obrigatórios', 'error'); return; }
  var ans = DB.get('anamneses');
  var id = document.getElementById('an-id').value;
  var an = {
    id: id || DB.id(), pacienteId: pacId, data: data, queixa: queixa,
    hda: document.getElementById('an-hda').value,
    pessoais: document.getElementById('an-pessoais').value,
    familiares: document.getElementById('an-familiares').value,
    meds: document.getElementById('an-meds').value,
    alergia: document.getElementById('an-alergia').value,
    profPac: document.getElementById('an-prof-pac').value,
    habitos: document.getElementById('an-habitos').value,
    diag: document.getElementById('an-diag').value,
    exames: document.getElementById('an-exames').value,
    objetivos: document.getElementById('an-objetivos').value,
    obsFisio: document.getElementById('an-obs-fisio').value,
  };
  if (id) { var i = ans.findIndex(function(a) { return a.id === id; }); ans[i] = an; } else { ans.push(an); }
  DB.set('anamneses', ans);
  closeModal('modal-anamnese');
  toast(id ? 'Anamnese atualizada!' : 'Anamnese registrada!');
  renderAnamneses(); renderDashboard();
}

function deletarAnamnese(id) {
  if (!confirm('Excluir esta anamnese?')) return;
  DB.set('anamneses', DB.get('anamneses').filter(function(a) { return a.id !== id; }));
  toast('Anamnese excluída.'); renderAnamneses();
}

// ─── PROFISSIONAIS ─────────────────────────────────────────────────────────
function renderProfissionais() {
  var profs = DB.get('profissionais');
  var labels = {fisioterapeuta:'Fisioterapeuta',estagiario:'Estagiário',admin:'Administrador'};
  document.getElementById('profissionais-list').innerHTML = profs.map(function(p) {
    return '<div class="list-card"><div class="card-avatar">' + initials(p.nome) + '</div>' +
      '<div class="card-body"><div class="card-name">' + p.nome + '</div>' +
      '<div class="card-sub">' + (labels[p.perfil]||p.perfil) + ' · CREFITO: ' + (p.crefito||'—') + ' · ' + (p.esp||'—') + '</div>' +
      '<div class="card-sub">' + p.email + '</div></div>' +
      '<div class="card-actions">' +
      '<button class="btn-primary btn-sm" onclick="editarProfissional(\'' + p.id + '\')">✏️</button>' +
      (p.id !== 'admin001' ? '<button class="btn-danger btn-sm" onclick="deletarProfissional(\'' + p.id + '\')">🗑</button>' : '') +
      '</div></div>';
  }).join('');
}

function editarProfissional(id) {
  var p = DB.get('profissionais').find(function(x) { return x.id === id; });
  if (!p) return;
  document.getElementById('pf-id').value = p.id;
  document.getElementById('pf-nome').value = p.nome;
  document.getElementById('pf-crefito').value = p.crefito || '';
  document.getElementById('pf-email').value = p.email;
  document.getElementById('pf-senha').value = p.senha || '';
  document.getElementById('pf-tel').value = p.tel || '';
  document.getElementById('pf-perfil').value = p.perfil;
  document.getElementById('pf-esp').value = p.esp || '';
  document.getElementById('modal-pf-title').textContent = 'Editar Profissional';
  document.getElementById('modal-profissional').classList.remove('hidden');
}

function salvarProfissional() {
  var nome = document.getElementById('pf-nome').value.trim();
  var email = document.getElementById('pf-email').value.trim();
  var senha = document.getElementById('pf-senha').value;
  if (!nome || !email || !senha) { toast('Preencha os campos obrigatórios', 'error'); return; }
  var profs = DB.get('profissionais');
  var id = document.getElementById('pf-id').value;
  if (!id && profs.find(function(p) { return p.email.toLowerCase() === email.toLowerCase(); })) {
    toast('Este e-mail já está cadastrado.', 'error'); return;
  }
  var p = {
    id: id || DB.id(), nome: nome, email: email, senha: senha,
    crefito: document.getElementById('pf-crefito').value,
    tel: document.getElementById('pf-tel').value,
    perfil: document.getElementById('pf-perfil').value,
    esp: document.getElementById('pf-esp').value,
  };
  if (id) { var i = profs.findIndex(function(x) { return x.id === id; }); profs[i] = p; } else { profs.push(p); }
  DB.set('profissionais', profs);
  closeModal('modal-profissional');
  toast(id ? 'Profissional atualizado!' : 'Profissional cadastrado!');
  renderProfissionais();
}

function deletarProfissional(id) {
  if (currentUser && id === currentUser.id) { toast('Você não pode excluir sua própria conta.', 'error'); return; }
  if (!confirm('Excluir este profissional?')) return;
  DB.set('profissionais', DB.get('profissionais').filter(function(p) { return p.id !== id; }));
  toast('Profissional excluído.'); renderProfissionais();
}

// ─── RELATÓRIOS ────────────────────────────────────────────────────────────
function gerarRelatorio(tipo) {
  var pacs = DB.get('pacientes');
  var profs = DB.get('profissionais');
  var html = '';
  if (tipo === 'pacientes') {
    html = '<div class="relatorio-output-card"><h3>👤 Relatório de Pacientes (' + pacs.length + ')</h3><div style="overflow-x:auto"><table class="rel-table"><thead><tr><th>Nome</th><th>Idade</th><th>Telefone</th><th>Convênio</th><th>Profissional</th></tr></thead><tbody>' +
      pacs.map(function(p) { var prof = profs.find(function(x) { return x.id === p.profId; }); return '<tr><td>' + p.nome + '</td><td>' + idade(p.dataNasc) + ' anos</td><td>' + (p.tel||'—') + '</td><td>' + (p.convenio||'Particular') + '</td><td>' + (prof?prof.nome:'—') + '</td></tr>'; }).join('') +
      '</tbody></table></div></div>';
  } else if (tipo === 'agenda') {
    var ags = DB.get('agendamentos').sort(function(a,b) { return (a.data+a.hora).localeCompare(b.data+b.hora); });
    html = '<div class="relatorio-output-card"><h3>📅 Relatório de Agendamentos (' + ags.length + ')</h3><div style="overflow-x:auto"><table class="rel-table"><thead><tr><th>Data</th><th>Hora</th><th>Paciente</th><th>Profissional</th><th>Tipo</th><th>Status</th></tr></thead><tbody>' +
      ags.map(function(a) { var pac = pacs.find(function(p) { return p.id === a.pacienteId; }); var prof = profs.find(function(p) { return p.id === a.profId; }); return '<tr><td>' + fmtDate(a.data) + '</td><td>' + a.hora + '</td><td>' + (pac?pac.nome:'—') + '</td><td>' + (prof?prof.nome:'—') + '</td><td>' + (a.tipo||'—') + '</td><td>' + statusTag(a.status) + '</td></tr>'; }).join('') +
      '</tbody></table></div></div>';
  } else if (tipo === 'evolucoes') {
    var evs = DB.get('evolucoes').sort(function(a,b) { return b.data.localeCompare(a.data); });
    html = '<div class="relatorio-output-card"><h3>📋 Relatório de Evoluções (' + evs.length + ')</h3><div style="overflow-x:auto"><table class="rel-table"><thead><tr><th>Data</th><th>Paciente</th><th>Sessão</th><th>EVA</th><th>Alta</th></tr></thead><tbody>' +
      evs.map(function(e) { var pac = pacs.find(function(p) { return p.id === e.pacienteId; }); return '<tr><td>' + fmtDate(e.data) + '</td><td>' + (pac?pac.nome:'—') + '</td><td>' + (e.sessao||'—') + '</td><td>' + (e.eva!=null?e.eva:'—') + '/10</td><td>' + (e.alta==='sim'?'✅ Sim':'—') + '</td></tr>'; }).join('') +
      '</tbody></table></div></div>';
  }
  document.getElementById('relatorio-output').innerHTML = html;
}

// ─── HELPERS ───────────────────────────────────────────────────────────────
function fmtDateISO(d) { return d.toISOString().slice(0,10); }
function fmtDate(iso) { if (!iso) return '—'; var p = iso.split('-'); return p[2]+'/'+p[1]+'/'+p[0]; }
function idade(nasc) { if (!nasc) return '—'; return Math.floor((Date.now() - new Date(nasc)) / (365.25*24*3600*1000)); }
function initials(nome) { if (!nome) return '?'; var w = nome.trim().split(' '); return (w[0][0] + (w[1]?w[1][0]:'')).toUpperCase(); }
function statusTag(s) {
  var map = {agendado:['blue','Agendado'],confirmado:['green','Confirmado'],realizado:['green','Realizado'],cancelado:['red','Cancelado'],falta:['orange','Falta']};
  var v = map[s] || ['gray', s];
  return '<span class="tag tag-' + v[0] + '">' + v[1] + '</span>';
}

// ─── TECLADO ───────────────────────────────────────────────────────────────
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') { document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(function(m) { m.classList.add('hidden'); }); }
  if (e.key === 'Enter' && document.getElementById('login-screen').classList.contains('active')) {
    var cadVisible = !document.getElementById('painel-cadastro').classList.contains('hidden');
    if (cadVisible) doCadastro(); else doLogin();
  }
});

// ─── INIT ──────────────────────────────────────────────────────────────────
initData();

// Verifica sessão salva — com validade de 8h
(function() {
  var sess = DB.get('limavi_session', null);
  if (sess && sess.id && sess.exp && sess.exp > Date.now()) {
    var u = DB.get('profissionais').find(function(p) { return p.id === sess.id; });
    if (u) { showApp(u); return; }
  }
  // Sessão inexistente ou expirada — força login
  DB.del('limavi_session');
  showLogin();
})();
