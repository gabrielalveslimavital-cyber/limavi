// ===================== LIMAVI FISIOTERAPIA - APP.JS =====================

// ─── STORAGE HELPERS ───────────────────────────────────────────────────────
const DB = {
  get: (k, def = []) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  id: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
};

// ─── INITIAL DATA ──────────────────────────────────────────────────────────
function initData() {
  if (!DB.get('limavi_init', null)) {
    DB.set('profissionais', [{
      id: 'admin001', nome: 'Administrador', email: 'admin@limavi.com',
      senha: 'limavi2024', perfil: 'admin', crefito: '', tel: '', esp: 'Gestão'
    }]);
    DB.set('pacientes', []);
    DB.set('agendamentos', []);
    DB.set('evolucoes', []);
    DB.set('anamneses', []);
    DB.set('limavi_init', true);
  }
}

// ─── AUTH ──────────────────────────────────────────────────────────────────
let currentUser = null;

function doLogin() {
  const email = document.getElementById('login-user').value.trim().toLowerCase();
  const senha = document.getElementById('login-pass').value;
  const profs = DB.get('profissionais');
  const user = profs.find(p => p.email.toLowerCase() === email && p.senha === senha);
  if (!user) {
    document.getElementById('login-error').classList.remove('hidden');
    return;
  }
  document.getElementById('login-error').classList.add('hidden');
  currentUser = user;
  DB.set('limavi_session', user.id);
  document.getElementById('user-badge').textContent = user.nome;
  // Admin menu
  const isAdmin = user.perfil === 'admin';
  document.getElementById('nav-profissionais').style.display = isAdmin ? '' : 'none';
  document.getElementById('nav-relatorios').style.display = isAdmin ? '' : 'none';
  document.getElementById('login-screen').classList.remove('active');
  document.getElementById('app-screen').classList.add('active');
  navigate('dashboard');
}

function doLogout() {
  currentUser = null;
  DB.set('limavi_session', null);
  document.getElementById('app-screen').classList.remove('active');
  document.getElementById('login-screen').classList.add('active');
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
  closeMenu();
}

function togglePass() {
  const el = document.getElementById('login-pass');
  el.type = el.type === 'password' ? 'text' : 'password';
}

// ─── NAVIGATION ────────────────────────────────────────────────────────────
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');
  const link = document.querySelector(`.nav-link[data-page="${page}"]`);
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
  document.getElementById(id).classList.remove('hidden');
  populateSelects();
}
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// ─── SELECTS DINÂMICOS ─────────────────────────────────────────────────────
function populateSelects() {
  const pacs = DB.get('pacientes');
  const profs = DB.get('profissionais');
  const pacOpts = '<option value="">Selecione o paciente</option>' + pacs.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
  const profOpts = '<option value="">Selecione</option>' + profs.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
  ['ag-pac', 'ev-pac', 'an-pac'].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = pacOpts; });
  ['ag-prof', 'ev-prof', 'pac-prof'].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = profOpts; });
}

// ─── TOAST ─────────────────────────────────────────────────────────────────
function toast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3000);
}

