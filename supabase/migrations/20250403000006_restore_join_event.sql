-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.join_event(uuid, uuid);

-- Create the join_event function with correct parameters
CREATE OR REPLACE FUNCTION public.join_event(event_id uuid, user_id uuid)
RETURNS json AS $$
DECLARE
  v_event events;
  v_volunteer profiles;
BEGIN
  -- Get the event
  SELECT * INTO v_event
  FROM events e
  WHERE e.id = event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  -- Check if event is full
  IF v_event.volunteers_joined >= v_event.volunteers_needed THEN
    RAISE EXCEPTION 'Event is full';
  END IF;

  -- Get the volunteer profile
  SELECT * INTO v_volunteer
  FROM profiles p
  WHERE p.id = user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Check if already joined
  IF EXISTS (
    SELECT 1 FROM event_volunteers ev
    WHERE ev.event_id = event_id AND ev.volunteer_id = user_id
  ) THEN
    RAISE EXCEPTION 'You have already joined this event';
  END IF;

  -- Insert into event_volunteers
  INSERT INTO event_volunteers (event_id, volunteer_id)
  VALUES (event_id, user_id);

  -- Update event volunteers count
  UPDATE events e
  SET volunteers_joined = e.volunteers_joined + 1
  WHERE e.id = event_id;

  -- Update profile events_joined count
  UPDATE profiles p
  SET events_joined = p.events_joined + 1
  WHERE p.id = user_id;

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
    WHERE e.id = event_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.join_event(uuid, uuid) TO authenticated; 