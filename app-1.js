// ===================== LIMAVI FISIOTERAPIA - APP.JS (CORRIGIDO) =====================

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
  const loginScreen = document.getElementById('login-screen');
  const appScreen = document.getElementById('app-screen');
  if (!loginScreen || !appScreen) { console.error('Elementos de tela não encontrados'); return; }
  loginScreen.style.display = 'flex';
  appScreen.style.display = 'none';
  currentUser = null;
}

function showApp(user) {
  currentUser = user;
  const loginScreen = document.getElementById('login-screen');
  const appScreen = document.getElementById('app-screen');
  if (!loginScreen || !appScreen) { console.error('Elementos de tela não encontrados'); return; }

  const badge = document.getElementById('user-badge');
  if (badge) badge.textContent = user.nome;

  const isAdmin = user.perfil === 'admin';
  const navProf = document.getElementById('nav-profissionais');
  const navRel = document.getElementById('nav-relatorios');
  if (navProf) navProf.style.display = isAdmin ? '' : 'none';
  if (navRel) navRel.style.display = isAdmin ? '' : 'none';

  loginScreen.style.display = 'none';
  appScreen.style.display = 'block';

  navigate('dashboard');
}

function doLogin() {
  const emailEl = document.getElementById('login-user');
  const senhaEl = document.getElementById('login-pass');
  if (!emailEl || !senhaEl) return;

  const email = emailEl.value.trim().toLowerCase();
  const senha = senhaEl.value;

  if (!email || !senha) { showLoginError('Preencha e-mail e senha.'); return; }

  const profs = DB.get('profissionais');
  const user = profs.find(p => p.email.toLowerCase() === email && p.senha === senha);

  if (!user) { showLoginError('E-mail ou senha incorretos.'); return; }

  showLoginError('', false);
  DB.set('limavi_session', { id: user.id, exp: Date.now() + 8 * 3600 * 1000 });
  showApp(user);
}

function showLoginError(msg, show = true) {
  const el = document.getElementById('login-error');
  if (!el) return;
  el.textContent = msg;
  el.style.display = show ? 'block' : 'none';
}

function doLogout() {
  DB.del('limavi_session');
  currentUser = null;
  showLogin();
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

  const grid = document.getElementById('stats-grid');
  if (!grid) return;

  grid.innerHTML =
    `<div class="stat-card" onclick="navigate('pacientes')" style="cursor:pointer;">
        <div class="stat-icon">👤</div>
        <div><div class="stat-num">${pacs.length}</div><div class="stat-label">Pacientes</div></div>
      </div>` +
    `<div class="stat-card" onclick="navigate('agenda')" style="cursor:pointer; border-color:#e69c2a">
        <div class="stat-icon">📅</div>
        <div><div class="stat-num">${todayAgs.length}</div><div class="stat-label">Hoje</div></div>
      </div>` +
    `<div class="stat-card" onclick="navigate('evolucoes')" style="cursor:pointer; border-color:#3aaa72">
        <div class="stat-icon">📋</div>
        <div><div class="stat-num">${evs.length}</div><div class="stat-label">Evoluções</div></div>
      </div>` +
    `<div class="stat-card" onclick="navigate('anamneses')" style="cursor:pointer; border-color:#4aa896">
        <div class="stat-icon">📝</div>
        <div><div class="stat-num">${ans.length}</div><div class="stat-label">Anamneses</div></div>
      </div>`;
}

// ─── PACIENTES ─────────────────────────────────────────────────────────────
function renderPacientes() {
  const query = (document.getElementById('search-paciente')?.value || '').toLowerCase();
  const pacs = DB.get('pacientes').filter(p => !query || p.nome.toLowerCase().includes(query));
  const el = document.getElementById('pacientes-list');
  if (!el) return;

  el.innerHTML = pacs.length
    ? pacs.map(p => `
        <div class="list-card">
          <div class="card-avatar" onclick="detalhePaciente('${p.id}')" style="cursor:pointer;">${initials(p.nome)}</div>
          <div class="card-body" onclick="detalhePaciente('${p.id}')" style="cursor:pointer;">
            <div class="card-name">${p.nome}</div>
            <div class="card-sub">${idade(p.dataNasc)} anos · ${p.tel || 'Sem telefone'}</div>
          </div>
          <div class="card-actions" onclick="event.stopPropagation()">
            <button class="btn-primary btn-sm" onclick="editarPaciente('${p.id}')" title="Editar">✏️</button>
            <button class="btn-danger btn-sm" onclick="deletarPaciente('${p.id}')" title="Excluir">🗑</button>
          </div>
        </div>`).join('')
    : '<div class="empty-state">Nenhum paciente encontrado</div>';
}

