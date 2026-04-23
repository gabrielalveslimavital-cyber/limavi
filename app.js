// ===================== LIMAVI FISIOTERAPIA - APP.JS v4 =====================

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

// ─── HISTÓRICO DE NAVEGAÇÃO ────────────────────────────────────────────────
const navHistory = [];

// ─── AUTH ──────────────────────────────────────────────────────────────────
let currentUser = null;

function showLogin() {
  const loginScreen = document.getElementById('login-screen');
  const appScreen   = document.getElementById('app-screen');
  if (!loginScreen || !appScreen) return;
  loginScreen.style.display = 'flex';
  appScreen.style.display   = 'none';
  currentUser = null;
  navHistory.length = 0;
}

function showApp(user) {
  currentUser = user;
  const loginScreen = document.getElementById('login-screen');
  const appScreen   = document.getElementById('app-screen');
  if (!loginScreen || !appScreen) return;
  const badge = document.getElementById('user-badge');
  if (badge) badge.textContent = user.nome;
  const isAdmin = user.perfil === 'admin';
  const navProf = document.getElementById('nav-profissionais');
  const navRel  = document.getElementById('nav-relatorios');
  if (navProf) navProf.style.display = isAdmin ? '' : 'none';
  if (navRel)  navRel.style.display  = isAdmin ? '' : 'none';
  loginScreen.style.display = 'none';
  appScreen.style.display   = 'block';
  navHistory.length = 0;
  navigate('dashboard');
}

