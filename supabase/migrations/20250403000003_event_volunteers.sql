-- Function to get event volunteers
CREATE OR REPLACE FUNCTION get_event_volunteers(p_event_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.avatar_url
  FROM event_volunteers ev
  JOIN profiles p ON p.id = ev.volunteer_id
  WHERE ev.event_id = p_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_event_volunteers(uuid) TO authenticated; 