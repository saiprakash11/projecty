import { useCallback } from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function Welcome() {
  const handleGetStarted = useCallback(() => {
    router.push('/(auth)/signup');
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(75,158,255,0.1)', '#fff']}
        style={StyleSheet.absoluteFill}
      />
      
      <Animated.View entering={FadeIn.delay(300)} style={styles.header}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&q=80&w=1024' }}
          style={styles.heroImage}
        />
        <Animated.Text entering={FadeInDown.delay(600)} style={styles.title}>
          Connect & Make Impact
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(800)} style={styles.subtitle}>
          Join a community of changemakers and create meaningful experiences together
        </Animated.Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(1000)} style={styles.actions}>
        <AnimatedPressable 
          style={styles.primaryButton}
          onPress={handleGetStarted}
          entering={FadeInDown.delay(1200)}>
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </AnimatedPressable>
        
        <Link href="/(auth)/login" asChild>
          <AnimatedPressable 
            style={styles.secondaryButton}
            entering={FadeInDown.delay(1400)}>
            <Text style={styles.secondaryButtonText}>I already have an account</Text>
          </AnimatedPressable>
        </Link>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  heroImage: {
    width: 240,
    height: 240,
    borderRadius: 120,
    marginBottom: 40,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 32,
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: '80%',
  },
  actions: {
    padding: 20,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#4B9EFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#4B9EFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#fff',
  },
  secondaryButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#4B9EFF',
  },
});