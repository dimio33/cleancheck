export interface Restaurant {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  cuisine?: string;
  clean_score: number | null;
  rating_count: number;
  criteria_averages?: CriteriaScores;
  photos?: string[];
  distance?: number;
}

export interface CriteriaScores {
  cleanliness: number;
  smell: number;
  supplies: number;
  maintenance: number;
  accessibility: number;
}

export interface Rating {
  id: string;
  restaurant_id: string;
  restaurant_name?: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  scores: CriteriaScores;
  overall_score: number;
  comment?: string;
  photos?: string[];
  created_at: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  created_at: string;
  rating_count: number;
  restaurant_count: number;
  average_score: number;
  badges: Badge[];
}

export interface Badge {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earned_at?: string;
}
