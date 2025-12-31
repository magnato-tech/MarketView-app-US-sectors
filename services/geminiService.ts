
import { GoogleGenAI } from "@google/genai";
import { SummaryStats } from "../types";

export const getMarketInsights = async (summary: SummaryStats[]): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const context = summary.map(s => `${s.name} (${s.symbol}): ${s.percentChange}% change`).join(', ');
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Act as a senior financial analyst. Based on the following recent market performance of US indices and sectors: ${context}. 
                 Provide a concise, professional 3-sentence summary of which areas are leading, which are lagging, and a brief hypothetical macro reason why (e.g. interest rates, earnings, or rotation).`,
      config: {
        temperature: 0.7,
        maxOutputTokens: 150,
      }
    });

    return response.text || "Unable to generate insights at this time.";
  } catch (error) {
    console.error("AI Insight error:", error);
    return "AI Insights currently unavailable. Please check your connection.";
  }
};
