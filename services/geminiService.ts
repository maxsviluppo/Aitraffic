
import { GoogleGenAI } from "@google/genai";
import { SearchResult, TransportType, UserLocation } from "../types";

export const searchTransportInfo = async (
  query: string,
  type: TransportType,
  location?: UserLocation
): Promise<SearchResult> => {
  // Ensure we safely access process.env in browser environments
  const apiKey = (window as any).process?.env?.API_KEY || (import.meta as any).env?.VITE_API_KEY;
  
  if (!apiKey) {
    throw new Error("API_KEY_MISSING: Dashboard require valid authentication.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  let contextualPrompt = `Sei l'AI Core di un sistema di navigazione avanzato chiamato TRANSITO. Rispondi in ITALIANO.
Analisi richiesta: ${query}. `;

  if (type !== TransportType.ALL) {
    contextualPrompt += `Filtro hardware attivo su categoria: ${type}. `;
  }
  
  if (location) {
    contextualPrompt += `Coordinate GPS: ${location.lat}, ${location.lng}. Calcola percorsi partendo da qui o zone limitrofe. `;
  }
  
  contextualPrompt += `
REGOLE DI RISPOSTA (DASHBOARD FORMAT):
1. TABELLA TELEMETRICA: Genera una tabella Markdown rigorosa.
   | Mezzo | Partenza | Arrivo | Stato | Costo/Traffico | Note |
2. TRAFFICO STRADALE: Analizza congestione, incidenti e tempi stimati per tratti urbani.
3. STATO: [REGOLARE], [RITARDO], [TRAFFICO ALTO], [TRAFFICO FLUIDO].
4. MODULO COSTI: Includi prezzi biglietti, abbonamenti, pedaggi o ZTL.
5. SORGENTI: Cerca dati su Google Search (Trenitalia, ATM, Autostrade, ecc.).
6. STILE: Tecnico, minimale, dashboard-ready.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: contextualPrompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "FEED TELEMETRICO ASSENTE. RICONNESSIONE...";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    const sources = chunks
      .filter(chunk => chunk.web)
      .map(chunk => ({
        title: chunk.web?.title || "Sorgente esterna",
        uri: chunk.web?.uri || "#"
      }));

    return {
      query,
      text,
      sources,
      timestamp: new Date().toLocaleTimeString('it-IT'),
      type
    };
  } catch (error: any) {
    console.error("Dashboard Analytics Search failed:", error);
    throw error;
  }
};
