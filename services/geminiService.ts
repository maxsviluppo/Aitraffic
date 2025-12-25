
import { GoogleGenAI } from "@google/genai";
import { SearchResult, TransportType, UserLocation, MapPoint } from "../types";

export const searchTransportInfo = async (
  query: string,
  type: TransportType,
  location?: UserLocation
): Promise<SearchResult> => {
  const manualKey = localStorage.getItem('transito_custom_api_key');
  const apiKey = manualKey || process.env.API_KEY;

  if (!apiKey) {
    throw new Error("API KEY ASSENTE: Inseriscila nel menu laterale.");
  }

  // Utilizziamo gemini-3-flash-preview per una quota gratuita più generosa e risposte rapide
  const ai = new GoogleGenAI({ apiKey });
  
  let contextualPrompt = `Sei l'AI Core di TRANSITO. Rispondi in ITALIANO.
Analisi richiesta: ${query}. `;

  if (type !== TransportType.ALL) {
    contextualPrompt += `Filtro attivo su: ${type}. `;
  }
  
  if (location) {
    contextualPrompt += `Posizione attuale GPS: ${location.lat}, ${location.lng}. `;
  }
  
  contextualPrompt += `
ISTRUZIONI OUTPUT:
1. TABELLA: Mostra orari e mezzi in una tabella Markdown.
2. STATO: Usa rigorosamente [REGOLARE], [RITARDO], [TRAFFICO ALTO].
3. GEO_DATA: Includi SEMPRE alla fine questo formato se trovi luoghi:
   [GEO_DATA: [{"lat": 41.9, "lng": 12.5, "label": "Nome Posto", "type": "TRAIN", "status": "REGOLARE"}]]
4. SORGENTI: Cerca info aggiornate su web.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contextualPrompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const fullText = response.text || "Nessun dato ricevuto.";
    
    let points: MapPoint[] = [];
    const geoMatch = fullText.match(/\[GEO_DATA:\s*(\[.*?\])\s*\]/s);
    if (geoMatch && geoMatch[1]) {
      try {
        points = JSON.parse(geoMatch[1]);
      } catch (e) {
        console.warn("Geo Data parse error");
      }
    }

    const cleanText = fullText.replace(/\[GEO_DATA:.*?\]/gs, "").trim();
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .filter(chunk => chunk.web)
      .map(chunk => ({
        title: chunk.web?.title || "Web Source",
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
    if (error.message?.includes("429")) {
      throw new Error("QUOTA ESAURITA: Hai superato il limite di richieste. Attendi 60 secondi o usa una chiave con fatturazione attiva.");
    }
    throw error;
  }
};
