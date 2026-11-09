import { useState } from 'react';
import { AGENTS, CUSTOM_COLORS } from '../agents';
import { THRESHOLDS } from '../api';
import { AgentDoodle, FlowerMark } from '../components/Doodles';

const STEPS = [
  { title: 'Context Scanner', text: 'Găsește brandurile, locurile și persoanele din reclamă, caută asocieri cu tragedii și știri, apoi verifică data publicării în calendar.', color: '#c0e0ff' },
  { title: 'Focus grupul în paralel', text: 'Fiecare agent dă un scor de la 1 la 100, o explicație și fraza exactă care îl deranjează.', color: '#e3fc87' },
  { title: 'Judecătorul', text: 'Sintetizează rapoartele, găsește problemele comune și rescrie reclama pe vocea brandului.', color: '#ffb2f7' },
  { title: 'Retestare', text: 'Varianta sigură trece din nou prin focus grup, ca să vezi cu cât a scăzut riscul.', color: '#ab9dff' },
];

const IDEAS = [
  { name: 'Bunica din Vaslui', description: 'Pensionară de 72 de ani din mediul rural, credincioasă, se uită la TV, nu folosește internetul și nu înțelege termenii în engleză.' },
  { name: 'Părintele grijuliu', description: 'Părinte a doi copii sub 10 ani, atent la orice mesaj care ar putea fi nepotrivit pentru copii sau ar încuraja comportamente riscante.' },
  { name: 'Jurnalistul', description: 'Jurnalist de investigație care caută gafe de brand, promisiuni false și contradicții cu comportamentul real al companiei.' },
];

