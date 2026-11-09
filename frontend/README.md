# DBR · Don't Be Risky (frontend)

React + Vite, legat de backend-ul FastAPI din `../backend`.

## Pornire

1. Backend (din `backend`):
   ```
   uvicorn main:app --reload
   ```
2. Frontend (din `frontend`):
   ```
   npm install
   npm run dev
   ```
3. Deschide http://localhost:5173

În dev, Vite trimite tot ce începe cu `/api` către `http://127.0.0.1:8000` (vezi `vite.config.js`).
Dacă backend-ul rulează în altă parte, copiază `.env.example` în `.env` și setează `VITE_API_URL`.

## Ce endpoint folosește fiecare pagină

| Pagină | Endpoint |
| --- | --- |
| Analiză campanie (+ retestarea variantei sigure) | `POST /api/analyze` (text, public țintă, imagine, ADN de brand, `publish_date`, `custom_agents`) |
| Comparare A/B | `POST /api/analyze`, câte o cerere pe variantă, una după alta |
| Monitorizare | `POST /api/monitor` (comentarii lipite), `POST /api/monitor/instagram` |
| Brand DNA | `POST /api/brand-dna`, `POST /api/brand-dna/instagram` |
| Focus grup | personajele proprii se salvează în browser și se trimit la fiecare analiză |
| Bara laterală (status) | `GET /api/health` |
| Istoric, Analytics | rezultatele salvate în browser (localStorage) |

## Demo-uri care merg fără backend

- **Brand DNA** → butonul „▶ Demo Brand DNA” (date în `src/demoDna.js`)
- **Monitorizare** → butonul „▶ Demo monitorizare” (date în `src/demoMonitor.js`)

Atenție la cotă: o analiză face 9 cereri la Gemini (plus una pentru fiecare personaj propriu activ). Un test A/B cu 3 variante sau o retestare le înmulțește.
