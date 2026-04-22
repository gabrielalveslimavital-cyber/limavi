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

// ─── DASHBOARD ─────────────────────────────────────────────────────────────
function renderDashboard() {
  const pacs = DB.get('pacientes');
  const ags = DB.get('agendamentos');
  const evs = DB.get('evolucoes');
  const ans = DB.get('anamneses');
  const today = fmtDateISO(new Date());
  const todayAgs = ags.filter(a => a.data === today);

  document.getElementById('stats-grid').innerHTML =
    '<div class="stat-card" onclick="navigate(\'pacientes\')" style="cursor:pointer;"><div class="stat-icon">👤</div><div><div class="stat-num">' + pacs.length + '</div><div class="stat-label">Pacientes</div></div></div>' +
    '<div class="stat-card" onclick="navigate(\'agenda\')" style="cursor:pointer; border-color:#e69c2a"><div class="stat-icon">📅</div><div><div class="stat-num">' + todayAgs.length + '</div><div class="stat-label">Hoje</div></div></div>' +
    '<div class="stat-card" onclick="navigate(\'evolucoes\')" style="cursor:pointer; border-color:#3aaa72"><div class="stat-icon">📋</div><div><div class="stat-num">' + evs.length + '</div><div class="stat-label">Evoluções</div></div></div>' +
    '<div class="stat-card" onclick="navigate(\'anamneses\')" style="cursor:pointer; border-color:#4aa896"><div class="stat-icon">📝</div><div><div class="stat-num">' + ans.length + '</div><div class="stat-label">Anamneses</div></div></div>';
}

// ─── PACIENTES (CORREÇÃO DE EDIÇÃO) ────────────────────────────────────────
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
  openModal('modal-paciente');
}

function salvarPaciente() {
  var id = document.getElementById('pac-id').value;
  var nome = document.getElementById('pac-nome').value.trim();
  var nasc = document.getElementById('pac-nasc').value;
  if (!nome || !nasc) return;

  var pacs = DB.get('pacientes');
  var obj = { id: id || DB.id(), nome, dataNasc: nasc, tel: document.getElementById('pac-tel').value };

  if (id) {
    var i = pacs.findIndex(p => p.id === id);
    if (i !== -1) pacs[i] = obj;
  } else {
    pacs.push(obj);
  }
  
  DB.set('pacientes', pacs);
  closeModal('modal-paciente');
  renderPacientes(); renderDashboard();
  toast(id ? 'Paciente atualizado!' : 'Paciente cadastrado!');
}

// ─── AGENDA (CORREÇÃO DE EDIÇÃO) ───────────────────────────────────────────
function renderAgenda() {
  var ags = DB.get('agendamentos');
  var pacs = DB.get('pacientes');
  document.getElementById('agenda-grid').innerHTML = ags.length 
    ? ags.map(a => {
        var pac = pacs.find(p => p.id === a.pacienteId);
        return `<div class="agenda-slot" onclick="editarAgendamento('${a.id}')">
          <span class="slot-time">${a.hora}</span><span class="slot-name">${pac?.nome || 'N/D'}</span>
        </div>`;
      }).join('')
    : '<div class="empty-state">Sem agendamentos</div>';
}

function editarAgendamento(id) {
  var ag = DB.get('agendamentos').find(a => a.id === id);
  if (!ag) return;
  openModal('modal-agendamento');
  document.getElementById('ag-id').value = ag.id;
  document.getElementById('ag-pac').value = ag.pacienteId;
  document.getElementById('ag-data').value = ag.data;
  document.getElementById('ag-hora').value = ag.hora;
  document.getElementById('ag-status').value = ag.status || 'agendado';
}

