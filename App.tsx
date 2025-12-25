
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Search, 
  MapPin, 
  Navigation, 
  Train, 
  TrainFront, 
  Plane, 
  Ship, 
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  Menu,
  X,
  History,
  AlertTriangle,
  Zap,
  BookmarkPlus,
  RotateCcw,
  LayoutDashboard,
  ChevronRight,
  Car,
  Locate,
  Activity,
  Mic,
  MicOff,
  Home
} from 'lucide-react';
import { TransportType, SearchResult, UserLocation, SavedSearch, MapPoint } from './types';
import { searchTransportInfo } from './services/geminiService';
import { Visualizer } from './components/Visualizer';
import { TransportMap } from './components/TransportMap';

const tutorSteps = [
  {
    title: "Sistema Transito",
    desc: "Inizializzazione motore telemetrico. Monitoraggio flussi globali."
  },
  {
    title: "Mappa Geospaziale",
    desc: "Visualizza voli, treni e navi sulla dashboard tattica."
  }
];

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState<TransportType>(TransportType.ALL);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [useGps, setUseGps] = useState(false);
  const [location, setLocation] = useState<UserLocation | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showTutor, setShowTutor] = useState(() => !localStorage.getItem('transito_setup_v35_done'));
  const [tutorStep, setTutorStep] = useState(0);
  const [isListening, setIsListening] = useState(false);
  
  const recognitionRef = useRef<any>(null);

  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(() => {
    const saved = localStorage.getItem('transito_saved_searches');
    return saved ? JSON.parse(saved) : [];
  });

  const allPoints = useMemo(() => {
    return results.reduce((acc, res) => [...acc, ...res.points], [] as MapPoint[]);
  }, [results]);

  // Voice Command Logic
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'it-IT';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        setIsListening(false);
        handleSearch(undefined, transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        setIsListening(false);
        setError("Errore microfono: " + event.error);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setError(null);
      setIsListening(true);
      recognitionRef.current?.start();
    }
  };

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("GPS non supportato dal dispositivo.");
      return;
    }
    
    setError("Ricerca segnale GPS in corso...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setUseGps(true);
        setError(null);
      },
      (err) => {
        let msg = "Errore connessione GPS";
        if (err.code === 1) msg = "Accesso GPS negato. Controlla i permessi.";
        else if (err.code === 2) msg = "Posizione non rilevata.";
        else if (err.code === 3) msg = "Timeout GPS.";
        
        setError(msg);
        setUseGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  const handleGpsToggle = () => {
    if (!useGps) requestLocation();
    else {
      setUseGps(false);
      setLocation(undefined);
    }
  };

  useEffect(() => {
    localStorage.setItem('transito_saved_searches', JSON.stringify(savedSearches));
  }, [savedSearches]);

  const resetSearch = () => {
    setQuery('');
    setResults([]);
    setError(null);
  };

  const handleSearch = async (e?: React.FormEvent, customQuery?: string, customType?: TransportType) => {
    if (e) e.preventDefault();
    const activeQuery = customQuery || query;
    const activeType = customType || selectedType;
    
    if (!activeQuery && !useGps) return;

    setIsSearching(true);
    setError(null);
    setShowTutor(false);
    setIsMenuOpen(false); 

    try {
      const searchQuery = activeQuery || (useGps ? "Analizza trasporti vicino a me" : "");
      const result = await searchTransportInfo(searchQuery, activeType, location);
      setResults(prev => [result, ...prev].slice(0, 3));
    } catch (err: any) {
      setError("Errore durante l'analisi dei dati.");
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSaveSearch = (q: string, type: TransportType) => {
    if (!q.trim()) return;
    const exists = savedSearches.find(s => s.query === q && s.type === type);
    if (exists) setSavedSearches(prev => prev.filter(s => s.id !== exists.id));
    else {
      setSavedSearches(prev => [{
        id: Math.random().toString(36).substr(2, 9),
        query: q, type, lastKnownDelay: false, timestamp: Date.now()
      }, ...prev]);
    }
  };

  const getTransportIcon = (type: TransportType) => {
    switch (type) {
      case TransportType.TRAIN: return <Train className="w-4 h-4 text-orange-400" />;
      case TransportType.METRO: return <TrainFront className="w-4 h-4 text-cyan-400" />;
      case TransportType.PLANE: return <Plane className="w-4 h-4 text-indigo-400" />;
      case TransportType.SHIP: return <Ship className="w-4 h-4 text-blue-400" />;
      case TransportType.ROAD: return <Car className="w-4 h-4 text-emerald-400" />;
      default: return <Navigation className="w-4 h-4 text-slate-400" />;
    }
  };

  const isCurrentSearchSaved = savedSearches.some(s => s.query === query && s.type === selectedType);

  return (
    <div className="min-h-screen flex flex-col bg-[#020617] text-slate-200 selection:bg-indigo-500/30 font-['Plus_Jakarta_Sans'] overflow-x-hidden">
      <Visualizer />

      <header className="fixed top-0 inset-x-0 z-[9999] px-4 md:px-8 py-2 md:py-3 flex justify-between items-center glass border-b border-white/5 backdrop-blur-3xl shadow-xl">
        <div className="flex items-center gap-2">
          <button onClick={resetSearch} className="bg-indigo-600 p-1.5 rounded-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-colors">
            <Home className="w-4 h-4 text-white" />
          </button>
          <span className="font-black text-[10px] md:text-xs tracking-tighter uppercase italic text-white hidden xs:inline">TRANSITO <span className="text-indigo-500">v3.7</span></span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={resetSearch} className="flex items-center gap-1.5 px-3 py-1.5 glass text-slate-400 text-[8px] font-black uppercase rounded-lg border border-white/10 hover:text-white transition-all">
            <RotateCcw className="w-3 h-3" /> <span className="hidden sm:inline">Reset Home</span>
          </button>
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${isMenuOpen ? 'bg-indigo-600 border-indigo-500 text-white' : 'glass border-white/10 text-slate-400'}`}>
            {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            <span className="text-[9px] font-black uppercase hidden sm:inline">Centro Controllo</span>
          </button>
        </div>
      </header>

      <div className={`fixed inset-0 z-[10000] transition-all duration-300 ${isMenuOpen ? 'visible opacity-100' : 'invisible opacity-0'}`}>
        <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setIsMenuOpen(false)} />
        <aside className={`absolute top-0 right-0 bottom-0 w-72 md:w-80 glass border-l border-white/10 p-6 pt-20 shadow-2xl transform transition-transform duration-300 flex flex-col ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex-1 overflow-y-auto space-y-8 scrollbar-hide">
            <div>
              <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Locate className="w-3 h-3" /> GPS SISTEMA</p>
              <button onClick={handleGpsToggle} className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${useGps ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-white/5 border-white/10 text-slate-500'}`}>
                <div className="flex items-center gap-3">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-black uppercase">{useGps ? 'Tracking ON' : 'GPS Offline'}</span>
                </div>
                <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${useGps ? 'bg-emerald-500' : 'bg-slate-800'}`}>
                  <div className={`w-3 h-3 bg-white rounded-full transition-all ${useGps ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </button>
            </div>
            <div>
              <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-3 flex items-center gap-2"><LayoutDashboard className="w-3 h-3" /> FILTRI MEZZI</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: TransportType.ALL, label: 'TUTTI', icon: <Navigation className="w-3 h-3" /> },
                  { id: TransportType.TRAIN, label: 'TRENI', icon: <Train className="w-3 h-3" /> },
                  { id: TransportType.ROAD, label: 'AUTO', icon: <Car className="w-3 h-3" /> },
                  { id: TransportType.METRO, label: 'URBAN', icon: <TrainFront className="w-3 h-3" /> },
                  { id: TransportType.PLANE, label: 'VOLI', icon: <Plane className="w-3 h-3" /> },
                  { id: TransportType.SHIP, label: 'NAVI', icon: <Ship className="w-3 h-3" /> },
                ].map(item => (
                  <button key={item.id} onClick={() => { setSelectedType(item.id as TransportType); setIsMenuOpen(false); }} className={`flex items-center gap-2 p-3 rounded-xl border text-[8px] font-black uppercase transition-all ${selectedType === item.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/5 text-slate-500'}`}>
                    {item.icon} {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <main className="flex-1 flex flex-col pt-16 md:pt-20">
        <div className="flex-1 overflow-y-auto px-4 md:px-12 py-6 scrollbar-hide">
          <div className="max-w-5xl mx-auto">
            <div className="mb-8 md:mb-12 text-center">
              <h1 className="text-4xl md:text-8xl font-black tracking-tighter uppercase italic leading-none text-white drop-shadow-lg">AI <span className="text-indigo-500">TRANSITO</span></h1>
              <p className="text-[8px] md:text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mt-2 shimmer px-4 py-1 inline-block rounded-full">Geospatial Command Center</p>
            </div>

            <div className="bg-slate-900/60 p-2 md:p-3 rounded-2xl md:rounded-[2.5rem] border border-white/10 shadow-2xl mb-8 md:mb-12 transition-all backdrop-blur-3xl group">
              <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2">
                <div className="flex-1 relative flex items-center">
                  <div className="absolute left-4 md:left-6 w-8 h-8 bg-indigo-600/10 rounded-lg flex items-center justify-center text-indigo-400 group-focus-within:bg-indigo-600 group-focus-within:text-white transition-all">
                    <Search className="w-3.5 h-3.5 md:w-4 h-4" />
                  </div>
                  <input 
                    type="text" 
                    value={query} 
                    onChange={(e) => setQuery(e.target.value)} 
                    placeholder="DESTINAZIONE O CODICE MEZZO..." 
                    className="w-full bg-transparent border-none py-4 md:py-6 pl-14 md:pl-16 pr-14 text-sm md:text-xl font-bold focus:ring-0 placeholder:text-slate-700 uppercase tracking-tight text-white" 
                  />
                  <button 
                    type="button" 
                    onClick={toggleListening} 
                    className={`absolute right-4 p-2 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-600 hover:text-indigo-400'}`}
                  >
                    {isListening ? <Mic className="w-4 h-4 md:w-5 h-5" /> : <MicOff className="w-4 h-4 md:w-5 h-5" />}
                  </button>
                </div>
                <div className="flex gap-2 p-1">
                  <button type="button" onClick={() => toggleSaveSearch(query, selectedType)} disabled={!query.trim()} className={`p-4 md:p-6 rounded-xl md:rounded-3xl flex items-center justify-center border transition-all ${isCurrentSearchSaved ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400' : 'glass border-white/10 text-slate-600'}`}>
                    <BookmarkPlus className="w-5 h-5 md:w-6 h-6" />
                  </button>
                  <button type="submit" disabled={isSearching} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-6 md:px-12 py-4 md:py-6 rounded-xl md:rounded-3xl flex items-center justify-center gap-2 md:gap-3 transition-all active:scale-95 disabled:opacity-50 uppercase text-[10px] md:text-xs tracking-widest flex-1">
                    {isSearching ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><span>Analizza</span><ArrowRight className="w-4 h-4" /></>}
                  </button>
                </div>
              </form>
            </div>

            {error && (
              <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400 text-[10px] font-black uppercase tracking-widest">
                <ShieldAlert className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            {isListening && (
              <div className="mb-8 p-6 glass border border-indigo-500/30 rounded-2xl flex items-center justify-center gap-4 animate-in fade-in zoom-in duration-300">
                <div className="flex gap-1 items-center">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className={`w-1 bg-indigo-500 rounded-full animate-bounce`} style={{ height: `${Math.random()*20 + 5}px`, animationDelay: `${i*0.1}s` }} />
                  ))}
                </div>
                <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Sistema in ascolto...</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10 mb-20">
              <div className="lg:col-span-8 space-y-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-indigo-500" /><span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Mappa Geospatiale</span></div>
                </div>
                <div className="relative overflow-hidden rounded-2xl md:rounded-[3rem] border border-white/10 shadow-2xl bg-slate-900/40">
                   <TransportMap points={allPoints} userLocation={location} isSearching={isSearching} />
                </div>
              </div>

              <div className="lg:col-span-4 space-y-4">
                <div className="flex items-center gap-2 px-2"><History className="w-4 h-4 text-indigo-500" /><span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Feed Storico</span></div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 scrollbar-hide">
                  {results.length === 0 && !isSearching && (
                    <div className="text-center py-16 glass border border-dashed border-white/10 rounded-2xl opacity-30">
                      <p className="text-[8px] font-black uppercase tracking-widest">In attesa di segnali</p>
                    </div>
                  )}
                  {results.map((result, idx) => {
                    const alert = result.text.includes("[RITARDO]") || result.text.includes("[TRAFFICO ALTO]");
                    return (
                      <div key={idx} className={`glass overflow-hidden rounded-2xl border transition-all ${alert ? 'border-orange-500/30' : 'border-white/5'}`}>
                        <div className="p-4 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-lg ${alert ? 'bg-orange-500/20' : 'bg-indigo-600/20'}`}>{getTransportIcon(result.type)}</div>
                            <span className="text-[8px] font-black uppercase text-slate-500 italic">{result.timestamp}</span>
                          </div>
                          {result.sources[0] && <a href={result.sources[0].uri} target="_blank" rel="noreferrer" className="p-2 glass rounded-lg border border-white/10 text-slate-500 hover:text-white transition-all"><ExternalLink className="w-3 h-3" /></a>}
                        </div>
                        <div className="p-4"><h3 className="text-[10px] md:text-xs font-black uppercase tracking-tight text-white leading-tight">{result.query}</h3></div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-12 space-y-6 mt-4">
                {results.map((result, idx) => {
                  const alert = result.text.includes("[RITARDO]") || result.text.includes("[TRAFFICO ALTO]");
                  return (
                    <div key={'f-'+idx} className={`glass overflow-hidden rounded-2xl md:rounded-[3rem] border transition-all animate-in slide-in-from-bottom-12 duration-500 ${alert ? 'border-orange-500/30 shadow-orange-500/5' : 'border-white/10 shadow-2xl'}`}>
                      <div className="px-6 md:px-10 py-6 md:py-8 bg-white/[0.02] border-b border-white/5 flex flex-wrap items-center justify-between gap-6">
                        <div className="flex items-center gap-4 md:gap-6">
                          <div className={`p-4 rounded-xl md:rounded-2xl ${alert ? 'bg-orange-500/10 shadow-lg shadow-orange-500/10' : 'bg-indigo-600/10 shadow-lg shadow-indigo-600/10'}`}>{getTransportIcon(result.type)}</div>
                          <div>
                            <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">{result.type} SENSOR FEED</p>
                            <h3 className="text-xl md:text-3xl font-black uppercase tracking-tighter text-white">{result.query}</h3>
                          </div>
                        </div>
                      </div>
                      <div className="p-6 md:p-12">
                        <div className="telemetry-feed relative prose prose-invert max-w-none">
                           <div className="text-slate-400 text-xs md:text-base leading-relaxed font-medium uppercase tracking-tight" dangerouslySetInnerHTML={{ __html: formatMarkdown(result.text) }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {showTutor && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl animate-in fade-in">
          <div className="glass max-w-xs w-full p-8 md:p-12 rounded-3xl md:rounded-[4rem] border border-white/10 text-center relative overflow-hidden">
            <div className="bg-indigo-600 w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-2xl shadow-indigo-600/50">
              <Zap className="w-8 h-8 md:w-10 md:h-10 text-white" />
            </div>
            <h3 className="text-2xl md:text-4xl font-black mb-4 uppercase tracking-tighter italic leading-none text-white">{tutorSteps[tutorStep].title}</h3>
            <p className="text-slate-500 text-[10px] md:text-xs font-black leading-relaxed mb-8 md:mb-12 px-2 uppercase tracking-widest">{tutorSteps[tutorStep].desc}</p>
            <button onClick={() => { if (tutorStep < tutorSteps.length - 1) setTutorStep(tutorStep + 1); else { setShowTutor(false); localStorage.setItem('transito_setup_v35_done', 'true'); }}} className="w-full bg-white text-black font-black py-4 md:py-6 rounded-xl md:rounded-[2rem] flex items-center justify-center gap-3 text-[10px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-xl active:scale-95">
              <span>{tutorStep === tutorSteps.length - 1 ? "AVVIA SISTEMA" : "AVANTI"}</span><ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function formatMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-black">$1</strong>')
    .replace(/^### (.*$)/gim, '<h3 class="text-indigo-500 text-[9px] md:text-[10px] font-black mt-8 mb-4 uppercase tracking-[0.4em] border-l-2 border-indigo-600 pl-4">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-white text-base md:text-xl font-black mt-10 mb-6 uppercase tracking-tighter italic">$1</h2>')
    .replace(/\[REGOLARE\]/g, '<span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/20 text-[8px] font-black uppercase">REGOLARE</span>')
    .replace(/\[RITARDO\]/g, '<span class="px-2 py-0.5 bg-red-500/10 text-red-500 rounded border border-red-500/20 text-[8px] font-black uppercase animate-pulse">RITARDO</span>')
    .replace(/\[TRAFFICO ALTO\]/g, '<span class="px-2 py-0.5 bg-orange-500/10 text-orange-500 rounded border border-orange-500/20 text-[8px] font-black uppercase">ALTO TRAFFICO</span>')
    .replace(/(\d+[,.]\d{2}\s*€|€\s*\d+[,.]\d{2}|\d+\s*€)/g, '<span class="text-emerald-400 font-black">$1</span>')
    .split('\n').map(line => line.trim() ? `<p class="my-4 text-slate-500 font-bold text-[10px] md:text-sm uppercase tracking-tight">${line}</p>` : '').join('');
}

export default App;
