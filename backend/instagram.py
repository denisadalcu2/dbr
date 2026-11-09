import asyncio
import base64
import os
import httpx
from dotenv import load_dotenv
from agents import analyze_comments, extract_brand_dna, extract_visual_elements

load_dotenv()

GRAPH_URL = "https://graph.instagram.com"
MEDIA_FIELDS = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count"
MAX_POSTS = 30
MAX_TOP_POSTS = 5
MAX_WEAK_POSTS = 3
MIN_POSTS_WITH_REACH = 3
MAX_CONCURRENT_REQUESTS = 5
MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_CAPTION_CHARS = 500
SUPPORTED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_COMMENTS = 200
MAX_COMMENT_CHARS = 300


class InstagramError(Exception):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


async def graph_get(client: httpx.AsyncClient, path: str, token: str, params: dict) -> dict:
    try:
        res = await client.get(f"{GRAPH_URL}/{path}", params={**params, "access_token": token})
    except httpx.HTTPError as e:
        # Doar tipul erorii: URL-ul conține tokenul și nu trebuie să ajungă în loguri
        raise InstagramError(f"Instagram nu a răspuns ({type(e).__name__}).")

    if res.status_code != 200:
        error = res.json().get("error", {}) if "json" in res.headers.get("content-type", "") else {}
        if error.get("code") == 190:
            raise InstagramError("Tokenul Instagram este invalid sau a expirat. Generează altul.", 401)
        raise InstagramError(f"Eroare Instagram {res.status_code}: {error.get('message', 'fără detalii')}")
    return res.json()


def read_metric(item: dict) -> int:
    values = item.get("values") or [{}]
    value = values[0].get("value", item.get("total_value", {}).get("value", 0))
    return value if isinstance(value, int) else 0


async def fetch_insights(client: httpx.AsyncClient, token: str, post_id: str, semaphore: asyncio.Semaphore) -> dict:
    # Postările de dinainte de trecerea la cont Creator/Business nu au statistici
    async with semaphore:
        for metrics in ("reach,saved,shares", "reach"):
            try:
                data = await graph_get(client, f"{post_id}/insights", token, {"metric": metrics})
                return {item["name"]: read_metric(item) for item in data.get("data", [])}
            except InstagramError as e:
                if e.status_code == 401:
                    raise
    return {}


async def fetch_posts(client: httpx.AsyncClient, token: str) -> list:
    data = await graph_get(client, "me/media", token, {"fields": MEDIA_FIELDS, "limit": MAX_POSTS})
    media = data.get("data", [])

    semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)
    insights = await asyncio.gather(*[fetch_insights(client, token, item["id"], semaphore) for item in media])

    return [
        {
            "permalink": item.get("permalink", ""),
            "caption": (item.get("caption") or "")[:MAX_CAPTION_CHARS],
            "media_type": item.get("media_type", ""),
            "timestamp": item.get("timestamp", ""),
            "image_url": item.get("thumbnail_url") or item.get("media_url"),
            "reach": metrics.get("reach") or None,
            "likes": item.get("like_count", 0),
            "comments": item.get("comments_count", 0),
            "saved": metrics.get("saved", 0),
            "shares": metrics.get("shares", 0),
        }
        for item, metrics in zip(media, insights)
    ]


def count_interactions(post: dict) -> int:
    return post["likes"] + post["comments"] + post["saved"] + post["shares"]


