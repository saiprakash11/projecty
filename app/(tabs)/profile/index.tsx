import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, Image, Pressable, TextInput, RefreshControl, Alert } from 'react-native';
import { Settings, Award, Clock, Calendar, MapPin, CreditCard as Edit2, Camera, Check, LogOut } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useAuth } from '@/hooks/useAuth';
import { getProfile, updateProfile } from '@/lib/profiles';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

const BADGES = [
  { id: '1', name: 'First Event', description: 'Completed first volunteer event' },
  { id: '2', name: 'Environment Hero', description: 'Participated in 5 environmental events' },
  { id: '3', name: 'Community Leader', description: 'Led a volunteer initiative' },
];

const UPCOMING_EVENTS = [
  {
    id: '1',
    title: 'Beach Cleanup Drive',
    date: '2024-03-15',
    time: '09:00 AM',
    location: 'Sunset Beach',
  },
  {
    id: '2',
    title: 'Youth Mentorship Program',
    date: '2024-03-18',
    time: '02:00 PM',
    location: 'Community Center',
  },
];

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [eventsJoined, setEventsJoined] = useState(0);
  const [profileImage, setProfileImage] = useState('https://static.vecteezy.com/system/resources/previews/020/765/399/original/default-profile-account-unknown-icon-black-silhouette-free-vector.jpg');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showLogoutButton, setShowLogoutButton] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const profile = await getProfile(user.id);
      setName(profile.full_name);
      setBio(profile.bio || '');
      setEventsJoined(profile.events_joined);
      setProfileImage(profile.avatar_url || 'https://static.vecteezy.com/system/resources/previews/020/765/399/original/default-profile-account-unknown-icon-black-silhouette-free-vector.jpg');
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  };

  const handleSave = async () => {
    if (!user?.id) {
      setError('No user found. Please try logging in again.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Update the profile in the database
      await updateProfile(user.id, {
        full_name: name,
        bio: bio || null,
        avatar_url: profileImage,
      });

      // Refresh the profile data
      await fetchProfile();
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const handleImagePick = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to update your profile picture.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // Convert the image to a blob
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();

        // Upload the image to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(`${user?.id}/${Date.now()}.jpg`, blob, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get the public URL of the uploaded image
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(uploadData.path);

        // Update the profile with the new image URL
        setProfileImage(publicUrl);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to update profile picture. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace('/');
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerButtons}>
          <Pressable 
            style={styles.settingsButton}
            onPress={() => setShowLogoutButton(!showLogoutButton)}
          >
            <Settings size={24} color="#1A1A1A" />
          </Pressable>
          {showLogoutButton && (
            <Animated.View 
              entering={FadeIn}
              style={styles.logoutButton}
            >
              <Pressable 
                style={styles.logoutButtonContent}
                onPress={handleLogout}
              >
                <LogOut size={20} color="#EF4444" />
                <Text style={styles.logoutText}>Log Out</Text>
              </Pressable>
            </Animated.View>
          )}
          <Pressable 
            style={styles.editButton} 
            onPress={() => isEditing ? handleSave() : setIsEditing(true)}
            disabled={loading}
          >
            {isEditing ? (
              <Check size={24} color="#4B9EFF" />
            ) : (
              <Edit2 size={24} color="#1A1A1A" />
            )}
          </Pressable>
        </View>
        
        <View style={styles.profileHeader}>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: profileImage }}
              style={styles.profileImage}
            />
            {isEditing && (
              <Pressable style={styles.imageEditButton} onPress={handleImagePick}>
                <Camera size={20} color="#fff" />
              </Pressable>
            )}
          </View>
          
          {isEditing ? (
            <View style={styles.editFields}>
              <TextInput
                style={styles.nameInput}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                editable={!loading}
              />
              <TextInput
                style={styles.bioInput}
                value={bio}
                onChangeText={setBio}
                placeholder="Write a short bio"
                multiline
                editable={!loading}
              />
            </View>
          ) : (
            <>
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.email}>{user?.email}</Text>
              <Text style={styles.bio}>{bio}</Text>
            </>
          )}
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{eventsJoined}</Text>
            <Text style={styles.statLabel}>Events Joined</Text>
          </View>
        </View>
      </View>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
        <Text style={styles.sectionTitle}>Badges & Achievements</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.badgesContainer}
        >
          {BADGES.map((badge) => (
            <View key={badge.id} style={styles.badgeCard}>
              <Award size={32} color="#4B9EFF" />
              <Text style={styles.badgeName}>{badge.name}</Text>
              <Text style={styles.badgeDescription}>{badge.description}</Text>
            </View>
          ))}
        </ScrollView>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(400)} style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Events</Text>
        {UPCOMING_EVENTS.map((event) => (
          <View key={event.id} style={styles.eventCard}>
            <View style={styles.eventHeader}>
              <Text style={styles.eventTitle}>{event.title}</Text>
            </View>
            
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
          </View>
        ))}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 20,
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    margin: 20,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#F8FAFC',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  settingsButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  imageEditButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#4B9EFF',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  editFields: {
    width: '100%',
    alignItems: 'center',
  },
  nameInput: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
    width: '80%',
  },
  bioInput: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    width: '80%',
    minHeight: 60,
  },
  name: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#1A1A1A',
    marginBottom: 8,
  },
  email: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
  },
  bio: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: '80%',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#4B9EFF',
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#64748B',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#1A1A1A',
    marginBottom: 16,
  },
  badgesContainer: {
    marginLeft: -8,
    paddingLeft: 8,
  },
  badgeCard: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    width: 160,
    alignItems: 'center',
  },
  badgeName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#1A1A1A',
    marginTop: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  badgeDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  eventCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  eventHeader: {
    marginBottom: 12,
  },
  eventTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#1A1A1A',
  },
  eventDetails: {
    gap: 8,
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
  logoutButton: {
    position: 'absolute',
    top: 50,
    left: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 1,
  },
  logoutButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  logoutText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#EF4444',
  },
});