import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Image, Platform, Alert } from 'react-native';
import { router, useRouter } from 'expo-router';
import { Camera, MapPin, Calendar, Clock, Users, Upload, X } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { createEvent } from '@/lib/events';
import { useAuth } from '@/hooks/useAuth';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

const CATEGORIES = [
  'Environment',
  'Education',
  'Community',
  'Health',
  'Animals',
  'Other',
];

export default function CreateEventScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [volunteers, setVolunteers] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const DEFAULT_EVENT_IMAGES = {
    Environment: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&q=80&w=800',
    Education: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=800',
    Community: 'https://images.unsplash.com/photo-1511795409834-432f31197ce3?auto=format&fit=crop&q=80&w=800',
    Health: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=800',
    Animals: 'https://images.unsplash.com/photo-1415369629372-26f2fe60c467?auto=format&fit=crop&q=80&w=800',
    Other: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&q=80&w=800',
  };

  const handleCreateEvent = async () => {
    if (!title || !description || !location || !category || !volunteers || !image) {
      setError('Please fill in all fields');
      return;
    }

    if (!user) {
      setError('You must be logged in to create an event');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const formattedDate = date.toISOString().split('T')[0];
      const formattedTime = time.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      await createEvent({
        title,
        description,
        date: formattedDate,
        time: formattedTime,
        location,
        category,
        volunteers_needed: parseInt(volunteers, 10),
        image_url: image,
        organizer_id: user.id
      });

      router.push('/(tabs)/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setTime(selectedTime);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant camera roll permissions to upload images');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      setUploading(true);
      
      // Convert image to blob
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Generate unique filename
      const filename = `${Date.now()}.jpg`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('event-images')
        .upload(filename, blob, {
          contentType: 'image/jpeg',
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('event-images')
        .getPublicUrl(filename);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to create events');
      return;
    }

    try {
      setUploading(true);
      
      let imageUrl = image;
      
      // If no image is selected, use the default image for the category
      if (!imageUrl && category) {
        imageUrl = DEFAULT_EVENT_IMAGES[category as keyof typeof DEFAULT_EVENT_IMAGES];
      }

      // If still no image, use a generic default
      if (!imageUrl) {
        imageUrl = DEFAULT_EVENT_IMAGES.Other;
      }

      const event = {
        title,
        description,
        date: date.toISOString().split('T')[0],
        time: time.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        location,
        category,
        volunteers_needed: parseInt(volunteers, 10),
        image_url: imageUrl,
        organizer_id: user.id,
      };

      await createEvent(event);
      router.back();
    } catch (error) {
      console.error('Create event error:', error);
      Alert.alert('Error', 'Failed to create event. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <X size={24} color="#1A1A1A" />
        </Pressable>
        <Text style={styles.title}>Create Event</Text>
        <Text style={styles.subtitle}>Share your initiative with the community</Text>
      </View>

      <Animated.View entering={FadeInDown} style={styles.form}>
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <View style={styles.imageUploadContainer}>
          {image ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: image }} style={styles.imagePreview} />
              <Pressable 
                style={styles.changeImageButton}
                onPress={pickImage}
              >
                <Text style={styles.changeImageText}>Change Image</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.uploadOptions}>
              <Pressable style={styles.uploadButton} onPress={pickImage}>
                <Camera size={24} color="#4B9EFF" />
                <Text style={styles.uploadButtonText}>Upload Custom Image</Text>
              </Pressable>
              <Text style={styles.orText}>OR</Text>
              <Text style={styles.defaultImageText}>
                A default image will be used based on the event category
              </Text>
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Event Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter event title"
            editable={!loading}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your event"
            multiline
            numberOfLines={4}
            editable={!loading}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.flex1]}>
            <Text style={styles.label}>Date</Text>
            <Pressable 
              style={styles.inputWithIcon}
              onPress={() => setShowDatePicker(true)}
              disabled={loading}
            >
              <Calendar size={20} color="#94A3B8" style={styles.inputIcon} />
              <Text style={styles.dateTimeText}>
                {date.toLocaleDateString()}
              </Text>
            </Pressable>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                minimumDate={new Date()}
              />
            )}
          </View>

          <View style={[styles.inputGroup, styles.flex1]}>
            <Text style={styles.label}>Time</Text>
            <Pressable 
              style={styles.inputWithIcon}
              onPress={() => setShowTimePicker(true)}
              disabled={loading}
            >
              <Clock size={20} color="#94A3B8" style={styles.inputIcon} />
              <Text style={styles.dateTimeText}>
                {time.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })}
              </Text>
            </Pressable>
            {showTimePicker && (
              <DateTimePicker
                value={time}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onTimeChange}
              />
            )}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Location</Text>
          <View style={styles.inputWithIcon}>
            <MapPin size={20} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="Event location"
              editable={!loading}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesContainer}
          >
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                style={[
                  styles.categoryButton,
                  category === cat && styles.categoryButtonActive
                ]}
                onPress={() => setCategory(cat)}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.categoryText,
                    category === cat && styles.categoryTextActive
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Volunteers Needed</Text>
          <View style={styles.inputWithIcon}>
            <Users size={20} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={volunteers}
              onChangeText={setVolunteers}
              placeholder="Number of volunteers"
              keyboardType="number-pad"
              editable={!loading}
            />
          </View>
        </View>

        <Pressable 
          style={[styles.createButton, loading && styles.createButtonDisabled]} 
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.createButtonText}>
            {loading ? 'Creating Event...' : 'Create Event'}
          </Text>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 32,
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#64748B',
  },
  form: {
    padding: 20,
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#EF4444',
    marginBottom: 16,
  },
  imageUploadContainer: {
    marginBottom: 20,
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  changeImageButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 8,
    borderRadius: 8,
  },
  changeImageText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#fff',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#4B9EFF',
    marginLeft: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  input: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#1A1A1A',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  flex1: {
    flex: 1,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  categoriesContainer: {
    flexDirection: 'row',
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#4B9EFF',
  },
  categoryText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#64748B',
  },
  categoryTextActive: {
    color: '#fff',
  },
  createButton: {
    backgroundColor: '#4B9EFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#fff',
  },
  dateTimeText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#1A1A1A',
    paddingVertical: 12,
  },
  uploadOptions: {
    alignItems: 'center',
    gap: 12,
  },
  orText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#64748B',
  },
  defaultImageText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
});