def rank_posts(posts: list) -> tuple:
    # Nu comparăm reach cu aprecieri: dacă sunt destule postări cu reach, le folosim doar pe ele
    with_reach = [post for post in posts if post["reach"]]
    if len(with_reach) >= MIN_POSTS_WITH_REACH:
        pool, metric = with_reach, "reach"
    else:
        pool, metric = posts, "interactions"

    key = (lambda post: post["reach"]) if metric == "reach" else count_interactions
    ranked = sorted(pool, key=key, reverse=True)

    # O postare nu poate fi în ambele grupuri, chiar dacă sunt puține
    top_count = min(MAX_TOP_POSTS, (len(ranked) + 1) // 2)
    weak_start = max(top_count, len(ranked) - MAX_WEAK_POSTS)
    return ranked[:top_count], ranked[weak_start:], metric


async def download_image(client: httpx.AsyncClient, post: dict) -> dict | None:
    if not post["image_url"]:
        return None
    try:
        res = await client.get(post["image_url"], follow_redirects=True)
    except httpx.HTTPError:
        return None

    mime = res.headers.get("content-type", "").split(";")[0].strip()
    if res.status_code != 200 or mime not in SUPPORTED_IMAGE_TYPES or len(res.content) > MAX_IMAGE_BYTES:
        return None
    return {"base64": base64.b64encode(res.content).decode("utf-8"), "mime": mime}


def describe_post(post: dict, label: str) -> str:
    reach = post["reach"] if post["reach"] else "indisponibil"
    return (
        f'Postare {label} ({post["media_type"]}): "{post["caption"]}" - reach {reach}, '
        f'{post["likes"]} aprecieri, {post["comments"]} comentarii, {post["saved"]} salvări, {post["shares"]} distribuiri'
    )


async def analyze_instagram_account() -> dict:
    token = os.getenv("INSTAGRAM_ACCESS_TOKEN", "").strip()
    if not token:
        raise InstagramError("Lipsește INSTAGRAM_ACCESS_TOKEN din fișierul .env.", 400)

    async with httpx.AsyncClient(timeout=15.0) as client:
        account = await graph_get(client, "me", token, {"fields": "user_id,username,account_type,followers_count"})
        posts = await fetch_posts(client, token)
        if len(posts) < 2:
            raise InstagramError("Contul are prea puține postări pentru o comparație.", 422)

        top_posts, weak_posts, metric = rank_posts(posts)
        selected = [("TOP", post) for post in top_posts] + [("SLABĂ", post) for post in weak_posts]
        downloads = await asyncio.gather(*[download_image(client, post) for _, post in selected])

    top_images = [image for image in downloads[:len(top_posts)] if image]
    weak_images = [image for image in downloads[len(top_posts):] if image]
    lines = [describe_post(post, label) for label, post in selected]

    metric_note = "reach" if metric == "reach" else "numărul de interacțiuni, pentru că reach-ul nu este disponibil"
    summary = f"Cont Instagram cu {account.get('followers_count', 'necunoscut')} urmăritori. Postările sunt clasate după {metric_note}.\n"
    visual_elements = await extract_visual_elements(top_images, weak_images)
    result = await extract_brand_dna(summary + "\n".join(lines), visual_elements)

    public_post = lambda post: {key: value for key, value in post.items() if key != "image_url"}
    return {
        **result,
        "visual_elements": visual_elements,
        "username": account.get("username", ""),
        "metric_used": metric,
        "posts_analyzed": len(posts),
        "posts_with_reach": sum(1 for post in posts if post["reach"]),
        "top_posts": [public_post(post) for post in top_posts],
        "weak_posts": [public_post(post) for post in weak_posts],
    }


def normalize_permalink(url: str) -> str:
    return url.split("?")[0].rstrip("/").lower().replace("://www.", "://")


def get_token() -> str:
    token = os.getenv("INSTAGRAM_ACCESS_TOKEN", "").strip()
    if not token:
        raise InstagramError("Lipsește INSTAGRAM_ACCESS_TOKEN din fișierul .env.", 400)
    return token


async def fetch_post_comments(client: httpx.AsyncClient, token: str, permalink: str = "") -> tuple:
    data = await graph_get(client, "me/media", token, {"fields": "id,caption,permalink,timestamp,comments_count", "limit": MAX_POSTS})
    media = data.get("data", [])
    if not media:
        raise InstagramError("Contul nu are postări.", 422)

    if permalink:
        wanted = normalize_permalink(permalink)
        post = next((item for item in media if normalize_permalink(item.get("permalink", "")) == wanted), None)
        if not post:
            raise InstagramError("Nu am găsit postarea printre ultimele 30 ale contului. Verifică linkul.", 404)
    else:
        post = media[0]  # cea mai recentă postare

    comments, after = [], None
    while len(comments) < MAX_COMMENTS:
        params = {"fields": "text,timestamp,like_count", "limit": 50}
        if after:
            params["after"] = after
        page = await graph_get(client, f"{post['id']}/comments", token, params)
        comments += [item["text"][:MAX_COMMENT_CHARS] for item in page.get("data", []) if item.get("text", "").strip()]
        after = page.get("paging", {}).get("cursors", {}).get("after")
        if not after or not page.get("paging", {}).get("next"):
            break
    return post, comments[:MAX_COMMENTS]


async def monitor_instagram_post(permalink: str = "") -> dict:
    token = get_token()
    async with httpx.AsyncClient(timeout=15.0) as client:
        post, comments = await fetch_post_comments(client, token, permalink)
    if len(comments) < 3:
        raise InstagramError("Postarea are prea puține comentarii pentru o analiză (minimum 3).", 422)
    caption = (post.get("caption") or "")[:MAX_CAPTION_CHARS]
    result = await analyze_comments(comments, caption)
    return {**result, "source": "instagram", "post_permalink": post.get("permalink", ""), "post_caption": caption}
