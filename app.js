
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

// ─── AUTH (CORREÇÃO DE LOGIN) ──────────────────────────────────────────────
let currentUser = null;

function showLogin() {
  // Força a visibilidade via Style para anular a trava do HTML
  document.getElementById('login-screen').style.setProperty('display', 'flex', 'important');
  document.getElementById('app-screen').style.setProperty('display', 'none', 'important');
  
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
  
  // Inverte a visibilidade: esconde login e mostra app
  document.getElementById('login-screen').style.setProperty('display', 'none', 'important');
  document.getElementById('app-screen').style.setProperty('display', 'block', 'important');
  
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
}

// ─── SIDEBAR & MODAIS ──────────────────────────────────────────────────────
function toggleMenu() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('active');
}
function closeMenu() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('active');
}

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

function toast(msg, type) {
  const t = document.getElementById('toast');
  if(!t) return;
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
    '<div class="stat-card" onclick="navigate(\'pacientes\')" style="cursor:pointer;"><div class="stat-icon">👤</div><div><div class="stat-num">' + pacs.length + '</div><div class="stat-label">Pacientes</div></div></div>' +
    '<div class="stat-card" onclick="navigate(\'agenda\')" style="cursor:pointer; border-color:#e69c2a"><div class="stat-icon">📅</div><div><div class="stat-num">' + todayAgs.length + '</div><div class="stat-label">Hoje</div></div></div>' +
    '<div class="stat-card" onclick="navigate(\'evolucoes\')" style="cursor:pointer; border-color:#3aaa72"><div class="stat-icon">📋</div><div><div class="stat-num">' + evs.length + '</div><div class="stat-label">Evoluções</div></div></div>' +
    '<div class="stat-card" onclick="navigate(\'anamneses\')" style="cursor:pointer; border-color:#4aa896"><div class="stat-icon">📝</div><div><div class="stat-num">' + DB.get('anamneses').length + '</div><div class="stat-label">Anamneses</div></div></div>';

  document.getElementById('upcoming-list').innerHTML = upcoming.length
    ? upcoming.map(a => {
        var pac = pacs.find(p => p.id === a.pacienteId);
        return '<div class="upcoming-item" onclick="visualizarAgendamento(\'' + a.id + '\')" style="cursor:pointer"><span class="item-time">' + a.hora + '</span><div><div class="item-name">' + (pac ? pac.nome : 'N/D') + '</div><div class="item-sub">' + fmtDate(a.data) + ' · ' + statusTag(a.status) + '</div></div></div>';
      }).join('')
    : '<div class="empty-state">Sem agendamentos futuros</div>';

  var recentPacs = pacs.slice().reverse().slice(0,5);
  document.getElementById('recent-patients').innerHTML = recentPacs.length
    ? recentPacs.map(p => {
        return '<div class="recent-item" onclick="detalhePaciente(\'' + p.id + '\')" style="cursor:pointer"><div class="card-avatar">' + initials(p.nome) + '</div><div><div class="item-name">' + p.nome + '</div><div class="item-sub">' + idade(p.dataNasc) + ' anos</div></div></div>';
    }).join('')
    : '<div class="empty-state">Nenhum paciente cadastrado</div>';
}

// ─── PACIENTES ─────────────────────────────────────────────────────────────
function renderPacientes() {
  var query = (document.getElementById('search-paciente')?.value || '').toLowerCase();
  var pacs = DB.get('pacientes').filter(p => !query || p.nome.toLowerCase().includes(query));
  document.getElementById('pacientes-list').innerHTML = pacs.length
    ? pacs.map(p => `
        <div class="list-card" onclick="detalhePaciente('${p.id}')">
          <div class="card-avatar">${initials(p.nome)}</div>
          <div class="card-body"><div class="card-name">${p.nome}</div><div class="card-sub">${idade(p.dataNasc)} anos</div></div>
          <div class="card-actions" onclick="event.stopPropagation()">
            <button class="btn-primary btn-sm" onclick="editarPaciente('${p.id}')">✏️</button>
            <button class="btn-danger btn-sm" onclick="deletarPaciente('${p.id}')">🗑</button>
          </div>
        </div>`).join('')
    : '<div class="empty-state">Nenhum paciente encontrado</div>';
}

function editarPaciente(id) {
  var pac = DB.get('pacientes').find(p => p.id === id);
  if (!pac) return;
  document.getElementById('pac-id').value = pac.id;
  document.getElementById('pac-nome').value = pac.nome;
  document.getElementById('pac-nasc').value = pac.dataNasc;
  document.getElementById('pac-tel').value = pac.tel || '';
  document.getElementById('modal-paciente').classList.remove('hidden');
}

