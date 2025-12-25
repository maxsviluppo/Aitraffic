
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
  Key,
  Eye,
  EyeOff,
  Trash2,
  AlertCircle
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
  const [showTutor, setShowTutor] = useState(() => !localStorage.getItem('transito_setup_v37_done'));
  const [tutorStep, setTutorStep] = useState(0);
  const [isListening, setIsListening] = useState(false);
  
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('transito_custom_api_key') || '');
  const [showKey, setShowKey] = useState(false);
  
  const recognitionRef = useRef<any>(null);

  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(() => {
    const saved = localStorage.getItem('transito_saved_searches');
    return saved ? JSON.parse(saved) : [];
  });

  const allPoints = useMemo(() => {
    return results.reduce((acc, res) => [...acc, ...res.points], [] as MapPoint[]);
  }, [results]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = 'it-IT';
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        setIsListening(false);
        handleSearch(undefined, transcript);
      };
      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onerror = () => setIsListening(false);
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
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setUseGps(true);
        setError(null);
      },
      () => {
        setError("GPS non autorizzato.");
        setUseGps(false);
      }
    );
  }, []);

  const resetSearch = () => {
    setQuery('');
    setResults([]);
    setError(null);
    setIsMenuOpen(false);
  };

  const handleSearch = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const activeQuery = customQuery || query;
    if (!activeQuery && !useGps) return;

    setIsSearching(true);
    setError(null);
    setShowTutor(false);
    setIsMenuOpen(false); 

    try {
      const result = await searchTransportInfo(activeQuery, selectedType, location);
      setResults(prev => [result, ...prev].slice(0, 3));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#020617] text-slate-200 font-['Plus_Jakarta_Sans'] overflow-x-hidden">
      <Visualizer />

      <header className="fixed top-0 inset-x-0 z-[9999] px-4 py-2 flex justify-between items-center glass border-b border-white/5 backdrop-blur-3xl">
        <div className="flex items-center gap-2">
          <button onClick={resetSearch} className="bg-indigo-600 p-1.5 rounded-lg active:scale-95">
            <Home className="w-4 h-4 text-white" />
          </button>
          <span className="font-black text-[10px] tracking-tighter uppercase italic text-white">TRANSITO AI</span>
        </div>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 glass border border-white/10 rounded-lg text-slate-400">
          {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </header>

      {/* Control Drawer */}
      <div className={`fixed inset-0 z-[10000] transition-all duration-300 ${isMenuOpen ? 'visible opacity-100' : 'invisible opacity-0'}`}>
        <div className="absolute inset-0 bg-black/85 backdrop-blur-xl" onClick={() => setIsMenuOpen(false)} />
        <aside className={`absolute top-0 right-0 bottom-0 w-72 glass border-l border-white/10 p-6 pt-20 flex flex-col transform transition-transform duration-300 ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="space-y-8 overflow-y-auto scrollbar-hide">
            
            <div className="bg-indigo-500/5 p-4 rounded-2xl border border-indigo-500/10">
              <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Key className="w-3 h-3" /> GEMINI API KEY</p>
              <div className="relative">
                <input 
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    localStorage.setItem('transito_custom_api_key', e.target.value);
                  }}
                  placeholder="Inserisci Chiave..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-4 pr-10 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                />
                <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600">
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="block mt-2 text-[7px] text-slate-500 uppercase font-black hover:text-indigo-400">Ottieni una chiave gratuita qui</a>
            </div>

            <div>
              <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-3"><Locate className="w-3 h-3 inline mr-1" /> GPS</p>
              <button onClick={() => { if(!useGps) requestLocation(); else setUseGps(false); }} className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${useGps ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-white/5 border-white/5 text-slate-500'}`}>
                <span className="text-[9px] font-black uppercase">{useGps ? 'GPS ATTIVO' : 'GPS SPENTO'}</span>
                <div className={`w-8 h-4 rounded-full p-1 ${useGps ? 'bg-indigo-500' : 'bg-slate-800'}`}>
                  <div className={`w-2 h-2 bg-white rounded-full transition-all ${useGps ? 'translate-x-4' : ''}`} />
                </div>
              </button>
            </div>

            <div>
              <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-3"><LayoutDashboard className="w-3 h-3 inline mr-1" /> CATEGORIA</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: TransportType.ALL, label: 'TUTTI', icon: <Navigation className="w-3 h-3" /> },
                  { id: TransportType.TRAIN, label: 'TRENI', icon: <Train className="w-3 h-3" /> },
                  { id: TransportType.METRO, label: 'METRO', icon: <TrainFront className="w-3 h-3" /> },
                  { id: TransportType.PLANE, label: 'VOLI', icon: <Plane className="w-3 h-3" /> },
                ].map(item => (
                  <button key={item.id} onClick={() => setSelectedType(item.id as TransportType)} className={`flex items-center gap-2 p-2 rounded-lg border text-[8px] font-black uppercase ${selectedType === item.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/5 text-slate-500'}`}>
                    {item.icon} {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <main className="flex-1 flex flex-col pt-16 px-4 md:px-12">
        <div className="max-w-4xl mx-auto w-full py-8">
          
          <div className="mb-8 text-center">
            <h1 className="text-4xl md:text-7xl font-black tracking-tighter uppercase italic text-white">TRANSITO <span className="text-indigo-500">AI</span></h1>
            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-2">Dati trasporti in tempo reale</p>
          </div>

          <div className="bg-slate-900/60 p-2 rounded-[2rem] border border-white/10 shadow-2xl mb-8 backdrop-blur-3xl group">
            <form onSubmit={handleSearch} className="flex flex-col gap-2">
              <div className="relative flex items-center">
                <Search className="absolute left-4 w-4 h-4 text-indigo-400" />
                <input 
                  type="text" 
                  value={query} 
                  onChange={(e) => setQuery(e.target.value)} 
                  placeholder="DOVE VUOI ANDARE? (ES: TRENO ROMA MILANO)" 
                  className="w-full bg-transparent border-none py-4 pl-12 pr-12 text-sm font-bold focus:ring-0 placeholder:text-slate-800 text-white uppercase" 
                />
                <button type="button" onClick={toggleListening} className={`absolute right-4 p-2 rounded-full ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-600'}`}>
                  {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>
              </div>
              <button type="submit" disabled={isSearching} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 uppercase text-[10px] tracking-widest">
                {isSearching ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>ANALIZZA AREA <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400 text-[10px] font-black uppercase leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-8 mb-20">
            <div className="rounded-[2.5rem] overflow-hidden border border-white/10 bg-slate-900/40 shadow-2xl">
              <TransportMap points={allPoints} userLocation={location} isSearching={isSearching} />
            </div>

            <div className="space-y-4">
              {results.map((result, idx) => (
                <div key={idx} className="glass p-6 md:p-10 rounded-[2.5rem] border border-white/10 animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-indigo-500/10 rounded-xl">
                       <Activity className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-indigo-500 uppercase">{result.type} FEED</p>
                      <h3 className="text-xl font-black uppercase text-white">{result.query}</h3>
                    </div>
                  </div>
                  <div className="text-slate-400 text-xs md:text-base leading-relaxed uppercase font-medium" dangerouslySetInnerHTML={{ __html: formatMarkdown(result.text) }} />
                  {result.sources.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-white/5 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      {result.sources.map((s, i) => (
                        <a key={i} href={s.uri} target="_blank" rel="noreferrer" className="px-3 py-1.5 glass border border-white/5 rounded-lg text-[8px] font-black text-slate-500 hover:text-white flex items-center gap-2 shrink-0">
                          <ExternalLink className="w-3 h-3" /> {s.title.substring(0, 20)}...
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {showTutor && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/98 backdrop-blur-3xl">
          <div className="glass max-w-xs w-full p-8 rounded-[3rem] border border-white/10 text-center">
            <Zap className="w-12 h-12 text-indigo-500 mx-auto mb-6" />
            <h3 className="text-2xl font-black mb-4 uppercase text-white italic">TRANSITO CORE</h3>
            <p className="text-slate-500 text-[10px] font-black leading-relaxed mb-8 uppercase px-2">Monitoraggio globale di treni, voli e trasporti con intelligenza artificiale.</p>
            <button onClick={() => { setShowTutor(false); localStorage.setItem('transito_setup_v37_done', 'true'); }} className="w-full bg-white text-black font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest active:scale-95">ACCEDI AL SISTEMA</button>
          </div>
        </div>
      )}
    </div>
  );
};

function formatMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-black">$1</strong>')
    .replace(/^### (.*$)/gim, '<h3 class="text-indigo-500 text-[9px] font-black mt-6 mb-3 uppercase tracking-widest border-l-2 border-indigo-600 pl-3">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-white text-sm md:text-lg font-black mt-8 mb-4 uppercase italic">$2</h2>')
    .replace(/\[REGOLARE\]/g, '<span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/20 text-[7px] font-black">REGOLARE</span>')
    .replace(/\[RITARDO\]/g, '<span class="px-2 py-0.5 bg-red-500/10 text-red-500 rounded border border-red-500/20 text-[7px] font-black animate-pulse">RITARDO</span>')
    .replace(/(\d+[,.]\d{2}\s*€|€\s*\d+[,.]\d{2})/g, '<span class="text-emerald-400 font-black">$1</span>')
    .split('\n').map(line => line.trim() ? `<p class="my-3">${line}</p>` : '').join('');
}

export default App;
