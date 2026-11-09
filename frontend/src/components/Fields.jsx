// Câmpuri comune pentru Analiză și Comparare A/B
const AUDIENCES = ['Gen Z, 18–25 ani, România', 'Părinți 30–45 ani', 'Profesioniști B2B', 'Seniori 55+'];

const iso = (d) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};
const addDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return iso(d);
};

export const prettyDate = (value) =>
  value
    ? new Date(`${value}T12:00:00`).toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '';

export function AudienceField({ value, onChange, num = 1, color = '#e3fc87' }) {
  return (
    <div className="field">
      <label htmlFor="aud" className="field-label">
        <span className="num" style={{ background: color }}>{num}</span> Publicul țintă
      </label>
      <input id="aud" className="input" value={value} onChange={(e) => onChange(e.target.value)}
             placeholder="Cui se adresează campania?" maxLength={300} />
      <div className="chips">
        {AUDIENCES.map((a) => (
          <button key={a} type="button" className={`chip-btn${value === a ? ' on' : ''}`} onClick={() => onChange(a)}>{a}</button>
        ))}
      </div>
    </div>
  );
}

export function DateField({ value, onChange, num, color = '#ffd54a' }) {
  const quick = [
    { label: 'Azi', v: addDays(0) },
    { label: 'Mâine', v: addDays(1) },
    { label: 'Peste o săptămână', v: addDays(7) },
  ];
  return (
    <div className="field">
      <label htmlFor="pubdate" className="field-label">
        {num && <span className="num" style={{ background: color }}>{num}</span>} Data publicării <em>(opțional)</em>
      </label>
      <div className="date-row">
        <input id="pubdate" type="date" className="input date-input" value={value} onChange={(e) => onChange(e.target.value)} />
        <div className="chips">
          {quick.map((q) => (
            <button key={q.label} type="button" className={`chip-btn${value === q.v ? ' on' : ''}`} onClick={() => onChange(q.v)}>{q.label}</button>
          ))}
          {value && <button type="button" className="link-btn" onClick={() => onChange('')}>Fără dată</button>}
        </div>
      </div>
      <p className="hint">Verificăm comemorări, zile de doliu și sărbători din jurul datei, care pot face reclama nepotrivită.</p>
    </div>
  );
}

/** Rândul cu ADN-ul de brand și personajele custom active */
export function ExtrasRow({ activeDna, useDna, setUseDna, goToDna, customAgents, goToAgents }) {
  return (
    <div className="extras">
      {activeDna ? (
        <label className="toggle">
          <input type="checkbox" checked={useDna} onChange={(e) => setUseDna(e.target.checked)} />
          <span className="toggle-track"><span /></span>
          ADN de brand
          <span className="muted">({activeDna.username ? `@${activeDna.username}` : activeDna.tone || 'activ'})</span>
        </label>
      ) : (
        <button type="button" className="link-btn" onClick={goToDna}>+ Adaugă ADN de brand</button>
      )}
      <span className="extras-sep" aria-hidden="true" />
      <span className="extras-agents">
        Focus grup: <b>7 agenți</b>
        {customAgents.length > 0 && (
          <> + {customAgents.map((a) => (
            <span key={a.id} className="mini-chip" style={{ background: a.color }}>{a.name}</span>
          ))}</>
        )}
        <button type="button" className="link-btn" onClick={goToAgents}>{customAgents.length ? 'Editează' : '+ Personaj propriu'}</button>
      </span>
    </div>
  );
}
