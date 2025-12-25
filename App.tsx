
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
  Zap,
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
    title: "Benvenuto su Transito",
    desc: "Il tuo centro di comando per monitorare treni, aerei e traffico in tempo reale."
  },
  {
    title: "AI & Geolocalizzazione",
    desc: "Usa l'intelligenza artificiale e il GPS per trovare il percorso migliore."
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
  const [showTutor, setShowTutor] = useState(() => !localStorage.getItem('transito_setup_v38_done'));
  const [tutorStep, setTutorStep] = useState(0);
  const [isListening, setIsListening] = useState(false);
  
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('transito_custom_api_key') || '');
  const [showKey, setShowKey] = useState(false);
  
  const recognitionRef = useRef<any>(null);

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
        setError("Segnale GPS non autorizzato.");
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

      <header className="fixed top-0 inset-x-0 z-[9999] px-4 py-2 flex justify-between items-center glass border-b border-white/5 backdrop-blur-3xl shadow-lg">
        <div className="flex items-center gap-2">
          <button onClick={resetSearch} className="bg-indigo-600 p-1.5 rounded-lg active:scale-90 transition-transform">
            <Home className="w-4 h-4 text-white" />
          </button>
          <span className="font-black text-xs tracking-tight uppercase italic text-white">TRANSITO <span className="text-indigo-500">FLASH</span></span>
        </div>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 glass border border-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
          {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </header>

      {/* Side Menu Drawer */}
      <div className={`fixed inset-0 z-[10000] transition-all duration-300 ${isMenuOpen ? 'visible opacity-100' : 'invisible opacity-0'}`}>
        <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setIsMenuOpen(false)} />
        <aside className={`absolute top-0 right-0 bottom-0 w-80 glass border-l border-white/10 p-6 pt-20 flex flex-col transform transition-transform duration-300 ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="space-y-8 overflow-y-auto scrollbar-hide">
            
            {/* API KEY PANEL */}
            <div className={`p-4 rounded-2xl border transition-all ${apiKey ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-orange-500/5 border-orange-500/20'}`}>
              <p className={`text-[9px] font-black uppercase tracking-widest mb-3 flex items-center gap-2 ${apiKey ? 'text-emerald-500' : 'text-orange-500'}`}>
                <Key className="w-3.5 h-3.5" /> {apiKey ? 'AI ATTIVA' : 'AI RICHIESTA'}
              </p>
              <div className="relative">
                <input 
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    localStorage.setItem('transito_custom_api_key', e.target.value);
                  }}
                  placeholder="Inserisci Gemini API Key..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-4 pr-10 text-[11px] text-white focus:ring-1 focus:ring-indigo-500 outline-none placeholder:text-slate-700"
                />
                <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors">
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="block mt-3 text-[8px] text-slate-500 uppercase font-black hover:text-indigo-400 transition-colors">Ottieni chiave gratuita &nearrow;</a>
            </div>

            {/* GPS PANEL */}
            <div>
              <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Locate className="w-3.5 h-3.5" /> SENSORI GPS</p>
              <button onClick={() => { if(!useGps) requestLocation(); else setUseGps(false); }} className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${useGps ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-white/5 border-white/10 text-slate-500'}`}>
                <span className="text-[10px] font-black uppercase">{useGps ? 'TRACKING ATTIVO' : 'GPS DISATTIVATO'}</span>
                <div className={`w-10 h-5 rounded-full p-1 transition-colors ${useGps ? 'bg-indigo-500' : 'bg-slate-800'}`}>
                  <div className={`w-3 h-3 bg-white rounded-full transition-all ${useGps ? 'translate-x-5' : ''}`} />
                </div>
              </button>
            </div>

            {/* FILTER PANEL */}
            <div>
              <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-3 flex items-center gap-2"><LayoutDashboard className="w-3.5 h-3.5" /> FILTRI MEZZI</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: TransportType.ALL, label: 'TUTTI', icon: <Navigation className="w-3 h-3" /> },
                  { id: TransportType.TRAIN, label: 'TRENI', icon: <Train className="w-3 h-3" /> },
                  { id: TransportType.METRO, label: 'METRO', icon: <TrainFront className="w-3 h-3" /> },
                  { id: TransportType.PLANE, label: 'VOLI', icon: <Plane className="w-3 h-3" /> },
                  { id: TransportType.SHIP, label: 'NAVI', icon: <Ship className="w-3 h-3" /> },
                  { id: TransportType.ROAD, label: 'AUTO', icon: <Car className="w-3 h-3" /> },
                ].map(item => (
                  <button key={item.id} onClick={() => setSelectedType(item.id as TransportType)} className={`flex items-center gap-2 p-3 rounded-xl border text-[9px] font-black uppercase transition-all ${selectedType === item.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-white/5 border-white/5 text-slate-500'}`}>
                    {item.icon} {item.label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full mt-10 p-4 border border-red-500/20 text-red-500 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all">
              <Trash2 className="w-4 h-4" /> Reset Totale
            </button>
          </div>
        </aside>
      </div>

      <main className="flex-1 flex flex-col pt-16 md:pt-20 px-4">
        <div className="max-w-4xl mx-auto w-full py-8">
          
          <div className="mb-8 md:mb-12 text-center animate-in fade-in zoom-in duration-500">
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter uppercase italic text-white leading-none">TRANSITO <span className="text-indigo-500">AI</span></h1>
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mt-3">Advanced Transport Intelligence Engine</p>
          </div>

          <div className="bg-slate-900/60 p-2 md:p-3 rounded-[2.5rem] border border-white/10 shadow-2xl mb-8 backdrop-blur-3xl group">
            <form onSubmit={handleSearch} className="flex flex-col gap-2">
              <div className="relative flex items-center">
                <Search className="absolute left-5 w-5 h-5 text-indigo-400 group-focus-within:text-white transition-colors" />
                <input 
                  type="text" 
                  value={query} 
                  onChange={(e) => setQuery(e.target.value)} 
                  placeholder="COSA STAI CERCANDO? (ES: TRENO MILANO ROMA)" 
                  className="w-full bg-transparent border-none py-5 md:py-7 pl-14 pr-14 text-sm md:text-lg font-bold focus:ring-0 placeholder:text-slate-800 text-white uppercase tracking-tight" 
                />
                <button type="button" onClick={toggleListening} className={`absolute right-5 p-2.5 rounded-full transition-all active:scale-75 ${isListening ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/20' : 'text-slate-600 hover:text-indigo-400'}`}>
                  {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>
              </div>
              <button type="submit" disabled={isSearching} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 rounded-3xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 uppercase text-[11px] tracking-[0.2em] shadow-xl shadow-indigo-600/20">
                {isSearching ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>SCANSIONE AREA <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          </div>

          {error && (
            <div className="mb-8 p-5 bg-red-500/10 border border-red-500/30 rounded-3xl flex items-start gap-4 text-red-400 text-xs font-black uppercase leading-relaxed animate-in slide-in-from-top-4">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-8 mb-24">
            <div className="rounded-[3rem] overflow-hidden border border-white/10 bg-slate-900/40 shadow-2xl relative">
              <TransportMap points={allPoints} userLocation={location} isSearching={isSearching} />
            </div>

            <div className="space-y-6">
              {results.length === 0 && !isSearching && !error && (
                <div className="text-center py-20 opacity-20 animate-pulse">
                  <p className="text-[10px] font-black uppercase tracking-[0.5em]">In attesa di coordinate...</p>
                </div>
              )}

              {results.map((result, idx) => (
                <div key={idx} className="glass p-8 md:p-12 rounded-[3rem] border border-white/10 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-500">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-5">
                      <div className="p-4 bg-indigo-500/10 rounded-2xl shadow-inner">
                         <Activity className="w-6 h-6 text-indigo-500" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{result.type} FEED DATA</p>
                        <h3 className="text-2xl md:text-3xl font-black uppercase text-white tracking-tighter">{result.query}</h3>
                      </div>
                    </div>
                    <span className="text-[9px] font-black text-slate-600 uppercase bg-white/5 px-3 py-1 rounded-lg border border-white/5">{result.timestamp}</span>
                  </div>
                  
                  <div className="text-slate-400 text-xs md:text-lg leading-relaxed uppercase font-medium space-y-4" dangerouslySetInnerHTML={{ __html: formatMarkdown(result.text) }} />
                  
                  {result.sources.length > 0 && (
                    <div className="mt-10 pt-8 border-t border-white/5 flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                      {result.sources.map((s, i) => (
                        <a key={i} href={s.uri} target="_blank" rel="noreferrer" className="px-4 py-2 glass border border-white/10 rounded-xl text-[9px] font-black text-slate-500 hover:text-white flex items-center gap-2 shrink-0 transition-all hover:scale-105">
                          <ExternalLink className="w-3.5 h-3.5" /> {s.title.substring(0, 25)}...
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
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/98 backdrop-blur-3xl animate-in fade-in">
          <div className="glass max-w-sm w-full p-10 md:p-12 rounded-[3.5rem] border border-white/10 text-center shadow-2xl">
            <div className="bg-indigo-600 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-600/40 animate-pulse">
              <Zap className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-3xl font-black mb-5 uppercase text-white italic tracking-tighter leading-none">{tutorSteps[tutorStep].title}</h3>
            <p className="text-slate-500 text-[11px] font-black leading-relaxed mb-10 uppercase px-4 tracking-widest">{tutorSteps[tutorStep].desc}</p>
            <button onClick={() => { 
              if (tutorStep < tutorSteps.length - 1) setTutorStep(tutorStep + 1);
              else {
                setShowTutor(false); 
                localStorage.setItem('transito_setup_v38_done', 'true');
              }
            }} className="w-full bg-white text-black font-black py-5 rounded-3xl text-[11px] uppercase tracking-[0.2em] active:scale-95 transition-all shadow-xl hover:bg-indigo-600 hover:text-white">
              {tutorStep === tutorSteps.length - 1 ? "AVVIA MOTORE" : "SUCCESSIVO"}
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
    .replace(/^### (.*$)/gim, '<h3 class="text-indigo-500 text-[10px] font-black mt-8 mb-4 uppercase tracking-[0.4em] border-l-2 border-indigo-600 pl-4">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-white text-base md:text-2xl font-black mt-10 mb-6 uppercase tracking-tighter italic">$1</h2>')
    .replace(/\[REGOLARE\]/g, '<span class="px-2.5 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg border border-emerald-500/20 text-[9px] font-black tracking-widest">REGOLARE</span>')
    .replace(/\[RITARDO\]/g, '<span class="px-2.5 py-1 bg-red-500/10 text-red-400 rounded-lg border border-red-400/20 text-[9px] font-black animate-pulse tracking-widest">RITARDO</span>')
    .replace(/\[TRAFFICO ALTO\]/g, '<span class="px-2.5 py-1 bg-orange-500/10 text-orange-400 rounded-lg border border-orange-400/20 text-[9px] font-black tracking-widest">TRAFFICO ALTO</span>')
    .replace(/(\d+[,.]\d{2}\s*€|€\s*\d+[,.]\d{2}|\d+\s*€)/g, '<span class="text-emerald-400 font-black">$1</span>')
    .split('\n').map(line => line.trim() ? `<p class="my-4 tracking-tight">${line}</p>` : '').join('');
}

export default App;
