import { useCallback, useEffect, useState } from 'react';
import Intro from './components/Intro';
import Sidebar from './components/Sidebar';
import { Vine, FlowerMark } from './components/Doodles';
import AnalyzePage from './pages/AnalyzePage';
import BrandDnaPage from './pages/BrandDnaPage';
import FocusGroupPage from './pages/FocusGroupPage';
import HistoryPage from './pages/HistoryPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ComparePage from './pages/ComparePage';
import MonitorPage from './pages/MonitorPage';
import { checkHealth } from './api';

const HISTORY_KEY = 'dbr-history';
const DNA_KEY = 'dbr-active-dna';
const AGENTS_KEY = 'dbr-custom-agents';
const MAX_HISTORY = 40;

const load = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
const save = (key, value) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* stocare indisponibilă: aplicația merge și fără */
  }
};

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [view, setView] = useState('analyze');
  const [history, setHistory] = useState(() => load(HISTORY_KEY, []));
  const [activeDna, setActiveDna] = useState(() => load(DNA_KEY, null));
  const [customAgents, setCustomAgents] = useState(() => load(AGENTS_KEY, []));
  const [current, setCurrent] = useState(null); // analiza afișată pe pagina Analiză
  const [health, setHealth] = useState(undefined); // undefined = se verifică, null = offline

  useEffect(() => save(HISTORY_KEY, history), [history]);
  useEffect(() => save(DNA_KEY, activeDna), [activeDna]);
  useEffect(() => save(AGENTS_KEY, customAgents), [customAgents]);
  const activeAgents = customAgents.filter((a) => a.active);

  const refreshHealth = useCallback(async () => {
    setHealth(undefined);
    setHealth(await checkHealth());
  }, []);

  useEffect(() => {
    refreshHealth();
    const id = setInterval(async () => setHealth(await checkHealth()), 30000);
    return () => clearInterval(id);
  }, [refreshHealth]);

  const saveEntry = (entry) => setHistory((prev) => [entry, ...prev.filter((e) => e.id !== entry.id)].slice(0, MAX_HISTORY));

  const addToHistory = (entry) => {
    saveEntry(entry);
    setCurrent(entry);
  };

  const updateEntry = (entry) => {
    setHistory((prev) => prev.map((e) => (e.id === entry.id ? entry : e)));
    setCurrent((c) => (c && c.id === entry.id ? entry : c));
  };

  const openEntry = (entry) => {
    setCurrent(entry);
    setView('analyze');
  };

  const page = {
    analyze: (
      <AnalyzePage
        current={current}
        onNew={() => setCurrent(null)}
        onResult={addToHistory}
        onSave={saveEntry}
        onUpdate={updateEntry}
        onOpen={openEntry}
        activeDna={activeDna}
        goToDna={() => setView('dna')}
        goToAgents={() => setView('agents')}
        customAgents={activeAgents}
      />
    ),
    compare: (
      <ComparePage
        activeDna={activeDna}
        goToDna={() => setView('dna')}
        goToAgents={() => setView('agents')}
        customAgents={activeAgents}
        onSave={saveEntry}
        onOpen={openEntry}
      />
    ),
    monitor: <MonitorPage health={health} />,
    dna: <BrandDnaPage activeDna={activeDna} onUse={(d) => { setActiveDna(d); }} onClear={() => setActiveDna(null)} health={health} goAnalyze={() => setView('analyze')} />,
    agents: <FocusGroupPage goAnalyze={() => setView('analyze')} customAgents={customAgents} setCustomAgents={setCustomAgents} />,
    history: (
      <HistoryPage
        history={history}
        onOpen={openEntry}
        onClear={() => { setHistory([]); setCurrent(null); }}
        goAnalyze={() => setView('analyze')}
      />
    ),
    analytics: <AnalyticsPage history={history} goAnalyze={() => setView('analyze')} />,
  }[view];

  return (
    <>
      <div className={`app${showIntro ? ' behind' : ' shown'}`}>
        <Vine variant={0} className="bg-vine v-left" />
        <Vine variant={1} className="bg-vine v-right" />
        <FlowerMark color="#ffb2f7" size={26} className="bg-flower f1" />
        <FlowerMark color="#88a2ff" size={20} className="bg-flower f2" />
        <FlowerMark color="#e3fc87" size={30} className="bg-flower f3" />

        <Sidebar
          view={view}
          setView={setView}
          historyCount={history.length}
          activeDna={activeDna}
          health={health}
          onRefreshHealth={refreshHealth}
          onReplayIntro={() => setShowIntro(true)}
        />
        <main className="main" key={view}>
          {page}
        </main>
      </div>
      {showIntro && <Intro onDone={() => setShowIntro(false)} />}
    </>
  );
}
