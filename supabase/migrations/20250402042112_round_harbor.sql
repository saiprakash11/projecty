/*
  # Add Events Table and Policies

  1. New Tables
    - `events`
      - `id` (uuid, primary key)
      - `created_at` (timestamp)
      - `title` (text)
      - `description` (text)
      - `date` (text)
      - `time` (text)
      - `location` (text)
      - `category` (text)
      - `volunteers_needed` (integer)
      - `volunteers_joined` (integer)
      - `image_url` (text)
      - `organizer_id` (uuid, references profiles)

  2. Security
    - Enable RLS
    - Add policies for event management
*/

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  title text NOT NULL,
  description text NOT NULL,
  date text NOT NULL,
  time text NOT NULL,
  location text NOT NULL,
  category text NOT NULL,
  volunteers_needed integer NOT NULL,
  volunteers_joined integer DEFAULT 0,
  image_url text NOT NULL,
  organizer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT valid_volunteers CHECK (volunteers_joined <= volunteers_needed AND volunteers_needed > 0)
);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Events policies
CREATE POLICY "Events are viewable by everyone"
  ON events
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create events"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Users can update own events"
  ON events
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = organizer_id)
  WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Users can delete own events"
  ON events
  FOR DELETE
  TO authenticated
  USING (auth.uid() = organizer_id);