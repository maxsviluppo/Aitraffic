
import { GoogleGenAI } from "@google/genai";
import { SearchResult, TransportType, UserLocation, MapPoint } from "../types";

export const searchTransportInfo = async (
  query: string,
  type: TransportType,
  location?: UserLocation
): Promise<SearchResult> => {
  // Ottieni la chiave dal localStorage (inserimento manuale) o dall'ambiente (selezione automatica)
  const manualKey = localStorage.getItem('transito_custom_api_key');
  const apiKey = manualKey || process.env.API_KEY;

  if (!apiKey) {
    throw new Error("API Key mancante. Configurala nel pannello di controllo.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  let contextualPrompt = `Sei l'AI Core di un sistema di navigazione avanzato chiamato TRANSITO. Rispondi in ITALIANO.
Analisi richiesta: ${query}. `;

  if (type !== TransportType.ALL) {
    contextualPrompt += `Filtro hardware attivo su categoria: ${type}. `;
  }
  
  if (location) {
    contextualPrompt += `Coordinate GPS Utente: ${location.lat}, ${location.lng}. `;
  }
  
  contextualPrompt += `
REGOLE DI RISPOSTA (DASHBOARD FORMAT):
1. TABELLA TELEMETRICA: Genera una tabella Markdown rigorosa.
2. TRAFFICO E POSIZIONI: Identifica la posizione attuale dei mezzi (se disponibile) o i punti chiave della tratta.
3. STATO: Usa [REGOLARE], [RITARDO], [TRAFFICO ALTO], [TRAFFICO FLUIDO].
4. GEOLOCALIZZAZIONE CRITICA: Alla fine della risposta, includi SEMPRE un blocco JSON per la visualizzazione mappa se identifichi coordinate o città:
   [GEO_DATA: [{"lat": 45.4642, "lng": 9.1900, "label": "Milano Centrale - Treno 9513", "type": "TRAIN", "status": "RITARDO"}]]
5. SORGENTI: Cerca dati su Google Search.
6. STILE: Tecnico, minimale.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: contextualPrompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const fullText = response.text || "FEED TELEMETRICO ASSENTE.";
    
    let points: MapPoint[] = [];
    const geoMatch = fullText.match(/\[GEO_DATA:\s*(\[.*?\])\s*\]/s);
    if (geoMatch && geoMatch[1]) {
      try {
        points = JSON.parse(geoMatch[1]);
      } catch (e) {
        console.warn("Failed to parse GEO_DATA JSON", e);
      }
    }

    const cleanText = fullText.replace(/\[GEO_DATA:.*?\]/gs, "").trim();
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .filter(chunk => chunk.web)
      .map(chunk => ({
        title: chunk.web?.title || "Sorgente esterna",
        uri: chunk.web?.uri || "#"
      }));

    return {
      query,
      text: cleanText,
      sources,
      timestamp: new Date().toLocaleTimeString('it-IT'),
      type,
      points
    };
  } catch (error: any) {
    console.error("Dashboard Analytics Search failed:", error);
    throw error;
  }
};
