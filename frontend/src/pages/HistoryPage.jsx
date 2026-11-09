import { AgentDoodle } from '../components/Doodles';
import { riskTone } from '../agents';

const titleOf = (e) => {
  const t = (e.input.text || '').replace(/\s+/g, ' ').trim();
  if (t) return t.length > 90 ? `${t.slice(0, 90)}…` : t;
  return e.input.imageName ? `Imagine: ${e.input.imageName}` : 'Reclamă fără text';
};

export default function HistoryPage({ history, onOpen, onClear, goAnalyze }) {
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <span className="eyebrow">Istoric</span>
          <h1 className="h1">Tot ce a trecut prin <span className="hl-word sky">focus grup</span></h1>
          <p className="lead">Analizele se păstrează în acest browser. Deschide oricare ca să revezi verdictul și raportul.</p>
        </div>
      </header>

      {history.length === 0 ? (
        <div className="card empty">
          <AgentDoodle agent="Boomers" size={110} mood="meh" />
          <h2 className="h2">Încă nimic aici</h2>
          <p className="muted">Bob așteaptă prima reclamă de citit ad-literam.</p>
          <button type="button" className="btn-primary" onClick={goAnalyze}>Fă prima analiză</button>
        </div>
      ) : (
        <>
          <ul className="history-list">
            {history.map((e) => {
              const ok = e.result.verdict === 'APPROVED';
              return (
                <li key={e.id}>
                  <button type="button" className="card history-item" onClick={() => onOpen(e)}>
                    <span className={`risk-badge big ${riskTone(e.result.overall_risk_score)}`}>{e.result.overall_risk_score}</span>
                    <span className="history-body">
                      <strong>{titleOf(e)}</strong>
                      <span className="muted small">
                        {new Date(e.createdAt).toLocaleString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        {' · '}{e.input.targetAudience}
                      </span>
                      <span className="chips tight">
                        {e.input.variantLabel && <span className="tag">A/B · varianta {e.input.variantLabel}</span>}
                        {e.input.isRetestOf && <span className="tag good">variantă sigură</span>}
                        {e.retest && <span className="tag slack">retestat: {e.result.overall_risk_score} → {e.retest.result.overall_risk_score}</span>}
                        {e.result.date_risks?.length > 0 && <span className="tag date">dată sensibilă</span>}
                      </span>
                    </span>
                    <span className={`tag ${ok ? 'good' : 'bad'}`}>{ok ? 'Aprobat' : 'Respins'}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <button type="button" className="link-btn danger" onClick={onClear}>Șterge istoricul</button>
        </>
      )}
    </div>
  );
}
