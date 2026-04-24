CREATE TABLE IF NOT EXISTS condition_suggestions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN ('health_condition', 'allergy', 'dietary_preference')),
  suggestion text NOT NULL,
  suggestion_normalized text GENERATED ALWAYS AS (lower(trim(suggestion))) STORED,
  created_at timestamptz DEFAULT now()
);

-- Prevent the same user submitting the same suggestion twice
CREATE UNIQUE INDEX uq_user_suggestion
  ON condition_suggestions (user_id, category, suggestion_normalized);

ALTER TABLE condition_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own suggestions"
  ON condition_suggestions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own suggestions"
  ON condition_suggestions FOR SELECT
  USING (auth.uid() = user_id);

-- Admin view: tally of suggestions across all users, ordered by popularity
CREATE VIEW condition_suggestion_tally AS
  SELECT
    category,
    suggestion_normalized AS suggestion,
    COUNT(*) AS vote_count,
    MIN(created_at) AS first_submitted,
    MAX(created_at) AS last_submitted
  FROM condition_suggestions
  GROUP BY category, suggestion_normalized
  ORDER BY vote_count DESC, last_submitted DESC;
