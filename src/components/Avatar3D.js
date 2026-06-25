// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 9/20 — 3D Avatar and Dashboard HUD Interface
// File: src/components/Avatar3D.js
// Generated: 2026-06-24

import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

const { width } = Dimensions.get('window');

const Avatar3D = ({ emotion = 'idle' }) => {
  const webViewRef = useRef(null);
  const [webViewReady, setWebViewReady] = useState(false);

  const emotionColors = {
    idle: '#00D4FF',
    listening: '#00FF88',
    alert: '#FF0044',
    failed: '#FF0044',
    success: '#FFD700',
    processing: '#0088FF'
  };

  const color = emotionColors[emotion] || emotionColors.idle;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: transparent; overflow: hidden; width: 100%; height: 100%; }
        #canvas-container { width: 100%; height: 100%; }
      </style>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
    </head>
    <body>
      <div id="canvas-container"></div>
      <script>
        (function() {
          let scene, camera, renderer, avatarGroup, wireframeMesh, coreMesh, glowMesh, particles, pointLight;
          let currentEmotion = 'idle';
          let glbLoaded = false;
          let animationId;

          const emotionColors = {
            idle: 0x00D4FF,
            listening: 0x00FF88,
            alert: 0xFF0044,
            failed: 0xFF0044,
            success: 0xFFD700,
            processing: 0x0088FF
          };

          function getColor(emotion) {
            return emotionColors[emotion] || emotionColors.idle;
          }

          function init() {
            const container = document.getElementById('canvas-container');
            const w = container.clientWidth || window.innerWidth;
            const h = container.clientHeight || window.innerHeight;

            scene = new THREE.Scene();

            camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
            camera.position.z = 4;

            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(w, h);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.setClearColor(0x000000, 0);
            container.appendChild(renderer.domElement);

            // Lighting
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
            scene.add(ambientLight);

            const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
            dirLight.position.set(5, 5, 5);
            scene.add(dirLight);

            pointLight = new THREE.PointLight(getColor(currentEmotion), 2, 15);
            pointLight.position.set(0, 0, 3);
            scene.add(pointLight);

            // Avatar group
            avatarGroup = new THREE.Group();
            scene.add(avatarGroup);

            // Try loading GLB
            if (typeof THREE.GLTFLoader !== 'undefined') {
              const loader = new THREE.GLTFLoader();
              loader.load(
                'file:///android_asset/avatars/manu_avatar.glb',
                function(gltf) {
                  glbLoaded = true;
                  const model = gltf.scene;

                  const box = new THREE.Box3().setFromObject(model);
                  const center = box.getCenter(new THREE.Vector3());
                  const size = box.getSize(new THREE.Vector3());
                  const maxDim = Math.max(size.x, size.y, size.z);
                  const scale = 1.5 / maxDim;

                  model.scale.set(scale, scale, scale);
                  model.position.sub(center.clone().multiplyScalar(scale));

                  model.traverse(function(child) {
                    if (child.isMesh && child.material) {
                      child.material.emissive = new THREE.Color(getColor(currentEmotion));
                      child.material.emissiveIntensity = 0.3;
                    }
                  });

                  avatarGroup.add(model);
                },
                undefined,
                function(error) {
                  console.log('GLB load failed:', error);
                  if (!glbLoaded) createProceduralAvatar();
                }
              );
            } else {
              createProceduralAvatar();
            }

            // Fallback timeout
            setTimeout(function() {
              if (!glbLoaded && avatarGroup.children.length === 0) {
                createProceduralAvatar();
              }
            }, 4000);

            // Particles
            createParticles();

            window.addEventListener('resize', onWindowResize);
            animate();
          }

          function createProceduralAvatar() {
            while (avatarGroup.children.length > 0) {
              avatarGroup.remove(avatarGroup.children[0]);
            }

            const color = getColor(currentEmotion);

            // Outer wireframe
            const wireGeo = new THREE.IcosahedronGeometry(1, 2);
            const wireMat = new THREE.MeshBasicMaterial({
              color: color,
              wireframe: true,
              transparent: true,
              opacity: 0.6
            });
            wireframeMesh = new THREE.Mesh(wireGeo, wireMat);
            avatarGroup.add(wireframeMesh);

            // Inner core
            const coreGeo = new THREE.IcosahedronGeometry(0.6, 1);
            const coreMat = new THREE.MeshBasicMaterial({
              color: color,
              transparent: true,
              opacity: 0.25
            });
            coreMesh = new THREE.Mesh(coreGeo, coreMat);
            avatarGroup.add(coreMesh);

            // Glow layer
            const glowGeo = new THREE.SphereGeometry(0.75, 32, 32);
            const glowMat = new THREE.MeshBasicMaterial({
              color: color,
              transparent: true,
              opacity: 0.1
            });
            glowMesh = new THREE.Mesh(glowGeo, glowMat);
            avatarGroup.add(glowMesh);

            // Secondary wireframe
            const wireGeo2 = new THREE.IcosahedronGeometry(1.15, 1);
            const wireMat2 = new THREE.MeshBasicMaterial({
              color: color,
              wireframe: true,
              transparent: true,
              opacity: 0.15
            });
            const wireframe2 = new THREE.Mesh(wireGeo2, wireMat2);
            avatarGroup.add(wireframe2);
          }

          function createParticles() {
            const count = 80;
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(count * 3);

            for (let i = 0; i < count * 3; i += 3) {
              positions[i] = (Math.random() - 0.5) * 6;
              positions[i + 1] = (Math.random() - 0.5) * 6;
              positions[i + 2] = (Math.random() - 0.5) * 6;
            }

            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            const material = new THREE.PointsMaterial({
              color: getColor(currentEmotion),
              size: 0.03,
              transparent: true,
              opacity: 0.6
            });

            particles = new THREE.Points(geometry, material);
            scene.add(particles);
          }

          function updateEmotion(emotion) {
            currentEmotion = emotion;
            const color = getColor(emotion);
            const threeColor = new THREE.Color(color);

            if (pointLight) pointLight.color = threeColor;
            if (wireframeMesh) wireframeMesh.material.color = threeColor;
            if (coreMesh) coreMesh.material.color = threeColor;
            if (glowMesh) glowMesh.material.color = threeColor;
            if (particles) particles.material.color = threeColor;

            avatarGroup.traverse(function(child) {
              if (child.isMesh && child.material && child.material.emissive) {
                child.material.emissive = threeColor;
              }
            });
          }

          function onWindowResize() {
            const container = document.getElementById('canvas-container');
            const w = container.clientWidth || window.innerWidth;
            const h = container.clientHeight || window.innerHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
          }

          function animate() {
            animationId = requestAnimationFrame(animate);
            const time = Date.now() * 0.001;

            if (avatarGroup) {
              avatarGroup.rotation.y += 0.008;
              avatarGroup.rotation.x = Math.sin(time * 0.5) * 0.1;
            }

            if (particles) {
              particles.rotation.y += 0.002;
              particles.rotation.x += 0.001;
            }

            if (glowMesh) {
              const scale = 1 + Math.sin(time * 2) * 0.05;
              glowMesh.scale.set(scale, scale, scale);
            }

            renderer.render(scene, camera);
          }

          // Message handlers
          document.addEventListener('message', function(e) {
            try {
              const data = JSON.parse(e.data);
              if (data.emotion) updateEmotion(data.emotion);
            } catch (err) {}
          });

          window.addEventListener('message', function(e) {
            try {
              const data = JSON.parse(e.data);
              if (data.emotion) updateEmotion(data.emotion);
            } catch (err) {}
          });

          init();
        })();
      </script>
    </body>
    </html>
  `;

  useEffect(() => {
    if (webViewReady && webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({ emotion }));
    }
  }, [emotion, webViewReady]);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.webview}
        backgroundColor="transparent"
        scrollEnabled={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mixedContentMode="always"
        onLoadEnd={() => setWebViewReady(true)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width * 0.55,
    height: width * 0.55,
    alignSelf: 'center',
  },
  webview: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
});

export default Avatar3D;
