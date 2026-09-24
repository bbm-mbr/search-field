"""Source tiers: how much a source is allowed to carry.

  1  primary     government, regulator, gazette, standards body, stock-exchange
                 filing, industry association statistics, a company's own site
                 speaking about itself
  2  analyst     a named research or rating house with a dated figure, or a
                 university / public research institute
  3  press       credible trade and business press
  4  unrated     anything not recognised. Kept, but may not be the only source
                 behind a number — the authoring stage enforces that.
  9  rejected    source types that are never evidence: social media, forums,
                 personal blogs, SEO press-release farms. Recorded (so the
                 rejection is visible) and never cited.

The lists are deliberately explicit rather than clever. A source that lands in
the wrong tier is fixed by editing a list here, and the change is reviewable.
The first live sample that shaped this: one Gemini answer about ISM automotive
packaging cited a company site, EE Times, Times of India, a personal blog and a
Facebook post — five sources a flat list would have weighted equally.
"""
from __future__ import annotations

import re
from typing import Tuple
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

PRIMARY_SUFFIXES = (".gov.in", ".nic.in", ".gov", ".europa.eu", ".gc.ca")
# Universities and public research institutes: research, not press.
ACADEMIC_SUFFIXES = (".ac.in", ".edu", ".ac.uk", ".res.in")
PRIMARY_DOMAINS = {
    # regulators, exchanges, standards, public bodies
    "pib.gov.in", "egazette.gov.in", "morth.nic.in", "meity.gov.in", "ism.gov.in", "niti.gov.in",
    "rbi.org.in", "sebi.gov.in", "npci.org.in", "bseindia.com", "nseindia.com", "cert-in.org.in",
    "bis.gov.in", "araiindia.com", "icat.in", "irdai.gov.in", "trai.gov.in", "cpcb.nic.in",
    "nhai.gov.in", "iso.org", "unece.org", "sae.org", "autosar.org", "who.int", "ilo.org",
    "iea.org", "irena.org",
    # industry associations publishing primary statistics
    "siam.in", "acma.in", "fada.in", "nasscom.in", "semi.org", "ifr.org", "5gaa.org",
    "openchargealliance.org", "globalplatform.org", "riscv.org", "jedec.org", "aecouncil.com",
    "ieema.org", "elcina.com", "iesaonline.org", "smev.in", "ibef.org",
    # companies speaking about themselves (extend as fields need)
    "bosch.com", "bosch.in", "bosch-mobility.com", "bosch-semiconductors.com", "etas.com",
    "tatamotors.com", "tataelxsi.com", "tata.com", "mahindra.com", "marutisuzuki.com",
    "infineon.com", "nxp.com", "st.com", "renesas.com", "qualcomm.com", "nvidia.com",
    "kaynessemicon.com", "kaynestechnology.co.in", "cgglobal.com", "micron.com",
    "zf.com", "continental.com", "valeo.com", "visteon.com", "kpit.com", "lumaxworld.in",
    "unominda.com", "varroc.com", "gabrielindia.com", "exicom.in", "attero.in", "lohum.com",
}
ANALYST_DOMAINS = {
    "mordorintelligence.com", "6wresearch.com", "counterpointresearch.com", "yolegroup.com",
    "mckinsey.com", "bcg.com", "deloitte.com", "pwc.in", "pwc.com", "ey.com", "kpmg.com",
    "crisil.com", "icra.in", "careratings.com", "bnef.com", "about.bnef.com",
    "statista.com", "marketsandmarkets.com", "grandviewresearch.com", "imarcgroup.com",
    "fortunebusinessinsights.com", "techsciresearch.com", "interactanalysis.com",
    "rmi.org", "wri.org", "wri-india.org", "ceew.in", "icct.org", "theicct.org", "marklines.com",
    "tracxn.com", "gartner.com", "idc.com", "spglobal.com", "jdpower.com", "frost.com",
    # syndicated-report houses: named and dated, but figures vary widely between
    # them — the Phase 2 plausibility gate is what keeps a stray one out
    "databridgemarketresearch.com", "maximizemarketresearch.com", "researchandmarkets.com",
    "precedenceresearch.com", "alliedmarketresearch.com", "technavio.com", "expertmarketresearch.com",
    "kenresearch.com", "blackridgeresearch.com", "counterpoint.com", "trendforce.com", "omdia.com",
}
PRESS_DOMAINS = {
    "autocarpro.in", "autocarindia.com", "economictimes.indiatimes.com", "auto.economictimes.indiatimes.com",
    "energy.economictimes.indiatimes.com", "livemint.com", "business-standard.com",
    "thehindubusinessline.com", "financialexpress.com", "reuters.com", "bloomberg.com",
    "moneycontrol.com", "eetimes.com", "electronicsb2b.efytimes.com", "evreporter.com",
    "mercomindia.com", "timesofindia.indiatimes.com", "hindustantimes.com", "thehindu.com",
    "indianexpress.com", "ndtv.com", "ndtvprofit.com", "cnbctv18.com", "zeebiz.com", "rushlane.com",
    "carandbike.com", "autocar.co.uk", "electrive.com", "techcrunch.com", "inc42.com",
    "entrackr.com", "yourstory.com", "fortuneindia.com", "outlookbusiness.com", "businesstoday.in",
    "swarajyamag.com", "semiengineering.com", "eenewseurope.com", "just-auto.com",
    "automotiveworld.com", "apnews.com", "forbes.com", "forbesindia.com", "indiatoday.in",
    "india-briefing.com", "bisinfotech.com", "timesev.com", "manufacturingtodayindia.com",
    "etauto.com", "digitimes.com", "theverge.com", "wsj.com", "ft.com", "nikkei.com", "asia.nikkei.com",
    "scmp.com", "cnbc.com", "deccanherald.com", "news18.com", "firstpost.com", "theprint.in",
    "thequint.com", "scroll.in", "livelaw.in", "moneylife.in", "electronicsforu.com", "emsnow.com",
    "evmechanica.com", "gaadiwaadi.com", "team-bhp.com", "motorbeam.com",
    "electronicsmedia.info", "eletimes.ai", "semiconductor-today.com", "anandtech.com",
}
REJECT_DOMAINS = {
    "facebook.com", "linkedin.com", "x.com", "twitter.com", "instagram.com", "youtube.com",
    "reddit.com", "quora.com", "pinterest.com", "tiktok.com", "threads.net", "t.me",
    "openpr.com", "einpresswire.com", "whatech.com", "scoop.market.us", "newstrail.com",
    "digitaljournal.com", "prnewswire.com", "globenewswire.com",
    # marketplaces, file CDNs and exam-prep digests: derivative, never a source
    "imimg.com", "indiamart.com", "scribd.com", "slideshare.net", "coursehero.com",
    "drishtiias.com", "visionias.in", "insightsonindia.com", "byjus.com", "testbook.com",
    "studocu.com", "brainly.in",
}
REJECT_PATTERNS = (r"\.blogspot\.", r"\.wordpress\.com$", r"\.medium\.com$", r"^medium\.com$",
                   r"\.substack\.com$", r"\.wixsite\.com$")

