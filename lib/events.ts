import { supabase } from './supabase';
import { Database } from '@/types/supabase';

type Event = Database['public']['Tables']['events']['Row'];
type EventInsert = Database['public']['Tables']['events']['Insert'];

type Volunteer = {
  id: string;
  full_name: string;
  avatar_url: string;
};

type VolunteerResponse = {
  volunteer: Volunteer;
};

export async function createEvent(event: EventInsert) {
  try {
    const { data, error } = await supabase
      .from('events')
      .insert(event)
      .select(`
        *,
        organizer:profiles!organizer_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Create event error:', error);
    throw error;
  }
}

export async function getEvents() {
  try {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        organizer:profiles!organizer_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Get events error:', error);
    throw error;
  }
}

export async function joinEvent(eventId: string, userId: string) {
  try {
    // Ensure the parameters are strings and not objects
    if (typeof eventId !== 'string' || typeof userId !== 'string') {
      throw new Error('Invalid parameters: eventId and userId must be strings');
    }

    console.log('Attempting to join event:', { eventId, userId });

    const { data, error } = await supabase.rpc('join_event', {
      event_id: eventId,
      user_id: userId
    });

    if (error) {
      console.error('Join event RPC error:', error);
      // Check for specific error cases
      if (error.message.includes('Event not found')) {
        throw new Error('The event could not be found');
      } else if (error.message.includes('Event is full')) {
        throw new Error('This event is already full');
      } else if (error.message.includes('Profile not found')) {
        throw new Error('Your profile could not be found');
      } else if (error.message.includes('already joined')) {
        throw new Error('You have already joined this event');
      }
      throw new Error(`Failed to join event: ${error.message}`);
    }

    if (!data) {
      console.error('No data returned from join event operation');
      throw new Error('No data returned from join event operation');
    }

    // Verify the profile was updated
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('events_joined')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error verifying profile update:', profileError);
    } else {
      console.log('Profile events_joined count:', profile.events_joined);
    }

    console.log('Successfully joined event:', data);
    return data;
  } catch (error) {
    console.error('Join event error:', error);
    // Return a more user-friendly error message
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error('Failed to join event. Please try again later.');
  }
}

export async function getEventVolunteers(eventId: string): Promise<Volunteer[]> {
  try {
    const { data, error } = await supabase
      .from('event_volunteers')
      .select(`
        volunteer:profiles (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('event_id', eventId);

    if (error) {
      console.error('Error fetching volunteers:', error);
      throw error;
    }

    if (!data) {
      return [];
    }

    // Transform the data to match the expected format
    const volunteers = data.map(item => ({
      id: item.volunteer.id,
      full_name: item.volunteer.full_name,
      avatar_url: item.volunteer.avatar_url
    }));

    console.log('Fetched volunteers:', volunteers);
    return volunteers;
  } catch (error) {
    console.error('Get event volunteers error:', error);
    throw error;
  }
}