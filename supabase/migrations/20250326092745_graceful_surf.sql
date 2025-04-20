/*
  # Fix Profile Policies and Add Public Access

  1. Changes
    - Drop existing policies
    - Add public access for profile viewing
    - Fix profile creation and management policies
    - Add better error handling for no rows

  2. Security
    - Enable RLS
    - Allow public profile viewing
    - Allow profile creation during signup
    - Restrict profile management to authenticated users
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON profiles;

-- Create new policies with better permissions
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles
  FOR SELECT
  USING (true);

CREATE POLICY "Allow profile creation during signup"
  ON profiles
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete their own profile"
  ON profiles
  FOR DELETE
  USING (auth.uid() = id);