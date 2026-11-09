import os
import httpx
from dotenv import load_dotenv

load_dotenv()

MAX_EXCERPT_CHARS = 500
MAX_SECTION_CHARS = 2900  # Slack acceptă maximum 3000 de caractere într-o secțiune
MAX_REASONS = 3


def escape_slack(text: str) -> str:
    # Fără escape, o reclamă care conține <!channel> ar notifica tot canalul
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def build_risk_alert(
    campaign_text: str,
    target_audience: str,
    risk_score: int,
    verdict: str,
    alert_trigger: str,
    agent_results: dict,
    sensitive_associations: list,
) -> dict:
    excerpt = campaign_text[:MAX_EXCERPT_CHARS] + ("..." if len(campaign_text) > MAX_EXCERPT_CHARS else "")
    worst_agents = sorted(agent_results.items(), key=lambda item: item[1]["risc"], reverse=True)[:MAX_REASONS]
    reasons = "\n".join(
        f"• *{escape_slack(name)}* ({result['risc']}/100): {escape_slack(result['motiv'])}"
        for name, result in worst_agents
    )

    blocks = [
        {"type": "header", "text": {"type": "plain_text", "text": f"Alertă risc PR: {risk_score}/100"}},
        {"type": "section", "fields": [
            {"type": "mrkdwn", "text": f"*Verdict:*\n{verdict}"},
            {"type": "mrkdwn", "text": f"*Declanșator:*\n{alert_trigger}"},
            {"type": "mrkdwn", "text": f"*Public țintă:*\n{escape_slack(target_audience)[:500]}"},
        ]},
        {"type": "section", "text": {
            "type": "mrkdwn",
            "text": f"*Postare analizată:*\n{escape_slack(excerpt) or '(doar imagine)'}"[:MAX_SECTION_CHARS],
        }},
        {"type": "section", "text": {
            "type": "mrkdwn",
            "text": f"*Principalele riscuri:*\n{reasons}"[:MAX_SECTION_CHARS],
        }},
    ]

    if sensitive_associations:
        lines = "\n".join(
            f"• *{escape_slack(item['eveniment'])}*: {escape_slack(item['explicatie'])}"
            for item in sensitive_associations
        )
        blocks.append({"type": "section", "text": {
            "type": "mrkdwn",
            "text": f":warning: *Asocieri sensibile:*\n{lines}"[:MAX_SECTION_CHARS],
        }})

    return {
        # Textul simplu apare în notificările de pe telefon și desktop
        "text": f"Alertă risc PR: {risk_score}/100, verdict {verdict}",
        "blocks": blocks,
    }


async def send_risk_alert(**alert_data) -> bool:
    webhook_url = os.getenv("SLACK_WEBHOOK_URL", "").strip()
    if not webhook_url:
        return False

    # Alerta e un bonus: o problemă cu Slack nu trebuie să blocheze analiza
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.post(webhook_url, json=build_risk_alert(**alert_data))
        if res.status_code != 200:
            print(f"Slack a răspuns {res.status_code}: {res.text[:100]}")
            return False
        return True
    except Exception as e:
        # Doar tipul erorii: URL-ul webhook-ului este secret
        print(f"Eroare trimitere alertă Slack: {type(e).__name__}")
        return False


def build_backlash_alert(result: dict, post_caption: str = "", post_permalink: str = "") -> dict:
    negative_themes = [theme for theme in result["themes"] if theme["tip"] == "negativ"][:MAX_REASONS]
    themes = "\n".join(
        f"• *{escape_slack(theme['tema'])}* ({theme['procent']}%)" for theme in negative_themes
    ) or "• fără teme negative clare"
    post = escape_slack(post_caption[:MAX_EXCERPT_CHARS]) if post_caption else "(postare nespecificată)"
    if post_permalink.startswith("https://"):
        post += f"\n<{post_permalink}|Deschide postarea>"

    blocks = [
        {"type": "header", "text": {"type": "plain_text", "text": f"Criză în comentarii: {result['negative']}% negative"}},
        {"type": "section", "fields": [
            {"type": "mrkdwn", "text": f"*Sentiment:*\n{result['sentiment']}/100"},
            {"type": "mrkdwn", "text": f"*Comentarii analizate:*\n{result['comments_analyzed']}"},
        ]},
        {"type": "section", "text": {"type": "mrkdwn", "text": f"*Postare:*\n{post}"[:MAX_SECTION_CHARS]}},
        {"type": "section", "text": {"type": "mrkdwn", "text": f"*Ce se întâmplă:*\n{escape_slack(result['summary'])}\n\n*Teme negative:*\n{themes}"[:MAX_SECTION_CHARS]}},
        {"type": "section", "text": {"type": "mrkdwn", "text": f"*Acțiune recomandată:*\n{escape_slack(result['action'])}"[:MAX_SECTION_CHARS]}},
    ]
    return {"text": f"Criză în comentarii: {result['negative']}% negative", "blocks": blocks}


async def post_to_slack(payload: dict) -> bool:
    webhook_url = os.getenv("SLACK_WEBHOOK_URL", "").strip()
    if not webhook_url:
        return False
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.post(webhook_url, json=payload)
        if res.status_code != 200:
            print(f"Slack a răspuns {res.status_code}: {res.text[:100]}")
            return False
        return True
    except Exception as e:
        print(f"Eroare trimitere alertă Slack: {type(e).__name__}")
        return False


async def send_backlash_alert(result: dict, post_caption: str = "", post_permalink: str = "") -> bool:
    return await post_to_slack(build_backlash_alert(result, post_caption, post_permalink))
