import { useMemo, useState } from 'react';
import { AGENTS, AGENT_BY_KEY } from '../agents';
import { THRESHOLDS } from '../api';
import { AgentDoodle, FlowerMark } from '../components/Doodles';

const avg = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

function Timeline({ items }) {
  const [hover, setHover] = useState(null);
  const W = 640;
  const H = 200;
  const pad = { l: 34, r: 10, t: 12, b: 24 };
  const n = items.length;
  const slot = (W - pad.l - pad.r) / Math.max(n, 1);
  const bw = Math.min(34, slot * 0.62);
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / 100);
  return (
    <div className="timeline">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Scorul de risc al fiecărei analize, în ordine cronologică">
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} className="grid-line" />
            <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" className="axis">{v}</text>
          </g>
        ))}
        <line x1={pad.l} x2={W - pad.r} y1={y(THRESHOLDS.rejectAverage)} y2={y(THRESHOLDS.rejectAverage)} className="threshold" />
        <text x={W - pad.r} y={y(THRESHOLDS.rejectAverage) - 6} textAnchor="end" className="axis strong">prag respingere {THRESHOLDS.rejectAverage}</text>
        {items.map((e, i) => {
          const v = e.result.overall_risk_score;
          const x = pad.l + slot * i + (slot - bw) / 2;
          const ok = e.result.verdict === 'APPROVED';
          return (
            <rect
              key={e.id}
              x={x}
              y={y(v)}
              width={bw}
              height={Math.max(2, y(0) - y(v))}
              rx="6"
              className={`tl-bar ${ok ? 'ok' : 'no'}${hover === i ? ' hover' : ''}`}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
            />
          );
        })}
      </svg>
      <div className="tl-legend">
        <span><i className="sw ok" /> Aprobat</span>
        <span><i className="sw no" /> Respins</span>
        {hover !== null && (
          <span className="tl-hover">
            {new Date(items[hover].createdAt).toLocaleString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            {' · '}risc {items[hover].result.overall_risk_score}
          </span>
        )}
      </div>
    </div>
  );
}

export default function AnalyticsPage({ history, goAnalyze }) {
  const stats = useMemo(() => {
    const scores = history.map((e) => e.result.overall_risk_score);
    const rejected = history.filter((e) => e.result.verdict !== 'APPROVED').length;
    const slack = history.filter((e) => e.result.slack_alert_sent).length;

    const per = {};
    history.forEach((e) => e.result.agent_feedbacks.forEach((f) => { (per[f.persona] ||= []).push(f.risk_level); }));
    const agents = AGENTS.map((a) => ({ ...a, avg: avg(per[a.key] || []), n: (per[a.key] || []).length }))
      .filter((a) => a.n)
      .sort((a, b) => b.avg - a.avg);

    const kw = {};
    history.forEach((e) => (e.result.context_keywords || []).forEach((k) => { kw[k] = (kw[k] || 0) + 1; }));
    const keywords = Object.entries(kw).sort((a, b) => b[1] - a[1]).slice(0, 12);

    const sensitive = history.reduce((s, e) => s + (e.result.context_risks?.length || 0), 0);

    return { scores, rejected, slack, agents, keywords, sensitive };
  }, [history]);

  if (!history.length) {
    return (
      <div className="page">
        <header className="page-head">
          <div>
            <span className="eyebrow">Analytics</span>
            <h1 className="h1">Tendințele tale de <span className="hl-word">risc</span></h1>
          </div>
        </header>
        <div className="card empty">
          <AgentDoodle agent="Millennials" size={110} mood="meh" />
          <h2 className="h2">Nu am încă date</h2>
          <p className="muted">Graficele se construiesc din analizele tale reale. Fă câteva și revino.</p>
          <button type="button" className="btn-primary" onClick={goAnalyze}>Analizează o campanie</button>
        </div>
      </div>
    );
  }

  const chrono = [...history].reverse().slice(-24);
  const kpis = [
    { label: 'Analize', value: history.length, color: '#e3fc87' },
    { label: 'Risc mediu', value: avg(stats.scores), color: '#c0e0ff' },
    { label: 'Respinse', value: `${stats.rejected}`, sub: `${Math.round((stats.rejected / history.length) * 100)}% din total`, color: '#ffb2f7' },
    { label: 'Alerte Slack', value: stats.slack, sub: `Asocieri sensibile: ${stats.sensitive}`, color: '#ab9dff' },
  ];
  const strictest = stats.agents[0];

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <span className="eyebrow">Analytics</span>
          <h1 className="h1">Tendințele tale de <span className="hl-word">risc</span></h1>
          <p className="lead">Calculat din cele {history.length} analize salvate în acest browser.</p>
        </div>
      </header>

      <section className="kpis">
        {kpis.map((k) => (
          <div key={k.label} className="card kpi" style={{ '--c': k.color }}>
            <span className="kpi-label">{k.label}</span>
            <span className="kpi-value">{k.value}</span>
            {k.sub && <span className="muted small">{k.sub}</span>}
          </div>
        ))}
      </section>

      <section className="card">
        <h3 className="card-title">Scorul de risc, analiză cu analiză</h3>
        <p className="muted small">Ultimele {chrono.length}, de la cea mai veche la cea mai nouă.</p>
        <Timeline items={chrono} />
      </section>

      <div className="split">
        <section className="card">
          <h3 className="card-title">Cine se încruntă cel mai des</h3>
          <p className="muted small">Riscul mediu dat de fiecare agent.</p>
          <ul className="agent-bars">
            {stats.agents.map((a) => (
              <li key={a.key}>
                <AgentDoodle agent={a.key} size={38} mood={a.avg >= 65 ? 'worried' : a.avg >= 35 ? 'meh' : 'happy'} />
                <span className="ab-name">{a.nick}</span>
                <span className="ab-track"><span style={{ width: `${a.avg}%`, background: AGENT_BY_KEY[a.key].color }} /></span>
                <span className="ab-val">{a.avg}</span>
              </li>
            ))}
          </ul>
          {strictest && <p className="insight"><FlowerMark color="#ffb2f7" size={16} /> {strictest.nick} ({strictest.key}) e cel mai sever, cu o medie de {strictest.avg}.</p>}
        </section>

        <section className="card">
          <h3 className="card-title">Subiecte detectate</h3>
          <p className="muted small">Branduri, locuri și persoane găsite de Context Scanner.</p>
          {stats.keywords.length ? (
            <div className="chips">
              {stats.keywords.map(([k, n]) => (
                <span key={k} className="kw-chip">{k} <b>{n}</b></span>
              ))}
            </div>
          ) : (
            <p className="muted">Niciun subiect detectat încă.</p>
          )}
        </section>
      </div>
    </div>
  );
}
