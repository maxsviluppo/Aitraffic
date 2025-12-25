
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
    throw new Error("API KEY MANCANTE: Inseriscila nel menu laterale (icona Menu -> Inserisci Chiave).");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  let contextualPrompt = `Sei l'AI di TRANSITO. Rispondi in ITALIANO.
Cerca info su: ${query}. `;

  if (type !== TransportType.ALL) contextualPrompt += `Tipo di mezzo richiesto: ${type}. `;
  if (location) contextualPrompt += `Posizione utente: ${location.lat}, ${location.lng}. `;
  
  contextualPrompt += `
REGOLE DI OUTPUT (FOCUS DETTAGLI TECNICI):
1. SCHEDA TECNICA: Per ogni opzione di viaggio, specifica OBBLIGATORIAMENTE:
   - Identificativo Mezzo (es. Treno Frecciarossa 9504, Bus Linea 73, Volo AZ204).
   - Orari precisi di Partenza e Arrivo.
   - Durata del singolo tratto (es. "45 min").
   - Costo stimato in Euro (€).
2. TABELLA MOBILE: Usa tabelle Markdown semplici (max 3-4 colonne) per orari e costi.
3. TRAFFICO URBANO: Fornisci una sezione "VIABILITÀ" con indicatori: [FLUIDO], [RALLENTAMENTI], [INTENSO].
4. STATUS TAGS: Usa [REGOLARE], [RITARDO], [TRAFFICO ALTO], [CANCELLATO].
5. GEO_DATA: Aggiungi a fine testo per la mappa: [GEO_DATA: [{"lat": 45.46, "lng": 9.19, "label": "Stazione Centrale - Treno 9504", "type": "TRAIN", "status": "REGOLARE"}]]
6. FONTI: Usa Google Search per info tempo reale su scioperi o ritardi odierni.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-lite-latest",
      contents: contextualPrompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const fullText = response.text || "Nessun dato ricevuto dal sistema.";
    
    let points: MapPoint[] = [];
    const geoMatch = fullText.match(/\[GEO_DATA:\s*(\[.*?\])\s*\]/s);
    if (geoMatch && geoMatch[1]) {
      try {
        points = JSON.parse(geoMatch[1]);
      } catch (e) {
        console.warn("Errore telemetria mappa: coordinate non valide.");
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
    if (error.message?.includes("429")) {
      throw new Error("LIMITE TEMPORANEO: Quota Google esaurita. Attendi 60 secondi prima di una nuova scansione.");
    }
    throw error;
  }
};