// ─── DASHBOARD ─────────────────────────────────────────────────────────────
function renderDashboard() {
  const pacs = DB.get('pacientes');
  const ags = DB.get('agendamentos');
  const evs = DB.get('evolucoes');
  const today = fmtDateISO(new Date());

  const todayAgs = ags.filter(a => a.data === today);
  const upcomingAgs = ags.filter(a => a.data >= today && a.status !== 'cancelado').sort((a,b) => (a.data+a.hora).localeCompare(b.data+b.hora)).slice(0, 6);

  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card"><div class="stat-icon">👤</div><div><div class="stat-num">${pacs.length}</div><div class="stat-label">Pacientes</div></div></div>
    <div class="stat-card" style="border-color:#e69c2a"><div class="stat-icon">📅</div><div><div class="stat-num">${todayAgs.length}</div><div class="stat-label">Hoje</div></div></div>
    <div class="stat-card" style="border-color:#3aaa72"><div class="stat-icon">📋</div><div><div class="stat-num">${evs.length}</div><div class="stat-label">Evoluções</div></div></div>
    <div class="stat-card" style="border-color:#4aa896"><div class="stat-icon">📝</div><div><div class="stat-num">${DB.get('anamneses').length}</div><div class="stat-label">Anamneses</div></div></div>
  `;

  const profs = DB.get('profissionais');
  document.getElementById('upcoming-list').innerHTML = upcomingAgs.length
    ? upcomingAgs.map(a => {
        const pac = pacs.find(p => p.id === a.pacienteId);
        return `<div class="upcoming-item"><span class="item-time">${a.hora}</span><div><div class="item-name">${pac ? pac.nome : 'N/D'}</div><div class="item-sub">${fmtDate(a.data)} · ${statusTag(a.status)}</div></div></div>`;
      }).join('')
    : '<div class="empty-state"><div class="empty-icon">📅</div>Sem agendamentos futuros</div>';

  const recentPacs = [...pacs].reverse().slice(0, 5);
  document.getElementById('recent-patients').innerHTML = recentPacs.length
    ? recentPacs.map(p => `<div class="recent-item"><div class="card-avatar">${initials(p.nome)}</div><div><div class="item-name">${p.nome}</div><div class="item-sub">${idade(p.dataNasc)} anos · ${p.tel || '—'}</div></div></div>`).join('')
    : '<div class="empty-state"><div class="empty-icon">👤</div>Nenhum paciente cadastrado</div>';
}

// ─── PACIENTES ─────────────────────────────────────────────────────────────
function renderPacientes() {
  const query = (document.getElementById('search-paciente')?.value || '').toLowerCase();
  const pacs = DB.get('pacientes').filter(p => !query || p.nome.toLowerCase().includes(query) || (p.tel||'').includes(query));
  const list = document.getElementById('pacientes-list');
  list.innerHTML = pacs.length ? pacs.map(p => `
    <div class="list-card" onclick="detalhePaciente('${p.id}')">
      <div class="card-avatar">${initials(p.nome)}</div>
      <div class="card-body">
        <div class="card-name">${p.nome}</div>
        <div class="card-sub">${idade(p.dataNasc)} anos · ${p.tel || '—'} · ${p.convenio || 'Particular'}</div>
      </div>
      <div class="card-actions" onclick="event.stopPropagation()">
        <button class="btn-primary btn-sm" onclick="editarPaciente('${p.id}')">✏️</button>
        <button class="btn-danger btn-sm" onclick="deletarPaciente('${p.id}')">🗑</button>
      </div>
    </div>`).join('') : '<div class="empty-state"><div class="empty-icon">👤</div>Nenhum paciente encontrado</div>';
}

function novoEditarPaciente(id) {
  const pac = id ? DB.get('pacientes').find(p => p.id === id) : null;
  const profs = DB.get('profissionais');
  document.getElementById('pac-prof').innerHTML = '<option value="">Selecione</option>' + profs.map(p => `<option value="${p.id}" ${pac && pac.profId === p.id ? 'selected' : ''}>${p.nome}</option>`).join('');
  document.getElementById('pac-id').value = pac ? pac.id : '';
  document.getElementById('pac-nome').value = pac ? pac.nome : '';
  document.getElementById('pac-nasc').value = pac ? pac.dataNasc : '';
  document.getElementById('pac-cpf').value = pac ? (pac.cpf || '') : '';
  document.getElementById('pac-tel').value = pac ? (pac.tel || '') : '';
  document.getElementById('pac-email').value = pac ? (pac.email || '') : '';
  document.getElementById('pac-sexo').value = pac ? (pac.sexo || '') : '';
  document.getElementById('pac-end').value = pac ? (pac.end || '') : '';
  document.getElementById('pac-convenio').value = pac ? (pac.convenio || '') : '';
  document.getElementById('pac-obs').value = pac ? (pac.obs || '') : '';
  document.getElementById('modal-paciente-title').textContent = pac ? 'Editar Paciente' : 'Novo Paciente';
  openModal('modal-paciente');
}

function editarPaciente(id) { novoEditarPaciente(id); }

function salvarPaciente() {
  const nome = document.getElementById('pac-nome').value.trim();
  const nasc = document.getElementById('pac-nasc').value;
  const tel = document.getElementById('pac-tel').value.trim();
  if (!nome || !nasc || !tel) { toast('Preencha os campos obrigatórios (*)','error'); return; }
  const pacs = DB.get('pacientes');
  const id = document.getElementById('pac-id').value;
  const data = {
    id: id || DB.id(), nome, dataNasc: nasc, tel,
    cpf: document.getElementById('pac-cpf').value, email: document.getElementById('pac-email').value,
    sexo: document.getElementById('pac-sexo').value, end: document.getElementById('pac-end').value,
    convenio: document.getElementById('pac-convenio').value, obs: document.getElementById('pac-obs').value,
    profId: document.getElementById('pac-prof').value,
  };
  if (id) { const i = pacs.findIndex(p => p.id === id); pacs[i] = data; } else { pacs.push(data); }
  DB.set('pacientes', pacs);
  closeModal('modal-paciente');
  toast(id ? 'Paciente atualizado!' : 'Paciente cadastrado!');
  renderPacientes();
  renderDashboard();
}

function deletarPaciente(id) {
  if (!confirm('Excluir este paciente? Os registros vinculados serão mantidos.')) return;
  DB.set('pacientes', DB.get('pacientes').filter(p => p.id !== id));
  toast('Paciente excluído.'); renderPacientes(); renderDashboard();
}

function detalhePaciente(id) {
  const pac = DB.get('pacientes').find(p => p.id === id);
  if (!pac) return;
  const evs = DB.get('evolucoes').filter(e => e.pacienteId === id);
  const ags = DB.get('agendamentos').filter(a => a.pacienteId === id);
  const ans = DB.get('anamneses').filter(a => a.pacienteId === id);
  const profs = DB.get('profissionais');
  const prof = profs.find(p => p.id === pac.profId);

  document.getElementById('detalhe-pac-nome').textContent = pac.nome;
  document.getElementById('detalhe-pac-body').innerHTML = `
    <div class="detail-section">
      <h4>Dados Pessoais</h4>
      <div class="detail-grid">
        <div class="detail-item"><label>Nome</label><span>${pac.nome}</span></div>
        <div class="detail-item"><label>Nascimento</label><span>${fmtDate(pac.dataNasc)} (${idade(pac.dataNasc)} anos)</span></div>
        <div class="detail-item"><label>CPF</label><span>${pac.cpf || '—'}</span></div>
        <div class="detail-item"><label>Sexo</label><span>${{M:'Masculino',F:'Feminino',O:'Outro'}[pac.sexo] || '—'}</span></div>
        <div class="detail-item"><label>Telefone</label><span>${pac.tel || '—'}</span></div>
        <div class="detail-item"><label>Email</label><span>${pac.email || '—'}</span></div>
        <div class="detail-item"><label>Endereço</label><span>${pac.end || '—'}</span></div>
        <div class="detail-item"><label>Convênio</label><span>${pac.convenio || 'Particular'}</span></div>
        <div class="detail-item"><label>Profissional</label><span>${prof ? prof.nome : '—'}</span></div>
        <div class="detail-item"><label>Observações</label><span>${pac.obs || '—'}</span></div>
      </div>
    </div>
    <div class="detail-section">
      <h4>Resumo · ${evs.length} evolução(ões) · ${ags.length} agendamento(s) · ${ans.length} anamnese(s)</h4>
      <div class="timeline">
        ${evs.slice(-5).reverse().map(e => `
          <div class="timeline-item">
            <div class="tl-date">📋 ${fmtDate(e.data)}</div>
            <div class="tl-body"><div class="tl-label">Evolução · Sessão ${e.sessao || '—'}</div><div>${e.plano ? e.plano.substring(0,80)+'...' : '—'}</div></div>
          </div>`).join('') || '<div class="text-muted">Sem evoluções ainda.</div>'}
      </div>
    </div>`;
  document.getElementById('btn-editar-pac').onclick = () => { closeModal('modal-detalhe-pac'); editarPaciente(id); };
  openModal('modal-detalhe-pac');
}

// ─── AGENDAMENTOS ──────────────────────────────────────────────────────────
let currentWeekOffset = 0;

function renderAgenda() {
  const ags = DB.get('agendamentos');
  const pacs = DB.get('pacientes');
  const profs = DB.get('profissionais');

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + (currentWeekOffset * 7));
  startOfWeek.setHours(0,0,0,0);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    days.push(d);
  }

  const label = `${fmtDate(fmtDateISO(days[0]))} — ${fmtDate(fmtDateISO(days[6]))}`;
  document.getElementById('week-label').textContent = label;

  const todayStr = fmtDateISO(new Date());
  const grid = document.getElementById('agenda-grid');
  grid.innerHTML = days.map(d => {
    const ds = fmtDateISO(d);
    const dayAgs = ags.filter(a => a.data === ds).sort((a,b) => a.hora.localeCompare(b.hora));
    const isToday = ds === todayStr;
    const dnames = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    return `
      <div class="agenda-day">
        <div class="agenda-day-header ${isToday ? 'today' : ''}">${dnames[d.getDay()]} · ${d.getDate()}/${d.getMonth()+1} ${isToday ? '· Hoje' : ''}</div>
        <div class="agenda-slots">
          ${dayAgs.length ? dayAgs.map(a => {
            const pac = pacs.find(p => p.id === a.pacienteId);
            const prof = profs.find(p => p.id === a.profId);
            return `<div class="agenda-slot" onclick="editarAgendamento('${a.id}')">
              <span class="slot-time">${a.hora}</span>
              <span class="slot-name">${pac ? pac.nome : 'N/D'}</span>
              <span>${statusTag(a.status)}</span>
            </div>`;
          }).join('') : '<div class="empty-day">Sem agendamentos</div>'}
        </div>
      </div>`;
  }).join('');
}

function changeWeek(dir) { currentWeekOffset += dir; renderAgenda(); }

function editarAgendamento(id) {
  const ag = DB.get('agendamentos').find(a => a.id === id);
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
  openModal('modal-agendamento');
}

function salvarAgendamento() {
  const pacId = document.getElementById('ag-pac').value;
  const data = document.getElementById('ag-data').value;
  const hora = document.getElementById('ag-hora').value;
  const profId = document.getElementById('ag-prof').value;
  if (!pacId || !data || !hora || !profId) { toast('Preencha os campos obrigatórios','error'); return; }
  const ags = DB.get('agendamentos');
  const id = document.getElementById('ag-id').value;
  const ag = {
    id: id || DB.id(), pacienteId: pacId, profId, data, hora,
    duracao: document.getElementById('ag-dur').value,
    status: document.getElementById('ag-status').value,
    tipo: document.getElementById('ag-tipo').value,
    obs: document.getElementById('ag-obs').value,
  };
  if (id) { const i = ags.findIndex(a => a.id === id); ags[i] = ag; } else { ags.push(ag); }
  DB.set('agendamentos', ags);
  closeModal('modal-agendamento');
  toast(id ? 'Agendamento atualizado!' : 'Agendamento criado!');
  renderAgenda(); renderDashboard();
}

// ─── EVOLUÇÕES ─────────────────────────────────────────────────────────────
function renderEvolucoes() {
  const query = (document.getElementById('search-evolucao')?.value || '').toLowerCase();
  const pacs = DB.get('pacientes');
  const evs = DB.get('evolucoes').filter(e => {
    if (!query) return true;
    const pac = pacs.find(p => p.id === e.pacienteId);
    return pac && pac.nome.toLowerCase().includes(query);
  }).sort((a,b) => b.data.localeCompare(a.data));

  document.getElementById('evolucoes-list').innerHTML = evs.length ? evs.map(e => {
    const pac = pacs.find(p => p.id === e.pacienteId);
    return `<div class="list-card">
      <div class="card-avatar">📋</div>
      <div class="card-body">
        <div class="card-name">${pac ? pac.nome : 'N/D'}</div>
        <div class="card-sub">${fmtDate(e.data)} · Sessão ${e.sessao || '—'} · EVA: ${e.eva ?? '—'}/10</div>
        <div class="card-sub mt-8">${(e.subj || '').substring(0,60)}${e.subj && e.subj.length > 60 ? '...' : ''}</div>
      </div>
      <div class="card-actions">
        <button class="btn-primary btn-sm" onclick="editarEvolucao('${e.id}')">✏️</button>
        <button class="btn-danger btn-sm" onclick="deletarEvolucao('${e.id}')">🗑</button>
      </div>
    </div>`;
  }).join('') : '<div class="empty-state"><div class="empty-icon">📋</div>Nenhuma evolução encontrada</div>';
}

function editarEvolucao(id) {
  const e = DB.get('evolucoes').find(x => x.id === id);
  if (!e) return;
  populateSelects();
  ['ev-id','ev-pac','ev-data','ev-sessao','ev-subj','ev-obj','ev-aval','ev-plano','ev-eva'].forEach(f => {
    const key = f.replace('ev-','');
    const map = {id:'id',pac:'pacienteId',data:'data',sessao:'sessao',subj:'subj',obj:'obj',aval:'aval',plano:'plano',eva:'eva'};
    const el = document.getElementById(f); if (el) el.value = e[map[key]] ?? '';
  });
  document.getElementById('ev-prof').value = e.profId || '';
  document.getElementById('ev-alta').value = e.alta || 'nao';
  document.getElementById('modal-ev-title').textContent = 'Editar Evolução';
  openModal('modal-evolucao');
}

function salvarEvolucao() {
  const pacId = document.getElementById('ev-pac').value;
  const data = document.getElementById('ev-data').value;
  if (!pacId || !data) { toast('Selecione o paciente e a data','error'); return; }
  const evs = DB.get('evolucoes');
  const id = document.getElementById('ev-id').value;
  const ev = {
    id: id || DB.id(), pacienteId: pacId, data,
    profId: document.getElementById('ev-prof').value,
    sessao: document.getElementById('ev-sessao').value,
    subj: document.getElementById('ev-subj').value,
    obj: document.getElementById('ev-obj').value,
    aval: document.getElementById('ev-aval').value,
    plano: document.getElementById('ev-plano').value,
    eva: document.getElementById('ev-eva').value,
    alta: document.getElementById('ev-alta').value,
  };
  if (id) { const i = evs.findIndex(e => e.id === id); evs[i] = ev; } else { evs.push(ev); }
  DB.set('evolucoes', evs);
  closeModal('modal-evolucao');
  toast(id ? 'Evolução atualizada!' : 'Evolução registrada!');
  renderEvolucoes(); renderDashboard();
}

function deletarEvolucao(id) {
  if (!confirm('Excluir esta evolução?')) return;
  DB.set('evolucoes', DB.get('evolucoes').filter(e => e.id !== id));
  toast('Evolução excluída.'); renderEvolucoes();
}

// ─── ANAMNESES ─────────────────────────────────────────────────────────────
function renderAnamneses() {
  const query = (document.getElementById('search-anamnese')?.value || '').toLowerCase();
  const pacs = DB.get('pacientes');
  const ans = DB.get('anamneses').filter(a => {
    if (!query) return true;
    const pac = pacs.find(p => p.id === a.pacienteId);
    return pac && pac.nome.toLowerCase().includes(query);
  }).sort((a,b) => b.data.localeCompare(a.data));

  document.getElementById('anamneses-list').innerHTML = ans.length ? ans.map(a => {
    const pac = pacs.find(p => p.id === a.pacienteId);
    return `<div class="list-card">
      <div class="card-avatar">📝</div>
      <div class="card-body">
        <div class="card-name">${pac ? pac.nome : 'N/D'}</div>
        <div class="card-sub">${fmtDate(a.data)} · ${a.diag || 'Sem diagnóstico informado'}</div>
        <div class="card-sub mt-8">${(a.queixa || '').substring(0,60)}${a.queixa && a.queixa.length > 60 ? '...' : ''}</div>
      </div>
      <div class="card-actions">
        <button class="btn-primary btn-sm" onclick="editarAnamnese('${a.id}')">✏️</button>
        <button class="btn-danger btn-sm" onclick="deletarAnamnese('${a.id}')">🗑</button>
      </div>
    </div>`;
  }).join('') : '<div class="empty-state"><div class="empty-icon">📝</div>Nenhuma anamnese encontrada</div>';
}

function editarAnamnese(id) {
  const a = DB.get('anamneses').find(x => x.id === id);
  if (!a) return;
  populateSelects();
  document.getElementById('an-id').value = a.id;
  document.getElementById('an-pac').value = a.pacienteId;
  document.getElementById('an-data').value = a.data;
  document.getElementById('an-queixa').value = a.queixa || '';
  document.getElementById('an-hda').value = a.hda || '';
  document.getElementById('an-pessoais').value = a.pessoais || '';
  document.getElementById('an-familiares').value = a.familiares || '';
  document.getElementById('an-meds').value = a.meds || '';
  document.getElementById('an-alergia').value = a.alergia || '';
  document.getElementById('an-prof-pac').value = a.profPac || '';
  document.getElementById('an-habitos').value = a.habitos || '';
  document.getElementById('an-diag').value = a.diag || '';
  document.getElementById('an-exames').value = a.exames || '';
  document.getElementById('an-objetivos').value = a.objetivos || '';
  document.getElementById('an-obs-fisio').value = a.obsFisio || '';
  document.getElementById('modal-an-title').textContent = 'Editar Anamnese';
  openModal('modal-anamnese');
}

function salvarAnamnese() {
  const pacId = document.getElementById('an-pac').value;
  const data = document.getElementById('an-data').value;
  const queixa = document.getElementById('an-queixa').value;
  if (!pacId || !data || !queixa) { toast('Preencha os campos obrigatórios','error'); return; }
  const ans = DB.get('anamneses');
  const id = document.getElementById('an-id').value;
  const an = {
    id: id || DB.id(), pacienteId: pacId, data, queixa,
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
  if (id) { const i = ans.findIndex(a => a.id === id); ans[i] = an; } else { ans.push(an); }
  DB.set('anamneses', ans);
  closeModal('modal-anamnese');
  toast(id ? 'Anamnese atualizada!' : 'Anamnese registrada!');
  renderAnamneses(); renderDashboard();
}

function deletarAnamnese(id) {
  if (!confirm('Excluir esta anamnese?')) return;
  DB.set('anamneses', DB.get('anamneses').filter(a => a.id !== id));
  toast('Anamnese excluída.'); renderAnamneses();
}

// ─── PROFISSIONAIS ─────────────────────────────────────────────────────────
function renderProfissionais() {
  const profs = DB.get('profissionais');
  document.getElementById('profissionais-list').innerHTML = profs.map(p => `
    <div class="list-card">
      <div class="card-avatar">${initials(p.nome)}</div>
      <div class="card-body">
        <div class="card-name">${p.nome}</div>
        <div class="card-sub">${{fisioterapeuta:'Fisioterapeuta',estagiario:'Estagiário',admin:'Administrador'}[p.perfil] || p.perfil} · ${p.crefito || '—'} · ${p.esp || '—'}</div>
        <div class="card-sub">${p.email}</div>
      </div>
      <div class="card-actions">
        <button class="btn-primary btn-sm" onclick="editarProfissional('${p.id}')">✏️</button>
        ${p.id !== 'admin001' ? `<button class="btn-danger btn-sm" onclick="deletarProfissional('${p.id}')">🗑</button>` : ''}
      </div>
    </div>`).join('');
}

function editarProfissional(id) {
  const p = DB.get('profissionais').find(x => x.id === id);
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
  openModal('modal-profissional');
}

function salvarProfissional() {
  const nome = document.getElementById('pf-nome').value.trim();
  const email = document.getElementById('pf-email').value.trim();
  const senha = document.getElementById('pf-senha').value;
  if (!nome || !email || !senha) { toast('Preencha os campos obrigatórios','error'); return; }
  const profs = DB.get('profissionais');
  const id = document.getElementById('pf-id').value;
  const p = {
    id: id || DB.id(), nome, email, senha,
    crefito: document.getElementById('pf-crefito').value,
    tel: document.getElementById('pf-tel').value,
    perfil: document.getElementById('pf-perfil').value,
    esp: document.getElementById('pf-esp').value,
  };
  if (id) { const i = profs.findIndex(x => x.id === id); profs[i] = p; } else { profs.push(p); }
  DB.set('profissionais', profs);
  closeModal('modal-profissional');
  toast(id ? 'Profissional atualizado!' : 'Profissional cadastrado!');
  renderProfissionais();
}

function deletarProfissional(id) {
  if (!confirm('Excluir este profissional?')) return;
  DB.set('profissionais', DB.get('profissionais').filter(p => p.id !== id));
  toast('Profissional excluído.'); renderProfissionais();
}

// ─── RELATÓRIOS ────────────────────────────────────────────────────────────
function gerarRelatorio(tipo) {
  const pacs = DB.get('pacientes');
  const profs = DB.get('profissionais');
  let html = '';
  if (tipo === 'pacientes') {
    html = `<div class="relatorio-output-card"><h3>👤 Relatório de Pacientes (${pacs.length})</h3>
      <table class="rel-table"><thead><tr><th>Nome</th><th>Idade</th><th>Telefone</th><th>Convênio</th><th>Profissional</th></tr></thead>
      <tbody>${pacs.map(p => {
        const prof = profs.find(x => x.id === p.profId);
        return `<tr><td>${p.nome}</td><td>${idade(p.dataNasc)} anos</td><td>${p.tel||'—'}</td><td>${p.convenio||'Particular'}</td><td>${prof?prof.nome:'—'}</td></tr>`;
      }).join('')}</tbody></table></div>`;
  } else if (tipo === 'agenda') {
    const ags = DB.get('agendamentos').sort((a,b) => (a.data+a.hora).localeCompare(b.data+b.hora));
    html = `<div class="relatorio-output-card"><h3>📅 Relatório de Agendamentos (${ags.length})</h3>
      <table class="rel-table"><thead><tr><th>Data</th><th>Hora</th><th>Paciente</th><th>Profissional</th><th>Tipo</th><th>Status</th></tr></thead>
      <tbody>${ags.map(a => {
        const pac = pacs.find(p => p.id === a.pacienteId);
        const prof = profs.find(p => p.id === a.profId);
        return `<tr><td>${fmtDate(a.data)}</td><td>${a.hora}</td><td>${pac?pac.nome:'—'}</td><td>${prof?prof.nome:'—'}</td><td>${a.tipo||'—'}</td><td>${statusTag(a.status)}</td></tr>`;
      }).join('')}</tbody></table></div>`;
  } else if (tipo === 'evolucoes') {
    const evs = DB.get('evolucoes').sort((a,b) => b.data.localeCompare(a.data));
    html = `<div class="relatorio-output-card"><h3>📋 Relatório de Evoluções (${evs.length})</h3>
      <table class="rel-table"><thead><tr><th>Data</th><th>Paciente</th><th>Sessão</th><th>EVA</th><th>Alta</th></tr></thead>
      <tbody>${evs.map(e => {
        const pac = pacs.find(p => p.id === e.pacienteId);
        return `<tr><td>${fmtDate(e.data)}</td><td>${pac?pac.nome:'—'}</td><td>${e.sessao||'—'}</td><td>${e.eva??'—'}/10</td><td>${e.alta==='sim'?'✅ Sim':'—'}</td></tr>`;
      }).join('')}</tbody></table></div>`;
  }
  document.getElementById('relatorio-output').innerHTML = html;
}

// ─── HELPERS ───────────────────────────────────────────────────────────────
function fmtDateISO(d) { return d.toISOString().slice(0,10); }
function fmtDate(iso) { if (!iso) return '—'; const [y,m,d] = iso.split('-'); return `${d}/${m}/${y}`; }
function idade(nasc) { if (!nasc) return '—'; const d = new Date(nasc); return Math.floor((Date.now() - d) / (365.25*24*3600*1000)); }
function initials(nome) { if (!nome) return '?'; const w = nome.trim().split(' '); return (w[0][0] + (w[1]?w[1][0]:'')).toUpperCase(); }
function statusTag(s) {
  const map = { agendado: ['blue','Agendado'], confirmado: ['green','Confirmado'], realizado: ['green','Realizado'], cancelado: ['red','Cancelado'], falta: ['orange','Falta'] };
  const [cls, label] = map[s] || ['gray', s];
  return `<span class="tag tag-${cls}">${label}</span>`;
}

// ─── NOVO AGENDAMENTO / ANAMNESE / EVOLUÇÃO (form limpo) ───────────────────
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  // reset hidden IDs for new records
  ['pac-id','ag-id','ev-id','an-id','pf-id'].forEach(f => { const x = document.getElementById(f); if (x) x.value = ''; });
  // set today's date for date fields when opening new
  const today = fmtDateISO(new Date());
  ['ag-data','ev-data','an-data'].forEach(f => { const x = document.getElementById(f); if (x && !x.value) x.value = today; });
  el.classList.remove('hidden');
  populateSelects();
}

// ─── KEYBOARD ──────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => m.classList.add('hidden'));
  if (e.key === 'Enter' && document.getElementById('login-screen').classList.contains('active')) doLogin();
});

// ─── INIT ──────────────────────────────────────────────────────────────────
initData();

// auto-restore session
const sid = DB.get('limavi_session', null);
if (sid) {
  const u = DB.get('profissionais').find(p => p.id === sid);
  if (u) {
    currentUser = u;
    document.getElementById('user-badge').textContent = u.nome;
    const isAdmin = u.perfil === 'admin';
    document.getElementById('nav-profissionais').style.display = isAdmin ? '' : 'none';
    document.getElementById('nav-relatorios').style.display = isAdmin ? '' : 'none';
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('app-screen').classList.add('active');
    navigate('dashboard');
  }
}