TRACKING = re.compile(r"^(utm_|fbclid$|gclid$|mc_|ref$|ref_src$|igshid$)")


def domain_of(url: str) -> str:
    host = (urlsplit(url).hostname or "").lower()
    return host[4:] if host.startswith("www.") else host


def canonical_url(url: str) -> str:
    """Same page, same key: lower-case host, no www, no fragment, no tracking
    parameters, no trailing slash. Two citations of one article dedupe."""
    p = urlsplit(url.strip())
    q = [(k, v) for k, v in parse_qsl(p.query, keep_blank_values=True) if not TRACKING.match(k.lower())]
    path = p.path.rstrip("/") or "/"
    return urlunsplit(("https", domain_of(url), path, urlencode(q), ""))


def _in(domain: str, pool: set) -> bool:
    return any(domain == d or domain.endswith("." + d) for d in pool)


def classify(url: str, title_hint: str = "") -> Tuple[int, str]:
    """(tier, reason). title_hint is the domain Gemini reports in the chunk
    title — used when a redirect could not be resolved."""
    if url and "grounding-api-redirect" not in url:
        d = domain_of(url)
    else:
        d = (title_hint or "").strip().lower()
        d = d[4:] if d.startswith("www.") else d
    if not d:
        return 4, "no domain"
    if _in(d, REJECT_DOMAINS) or any(re.search(p, d) for p in REJECT_PATTERNS):
        return 9, f"never evidence: {d} (social, forum, blog, marketplace or content farm)"
    if d.endswith(PRIMARY_SUFFIXES) or _in(d, PRIMARY_DOMAINS):
        return 1, f"primary source: {d}"
    if d.endswith(ACADEMIC_SUFFIXES):
        return 2, f"academic research: {d}"
    if _in(d, ANALYST_DOMAINS):
        return 2, f"named analyst: {d}"
    if _in(d, PRESS_DOMAINS):
        return 3, f"trade or business press: {d}"
    return 4, f"unrated: {d}"
