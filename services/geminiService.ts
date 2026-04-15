import { SummaryStats, Period, MarketDataPoint } from "../types";

/** Primærmodell for markedsrapport (oppdatert fra gemini-1.5-flash). */
const GEMINI_MODEL_PRIMARY = "gemini-3.1-flash";

const GEMINI_MODEL_FALLBACKS: readonly string[] = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-pro",
];

type ApiVersion = "v1" | "v1beta";

// --- Types for internal logic ---

type MarketNewsSignal = {
  source: string;
  title: string;
  publishedAt: string;
};

type DailyNewsSnapshot = {
  date: string;
  generatedAt: string;
  signals: MarketNewsSignal[];
};

type VixMetrics = {
  last: number | null;
  oneDayChangePct: number | null;
  threeDayChangePct: number | null;
  regime: string;
};

type TurningPoint = {
  symbol: string;
  date: string;
  prevMovePct: number;
  newMovePct: number;
  swingPct: number;
};

type MarketContext = {
  summary: SummaryStats[];
  period: Period;
  recentData?: MarketDataPoint[];
  newsSignals: MarketNewsSignal[];
  vix: VixMetrics;
  turningPoints: TurningPoint[];
  divergenceSignals: string[];
  leaders: string;
  laggers: string;
  instrumentContext: string;
};

// --- Constants ---

const NEWS_CACHE_KEY = "marketNewsSnapshotV1";
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_NEWS_SIGNALS = 8;
const VIX_SYMBOL = "^VIX";
const VIX_THRESHOLDS = [
  { min: 50, label: "vill panikk" },
  { min: 40, label: "ekstrem frykt" },
  { min: 30, label: "stor frykt" },
  { min: 25, label: "frykt" },
];
const PUBLIC_FEEDS: { source: string; url: string }[] = [
  { source: "Reuters Markets", url: "https://feeds.reuters.com/reuters/businessNews" },
  { source: "Federal Reserve", url: "https://www.federalreserve.gov/feeds/press_all.xml" },
  { source: "ECB", url: "https://www.ecb.europa.eu/rss/press.html" },
  { source: "IMF", url: "https://www.imf.org/en/News/RSS" },
];
const MIN_SECTION_LENGTH = 55;
const MIN_DATES_IN_OUTPUT = 1;

// --- Helper Functions ---

const formatNum = (value: number | null, digits = 2): string =>
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "n/a";

const calcPct = (from: number, to: number): number | null => {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === 0) return null;
  return ((to - from) / from) * 100;
};

const getVixRegime = (value: number | null): string => {
  if (value == null || !Number.isFinite(value)) return "ukjent";
  for (const t of VIX_THRESHOLDS) {
    if (value >= t.min) return t.label;
  }
  return "rolig";
};

const isVixMaterial = (vix: VixMetrics): boolean => {
  const oneDay = Math.abs(vix.oneDayChangePct ?? 0);
  const threeDay = Math.abs(vix.threeDayChangePct ?? 0);
  return (vix.last ?? 0) >= 20 || oneDay >= 5 || threeDay >= 10;
};

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, " ").trim();