function novoPaciente() {
  // Limpa o formulário para novo cadastro
  const modal = document.getElementById('modal-paciente');
  if (!modal) return;
  const hiddenId = document.getElementById('pac-id');
  if (hiddenId) hiddenId.value = '';
  ['pac-nome','pac-nasc','pac-tel','pac-cpf','pac-email','pac-diag','pac-obs'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  openModal('modal-paciente');
}

function editarPaciente(id) {
  const pac = DB.get('pacientes').find(p => p.id === id);
  if (!pac) return;
  const hiddenId = document.getElementById('pac-id');
  if (hiddenId) hiddenId.value = pac.id;
  if (document.getElementById('pac-nome')) document.getElementById('pac-nome').value = pac.nome || '';
  if (document.getElementById('pac-nasc')) document.getElementById('pac-nasc').value = pac.dataNasc || '';
  if (document.getElementById('pac-tel')) document.getElementById('pac-tel').value = pac.tel || '';
  if (document.getElementById('pac-cpf')) document.getElementById('pac-cpf').value = pac.cpf || '';
  if (document.getElementById('pac-email')) document.getElementById('pac-email').value = pac.email || '';
  if (document.getElementById('pac-diag')) document.getElementById('pac-diag').value = pac.diag || '';
  if (document.getElementById('pac-obs')) document.getElementById('pac-obs').value = pac.obs || '';
  openModal('modal-paciente');
}

function salvarPaciente() {
  const id = document.getElementById('pac-id')?.value || '';
  const nome = document.getElementById('pac-nome')?.value.trim() || '';
  const nasc = document.getElementById('pac-nasc')?.value || '';
  if (!nome || !nasc) { toast('Preencha nome e data de nascimento!'); return; }

  const pacs = DB.get('pacientes');
  const obj = {
    id: id || DB.id(),
    nome,
    dataNasc: nasc,
    tel: document.getElementById('pac-tel')?.value || '',
    cpf: document.getElementById('pac-cpf')?.value || '',
    email: document.getElementById('pac-email')?.value || '',
    diag: document.getElementById('pac-diag')?.value || '',
    obs: document.getElementById('pac-obs')?.value || '',
  };

  if (id) {
    const i = pacs.findIndex(p => p.id === id);
    if (i !== -1) pacs[i] = obj; else pacs.push(obj);
  } else {
    pacs.push(obj);
  }

  DB.set('pacientes', pacs);
  closeModal('modal-paciente');
  renderPacientes();
  renderDashboard();
  toast(id ? 'Paciente atualizado!' : 'Paciente cadastrado!');
}

function deletarPaciente(id) {
  if (!confirm('Tem certeza que deseja excluir este paciente? Esta ação não pode ser desfeita.')) return;
  DB.set('pacientes', DB.get('pacientes').filter(p => p.id !== id));
  renderPacientes();
  renderDashboard();
  toast('Paciente excluído.');
}

function detalhePaciente(id) {
  const pac = DB.get('pacientes').find(p => p.id === id);
  if (!pac) return;

  const ans = DB.get('anamneses').filter(a => a.pacienteId === id);
  const evs = DB.get('evolucoes').filter(e => e.pacienteId === id);
  const ags = DB.get('agendamentos').filter(a => a.pacienteId === id);

  const nomeEl = document.getElementById('detalhe-pac-nome');
  const bodyEl = document.getElementById('detalhe-pac-body');
  if (!nomeEl || !bodyEl) return;

  nomeEl.textContent = pac.nome;
  bodyEl.innerHTML = `
    <div class="detail-section">
      <div class="detail-grid">
        <div class="detail-item"><label>IDADE</label><span>${idade(pac.dataNasc)} anos</span></div>
        <div class="detail-item"><label>NASCIMENTO</label><span>${fmtDate(pac.dataNasc)}</span></div>
        <div class="detail-item"><label>TELEFONE</label><span>${pac.tel || '—'}</span></div>
        <div class="detail-item"><label>CPF</label><span>${pac.cpf || '—'}</span></div>
        <div class="detail-item"><label>E-MAIL</label><span>${pac.email || '—'}</span></div>
        <div class="detail-item"><label>DIAGNÓSTICO</label><span>${pac.diag || '—'}</span></div>
      </div>
      ${pac.obs ? `<div class="mt-8"><label style="font-size:0.75rem;color:var(--text-muted);font-weight:600;">OBSERVAÇÕES</label><div>${pac.obs.replace(/\n/g,'<br>')}</div></div>` : ''}
    </div>
    <div class="detail-section">
      <h4>Resumo do Prontuário</h4>
      <div class="detail-grid">
        <div class="detail-item"><label>ANAMNESES</label><span>${ans.length}</span></div>
        <div class="detail-item"><label>EVOLUÇÕES</label><span>${evs.length}</span></div>
        <div class="detail-item"><label>AGENDAMENTOS</label><span>${ags.length}</span></div>
      </div>
    </div>
    ${evs.length ? `<div class="detail-section"><h4>Últimas Evoluções</h4>${evs.slice(-3).reverse().map(e=>`<div class="list-mini"><span>${fmtDate(e.data)}</span><span>${(e.subj||e.texto||'').substring(0,60)}...</span></div>`).join('')}</div>` : ''}
  `;

  const btnEditar = document.getElementById('btn-editar-pac');
  if (btnEditar) {
    btnEditar.textContent = 'Editar Paciente';
    btnEditar.onclick = function () { closeModal('modal-detalhe-pac'); editarPaciente(id); };
  }

  openModal('modal-detalhe-pac');
}

// ─── ANAMNESES ─────────────────────────────────────────────────────────────
function renderAnamneses() {
  const ans = DB.get('anamneses');
  const pacs = DB.get('pacientes');
  const el = document.getElementById('anamneses-list');
  if (!el) return;

  el.innerHTML = ans.length
    ? ans.map(a => {
        const pac = pacs.find(p => p.id === a.pacienteId);
        return `<div class="list-card">
          <div class="card-avatar" onclick="visualizarAnamnese('${a.id}')" style="cursor:pointer;">${initials(pac?.nome || '?')}</div>
          <div class="card-body" onclick="visualizarAnamnese('${a.id}')" style="cursor:pointer;">
            <div class="card-name">${pac?.nome || 'Paciente não encontrado'}</div>
            <div class="card-sub">${fmtDate(a.data)} · ${a.diag || 'Sem diagnóstico'}</div>
          </div>
          <div class="card-actions" onclick="event.stopPropagation()">
            <button class="btn-primary btn-sm" onclick="editarAnamnese('${a.id}')" title="Editar">✏️</button>
            <button class="btn-danger btn-sm" onclick="deletarAnamnese('${a.id}')" title="Excluir">🗑</button>
          </div>
        </div>`;
      }).join('')
    : '<div class="empty-state">Nenhuma anamnese cadastrada</div>';
}

function novaAnamnese() {
  ['an-id','an-pac','an-data','an-diag','an-queixa','an-hda','an-pessoais','an-meds','an-objetivos'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  openModal('modal-anamnese');
}

function editarAnamnese(id) {
  const a = DB.get('anamneses').find(x => x.id === id);
  if (!a) return;
  if (document.getElementById('an-id')) document.getElementById('an-id').value = a.id;
  if (document.getElementById('an-pac')) document.getElementById('an-pac').value = a.pacienteId || '';
  if (document.getElementById('an-data')) document.getElementById('an-data').value = a.data || '';
  if (document.getElementById('an-diag')) document.getElementById('an-diag').value = a.diag || '';
  if (document.getElementById('an-queixa')) document.getElementById('an-queixa').value = a.queixa || '';
  if (document.getElementById('an-hda')) document.getElementById('an-hda').value = a.hda || '';
  if (document.getElementById('an-pessoais')) document.getElementById('an-pessoais').value = a.pessoais || '';
  if (document.getElementById('an-meds')) document.getElementById('an-meds').value = a.meds || '';
  if (document.getElementById('an-objetivos')) document.getElementById('an-objetivos').value = a.objetivos || '';
  openModal('modal-anamnese');
}

function salvarAnamnese() {
  const id = document.getElementById('an-id')?.value || '';
  const pacId = document.getElementById('an-pac')?.value || '';
  const data = document.getElementById('an-data')?.value || '';
  if (!pacId || !data) { toast('Selecione o paciente e a data!'); return; }

  const ans = DB.get('anamneses');
  const obj = {
    id: id || DB.id(),
    pacienteId: pacId,
    data,
    diag: document.getElementById('an-diag')?.value || '',
    queixa: document.getElementById('an-queixa')?.value || '',
    hda: document.getElementById('an-hda')?.value || '',
    pessoais: document.getElementById('an-pessoais')?.value || '',
    meds: document.getElementById('an-meds')?.value || '',
    objetivos: document.getElementById('an-objetivos')?.value || '',
  };

  if (id) {
    const i = ans.findIndex(a => a.id === id);
    if (i !== -1) ans[i] = obj; else ans.push(obj);
  } else {
    ans.push(obj);
  }

  DB.set('anamneses', ans);
  closeModal('modal-anamnese');
  renderAnamneses();
  renderDashboard();
  toast(id ? 'Anamnese atualizada!' : 'Anamnese salva!');
}

function deletarAnamnese(id) {
  if (!confirm('Excluir esta anamnese? Esta ação não pode ser desfeita.')) return;
  DB.set('anamneses', DB.get('anamneses').filter(a => a.id !== id));
  renderAnamneses();
  renderDashboard();
  toast('Anamnese excluída.');
}

function visualizarAnamnese(id) {
  const a = DB.get('anamneses').find(x => x.id === id);
  if (!a) return;
  const pac = DB.get('pacientes').find(p => p.id === a.pacienteId);

  const nomeEl = document.getElementById('detalhe-pac-nome');
  const bodyEl = document.getElementById('detalhe-pac-body');
  if (!nomeEl || !bodyEl) return;

  nomeEl.textContent = 'Anamnese: ' + (pac ? pac.nome : 'N/D');
  bodyEl.innerHTML = `
    <div class="detail-section" style="line-height:1.6;">
      <h4 style="margin-bottom:16px;">Data: ${fmtDate(a.data)} · ${a.diag || 'Sem diagnóstico'}</h4>
      <div class="mt-8"><label style="font-size:0.75rem;color:var(--text-muted);font-weight:600;">QUEIXA PRINCIPAL</label><div>${(a.queixa || '—').replace(/\n/g,'<br>')}</div></div>
      <div class="mt-8"><label style="font-size:0.75rem;color:var(--text-muted);font-weight:600;">HISTÓRIA (HDA)</label><div>${(a.hda || '—').replace(/\n/g,'<br>')}</div></div>
      <div class="mt-8"><label style="font-size:0.75rem;color:var(--text-muted);font-weight:600;">ANTECEDENTES PESSOAIS</label><div>${(a.pessoais || '—').replace(/\n/g,'<br>')}</div></div>
      <div class="mt-8"><label style="font-size:0.75rem;color:var(--text-muted);font-weight:600;">MEDICAMENTOS</label><div>${(a.meds || '—').replace(/\n/g,'<br>')}</div></div>
      <div class="mt-8"><label style="font-size:0.75rem;color:var(--text-muted);font-weight:600;">OBJETIVOS DO TRATAMENTO</label><div>${(a.objetivos || '—').replace(/\n/g,'<br>')}</div></div>
    </div>`;

  const btnEditar = document.getElementById('btn-editar-pac');
  if (btnEditar) {
    btnEditar.textContent = 'Editar Anamnese';
    btnEditar.onclick = function () { closeModal('modal-detalhe-pac'); editarAnamnese(id); };
  }

  openModal('modal-detalhe-pac');
}

// ─── AGENDA ────────────────────────────────────────────────────────────────
function renderAgenda() {
  const ags = DB.get('agendamentos');
  const pacs = DB.get('pacientes');
  const el = document.getElementById('agenda-grid');
  if (!el) return;

  // Ordena por data e hora
  const sorted = [...ags].sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));

  el.innerHTML = sorted.length
    ? sorted.map(a => {
        const pac = pacs.find(p => p.id === a.pacienteId);
        return `<div class="agenda-slot" onclick="visualizarAgendamento('${a.id}')" style="cursor:pointer;">
          <span class="slot-time">${fmtDate(a.data)} ${a.hora}</span>
          <span class="slot-name">${pac?.nome || 'N/D'}</span>
          <span class="slot-status">${statusTag(a.status)}</span>
          <div class="slot-actions" onclick="event.stopPropagation()">
            <button class="btn-primary btn-sm" onclick="editarAgendamento('${a.id}')" title="Editar">✏️</button>
            <button class="btn-danger btn-sm" onclick="deletarAgendamento('${a.id}')" title="Excluir">🗑</button>
          </div>
        </div>`;
      }).join('')
    : '<div class="empty-state">Sem agendamentos</div>';
}