function salvarAgendamento() {
  var id = document.getElementById('ag-id').value;
  var pacId = document.getElementById('ag-pac').value;
  var data = document.getElementById('ag-data').value;
  var hora = document.getElementById('ag-hora').value;
  if (!pacId || !data || !hora) return;

  var ags = DB.get('agendamentos');
  var obj = { id: id || DB.id(), pacienteId: pacId, data, hora, status: document.getElementById('ag-status').value };

  if (id) {
    var i = ags.findIndex(a => a.id === id);
    if (i !== -1) ags[i] = obj;
  } else {
    ags.push(obj);
  }

  DB.set('agendamentos', ags);
  closeModal('modal-agendamento');
  renderAgenda(); renderDashboard();
  toast('Agenda atualizada!');
}

// ─── EVOLUÇÕES (CORREÇÃO DE EDIÇÃO) ────────────────────────────────────────
function renderEvolucoes() {
  var evs = DB.get('evolucoes');
  var pacs = DB.get('pacientes');
  document.getElementById('evolucoes-list').innerHTML = evs.map(e => {
    var pac = pacs.find(p => p.id === e.pacienteId);
    return `<div class="list-card">
      <div class="card-body" onclick="visualizarEvolucao('${e.id}')"><div class="card-name">${pac?.nome || 'N/D'}</div><div class="card-sub">${fmtDate(e.data)}</div></div>
      <div class="card-actions">
        <button class="btn-primary btn-sm" onclick="editarEvolucao('${e.id}')">✏️</button>
      </div>
    </div>`;
  }).join('');
}

function editarEvolucao(id) {
  var ev = DB.get('evolucoes').find(e => e.id === id);
  if (!ev) return;
  openModal('modal-evolucao');
  document.getElementById('ev-id').value = ev.id;
  document.getElementById('ev-pac').value = ev.pacienteId;
  document.getElementById('ev-data').value = ev.data;
  document.getElementById('ev-texto').value = ev.texto || ev.subj || '';
}

function salvarEvolucao() {
  var id = document.getElementById('ev-id').value;
  var pacId = document.getElementById('ev-pac').value;
  var texto = document.getElementById('ev-texto').value;
  if (!pacId || !texto) return;

  var evs = DB.get('evolucoes');
  var obj = { id: id || DB.id(), pacienteId: pacId, data: document.getElementById('ev-data').value, texto: texto };

  if (id) {
    var i = evs.findIndex(e => e.id === id);
    if (i !== -1) evs[i] = obj;
  } else {
    evs.push(obj);
  }

  DB.set('evolucoes', evs);
  closeModal('modal-evolucao');
  renderEvolucoes(); renderDashboard();
  toast('Evolução salva!');
}

// ─── AUXILIARES (MODAIS E UI) ──────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
  populateSelects();
}
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  // Limpa IDs ocultos ao fechar para não bugar a próxima criação
  const inputs = document.getElementById(id).querySelectorAll('input[type="hidden"]');
  inputs.forEach(i => i.value = '');
}

function populateSelects() {
  const pacs = DB.get('pacientes');
  const opts = '<option value="">Selecione o paciente</option>' + pacs.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
  ['ag-pac','ev-pac','an-pac'].forEach(id => { 
    const el = document.getElementById(id); 
    if (el) {
        const val = el.value; 
        el.innerHTML = opts; 
        el.value = val; 
    }
  });
}

function toast(msg) {
  const t = document.getElementById('toast');
  if(!t) return;
  t.textContent = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3000);
}

function toggleMenu() { document.getElementById('sidebar').classList.toggle('open'); }
function closeMenu() { document.getElementById('sidebar').classList.remove('open'); }

function fmtDateISO(d) { return d.toISOString().slice(0,10); }
function fmtDate(iso) { if (!iso) return '—'; var p = iso.split('-'); return p[2]+'/'+p[1]+'/'+p[0]; }
function idade(nasc) { if (!nasc) return '—'; return Math.floor((Date.now() - new Date(nasc)) / (365.25*24*3600*1000)); }
function initials(nome) { if (!nome) return '?'; var w = nome.trim().split(' '); return (w[0][0] + (w[1]?w[1][0]:'')).toUpperCase(); }

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