function salvarPaciente() {
  var nome = document.getElementById('pac-nome').value.trim();
  var nasc = document.getElementById('pac-nasc').value;
  if (!nome || !nasc) return;
  var pacs = DB.get('pacientes');
  var id = document.getElementById('pac-id').value;
  var data = { id: id || DB.id(), nome, dataNasc: nasc, tel: document.getElementById('pac-tel').value };
  if (id) { var i = pacs.findIndex(p => p.id === id); pacs[i] = data; } else { pacs.push(data); }
  DB.set('pacientes', pacs);
  closeModal('modal-paciente');
  renderPacientes(); renderDashboard();
}

function deletarPaciente(id) {
  if (!confirm('Excluir paciente?')) return;
  DB.set('pacientes', DB.get('pacientes').filter(p => p.id !== id));
  renderPacientes(); renderDashboard();
}

function detalhePaciente(id) {
  var pac = DB.get('pacientes').find(p => p.id === id);
  if (!pac) return;
  document.getElementById('detalhe-pac-nome').textContent = pac.nome;
  document.getElementById('detalhe-pac-body').innerHTML = `
    <div class="detail-section">
      <p><strong>Nascimento:</strong> ${fmtDate(pac.dataNasc)} (${idade(pac.dataNasc)} anos)</p>
      <p><strong>Telefone:</strong> ${pac.tel || '—'}</p>
    </div>`;
  document.getElementById('btn-editar-pac').onclick = () => { closeModal('modal-detalhe-pac'); editarPaciente(id); };
  document.getElementById('modal-detalhe-pac').classList.remove('hidden');
}

// ─── AGENDA ────────────────────────────────────────────────────────────────
function renderAgenda() {
  var ags = DB.get('agendamentos');
  var pacs = DB.get('pacientes');
  var todayStr = fmtDateISO(new Date());
  document.getElementById('week-label').textContent = 'Agendamentos';
  document.getElementById('agenda-grid').innerHTML = ags.length 
    ? ags.map(a => {
        var pac = pacs.find(p => p.id === a.pacienteId);
        return `<div class="agenda-slot" onclick="visualizarAgendamento('${a.id}')">
          <span class="slot-time">${a.hora}</span><span class="slot-name">${pac?.nome || 'N/D'}</span>
        </div>`;
      }).join('')
    : '<div class="empty-state">Sem agendamentos</div>';
}

function salvarAgendamento() {
  var pacId = document.getElementById('ag-pac').value;
  var data = document.getElementById('ag-data').value;
  var hora = document.getElementById('ag-hora').value;
  if (!pacId || !data || !hora) return;
  var ags = DB.get('agendamentos');
  ags.push({ id: DB.id(), pacienteId: pacId, data, hora, status: 'agendado' });
  DB.set('agendamentos', ags);
  closeModal('modal-agendamento');
  renderAgenda(); renderDashboard();
}

// ─── EVOLUÇÕES & ANAMNESES (VISUALIZAÇÃO) ───────────────────────────────────
function renderEvolucoes() {
  var evs = DB.get('evolucoes');
  var pacs = DB.get('pacientes');
  document.getElementById('evolucoes-list').innerHTML = evs.map(e => {
    var pac = pacs.find(p => p.id === e.pacienteId);
    return `<div class="list-card" onclick="visualizarEvolucao('${e.id}')">
      <div class="card-avatar">📋</div>
      <div class="card-body"><div class="card-name">${pac?.nome || 'N/D'}</div><div class="card-sub">${fmtDate(e.data)}</div></div>
      <div class="card-actions" onclick="event.stopPropagation()">
        <button class="btn-primary btn-sm" onclick="editarEvolucao('${e.id}')">✏️</button>
      </div>
    </div>`;
  }).join('');
}

function renderAnamneses() {
  var ans = DB.get('anamneses');
  var pacs = DB.get('pacientes');
  document.getElementById('anamneses-list').innerHTML = ans.map(a => {
    var pac = pacs.find(p => p.id === a.pacienteId);
    return `<div class="list-card" onclick="visualizarAnamnese('${a.id}')">
      <div class="card-avatar">📝</div>
      <div class="card-body"><div class="card-name">${pac?.nome || 'N/D'}</div><div class="card-sub">${fmtDate(a.data)}</div></div>
      <div class="card-actions" onclick="event.stopPropagation()">
        <button class="btn-primary btn-sm" onclick="editarAnamnese('${a.id}')">✏️</button>
      </div>
    </div>`;
  }).join('');
}

function visualizarEvolucao(id) {
  var e = DB.get('evolucoes').find(x => x.id === id);
  if (!e) return;
  document.getElementById('detalhe-pac-nome').textContent = 'Visualizar Evolução';
  document.getElementById('detalhe-pac-body').innerHTML = `<p>${e.subj || 'Sem conteúdo'}</p>`;
  document.getElementById('modal-detalhe-pac').classList.remove('hidden');
}

