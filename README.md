# DBR · Don't Be Risky

Produs de marketing construit la hackathon: analizează campanii și reclame și semnalează riscurile înainte de publicare.

## Structură

```
backend/    API FastAPI (agenți Gemini, Instagram, alerte Slack)
frontend/   Aplicația React + Vite
```

## Pornire

### Backend
```
cd backend
python -m venv venv
venv\Scripts\activate        # Windows  (macOS/Linux: source venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env       # apoi completează cheile
uvicorn main:app --reload
```

### Frontend
```
cd frontend
npm install
npm run dev
```

Deschide http://localhost:5173. În dev, Vite trimite cererile `/api` către backend-ul de pe portul 8000.

## Variabile de mediu (backend/.env)

| Variabilă | Rol |
| --- | --- |
| `GEMINI_API_KEY` | Modelul Gemini folosit de agenți |
| `NEWS_API_KEY` | Știri pentru contextul analizei |
| `SLACK_WEBHOOK_URL` | Alertele de risc trimise pe Slack |