function doLogin() {
  const emailEl = document.getElementById('login-user');
  const senhaEl = document.getElementById('login-pass');
  if (!emailEl || !senhaEl) return;
  const email = emailEl.value.trim().toLowerCase();
  const senha = senhaEl.value;
  if (!email || !senha) { showLoginError('Preencha e-mail e senha.'); return; }
  const user = DB.get('profissionais').find(p => p.email.toLowerCase() === email && p.senha === senha);
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

// ─── NAVEGAÇÃO COM HISTÓRICO ───────────────────────────────────────────────
function navigate(page, pushHistory = true) {
  if (!currentUser) { showLogin(); return; }
  if (pushHistory) {
    const current = navHistory[navHistory.length - 1];
    if (current && current !== page) navHistory.push(current);
    else if (!current) navHistory.push(page);
  }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');
  const link = document.querySelector('.nav-link[data-page="' + page + '"]');
  if (link) link.classList.add('active');
  updateHeaderTitle(page);
  updateBackButton(page);
  closeMenu();
  if (page === 'dashboard')     renderDashboard();
  if (page === 'pacientes')     renderPacientes();
  if (page === 'agenda')        renderAgenda();
  if (page === 'evolucoes')     renderEvolucoes();
  if (page === 'anamneses')     renderAnamneses();
  if (page === 'profissionais') renderProfissionais();
}

function goBack() {
  navHistory.pop();
  const prev = navHistory[navHistory.length - 1] || 'dashboard';
  navigate(prev, false);
}

function updateHeaderTitle(page) {
  const titles = {
    dashboard:'Limavi', pacientes:'Pacientes', agenda:'Agenda',
    evolucoes:'Evoluções', anamneses:'Anamneses',
    profissionais:'Profissionais', relatorios:'Relatórios',
  };
  const titleEl = document.getElementById('header-title');
  if (titleEl) titleEl.textContent = titles[page] || 'Limavi';
}

function updateBackButton(page) {
  const btn = document.getElementById('btn-voltar');
  if (!btn) return;
  btn.style.display = (page !== 'dashboard' && navHistory.length > 1) ? 'flex' : 'none';
}

// ─── SISTEMA DE CORES POR CONVÊNIO ────────────────────────────────────────
const CONVENIOS = {
  interakids: { label: 'Interakids', cor: '#3a7fc1' },
  particular:  { label: 'Particular',  cor: '#3aaa72' },
  ung:         { label: 'UNG',         cor: '#e69c2a' },
  outro:       { label: 'Outro',       cor: '#9b9bb0' },
};
function convenioCor(conv)   { return CONVENIOS[conv]?.cor   || CONVENIOS.outro.cor; }
function labelConvenio(conv) { return CONVENIOS[conv]?.label || '—'; }

// Status "ativos" = aparecem na agenda e dashboard como pendentes
const STATUS_ATIVOS = ['agendado', 'confirmado'];

// ─── DASHBOARD ─────────────────────────────────────────────────────────────
let dashCalendarDate = new Date();

function renderDashboard() {
  const pacs = DB.get('pacientes');
  const ags  = DB.get('agendamentos');
  const evs  = DB.get('evolucoes');
  const ans  = DB.get('anamneses');
  const today = fmtDateISO(new Date());
  const todayAgs = ags.filter(a => a.data === today && STATUS_ATIVOS.includes(a.status));

  const grid = document.getElementById('stats-grid');
  if (grid) {
    grid.innerHTML =
      `<div class="stat-card" onclick="navigate('pacientes')" style="cursor:pointer;">
         <div class="stat-icon">👤</div>
         <div><div class="stat-num">${pacs.length}</div><div class="stat-label">Pacientes</div></div>
       </div>` +
      `<div class="stat-card" onclick="navigate('agenda')" style="cursor:pointer;border-color:#e69c2a">
         <div class="stat-icon">📅</div>
         <div><div class="stat-num">${todayAgs.length}</div><div class="stat-label">Hoje</div></div>
       </div>` +
      `<div class="stat-card" onclick="navigate('evolucoes')" style="cursor:pointer;border-color:#3aaa72">
         <div class="stat-icon">📋</div>
         <div><div class="stat-num">${evs.length}</div><div class="stat-label">Evoluções</div></div>
       </div>` +
      `<div class="stat-card" onclick="navigate('anamneses')" style="cursor:pointer;border-color:#4aa896">
         <div class="stat-icon">📝</div>
         <div><div class="stat-num">${ans.length}</div><div class="stat-label">Anamneses</div></div>
       </div>`;
  }
  renderDashCalendar();
  renderProximosAgendamentos();
}

// ── Calendário — só marca dias com agendamentos ATIVOS
function renderDashCalendar() {
  const el = document.getElementById('dash-calendar');
  if (!el) return;
  const ags   = DB.get('agendamentos');
  const year  = dashCalendarDate.getFullYear();
  const month = dashCalendarDate.getMonth();
  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const diasSem = ['D','S','T','Q','Q','S','S'];

  const diasComAg = new Set(
    ags.filter(a => {
      if (!a.data || !STATUS_ATIVOS.includes(a.status)) return false;
      const d = new Date(a.data + 'T00:00:00');
      return d.getFullYear() === year && d.getMonth() === month;
    }).map(a => parseInt(a.data.split('-')[2]))
  );

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayD      = new Date();
  const isCurrentMonth = todayD.getFullYear() === year && todayD.getMonth() === month;

  let html = `
    <div class="cal-header">
      <button class="cal-nav" onclick="dashCalPrev()">&#8249;</button>
      <span class="cal-title">${meses[month]} ${year}</span>
      <button class="cal-nav" onclick="dashCalNext()">&#8250;</button>
    </div>
    <div class="cal-grid">
      ${diasSem.map(d => `<div class="cal-weekday">${d}</div>`).join('')}`;

  for (let i = 0; i < firstDay; i++) html += `<div class="cal-day empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = isCurrentMonth && d === todayD.getDate();
    const hasAg   = diasComAg.has(d);
    const dateISO = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cls     = ['cal-day', isToday?'today':'', hasAg?'has-ag':''].filter(Boolean).join(' ');
    const click   = hasAg ? `onclick="verAgendamentosData('${dateISO}')"` : '';
    html += `<div class="${cls}" ${click}>${d}${hasAg?'<span class="cal-dot"></span>':''}</div>`;
  }
  html += `</div>`;
  el.innerHTML = html;
}

function dashCalPrev() {
  dashCalendarDate = new Date(dashCalendarDate.getFullYear(), dashCalendarDate.getMonth() - 1, 1);
  renderDashCalendar();
}
function dashCalNext() {
  dashCalendarDate = new Date(dashCalendarDate.getFullYear(), dashCalendarDate.getMonth() + 1, 1);
  renderDashCalendar();
}

// ── Agendamentos de um dia — com troca rápida de status
function verAgendamentosData(dateISO) {
  const ags   = DB.get('agendamentos').filter(a => a.data === dateISO && STATUS_ATIVOS.includes(a.status));
  const pacs  = DB.get('pacientes');
  const profs = DB.get('profissionais');
  const nomeEl = document.getElementById('detalhe-pac-nome');
  const bodyEl = document.getElementById('detalhe-pac-body');
  if (!nomeEl || !bodyEl) return;

  nomeEl.textContent = 'Agenda — ' + fmtDate(dateISO);

  if (!ags.length) {
    bodyEl.innerHTML = '<div class="empty-state">Sem agendamentos ativos neste dia.</div>';
  } else {
    const tipos = { avaliacao:'Avaliação', sessao:'Sessão', retorno:'Retorno', alta:'Alta' };
    bodyEl.innerHTML = ags.sort((a,b) => a.hora.localeCompare(b.hora)).map(ag => {
      const pac  = pacs.find(p => p.id === ag.pacienteId);
      const prof = profs.find(p => p.id === ag.profId);
      const cor  = convenioCor(ag.convenio || pac?.convenio);
      return `
        <div class="ag-card-dash" style="border-left:4px solid ${cor};">
          <div class="ag-card-top" onclick="visualizarAgendamento('${ag.id}')">
            <span class="ag-hora">${ag.hora}</span>
            <div class="ag-info">
              <div class="card-name">${pac?.nome||'N/D'}
                <span class="convenio-badge" style="background:${cor}20;color:${cor};">${labelConvenio(ag.convenio||pac?.convenio)}</span>
              </div>
              <div class="card-sub">${tipos[ag.tipo]||'Sessão'} · ${prof?.nome||'—'} · ${ag.duracao||'50'}min</div>
            </div>
            <span>${statusTag(ag.status)}</span>
          </div>
          <div class="status-switcher">
            <span class="status-label">Alterar:</span>
            <button class="sts-btn sts-confirmado ${ag.status==='confirmado'?'sts-ativo':''}" onclick="alterarStatusRapido('${ag.id}','confirmado','${dateISO}')">✅ Confirmado</button>
            <button class="sts-btn sts-realizado"  onclick="alterarStatusRapido('${ag.id}','realizado','${dateISO}')">✔ Realizado</button>
            <button class="sts-btn sts-falta"      onclick="alterarStatusRapido('${ag.id}','falta','${dateISO}')">🚫 Falta</button>
            <button class="sts-btn sts-cancelado"  onclick="alterarStatusRapido('${ag.id}','cancelado','${dateISO}')">✖ Cancelar</button>
          </div>
        </div>`;
    }).join('');
  }

  const btnEditar = document.getElementById('btn-editar-pac');
  if (btnEditar) {
    btnEditar.textContent = 'Ver Agenda Completa';
    btnEditar.onclick = () => { closeModal('modal-detalhe-pac'); navigate('agenda'); };
  }
  openModal('modal-detalhe-pac');
}

function alterarStatusRapido(agId, novoStatus, dateISO) {
  const ags = DB.get('agendamentos');
  const idx = ags.findIndex(a => a.id === agId);
  if (idx === -1) return;
  ags[idx].status = novoStatus;
  DB.set('agendamentos', ags);
  renderDashboard();
  if (!STATUS_ATIVOS.includes(novoStatus)) {
    closeModal('modal-detalhe-pac');
    toast(`Status alterado para "${novoStatus}"!`);
  } else {
    verAgendamentosData(dateISO);
    toast('Status atualizado!');
  }
}

// ── Próximos 7 dias — só ativos
function renderProximosAgendamentos() {
  const el = document.getElementById('proximos-ags');
  if (!el) return;
  const ags   = DB.get('agendamentos');
  const pacs  = DB.get('pacientes');
  const profs = DB.get('profissionais');
  const today   = new Date(); today.setHours(0,0,0,0);
  const weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7);

  const proximos = ags.filter(a => {
    if (!a.data) return false;
    const d = new Date(a.data + 'T00:00:00');
    return d >= today && d <= weekEnd && STATUS_ATIVOS.includes(a.status);
  }).sort((a,b) => (a.data+a.hora).localeCompare(b.data+b.hora));

  if (!proximos.length) {
    el.innerHTML = '<div class="empty-state">Nenhum agendamento ativo nos próximos 7 dias.</div>';
    return;
  }

  const tipos = { avaliacao:'Avaliação', sessao:'Sessão', retorno:'Retorno', alta:'Alta' };
  el.innerHTML = proximos.map(ag => {
    const pac     = pacs.find(p => p.id === ag.pacienteId);
    const prof    = profs.find(p => p.id === ag.profId);
    const cor     = convenioCor(ag.convenio || pac?.convenio);
    const isToday = ag.data === fmtDateISO(new Date());
    return `
      <div class="list-card proximos-card" style="cursor:pointer;border-left:4px solid ${cor};">
        <div class="prox-date ${isToday?'prox-today':''}" onclick="verAgendamentosData('${ag.data}')">
          <span class="prox-day">${ag.data.split('-')[2]}</span>
          <span class="prox-mon">${['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][parseInt(ag.data.split('-')[1])-1]}</span>
        </div>
        <div class="card-body" onclick="visualizarAgendamento('${ag.id}')">
          <div class="card-name">${pac?.nome||'N/D'}
            <span class="convenio-badge" style="background:${cor}20;color:${cor};">${labelConvenio(ag.convenio||pac?.convenio)}</span>
          </div>
          <div class="card-sub">${ag.hora} · ${tipos[ag.tipo]||'Sessão'} · ${prof?.nome||'—'}</div>
        </div>
        <div style="padding:0 8px">${statusTag(ag.status)}</div>
      </div>`;
  }).join('');
}

// ─── PACIENTES ─────────────────────────────────────────────────────────────
function renderPacientes() {
  const query = (document.getElementById('search-paciente')?.value || '').toLowerCase();
  const pacs  = DB.get('pacientes').filter(p => !query || p.nome.toLowerCase().includes(query));
  const el    = document.getElementById('pacientes-list');
  if (!el) return;
  el.innerHTML = pacs.length
    ? pacs.map(p => {
        const cor = convenioCor(p.convenio);
        return `
          <div class="list-card" style="border-left:4px solid ${cor};">
            <div class="card-avatar" onclick="detalhePaciente('${p.id}')" style="cursor:pointer;background:${cor}20;color:${cor};">${initials(p.nome)}</div>
            <div class="card-body" onclick="detalhePaciente('${p.id}')" style="cursor:pointer;">
              <div class="card-name">${p.nome}
                <span class="convenio-badge" style="background:${cor}20;color:${cor};">${labelConvenio(p.convenio)}</span>
              </div>
              <div class="card-sub">${idade(p.dataNasc)} anos · ${p.tel||'Sem telefone'}</div>
            </div>
            <div class="card-actions" onclick="event.stopPropagation()">
              <button class="btn-primary btn-sm" onclick="editarPaciente('${p.id}')" title="Editar">✏️</button>
              <button class="btn-danger btn-sm"  onclick="deletarPaciente('${p.id}')" title="Excluir">🗑</button>
            </div>
          </div>`;
      }).join('')
    : '<div class="empty-state">Nenhum paciente encontrado</div>';
}

function novoPaciente() {
  ['pac-id','pac-nome','pac-nasc','pac-tel','pac-cpf','pac-email','pac-diag','pac-obs'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const conv = document.getElementById('pac-convenio');
  if (conv) conv.value = 'particular';
  openModal('modal-paciente');
}

function editarPaciente(id) {
  const pac = DB.get('pacientes').find(p => p.id === id);
  if (!pac) return;
  const set = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val||''; };
  set('pac-id',pac.id); set('pac-nome',pac.nome); set('pac-nasc',pac.dataNasc);
  set('pac-tel',pac.tel); set('pac-cpf',pac.cpf); set('pac-email',pac.email);
  set('pac-diag',pac.diag); set('pac-obs',pac.obs);
  set('pac-convenio',pac.convenio||'particular');
  openModal('modal-paciente');
}

function salvarPaciente() {
  const id   = document.getElementById('pac-id')?.value   || '';
  const nome = document.getElementById('pac-nome')?.value.trim() || '';
  const nasc = document.getElementById('pac-nasc')?.value || '';
  if (!nome || !nasc) { toast('Preencha nome e data de nascimento!'); return; }
  const pacs = DB.get('pacientes');
  const obj  = {
    id: id||DB.id(), nome, dataNasc: nasc,
    tel:      document.getElementById('pac-tel')?.value      || '',
    cpf:      document.getElementById('pac-cpf')?.value      || '',
    email:    document.getElementById('pac-email')?.value    || '',
    diag:     document.getElementById('pac-diag')?.value     || '',
    obs:      document.getElementById('pac-obs')?.value      || '',
    convenio: document.getElementById('pac-convenio')?.value || 'particular',
  };
  if (id) { const i = pacs.findIndex(p => p.id===id); if (i!==-1) pacs[i]=obj; else pacs.push(obj); }
  else pacs.push(obj);
  DB.set('pacientes', pacs);
  closeModal('modal-paciente');
  renderPacientes(); renderDashboard();
  toast(id ? 'Paciente atualizado!' : 'Paciente cadastrado!');
}

function deletarPaciente(id) {
  if (!confirm('Excluir este paciente? Esta ação não pode ser desfeita.')) return;
  DB.set('pacientes', DB.get('pacientes').filter(p => p.id !== id));
  renderPacientes(); renderDashboard();
  toast('Paciente excluído.');
}

function detalhePaciente(id) {
  const pac  = DB.get('pacientes').find(p => p.id === id);
  if (!pac) return;
  const ans  = DB.get('anamneses').filter(a => a.pacienteId === id);
  const evs  = DB.get('evolucoes').filter(e => e.pacienteId === id);
  const ags  = DB.get('agendamentos').filter(a => a.pacienteId === id);
  const cor  = convenioCor(pac.convenio);

  document.getElementById('detalhe-pac-nome').textContent = pac.nome;
  document.getElementById('detalhe-pac-body').innerHTML = `
    <div class="detail-section">
      <div style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:.75rem;font-weight:600;background:${cor}20;color:${cor};margin-bottom:12px;">${labelConvenio(pac.convenio)}</div>
      <div class="detail-grid">
        <div class="detail-item"><label>IDADE</label><span>${idade(pac.dataNasc)} anos</span></div>
        <div class="detail-item"><label>NASCIMENTO</label><span>${fmtDate(pac.dataNasc)}</span></div>
        <div class="detail-item"><label>TELEFONE</label><span>${pac.tel||'—'}</span></div>
        <div class="detail-item"><label>CPF</label><span>${pac.cpf||'—'}</span></div>
        <div class="detail-item"><label>E-MAIL</label><span>${pac.email||'—'}</span></div>
        <div class="detail-item"><label>DIAGNÓSTICO</label><span>${pac.diag||'—'}</span></div>
      </div>
      ${pac.obs?`<div class="mt-8"><label style="font-size:.75rem;color:var(--text-muted);font-weight:600;">OBSERVAÇÕES</label><div>${pac.obs.replace(/\n/g,'<br>')}</div></div>`:''}
    </div>
    <div class="detail-section">
      <h4>Resumo do Prontuário</h4>
      <div class="detail-grid">
        <div class="detail-item"><label>ANAMNESES</label><span>${ans.length}</span></div>
        <div class="detail-item"><label>EVOLUÇÕES</label><span>${evs.length}</span></div>
        <div class="detail-item"><label>AGENDAMENTOS</label><span>${ags.length}</span></div>
      </div>
    </div>
    ${evs.length?`<div class="detail-section"><h4>Últimas Evoluções</h4>${evs.slice(-3).reverse().map(e=>`<div class="list-mini"><span>${fmtDate(e.data)}</span><span>${(e.subj||e.texto||'').substring(0,60)}…</span></div>`).join('')}</div>`:''}`;

  const btn = document.getElementById('btn-editar-pac');
  if (btn) { btn.textContent='Editar Paciente'; btn.onclick=()=>{ closeModal('modal-detalhe-pac'); editarPaciente(id); }; }
  openModal('modal-detalhe-pac');
}

// ─── ANAMNESES ─────────────────────────────────────────────────────────────
function renderAnamneses() {
  const ans  = DB.get('anamneses');
  const pacs = DB.get('pacientes');
  const el   = document.getElementById('anamneses-list');
  if (!el) return;
  el.innerHTML = ans.length
    ? ans.map(a => {
        const pac = pacs.find(p => p.id === a.pacienteId);
        const cor = convenioCor(pac?.convenio);
        return `<div class="list-card" style="border-left:4px solid ${cor};">
          <div class="card-avatar" onclick="visualizarAnamnese('${a.id}')" style="cursor:pointer;background:${cor}20;color:${cor};">${initials(pac?.nome||'?')}</div>
          <div class="card-body" onclick="visualizarAnamnese('${a.id}')" style="cursor:pointer;">
            <div class="card-name">${pac?.nome||'Paciente não encontrado'}</div>
            <div class="card-sub">${fmtDate(a.data)} · ${a.diag||'Sem diagnóstico'}</div>
          </div>
          <div class="card-actions" onclick="event.stopPropagation()">
            <button class="btn-primary btn-sm" onclick="editarAnamnese('${a.id}')" title="Editar">✏️</button>
            <button class="btn-danger btn-sm"  onclick="deletarAnamnese('${a.id}')" title="Excluir">🗑</button>
          </div>
        </div>`;
      }).join('')
    : '<div class="empty-state">Nenhuma anamnese cadastrada</div>';
}

function novaAnamnese() {
  ['an-id','an-pac','an-data','an-diag','an-queixa','an-hda','an-pessoais','an-meds','an-objetivos'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  openModal('modal-anamnese');
}

function editarAnamnese(id) {
  const a = DB.get('anamneses').find(x => x.id === id);
  if (!a) return;
  const set = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val||''; };
  set('an-id',a.id); set('an-pac',a.pacienteId); set('an-data',a.data); set('an-diag',a.diag);
  set('an-queixa',a.queixa); set('an-hda',a.hda); set('an-pessoais',a.pessoais);
  set('an-meds',a.meds); set('an-objetivos',a.objetivos);
  openModal('modal-anamnese');
}

function salvarAnamnese() {
  const id    = document.getElementById('an-id')?.value   || '';
  const pacId = document.getElementById('an-pac')?.value  || '';
  const data  = document.getElementById('an-data')?.value || '';
  if (!pacId || !data) { toast('Selecione o paciente e a data!'); return; }
  const ans = DB.get('anamneses');
  const obj = {
    id: id||DB.id(), pacienteId: pacId, data,
    diag:      document.getElementById('an-diag')?.value      || '',
    queixa:    document.getElementById('an-queixa')?.value    || '',
    hda:       document.getElementById('an-hda')?.value       || '',
    pessoais:  document.getElementById('an-pessoais')?.value  || '',
    meds:      document.getElementById('an-meds')?.value      || '',
    objetivos: document.getElementById('an-objetivos')?.value || '',
  };
  if (id) { const i = ans.findIndex(a => a.id===id); if (i!==-1) ans[i]=obj; else ans.push(obj); }
  else ans.push(obj);
  DB.set('anamneses', ans);
  closeModal('modal-anamnese');
  renderAnamneses(); renderDashboard();
  toast(id ? 'Anamnese atualizada!' : 'Anamnese salva!');
}

function deletarAnamnese(id) {
  if (!confirm('Excluir esta anamnese?')) return;
  DB.set('anamneses', DB.get('anamneses').filter(a => a.id !== id));
  renderAnamneses(); renderDashboard();
  toast('Anamnese excluída.');
}

function visualizarAnamnese(id) {
  const a   = DB.get('anamneses').find(x => x.id === id);
  if (!a) return;
  const pac = DB.get('pacientes').find(p => p.id === a.pacienteId);
  document.getElementById('detalhe-pac-nome').textContent = 'Anamnese: ' + (pac?.nome||'N/D');
  document.getElementById('detalhe-pac-body').innerHTML = `
    <div class="detail-section" style="line-height:1.6;">
      <h4 style="margin-bottom:16px;">Data: ${fmtDate(a.data)} · ${a.diag||'Sem diagnóstico'}</h4>
      <div class="mt-8"><label style="font-size:.75rem;color:var(--text-muted);font-weight:600;">QUEIXA PRINCIPAL</label><div>${(a.queixa||'—').replace(/\n/g,'<br>')}</div></div>
      <div class="mt-8"><label style="font-size:.75rem;color:var(--text-muted);font-weight:600;">HISTÓRIA (HDA)</label><div>${(a.hda||'—').replace(/\n/g,'<br>')}</div></div>
      <div class="mt-8"><label style="font-size:.75rem;color:var(--text-muted);font-weight:600;">ANTECEDENTES</label><div>${(a.pessoais||'—').replace(/\n/g,'<br>')}</div></div>
      <div class="mt-8"><label style="font-size:.75rem;color:var(--text-muted);font-weight:600;">MEDICAMENTOS</label><div>${(a.meds||'—').replace(/\n/g,'<br>')}</div></div>
      <div class="mt-8"><label style="font-size:.75rem;color:var(--text-muted);font-weight:600;">OBJETIVOS</label><div>${(a.objetivos||'—').replace(/\n/g,'<br>')}</div></div>
    </div>`;
  const btn = document.getElementById('btn-editar-pac');
  if (btn) { btn.textContent='Editar Anamnese'; btn.onclick=()=>{ closeModal('modal-detalhe-pac'); editarAnamnese(id); }; }
  openModal('modal-detalhe-pac');
}

// ─── AGENDA — agrupada por paciente, filtro ativo/histórico ───────────────
let agendaFiltro = 'ativos';

function renderAgenda() {
  const ags   = DB.get('agendamentos');
  const pacs  = DB.get('pacientes');
  const profs = DB.get('profissionais');
  const el    = document.getElementById('agenda-grid');
  if (!el) return;

  // Atualiza visual dos botões de filtro
  document.querySelectorAll('.agenda-filtro-btn').forEach(b => {
    b.classList.toggle('ativo', b.dataset.filtro === agendaFiltro);
  });

  const filtered = ags.filter(a =>
    agendaFiltro === 'ativos'
      ? STATUS_ATIVOS.includes(a.status)
      : !STATUS_ATIVOS.includes(a.status)
  );

  if (!filtered.length) {
    el.innerHTML = `<div class="empty-state">${agendaFiltro==='ativos'?'Nenhum agendamento ativo.':'Nenhum registro no histórico.'}</div>`;
    return;
  }

  // Agrupa por paciente
  const grupos = {};
  filtered.forEach(ag => {
    const key = ag.pacienteId || '__sem_pac__';
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(ag);
  });

  // Ordena pacientes por nome
  const pacIds = Object.keys(grupos).sort((a, b) => {
    const na = pacs.find(p => p.id === a)?.nome || 'z';
    const nb = pacs.find(p => p.id === b)?.nome || 'z';
    return na.localeCompare(nb);
  });

  const tipos = { avaliacao:'Avaliação', sessao:'Sessão', retorno:'Retorno', alta:'Alta' };

  el.innerHTML = pacIds.map(pacId => {
    const pac     = pacs.find(p => p.id === pacId);
    const cor     = convenioCor(pac?.convenio);
    const nome    = pac?.nome || 'Paciente não encontrado';
    const sessoes = grupos[pacId].sort((a,b) => (a.data+a.hora).localeCompare(b.data+b.hora));
    const qtdAtivas = sessoes.filter(s => STATUS_ATIVOS.includes(s.status)).length;

    return `
      <div class="pac-grupo">
        <div class="pac-grupo-header" onclick="toggleGrupo('grupo-${pacId}')" style="border-left:4px solid ${cor};">
          <div class="pac-grupo-avatar" style="background:${cor}20;color:${cor};">${initials(nome)}</div>
          <div class="pac-grupo-info">
            <span class="pac-grupo-nome">${nome}</span>
            <span class="convenio-badge" style="background:${cor}20;color:${cor};">${labelConvenio(pac?.convenio)}</span>
          </div>
          <div class="pac-grupo-meta">
            ${qtdAtivas > 0 ? `<span class="pac-grupo-badge">${qtdAtivas} ativa${qtdAtivas>1?'s':''}</span>` : ''}
            <span class="pac-grupo-total">${sessoes.length} sessõe${sessoes.length===1?'':'s'}</span>
            <span class="pac-grupo-chevron">▾</span>
          </div>
        </div>
        <div class="pac-grupo-sessoes" id="grupo-${pacId}">
          ${sessoes.map(ag => {
            const prof    = profs.find(p => p.id === ag.profId);
            const isAtivo = STATUS_ATIVOS.includes(ag.status);
            return `
              <div class="sessao-item ${!isAtivo?'sessao-finalizada':''}" onclick="visualizarAgendamento('${ag.id}')">
                <div class="sessao-data">
                  <span class="sessao-dia">${fmtDate(ag.data)}</span>
                  <span class="sessao-hora">${ag.hora}</span>
                </div>
                <div class="sessao-info">
                  <span class="sessao-tipo">${tipos[ag.tipo]||'Sessão'} · ${ag.duracao||'50'}min</span>
                  <span class="sessao-prof">${prof?.nome||'—'}</span>
                </div>
                <div class="sessao-status">${statusTag(ag.status)}</div>
                <div class="sessao-acoes" onclick="event.stopPropagation()">
                  <button class="btn-primary btn-sm" onclick="editarAgendamento('${ag.id}')" title="Editar">✏️</button>
                  <button class="btn-danger btn-sm"  onclick="deletarAgendamento('${ag.id}')" title="Excluir">🗑</button>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  }).join('');
}

function toggleGrupo(grupoId) {
  const el = document.getElementById(grupoId);
  if (!el) return;
  el.classList.toggle('aberto');
  const chevron = el.previousElementSibling?.querySelector('.pac-grupo-chevron');
  if (chevron) chevron.style.transform = el.classList.contains('aberto') ? 'rotate(180deg)' : '';
}

function setFiltroAgenda(filtro) {
  agendaFiltro = filtro;
  renderAgenda();
}

// ── Novo / editar / salvar / deletar agendamento
function novoAgendamento() {
  ['ag-id','ag-pac','ag-hora','ag-tipo','ag-duracao','ag-status','ag-obs','ag-convenio','ag-recorr-fim'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const dataEl = document.getElementById('ag-data');
  if (dataEl) dataEl.value = fmtDateISO(new Date());
  const recorrEl = document.getElementById('ag-recorrencia');
  if (recorrEl) recorrEl.value = 'unico';
  atualizarRecorrencia();
  populateSelects();
  const agProfEl = document.getElementById('ag-prof');
  if (agProfEl) agProfEl.value = currentUser?.id || '';
  openModal('modal-agendamento');
}

function atualizarRecorrencia() {
  const tipo   = document.getElementById('ag-recorrencia')?.value || 'unico';
  const diasEl = document.getElementById('recorr-dias-semana');
  const fimEl  = document.getElementById('recorr-fim-wrap');
  if (diasEl) diasEl.style.display = (tipo==='semanal'||tipo==='personalizado') ? 'block':'none';
  if (fimEl)  fimEl.style.display  = (tipo!=='unico') ? 'block':'none';
}

function editarAgendamento(id) {
  const ag = DB.get('agendamentos').find(a => a.id === id);
  if (!ag) return;
  const set = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val||''; };
  set('ag-id',ag.id); set('ag-pac',ag.pacienteId); set('ag-data',ag.data);
  set('ag-hora',ag.hora); set('ag-tipo',ag.tipo||'sessao'); set('ag-duracao',ag.duracao||'50');
  set('ag-status',ag.status||'agendado'); set('ag-obs',ag.obs); set('ag-convenio',ag.convenio||'');
  set('ag-recorrencia','unico');
  atualizarRecorrencia();
  populateSelects();
  const agProfEl = document.getElementById('ag-prof');
  if (agProfEl) agProfEl.value = ag.profId || currentUser?.id || '';
  openModal('modal-agendamento');
}

function salvarAgendamento() {
  const id     = document.getElementById('ag-id')?.value      || '';
  const pacId  = document.getElementById('ag-pac')?.value     || '';
  const data   = document.getElementById('ag-data')?.value    || '';
  const hora   = document.getElementById('ag-hora')?.value    || '';
  const recorr = document.getElementById('ag-recorrencia')?.value || 'unico';
  const fimDate= document.getElementById('ag-recorr-fim')?.value || '';

  if (!pacId || !data || !hora) { toast('Preencha paciente, data e horário!'); return; }

  const base = {
    pacienteId: pacId, hora,
    tipo:     document.getElementById('ag-tipo')?.value     || 'sessao',
    duracao:  document.getElementById('ag-duracao')?.value  || '50',
    status:   document.getElementById('ag-status')?.value   || 'agendado',
    profId:   document.getElementById('ag-prof')?.value     || currentUser?.id || '',
    obs:      document.getElementById('ag-obs')?.value      || '',
    convenio: document.getElementById('ag-convenio')?.value || '',
  };

  const ags = DB.get('agendamentos');

  if (id || recorr === 'unico') {
    const obj = { ...base, id: id||DB.id(), data };
    if (id) { const i = ags.findIndex(a => a.id===id); if (i!==-1) ags[i]=obj; else ags.push(obj); }
    else ags.push(obj);
    DB.set('agendamentos', ags);
    closeModal('modal-agendamento');
    renderAgenda(); renderDashboard();
    toast('Agendamento salvo!');
    return;
  }

  if (!fimDate) { toast('Informe a data de término da recorrência!'); return; }

  const diasMarcados = [];
  document.querySelectorAll('.dia-check:checked').forEach(cb => diasMarcados.push(parseInt(cb.value)));

  const dataInicio = new Date(data + 'T00:00:00');
  const dataFim    = new Date(fimDate + 'T00:00:00');
  if (dataFim < dataInicio) { toast('Data de término deve ser após a data inicial!'); return; }

  const datas = [];
  const cur   = new Date(dataInicio);

  if (recorr === 'diario') {
    while (cur <= dataFim) { datas.push(fmtDateISO(cur)); cur.setDate(cur.getDate()+1); }
  } else if (recorr === '3x-semana') {
    while (cur <= dataFim) {
      if ([1,3,5].includes(cur.getDay())) datas.push(fmtDateISO(cur));
      cur.setDate(cur.getDate()+1);
    }
  } else if (recorr==='semanal'||recorr==='personalizado') {
    if (!diasMarcados.length) { toast('Selecione ao menos um dia da semana!'); return; }
    while (cur <= dataFim) {
      if (diasMarcados.includes(cur.getDay())) datas.push(fmtDateISO(cur));
      cur.setDate(cur.getDate()+1);
    }
  }

  if (!datas.length) { toast('Nenhuma data gerada com essas configurações.'); return; }

  let adicionados = 0;
  datas.forEach(d => {
    const dup = ags.find(a => a.pacienteId===pacId && a.data===d && a.hora===hora);
    if (!dup) { ags.push({ ...base, id: DB.id(), data: d }); adicionados++; }
  });

  DB.set('agendamentos', ags);
  closeModal('modal-agendamento');
  renderAgenda(); renderDashboard();
  toast(`${adicionados} agendamento(s) criado(s)!`);
}

function deletarAgendamento(id) {
  if (!confirm('Excluir este agendamento?')) return;
  DB.set('agendamentos', DB.get('agendamentos').filter(a => a.id !== id));
  renderAgenda(); renderDashboard();
  toast('Agendamento excluído.');
}

// Visualiza agendamento — com troca de status sem fechar
function visualizarAgendamento(id) {
  const ag   = DB.get('agendamentos').find(a => a.id === id);
  if (!ag) return;
  const pac  = DB.get('pacientes').find(p => p.id === ag.pacienteId);
  const prof = DB.get('profissionais').find(p => p.id === ag.profId);
  const tipos = { avaliacao:'Avaliação', sessao:'Sessão', retorno:'Retorno', alta:'Alta' };
  const cor   = convenioCor(ag.convenio || pac?.convenio);

  document.getElementById('detalhe-pac-nome').textContent = 'Detalhes do Agendamento';
  document.getElementById('detalhe-pac-body').innerHTML = `
    <div class="detail-section" style="line-height:1.6;">
      <h4 style="margin-bottom:16px;">${pac?.nome||'Paciente não encontrado'}
        <span class="convenio-badge" style="background:${cor}20;color:${cor};font-size:.75rem;">${labelConvenio(ag.convenio||pac?.convenio)}</span>
      </h4>
      <div class="detail-grid">
        <div class="detail-item"><label>DATA</label><span>${fmtDate(ag.data)}</span></div>
        <div class="detail-item"><label>HORÁRIO</label><span>${ag.hora} (${ag.duracao||'—'} min)</span></div>
        <div class="detail-item"><label>TIPO</label><span>${tipos[ag.tipo]||ag.tipo||'—'}</span></div>
        <div class="detail-item"><label>STATUS</label><span id="status-display-${id}">${statusTag(ag.status)}</span></div>
        <div class="detail-item"><label>PROFISSIONAL</label><span>${prof?.nome||'—'}</span></div>
        <div class="detail-item"><label>CONVÊNIO</label><span>${labelConvenio(ag.convenio||pac?.convenio)}</span></div>
      </div>
      <div class="mt-16"><label style="font-size:.75rem;color:var(--text-muted);font-weight:600;">OBSERVAÇÕES</label>
        <div>${(ag.obs||'Nenhuma observação.').replace(/\n/g,'<br>')}</div>
      </div>
    </div>
    <div class="detail-section">
      <div class="dash-section-title" style="margin-bottom:8px;">Alterar Status</div>
      <div class="status-switcher-inline">
        <button class="sts-btn sts-agendado   ${ag.status==='agendado'  ?'sts-ativo':''}" onclick="alterarStatusAgendamento('${id}','agendado')">⏳ Agendado</button>
        <button class="sts-btn sts-confirmado ${ag.status==='confirmado'?'sts-ativo':''}" onclick="alterarStatusAgendamento('${id}','confirmado')">✅ Confirmado</button>
        <button class="sts-btn sts-realizado  ${ag.status==='realizado' ?'sts-ativo':''}" onclick="alterarStatusAgendamento('${id}','realizado')">✔ Realizado</button>
        <button class="sts-btn sts-falta      ${ag.status==='falta'     ?'sts-ativo':''}" onclick="alterarStatusAgendamento('${id}','falta')">🚫 Falta</button>
        <button class="sts-btn sts-cancelado  ${ag.status==='cancelado' ?'sts-ativo':''}" onclick="alterarStatusAgendamento('${id}','cancelado')">✖ Cancelado</button>
      </div>
    </div>`;

  const btn = document.getElementById('btn-editar-pac');
  if (btn) { btn.textContent='Editar Agendamento'; btn.onclick=()=>{ closeModal('modal-detalhe-pac'); editarAgendamento(id); }; }
  openModal('modal-detalhe-pac');
}

function alterarStatusAgendamento(agId, novoStatus) {
  const ags = DB.get('agendamentos');
  const idx = ags.findIndex(a => a.id === agId);
  if (idx === -1) return;
  ags[idx].status = novoStatus;
  DB.set('agendamentos', ags);

  // Atualiza botões no modal sem fechar
  document.querySelectorAll('.status-switcher-inline .sts-btn').forEach(b => b.classList.remove('sts-ativo'));
  const sts = document.querySelector(`.sts-${novoStatus}`);
  if (sts) sts.classList.add('sts-ativo');
  const disp = document.getElementById(`status-display-${agId}`);
  if (disp) disp.innerHTML = statusTag(novoStatus);

  renderDashboard();
  renderAgenda();
  toast(`Status: ${novoStatus}`);
}

// ─── EVOLUÇÕES ─────────────────────────────────────────────────────────────
function renderEvolucoes() {
  const evs  = DB.get('evolucoes');
  const pacs = DB.get('pacientes');
  const el   = document.getElementById('evolucoes-list');
  if (!el) return;
  const sorted = [...evs].sort((a,b) => (b.data||'').localeCompare(a.data||''));
  el.innerHTML = sorted.length
    ? sorted.map(e => {
        const pac = pacs.find(p => p.id === e.pacienteId);
        const cor = convenioCor(pac?.convenio);
        return `<div class="list-card" style="border-left:4px solid ${cor};">
          <div class="card-avatar" onclick="visualizarEvolucao('${e.id}')" style="cursor:pointer;background:${cor}20;color:${cor};">${initials(pac?.nome||'?')}</div>
          <div class="card-body" onclick="visualizarEvolucao('${e.id}')" style="cursor:pointer;">
            <div class="card-name">${pac?.nome||'N/D'}</div>
            <div class="card-sub">${fmtDate(e.data)} · Sessão ${e.sessao||'—'} · EVA ${e.eva!=null?e.eva:'—'}/10</div>
          </div>
          <div class="card-actions" onclick="event.stopPropagation()">
            <button class="btn-primary btn-sm" onclick="editarEvolucao('${e.id}')" title="Editar">✏️</button>
            <button class="btn-danger btn-sm"  onclick="deletarEvolucao('${e.id}')" title="Excluir">🗑</button>
          </div>
        </div>`;
      }).join('')
    : '<div class="empty-state">Nenhuma evolução cadastrada</div>';
}

function novaEvolucao() {
  ['ev-id','ev-pac','ev-data','ev-sessao','ev-eva','ev-subj','ev-obj','ev-aval','ev-plano','ev-texto'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  openModal('modal-evolucao');
}

function editarEvolucao(id) {
  const ev = DB.get('evolucoes').find(e => e.id === id);
  if (!ev) return;
  const set = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val!=null?val:''; };
  set('ev-id',ev.id); set('ev-pac',ev.pacienteId); set('ev-data',ev.data);
  set('ev-sessao',ev.sessao); set('ev-eva',ev.eva);
  set('ev-subj',ev.subj||ev.texto); set('ev-obj',ev.obj);
  set('ev-aval',ev.aval); set('ev-plano',ev.plano);
  set('ev-texto',ev.texto||ev.subj);
  openModal('modal-evolucao');
}

function salvarEvolucao() {
  const id    = document.getElementById('ev-id')?.value   || '';
  const pacId = document.getElementById('ev-pac')?.value  || '';
  const data  = document.getElementById('ev-data')?.value || '';
  if (!pacId || !data) { toast('Selecione o paciente e a data!'); return; }
  const evs = DB.get('evolucoes');
  const subjVal = document.getElementById('ev-subj')?.value || document.getElementById('ev-texto')?.value || '';
  const obj = {
    id: id||DB.id(), pacienteId: pacId, data,
    sessao: document.getElementById('ev-sessao')?.value || '',
    eva: document.getElementById('ev-eva')?.value !== '' ? Number(document.getElementById('ev-eva')?.value) : null,
    subj: subjVal,
    obj:   document.getElementById('ev-obj')?.value   || '',
    aval:  document.getElementById('ev-aval')?.value  || '',
    plano: document.getElementById('ev-plano')?.value || '',
    texto: subjVal,
  };
  if (id) { const i = evs.findIndex(e => e.id===id); if (i!==-1) evs[i]=obj; else evs.push(obj); }
  else evs.push(obj);
  DB.set('evolucoes', evs);
  closeModal('modal-evolucao');
  renderEvolucoes(); renderDashboard();
  toast(id ? 'Evolução atualizada!' : 'Evolução salva!');
}

function deletarEvolucao(id) {
  if (!confirm('Excluir esta evolução?')) return;
  DB.set('evolucoes', DB.get('evolucoes').filter(e => e.id !== id));
  renderEvolucoes(); renderDashboard();
  toast('Evolução excluída.');
}

function visualizarEvolucao(id) {
  const e = DB.get('evolucoes').find(x => x.id === id);
  if (!e) return;
  const pac = DB.get('pacientes').find(p => p.id === e.pacienteId);
  document.getElementById('detalhe-pac-nome').textContent = 'Evolução: ' + (pac?.nome||'N/D');
  document.getElementById('detalhe-pac-body').innerHTML = `
    <div class="detail-section" style="line-height:1.6;">
      <h4 style="margin-bottom:16px;">Data: ${fmtDate(e.data)} · Sessão ${e.sessao||'—'} · EVA: ${e.eva!=null?e.eva:'—'}/10</h4>
      <div class="mt-8"><label style="font-size:.75rem;color:var(--text-muted);font-weight:600;">SUBJETIVO (S)</label><div>${(e.subj||e.texto||'—').replace(/\n/g,'<br>')}</div></div>
      <div class="mt-8"><label style="font-size:.75rem;color:var(--text-muted);font-weight:600;">OBJETIVO (O)</label><div>${(e.obj||'—').replace(/\n/g,'<br>')}</div></div>
      <div class="mt-8"><label style="font-size:.75rem;color:var(--text-muted);font-weight:600;">AVALIAÇÃO (A)</label><div>${(e.aval||'—').replace(/\n/g,'<br>')}</div></div>
      <div class="mt-8"><label style="font-size:.75rem;color:var(--text-muted);font-weight:600;">PLANO / CONDUTA (P)</label><div>${(e.plano||'—').replace(/\n/g,'<br>')}</div></div>
    </div>`;
  const btn = document.getElementById('btn-editar-pac');
  if (btn) { btn.textContent='Editar Evolução'; btn.onclick=()=>{ closeModal('modal-detalhe-pac'); editarEvolucao(id); }; }
  openModal('modal-detalhe-pac');
}

// ─── PROFISSIONAIS ─────────────────────────────────────────────────────────
function renderProfissionais() {
  const profs = DB.get('profissionais');
  const el    = document.getElementById('profissionais-list');
  if (!el) return;
  el.innerHTML = profs.length
    ? profs.map(p => `
        <div class="list-card">
          <div class="card-avatar">${initials(p.nome)}</div>
          <div class="card-body">
            <div class="card-name">${p.nome}</div>
            <div class="card-sub">${p.email} · ${p.perfil==='admin'?'👑 Admin':'Fisioterapeuta'} · CREFITO: ${p.crefito||'—'}</div>
          </div>
          <div class="card-actions" onclick="event.stopPropagation()">
            <button class="btn-primary btn-sm" onclick="editarProfissional('${p.id}')" title="Editar">✏️</button>
            ${p.id!=='admin001'?`<button class="btn-danger btn-sm" onclick="deletarProfissional('${p.id}')" title="Excluir">🗑</button>`:''}
          </div>
        </div>`).join('')
    : '<div class="empty-state">Nenhum profissional cadastrado</div>';
}

function novoProfissional() {
  ['prof-id','prof-nome','prof-email','prof-senha','prof-crefito','prof-tel','prof-esp'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const perfEl = document.getElementById('prof-perfil');
  if (perfEl) perfEl.value = 'fisioterapeuta';
  openModal('modal-profissional');
}

function editarProfissional(id) {
  const p = DB.get('profissionais').find(x => x.id === id);
  if (!p) return;
  const set = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val||''; };
  set('prof-id',p.id); set('prof-nome',p.nome); set('prof-email',p.email);
  set('prof-senha',p.senha); set('prof-crefito',p.crefito); set('prof-tel',p.tel);
  set('prof-esp',p.esp); set('prof-perfil',p.perfil||'fisioterapeuta');
  openModal('modal-profissional');
}

function salvarProfissional() {
  const id    = document.getElementById('prof-id')?.value            || '';
  const nome  = document.getElementById('prof-nome')?.value.trim()   || '';
  const email = document.getElementById('prof-email')?.value.trim().toLowerCase() || '';
  const senha = document.getElementById('prof-senha')?.value         || '';
  if (!nome||!email||!senha) { toast('Preencha nome, e-mail e senha!'); return; }
  const profs = DB.get('profissionais');
  if (profs.find(p => p.email.toLowerCase()===email && p.id!==id)) { toast('E-mail já cadastrado!'); return; }
  const obj = {
    id: id||DB.id(), nome, email, senha,
    perfil:  document.getElementById('prof-perfil')?.value  || 'fisioterapeuta',
    crefito: document.getElementById('prof-crefito')?.value || '',
    tel:     document.getElementById('prof-tel')?.value     || '',
    esp:     document.getElementById('prof-esp')?.value     || '',
  };
  if (id) { const i = profs.findIndex(p => p.id===id); if (i!==-1) profs[i]=obj; else profs.push(obj); }
  else profs.push(obj);
  DB.set('profissionais', profs);
  closeModal('modal-profissional');
  renderProfissionais(); populateSelects();
  toast(id ? 'Profissional atualizado!' : 'Profissional cadastrado!');
}

function deletarProfissional(id) {
  if (id==='admin001') { toast('Não é possível excluir o administrador padrão.'); return; }
  if (!confirm('Excluir este profissional?')) return;
  DB.set('profissionais', DB.get('profissionais').filter(p => p.id !== id));
  renderProfissionais(); populateSelects();
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
  el.querySelectorAll('input[type="hidden"]').forEach(i => { i.value = ''; });
}

function populateSelects() {
  const pacs = DB.get('pacientes');
  const pacOpts = '<option value="">Selecione o paciente</option>' +
    pacs.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');

  ['ag-pac','ev-pac','an-pac'].forEach(elId => {
    const el = document.getElementById(elId);
    if (!el) return;
    const val = el.value;
    el.innerHTML = pacOpts;
    el.value = val;
  });

  // Select de profissional do paciente
  const pacProfEl = document.getElementById('pac-prof');
  if (pacProfEl) {
    const val = pacProfEl.value;
    pacProfEl.innerHTML = '<option value="">— Nenhum —</option>' +
      DB.get('profissionais').map(p=>`<option value="${p.id}">${p.nome}</option>`).join('');
    pacProfEl.value = val;
  }

  // Select de profissional do agendamento
  const profs = DB.get('profissionais');
  const profOpts = '<option value="">Selecione o profissional</option>' +
    profs.map(p => `<option value="${p.id}">${p.nome}${p.esp?' ('+p.esp+')':''}</option>`).join('');
  const agProfEl = document.getElementById('ag-prof');
  if (agProfEl) {
    const val = agProfEl.value;
    agProfEl.innerHTML = profOpts;
    agProfEl.value = val || currentUser?.id || '';
  }
}

function statusTag(status) {
  const map = {
    agendado:   '<span style="color:#e69c2a;font-weight:600;font-size:.8rem;">⏳ Agendado</span>',
    confirmado: '<span style="color:#3aaa72;font-weight:600;font-size:.8rem;">✅ Confirmado</span>',
    realizado:  '<span style="color:#4aa896;font-weight:600;font-size:.8rem;">✔ Realizado</span>',
    cancelado:  '<span style="color:#e05a5a;font-weight:600;font-size:.8rem;">✖ Cancelado</span>',
    falta:      '<span style="color:#888;font-weight:600;font-size:.8rem;">🚫 Falta</span>',
  };
  return map[status] || `<span style="font-size:.8rem;">${status||'—'}</span>`;
}

function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3000);
}

function toggleMenu() { const sb=document.getElementById('sidebar'); if(sb) sb.classList.toggle('open'); }
function closeMenu()  { const sb=document.getElementById('sidebar'); if(sb) sb.classList.remove('open'); }

function fmtDateISO(d) { return d.toISOString().slice(0,10); }
function fmtDate(iso)  { if(!iso) return '—'; const p=iso.split('-'); return `${p[2]}/${p[1]}/${p[0]}`; }
function idade(nasc)   { if(!nasc) return '—'; return Math.floor((Date.now()-new Date(nasc))/(365.25*24*3600*1000)); }
function initials(nome){ if(!nome) return '?'; const w=nome.trim().split(' '); return (w[0][0]+(w[1]?w[1][0]:'')).toUpperCase(); }

// ─── PDF ───────────────────────────────────────────────────────────────────
function gerarPDFPaciente() {
  const elemento = document.getElementById('detalhe-pac-body');
  const nome     = document.getElementById('detalhe-pac-nome')?.textContent || 'Paciente';
  if (typeof html2pdf==='undefined') { toast('Biblioteca PDF não carregada.'); return; }
  html2pdf().set({
    margin: 10, filename: `Prontuario_${nome.replace(/\s+/g,'_')}.pdf`,
    image: { type:'jpeg', quality:0.98 },
    html2canvas: { scale:2 },
    jsPDF: { unit:'mm', format:'a4', orientation:'portrait' }
  }).from(elemento).save();
}

// ─── TEMPLATES DE EVOLUÇÃO ─────────────────────────────────────────────────
function usarTemplate(tipo) {
  const campo = document.getElementById('ev-obj') || document.getElementById('ev-subj') || document.getElementById('ev-texto');
  if (!campo) return;
  const t = {
    neuro:        '- Nível de Consciência:\n- Tônus Muscular (Ashworth):\n- Controle de Tronco:\n- Equilíbrio (Estático/Dinâmico):\n- Coordenação Motora:\n- Marcha:',
    respiratoria: '- Padrão Ventilatório:\n- Ritmo e Amplitude:\n- Sinais de Desconforto Respiratório:\n- Ausculta Pulmonar:\n- Tosse (Eficácia/Secreção):\n- SpO2 em repouso: %',
    orto:         '- Inspeção (Edema/Coloração):\n- Palpação:\n- ADM (Ativa e Passiva):\n- Força Muscular (Grau 0-5):\n- Testes Especiais:\n- Alterações posturais:',
  };
  const texto = t[tipo] || '';
  campo.value = campo.value ? campo.value+'\n\n'+texto : texto;
}

function addConduta(texto) {
  const campo = document.getElementById('ev-plano') || document.getElementById('ev-texto');
  if (!campo) return;
  campo.value += (campo.value && !campo.value.endsWith('\n') ? '\n' : '') + '- ' + texto;
}

function toggleDia(btnEl, valor) {
  const ativo = btnEl.classList.toggle('ativo');
  document.querySelectorAll('.dia-check').forEach(cb => {
    if (parseInt(cb.value) === valor) cb.checked = ativo;
  });
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