function visualizarAnamnese(id) {
  var a = DB.get('anamneses').find(x => x.id === id);
  if (!a) return;
  document.getElementById('detalhe-pac-nome').textContent = 'Visualizar Anamnese';
  document.getElementById('detalhe-pac-body').innerHTML = `<p>${a.queixa || 'Sem conteúdo'}</p>`;
  document.getElementById('modal-detalhe-pac').classList.remove('hidden');
}

function visualizarAgendamento(id) {
  var a = DB.get('agendamentos').find(x => x.id === id);
  if (!a) return;
  document.getElementById('detalhe-pac-nome').textContent = 'Agendamento';
  document.getElementById('detalhe-pac-body').innerHTML = `<p>Data: ${fmtDate(a.data)} às ${a.hora}</p>`;
  document.getElementById('modal-detalhe-pac').classList.remove('hidden');
}

// ─── HELPERS ───────────────────────────────────────────────────────────────
function fmtDateISO(d) { return d.toISOString().slice(0,10); }
function fmtDate(iso) { if (!iso) return '—'; var p = iso.split('-'); return p[2]+'/'+p[1]+'/'+p[0]; }
function idade(nasc) { if (!nasc) return '—'; return Math.floor((Date.now() - new Date(nasc)) / (365.25*24*3600*1000)); }
function initials(nome) { if (!nome) return '?'; var w = nome.trim().split(' '); return (w[0][0] + (w[1]?w[1][0]:'')).toUpperCase(); }
function statusTag(s) { return `<span class="tag tag-blue">${s}</span>`; }

// ─── INIT ──────────────────────────────────────────────────────────────────
initData();
(function() {
  var sess = DB.get('limavi_session', null);
  if (sess && sess.id && sess.exp > Date.now()) {
    var u = DB.get('profissionais').find(p => p.id === sess.id);
    if (u) { showApp(u); return; }
  }
  showLogin();
})();