const stripMarkdown = (value: string): string => value.replace(/[*_`#>-]/g, "").trim();

// --- Data Fetching Layer ---

async function fetchVixMetrics(): Promise<VixMetrics> {
  try {
    const origin =
      typeof window !== "undefined" && window.location?.origin && /^https?:/i.test(window.location.origin)
        ? window.location.origin
        : null;
    if (!origin) {
      return { last: null, oneDayChangePct: null, threeDayChangePct: null, regime: "ukjent" };
    }
    const path = `/api/yahoo/v8/finance/chart/${encodeURIComponent(VIX_SYMBOL)}?interval=1d&range=1mo`;
    const response = await fetch(new URL(path, origin).toString());
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    const closes = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close as Array<number | null> | undefined;
    const valid = (closes ?? []).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    if (valid.length < 2) {
      return { last: null, oneDayChangePct: null, threeDayChangePct: null, regime: "ukjent" };
    }
    const last = valid[valid.length - 1];
    const prev = valid[valid.length - 2];
    const prev3 = valid[Math.max(0, valid.length - 4)];
    const oneDayChangePct = calcPct(prev, last);
    const threeDayChangePct = calcPct(prev3, last);
    return { last, oneDayChangePct, threeDayChangePct, regime: getVixRegime(last) };
  } catch (error) {
    return { last: null, oneDayChangePct: null, threeDayChangePct: null, regime: "ukjent" };
  }
}

async function fetchFeedSignals(feedUrl: string, source: string): Promise<MarketNewsSignal[]> {
  if (typeof DOMParser === "undefined") return [];
  try {
    const response = await fetch(feedUrl);
    if (!response.ok) throw new Error(`RSS HTTP ${response.status}`);
    const xml = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "text/xml");
    const items = Array.from(doc.querySelectorAll("item")).slice(0, 3);
    return items
      .map((item) => {
        const title = item.querySelector("title")?.textContent?.trim() ?? "";
        const pubDate = item.querySelector("pubDate")?.textContent?.trim() ?? "";
        return { source, title, publishedAt: pubDate };
      })
      .filter((s) => s.title.length > 0);
  } catch (err) {
    console.warn(`Failed to fetch feed ${source}:`, err);
    return [];
  }
}

async function getDailyNewsSignals(): Promise<MarketNewsSignal[]> {
  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);
  
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(NEWS_CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as DailyNewsSnapshot;
        if (cached.date === today && now - new Date(cached.generatedAt).getTime() < DAY_MS) {
          return cached.signals;
        }
      }
    } catch {}
  }

  const settled = await Promise.allSettled(
    PUBLIC_FEEDS.map((feed) => fetchFeedSignals(feed.url, feed.source))
  );
  const signals: MarketNewsSignal[] = settled.flatMap((entry) =>
    entry.status === "fulfilled" ? entry.value : []
  );
  const deduped = Array.from(new Map(signals.map((s) => [`${s.source}-${s.title}`, s])).values()).slice(
    0,
    MAX_NEWS_SIGNALS
  );
  
  if (typeof localStorage !== "undefined") {
    try {
      const snapshot: DailyNewsSnapshot = {
        date: today,
        generatedAt: new Date(now).toISOString(),
        signals: deduped,
      };
      localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(snapshot));
    } catch {}
  }
  
  return deduped;
}

// --- Context Builder Layer ---

const detectTurningPoints = (
  summary: SummaryStats[],
  recentData: MarketDataPoint[] | undefined
): TurningPoint[] => {
  if (!recentData || recentData.length < 4) return [];
  const symbols = summary.map((s) => s.symbol);
  const points: TurningPoint[] = [];

  for (const symbol of symbols) {
    let strongest: TurningPoint | null = null;
    for (let i = 2; i < recentData.length; i++) {
      const p0 = recentData[i - 2]?.[symbol];
      const p1 = recentData[i - 1]?.[symbol];
      const p2 = recentData[i]?.[symbol];
      if (typeof p0 !== "number" || typeof p1 !== "number" || typeof p2 !== "number") continue;
      if (p0 === 0 || p1 === 0) continue;
      const prevMovePct = ((p1 - p0) / p0) * 100;
      const newMovePct = ((p2 - p1) / p1) * 100;
      const isSignFlip = Math.sign(prevMovePct) !== Math.sign(newMovePct);
      if (!isSignFlip) continue;
      const swingPct = Math.abs(prevMovePct - newMovePct);
      if (swingPct < 1.2) continue;

      const candidate: TurningPoint = {
        symbol,
        date: String(recentData[i].timestamp),
        prevMovePct,
        newMovePct,
        swingPct,
      };
      if (!strongest || candidate.swingPct > strongest.swingPct) strongest = candidate;
    }
    if (strongest) points.push(strongest);
  }

  return points.sort((a, b) => b.swingPct - a.swingPct).slice(0, 5);
};

const buildHistoryContext = (summary: SummaryStats[], recentData: MarketDataPoint[] | undefined): string => {
  if (!recentData?.length) return "Ingen historikk tilgjengelig.";
  const symbols = summary.map((s) => s.symbol);
  const first = recentData[0];
  const last = recentData[recentData.length - 1];

  const rows = symbols.map((symbol) => {
    const from = first[symbol];
    const to = last[symbol];
    if (typeof from !== "number" || typeof to !== "number" || from === 0) return `${symbol}: mangler data`;
    const pct = ((to - from) / from) * 100;
    return `${symbol}: start ${from.toFixed(2)}, slutt ${to.toFixed(2)}, endring ${pct.toFixed(2)}%`;
  });
  return rows.join("\n");
};

const detectDivergence = (summary: SummaryStats[]): string[] => {
  const signals: string[] = [];
  const find = (sym: string) => summary.find(s => s.symbol === sym);
  
  const raw = find('XLB'); // Materialer
  const energy = find('XLE'); // Energi
  const tech = find('XLK'); // Teknologi
  
  if (raw && energy) {
    if (raw.percentChange > 2 && energy.percentChange < -1) {
      signals.push("Divergens: Råvarer stiger kraftig mens energi faller. Dette kan tyde på at inflasjonspresset flytter seg fra olje til andre innsatsvarer.");
    }
  }
  
  if (tech && summary.some(s => s.percentChange > 15)) {
    const hot = summary.filter(s => s.percentChange > 20);
    if (hot.length > 0) {
      signals.push(`Overoppheting: ${hot.map(h => h.name).join(', ')} har steget ekstremt mye på kort tid (+20%). Dette indikerer spekulativ eufori i enkelte lommer.`);
    }
  }

  return signals;
};

async function buildMarketContext(
  summary: SummaryStats[],
  period: Period,
  recentData?: MarketDataPoint[]
): Promise<MarketContext> {
  const sorted = [...summary].sort((a, b) => b.percentChange - a.percentChange);
  const leaders = sorted.slice(0, 2).map((s) => `${s.name} (${s.symbol}, ${s.percentChange.toFixed(2)}%)`).join(", ");
  const laggers = sorted.slice(-2).map((s) => `${s.name} (${s.symbol}, ${s.percentChange.toFixed(2)}%)`).join(", ");
  const instrumentContext = summary.map(s => `${s.name} (${s.symbol}): ${s.percentChange.toFixed(2)}%`).join(", ");

  const [newsSignals, vix] = await Promise.all([getDailyNewsSignals(), fetchVixMetrics()]);
  const turningPoints = detectTurningPoints(summary, recentData);
  const divergenceSignals = detectDivergence(summary);

  return {
    summary,
    period,
    recentData,
    newsSignals,
    vix,
    turningPoints,
    divergenceSignals,
    leaders,
    laggers,
    instrumentContext,
  };
}

// --- Quality Guard Layer ---

const isWeakSection = (value: string, ctx: MarketContext): boolean => {
  const text = normalizeWhitespace(stripMarkdown(value)).toLowerCase();
  if (!text || text.length < MIN_SECTION_LENGTH) return true;
  
  const genericPatterns = [
    "markedet har de siste",
    "analysen viser at",
    "vi ser at markedet",
    "utsiktene er usikre",
  ];
  if (genericPatterns.some((p) => text.startsWith(p))) return true;

  // Sjekk om teksten inneholder datoer fra vendepunkter hvis vi har dem
  if (ctx.turningPoints.length > 0) {
    const datesFound = ctx.turningPoints.filter(tp => text.includes(tp.date.toLowerCase()));
    if (datesFound.length < MIN_DATES_IN_OUTPUT) {
      // Hvis vi har sterke vendepunkter, men AI ignorerer dem, er det en svakhet
      return true;
    }
  }

  return false;
};

const buildFallbackAnalysis = (ctx: MarketContext): { comment: string; outlook: string } => {
  const { summary, period, vix } = ctx;
  const sorted = [...summary].sort((a, b) => b.percentChange - a.percentChange);
  const leader = sorted[0];
  const lagger = sorted[sorted.length - 1];
  
  const vixSentence = isVixMaterial(vix)
    ? ` VIX har begynt å bevege seg mer urolig, og det kan være et tidlig faresignal hvis den fortsetter opp.`
    : "";
    
  const comment = `Oppsummert fra dagens markedskommentarer: sentimentet er fortsatt forsiktig positivt, men mer følsomt for negative nyheter enn tidligere. I perioden ${period} har ${
    leader?.name ?? "ukjent"
  } vært sterkest, mens ${lagger?.name ?? "ukjent"} har hengt etter.${vixSentence}`;
  
  const outlook = isVixMaterial(vix)
    ? `Sektoranbefaling nå: hold hovedvekt i teknologi og helse, og vær mer selektiv i energi til uroen roer seg. Hvis usikkerheten skyter opp, flytt mer mot defensive sektorer med stabile inntjeningstall.`
    : `Sektoranbefaling nå: teknologi og industri ser mest attraktive ut nå, med nøytral vekt i energi. Stram inn risiko hvis energipriser hopper opp igjen eller markedsbredden svekkes videre.`;
    
  return { comment, outlook };
};

const finalizeAnalysis = (raw: string, ctx: MarketContext): string => {
  const cleaned = raw.trim();
  const commentMatch = cleaned.match(/(?:Analytikerkonsensus|Markedskommentar):\s*([\s\S]*?)(?:\n\s*(?:Sektoranbefaling nå|Utsikter for neste periode):|$)/i);
  const outlookMatch = cleaned.match(/(?:Sektoranbefaling nå|Utsikter for neste periode):\s*([\s\S]*)$/i);
  
  let comment = normalizeWhitespace(stripMarkdown(commentMatch?.[1] ?? ""));
  let outlook = normalizeWhitespace(stripMarkdown(outlookMatch?.[1] ?? ""));
  
  if (!comment && !outlook) {
    const lines = cleaned.split("\n").map((l) => normalizeWhitespace(stripMarkdown(l))).filter(Boolean);
    comment = lines[0] ?? "";
    outlook = lines.slice(1).join(" ");
  }

  const fallback = buildFallbackAnalysis(ctx);
  
  const finalComment = isWeakSection(comment, ctx) ? fallback.comment : comment;
  let finalOutlook = isWeakSection(outlook, ctx) ? fallback.outlook : outlook;
  
  if (normalizeWhitespace(finalOutlook).toLowerCase() === normalizeWhitespace(finalComment).toLowerCase()) {
    finalOutlook = fallback.outlook;
  }
  
  return `Analytikerkonsensus:\n${finalComment}\n\nSektoranbefaling nå:\n${finalOutlook}`;
};

// --- Model Runner Layer ---

const buildGenerateContentUrl = (apiVersion: ApiVersion, model: string, apiKey: string) =>
  `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`;

async function tryGenerateContent(url: string, body: object): Promise<{ ok: true; text: string } | { ok: false; notFound: boolean; message: string }> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (response.ok) {
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) return { ok: true, text };
    return { ok: false, notFound: false, message: "Tomt svar fra modellen." };
  }

  let message = `HTTP ${response.status}`;
  let notFound = response.status === 404;
  try {
    const err = await response.json();
    const msg = err?.error?.message as string | undefined;
    if (msg) {
      message = msg;
      notFound = notFound || /not found|NOT_FOUND|does not exist/i.test(msg);
    }
  } catch {}
  return { ok: false, notFound, message };
}

const isQuotaOrRateError = (message: string): boolean =>
  /quota exceeded|rate limit|too many requests|resource exhausted/i.test(message);

// --- Main Export ---

export const getMarketInsights = async (
  summary: SummaryStats[], 
  period: Period,
  recentData?: MarketDataPoint[]
): Promise<string> => {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 
                   import.meta.env.GEMINI_API_KEY || 
                   (typeof process !== 'undefined' && process.env.GEMINI_API_KEY) || 
                   (typeof process !== 'undefined' && process.env.API_KEY);
                   
    if (!apiKey || apiKey === 'lim_inn_din_nøkkel_her') {
      return "Legg til GEMINI_API_KEY i .env for å aktivere AI-markedsrapport.";
    }

    const ctx = await buildMarketContext(summary, period, recentData);
    
    const newsContext = ctx.newsSignals.length
      ? ctx.newsSignals.map((s, i) => `${i + 1}. [${s.source}] ${s.title}`).join("\n")
      : "Ingen tilgjengelige åpne nyhetssignaler i dag (bruk prisdata som hovedkilde).";
      
    const turningPointContext = ctx.turningPoints.length
      ? ctx.turningPoints.map((tp) => `${tp.date}: ${tp.symbol} snudde fra ${tp.prevMovePct.toFixed(2)}% til ${tp.newMovePct.toFixed(2)}% (sving ${tp.swingPct.toFixed(2)}pp)`).join("\n")
      : "Ingen tydelige vendingstidspunkter funnet.";

    const prompt = `Du er en erfaren markedskommentator for hobbyinvestorer.
Mål: levere to tydelige kommentarer:
1) oppsummering av ledende analytiker-/nyhetssignaler,
2) konkret sektoranbefaling basert på top-down sektorkategorier i datasettet.