function novoAgendamento() {
  ['ag-id','ag-pac','ag-data','ag-hora','ag-tipo','ag-duracao','ag-status','ag-prof','ag-obs'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = el.tagName === 'SELECT' ? el.options[0]?.value || '' : '';
  });
  openModal('modal-agendamento');
}

function editarAgendamento(id) {
  const ag = DB.get('agendamentos').find(a => a.id === id);
  if (!ag) return;
  if (document.getElementById('ag-id')) document.getElementById('ag-id').value = ag.id;
  if (document.getElementById('ag-pac')) document.getElementById('ag-pac').value = ag.pacienteId || '';
  if (document.getElementById('ag-data')) document.getElementById('ag-data').value = ag.data || '';
  if (document.getElementById('ag-hora')) document.getElementById('ag-hora').value = ag.hora || '';
  if (document.getElementById('ag-tipo')) document.getElementById('ag-tipo').value = ag.tipo || 'sessao';
  if (document.getElementById('ag-duracao')) document.getElementById('ag-duracao').value = ag.duracao || '50';
  if (document.getElementById('ag-status')) document.getElementById('ag-status').value = ag.status || 'agendado';
  if (document.getElementById('ag-prof')) document.getElementById('ag-prof').value = ag.profId || '';
  if (document.getElementById('ag-obs')) document.getElementById('ag-obs').value = ag.obs || '';
  openModal('modal-agendamento');
}

