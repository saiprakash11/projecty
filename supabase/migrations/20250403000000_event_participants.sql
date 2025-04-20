/*
  # Add Event Participants Table

  1. New Tables
    - `event_participants`
      - `event_id` (uuid, references events)
      - `user_id` (uuid, references profiles)
      - `created_at` (timestamp)
      - Primary key (event_id, user_id)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create event_participants table
CREATE TABLE IF NOT EXISTS event_participants (
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

-- Enable RLS
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Event participants are viewable by everyone"
  ON event_participants
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can join events"
  ON event_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS join_event(uuid, uuid);

-- Create the join_event function
CREATE OR REPLACE FUNCTION join_event(p_event_id uuid, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event events;
    v_profile profiles;
    v_participant event_participants;
BEGIN
    -- Get the event and lock it
    SELECT * INTO v_event
    FROM events
    WHERE id = p_event_id
    FOR UPDATE;

    -- Validate event exists and has space
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Event not found';
    END IF;

    IF v_event.volunteers_joined >= v_event.volunteers_needed THEN
        RAISE EXCEPTION 'Event is full';
    END IF;

    -- Check if user is already participating
    SELECT * INTO v_participant
    FROM event_participants
    WHERE event_id = p_event_id AND user_id = p_user_id;

    IF FOUND THEN
        RAISE EXCEPTION 'You have already joined this event';
    END IF;

    -- Get the user's profile and lock it
    SELECT * INTO v_profile
    FROM profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found';
    END IF;

    -- Insert into event_participants
    INSERT INTO event_participants (event_id, user_id)
    VALUES (p_event_id, p_user_id);

    -- Update the event
    UPDATE events
    SET volunteers_joined = volunteers_joined + 1
    WHERE id = p_event_id;

    -- Update the profile
    UPDATE profiles
    SET events_joined = events_joined + 1
    WHERE id = p_user_id;

    -- Return the updated event with organizer info
    RETURN (
        SELECT json_build_object(
            'id', e.id,
            'title', e.title,
            'description', e.description,
            'date', e.date,
            'time', e.time,
            'location', e.location,
            'category', e.category,
            'volunteers_needed', e.volunteers_needed,
            'volunteers_joined', e.volunteers_joined,
            'image_url', e.image_url,
            'organizer_id', e.organizer_id,
            'organizer', json_build_object(
                'id', p.id,
                'full_name', p.full_name,
                'avatar_url', p.avatar_url
            )
        )
        FROM events e
        LEFT JOIN profiles p ON p.id = e.organizer_id
        WHERE e.id = p_event_id
    );
END;
$$; 