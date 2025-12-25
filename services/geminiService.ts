
import { GoogleGenAI } from "@google/genai";
import { SearchResult, TransportType, UserLocation, MapPoint } from "../types";

export const searchTransportInfo = async (
  query: string,
  type: TransportType,
  location?: UserLocation
): Promise<SearchResult> => {
  // Priorità alla chiave inserita manualmente dall'utente
  const manualKey = localStorage.getItem('transito_custom_api_key');
  const apiKey = manualKey || process.env.API_KEY;

  if (!apiKey) {
    throw new Error("CONFIGURAZIONE RICHIESTA: Inserisci la tua Gemini API Key nel menu laterale per attivare il sistema.");
  }

  // Utilizziamo gemini-3-flash-preview: il modello più veloce e con i limiti gratuiti più ampi
  const ai = new GoogleGenAI({ apiKey });
  
  let contextualPrompt = `Sei l'AI Core di TRANSITO, un hub di monitoraggio trasporti. Rispondi in ITALIANO.
Richiesta Utente: ${query}. `;

  if (type !== TransportType.ALL) {
    contextualPrompt += `Focus hardware su: ${type}. `;
  }
  
  if (location) {
    contextualPrompt += `Coordinate GPS: ${location.lat}, ${location.lng}. `;
  }
  
  contextualPrompt += `
REGOLE DI RISPOSTA:
1. TABELLA: Estrai orari, prezzi e mezzi in una tabella Markdown pulita.
2. STATO: Usa tag [REGOLARE], [RITARDO], [TRAFFICO ALTO] per ogni voce.
3. GEO_DATA: Fondamentale! Se identifichi città o stazioni, aggiungi a fine testo:
   [GEO_DATA: [{"lat": 45.0, "lng": 9.0, "label": "Nome Luogo", "type": "TRAIN", "status": "REGOLARE"}]]
4. FONTI: Utilizza Google Search per dati in tempo reale su scioperi o ritardi odierni.
5. TONO: Formale, sintetico, tecnologico.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contextualPrompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const fullText = response.text || "Nessuna telemetria ricevuta.";
    
    let points: MapPoint[] = [];
    const geoMatch = fullText.match(/\[GEO_DATA:\s*(\[.*?\])\s*\]/s);
    if (geoMatch && geoMatch[1]) {
      try {
        points = JSON.parse(geoMatch[1]);
      } catch (e) {
        console.warn("Mappa: Errore parsing coordinate.");
      }
    }

    const cleanText = fullText.replace(/\[GEO_DATA:.*?\]/gs, "").trim();
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .filter(chunk => chunk.web)
      .map(chunk => ({
        title: chunk.web?.title || "Dettagli Web",
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
    // Gestione specifica per superamento limiti
    if (error.message?.includes("429")) {
      throw new Error("LIMITE RAGGIUNTO: La quota gratuita del modello è esaurita. Attendi circa 60 secondi prima della prossima scansione.");
    }
    if (error.message?.includes("API_KEY_INVALID")) {
      throw new Error("CHIAVE NON VALIDA: Controlla che l'API Key inserita sia corretta.");
    }
    throw error;
  }
};
