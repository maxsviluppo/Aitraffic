
import React, { useState, useEffect, useCallback } from 'react';
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
  Bookmark,
  BookmarkPlus,
  RotateCcw,
  Clock,
  LayoutDashboard,
  Cpu,
  ChevronRight,
  ChevronLeft,
  Car,
  Trash2
} from 'lucide-react';
import { TransportType, SearchResult, UserLocation, SavedSearch } from './types';
import { searchTransportInfo } from './services/geminiService';
import { Visualizer } from './components/Visualizer';

const tutorSteps = [
  {
    title: "Sistema Transito",
    desc: "Inizializzazione del motore di analisi telemetrica. Monitoraggio globale dei flussi di traffico e trasporti."
  },
  {
    title: "Command Center",
    desc: "Utilizza il pannello di controllo per filtrare treni, aerei, navi e ora anche il traffico stradale urbano."
  },
  {
    title: "Telemetria Avanzata",
    desc: "Il nucleo Gemini identifica ritardi, costi e zone di congestione stradale in tempo reale."
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
  const [isApiKeySelected, setIsApiKeySelected] = useState<boolean | null>(null);
  const [showTutor, setShowTutor] = useState(true);
  const [tutorStep, setTutorStep] = useState(0);
  
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(() => {
    const saved = localStorage.getItem('transito_saved_searches');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    const checkKey = async () => {
      // @ts-ignore
      if (window.aistudio) {
        // @ts-ignore
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsApiKeySelected(hasKey);
      } else {
        setIsApiKeySelected(true);
      }
    };
    checkKey();
    if (savedSearches.length > 0) setShowTutor(false);
  }, [savedSearches.length]);

  const handleOpenSelectKey = async () => {
    // @ts-ignore
    if (window.aistudio) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      setIsApiKeySelected(true);
    }
  };

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setUseGps(true);
      },
      () => setUseGps(false)
    );
  }, []);

  useEffect(() => {
    if (useGps) requestLocation();
    else setLocation(undefined);
  }, [useGps, requestLocation]);

  useEffect(() => {
    localStorage.setItem('transito_saved_searches', JSON.stringify(savedSearches));
  }, [savedSearches]);

  const resetSearch = () => {
    setQuery('');
    setResults([]);
    setError(null);
  };

  const hasAlert = useCallback((text: string) => 
    text.includes("[RITARDO]") || 
    text.includes("[TRAFFICO ALTO]") ||
    text.toLowerCase().includes("ritardo") || 
    text.toLowerCase().includes("incidente") ||
    text.toLowerCase().includes("cancellato"), []);

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
      const searchQuery = activeQuery || (useGps ? "Trasporti e traffico vicino a me" : "");
      const result = await searchTransportInfo(searchQuery, activeType, location);
      setResults(prev => [result, ...prev].slice(0, 3));
    } catch (err: any) {
      if (err.message && err.message.includes("Requested entity was not found.")) {
        setIsApiKeySelected(false);
        setIsMenuOpen(true);
        setError("AUTH ERROR: Inizializzare chiave API per ricerca web.");
      } else {
        setError("LINK ERROR: Telemetria non disponibile.");
      }
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSaveSearch = (q: string, type: TransportType) => {
    if (!q.trim()) return;
    const exists = savedSearches.find(s => s.query === q && s.type === type);
    if (exists) {
      setSavedSearches(prev => prev.filter(s => s.id !== exists.id));
    } else {
      setSavedSearches(prev => [{
        id: Math.random().toString(36).substr(2, 9),
        query: q,
        type: type,
        lastKnownDelay: false,
        timestamp: Date.now()
      }, ...prev]);
    }
  };

  const getTransportIcon = (type: TransportType) => {
    switch (type) {
      case TransportType.TRAIN: return <Train className="w-5 h-5 text-orange-400" />;
      case TransportType.METRO: return <TrainFront className="w-5 h-5 text-cyan-400" />;
      case TransportType.PLANE: return <Plane className="w-5 h-5 text-indigo-400" />;
      case TransportType.SHIP: return <Ship className="w-5 h-5 text-blue-400" />;
      case TransportType.ROAD: return <Car className="w-5 h-5 text-emerald-400" />;
      default: return <Navigation className="w-5 h-5 text-slate-400" />;
    }
  };

  const isCurrentSearchSaved = savedSearches.some(s => s.query === query && s.type === selectedType);

  return (
    <div className="min-h-screen flex flex-col bg-[#020617] text-slate-200 selection:bg-indigo-500/30 font-['Plus_Jakarta_Sans'] overflow-x-hidden">
      <Visualizer />

      {/* HEADER - SYSTEM STATUS */}
      <header className="fixed top-0 inset-x-0 z-40 px-4 md:px-8 py-3 flex justify-between items-center glass border-b border-white/5 backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-600/30">
            <Navigation className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-sm tracking-tighter uppercase italic">TRANSITO <span className="text-indigo-500">v3.0</span></span>
        </div>

        <div className="flex items-center gap-2">
          {results.length > 0 && (
            <button 
              onClick={resetSearch}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[9px] font-black uppercase rounded-lg border border-red-500/20 transition-all active:scale-95"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">System Clear</span>
            </button>
          )}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all active:scale-95 ${isMenuOpen ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-600/20' : 'glass border-white/10 text-slate-400 hover:text-white'}`}
          >
            {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            <span className="text-[10px] font-black uppercase hidden sm:inline">Command Center</span>
          </button>
        </div>
      </header>

      {/* COMMAND CENTER OVERLAY */}
      <div className={`fixed inset-0 z-30 transition-all duration-500 ${isMenuOpen ? 'visible opacity-100' : 'invisible opacity-0'}`}>
        <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={() => setIsMenuOpen(false)} />
        <aside className={`absolute top-0 right-0 bottom-0 w-full md:w-96 glass border-l border-white/10 p-8 pt-20 shadow-2xl transform transition-transform duration-500 ease-out flex flex-col ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex-1 overflow-y-auto space-y-10 scrollbar-hide pr-1">
            
            {/* Category Filter */}
            <div>
              <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <LayoutDashboard className="w-3 h-3" /> CATEGORIE TRASPORTO
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: TransportType.ALL, label: 'TUTTI', icon: <Navigation className="w-4 h-4" /> },
                  { id: TransportType.TRAIN, label: 'TRENI', icon: <Train className="w-4 h-4" /> },
                  { id: TransportType.ROAD, label: 'STRADA', icon: <Car className="w-4 h-4" /> },
                  { id: TransportType.METRO, label: 'URBANI', icon: <TrainFront className="w-4 h-4" /> },
                  { id: TransportType.PLANE, label: 'VOLI', icon: <Plane className="w-4 h-4" /> },
                  { id: TransportType.SHIP, label: 'NAVI', icon: <Ship className="w-4 h-4" /> },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setSelectedType(item.id as TransportType); setIsMenuOpen(false); }}
                    className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${selectedType === item.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/20'}`}
                  >
                    {item.icon}
                    <span className="text-[9px] font-black uppercase">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Hardware Status & Config */}
            <div className="space-y-4">
              <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <Cpu className="w-3 h-3" /> STATUS HARDWARE
              </p>
              <div className="p-6 bg-slate-900/60 rounded-3xl border border-white/5 space-y-6 shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-slate-500">API SECURITY</span>
                  <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${isApiKeySelected ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                    {isApiKeySelected ? 'ACTIVE' : 'LOCK'}
                  </div>
                </div>
                <button 
                  onClick={handleOpenSelectKey}
                  className="w-full bg-white text-black font-black py-4 rounded-xl text-[9px] uppercase tracking-widest transition-all hover:bg-indigo-600 hover:text-white shadow-lg"
                >
                  {isApiKeySelected ? 'AGGIORNA PROTOCOLLI' : 'INIZIALIZZA CHIAVE'}
                </button>
                <div className="h-px bg-white/5" />
                <button 
                  onClick={() => setUseGps(!useGps)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${useGps ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-white/5 border-white/10 text-slate-600'}`}
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase">SENSORI GPS</span>
                  </div>
                  <div className={`w-8 h-4 rounded-full relative transition-colors ${useGps ? 'bg-emerald-500' : 'bg-slate-800'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${useGps ? 'left-4.5' : 'left-0.5'}`} />
                  </div>
                </button>
              </div>
            </div>

            {/* Memory / History */}
            <div>
              <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <History className="w-3 h-3" /> MEMORIA TRATTE
              </p>
              <div className="space-y-3">
                {savedSearches.length === 0 ? (
                  <div className="p-4 rounded-2xl border border-dashed border-white/10 text-[9px] text-slate-700 font-bold uppercase text-center">Nessuna tratta salvata</div>
                ) : (
                  savedSearches.map(saved => (
                    <button 
                      key={saved.id} 
                      onClick={() => handleSearch(undefined, saved.query, saved.type)}
                      className="w-full flex items-center justify-between p-4 glass rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all text-left"
                    >
                      <div className="flex items-center gap-3 truncate">
                        {getTransportIcon(saved.type)}
                        <span className="text-[10px] font-bold uppercase truncate">{saved.query}</span>
                      </div>
                      <ChevronRight className="w-3 h-3 text-slate-600" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 flex flex-col pt-16">
        <div className="flex-1 overflow-y-auto px-4 md:px-12 lg:px-24 py-8 scrollbar-hide">
          <div className="max-w-4xl mx-auto">
            
            {/* BRAND SECTION */}
            <div className="mb-10 text-center">
              <h1 className="text-5xl md:text-8xl font-black tracking-tighter uppercase italic leading-none text-white">
                AI <span className="text-indigo-500">TRAFFIC</span>
              </h1>
              <p className="text-[8px] md:text-[10px] font-black text-slate-600 uppercase tracking-[0.5em] mt-2">Global Urban Mobility Telemetry</p>
            </div>

            {/* CONSOLIDATED INPUT */}
            <div className="bg-slate-900/50 p-2 md:p-3 rounded-[2.5rem] border border-white/10 shadow-2xl mb-12 focus-within:ring-4 ring-indigo-500/10 transition-all backdrop-blur-3xl group">
              <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2">
                <div className="flex-1 relative flex items-center">
                  <div className="absolute left-6 md:left-8 w-6 h-6 md:w-8 md:h-8 bg-indigo-600/10 rounded-xl flex items-center justify-center group-focus-within:bg-indigo-600 group-focus-within:text-white transition-all">
                    <Search className="w-3 h-3 md:w-4 md:h-4" />
                  </div>
                  <input 
                    type="text" 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="DESTINAZIONE, VIA O TRATTA URBANA..."
                    className="w-full bg-transparent border-none py-6 md:py-8 pl-16 md:pl-20 pr-10 text-lg md:text-xl font-black focus:ring-0 placeholder:text-slate-800 uppercase tracking-tight text-white"
                  />
                </div>
                <div className="flex gap-2 p-1">
                  <button 
                    type="button"
                    onClick={() => toggleSaveSearch(query, selectedType)}
                    disabled={!query.trim()}
                    className={`p-5 md:p-6 rounded-3xl flex items-center justify-center transition-all border-2 active:scale-95 disabled:opacity-20 ${
                      isCurrentSearchSaved 
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400' 
                      : 'glass border-white/10 text-slate-600 hover:text-white'
                    }`}
                  >
                    <BookmarkPlus className="w-6 h-6" />
                  </button>
                  <button 
                    type="submit"
                    disabled={isSearching}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-10 md:px-14 py-5 md:py-6 rounded-3xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 shadow-2xl shadow-indigo-600/30 uppercase text-[10px] md:text-xs tracking-widest flex-1 md:flex-none"
                  >
                    {isSearching ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><span>Analizza</span><ArrowRight className="w-4 h-4" /></>}
                  </button>
                </div>
              </form>
            </div>

            {error && (
              <div className="mb-12 p-6 bg-red-500/10 border border-red-500/20 rounded-[2rem] flex items-center gap-5 text-red-500 text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-top-4">
                <ShieldAlert className="w-6 h-6" /> {error}
              </div>
            )}

            {/* RESULTS ENGINE */}
            <div className="space-y-6 pb-32">
              {results.length > 0 && (
                <div className="flex items-center justify-between mb-4 animate-in fade-in slide-in-from-top-2 duration-500">
                  <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                     <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Risultati Attivi</span>
                  </div>
                  <button 
                    onClick={resetSearch}
                    className="flex items-center gap-2 px-6 py-3 glass hover:bg-red-500/10 text-red-400 text-[10px] font-black uppercase rounded-2xl border border-red-500/20 transition-all active:scale-95 shadow-xl"
                  >
                    <Trash2 className="w-4 h-4" />
                    Svuota Dashboard
                  </button>
                </div>
              )}

              {results.length === 0 && !isSearching && (
                <div className="text-center py-20 md:py-32 border border-dashed border-white/5 rounded-[4rem] flex flex-col items-center justify-center bg-white/[0.01] opacity-40">
                  <div className="bg-slate-900/80 p-6 rounded-3xl mb-8 border border-white/5">
                    <History className="w-8 h-8 text-slate-700" />
                  </div>
                  <p className="text-slate-700 font-black uppercase tracking-[0.5em] text-[8px]">In attesa di scansione globale</p>
                </div>
              )}

              {results.map((result, idx) => {
                const isAlert = hasAlert(result.text);
                const isSaved = savedSearches.some(s => s.query === result.query);
                return (
                  <div key={idx} className={`glass overflow-hidden rounded-[3rem] border-2 transition-all animate-in slide-in-from-bottom-12 duration-500 ${isAlert ? 'border-orange-500/20 shadow-[0_0_60px_rgba(249,115,22,0.02)]' : 'border-white/10 shadow-2xl'}`}>
                    <div className="px-6 md:px-10 py-6 md:py-8 bg-white/[0.01] border-b border-white/5 flex flex-wrap items-center justify-between gap-6">
                      <div className="flex items-center gap-6">
                        <div className={`p-4 md:p-5 rounded-2xl border ${isAlert ? 'bg-orange-500/10 border-orange-500/20' : 'bg-indigo-600/10 border-indigo-500/20'}`}>
                          {getTransportIcon(result.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-4 mb-1">
                            <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{result.type}</span>
                            <span className="w-1 h-1 bg-slate-800 rounded-full" />
                            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{result.timestamp}</span>
                          </div>
                          <h3 className="text-xl md:text-3xl font-black uppercase tracking-tighter truncate max-w-[200px] md:max-w-md text-white">{result.query}</h3>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => toggleSaveSearch(result.query, result.type)}
                          className={`p-4 md:p-5 rounded-2xl border transition-all ${isSaved ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-white/5 border-white/10 text-slate-600 hover:text-white'}`}
                        >
                          <Bookmark className={`w-4 h-4 md:w-5 md:h-5 ${isSaved ? 'fill-current' : ''}`} />
                        </button>
                        {result.sources[0] && (
                          <a href={result.sources[0].uri} target="_blank" rel="noreferrer" className="p-4 md:p-5 rounded-2xl bg-white/5 border border-white/10 text-slate-600 hover:text-white transition-all">
                            <ExternalLink className="w-4 h-4 md:w-5 md:h-5" />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="p-6 md:p-10">
                      {isAlert && (
                        <div className="mb-8 p-5 bg-orange-500/5 rounded-2xl border border-orange-500/20 flex items-center gap-4 border-l-4">
                          <AlertTriangle className="w-5 h-5 text-orange-500 animate-pulse" />
                          <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">CRITICITÀ RILEVATA - POSSIBILI RALLENTAMENTI O CONGESTIONE STRADALE</span>
                        </div>
                      )}

                      <div className="telemetry-feed relative">
                        {/* MOBILE SCROLL INDICATOR */}
                        <div className="md:hidden absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-40 pointer-events-none">
                           <span className="text-[8px] font-black uppercase rotate-90">Slide</span>
                           <ChevronLeft className="w-4 h-4" />
                        </div>

                         <div className="text-slate-400 text-sm md:text-base leading-relaxed overflow-x-auto mobile-scroll-mask" 
                              dangerouslySetInnerHTML={{ __html: formatMarkdown(result.text.replace("[RITARDO]", "").replace("[TRAFFICO ALTO]", "")) }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* TUTOR / INITIALIZATION */}
      {showTutor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/98 backdrop-blur-3xl animate-in fade-in duration-1000">
          <div className="glass max-w-sm w-full p-12 rounded-[4rem] border border-white/10 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-indigo-600" />
            <div className="bg-indigo-600 w-20 h-20 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-indigo-600/40">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-4xl font-black mb-6 uppercase tracking-tighter italic leading-none">{tutorSteps[tutorStep].title}</h3>
            <p className="text-slate-500 text-xs font-bold leading-relaxed mb-12 px-2 uppercase tracking-wide">{tutorSteps[tutorStep].desc}</p>
            
            <button 
              onClick={() => {
                if (tutorStep < tutorSteps.length - 1) setTutorStep(tutorStep + 1);
                else setShowTutor(false);
              }}
              className="w-full bg-white text-black font-black py-6 rounded-[2rem] flex items-center justify-center gap-4 text-[10px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-2xl active:scale-95"
            >
              <span>{tutorStep === tutorSteps.length - 1 ? "ENTRA NEL SISTEMA" : "SUCCESSIVO"}</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <style>{`
        .mobile-scroll-mask table {
          min-width: 600px;
        }
        @media (max-width: 768px) {
          .mobile-scroll-mask {
            mask-image: linear-gradient(to right, black 80%, transparent);
            -webkit-mask-image: linear-gradient(to right, black 80%, transparent);
          }
        }
      `}</style>
    </div>
  );
};

function formatMarkdown(text: string) {
  let html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-black">$1</strong>')
    .replace(/^### (.*$)/gim, '<h3 class="text-indigo-500 text-[9px] font-black mt-10 mb-5 uppercase tracking-[0.4em] border-l-2 border-indigo-600 pl-4">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-white text-lg font-black mt-12 mb-6 uppercase tracking-tighter italic">$1</h2>')
    .replace(/\[REGOLARE\]/g, '<span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded text-[8px] font-black uppercase tracking-widest border border-emerald-500/20">Regolare</span>')
    .replace(/\[TRAFFICO FLUIDO\]/g, '<span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded text-[8px] font-black uppercase tracking-widest border border-emerald-500/20">Traffico Fluido</span>')
    .replace(/\[TRAFFICO ALTO\]/g, '<span class="px-2 py-0.5 bg-orange-500/10 text-orange-500 rounded text-[8px] font-black uppercase tracking-widest border border-orange-500/20">Traffico Alto</span>')
    .replace(/\[CANCELLATO\]/g, '<span class="px-2 py-0.5 bg-red-600 text-white rounded text-[8px] font-black uppercase tracking-widest">Cancellato</span>')
    .replace(/(\d+[,.]\d{2}\s*€|€\s*\d+[,.]\d{2}|\d+\s*€)/g, '<span class="text-emerald-400 font-black tracking-tighter drop-shadow-[0_0_5px_rgba(52,211,153,0.3)]">$1</span>');

  const lines = html.split('\n');
  let inTable = false;
  let finalLines: string[] = [];
  
  lines.forEach(line => {
    if (line.includes('|') && line.trim().length > 1) {
      const cells = line.split('|').map(c => c.trim()).filter((c, i, arr) => {
          return i > 0 && i < arr.length - 1;
      });
      
      if (cells.length > 0) {
        if (!inTable) { 
          inTable = true; 
          finalLines.push('<div class="overflow-x-auto my-8 border border-white/5 rounded-3xl bg-white/[0.01] shadow-inner"><table class="w-full border-collapse"><thead><tr>');
          cells.forEach(c => finalLines.push(`<th class="text-left py-5 px-6 bg-white/[0.03] border-b border-white/10 text-[9px] uppercase text-slate-500 font-black tracking-widest">${c}</th>`));
          finalLines.push('</tr></thead><tbody>');
        } else if (line.includes('---')) {
        } else {
          finalLines.push('<tr class="hover:bg-white/[0.01] transition-colors">');
          cells.forEach(c => {
             const isTime = /\b\d{2}:\d{2}\b/.test(c);
             const isPrice = c.includes('€') || /\b\d+[,.]\d{2}\b/.test(c);
             const isAlert = c.includes('ALTO') || c.includes('RITARDO') || c.includes('INCIDENTE');
             
             let cellClass = 'text-slate-500 font-bold text-[11px] md:text-xs';
             if (isTime) cellClass = 'text-indigo-400 font-black tracking-tighter text-sm';
             if (isPrice) cellClass = 'text-emerald-400 font-black tracking-tighter text-sm';
             if (isAlert) cellClass = 'text-orange-400 font-black tracking-tighter text-sm';
             
             finalLines.push(`<td class="py-5 px-6 border-b border-white/[0.02] ${cellClass}">${c}</td>`);
          });
          finalLines.push('</tr>');
        }
      }
    } else {
      if (inTable) { 
        inTable = false; 
        finalLines.push('</tbody></table></div>'); 
      }
      if (line.trim()) finalLines.push(`<p class="my-5 text-slate-500 font-bold text-[11px] md:text-sm leading-relaxed uppercase tracking-tight">${line}</p>`);
    }
  });

  if (inTable) finalLines.push('</tbody></table></div>');
  
  return finalLines.join('');
}

export default App;
