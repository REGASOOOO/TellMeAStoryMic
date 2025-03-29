import { useEffect } from 'react';
import * as THREE from 'three';

interface ColorTransitionProps {
  scene: THREE.Scene;
  camera: THREE.Camera;
  duration?: number;
  startColor?: string;
  endColor?: string;
  onTransitionComplete?: () => void;
}

export default function ColorTransition({
  scene,
  camera,
  duration = 2.0,
  startColor = '#ffffff',
  endColor = '#8B4513',
  onTransitionComplete
}: ColorTransitionProps) {
  useEffect(() => {
    // Créer un plan qui couvre tout le champ de vision
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        progress: { value: 0.0 },
        startColor: { value: new THREE.Color(startColor) },
        endColor: { value: new THREE.Color(endColor) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float progress;
        uniform vec3 startColor;
        uniform vec3 endColor;
        varying vec2 vUv;
        void main() {
          vec3 color = mix(startColor, endColor, progress);
          gl_FragColor = vec4(color, progress);
        }
      `
    });

    const plane = new THREE.Mesh(geometry, material);
    plane.renderOrder = 999;
    plane.frustumCulled = false;

    // Créer une scène et caméra orthographique pour le rendu en overlay
    const overlayScene = new THREE.Scene();
    const overlayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    overlayScene.add(plane);

    let startTime = Date.now();
    
    function animate() {
      const elapsedTime = (Date.now() - startTime) / 1000;
      const progress = Math.min(elapsedTime / duration, 1.0);
      
      material.uniforms.progress.value = progress;
      
      if (progress < 1.0) {
        requestAnimationFrame(animate);
      } else {
        if (onTransitionComplete) {
          onTransitionComplete();
        }
        overlayScene.remove(plane);
      }
    }

    animate();

    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [duration, startColor, endColor, onTransitionComplete]);

  return null;
}