function salvarAgendamento() {
  const id = document.getElementById('ag-id')?.value || '';
  const pacId = document.getElementById('ag-pac')?.value || '';
  const data = document.getElementById('ag-data')?.value || '';
  const hora = document.getElementById('ag-hora')?.value || '';
  if (!pacId || !data || !hora) { toast('Preencha paciente, data e horário!'); return; }

  const ags = DB.get('agendamentos');
  const obj = {
    id: id || DB.id(),
    pacienteId: pacId,
    data,
    hora,
    tipo: document.getElementById('ag-tipo')?.value || 'sessao',
    duracao: document.getElementById('ag-duracao')?.value || '50',
    status: document.getElementById('ag-status')?.value || 'agendado',
    profId: document.getElementById('ag-prof')?.value || currentUser?.id || '',
    obs: document.getElementById('ag-obs')?.value || '',
  };

  if (id) {
    const i = ags.findIndex(a => a.id === id);
    if (i !== -1) ags[i] = obj; else ags.push(obj);
  } else {
    ags.push(obj);
  }

  DB.set('agendamentos', ags);
  closeModal('modal-agendamento');
  renderAgenda();
  renderDashboard();
  toast('Agenda atualizada!');
}

function deletarAgendamento(id) {
  if (!confirm('Excluir este agendamento? Esta ação não pode ser desfeita.')) return;
  DB.set('agendamentos', DB.get('agendamentos').filter(a => a.id !== id));
  renderAgenda();
  renderDashboard();
  toast('Agendamento excluído.');
}

