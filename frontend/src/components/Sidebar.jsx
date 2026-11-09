import { AgentDoodle, FlowerMark } from './Doodles';

const ITEMS = [
  { id: 'analyze', label: 'Analiză campanie', hint: 'Testează o reclamă', color: '#e3fc87' },
  { id: 'compare', label: 'Comparare A/B', hint: 'Care variantă câștigă', color: '#c0e0ff' },
  { id: 'monitor', label: 'Monitorizare', hint: 'Reacții după publicare', color: '#ffd54a' },
  { id: 'dna', label: 'Brand DNA', hint: 'Vocea brandului', color: '#ffb2f7' },
  { id: 'agents', label: 'Focus grup', hint: 'Cei 7 agenți', color: '#ab9dff' },
  { id: 'history', label: 'Istoric', hint: 'Analize salvate', color: '#7fd8be' },
  { id: 'analytics', label: 'Analytics', hint: 'Tendințe de risc', color: '#88a2ff' },
];

function Status({ health, onRefresh }) {
  const checking = health === undefined;
  const online = !!health;
  const services = online
    ? [
        { label: 'Gemini', on: true },
        { label: 'NewsAPI', on: health.news },
        { label: 'Slack', on: health.slack },
        { label: 'Instagram', on: health.instagram },
      ]
    : [];
  return (
    <div className="status">
      <button type="button" className="status-row" onClick={onRefresh} title="Verifică din nou">
        <span className={`status-dot ${checking ? 'wait' : online ? 'on' : 'off'}`} />
        {checking ? 'Verific backend-ul…' : online ? 'Backend conectat' : 'Backend offline'}
      </button>
      {online && (
        <ul className="status-services">
          {services.map((s) => (
            <li key={s.label} className={s.on ? 'on' : 'off'}>
              {s.label}
              <span aria-label={s.on ? 'configurat' : 'neconfigurat'}>{s.on ? '✓' : '–'}</span>
            </li>
          ))}
        </ul>
      )}
      {!checking && !online && (
        <p className="status-help">
          Pornește serverul: <code>uvicorn main:app --reload</code>
        </p>
      )}
    </div>
  );
}

export default function Sidebar({ view, setView, historyCount, activeDna, health, onRefreshHealth, onReplayIntro }) {
  return (
    <aside className="sidebar">
      <button type="button" className="logo" onClick={onReplayIntro} title="Revezi intro-ul">
        <AgentDoodle agent="Mascot" size={44} />
        <span className="logo-text">
          <span className="logo-dbr">DBR</span>
          <span className="logo-sub">don&apos;t be risky</span>
        </span>
      </button>

      <nav className="menu" aria-label="Meniu principal">
        {ITEMS.map((it) => (
          <button
            key={it.id}
            type="button"
            className={`menu-item${view === it.id ? ' active' : ''}`}
            style={{ '--c': it.color }}
            aria-current={view === it.id ? 'page' : undefined}
            onClick={() => setView(it.id)}
          >
            <FlowerMark color={it.color} size={22} />
            <span className="menu-text">
              <span className="menu-label">{it.label}</span>
              <span className="menu-hint">{it.hint}</span>
            </span>
            {it.id === 'history' && historyCount > 0 && <span className="menu-badge">{historyCount}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-foot">
        <button type="button" className={`dna-pill${activeDna ? ' on' : ''}`} onClick={() => setView('dna')}>
          <span className="dna-pill-label">ADN de brand</span>
          <span className="dna-pill-value">
            {activeDna ? (activeDna.username ? `@${activeDna.username}` : activeDna.tone || 'Activ') : 'Nesetat'}
          </span>
        </button>
        <Status health={health} onRefresh={onRefreshHealth} />
      </div>
    </aside>
  );
}
