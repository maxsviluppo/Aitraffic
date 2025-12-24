
export enum TransportType {
  ALL = 'ALL',
  TRAIN = 'TRAIN',
  METRO = 'METRO',
  PLANE = 'PLANE',
  SHIP = 'SHIP',
  ROAD = 'ROAD'
}

export interface SearchSource {
  title: string;
  uri: string;
}

export interface SearchResult {
  query: string;
  text: string;
  sources: SearchSource[];
  timestamp: string;
  type: TransportType;
}

export interface SavedSearch {
  id: string;
  query: string;
  type: TransportType;
  lastKnownDelay: boolean;
  timestamp: number;
}

export interface UserLocation {
  lat: number;
  lng: number;
  city?: string;
}
