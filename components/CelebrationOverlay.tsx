import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { successBurst } from '../lib/haptics';

interface Props {
  visible: boolean;
  message?: string;
  subMessage?: string;
  onDismiss: () => void;
}

export default function CelebrationOverlay({ visible, message, subMessage, onDismiss }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const emojiScale = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      successBurst();
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.sequence([
          Animated.spring(emojiScale, { toValue: 1.3, useNativeDriver: true, bounciness: 14 }),
          Animated.spring(emojiScale, { toValue: 1.0, useNativeDriver: true, bounciness: 4 }),
        ]),
        Animated.sequence([
          Animated.delay(200),
          Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
      ]).start();

      const timer = setTimeout(onDismiss, 2800);
      return () => clearTimeout(timer);
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(emojiScale, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(textOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.container, { opacity }]}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onDismiss} activeOpacity={1}>
        <LinearGradient
          colors={['#0F0E17EE', '#1A1060EE', '#0F0E17EE']}
          style={[StyleSheet.absoluteFill, styles.gradient]}
        >
          <Animated.Text style={[styles.trophy, { transform: [{ scale: emojiScale }] }]}>
            {message?.includes('Challenge') ? '🏆' : '🎉'}
          </Animated.Text>
          <Animated.Text style={[styles.title, { opacity: textOpacity }]}>
            {message ?? 'All done!'}
          </Animated.Text>
          {subMessage && (
            <Animated.Text style={[styles.sub, { opacity: textOpacity }]}>{subMessage}</Animated.Text>
          )}
          <Animated.Text style={[styles.tap, { opacity: textOpacity }]}>tap to continue</Animated.Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { zIndex: 999 },
  gradient: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  trophy: { fontSize: 80 },
  title: { fontSize: 32, fontWeight: '800', color: '#fff', textAlign: 'center' },
  sub: { fontSize: 16, color: '#aaa', textAlign: 'center', paddingHorizontal: 32 },
  tap: { fontSize: 13, color: '#777', marginTop: 16, letterSpacing: 1 },
});
