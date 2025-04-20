import React, { useState } from 'react';
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { pickImage, uploadImage } from '../lib/image-upload';

interface ImagePickerProps {
  currentImageUrl?: string | null;
  onImageSelected: (imageUrl: string) => void;
  aspect?: [number, number];
  size?: number;
}

export function ImagePicker({ 
  currentImageUrl, 
  onImageSelected,
  aspect = [1, 1],
  size = 100
}: ImagePickerProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePickImage = async () => {
    try {
      setIsLoading(true);
      const imageUri = await pickImage();
      
      if (imageUri) {
        const path = `uploads/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        const imageUrl = await uploadImage(imageUri, path);
        onImageSelected(imageUrl);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.imageContainer, { width: size, height: size }]} 
        onPress={handlePickImage}
        disabled={isLoading}
      >
        {currentImageUrl ? (
          <Image
            source={{ uri: currentImageUrl }}
            style={[styles.image, { width: size, height: size }]}
          />
        ) : (
          <MaterialIcons name="add-a-photo" size={size / 2} color="#666" />
        )}
        <View style={styles.overlay}>
          <MaterialIcons name="edit" size={24} color="white" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    borderRadius: 8,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 4,
    alignItems: 'center',
  },
}); 