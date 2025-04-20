-- Create event_volunteers table
CREATE TABLE IF NOT EXISTS event_volunteers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  volunteer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, volunteer_id)
);

-- Enable RLS
ALTER TABLE event_volunteers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Event volunteers are viewable by everyone"
  ON event_volunteers
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can join events"
  ON event_volunteers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = volunteer_id);

CREATE POLICY "Users can leave events"
  ON event_volunteers
  FOR DELETE
  TO authenticated
  USING (auth.uid() = volunteer_id);

-- Update join_event function to use the new table
CREATE OR REPLACE FUNCTION join_event(p_event_id uuid, p_user_id uuid)
RETURNS json AS $$
DECLARE
  v_event events;
  v_volunteer profiles;
BEGIN
  -- Get the event
  SELECT * INTO v_event
  FROM events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  -- Check if event is full
  IF v_event.volunteers_joined >= v_event.volunteers_needed THEN
    RAISE EXCEPTION 'Event is full';
  END IF;

  -- Get the volunteer profile
  SELECT * INTO v_volunteer
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Check if already joined
  IF EXISTS (
    SELECT 1 FROM event_volunteers
    WHERE event_id = p_event_id AND volunteer_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'You have already joined this event';
  END IF;

  -- Insert into event_volunteers
  INSERT INTO event_volunteers (event_id, volunteer_id)
  VALUES (p_event_id, p_user_id);

  -- Update event volunteers count
  UPDATE events
  SET volunteers_joined = volunteers_joined + 1
  WHERE id = p_event_id;

  -- Update profile events_joined count
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
$$ LANGUAGE plpgsql SECURITY DEFINER; 