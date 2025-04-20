/*
  # Initial Schema Setup

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key) - References auth.users
      - `created_at` (timestamp)
      - `full_name` (text)
      - `bio` (text, nullable)
      - `avatar_url` (text, nullable)
      - `events_joined` (integer)

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
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  full_name text NOT NULL,
  bio text,
  avatar_url text,
  events_joined integer DEFAULT 0,
  CONSTRAINT valid_events_joined CHECK (events_joined >= 0)
);

-- Create events table
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
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles
  FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Events policies
CREATE POLICY "Events are viewable by everyone"
  ON events
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create events"
  ON events
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own events"
  ON events
  FOR UPDATE
  USING (auth.uid() = organizer_id);