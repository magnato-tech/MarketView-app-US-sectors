import { SummaryStats, Period, MarketDataPoint, DerivedMetrics } from "../types";

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
    rangeSummary: DerivedMetrics[];
    period: Period;
    currentTickers: string[];
  }
): Promise<ChatResponse> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 
                 import.meta.env.GEMINI_API_KEY ||
                 (typeof process !== 'undefined' && process.env.GEMINI_API_KEY) || 
                 (typeof process !== 'undefined' && process.env.API_KEY);

  if (!apiKey) {
    return { answer: "AI-chat er deaktivert (mangler API-nøkkel)." };
  }

  // Bygg kontekst for AI
  const marketContext = `
Nåværende periode: ${context.period}
Valgte instrumenter: ${context.currentTickers.join(', ')}

Markedsdata (Ranking og Performance):
${context.rangeSummary.map(s => 
  `- ${s.name} (${s.symbol}): Rank ${s.rank}, Endring ${s.changePct.toFixed(2)}%, Volatilitet ${s.volatility.toFixed(1)}%, Trend: ${s.trendStatus}`
).join('\n')}
`;

  const prompt = `
Du er en profesjonell Wall Street analytiker-assistent i appen MarketView.
Brukeren stiller deg spørsmål om markedsdataene som er synlige i dashboardet.

Kontekst fra dashboardet:
${marketContext}

Instruksjoner:
1. Svar kort, konsist og analytisk på norsk.
2. Bruk kun dataene som er oppgitt over.
3. Hvis brukeren spør om vinnere/tapere, referer til 'Rank' og 'Endring'.
4. Hvis brukeren spør om risiko, referer til 'Volatilitet' og 'Trend'.
5. Du kan foreslå handlinger hvis det er relevant (f.eks. se på en spesifikk sektor).

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
