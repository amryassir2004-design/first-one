export interface RelatedSong {
  title: string;
  artist: string;
  genres: string[];
  whyRecommend: string;
}

export interface SongMetadata {
  songTitle: string;
  artist: string;
  genres: string[];
  subgenres: string[];
  releaseYear: string;
  bpm: number;
  key: string;
  moods: string[];
  instruments: string[];
  summary: string;
  similarArtists: string[];
  funFact: string;
  relatedSongs: RelatedSong[];
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  songTitle: string;
  artist: string;
  genres: string[];
  timestamp: number;
}

export interface DiscoveredSong {
  title: string;
  artist: string;
  bpm: number;
  key: string;
  genres: string[];
  popularityInfo: string;
  description: string;
}

