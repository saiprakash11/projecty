import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TextInput, Pressable, RefreshControl, Modal } from 'react-native';
import { Search, MapPin, Calendar, Clock, Users, X, Sun, Moon } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { getEvents, joinEvent } from '@/lib/events';
import { Database } from '@/types/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';

type Event = Database['public']['Tables']['events']['Row'] & {
  organizer: Database['public']['Tables']['profiles']['Row'];
};

type Volunteer = {
  id: string;
  full_name: string;
  avatar_url: string;
};

type VolunteerResponse = {
  volunteer: Volunteer;
};

type EventVolunteer = {
  id: string;
  full_name: string;
  avatar_url: string | null;
};

type EventVolunteerWithProfile = {
  volunteer_id: string;
  profiles: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
};

const CATEGORIES = ['All Events', 'Environment', 'Education', 'Community', 'Health', 'Animals', 'Others'];

export default function HomeScreen() {
  const { user, profile } = useAuth();
  const { isDark, theme, setTheme } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState('All Events');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joiningEvent, setJoiningEvent] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [showVolunteersModal, setShowVolunteersModal] = useState(false);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await getEvents();
      setEvents(data as Event[]);
      setError(null);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  };

  const handleJoinEvent = async (eventId: string) => {
    if (!user) {
      setError('Please sign in to join events');
      return;
    }

    try {
      setJoiningEvent(eventId);
      setError(null);
      
      console.log('Joining event:', eventId);
      const result = await joinEvent(eventId, user.id);
      console.log('Join event result:', result);
      
      if (result) {
        // Refresh events to get updated counts
        await fetchEvents();
      } else {
        throw new Error('Failed to join event: No response from server');
      }
    } catch (err) {
      console.error('Join event error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to join event. Please try again later.');
      }
    } finally {
      setJoiningEvent(null);
    }
  };

  const handleShowVolunteers = async (event: Event) => {
    try {
      setSelectedEvent(event);
      setError(null);
      
      console.log('Fetching volunteers for event:', event.id);
      
      const { data, error } = await supabase
        .from('event_volunteers')
        .select(`
          volunteer_id,
          profiles!inner (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('event_id', event.id)
        .returns<EventVolunteerWithProfile[]>();

      if (error) {
        console.error('Error fetching volunteers:', error);
        throw error;
      }

      console.log('Raw volunteer data:', JSON.stringify(data, null, 2));

      if (!data || data.length === 0) {
        console.log('No volunteers found for event:', event.id);
        setVolunteers([]);
        setShowVolunteersModal(true);
        return;
      }

      const volunteers = data.map(item => ({
        id: item.profiles.id,
        full_name: item.profiles.full_name,
        avatar_url: item.profiles.avatar_url || 'https://static.vecteezy.com/system/resources/previews/020/765/399/original/default-profile-account-unknown-icon-black-silhouette-free-vector.jpg'
      }));

      console.log('Processed volunteers:', JSON.stringify(volunteers, null, 2));
      setVolunteers(volunteers);
      setShowVolunteersModal(true);
    } catch (err) {
      console.error('Error in handleShowVolunteers:', err);
      setError('Failed to load volunteers. Please try again.');
      setShowVolunteersModal(false);
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesCategory = selectedCategory === 'All Events' || event.category === selectedCategory;
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <ScrollView 
      style={[styles.container, isDark && styles.darkContainer]} 
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.welcomeText, isDark && styles.darkText]}>Welcome back,</Text>
          <Text style={[styles.userName, isDark && styles.darkText]}>{profile?.full_name || 'Guest'}</Text>
        </View>
        <Pressable onPress={toggleTheme} style={styles.themeButton}>
          {isDark ? <Sun size={24} color="#4B9EFF" /> : <Moon size={24} color="#4B9EFF" />}
        </Pressable>
      </View>

      <View style={[styles.searchContainer, isDark && styles.darkSearchContainer]}>
        <Search size={20} color={isDark ? '#94A3B8' : '#64748B'} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, isDark && styles.darkSearchInput]}
          placeholder="Search events..."
          placeholderTextColor={isDark ? '#94A3B8' : '#64748B'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
        {CATEGORIES.map((category) => (
          <Pressable
            key={category}
            style={[
              styles.categoryButton,
              selectedCategory === category && styles.categoryButtonActive,
              isDark && styles.darkCategoryButton,
              selectedCategory === category && isDark && styles.darkCategoryButtonActive
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text style={[
              styles.categoryText,
              selectedCategory === category && styles.categoryTextActive,
              isDark && styles.darkCategoryText
            ]}>
              {category}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.eventsContainer}>
        {error && <Text style={styles.errorText}>{error}</Text>}
        {loading ? (
          <Text style={styles.loadingText}>Loading events...</Text>
        ) : filteredEvents.length === 0 ? (
          <Text style={styles.noEventsText}>No events found</Text>
        ) : (
          filteredEvents.map((event, index) => (
            <Animated.View key={event.id} entering={FadeInDown.delay(index * 100)} style={styles.eventCard}>
              <Image source={{ uri: event.image_url }} style={styles.eventImage} />
              <View style={styles.eventContent}>
                <View style={styles.eventHeader}>
                  <Text style={styles.eventCategory}>{event.category}</Text>
                  <View style={styles.organizerInfo}>
                    <Image source={{ uri: event.organizer?.avatar_url || '' }} style={styles.organizerImage} />
                    <Text style={styles.organizerName}>{event.organizer?.full_name || 'Anonymous'}</Text>
                  </View>
                </View>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <View style={styles.eventDetails}>
                  <View style={styles.eventDetailItem}>
                    <Calendar size={16} color="#64748B" />
                    <Text style={styles.eventDetailText}>{event.date}</Text>
                  </View>
                  <View style={styles.eventDetailItem}>
                    <Clock size={16} color="#64748B" />
                    <Text style={styles.eventDetailText}>{event.time}</Text>
                  </View>
                  <View style={styles.eventDetailItem}>
                    <MapPin size={16} color="#64748B" />
                    <Text style={styles.eventDetailText}>{event.location}</Text>
                  </View>
                </View>
                <View style={styles.volunteerInfo}>
                  <Users size={16} color="#4B9EFF" />
                  <Pressable onPress={() => handleShowVolunteers(event)}>
                    <Text style={styles.volunteerText}>
                      {event.volunteers_joined}/{event.volunteers_needed} volunteers
                    </Text>
                  </Pressable>
                  {event.volunteers_joined >= event.volunteers_needed && (
                    <Text style={styles.eventFullText}>Event Full</Text>
                  )}
                </View>
                <Pressable
                  style={[
                    styles.joinButton,
                    (event.volunteers_joined >= event.volunteers_needed || joiningEvent === event.id) && styles.joinButtonDisabled
                  ]}
                  onPress={() => handleJoinEvent(event.id)}
                  disabled={event.volunteers_joined >= event.volunteers_needed || joiningEvent === event.id}
                >
                  <Text style={styles.joinButtonText}>
                    {joiningEvent === event.id
                      ? 'Joining...'
                      : event.volunteers_joined >= event.volunteers_needed
                      ? 'Event Full'
                      : 'Join Event'}
                  </Text>
                </Pressable>
              </View>
            </Animated.View>
          ))
        )}
      </View>

      <Modal
        visible={showVolunteersModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowVolunteersModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Volunteers</Text>
              <Pressable onPress={() => setShowVolunteersModal(false)}>
                <X size={24} color="#64748B" />
              </Pressable>
            </View>
            
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : volunteers.length === 0 ? (
              <Text style={styles.noVolunteersText}>No volunteers yet</Text>
            ) : (
              <ScrollView style={styles.volunteersList}>
                {volunteers.map((volunteer) => (
                  <View key={volunteer.id} style={styles.volunteerItem}>
                    <Image 
                      source={{ uri: volunteer.avatar_url || 'https://static.vecteezy.com/system/resources/previews/020/765/399/original/default-profile-account-unknown-icon-black-silhouette-free-vector.jpg' }} 
                      style={styles.volunteerAvatar}
                    />
                    <Text style={styles.volunteerName}>{volunteer.full_name}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  darkContainer: {
    backgroundColor: '#1A1A1A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  welcomeText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#64748B',
  },
  darkText: {
    color: '#94A3B8',
  },
  userName: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#1A1A1A',
  },
  themeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  darkSearchContainer: {
    backgroundColor: '#2D2D2D',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#1A1A1A',
  },
  darkSearchInput: {
    color: '#FFFFFF',
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    marginRight: 8,
  },
  darkCategoryButton: {
    backgroundColor: '#2D2D2D',
  },
  categoryButtonActive: {
    backgroundColor: '#4B9EFF',
  },
  darkCategoryButtonActive: {
    backgroundColor: '#4B9EFF',
  },
  categoryText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#64748B',
  },
  darkCategoryText: {
    color: '#94A3B8',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  eventsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginVertical: 20,
  },
  loadingText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginVertical: 20,
  },
  noEventsText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginVertical: 20,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  eventImage: {
    width: '100%',
    height: 200,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  eventContent: {
    padding: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventCategory: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#4B9EFF',
  },
  organizerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  organizerImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  organizerName: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#64748B',
  },
  eventTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#1A1A1A',
    marginBottom: 12,
  },
  eventDetails: {
    gap: 8,
    marginBottom: 16,
  },
  eventDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventDetailText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#64748B',
    marginLeft: 8,
  },
  volunteerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  volunteerText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#4B9EFF',
    marginLeft: 8,
    marginRight: 8,
  },
  eventFullText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#EF4444',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  joinButton: {
    backgroundColor: '#4B9EFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  joinButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  joinButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#fff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#1A1A1A',
  },
  volunteersList: {
    maxHeight: '80%',
  },
  volunteerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  volunteerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  volunteerName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#1A1A1A',
  },
  noVolunteersText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 20,
  },
});