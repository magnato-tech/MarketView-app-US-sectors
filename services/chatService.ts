import { SummaryStats, Period, MarketDataPoint } from "../types";
import { RangeSummaryRow } from "./analysisService";

/**
 * AI Chat Service for MarketView
 * Håndterer spørsmål mot analyselaget og returnerer strukturerte svar.
 */

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatResponse {
  answer: string;
  suggestedActions?: {
    type: 'select_tickers' | 'set_period' | 'set_tab';
    payload: any;
  }[];
}

const GEMINI_MODEL = "gemini-3.1-flash";
const FALLBACK_MODELS = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-pro"];

export const getChatResponse = async (
  userMessage: string,
  history: ChatMessage[],
  context: {
    summary: SummaryStats[];
    rangeSummary: RangeSummaryRow[];
    period: Period;
    currentTickers: string[];
    chartData?: MarketDataPoint[];
  }
): Promise<ChatResponse> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 
                 import.meta.env.GEMINI_API_KEY ||
                 (typeof process !== 'undefined' && process.env.GEMINI_API_KEY) || 
                 (typeof process !== 'undefined' && process.env.API_KEY);

  if (!apiKey) {
    return { answer: "AI-chat er deaktivert (mangler API-nøkkel)." };
  }

  // Finn signifikante volum-topper eller divergenser i chartData
  let divergenceContext = "";
  if (context.chartData && context.chartData.length > 0) {
    const data = context.chartData;
    const lastIdx = data.length - 1;
    
    // Sjekk de siste punktene for volum-topper uten prisstigning
    context.currentTickers.forEach(sym => {
      if (sym.startsWith('^')) return; // Hopp over indekser som VIX
      
      const volKey = `${sym}_dollar_volume`;
      const flowKey = `${sym}_FLOW`;
      
      // Finn max volum i perioden for å ha en referanse
      const volumes = data.map(d => typeof d[volKey] === 'number' ? d[volKey] as number : 0);
      const maxVol = Math.max(...volumes);
      const avgVol = volumes.reduce((a, b) => a + b, 0) / volumes.length;

      // Se etter dager med volum > 2x snitt, men prisendring < 0.5%
      data.forEach((point, i) => {
        const v = point[volKey] as number;
        const p = point[sym] as number;
        const prevP = i > 0 ? data[i-1][sym] as number : p;
        const priceChange = Math.abs(p - prevP);
        
        if (v > avgVol * 2 && priceChange < 0.5) {
          divergenceContext += `- Divergens observert for ${sym} den ${point.timestamp}: Ekstremt høyt volum ($${(v/1e6).toFixed(1)}M), men nesten ingen prisbevegelse (${priceChange.toFixed(2)}%). Dette kan tyde på akkumulering eller distribusjon.\n`;
        }
      });
    });
  }

  // Bygg kontekst for AI
  const marketContext = `
Nåværende periode: ${context.period}
Valgte instrumenter: ${context.currentTickers.join(', ')}

Markedsdata (Ranking og Performance):
${context.rangeSummary.map(s => {
  const m = s.metrics;
  return `- ${s.name} (${s.symbol}): Rank ${m?.rank || 'N/A'}, Endring ${s.changePct.toFixed(2)}%, Volatilitet ${m?.volatility.toFixed(1) || 'N/A'}%, Trend: ${m?.trendStatus || 'N/A'}`;
}).join('\n')}

${divergenceContext ? `Spesielle observasjoner (Volum/Pris-analyse):\n${divergenceContext}` : ''}
`;

  const prompt = `
Du er en profesjonell Wall Street analytiker-assistent i appen MarketView.
Brukeren stiller deg spørsmål om markedsdataene som er synlige i dashboardet, inkludert prisbevegelser og kapitalstrøm (volum).

Kontekst fra dashboardet:
${marketContext}

Instruksjoner:
1. Svar kort, konsist og analytisk på norsk.
2. Bruk kun dataene som er oppgitt over.
3. Vær spesielt oppmerksom på 'Divergens' – hvis volumet (kapitalstrømmen) er høyt mens prisen står stille, forklar at dette ofte betyr institusjonell akkumulering (kjøp) eller distribusjon (salg).
4. Hvis brukeren spør om topper i starten av mars eller andre perioder, referer til de spesifikke observasjonene i konteksten.
5. Forklar at volum uten prisbevegelse betyr at det er en intens kamp mellom kjøpere og selgere på det nivået.

Svar i JSON-format:
{
  "answer": "Ditt tekstsvar her",
  "suggestedActions": [] 
}
`;

  const modelsToTry = [GEMINI_MODEL, ...FALLBACK_MODELS];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              { role: "user", parts: [{ text: prompt }] },
              ...history.map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }]
              })),
              { role: "user", parts: [{ text: userMessage }] }
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 500,
            }
          }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Tomt svar fra AI");

      // Forsøk å parse JSON, men håndter også råtekst hvis modellen ikke følger formatet
      try {
        const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(cleanText) as ChatResponse;
      } catch (e) {
        return { answer: text };
      }
    } catch (error: any) {
      console.warn(`Model ${model} failed:`, error.message);
      lastError = error;
      // Hvis det er en 404 (modellen finnes ikke), prøv neste modell
      if (error.message.includes("404") || error.message.includes("not found")) {
        continue;
      }
      // For andre feil (f.eks. API-nøkkel), stopp og kast feilen
      break;
    }
  }

  throw lastError || new Error("Kunne ikke koble til analysesenteret.");
};
