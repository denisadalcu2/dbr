import asyncio
import base64
import json
import os
from datetime import date
from typing import Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from models import AnalysisResult, AgentFeedback, BrandDNAResult, InstagramDNAResult, MonitorResult
from agents import (
    AGENT_PROMPTS,
    analyze_comments,
    build_custom_agent_prompt,
    extract_brand_dna,
    extract_context_and_keywords,
    format_context,
    run_judge_agent,
    run_single_agent,
)

from instagram import InstagramError, analyze_instagram_account, monitor_instagram_post
from slack import send_backlash_alert, send_risk_alert

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}
MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_PAST_CAMPAIGNS_CHARS = 20000
REJECT_AVERAGE_THRESHOLD = 60
LEGAL_VETO_THRESHOLD = 80
BRAND_SAFETY_VETO_THRESHOLD = 80
SLACK_ALERT_THRESHOLD = 85
MAX_CUSTOM_AGENTS = 3
MAX_CUSTOM_NAME_CHARS = 40
MAX_CUSTOM_DESCRIPTION_CHARS = 300
MIN_COMMENTS = 3
MAX_COMMENTS = 200
MAX_COMMENT_CHARS = 300


def parse_custom_agents(raw: str) -> dict:
    """Personajele definite de agenție vin ca JSON: [{"name": "...", "description": "..."}]"""
    if not raw.strip():
        return {}
    try:
        items = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Personajele personalizate nu sunt un JSON valid.")
    if not isinstance(items, list) or len(items) > MAX_CUSTOM_AGENTS:
        raise HTTPException(status_code=400, detail=f"Poți adăuga cel mult {MAX_CUSTOM_AGENTS} personaje personalizate.")

    custom = {}
    for item in items:
        name = str(item.get("name", "")).strip() if isinstance(item, dict) else ""
        description = str(item.get("description", "")).strip() if isinstance(item, dict) else ""
        if not name or not description:
            raise HTTPException(status_code=400, detail="Fiecare personaj are nevoie de nume și descriere.")
        if len(name) > MAX_CUSTOM_NAME_CHARS or len(description) > MAX_CUSTOM_DESCRIPTION_CHARS:
            raise HTTPException(status_code=400, detail=f"Numele are maximum {MAX_CUSTOM_NAME_CHARS} de caractere, descrierea {MAX_CUSTOM_DESCRIPTION_CHARS}.")
        if name in AGENT_PROMPTS or name in custom:
            raise HTTPException(status_code=400, detail=f"Există deja un agent numit „{name}”.")
        custom[name] = build_custom_agent_prompt(name, description)
    return custom


def parse_publish_date(raw: str) -> str:
    raw = raw.strip()
    if not raw:
        return ""
    try:
        return date.fromisoformat(raw).isoformat()
    except ValueError:
        raise HTTPException(status_code=400, detail="Data publicării trebuie să fie în formatul AAAA-LL-ZZ.")


def phrase_in_text(phrase: str, text: str) -> str:
    # Păstrăm fraza doar dacă apare exact în reclamă, altfel frontend-ul n-ar avea ce sublinia
    return phrase if phrase and text and phrase.lower() in text.lower() else ""

