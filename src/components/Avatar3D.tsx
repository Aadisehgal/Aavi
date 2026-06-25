import React, {useRef, useEffect, useState, useCallback} from 'react';
import {View, StyleSheet, ActivityIndicator, Text} from 'react-native';
import {GLView} from 'expo-gl';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';
import {useStore} from '../store/useStore';
import {useAvatar} from '../hooks/useAvatar';

// Mock GLTFLoader for React Native (simplified)
// In production, you'd need a proper GLTF loader that works with React Native
const MockGLTFLoader = {
  load: (url: string, onLoad: (gltf: any) => void, onProgress?: any, onError?: (err: any) => void) => {
    // This is a placeholder - actual GLB loading requires asset bundling
    // For now, we'll create a procedural avatar
    onLoad({scene: new THREE.Scene()});
  },
};

export function Avatar3D() {
  const {currentEmotion, isSpeaking} = useStore();
  const {currentAvatar} = useAvatar();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const glRef = useRef<any>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const avatarRef = useRef<THREE.Group | null>(null);
  const animationFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now());

  const onContextCreate = useCallback(async (gl: any) => {
    try {
      const {drawingBufferWidth: width, drawingBufferHeight: height} = gl;

      // Create scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1a1a2e);
      sceneRef.current = scene;

      // Create camera
      const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
      camera.position.set(0, 0, 3);
      cameraRef.current = camera;

      // Create renderer
      const renderer = new THREE.WebGLRenderer({
        canvas: {
          width,
          height,
          style: {},
          addEventListener: () => {},
          removeEventListener: () => {},
          clientWidth: width,
          clientHeight: height,
          getContext: () => gl,
        } as any,
        context: gl,
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(1);
      rendererRef.current = renderer;

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(2, 2, 2);
      scene.add(directionalLight);

      const backLight = new THREE.DirectionalLight(currentAvatar.color, 0.5);
      backLight.position.set(-2, 1, -2);
      scene.add(backLight);

      // Create procedural avatar (sphere with face features)
      const avatarGroup = new THREE.Group();

      // Head
      const headGeometry = new THREE.SphereGeometry(0.8, 32, 32);
      const headMaterial = new THREE.MeshStandardMaterial({
        color: currentAvatar.color,
        roughness: 0.3,
        metalness: 0.1,
      });
      const head = new THREE.Mesh(headGeometry, headMaterial);
      avatarGroup.add(head);

      // Eyes
      const eyeGeometry = new THREE.SphereGeometry(0.12, 16, 16);
      const eyeMaterial = new THREE.MeshStandardMaterial({color: 0xffffff});
      const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      leftEye.position.set(-0.25, 0.15, 0.65);
      avatarGroup.add(leftEye);

      const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      rightEye.position.set(0.25, 0.15, 0.65);
      avatarGroup.add(rightEye);

      // Pupils
      const pupilGeometry = new THREE.SphereGeometry(0.06, 16, 16);
      const pupilMaterial = new THREE.MeshStandardMaterial({color: 0x000000});
      const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
      leftPupil.position.set(-0.25, 0.15, 0.73);
      avatarGroup.add(leftPupil);

      const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
      rightPupil.position.set(0.25, 0.15, 0.73);
      avatarGroup.add(rightPupil);

      // Mouth (torus segment)
      const mouthGeometry = new THREE.TorusGeometry(0.15, 0.03, 8, 16, Math.PI);
      const mouthMaterial = new THREE.MeshStandardMaterial({color: 0x333333});
      const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
      mouth.position.set(0, -0.2, 0.7);
      mouth.rotation.x = Math.PI;
      avatarGroup.add(mouth);

      // Body
      const bodyGeometry = new THREE.CylinderGeometry(0.4, 0.6, 1.2, 16);
      const bodyMaterial = new THREE.MeshStandardMaterial({
        color: currentAvatar.color,
        roughness: 0.4,
      });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.position.set(0, -1.2, 0);
      avatarGroup.add(body);

      scene.add(avatarGroup);
      avatarRef.current = avatarGroup;

      // Animation loop
      const animate = () => {
        animationFrameRef.current = requestAnimationFrame(animate);

        const elapsed = (Date.now() - startTimeRef.current) / 1000;

        // Breathing animation
        if (avatarRef.current) {
          avatarRef.current.position.y = Math.sin(elapsed * 2) * 0.05;

          // Emotion-based animations
          switch (currentEmotion) {
            case 'happy':
              avatarRef.current.rotation.y = Math.sin(elapsed) * 0.1;
              break;
            case 'sad':
              avatarRef.current.rotation.x = 0.1;
              break;
            case 'angry':
              avatarRef.current.scale.setScalar(1 + Math.sin(elapsed * 10) * 0.02);
              break;
            case 'excited':
              avatarRef.current.rotation.z = Math.sin(elapsed * 3) * 0.05;
              break;
            case 'thinking':
              avatarRef.current.rotation.y = Math.sin(elapsed * 0.5) * 0.2;
              break;
            default:
              avatarRef.current.rotation.set(0, 0, 0);
          }

          // Lip sync when speaking
          if (isSpeaking) {
            const mouthScale = 0.8 + Math.sin(elapsed * 15) * 0.4;
            mouth.scale.set(1, mouthScale, 1);
          } else {
            mouth.scale.set(1, 1, 1);
          }
        }

        renderer.render(scene, camera);
        gl.endFrameEXP();
      };

      animate();
      setIsLoading(false);
    } catch (err) {
      setError('Failed to load 3D avatar');
      setIsLoading(false);
    }
  }, [currentEmotion, isSpeaking, currentAvatar]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={currentAvatar.color} />
          <Text style={styles.loadingText}>Loading Avatar...</Text>
        </View>
      )}
      <GLView
        style={styles.glView}
        onContextCreate={onContextCreate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  glView: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    zIndex: 1,
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  errorText: {
    color: '#ff6b6b',
    textAlign: 'center',
    padding: 20,
  },
});