function visualizarAgendamento(id) {
  const ag = DB.get('agendamentos').find(a => a.id === id);
  if (!ag) return;
  const pac = DB.get('pacientes').find(p => p.id === ag.pacienteId);
  const prof = DB.get('profissionais').find(p => p.id === ag.profId);

  const tipos = { avaliacao: 'Avaliação', sessao: 'Sessão', retorno: 'Retorno', alta: 'Alta' };

  const nomeEl = document.getElementById('detalhe-pac-nome');
  const bodyEl = document.getElementById('detalhe-pac-body');
  if (!nomeEl || !bodyEl) return;

  nomeEl.textContent = 'Detalhes do Agendamento';
  bodyEl.innerHTML = `
    <div class="detail-section" style="line-height:1.6;">
      <h4 style="margin-bottom:16px;">${pac?.nome || 'Paciente não encontrado'}</h4>
      <div class="detail-grid">
        <div class="detail-item"><label>DATA</label><span>${fmtDate(ag.data)}</span></div>
        <div class="detail-item"><label>HORÁRIO</label><span>${ag.hora} (${ag.duracao || '—'} min)</span></div>
        <div class="detail-item"><label>TIPO</label><span>${tipos[ag.tipo] || ag.tipo || '—'}</span></div>
        <div class="detail-item"><label>STATUS</label><span>${statusTag(ag.status)}</span></div>
        <div class="detail-item"><label>PROFISSIONAL</label><span>${prof?.nome || '—'}</span></div>
      </div>
      <div class="mt-16"><label style="font-size:0.75rem;color:var(--text-muted);font-weight:600;">OBSERVAÇÕES</label>
        <div>${(ag.obs || 'Nenhuma observação.').replace(/\n/g,'<br>')}</div>
      </div>
    </div>`;

  const btnEditar = document.getElementById('btn-editar-pac');
  if (btnEditar) {
    btnEditar.textContent = 'Editar Agendamento';
    btnEditar.onclick = function () { closeModal('modal-detalhe-pac'); editarAgendamento(id); };
  }

  openModal('modal-detalhe-pac');
}

// ─── EVOLUÇÕES ─────────────────────────────────────────────────────────────
function renderEvolucoes() {
  const evs = DB.get('evolucoes');
  const pacs = DB.get('pacientes');
  const el = document.getElementById('evolucoes-list');
  if (!el) return;

  // Ordena por data decrescente
  const sorted = [...evs].sort((a, b) => (b.data || '').localeCompare(a.data || ''));

  el.innerHTML = sorted.length
    ? sorted.map(e => {
        const pac = pacs.find(p => p.id === e.pacienteId);
        return `<div class="list-card">
          <div class="card-avatar" onclick="visualizarEvolucao('${e.id}')" style="cursor:pointer;">${initials(pac?.nome || '?')}</div>
          <div class="card-body" onclick="visualizarEvolucao('${e.id}')" style="cursor:pointer;">
            <div class="card-name">${pac?.nome || 'N/D'}</div>
            <div class="card-sub">${fmtDate(e.data)} · Sessão ${e.sessao || '—'} · EVA ${e.eva != null ? e.eva : '—'}/10</div>
          </div>
          <div class="card-actions" onclick="event.stopPropagation()">
            <button class="btn-primary btn-sm" onclick="editarEvolucao('${e.id}')" title="Editar">✏️</button>
            <button class="btn-danger btn-sm" onclick="deletarEvolucao('${e.id}')" title="Excluir">🗑</button>
          </div>
        </div>`;
      }).join('')
    : '<div class="empty-state">Nenhuma evolução cadastrada</div>';
}

