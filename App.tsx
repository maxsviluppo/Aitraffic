
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
  AlertCircle,
  Clock,
  Gauge
} from 'lucide-react';
import { TransportType, SearchResult, UserLocation, SavedSearch, MapPoint } from './types';
import { searchTransportInfo } from './services/geminiService';
import { Visualizer } from './components/Visualizer';
import { TransportMap } from './components/TransportMap';

const tutorSteps = [
  {
    title: "Transito AI Lite",
    desc: "Il sistema ora utilizza il motore Lite per una maggiore velocità e monitoraggio del traffico urbano integrato."
  },
  {
    title: "Smart Traffic",
    desc: "Cerca una città per ricevere aggiornamenti istantanei sulla viabilità e congestione stradale."
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
  const [showTutor, setShowTutor] = useState(() => !localStorage.getItem('transito_setup_v40_done'));
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

      <header className="fixed top-0 inset-x-0 z-[9999] px-4 py-3 flex justify-between items-center glass border-b border-white/5 backdrop-blur-3xl shadow-xl">
        <div className="flex items-center gap-2">
          <button onClick={resetSearch} className="bg-indigo-600 p-2 rounded-xl active:scale-90 transition-transform shadow-lg shadow-indigo-600/20">
            <Home className="w-4 h-4 text-white" />
          </button>
          <span className="font-black text-[10px] tracking-widest uppercase italic text-white flex flex-col">
            <span>TRANSITO</span>
            <span className="text-indigo-500 text-[8px]">CORE LITE</span>
          </span>
        </div>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2.5 glass border border-white/10 rounded-xl text-slate-400 hover:text-white hover:border-indigo-500/50 transition-all">
          {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Control Drawer */}
      <div className={`fixed inset-0 z-[10000] transition-all duration-500 ${isMenuOpen ? 'visible opacity-100' : 'invisible opacity-0'}`}>
        <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={() => setIsMenuOpen(false)} />
        <aside className={`absolute top-0 right-0 bottom-0 w-80 glass border-l border-white/10 p-8 pt-24 flex flex-col transform transition-transform duration-500 ease-out ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="space-y-10 overflow-y-auto scrollbar-hide pb-10">
            
            <div className="p-5 rounded-[2rem] border bg-indigo-500/5 border-indigo-500/20">
              <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Key className="w-3.5 h-3.5" /> CONFIGURAZIONE AI
              </p>
              <div className="relative">
                <input 
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    localStorage.setItem('transito_custom_api_key', e.target.value);
                  }}
                  placeholder="Gemini API Key..."
                  className="w-full bg-black/60 border border-white/10 rounded-2xl py-4 pl-5 pr-12 text-xs text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
                <button onClick={() => setShowKey(!showKey)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors">
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="mt-3 text-[7px] text-slate-500 uppercase font-bold leading-relaxed">
                Ottieni la chiave gratuita su <a href="https://aistudio.google.com/" className="text-indigo-400 underline">Google AI Studio</a>.
              </p>
            </div>

            <div>
              <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Locate className="w-3.5 h-3.5" /> GEOLOCALIZZAZIONE</p>
              <button onClick={() => { if(!useGps) requestLocation(); else setUseGps(false); }} className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all ${useGps ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-white/5 border-white/10 text-slate-500'}`}>
                <span className="text-[10px] font-black uppercase tracking-tight">{useGps ? 'GPS ATTIVO' : 'GPS SPENTO'}</span>
                <div className={`w-10 h-5 rounded-full p-1 transition-colors ${useGps ? 'bg-indigo-500' : 'bg-slate-800'}`}>
                  <div className={`w-3 h-3 bg-white rounded-full transition-all ${useGps ? 'translate-x-5' : ''}`} />
                </div>
              </button>
            </div>

            <div>
              <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-4 flex items-center gap-2"><LayoutDashboard className="w-3.5 h-3.5" /> MODALITÀ</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: TransportType.ALL, label: 'TUTTI', icon: <Navigation className="w-3.5 h-3.5" /> },
                  { id: TransportType.TRAIN, label: 'TRENI', icon: <Train className="w-3.5 h-3.5" /> },
                  { id: TransportType.ROAD, label: 'AUTO', icon: <Car className="w-3.5 h-3.5" /> },
                  { id: TransportType.PLANE, label: 'VOLI', icon: <Plane className="w-3.5 h-3.5" /> },
                ].map(item => (
                  <button key={item.id} onClick={() => setSelectedType(item.id as TransportType)} className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border text-[9px] font-black uppercase transition-all ${selectedType === item.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-600/30' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}`}>
                    {item.icon} {item.label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full p-5 border border-red-500/20 text-red-500 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-3 hover:bg-red-500 hover:text-white transition-all group">
              <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" /> RESET SISTEMA
            </button>
          </div>
        </aside>
      </div>

      <main className="flex-1 flex flex-col pt-20 px-4 md:px-8">
        <div className="max-w-4xl mx-auto w-full py-6 md:py-10">
          
          <div className="mb-10 text-center animate-in fade-in zoom-in duration-700">
            <h1 className="text-6xl md:text-9xl font-black tracking-tighter uppercase italic text-white leading-none">TRANSITO</h1>
            <div className="flex items-center justify-center gap-3 mt-4">
              <span className="h-px w-8 bg-indigo-500/50"></span>
              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.4em] shimmer px-4 py-1.5 rounded-full glass border border-indigo-500/20">TRAFFIC MONITOR AI</p>
              <span className="h-px w-8 bg-indigo-500/50"></span>
            </div>
          </div>

          <div className="bg-slate-900/40 p-2.5 rounded-[2.5rem] border border-white/10 shadow-2xl mb-10 backdrop-blur-3xl group ring-1 ring-white/5">
            <form onSubmit={handleSearch} className="flex flex-col gap-2.5">
              <div className="relative flex items-center">
                <Search className="absolute left-6 w-5 h-5 text-indigo-500 group-focus-within:text-white transition-colors" />
                <input 
                  type="text" 
                  value={query} 
                  onChange={(e) => setQuery(e.target.value)} 
                  placeholder="ES: TRAFFICO MILANO O TRENO BOLOGNA" 
                  className="w-full bg-transparent border-none py-6 md:py-8 pl-16 pr-16 text-sm md:text-xl font-bold focus:ring-0 placeholder:text-slate-800 text-white uppercase tracking-tight" 
                />
                <button type="button" onClick={toggleListening} className={`absolute right-6 p-3 rounded-full transition-all active:scale-75 ${isListening ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/40' : 'text-slate-600 hover:text-indigo-400'}`}>
                  {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>
              </div>
              <button type="submit" disabled={isSearching} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black py-6 rounded-[2rem] flex items-center justify-center gap-4 transition-all active:scale-[0.98] disabled:opacity-50 uppercase text-[12px] tracking-[0.25em] shadow-2xl shadow-indigo-600/40 border border-white/10">
                {isSearching ? <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : <>AVVIA SCANSIONE <ArrowRight className="w-5 h-5" /></>}
              </button>
            </form>
          </div>

          {error && (
            <div className="mb-10 p-6 bg-red-500/5 border border-red-500/30 rounded-[2rem] flex items-start gap-5 text-red-400 animate-in slide-in-from-top-4">
              <div className="p-3 bg-red-500/10 rounded-2xl shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest mb-1">Errore Telemetria</p>
                <p className="text-[13px] font-bold leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-10 mb-32">
            <div className="rounded-[3.5rem] overflow-hidden border border-white/10 bg-slate-900/40 shadow-2xl relative ring-1 ring-white/5">
              <TransportMap points={allPoints} userLocation={location} isSearching={isSearching} />
            </div>

            <div className="space-y-8">
              {results.length === 0 && !isSearching && !error && (
                <div className="text-center py-24 opacity-10 animate-pulse flex flex-col items-center gap-4">
                  <Activity className="w-12 h-12" />
                  <p className="text-[10px] font-black uppercase tracking-[0.6em]">In attesa di scansione...</p>
                </div>
              )}

              {results.map((result, idx) => (
                <div key={idx} className="glass p-10 md:p-14 rounded-[3.5rem] border border-white/10 shadow-2xl animate-in fade-in slide-in-from-bottom-12 duration-700 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Gauge className="w-24 h-24 text-indigo-500" />
                  </div>
                  
                  <div className="flex items-center justify-between mb-10 relative z-10">
                    <div className="flex items-center gap-6">
                      <div className="p-5 bg-indigo-600/10 rounded-2xl shadow-inner border border-indigo-500/20">
                         <Activity className="w-7 h-7 text-indigo-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{result.type} DATA STREAM</p>
                        <h3 className="text-3xl md:text-4xl font-black uppercase text-white tracking-tighter italic">{result.query}</h3>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-slate-600 uppercase bg-white/5 px-4 py-1.5 rounded-xl border border-white/5">{result.timestamp}</span>
                  </div>
                  
                  <div className="text-slate-400 text-sm md:text-xl leading-relaxed uppercase font-medium space-y-6 relative z-10" dangerouslySetInnerHTML={{ __html: formatMarkdown(result.text) }} />
                  
                  {result.sources.length > 0 && (
                    <div className="mt-12 pt-10 border-t border-white/5 flex gap-4 overflow-x-auto pb-6 scrollbar-hide relative z-10">
                      {result.sources.map((s, i) => (
                        <a key={i} href={s.uri} target="_blank" rel="noreferrer" className="px-5 py-3 glass border border-white/10 rounded-2xl text-[10px] font-black text-slate-500 hover:text-white hover:border-indigo-500/50 flex items-center gap-3 shrink-0 transition-all hover:-translate-y-1">
                          <ExternalLink className="w-4 h-4 text-indigo-500" /> {s.title.substring(0, 30)}...
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
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-6 bg-black/98 backdrop-blur-3xl animate-in fade-in duration-500">
          <div className="glass max-w-sm w-full p-12 md:p-14 rounded-[4rem] border border-white/10 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-600/10 rounded-full blur-3xl"></div>
            <div className="bg-indigo-600 w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-indigo-600/50">
              <Zap className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-4xl font-black mb-6 uppercase text-white italic tracking-tighter leading-none">{tutorSteps[tutorStep].title}</h3>
            <p className="text-slate-500 text-[12px] font-black leading-relaxed mb-12 uppercase px-4 tracking-widest">{tutorSteps[tutorStep].desc}</p>
            <button onClick={() => { 
              if (tutorStep < tutorSteps.length - 1) setTutorStep(tutorStep + 1);
              else {
                setShowTutor(false); 
                localStorage.setItem('transito_setup_v40_done', 'true');
              }
            }} className="w-full bg-white text-black font-black py-6 rounded-[2rem] text-[12px] uppercase tracking-[0.3em] active:scale-95 transition-all shadow-2xl hover:bg-indigo-600 hover:text-white border-b-4 border-slate-300">
              {tutorStep === tutorSteps.length - 1 ? "AVVIA" : "PROSEGUI"}
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
    .replace(/^### (.*$)/gim, '<h3 class="text-indigo-500 text-[11px] font-black mt-10 mb-5 uppercase tracking-[0.5em] border-l-4 border-indigo-600 pl-5">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-white text-lg md:text-3xl font-black mt-12 mb-8 uppercase tracking-tighter italic border-b border-white/10 pb-4">$1</h2>')
    .replace(/\[REGOLARE\]/g, '<span class="px-3.5 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/30 text-[10px] font-black tracking-widest shadow-inner">REGOLARE</span>')
    .replace(/\[RITARDO\]/g, '<span class="px-3.5 py-1.5 bg-red-500/10 text-red-400 rounded-xl border border-red-400/30 text-[10px] font-black animate-pulse tracking-widest shadow-inner">RITARDO</span>')
    .replace(/\[CANCELLATO\]/g, '<span class="px-3.5 py-1.5 bg-red-600/20 text-red-600 rounded-xl border border-red-600/30 text-[10px] font-black tracking-widest shadow-inner">CANCELLATO</span>')
    .replace(/\[TRAFFICO ALTO\]|\[INTENSO\]/g, '<span class="px-3.5 py-1.5 bg-orange-500/10 text-orange-400 rounded-xl border border-orange-400/30 text-[10px] font-black tracking-widest shadow-inner">TRAFFICO INTENSO</span>')
    .replace(/\[FLUIDO\]/g, '<span class="px-3.5 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-400/30 text-[10px] font-black tracking-widest shadow-inner">TRAFFICO FLUIDO</span>')
    .replace(/\[RALLENTAMENTI\]/g, '<span class="px-3.5 py-1.5 bg-yellow-500/10 text-yellow-400 rounded-xl border border-yellow-400/30 text-[10px] font-black tracking-widest shadow-inner">RALLENTAMENTI</span>')
    .replace(/(\d+[,.]\d{2}\s*€|€\s*\d+[,.]\d{2}|\d+\s*€)/g, '<span class="text-emerald-400 font-black px-2 py-0.5 bg-emerald-400/5 rounded-lg border border-emerald-400/10">$1</span>')
    .replace(/\|/g, '<span class="text-slate-800">|</span>')
    .split('\n').map(line => line.trim() ? `<p class="my-5 tracking-tight">${line}</p>` : '').join('');
}

export default App;
