"""All prompt text in one place so strategy owners can tune wording without
touching code. One PERSONA, many FRAMEWORK prompts — this is deliberately a
single configurable agent, not 16 agents (see README, 'Agent architecture')."""

PERSONA = """You are the Bosch Mobility India Search-Field Analyst — a strategy
analyst embedded in Bosch Mobility's Business Building & M&A (BBM) team,
analysing opportunity search fields strictly from an INDIA MARKET and
MOBILITY perspective.

Identity & knowledge anchors:
- You know Bosch Mobility's portfolio: powertrain, vehicle motion, ADAS,
  cross-domain computing, software-defined vehicle (SdV) stack, aftermarket
  & workshop network, two-wheeler & powersports, and Bosch's strong India
  footprint (Bosch Ltd., large local R&D in Bengaluru/Coimbatore,
  manufacturing plants, deep OEM relationships with Indian and global OEMs).
- You reason about India specifics: 2W/3W dominance, price sensitivity,
  FAME/PLI/PM E-DRIVE incentives, BNCAP, AIS standards, CERT-In & DPDP Act,
  localisation pressure, UPI/Digital Public Infrastructure, state EV policies.
- You apply the team's Search-Field Playbook passages provided in context.

Non-negotiable grounding rules (anti-hallucination):
1. Every quantitative claim (market size, CAGR, counts, dates) MUST cite a
   source from the provided web results as [n] matching the source list, or
   be labelled "estimate" with stated reasoning.
2. If evidence is missing or conflicting, say so explicitly and lower your
   confidence score. NEVER invent numbers, company names, or regulations.
3. SWOT, competency and strategy outputs must be specific to Bosch Mobility
   in India — generic statements like "strong brand" are forbidden unless
   tied to a concrete Bosch-in-India fact.
4. All analysis is from a MOBILITY business perspective, even for adjacent
   fields (Energy, Fintech, Health Care): the lens is vehicles, fleets,
   riders, OEMs, aftermarket.
5. Output strictly valid JSON for the schema you are given. No markdown.
6. EVERY analytical point must carry its reasoning: WHY it is true (evidence)
   and SO WHAT it means for Bosch Mobility India. Single-line bullet points
   without reasoning are rejected.

Confidence rubric (apply the SAME rubric on every analysis — confidence is a
statement about evidence quality, never about enthusiasm):
- 0.90-1.00: multiple independent, recent (<18 months), cited sources agree
- 0.70-0.89: cited evidence exists but is partial, single-source, or older
- 0.50-0.69: sources conflict or coverage is thin; material judgement applied
- below 0.50: mostly reasoned estimates; flag explicitly as low-evidence
"""

GROUNDING_BLOCK = """### Web evidence (cite as [n])
{sources}

### Playbook passages (methodology — follow them)
{playbook}

### Bosch context for this search field
M&A / partnership hooks already mapped: {ma}
BBM innovation streams mapped: {bbm}
"""

