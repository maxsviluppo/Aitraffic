
import { GoogleGenAI } from "@google/genai";
import { SearchResult, TransportType, UserLocation } from "../types";

export const searchTransportInfo = async (
  query: string,
  type: TransportType,
  location?: UserLocation
): Promise<SearchResult> => {
  // Always create a new GoogleGenAI instance right before the call as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let contextualPrompt = `Sei l'AI Core di un sistema di navigazione automobilistico avanzato chiamato TRANSITO. Rispondi in ITALIANO.
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
   Colonne: | Mezzo | Partenza | Arrivo | Stato | Costo/Traffico | Note |
   Esempi Mezzo: 🚆 (Treno), ✈️ (Volo), 🚢 (Nave), 🚇 (Metro), 🚌 (Bus), 🚗 (Auto/Strada).
2. TRAFFICO STRADALE: Includi dati su congestione, incidenti e tempi di percorrenza stimati per tratti urbani.
3. PRECISIONE ORARIA: Orari in formato HH:mm. Evidenzia ritardi o "code a tratti".
4. STATO: [REGOLARE] (verde), [RITARDO] (rosso), [TRAFFICO ALTO] (arancione), [TRAFFICO FLUIDO] (verde smeraldo).
5. MODULO COSTI: Includi prezzi biglietti/abbonamenti. Per il traffico stradale, indica se ci sono pedaggi o ZTL attive.
6. INFO AGGIUNTIVE: Menziona scioperi, lavori stradali, chiusure di svincoli o gate aeroportuali.
7. SORGENTI: Verifica dati su Google Search tramite siti ufficiali (Trenitalia, ATM, Google Maps News, Autostrade per l'Italia, ecc.).
8. STILE: Tecnico, asciutto, dashboard-ready.`;

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
    console.error("Search failed:", error);
    throw error;
  }
};