app = FastAPI(title="MicroCult AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health():
    # Doar dacă cheile există, fără valorile lor: frontend-ul afișează ce servicii sunt configurate
    configured = lambda name: bool(os.getenv(name, "").strip())
    return {
        "status": "ok",
        "news": configured("NEWS_API_KEY"),
        "slack": configured("SLACK_WEBHOOK_URL"),
        "instagram": configured("INSTAGRAM_ACCESS_TOKEN"),
    }


@app.post("/api/brand-dna", response_model=BrandDNAResult)
async def analyze_brand_dna(past_campaigns: str = Form(...)):
    past_campaigns = past_campaigns.strip()
    if not past_campaigns:
        raise HTTPException(status_code=400, detail="Trimite postările anterioare ale brandului.")
    if len(past_campaigns) > MAX_PAST_CAMPAIGNS_CHARS:
        raise HTTPException(status_code=413, detail=f"Textul depășește limita de {MAX_PAST_CAMPAIGNS_CHARS} de caractere.")

    try:
        return await extract_brand_dna(past_campaigns)
    except Exception as e:
        print(f"Eroare Brand DNA: {e}")
        raise HTTPException(status_code=503, detail="ADN-ul de Brand nu a putut fi generat. Încearcă din nou în câteva momente.")


@app.post("/api/brand-dna/instagram", response_model=InstagramDNAResult)
async def analyze_instagram_brand_dna():
    try:
        return await analyze_instagram_account()
    except InstagramError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except Exception as e:
        print(f"Eroare Brand DNA Instagram: {e}")
        raise HTTPException(status_code=503, detail="ADN-ul de Brand nu a putut fi generat. Încearcă din nou în câteva momente.")


@app.post("/api/analyze", response_model=AnalysisResult)
async def analyze_campaign(
    target_audience: str = Form(...),
    text: str = Form(""),  # Opțional: reclama poate fi doar imagine
    brand_dna: str = Form(""),  # Opțional: rezultatul de la /api/brand-dna
    publish_date: str = Form(""),  # Opțional: AAAA-LL-ZZ, pentru riscurile legate de dată
    custom_agents: str = Form(""),  # Opțional: JSON cu personajele definite de agenție
    image: Optional[UploadFile] = File(None)
):
    text = text.strip()
    brand_dna = brand_dna.strip()
    publish_date = parse_publish_date(publish_date)
    custom_prompts = parse_custom_agents(custom_agents)

    # Procesăm imaginea dacă a fost încărcată
    image_base64 = None
    image_mime = "image/jpeg"
    if image and image.filename:
        if image.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(status_code=415, detail="Format neacceptat. Folosește JPEG, PNG, WebP sau HEIC.")
        # Citim cu un octet peste limită, ca să nu încărcăm în memorie fișiere oricât de mari
        image_bytes = await image.read(MAX_IMAGE_BYTES + 1)
        if not image_bytes:
            raise HTTPException(status_code=400, detail="Imaginea încărcată este goală.")
        if len(image_bytes) > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=413, detail="Imaginea depășește limita de 10 MB.")
        image_mime = image.content_type
        image_base64 = base64.b64encode(image_bytes).decode("utf-8")

    if not text and not image_base64:
        raise HTTPException(status_code=400, detail="Trimite textul reclamei, o imagine sau ambele.")

    # Faza 0: Context Scanner, asocieri sensibile și controverse recente
    context = await extract_context_and_keywords(text, image_base64, image_mime, publish_date)
    news_context = format_context(context)

    # Faza 1: cei 7 agenți și personajele agenției rulează în paralel
    all_prompts = {**AGENT_PROMPTS, **custom_prompts}
    tasks = [
        run_single_agent(name, prompt, text, target_audience, brand_dna, image_base64, image_mime, news_context)
        for name, prompt in all_prompts.items()
    ]
    results_list = await asyncio.gather(*tasks)
    agent_results = dict(zip(all_prompts, results_list))
    for result in results_list:
        result["fraza"] = phrase_in_text(result.get("fraza", ""), text)

    # Nu dăm verdict pe date incomplete: un agent picat ar coborî media și ar putea aproba campania
    failed = [name for name, result in agent_results.items() if result.get("eroare")]
    if failed:
        raise HTTPException(status_code=503, detail=f"Analiză incompletă, agenți eșuați: {', '.join(failed)}. Încearcă din nou în câteva momente.")

    feedbacks = [
        AgentFeedback(
            persona=name,
            feedback=result["motiv"],
            risk_level=result["risc"],
            phrase=result["fraza"],
            custom=name in custom_prompts,
        )
        for name, result in agent_results.items()
    ]

    avg_risk = int(sum(result["risc"] for result in results_list) / len(results_list))
    # Un veto respinge campania indiferent de medie: o asociere cu o tragedie e critică
    # chiar dacă doar un agent o sesizează, iar ceilalți șase ar coborî media
    legal_veto = agent_results["Legal"]["risc"] > LEGAL_VETO_THRESHOLD
    brand_safety_veto = agent_results["BrandSafety"]["risc"] > BRAND_SAFETY_VETO_THRESHOLD
    rejected = legal_veto or brand_safety_veto or avg_risk > REJECT_AVERAGE_THRESHOLD
    verdict = "REJECTED" if rejected else "APPROVED"

    # Media poate rămâne sub prag când doar BrandSafety vede o asociere cu o tragedie,
    # așa că scorul lui declanșează alerta și singur
    brand_safety_risk = agent_results["BrandSafety"]["risc"]
    alert_trigger = ""
    if avg_risk > SLACK_ALERT_THRESHOLD:
        alert_trigger = f"Scor general peste {SLACK_ALERT_THRESHOLD}"
    elif brand_safety_risk > SLACK_ALERT_THRESHOLD:
        alert_trigger = f"BrandSafety a semnalat un risc critic ({brand_safety_risk}/100)"

    # Alerta pleacă înainte de Judecător, ca agenția să fie anunțată chiar dacă raportul final pică
    slack_alert_sent = False
    if alert_trigger:
        slack_alert_sent = await send_risk_alert(
            campaign_text=text,
            target_audience=target_audience,
            risk_score=avg_risk,
            verdict=verdict,
            alert_trigger=alert_trigger,
            agent_results=agent_results,
            sensitive_associations=context["sensitive_associations"],
        )

    # Faza 2: Judecătorul sintetizează rapoartele agenților
    try:
        judge_report, safe_text = await run_judge_agent(
            text, target_audience, agent_results, legal_veto, brand_safety_veto, brand_dna,
            image_base64, image_mime, news_context
        )
    except Exception as e:
        print(f"Eroare Judecător: {e}")
        raise HTTPException(status_code=503, detail="Raportul final nu a putut fi generat. Încearcă din nou în câteva momente.")

    return AnalysisResult(
        overall_risk_score=avg_risk,
        verdict=verdict,
        agent_feedbacks=feedbacks,
        safe_alternative=judge_report,
        safe_text=safe_text,
        context_keywords=context["keywords"],
        context_risks=context["sensitive_associations"],
        context_news=context["background_data"],
        date_risks=context["date_risks"],
        publish_date=publish_date,
        slack_alert_sent=slack_alert_sent
    )


