-- Drop existing function if it exists
DROP FUNCTION IF EXISTS join_event(uuid, uuid);

-- Create the join_event function with corrected parameter usage
CREATE OR REPLACE FUNCTION join_event(event_id uuid, user_id uuid)
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
    FROM events e
    WHERE e.id = $1
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
    FROM event_participants ep
    WHERE ep.event_id = $1 
    AND ep.user_id = $2;

    IF FOUND THEN
        RAISE EXCEPTION 'You have already joined this event';
    END IF;

    -- Get the user's profile and lock it
    SELECT * INTO v_profile
    FROM profiles p
    WHERE p.id = $2
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found';
    END IF;

    -- Insert into event_participants
    INSERT INTO event_participants (event_id, user_id)
    VALUES ($1, $2);

    -- Update the event
    UPDATE events e
    SET volunteers_joined = e.volunteers_joined + 1
    WHERE e.id = $1;

    -- Update the profile
    UPDATE profiles p
    SET events_joined = p.events_joined + 1
    WHERE p.id = $2;

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
        WHERE e.id = $1
    );
END;
$$; 