Data:
- Periode: ${ctx.period}
- Instrumenter: ${ctx.instrumentContext}
- Ledere: ${ctx.leaders}
- Laggere: ${ctx.laggers}
- VIX (alltid risikoanker): nivå ${formatNum(ctx.vix.last)}, 1d ${formatNum(ctx.vix.oneDayChangePct)}%, 3d ${formatNum(ctx.vix.threeDayChangePct)}%, regime ${ctx.vix.regime}

Kurvesignaler:
${buildHistoryContext(ctx.summary, ctx.recentData)}

Viktige vendingstidspunkter i kurvene (må kommenteres konkret):
${turningPointContext}

Divergens- og regimesignaler (viktig å adressere):
${ctx.divergenceSignals.length ? ctx.divergenceSignals.join('\n') : "Ingen sterke divergenssignaler funnet."}

Dagens nyhets-/ekspertsignaler (åpne kilder, daglig snapshot):
${newsContext}

Arbeidsmetode:
1) Finn de 3 viktigste spørsmålene investorer bør stille nå.
2) Forkast minst ett irrelevant spørsmål kort.
3) Svar kun med evidens fra data over.
4) Hvis kurve og narrativ divergerer, marker latent stress tydelig.
5) Bruk enkelt språk uten teknisk sjargong, forklar årsak-virkning kort.
6) Ikke nevn VIX automatisk. Nevn VIX kun hvis det er tydelig relevant nå (for eksempel ved rask oppgang eller nivå rundt/over 20).
7) Kommenter minst 2 konkrete vendingstidspunkter med dato og hva som snudde.
8) Gi én tydelig anbefalt sektor nå, med kort begrunnelse og én risikofaktor.
9) Prioriter sektorrotasjon og regime fremfor enkeltinstrument-støy.