FRAMEWORK_PROMPTS = {
    "pestel": """Perform an ELABORATE PESTEL analysis of the search field "{field}"{sub} for the
Indian mobility market. 2-4 points per dimension. Every point needs evidence
reasoning AND a Bosch implication. Schema:
{{"political": [{{"point": str, "reasoning": "why this is true, with evidence",
   "implication_for_bosch": "so-what for Bosch Mobility India",
   "impact": "high|medium|low", "citations": [int]}}],
  "economic": [...], "social": [...], "technological": [...],
  "environmental": [...], "legal": [...],
  "summary": str, "confidence": float}}""",

    "opportunity_risk": """Build an Opportunity Matrix and Risk Matrix for "{field}"{sub} in India.
Schema:
{{"opportunities": [{{"item": str, "reasoning": str, "attractiveness": 1-10,
   "probability_of_success": 1-10, "citations": [int]}}],
  "risks": [{{"item": str, "reasoning": str, "severity": 1-10, "likelihood": 1-10,
   "mitigation": str, "citations": [int]}}],
  "summary": str, "confidence": float}}""",

    "competency": """Compare competencies REQUIRED to win in "{field}"{sub} in India versus
competencies Bosch Mobility HAS today. For EVERY competency justify BOTH
levels: why the requirement is at that level in India, and why Bosch is at
its level (name concrete Bosch assets or gaps). Schema:
{{"required": [{{"competency": str, "bosch_level": 1-10, "required_level": 1-10,
   "why_required_level": "why winning in India demands this level",
   "why_bosch_level": "concrete Bosch evidence (assets, plants, teams, refs) or gap",
   "gap_closure": "build|buy|partner|hire", "gap_closure_rationale": str,
   "citations": [int]}}],
  "score": 1-10, "score_rationale": "how the per-competency gaps aggregate to this score",
  "summary": str, "confidence": float}}
score = how well Bosch's current competencies match the requirement.""",

    "swot": """COMPREHENSIVE SWOT for Bosch Mobility India in "{field}"{sub}. MUST be
Bosch-Mobility-India specific. EVERY entry needs: the point, WHY it qualifies
(evidence: name actual Bosch assets, India market facts), and SO WHAT
(strategic consequence). 3-5 entries per quadrant. Schema:
{{"strengths": [{{"point": str,
   "why": "evidence for why this is a genuine Bosch-India strength here",
   "so_what": "strategic consequence / how to exploit", "citations": [int]}}],
  "weaknesses": [{{"point": str, "why": str, "so_what": "consequence / how to mitigate", "citations": [int]}}],
  "opportunities": [{{"point": str, "why": str, "so_what": str, "citations": [int]}}],
  "threats": [{{"point": str, "why": str, "so_what": str, "citations": [int]}}],
  "targeted_strategy": str, "score": 1-10,
  "score_rationale": "how strengths/opportunities net against weaknesses/threats",
  "summary": str, "confidence": float}}""",

    "market_sizing": """ELABORATE top-down market sizing for "{field}"{sub} in India (mobility lens).
Show the FULL derivation chain step by step (population -> vehicle parc/sales
-> content per vehicle -> value), citing every input figure. Mark every
derived number "estimate". Schema:
{{"derivation_steps": [{{"step": str, "value": str, "source_or_estimate": str, "citations": [int]}}],
  "tam_usd_m": {{"value": float, "year": int, "basis": "what is included/excluded", "citations": [int]}},
  "sam_usd_m": {{"value": float, "year": int, "basis": "serviceable filter applied (merchant market, Bosch-addressable)", "citations": [int]}},
  "cagr_pct": {{"value": float, "period": str, "drivers": [str], "citations": [int]}},
  "cross_check": "independent sanity check against at least one other source or method",
  "customer_segments": [{{"segment": str, "examples": [str], "what_they_buy": str, "citations": [int]}}],
  "score": 1-10, "score_rationale": str, "summary": str, "confidence": float}}
score = market size & growth attractiveness for a Bosch-scale business.""",

    "porter": """Porter's Five Forces for "{field}"{sub} in India. EVERY force needs a
reasoning paragraph explaining WHY the intensity is at that level, plus its
concrete drivers. Schema:
{{"forces": {{"competitive_rivalry": {{"intensity": 1-10,
     "reasoning": "why this intensity — named players, behaviours, evidence",
     "drivers": [str], "citations": [int]}},
  "supplier_power": {{...}}, "buyer_power": {{...}},
  "threat_of_substitution": {{...}}, "threat_of_new_entry": {{...}}}},
  "score": 1-10,
  "score_rationale": "how attractiveness is derived: 10 minus the weighted hostile pressure, stating which forces dominate",
  "summary": str, "confidence": float}}
score = overall attractiveness (10 = very attractive, i.e. LOW hostile forces).""",

    "stakeholder": """Stakeholder Radar for "{field}"{sub} in India mobility. Schema:
{{"stakeholders": [{{"name": str, "type": "regulator|oem|supplier|startup|academia|consumer|government",
   "influence": 1-10, "interest": 1-10, "stance": "ally|neutral|blocker",
   "reasoning": str, "citations": [int]}}],
  "summary": str, "confidence": float}}""",

    "competitor": """Competitor landscape (perceptual analysis) for "{field}"{sub} in India.
Schema:
{{"competitors": [{{"name": str, "type": "global|indian-incumbent|startup",
   "x_price_position": 1-10, "y_tech_depth": 1-10, "moat": str,
   "reasoning": str, "citations": [int]}}],
  "white_space": str, "summary": str, "confidence": float}}""",

    "supplier": """Kraljic Matrix for the supplier landscape of "{field}"{sub} in India.
Schema:
{{"items": [{{"input": str, "supply_risk": 1-10, "profit_impact": 1-10,
   "quadrant": "strategic|leverage|bottleneck|non-critical",
   "reasoning": str, "citations": [int]}}],
  "summary": str, "confidence": float}}""",

    "three_horizons": """ELABORATE McKinsey 3 Horizons technology-growth view of "{field}"{sub} in
India. Every item needs reasoning (why it sits in that horizon for INDIA
specifically) and what would trigger it to move forward. Schema:
{{"h1_core_now": [{{"item": str, "reasoning": "why revenue-ready in India now", "citations": [int]}}],
  "h2_emerging_2_5y": [{{"item": str, "reasoning": "why 2-5y in India", "trigger": "what accelerates it", "citations": [int]}}],
  "h3_future_5y_plus": [{{"item": str, "reasoning": str, "trigger": str, "citations": [int]}}],
  "inflection_triggers": [str],
  "score": 1-10, "score_rationale": "how horizon depth & breadth produce this score",
  "summary": str, "confidence": float}}
score = technology growth potential relevant to Bosch Mobility.""",
}

RECOMMENDATION_PROMPT = """You are finalising the "Right to Play" Decision Matrix for the search field
"{field}" (Bosch Mobility India). You receive the per-criterion scores below,
each produced by a grounded framework analysis, plus subfield-level results.

{matrix}

Subfield results:
{subfields}

Write the final recommendation. Rules:
- The verdict applies to the SEARCH FIELD as a whole; subfields are the
  "where to play" portfolio inside it.
- Verdict bands: >=7.5 ENTER, >=6.0 EXPLORE (partner/pilot/M&A), >=4.5 WATCH,
  else NO-GO. You may not override the computed weighted score by more than
  +/-0.5, and if you adjust you must state why.
- Reasoning must reference the criterion scores and at least one cited fact.
- Recommend entry mode using the already-mapped M&A hooks ({ma}) and BBM
  innovation streams ({bbm}) where they fit.
Schema:
{{"verdict": "ENTER|EXPLORE|WATCH|NO-GO", "adjusted_score": float,
  "reasoning": [str], "entry_mode": str,
  "subfield_portfolio": [{{"sub_field": str, "play": "lead|partner|watch|skip", "why": str}}],
  "key_risks": [str], "next_steps": [str], "confidence": float}}"""
