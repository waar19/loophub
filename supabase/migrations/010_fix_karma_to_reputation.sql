-- Fix: Update karma triggers to use 'reputation' instead of 'karma'
-- The profiles table uses 'reputation' not 'karma'

CREATE OR REPLACE FUNCTION update_karma_for_thread_vote()
RETURNS TRIGGER AS $$
DECLARE
  thread_author_id UUID;
  karma_change INTEGER;
BEGIN
  -- Get the thread author
  SELECT user_id INTO thread_author_id FROM threads WHERE id = COALESCE(NEW.thread_id, OLD.thread_id);
  
  -- Skip if no author (anonymous posts)
  IF thread_author_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  IF TG_OP = 'INSERT' THEN
    karma_change := NEW.vote_type; -- +1 for upvote, -1 for downvote
    UPDATE profiles SET reputation = reputation + karma_change WHERE id = thread_author_id;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Vote changed from upvote to downvote or vice versa
    IF OLD.vote_type != NEW.vote_type THEN
      karma_change := (NEW.vote_type - OLD.vote_type); -- Will be +2 or -2
      UPDATE profiles SET reputation = reputation + karma_change WHERE id = thread_author_id;
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    karma_change := -OLD.vote_type; -- Reverse the karma
    UPDATE profiles SET reputation = GREATEST(reputation + karma_change, 0) WHERE id = thread_author_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_karma_for_comment_vote()
RETURNS TRIGGER AS $$
DECLARE
  comment_author_id UUID;
  karma_change INTEGER;
BEGIN
  -- Get the comment author
  SELECT user_id INTO comment_author_id FROM comments WHERE id = COALESCE(NEW.comment_id, OLD.comment_id);
  
  -- Skip if no author (anonymous posts)
  IF comment_author_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  IF TG_OP = 'INSERT' THEN
    karma_change := NEW.vote_type;
    UPDATE profiles SET reputation = reputation + karma_change WHERE id = comment_author_id;
    
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.vote_type != NEW.vote_type THEN
      karma_change := (NEW.vote_type - OLD.vote_type);
      UPDATE profiles SET reputation = reputation + karma_change WHERE id = comment_author_id;
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    karma_change := -OLD.vote_type;
    UPDATE profiles SET reputation = GREATEST(reputation + karma_change, 0) WHERE id = comment_author_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
