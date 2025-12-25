
import React, { useEffect, useRef } from 'react';
import { MapPoint, UserLocation, TransportType } from '../types';

interface TransportMapProps {
  points: MapPoint[];
  userLocation?: UserLocation;
  isSearching: boolean;
}

export const TransportMap: React.FC<TransportMapProps> = ({ points, userLocation, isSearching }) => {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialLat = userLocation?.lat || 41.9028;
    const initialLng = userLocation?.lng || 12.4964;

    // @ts-ignore
    mapRef.current = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([initialLat, initialLng], 6);

    // @ts-ignore
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18
    }).addTo(mapRef.current);

    // @ts-ignore
    markersRef.current = L.layerGroup().addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;
    markersRef.current.clearLayers();

    if (userLocation) {
      // @ts-ignore
      const userIcon = L.divIcon({
        className: 'user-marker',
        html: `<div class="w-3 h-3 bg-indigo-500 rounded-full border border-white animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      });
      // @ts-ignore
      L.marker([userLocation.lat, userLocation.lng], { icon: userIcon }).addTo(markersRef.current);
    }

    points.forEach(point => {
      let color = 'bg-slate-400';
      if (point.type === TransportType.TRAIN) color = 'bg-orange-500';
      if (point.type === TransportType.PLANE) color = 'bg-indigo-500';
      if (point.type === TransportType.SHIP) color = 'bg-blue-500';
      if (point.type === TransportType.ROAD) color = 'bg-emerald-500';
      if (point.type === TransportType.METRO) color = 'bg-cyan-500';

      // @ts-ignore
      const icon = L.divIcon({
        className: 'transport-marker',
        html: `<div class="w-2.5 h-2.5 ${color} rounded-sm rotate-45 border border-white/20"></div>`,
        iconSize: [10, 10],
        iconAnchor: [5, 5]
      });

      // @ts-ignore
      L.marker([point.lat, point.lng], { icon }).addTo(markersRef.current);
    });

    if (points.length > 0) {
      const bounds = points.map(p => [p.lat, p.lng] as [number, number]);
      if (userLocation) bounds.push([userLocation.lat, userLocation.lng]);
      // Zoom più aggressivo: ridotto padding a [10, 10] e aumentato maxZoom a 15
      // @ts-ignore
      mapRef.current.fitBounds(bounds, { padding: [10, 10], maxZoom: 15 });
    }
  }, [points, userLocation]);

  return (
    <div className="relative w-full h-64 md:h-[450px] group z-0">
      <div ref={containerRef} className="w-full h-full z-0" />
      <div className="absolute top-4 left-4 z-[500] pointer-events-none">
        <div className="glass px-2.5 py-1 rounded-lg flex items-center gap-2 border border-white/10">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-[7px] font-black uppercase tracking-widest text-white">Live Map</span>
        </div>
      </div>
      {isSearching && (
        <div className="absolute inset-0 z-[501] bg-black/40 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            <span className="text-[8px] font-black uppercase text-white tracking-[0.2em]">Scansione...</span>
          </div>
        </div>
      )}
    </div>
  );
};
