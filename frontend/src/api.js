// Legătura cu backend-ul FastAPI (microcult-backend/main.py)
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, options);
  } catch {
    throw new ApiError(
      'Nu mă pot conecta la backend. Pornește-l din folderul microcult-backend cu: uvicorn main:app --reload',
      0,
    );
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* răspuns fără JSON */
  }

  if (!res.ok) {
    let msg = data?.detail;
    // Erorile de validare FastAPI vin ca listă
    if (Array.isArray(msg)) msg = msg.map((d) => d.msg).join('; ');
    if (res.status === 502 || res.status === 504) {
      msg = msg || 'Backend-ul nu răspunde. Verifică dacă uvicorn rulează pe portul 8000.';
    }
    throw new ApiError(msg || `Eroare neașteptată (${res.status}).`, res.status);
  }
  return data;
}

/** POST /api/analyze → AnalysisResult */
export function analyzeCampaign({ text, targetAudience, brandDna, image, publishDate, customAgents }) {
  const fd = new FormData();
  fd.append('target_audience', targetAudience);
  fd.append('text', text || '');
  fd.append('brand_dna', brandDna || '');
  fd.append('publish_date', publishDate || '');
  if (customAgents?.length) {
    fd.append('custom_agents', JSON.stringify(customAgents.map(({ name, description }) => ({ name, description }))));
  }
  if (image) fd.append('image', image);
  return request('/api/analyze', { method: 'POST', body: fd });
}

/** POST /api/monitor → MonitorResult (comentarii lipite, câte unul pe rând) */
export function monitorComments({ comments, postText }) {
  const fd = new FormData();
  fd.append('comments', comments);
  fd.append('post_text', postText || '');
  return request('/api/monitor', { method: 'POST', body: fd });
}

/** POST /api/monitor/instagram → MonitorResult (fără link = cea mai recentă postare) */
export function monitorInstagram(permalink) {
  const fd = new FormData();
  fd.append('permalink', permalink || '');
  return request('/api/monitor/instagram', { method: 'POST', body: fd });
}

/** POST /api/brand-dna → BrandDNAResult */
export function brandDnaFromText(pastCampaigns) {
  const fd = new FormData();
  fd.append('past_campaigns', pastCampaigns);
  return request('/api/brand-dna', { method: 'POST', body: fd });
}

/** POST /api/brand-dna/instagram → InstagramDNAResult */
export function brandDnaFromInstagram() {
  return request('/api/brand-dna/instagram', { method: 'POST' });
}

/** GET /api/health → { status, slack, instagram, news } */
export async function checkHealth() {
  try {
    return await request('/api/health');
  } catch {
    return null;
  }
}

/** Transformă rezultatul Brand DNA în textul trimis ca brand_dna la /api/analyze */
export function dnaToPrompt(dna) {
  if (!dna) return '';
  const parts = [dna.brand_dna];
  if (dna.tone) parts.push(`Ton: ${dna.tone}`);
  if (dna.winning_elements?.length) {
    parts.push(`Elemente de păstrat: ${dna.winning_elements.map((e) => e.element).join('; ')}`);
  }
  if (dna.visual_elements?.length) parts.push(`Elemente vizuale: ${dna.visual_elements.join('; ')}`);
  if (dna.elements_to_avoid?.length) parts.push(`De evitat: ${dna.elements_to_avoid.join('; ')}`);
  return parts.join('\n');
}

// Pragurile din main.py, ca interfața să explice verdictul
export const THRESHOLDS = {
  rejectAverage: 60,
  legalVeto: 80,
  brandSafetyVeto: 80,
  slackAlert: 85,
  maxCustomAgents: 3,
};