function novaEvolucao() {
  ['ev-id','ev-pac','ev-data','ev-sessao','ev-eva','ev-subj','ev-obj','ev-aval','ev-plano'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  openModal('modal-evolucao');
}

function editarEvolucao(id) {
  const ev = DB.get('evolucoes').find(e => e.id === id);
  if (!ev) return;
  if (document.getElementById('ev-id')) document.getElementById('ev-id').value = ev.id;
  if (document.getElementById('ev-pac')) document.getElementById('ev-pac').value = ev.pacienteId || '';
  if (document.getElementById('ev-data')) document.getElementById('ev-data').value = ev.data || '';
  if (document.getElementById('ev-sessao')) document.getElementById('ev-sessao').value = ev.sessao || '';
  if (document.getElementById('ev-eva')) document.getElementById('ev-eva').value = ev.eva != null ? ev.eva : '';
  // Suporte a campos SOAP e legado
  if (document.getElementById('ev-subj')) document.getElementById('ev-subj').value = ev.subj || ev.texto || '';
  if (document.getElementById('ev-obj')) document.getElementById('ev-obj').value = ev.obj || '';
  if (document.getElementById('ev-aval')) document.getElementById('ev-aval').value = ev.aval || '';
  if (document.getElementById('ev-plano')) document.getElementById('ev-plano').value = ev.plano || '';
  // Fallback para campo legado único
  if (document.getElementById('ev-texto')) document.getElementById('ev-texto').value = ev.texto || ev.subj || '';
  openModal('modal-evolucao');
}

function salvarEvolucao() {
  const id = document.getElementById('ev-id')?.value || '';
  const pacId = document.getElementById('ev-pac')?.value || '';
  const data = document.getElementById('ev-data')?.value || '';
  if (!pacId || !data) { toast('Selecione o paciente e a data!'); return; }

  const evs = DB.get('evolucoes');
  const obj = {
    id: id || DB.id(),
    pacienteId: pacId,
    data,
    sessao: document.getElementById('ev-sessao')?.value || '',
    eva: document.getElementById('ev-eva')?.value !== '' ? Number(document.getElementById('ev-eva')?.value) : null,
    subj: document.getElementById('ev-subj')?.value || document.getElementById('ev-texto')?.value || '',
    obj: document.getElementById('ev-obj')?.value || '',
    aval: document.getElementById('ev-aval')?.value || '',
    plano: document.getElementById('ev-plano')?.value || '',
    // Mantém campo legado para compatibilidade
    texto: document.getElementById('ev-subj')?.value || document.getElementById('ev-texto')?.value || '',
  };

  if (id) {
    const i = evs.findIndex(e => e.id === id);
    if (i !== -1) evs[i] = obj; else evs.push(obj);
  } else {
    evs.push(obj);
  }

  DB.set('evolucoes', evs);
  closeModal('modal-evolucao');
  renderEvolucoes();
  renderDashboard();
  toast(id ? 'Evolução atualizada!' : 'Evolução salva!');
}

function deletarEvolucao(id) {
  if (!confirm('Excluir esta evolução? Esta ação não pode ser desfeita.')) return;
  DB.set('evolucoes', DB.get('evolucoes').filter(e => e.id !== id));
  renderEvolucoes();
  renderDashboard();
  toast('Evolução excluída.');
}

function visualizarEvolucao(id) {
  const e = DB.get('evolucoes').find(x => x.id === id);
  if (!e) return;
  const pac = DB.get('pacientes').find(p => p.id === e.pacienteId);

  const nomeEl = document.getElementById('detalhe-pac-nome');
  const bodyEl = document.getElementById('detalhe-pac-body');
  if (!nomeEl || !bodyEl) return;

  nomeEl.textContent = 'Evolução: ' + (pac?.nome || 'N/D');
  bodyEl.innerHTML = `
    <div class="detail-section" style="line-height:1.6;">
      <h4 style="margin-bottom:16px;">Data: ${fmtDate(e.data)} · Sessão ${e.sessao || '—'} · EVA: ${e.eva != null ? e.eva : '—'}/10</h4>
      <div class="mt-8"><label style="font-size:0.75rem;color:var(--text-muted);font-weight:600;">SUBJETIVO (S)</label><div>${(e.subj || e.texto || '—').replace(/\n/g,'<br>')}</div></div>
      <div class="mt-8"><label style="font-size:0.75rem;color:var(--text-muted);font-weight:600;">OBJETIVO (O)</label><div>${(e.obj || '—').replace(/\n/g,'<br>')}</div></div>
      <div class="mt-8"><label style="font-size:0.75rem;color:var(--text-muted);font-weight:600;">AVALIAÇÃO (A)</label><div>${(e.aval || '—').replace(/\n/g,'<br>')}</div></div>
      <div class="mt-8"><label style="font-size:0.75rem;color:var(--text-muted);font-weight:600;">PLANO / CONDUTA (P)</label><div>${(e.plano || '—').replace(/\n/g,'<br>')}</div></div>
    </div>`;

  const btnEditar = document.getElementById('btn-editar-pac');
  if (btnEditar) {
    btnEditar.textContent = 'Editar Evolução';
    btnEditar.onclick = function () { closeModal('modal-detalhe-pac'); editarEvolucao(id); };
  }

  openModal('modal-detalhe-pac');
}

// ─── PROFISSIONAIS (apenas admin) ──────────────────────────────────────────
function renderProfissionais() {
  const profs = DB.get('profissionais');
  const el = document.getElementById('profissionais-list');
  if (!el) return;

  el.innerHTML = profs.length
    ? profs.map(p => `
        <div class="list-card">
          <div class="card-avatar">${initials(p.nome)}</div>
          <div class="card-body">
            <div class="card-name">${p.nome}</div>
            <div class="card-sub">${p.email} · ${p.perfil === 'admin' ? '👑 Admin' : 'Fisioterapeuta'}</div>
          </div>
          <div class="card-actions" onclick="event.stopPropagation()">
            <button class="btn-primary btn-sm" onclick="editarProfissional('${p.id}')" title="Editar">✏️</button>
            ${p.id !== 'admin001' ? `<button class="btn-danger btn-sm" onclick="deletarProfissional('${p.id}')" title="Excluir">🗑</button>` : ''}
          </div>
        </div>`).join('')
    : '<div class="empty-state">Nenhum profissional cadastrado</div>';
}

function novoProfissional() {
  ['prof-id','prof-nome','prof-email','prof-senha','prof-crefito','prof-tel','prof-esp'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const perfEl = document.getElementById('prof-perfil');
  if (perfEl) perfEl.value = 'fisio';
  openModal('modal-profissional');
}

function editarProfissional(id) {
  const p = DB.get('profissionais').find(x => x.id === id);
  if (!p) return;
  if (document.getElementById('prof-id')) document.getElementById('prof-id').value = p.id;
  if (document.getElementById('prof-nome')) document.getElementById('prof-nome').value = p.nome || '';
  if (document.getElementById('prof-email')) document.getElementById('prof-email').value = p.email || '';
  if (document.getElementById('prof-senha')) document.getElementById('prof-senha').value = p.senha || '';
  if (document.getElementById('prof-crefito')) document.getElementById('prof-crefito').value = p.crefito || '';
  if (document.getElementById('prof-tel')) document.getElementById('prof-tel').value = p.tel || '';
  if (document.getElementById('prof-esp')) document.getElementById('prof-esp').value = p.esp || '';
  if (document.getElementById('prof-perfil')) document.getElementById('prof-perfil').value = p.perfil || 'fisio';
  openModal('modal-profissional');
}

function salvarProfissional() {
  const id = document.getElementById('prof-id')?.value || '';
  const nome = document.getElementById('prof-nome')?.value.trim() || '';
  const email = document.getElementById('prof-email')?.value.trim().toLowerCase() || '';
  const senha = document.getElementById('prof-senha')?.value || '';
  if (!nome || !email || !senha) { toast('Preencha nome, e-mail e senha!'); return; }

  const profs = DB.get('profissionais');
  // Verifica e-mail duplicado
  const dup = profs.find(p => p.email.toLowerCase() === email && p.id !== id);
  if (dup) { toast('E-mail já cadastrado!'); return; }

  const obj = {
    id: id || DB.id(),
    nome,
    email,
    senha,
    perfil: document.getElementById('prof-perfil')?.value || 'fisio',
    crefito: document.getElementById('prof-crefito')?.value || '',
    tel: document.getElementById('prof-tel')?.value || '',
    esp: document.getElementById('prof-esp')?.value || '',
  };

  if (id) {
    const i = profs.findIndex(p => p.id === id);
    if (i !== -1) profs[i] = obj; else profs.push(obj);
  } else {
    profs.push(obj);
  }

  DB.set('profissionais', profs);
  closeModal('modal-profissional');
  renderProfissionais();
  toast(id ? 'Profissional atualizado!' : 'Profissional cadastrado!');
}

function deletarProfissional(id) {
  if (id === 'admin001') { toast('Não é possível excluir o administrador padrão.'); return; }
  if (!confirm('Excluir este profissional? Esta ação não pode ser desfeita.')) return;
  DB.set('profissionais', DB.get('profissionais').filter(p => p.id !== id));
  renderProfissionais();
  toast('Profissional excluído.');
}

// ─── AUXILIARES ────────────────────────────────────────────────────────────
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('hidden');
  populateSelects();
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('hidden');
  // Limpa inputs hidden para não bugar próximo cadastro
  el.querySelectorAll('input[type="hidden"]').forEach(i => { i.value = ''; });
}

function populateSelects() {
  const pacs = DB.get('pacientes');
  const opts = '<option value="">Selecione o paciente</option>' +
    pacs.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');

  ['ag-pac', 'ev-pac', 'an-pac'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const val = el.value;
    el.innerHTML = opts;
    el.value = val;
  });

  // Preenche select de profissionais nos agendamentos
  const profs = DB.get('profissionais');
  const profOpts = '<option value="">Selecione o profissional</option>' +
    profs.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
  const agProfEl = document.getElementById('ag-prof');
  if (agProfEl) {
    const val = agProfEl.value;
    agProfEl.innerHTML = profOpts;
    agProfEl.value = val || currentUser?.id || '';
  }
}