const newId = () => `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

function CustomAgents({ list, setList }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(CUSTOM_COLORS[0]);
  const [error, setError] = useState('');
  const activeCount = list.filter((a) => a.active).length;
  const builtIn = new Set(AGENTS.map((a) => a.key));

  const add = (e) => {
    e?.preventDefault();
    const n = name.trim();
    const d = description.trim();
    if (!n || !d) return setError('Dă-i personajului un nume și o descriere.');
    if (builtIn.has(n) || list.some((a) => a.name.toLowerCase() === n.toLowerCase())) return setError('Există deja un personaj cu acest nume.');
    setList([...list, { id: newId(), name: n, description: d, color, active: activeCount < THRESHOLDS.maxCustomAgents }]);
    setName('');
    setDescription('');
    setColor(CUSTOM_COLORS[(list.length + 1) % CUSTOM_COLORS.length]);
    setError('');
    return undefined;
  };

  const toggle = (id) => setList(list.map((a) => {
    if (a.id !== id) return a;
    if (!a.active && activeCount >= THRESHOLDS.maxCustomAgents) {
      setError(`Poți avea cel mult ${THRESHOLDS.maxCustomAgents} personaje active într-o analiză.`);
      return a;
    }
    setError('');
    return { ...a, active: !a.active };
  }));

  return (
    <section>
      <h3 className="section-title"><FlowerMark color="#7fd8be" /> Personajele tale</h3>
      <div className="custom-layout">
        <form className="card custom-form" onSubmit={add}>
          <div className="custom-preview">
            <AgentDoodle agent={name || 'nou'} color={color} size={96} />
            <div>
              <strong>{name || 'Personaj nou'}</strong>
              <span className="muted small">Se alătură focus grupului în fiecare analiză, cât timp e activ.</span>
            </div>
          </div>
          <div className="field">
            <label htmlFor="cname" className="field-label">Nume</label>
            <input id="cname" className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="ex: Bunica din Vaslui" />
          </div>
          <div className="field">
            <label htmlFor="cdesc" className="field-label">Cine e și ce îl deranjează</label>
            <textarea id="cdesc" className="input textarea" rows={3} value={description} maxLength={300} onChange={(e) => setDescription(e.target.value)}
                      placeholder="Vârstă, context, valori, ce ar înțelege greșit…" />
            <span className="counter">{description.length} / 300</span>
          </div>
          <div className="field">
            <span className="field-label">Culoare</span>
            <div className="swatches">
              {CUSTOM_COLORS.map((c) => (
                <button key={c} type="button" className={`swatch${c === color ? ' on' : ''}`} style={{ background: c }}
                        onClick={() => setColor(c)} aria-label={`Culoarea ${c}`} aria-pressed={c === color} />
              ))}
            </div>
          </div>
          <div className="chips">
            <span className="muted small">Idei:</span>
            {IDEAS.map((i) => (
              <button key={i.name} type="button" className="chip-btn" onClick={() => { setName(i.name); setDescription(i.description); }}>{i.name}</button>
            ))}
          </div>
          {error && <p className="error-text" role="alert">{error}</p>}
          <button type="submit" className="btn-primary self-end" disabled={!name.trim() || !description.trim()}>Adaugă în focus grup</button>
        </form>

        <div className="custom-list">
          {list.length === 0 ? (
            <div className="card empty small-empty">
              <AgentDoodle agent="x" color="#d4b5ff" size={80} mood="meh" />
              <p className="muted">Niciun personaj propriu încă. Adaugă clientul tău tipic, un public de nișă sau un critic sever.</p>
            </div>
          ) : list.map((a) => (
            <article key={a.id} className={`card custom-card${a.active ? '' : ' off'}`} style={{ '--c': a.color }}>
              <AgentDoodle agent={a.name} color={a.color} size={72} mood={a.active ? 'happy' : 'meh'} />
              <div className="custom-body">
                <strong>{a.name}</strong>
                <p className="muted small">{a.description}</p>
              </div>
              <div className="custom-actions">
                <label className="toggle">
                  <input type="checkbox" checked={a.active} onChange={() => toggle(a.id)} />
                  <span className="toggle-track"><span /></span>
                  <span className="small">{a.active ? 'Activ' : 'Pauză'}</span>
                </label>
                <button type="button" className="link-btn danger" onClick={() => setList(list.filter((x) => x.id !== a.id))}>Șterge</button>
              </div>
            </article>
          ))}
          <p className="hint">Maximum {THRESHOLDS.maxCustomAgents} personaje active. Intră în media scorului, dar nu au drept de veto.</p>
        </div>
      </div>
    </section>
  );
}

export default function FocusGroupPage({ goAnalyze, customAgents, setCustomAgents }) {
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <span className="eyebrow">Focus grup</span>
          <h1 className="h1">Fă cunoștință cu <span className="hl-word violet">juriul</span></h1>
          <p className="lead">Șapte personaje fixe, plus cele pe care le creezi tu pentru publicul clientului. Dacă unul se încruntă, afli exact de ce.</p>
        </div>
      </header>

      <div className="agent-showcase">
        {AGENTS.map((a, i) => (
          <article key={a.key} className="card showcase-card" style={{ '--c': a.color, '--i': i }}>
            <div className="showcase-art">
              <AgentDoodle agent={a.key} size={120} title={a.nick} />
            </div>
            <div className="showcase-body">
              <div className="showcase-name">
                <h3>{a.nick}</h3>
                <span className="tag">{a.key}</span>
                {a.veto && <span className="tag bad">drept de veto</span>}
              </div>
              <p className="showcase-role">{a.role}</p>
              <p className="muted">{a.watches}</p>
            </div>
          </article>
        ))}
      </div>

      <CustomAgents list={customAgents} setList={setCustomAgents} />

      <h3 className="section-title"><FlowerMark color="#88a2ff" /> Cum ajunge la un verdict</h3>
      <ol className="pipeline">
        {STEPS.map((s, i) => (
          <li key={s.title} className="card" style={{ '--c': s.color }}>
            <span className="step-num">{i + 1}</span>
            <strong>{s.title}</strong>
            <p>{s.text}</p>
          </li>
        ))}
      </ol>

      <div className="card rules">
        <span className="eyebrow">Regulile verdictului</span>
        <ul>
          <li><span className="tag bad">Respins</span> dacă media scorurilor depășește <b>{THRESHOLDS.rejectAverage}</b></li>
          <li><span className="tag bad">Veto</span> dacă Lex (Legal) dă peste <b>{THRESHOLDS.legalVeto}</b>, indiferent de medie</li>
          <li><span className="tag bad">Veto</span> dacă Siren (Brand Safety) dă peste <b>{THRESHOLDS.brandSafetyVeto}</b>, indiferent de medie</li>
          <li><span className="tag slack">Slack</span> alertă către echipă când media sau Siren trec de <b>{THRESHOLDS.slackAlert}</b>, și la orice criză în comentarii</li>
        </ul>
        <button type="button" className="btn-primary" onClick={goAnalyze}>Testează o reclamă</button>
      </div>
    </div>
  );
}