async def finish_monitor(result: dict) -> MonitorResult:
    # Alertă pe Slack doar la criză, ca să nu obișnuim echipa cu alarme false
    if result["level"] == "criza":
        result["slack_alert_sent"] = await send_backlash_alert(
            result, result.get("post_caption", ""), result.get("post_permalink", "")
        )
    return MonitorResult(**result)


@app.post("/api/monitor", response_model=MonitorResult)
async def monitor_comments(comments: str = Form(...), post_text: str = Form("")):
    lines = [line.strip()[:MAX_COMMENT_CHARS] for line in comments.splitlines() if line.strip()]
    if len(lines) < MIN_COMMENTS:
        raise HTTPException(status_code=400, detail=f"Trimite cel puțin {MIN_COMMENTS} comentarii, câte unul pe rând.")
    lines = lines[:MAX_COMMENTS]
    post_text = post_text.strip()[:1000]
    try:
        result = await analyze_comments(lines, post_text)
    except Exception as e:
        print(f"Eroare monitorizare: {e}")
        raise HTTPException(status_code=503, detail="Comentariile nu au putut fi analizate. Încearcă din nou în câteva momente.")
    return await finish_monitor({**result, "source": "text", "post_caption": post_text})


@app.post("/api/monitor/instagram", response_model=MonitorResult)
async def monitor_instagram(permalink: str = Form("")):
    try:
        result = await monitor_instagram_post(permalink.strip())
    except InstagramError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except Exception as e:
        print(f"Eroare monitorizare Instagram: {e}")
        raise HTTPException(status_code=503, detail="Comentariile nu au putut fi analizate. Încearcă din nou în câteva momente.")
    return await finish_monitor(result)