function statusTag(status) {
  const map = {
    agendado: '<span style="color:#e69c2a;font-weight:600;">⏳ Agendado</span>',
    confirmado: '<span style="color:#3aaa72;font-weight:600;">✅ Confirmado</span>',
    realizado: '<span style="color:#4aa896;font-weight:600;">✔ Realizado</span>',
    cancelado: '<span style="color:#e05a5a;font-weight:600;">✖ Cancelado</span>',
    falta: '<span style="color:#888;font-weight:600;">🚫 Falta</span>',
  };
  return map[status] || `<span>${status || '—'}</span>`;
}

function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3000);
}

function toggleMenu() {
  const sb = document.getElementById('sidebar');
  if (sb) sb.classList.toggle('open');
}

function closeMenu() {
  const sb = document.getElementById('sidebar');
  if (sb) sb.classList.remove('open');
}

function fmtDateISO(d) { return d.toISOString().slice(0, 10); }
function fmtDate(iso) { if (!iso) return '—'; const p = iso.split('-'); return `${p[2]}/${p[1]}/${p[0]}`; }
function idade(nasc) { if (!nasc) return '—'; return Math.floor((Date.now() - new Date(nasc)) / (365.25 * 24 * 3600 * 1000)); }
function initials(nome) { if (!nome) return '?'; const w = nome.trim().split(' '); return (w[0][0] + (w[1] ? w[1][0] : '')).toUpperCase(); }

