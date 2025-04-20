import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Image, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Camera, Upload } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { updateProfile } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function CreateProfile() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.user_metadata?.avatar_url || null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImagePick = () => {
    // TODO: Implement image picker
    setAvatarUrl(user?.user_metadata?.avatar_url || 'https://static.vecteezy.com/system/resources/previews/020/765/399/original/default-profile-account-unknown-icon-black-silhouette-free-vector.jpg');
  };

  const handleCreateProfile = async () => {
    if (!fullName) {
      setError('Please enter your full name');
      return;
    }

    if (!user) {
      setError('No user found. Please try logging in again.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await updateProfile(user.id, {
        full_name: fullName,
        bio: bio || null,
        avatar_url: avatarUrl || user?.user_metadata?.avatar_url,
      });

      router.replace('/(tabs)/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Animated.View entering={FadeIn} style={styles.header}>
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>Tell us a bit about yourself</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300)} style={styles.form}>
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <Pressable style={styles.imageUpload} onPress={handleImagePick}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.previewImage} />
          ) : (
            <View style={styles.uploadPlaceholder}>
              <Camera size={32} color="#94A3B8" />
              <Text style={styles.uploadText}>Add Profile Photo</Text>
              <Text style={styles.uploadSubtext}>Tap to choose a photo</Text>
            </View>
          )}
        </Pressable>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your full name"
            editable={!loading}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about yourself"
            multiline
            numberOfLines={4}
            editable={!loading}
          />
        </View>

        <AnimatedPressable
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleCreateProfile}
          disabled={loading}
          entering={FadeInDown.delay(600)}
        >
          <Text style={styles.createButtonText}>
            {loading ? 'Creating Profile...' : 'Complete Profile'}
          </Text>
        </AnimatedPressable>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    marginTop: 60,
    marginBottom: 40,
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
    flex: 1,
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#EF4444',
    marginBottom: 16,
  },
  imageUpload: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F8FAFC',
    marginBottom: 24,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  uploadPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
  },
  uploadSubtext: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
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
  createButton: {
    backgroundColor: '#4B9EFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#4B9EFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#fff',
  },
});