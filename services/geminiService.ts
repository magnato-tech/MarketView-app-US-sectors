
import { GoogleGenAI } from "@google/genai";
import { SummaryStats, Period } from "../types";

export const getMarketInsights = async (summary: SummaryStats[], period: Period): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const context = summary.map(s => `${s.name} (${s.symbol}): ${s.percentChange}% endring`).join(', ');
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Du er en Senior Markedsanalytiker hos "Gemini AS". 
                 Analyser følgende markedsdata for de valgte instrumentene i perioden "${period}": ${context}.
                 
                 Krav til svaret:
                 1. Gi en kortfattet og sylskarp kommentar om utviklingen i denne perioden (hvem leder/lagger og kort om hvorfor).
                 2. Gi et konkret utsyn for hva vi kan forvente i NESTE periode basert på nåværende momentum og generelt makrobilde.
                 3. Svaret skal være på profesjonelt norsk og holdes under 100 ord totalt.`,
      config: {
        temperature: 0.7,
        maxOutputTokens: 250,
      }
    });

    return response.text || "Kunne ikke generere analyse for øyeblikket.";
  } catch (error) {
    console.error("AI Insight error:", error);
    return "Markedsanalysen er midlertidig utilgjengelig. Vennligst sjekk tilkoblingen.";
  }
};