Svarformat (nøyaktig):
Analytikerkonsensus:
<3-4 setninger i folkelig språk om hva markedseksperter peker på nå, koblet mot data>

Sektoranbefaling nå:
<2-3 setninger med én sektor å prioritere nå, hvorfor, og hva som kan velte caset>
`;

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.45,
        maxOutputTokens: 320,
      },
    };

    const attempts: { apiVersion: ApiVersion; model: string }[] = [
      { apiVersion: "v1beta", model: GEMINI_MODEL_PRIMARY },
      { apiVersion: "v1", model: GEMINI_MODEL_PRIMARY },
      ...GEMINI_MODEL_FALLBACKS.flatMap((model) => [
        { apiVersion: "v1" as const, model },
        { apiVersion: "v1beta" as const, model },
      ]),
    ];

    let lastError = "";
    for (const { apiVersion, model } of attempts) {
      const url = buildGenerateContentUrl(apiVersion, model, apiKey);
      const result = await tryGenerateContent(url, requestBody);
      if (result.ok) return finalizeAnalysis(result.text, ctx);
      lastError = result.message;
      if (isQuotaOrRateError(lastError)) {
        return finalizeAnalysis("", ctx);
      }
      if (!result.notFound) break;
    }

    throw new Error(lastError || "Ukjent feil fra Gemini API");
  } catch (error: any) {
    console.error("AI Insight error:", error);
    return `Markedsanalysen er midlertidig utilgjengelig. (Feil: ${error?.message || 'Tilkoblingsfeil'})`;
  }
};
