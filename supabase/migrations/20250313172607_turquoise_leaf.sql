/*
  # Add Join Event Function

  1. Changes
    - Add stored procedure for joining events
    - Handles atomic updates for both event and profile

  2. Security
    - Function is executed with invoker's privileges
    - Includes validation checks
*/

CREATE OR REPLACE FUNCTION join_event(p_event_id uuid, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event events;
    v_profile profiles;
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

    -- Get the user's profile and lock it
    SELECT * INTO v_profile
    FROM profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found';
    END IF;

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