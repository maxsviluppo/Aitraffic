
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
  Home,
  CreditCard,
  Key
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
  const [showTutor, setShowTutor] = useState(() => !localStorage.getItem('transito_setup_v36_done'));
  const [tutorStep, setTutorStep] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);
  
  const recognitionRef = useRef<any>(null);

  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(() => {
    const saved = localStorage.getItem('transito_saved_searches');
    return saved ? JSON.parse(saved) : [];
  });

  const allPoints = useMemo(() => {
    return results.reduce((acc, res) => [...acc, ...res.points], [] as MapPoint[]);
  }, [results]);

  // API Key Check
  useEffect(() => {
    const checkKey = async () => {
      if ((window as any).aistudio?.hasSelectedApiKey) {
        const selected = await (window as any).aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      }
    };
    checkKey();
  }, []);

  const handleOpenKey = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

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
        recognitionRef.current.stop();
        handleSearch(undefined, transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        setIsListening(false);
        setError("Errore microfono: " + event.error);
      };
    }
    return () => recognitionRef.current?.stop();
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
      setError("GPS non supportato.");
      return;
    }
    setError("Aggancio satelliti...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setUseGps(true);
        setError(null);
      },
      (err) => {
        setError("GPS non disponibile.");
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

  const resetSearch = () => {
    setQuery('');
    setResults([]);
    setError(null);
    setIsMenuOpen(false);
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
      const result = await searchTransportInfo(activeQuery || "Analizza area attuale", activeType, location);
      setResults(prev => [result, ...prev].slice(0, 3));
    } catch (err: any) {
      setError("Sistema occupato. Riprova.");
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

  return (
    <div className="min-h-screen flex flex-col bg-[#020617] text-slate-200 selection:bg-indigo-500/30 font-['Plus_Jakarta_Sans'] overflow-x-hidden">
      <Visualizer />

      <header className="fixed top-0 inset-x-0 z-[9999] px-3 md:px-8 py-2 flex justify-between items-center glass border-b border-white/5 backdrop-blur-3xl shadow-xl">
        <div className="flex items-center gap-2">
          <button onClick={resetSearch} className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-600/20 active:scale-90 transition-all">
            <Home className="w-3.5 h-3.5 text-white" />
          </button>
          <span className="font-black text-[9px] md:text-xs tracking-tighter uppercase italic text-white hidden xs:inline">TRANSITO <span className="text-indigo-500">v3.8</span></span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={resetSearch} className="flex items-center gap-1.5 px-3 py-1.5 glass text-slate-400 text-[8px] font-black uppercase rounded-lg border border-white/5 hover:text-white transition-all active:scale-95">
            <RotateCcw className="w-2.5 h-2.5" /> <span className="hidden sm:inline">Reset</span>
          </button>
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all active:scale-95 ${isMenuOpen ? 'bg-indigo-600 border-indigo-500 text-white' : 'glass border-white/10 text-slate-400'}`}>
            {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Control Center Side Menu */}
      <div className={`fixed inset-0 z-[10000] transition-all duration-300 ${isMenuOpen ? 'visible opacity-100' : 'invisible opacity-0'}`}>
        <div className="absolute inset-0 bg-black/85 backdrop-blur-xl" onClick={() => setIsMenuOpen(false)} />
        <aside className={`absolute top-0 right-0 bottom-0 w-72 md:w-80 glass border-l border-white/10 p-5 pt-20 shadow-2xl transform transition-transform duration-300 flex flex-col ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex-1 overflow-y-auto space-y-6 scrollbar-hide">
            
            {/* API KEY SECTION */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Key className="w-3 h-3" /> CONFIGURAZIONE AI</p>
              <button 
                onClick={handleOpenKey}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${hasApiKey ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-orange-500/10 border-orange-500/30 text-orange-500'}`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4" />
                  <span className="text-[9px] font-black uppercase">{hasApiKey ? 'Pro Key Attiva' : 'Configura Key'}</span>
                </div>
                <ChevronRight className="w-3 h-3" />
              </button>
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="block mt-2 text-[7px] text-slate-500 uppercase font-black text-center hover:text-indigo-400">Info Fatturazione & Limiti</a>
            </div>

            {/* GPS */}
            <div>
              <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Locate className="w-3 h-3" /> SENSORI GPS</p>
              <button onClick={handleGpsToggle} className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${useGps ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-white/5 border-white/10 text-slate-500'}`}>
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4" />
                  <span className="text-[9px] font-black uppercase">{useGps ? 'Posizione ON' : 'GPS Spento'}</span>
                </div>
                <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${useGps ? 'bg-indigo-500' : 'bg-slate-800'}`}>
                  <div className={`w-3 h-3 bg-white rounded-full transition-all ${useGps ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </button>
            </div>

            {/* CATEGORIES */}
            <div>
              <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-3 flex items-center gap-2"><LayoutDashboard className="w-3 h-3" /> FILTRI TELEMETRIA</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: TransportType.ALL, label: 'TUTTI', icon: <Navigation className="w-3 h-3" /> },
                  { id: TransportType.TRAIN, label: 'TRENI', icon: <Train className="w-3 h-3" /> },
                  { id: TransportType.ROAD, label: 'AUTO', icon: <Car className="w-3 h-3" /> },
                  { id: TransportType.METRO, label: 'URBAN', icon: <TrainFront className="w-3 h-3" /> },
                  { id: TransportType.PLANE, label: 'VOLI', icon: <Plane className="w-3 h-3" /> },
                  { id: TransportType.SHIP, label: 'NAVI', icon: <Ship className="w-3 h-3" /> },
                ].map(item => (
                  <button key={item.id} onClick={() => { setSelectedType(item.id as TransportType); setIsMenuOpen(false); }} className={`flex items-center gap-2 p-3 rounded-xl border text-[8px] font-black uppercase transition-all ${selectedType === item.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-white/5 border-white/5 text-slate-500'}`}>
                    {item.icon} {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <main className="flex-1 flex flex-col pt-14 md:pt-16">
        <div className="flex-1 overflow-y-auto px-4 md:px-12 py-6 scrollbar-hide">
          <div className="max-w-4xl mx-auto">
            
            {/* COMPACT HERO */}
            <div className="mb-6 md:mb-10 text-center">
              <h1 className="text-3xl md:text-7xl font-black tracking-tighter uppercase italic leading-none text-white">AI <span className="text-indigo-500">TRANSITO</span></h1>
              <p className="text-[7px] md:text-[9px] font-black text-slate-700 uppercase tracking-[0.4em] mt-1">Geospatial Command Center</p>
            </div>

            {/* COMPACT SEARCH */}
            <div className="bg-slate-900/60 p-2 rounded-2xl md:rounded-[2rem] border border-white/10 shadow-2xl mb-6 md:mb-10 backdrop-blur-3xl group">
              <form onSubmit={handleSearch} className="flex flex-col gap-2">
                <div className="relative flex items-center">
                  <div className="absolute left-4 w-7 h-7 bg-indigo-600/10 rounded-lg flex items-center justify-center text-indigo-400 group-focus-within:bg-indigo-600 group-focus-within:text-white transition-all">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <input 
                    type="text" 
                    value={query} 
                    onChange={(e) => setQuery(e.target.value)} 
                    placeholder="DESTINAZIONE O MEZZO..." 
                    className="w-full bg-transparent border-none py-4 pl-14 pr-14 text-sm font-bold focus:ring-0 placeholder:text-slate-700 uppercase tracking-tight text-white" 
                  />
                  <button 
                    type="button" 
                    onClick={toggleListening} 
                    className={`absolute right-4 p-2 rounded-full transition-all active:scale-75 ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-600 hover:text-indigo-400'}`}
                  >
                    {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={isSearching} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 uppercase text-[9px] tracking-widest flex-1">
                    {isSearching ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><span>ANALIZZA</span><ArrowRight className="w-3.5 h-3.5" /></>}
                  </button>
                </div>
              </form>
            </div>

            {error && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-[8px] font-black uppercase tracking-widest">
                <ShieldAlert className="w-3.5 h-3.5" /> {error}
              </div>
            )}

            {isListening && (
              <div className="mb-6 p-4 glass border border-indigo-500/20 rounded-xl flex items-center justify-center gap-3">
                <div className="flex gap-0.5 items-end h-4">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="w-0.5 bg-indigo-500 rounded-full animate-bounce" style={{ height: `${Math.random()*100}%`, animationDelay: `${i*0.1}s` }} />
                  ))}
                </div>
                <span className="text-[9px] font-black uppercase text-indigo-400">In ascolto...</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-20">
              <div className="lg:col-span-12">
                 <div className="relative overflow-hidden rounded-2xl md:rounded-[2.5rem] border border-white/5 shadow-2xl bg-slate-900/20">
                   <TransportMap points={allPoints} userLocation={location} isSearching={isSearching} />
                </div>
              </div>

              <div className="lg:col-span-12 space-y-4">
                {results.map((result, idx) => {
                  const alert = result.text.includes("[RITARDO]") || result.text.includes("[TRAFFICO ALTO]");
                  return (
                    <div key={'f-'+idx} className={`glass overflow-hidden rounded-2xl md:rounded-[2rem] border transition-all animate-in slide-in-from-bottom-4 duration-500 ${alert ? 'border-orange-500/30' : 'border-white/10'}`}>
                      <div className="px-5 py-4 bg-white/[0.02] border-b border-white/5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-lg ${alert ? 'bg-orange-500/10' : 'bg-indigo-600/10'}`}>{getTransportIcon(result.type)}</div>
                          <div>
                            <p className="text-[7px] font-black text-indigo-500 uppercase">{result.type} FEED</p>
                            <h3 className="text-sm md:text-xl font-black uppercase text-white truncate max-w-[150px] md:max-w-none">{result.query}</h3>
                          </div>
                        </div>
                        <button onClick={resetSearch} className="p-2 text-slate-600 hover:text-white"><RotateCcw className="w-4 h-4" /></button>
                      </div>
                      <div className="p-5 md:p-8">
                        <div className="telemetry-feed relative prose prose-invert max-w-none">
                           <div className="text-slate-400 text-[10px] md:text-sm leading-relaxed font-medium uppercase tracking-tight" dangerouslySetInnerHTML={{ __html: formatMarkdown(result.text) }} />
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
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/98 backdrop-blur-3xl">
          <div className="glass max-w-[280px] w-full p-8 rounded-[2.5rem] border border-white/10 text-center relative">
            <div className="bg-indigo-600 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-600/40">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-black mb-3 uppercase italic text-white">{tutorSteps[tutorStep].title}</h3>
            <p className="text-slate-500 text-[9px] font-black leading-relaxed mb-8 px-2 uppercase tracking-widest">{tutorSteps[tutorStep].desc}</p>
            <button onClick={() => { if (tutorStep < tutorSteps.length - 1) setTutorStep(tutorStep + 1); else { setShowTutor(false); localStorage.setItem('transito_setup_v36_done', 'true'); }}} className="w-full bg-white text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest transition-all active:scale-95">
              <span>{tutorStep === tutorSteps.length - 1 ? "ACCEDI" : "AVANTI"}</span><ChevronRight className="w-4 h-4" />
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
    .replace(/^### (.*$)/gim, '<h3 class="text-indigo-500 text-[8px] font-black mt-6 mb-3 uppercase tracking-widest border-l-2 border-indigo-600 pl-3">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-white text-sm md:text-lg font-black mt-8 mb-4 uppercase italic">$1</h2>')
    .replace(/\[REGOLARE\]/g, '<span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/20 text-[7px] font-black uppercase">REGOLARE</span>')
    .replace(/\[RITARDO\]/g, '<span class="px-2 py-0.5 bg-red-500/10 text-red-500 rounded border border-red-500/20 text-[7px] font-black uppercase animate-pulse">RITARDO</span>')
    .replace(/\[TRAFFICO ALTO\]/g, '<span class="px-2 py-0.5 bg-orange-500/10 text-orange-500 rounded border border-orange-500/20 text-[7px] font-black uppercase">ALTO TRAFFICO</span>')
    .replace(/(\d+[,.]\d{2}\s*€|€\s*\d+[,.]\d{2}|\d+\s*€)/g, '<span class="text-emerald-400 font-black">$1</span>')
    .split('\n').map(line => line.trim() ? `<p class="my-3 text-slate-500 font-bold text-[9px] md:text-xs uppercase tracking-tight">${line}</p>` : '').join('');
}

export default App;
