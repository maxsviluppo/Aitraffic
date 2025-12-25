
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

      <header className="fixed top-0 inset-x-0 z-[9999] px-4 py-2 flex justify-between items-center glass border-b border-white/5 backdrop-blur-3xl shadow-xl">
        <div className="flex items-center gap-2">
          <button onClick={resetSearch} className="bg-indigo-600 p-1.5 rounded-lg active:scale-90 transition-transform shadow-lg shadow-indigo-600/20">
            <Home className="w-3.5 h-3.5 text-white" />
          </button>
          <span className="font-black text-[9px] tracking-widest uppercase italic text-white flex flex-col leading-none">
            <span>TRANSITO</span>
            <span className="text-indigo-500 text-[7px]">LITE</span>
          </span>
        </div>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 glass border border-white/10 rounded-lg text-slate-400 hover:text-white transition-all">
          {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </header>

      {/* Control Drawer */}
      <div className={`fixed inset-0 z-[10000] transition-all duration-500 ${isMenuOpen ? 'visible opacity-100' : 'invisible opacity-0'}`}>
        <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={() => setIsMenuOpen(false)} />
        <aside className={`absolute top-0 right-0 bottom-0 w-72 glass border-l border-white/10 p-6 pt-20 flex flex-col transform transition-transform duration-500 ease-out ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="space-y-8 overflow-y-auto scrollbar-hide pb-10">
            
            <div className="p-4 rounded-[1.5rem] border bg-indigo-500/5 border-indigo-500/20">
              <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Key className="w-3 h-3" /> API CONFIG
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
                  className="w-full bg-black/60 border border-white/10 rounded-xl py-3 pl-4 pr-10 text-[11px] text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                />
                <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600">
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Locate className="w-3 h-3" /> POSITION</p>
              <button onClick={() => { if(!useGps) requestLocation(); else setUseGps(false); }} className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${useGps ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-white/5 border-white/10 text-slate-500'}`}>
                <span className="text-[9px] font-black uppercase tracking-tight">{useGps ? 'GPS ON' : 'GPS OFF'}</span>
                <div className={`w-8 h-4 rounded-full p-1 ${useGps ? 'bg-indigo-500' : 'bg-slate-800'}`}>
                  <div className={`w-2.5 h-2.5 bg-white rounded-full transition-all ${useGps ? 'translate-x-4' : ''}`} />
                </div>
              </button>
            </div>

            <div>
              <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-3 flex items-center gap-2"><LayoutDashboard className="w-3 h-3" /> TYPE</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: TransportType.ALL, label: 'TUTTI', icon: <Navigation className="w-3 h-3" /> },
                  { id: TransportType.TRAIN, label: 'TRENI', icon: <Train className="w-3 h-3" /> },
                  { id: TransportType.ROAD, label: 'AUTO', icon: <Car className="w-3 h-3" /> },
                  { id: TransportType.PLANE, label: 'VOLI', icon: <Plane className="w-3 h-3" /> },
                ].map(item => (
                  <button key={item.id} onClick={() => setSelectedType(item.id as TransportType)} className={`flex items-center gap-2 p-3 rounded-lg border text-[8px] font-black uppercase ${selectedType === item.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/5 text-slate-500'}`}>
                    {item.icon} {item.label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full p-4 border border-red-500/20 text-red-500 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2">
              <Trash2 className="w-3.5 h-3.5" /> RESET
            </button>
          </div>
        </aside>
      </div>

      <main className="flex-1 flex flex-col pt-16 px-4 md:px-8">
        <div className="max-w-4xl mx-auto w-full py-4 md:py-8">
          
          <div className="mb-6 md:mb-10 text-center animate-in fade-in zoom-in duration-700">
            <h1 className="text-4xl md:text-8xl font-black tracking-tighter uppercase italic text-white leading-none">TRANSITO</h1>
            <p className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.4em] mt-2 px-3 py-1 glass border border-indigo-500/20 inline-block rounded-full">TRAFFIC ENGINE</p>
          </div>

          <div className="bg-slate-900/40 p-2 rounded-[2rem] border border-white/10 shadow-2xl mb-8 backdrop-blur-3xl group ring-1 ring-white/5">
            <form onSubmit={handleSearch} className="flex flex-col gap-2">
              <div className="relative flex items-center">
                <Search className="absolute left-4 w-4 h-4 text-indigo-500" />
                <input 
                  type="text" 
                  value={query} 
                  onChange={(e) => setQuery(e.target.value)} 
                  placeholder="CERCA DESTINAZIONE O TRAFFICO" 
                  className="w-full bg-transparent border-none py-4 md:py-6 pl-12 pr-12 text-[15px] md:text-lg font-bold focus:ring-0 placeholder:text-slate-800 text-white uppercase tracking-tight" 
                />
                <button type="button" onClick={toggleListening} className={`absolute right-4 p-2 rounded-full transition-all active:scale-75 ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-600'}`}>
                  {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>
              </div>
              <button type="submit" disabled={isSearching} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-[1.5rem] flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 uppercase text-[10px] tracking-[0.2em]">
                {isSearching ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>SCANSIONE <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-red-500/5 border border-red-500/30 rounded-[1.5rem] flex items-start gap-3 text-red-400 text-xs animate-in slide-in-from-top-4">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-bold">{error}</span>
            </div>
          )}

          <div className="space-y-6 mb-24">
            <div className="rounded-[2rem] overflow-hidden border border-white/10 bg-slate-900/40 shadow-2xl relative ring-1 ring-white/5">
              <TransportMap points={allPoints} userLocation={location} isSearching={isSearching} />
            </div>

            <div className="space-y-6">
              {results.length === 0 && !isSearching && !error && (
                <div className="text-center py-16 opacity-10 animate-pulse flex flex-col items-center gap-3">
                  <Activity className="w-8 h-8" />
                  <p className="text-[8px] font-black uppercase tracking-[0.5em]">HARDWARE READY</p>
                </div>
              )}

              {results.map((result, idx) => (
                <div key={idx} className="glass p-6 md:p-12 rounded-[2.5rem] border border-white/10 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700 relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-6 relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-indigo-600/10 rounded-xl border border-indigo-500/20">
                         <Activity className="w-5 h-5 text-indigo-500" />
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest leading-none mb-1">{result.type} FEED</p>
                        <h3 className="text-lg md:text-3xl font-black uppercase text-white tracking-tighter italic leading-none">{result.query}</h3>
                      </div>
                    </div>
                    <span className="text-[8px] font-black text-slate-600 uppercase bg-white/5 px-3 py-1 rounded-lg border border-white/5">{result.timestamp}</span>
                  </div>
                  
                  <div className="text-slate-400 text-[13px] md:text-base leading-relaxed uppercase font-medium space-y-4 relative z-10" dangerouslySetInnerHTML={{ __html: formatMarkdown(result.text) }} />
                  
                  {result.sources.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-white/5 flex gap-2 overflow-x-auto pb-4 scrollbar-hide relative z-10">
                      {result.sources.map((s, i) => (
                        <a key={i} href={s.uri} target="_blank" rel="noreferrer" className="px-3 py-1.5 glass border border-white/10 rounded-lg text-[8px] font-black text-slate-500 hover:text-white flex items-center gap-2 shrink-0 transition-all">
                          <ExternalLink className="w-3 h-3 text-indigo-500" /> {s.title.substring(0, 20)}...
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
          <div className="glass max-w-sm w-full p-8 md:p-12 rounded-[3rem] border border-white/10 text-center shadow-2xl relative overflow-hidden">
            <div className="bg-indigo-600 w-16 h-16 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-600/50">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl md:text-4xl font-black mb-4 uppercase text-white italic tracking-tighter leading-none">{tutorSteps[tutorStep].title}</h3>
            <p className="text-slate-500 text-[10px] md:text-[12px] font-black leading-relaxed mb-8 uppercase px-2 tracking-widest">{tutorSteps[tutorStep].desc}</p>
            <button onClick={() => { 
              if (tutorStep < tutorSteps.length - 1) setTutorStep(tutorStep + 1);
              else {
                setShowTutor(false); 
                localStorage.setItem('transito_setup_v40_done', 'true');
              }
            }} className="w-full bg-white text-black font-black py-4 rounded-[1.5rem] text-[10px] uppercase tracking-[0.2em] transition-all shadow-2xl hover:bg-indigo-600 hover:text-white">
              {tutorStep === tutorSteps.length - 1 ? "AVVIA" : "SUCCESSIVO"}
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
    .replace(/^### (.*$)/gim, '<h3 class="text-indigo-500 text-[9px] md:text-[11px] font-black mt-6 mb-3 uppercase tracking-[0.3em] border-l-2 border-indigo-600 pl-3">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-white text-sm md:text-2xl font-black mt-8 mb-4 uppercase tracking-tighter italic border-b border-white/10 pb-2">$1</h2>')
    .replace(/\[REGOLARE\]/g, '<span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/30 text-[8px] font-black tracking-widest">REGOLARE</span>')
    .replace(/\[RITARDO\]/g, '<span class="px-2 py-0.5 bg-red-500/10 text-red-400 rounded border border-red-400/30 text-[8px] font-black animate-pulse tracking-widest">RITARDO</span>')
    .replace(/\[CANCELLATO\]/g, '<span class="px-2 py-0.5 bg-red-600/20 text-red-600 rounded border border-red-600/30 text-[8px] font-black tracking-widest">CANCELLATO</span>')
    .replace(/\[TRAFFICO ALTO\]|\[INTENSO\]/g, '<span class="px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded border border-orange-400/30 text-[8px] font-black tracking-widest">TRAFFICO INTENSO</span>')
    .replace(/\[FLUIDO\]/g, '<span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-400/30 text-[8px] font-black tracking-widest">TRAFFICO FLUIDO</span>')
    .replace(/\[RALLENTAMENTI\]/g, '<span class="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 rounded border border-yellow-400/30 text-[8px] font-black tracking-widest">RALLENTAMENTI</span>')
    .replace(/(\d+[,.]\d{2}\s*€|€\s*\d+[,.]\d{2}|\d+\s*€)/g, '<span class="text-emerald-400 font-black px-1.5 py-0.5 bg-emerald-400/5 rounded border border-emerald-400/10">$1</span>')
    .replace(/\|/g, '<span class="text-slate-800">|</span>')
    .split('\n').map(line => line.trim() ? `<p class="my-3 tracking-tight">${line}</p>` : '').join('');
}

export default App;
