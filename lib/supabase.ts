import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Forum {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Thread {
  id: string;
  forum_id: string;
  title: string;
  content: string;
  like_count: number; // Legacy field, still used
  upvote_count: number;
  downvote_count: number;
  score?: number;
  created_at: string;
  user_id?: string;
  profile?: {
    username: string;
  };
  _count?: {
    comments: number;
  };
}

export interface Comment {
  id: string;
  thread_id: string;
  content: string;
  like_count: number; // Legacy field, still used
  upvote_count: number;
  downvote_count: number;
  score?: number;
  created_at: string;
  user_id?: string;
  profile?: {
    username: string;
  };
}
