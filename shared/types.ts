// Shared types used by both frontend and backend

export interface Restaurant {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  cuisine?: string;
  cuisine_type?: string;
  osm_id?: number;
  clean_score: number | null;
  rating_count: number;
  total_ratings?: number;
  criteria_averages?: CriteriaScores;
  photos?: string[];
  distance?: number;
}

export interface CriteriaScores {
  cleanliness: number;
  smell: number;
  supplies: number;
  maintenance: number;
  ambiente: number;
  accessibility: number;
}

export interface Rating {
  id: string;
  restaurant_id: string;
  restaurant_name?: string;
  user_id: string;
  user_name?: string;
  username?: string;
  user_avatar?: string;
  avatar_url?: string;
  scores?: CriteriaScores;
  cleanliness?: number;
  smell?: number;
  supplies?: number;
  condition?: number;
  ambiente?: number;
  accessibility?: number;
  overall_score: number;
  comment?: string;
  photos?: string[];
  visited_at?: string;
  created_at: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  avatar_url?: string;
  created_at: string;
  rating_count: number;
  total_ratings?: number;
  restaurant_count: number;
  average_score: number;
  locale?: string;
  badges: Badge[];
}

export interface Badge {
  id: string;
  key?: string;
  slug?: string;
  name: string;
  name_de?: string;
  name_en?: string;
  description: string;
  description_de?: string;
  description_en?: string;
  icon: string;
  earned: boolean;
  earned_at?: string;
  criteria?: {
    type: string;
    threshold: number;
  };
}

export interface ApiError {
  error: string;
  details?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}
