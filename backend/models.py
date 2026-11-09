from pydantic import BaseModel
from typing import Dict, List, Optional

class CampaignInput(BaseModel):
    text: str
    target_audience: str

class AgentFeedback(BaseModel):
    persona: str
    feedback: str
    risk_level: int
    phrase: str = ""  # fragmentul exact din reclamă care l-a deranjat pe agent
    custom: bool = False  # persona definită de agenție

class NewsItem(BaseModel):
    titlu: str
    url: str

class SensitiveAssociation(BaseModel):
    eveniment: str
    declansator: str
    explicatie: str

class DateRisk(BaseModel):
    eveniment: str
    data: str
    explicatie: str

class WinningElement(BaseModel):
    element: str
    dovada: str

class BrandDNAResult(BaseModel):
    brand_dna: str
    tone: str
    has_engagement_data: bool
    winning_elements: List[WinningElement] = []
    elements_to_avoid: List[str] = []
    visual_elements: List[str] = []

class InstagramPost(BaseModel):
    permalink: str
    caption: str
    media_type: str
    timestamp: str
    reach: Optional[int] = None
    likes: int
    comments: int
    saved: int
    shares: int

class InstagramDNAResult(BrandDNAResult):
    username: str
    metric_used: str  # "reach" sau "interactions"
    posts_analyzed: int
    posts_with_reach: int
    top_posts: List[InstagramPost]
    weak_posts: List[InstagramPost]

class AnalysisResult(BaseModel):
    overall_risk_score: int
    verdict: str
    agent_feedbacks: List[AgentFeedback]
    safe_alternative: str
    safe_text: str = ""  # doar reclama rescrisă, gata de retestat
    context_keywords: List[str] = []
    context_risks: List[SensitiveAssociation] = []
    context_news: Dict[str, List[NewsItem]] = {}
    date_risks: List[DateRisk] = []
    publish_date: str = ""
    slack_alert_sent: bool = False

class CommentTheme(BaseModel):
    tema: str
    procent: int
    tip: str  # "pozitiv", "neutru" sau "negativ"
    exemple: List[str] = []

class MonitorResult(BaseModel):
    sentiment: int  # de la -100 (ostil) la 100 (entuziast)
    positive: int  # procente
    neutral: int
    negative: int
    level: str  # "calm", "atentie" sau "criza"
    themes: List[CommentTheme] = []
    summary: str
    action: str
    suggested_reply: str
    comments_analyzed: int
    slack_alert_sent: bool = False
    source: str = "text"  # "text" sau "instagram"
    post_permalink: str = ""
    post_caption: str = ""
