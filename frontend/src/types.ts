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
  ambiente: number;
  accessibility: number;
}

export interface RatingPhoto {
  id: string;
  photo_url: string;
}

export interface Rating {
  id: string;
  restaurant_id: string;
  restaurant_name?: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  username?: string;
  scores: CriteriaScores;
  overall_score: number;
  comment?: string;
  photos?: RatingPhoto[];
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
  xp?: number;
  level?: number;
  rank?: string;
  streak?: number;
  xp_for_next_level?: number;
  xp_progress?: number;
  active_frame?: string | null;
  custom_title?: string | null;
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
}