function gerarPDFPaciente() {
  const elemento = document.getElementById('detalhe-pac-body');
  const nomePaciente = document.getElementById('detalhe-pac-nome').textContent;
  
  const opt = {
    margin:       10,
    filename:     `Prontuario_${nomePaciente.replace(/\s+/g, '_')}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2 },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(elemento).save();
}
function usarTemplate(tipo) {
  const campo = document.getElementById('ev-obj');
  let texto = "";
  
  if (tipo === 'neuro') {
    texto = "- Nível de Consciência:\n- Tônus Muscular (Ashworth):\n- Controle de Tronco:\n- Equilíbrio (Estático/Dinâmico):\n- Coordenação Motora:\n- Marcha:";
  } else if (tipo === 'respiratoria') {
    texto = "- Padrão Ventilatório:\n- Ritmo e Amplitude:\n- Sinais de Desconforto Respiratório:\n- Ausculta Pulmonar:\n- Tosse (Eficácia/Secreção):\n- SpO2 em repouso: %";
  } else if (tipo === 'orto') {
    texto = "- Inspeção (Edema/Coloração):\n- Palpação:\n- ADM (Ativa e Passiva):\n- Força Muscular (Grau 0-5):\n- Testes Especiais:\n- Alterações posturais:";
  }
  
  // Adiciona o texto se o campo estiver vazio, ou pula uma linha se já tiver algo
  campo.value = campo.value ? campo.value + "\n\n" + texto : texto;
}
function addConduta(texto) {
  const campo = document.getElementById('ev-plano');
  // Se já tiver texto, adiciona um traço na nova linha, senão, começa direto
  if (campo.value && !campo.value.endsWith('\n')) {
    campo.value += '\n- ' + texto;
  } else {
    campo.value += '- ' + texto;
  }
}// ─── MODO DE VISUALIZAÇÃO (LEITURA) ────────────────────────────────────────

function visualizarAnamnese(id) {
  var a = DB.get('anamneses').find(function(x) { return x.id === id; });
  var pac = DB.get('pacientes').find(function(p) { return p.id === a.pacienteId; });
  if (!a) return;

  document.getElementById('detalhe-pac-nome').textContent = 'Anamnese: ' + (pac ? pac.nome : 'N/D');
  document.getElementById('detalhe-pac-body').innerHTML =
    '<div class="detail-section" style="line-height: 1.6;">' +
    '<h4 style="margin-bottom: 16px;">Data: ' + fmtDate(a.data) + ' · ' + (a.diag||'Sem diagnóstico') + '</h4>' +
    '<div class="mt-8"><label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">QUEIXA PRINCIPAL</label><div>' + (a.queixa||'—').replace(/\n/g, '<br>') + '</div></div>' +
    '<div class="mt-8"><label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">HISTÓRIA (HDA)</label><div>' + (a.hda||'—').replace(/\n/g, '<br>') + '</div></div>' +
    '<div class="mt-8"><label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">ANTECEDENTES</label><div>' + (a.pessoais||'—').replace(/\n/g, '<br>') + '</div></div>' +
    '<div class="mt-8"><label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">MEDICAMENTOS</label><div>' + (a.meds||'—').replace(/\n/g, '<br>') + '</div></div>' +
    '<div class="mt-8"><label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">OBJETIVOS</label><div>' + (a.objetivos||'—').replace(/\n/g, '<br>') + '</div></div>' +
    '</div>';

  // Configura o botão azul do modal para ir para a edição, caso você queira alterar algo
  var btnEditar = document.getElementById('btn-editar-pac');
  btnEditar.textContent = "Editar Anamnese";
  btnEditar.onclick = function() { closeModal('modal-detalhe-pac'); editarAnamnese(id); };
  
  document.getElementById('modal-detalhe-pac').classList.remove('hidden');
}

function visualizarEvolucao(id) {
  var e = DB.get('evolucoes').find(function(x) { return x.id === id; });
  var pac = DB.get('pacientes').find(function(p) { return p.id === e.pacienteId; });
  if (!e) return;

  document.getElementById('detalhe-pac-nome').textContent = 'Evolução: ' + (pac ? pac.nome : 'N/D');
  document.getElementById('detalhe-pac-body').innerHTML =
    '<div class="detail-section" style="line-height: 1.6;">' +
    '<h4 style="margin-bottom: 16px;">Data: ' + fmtDate(e.data) + ' · Sessão ' + (e.sessao||'—') + ' · EVA: ' + (e.eva!=null?e.eva:'—') + '/10</h4>' +
    '<div class="mt-8"><label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">SUBJETIVO (S)</label><div>' + (e.subj||'—').replace(/\n/g, '<br>') + '</div></div>' +
    '<div class="mt-8"><label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">OBJETIVO (O)</label><div>' + (e.obj||'—').replace(/\n/g, '<br>') + '</div></div>' +
    '<div class="mt-8"><label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">AVALIAÇÃO (A)</label><div>' + (e.aval||'—').replace(/\n/g, '<br>') + '</div></div>' +
    '<div class="mt-8"><label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">PLANO / CONDUTA (P)</label><div>' + (e.plano||'—').replace(/\n/g, '<br>') + '</div></div>' +
    '</div>';

  var btnEditar = document.getElementById('btn-editar-pac');
  btnEditar.textContent = "Editar Evolução";
  btnEditar.onclick = function() { closeModal('modal-detalhe-pac'); editarEvolucao(id); };
  
  document.getElementById('modal-detalhe-pac').classList.remove('hidden');
}
function visualizarAgendamento(id) {
  var ag = DB.get('agendamentos').find(function(a) { return a.id === id; });
  var pac = DB.get('pacientes').find(function(p) { return p.id === ag.pacienteId; });
  var prof = DB.get('profissionais').find(function(p) { return p.id === ag.profId; });
  if (!ag) return;

  var tipos = {avaliacao: 'Avaliação', sessao: 'Sessão', retorno: 'Retorno', alta: 'Alta'};

  document.getElementById('detalhe-pac-nome').textContent = 'Detalhes do Agendamento';
  document.getElementById('detalhe-pac-body').innerHTML =
    '<div class="detail-section" style="line-height: 1.6;">' +
    '<h4 style="margin-bottom: 16px;">' + (pac ? pac.nome : 'Paciente não encontrado') + '</h4>' +
    '<div class="detail-grid">' +
      '<div class="detail-item"><label>DATA</label><span>' + fmtDate(ag.data) + '</span></div>' +
      '<div class="detail-item"><label>HORÁRIO</label><span>' + ag.hora + ' (' + ag.duracao + ' min)</span></div>' +
      '<div class="detail-item"><label>TIPO</label><span>' + (tipos[ag.tipo] || ag.tipo) + '</span></div>' +
      '<div class="detail-item"><label>STATUS</label><span>' + statusTag(ag.status) + '</span></div>' +
      '<div class="detail-item"><label>PROFISSIONAL</label><span>' + (prof ? prof.nome : '—') + '</span></div>' +
    '</div>' +
    '<div class="mt-16"><label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">OBSERVAÇÕES</label><div>' + (ag.obs || 'Nenhuma observação.').replace(/\n/g, '<br>') + '</div></div>' +
    '</div>';

  var btnEditar = document.getElementById('btn-editar-pac');
  btnEditar.textContent = "Editar Agendamento";
  btnEditar.onclick = function() { closeModal('modal-detalhe-pac'); editarAgendamento(id); };
  
  document.getElementById('modal-detalhe-pac').classList.remove('hidden');
}