// ─── PDF ───────────────────────────────────────────────────────────────────
function gerarPDFPaciente() {
  const elemento = document.getElementById('detalhe-pac-body');
  const nomePaciente = document.getElementById('detalhe-pac-nome')?.textContent || 'Paciente';
  if (typeof html2pdf === 'undefined') { toast('Biblioteca PDF não carregada.'); return; }
  html2pdf().set({
    margin: 10,
    filename: `Prontuario_${nomePaciente.replace(/\s+/g, '_')}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).from(elemento).save();
}

// ─── TEMPLATES DE EVOLUÇÃO ─────────────────────────────────────────────────
function usarTemplate(tipo) {
  const campo = document.getElementById('ev-obj') || document.getElementById('ev-subj') || document.getElementById('ev-texto');
  if (!campo) return;
  const templates = {
    neuro: '- Nível de Consciência:\n- Tônus Muscular (Ashworth):\n- Controle de Tronco:\n- Equilíbrio (Estático/Dinâmico):\n- Coordenação Motora:\n- Marcha:',
    respiratoria: '- Padrão Ventilatório:\n- Ritmo e Amplitude:\n- Sinais de Desconforto Respiratório:\n- Ausculta Pulmonar:\n- Tosse (Eficácia/Secreção):\n- SpO2 em repouso: %',
    orto: '- Inspeção (Edema/Coloração):\n- Palpação:\n- ADM (Ativa e Passiva):\n- Força Muscular (Grau 0-5):\n- Testes Especiais:\n- Alterações posturais:',
  };
  const texto = templates[tipo] || '';
  campo.value = campo.value ? campo.value + '\n\n' + texto : texto;
}

function addConduta(texto) {
  const campo = document.getElementById('ev-plano') || document.getElementById('ev-texto');
  if (!campo) return;
  if (campo.value && !campo.value.endsWith('\n')) {
    campo.value += '\n- ' + texto;
  } else {
    campo.value += '- ' + texto;
  }
}

// ─── INIT ──────────────────────────────────────────────────────────────────
initData();

(function () {
  const sess = DB.get('limavi_session', null);
  if (sess && sess.id && sess.exp > Date.now()) {
    const u = DB.get('profissionais').find(p => p.id === sess.id);
    if (u) { showApp(u); return; }
  }
  showLogin();
})();
