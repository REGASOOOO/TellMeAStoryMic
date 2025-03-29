"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import { TextureLoader } from 'three';

export default function Home() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [videoTime, setVideoTime] = useState("3:34");

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Enable XR functionality
    renderer.xr.enabled = true;

    // Append renderer to the DOM
    mountRef.current.appendChild(renderer.domElement);

    // Add VR button to the DOM
    document.body.appendChild(VRButton.createButton(renderer));

    // Add OrbitControls for mouse camera control
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Adds smooth damping effect
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5; // Control rotation speed
    controls.minDistance = 1; // Minimum zoom distance
    controls.maxDistance = 40; // Don't zoom out beyond the sphere

    // Position camera for better VR experience - slightly elevated
    camera.position.set(0, 1.6, 5); // 1.6 is approximate standing eye level

    // Create a primitive object to represent controller position
    const controllerModelFactory = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.1),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );

    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);

    // Create a video element
    const video = document.createElement("video");
    video.src = "/romev2.mp4";
    video.crossOrigin = "anonymous";
    video.loop = true;
    video.muted = true;
    video.playsInline = true;

    // Create video texture
    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBAFormat;
    videoTexture.mapping = THREE.EquirectangularReflectionMapping;

    // Create a sphere to display the 360 video
    const sphereGeometry = new THREE.SphereGeometry(500, 60, 40);
    // Flip the geometry inside out
    sphereGeometry.scale(-1, 1, 1);

    const sphereMaterial = new THREE.MeshBasicMaterial({
      map: videoTexture,
    });

    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(sphere);

    // Ajout de la physique avec Cannon.js
    const pillars: THREE.Mesh[] = [];
    const textureLoader = new TextureLoader();
    const marbleTexture = textureLoader.load('/marble-texture.jpg'); // Assurez-vous d'avoir cette texture
    const normalMap = textureLoader.load('/marble-normal.jpg');      // Optionnel: texture pour les reliefs
    const roughnessMap = textureLoader.load('/marble-roughness.jpg'); // Optionnel: texture pour la rugosité

    const pillarGeometry = new THREE.CylinderGeometry(0.5, 0.6, 4, 32);
    const pillarMaterial = new THREE.MeshStandardMaterial({ 
        map: marbleTexture,
        normalMap: normalMap,
        roughnessMap: roughnessMap,
        roughness: 0.5,
        metalness: 0.1,
        bumpScale: 0.02
    });

    // Fonction pour créer un nouveau pilier
    function createPillar() {
        const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
        
        // Position aléatoire en X et Z, mais gardez le pilier droit
        pillar.position.set(
            (Math.random() - 0.5) * 20, // X entre -10 et 10
            20,                         // Y fixé en hauteur
            (Math.random() - 0.5) * 20  // Z entre -10 et 10
        );
        
        // Rotations uniquement autour de l'axe Y pour garder le pilier debout
        pillar.rotation.set(
            0,
            Math.random() * Math.PI * 2,
            0
        );

        // Ajout d'éléments décoratifs au pilier (chapiteau et base)
        const capitolGeometry = new THREE.CylinderGeometry(0.7, 0.5, 0.3, 32);
        const baseGeometry = new THREE.CylinderGeometry(0.8, 0.6, 0.3, 32);
        
        const capitol = new THREE.Mesh(capitolGeometry, pillarMaterial);
        const base = new THREE.Mesh(baseGeometry, pillarMaterial);
        
        // Positionnement des éléments décoratifs
        capitol.position.y = 2;  // Haut du pilier
        base.position.y = -2;    // Bas du pilier
        
        // Grouper tous les éléments
        const pillarGroup = new THREE.Group();
        pillarGroup.add(pillar);
        pillarGroup.add(capitol);
        pillarGroup.add(base);
        
        // Positionner le groupe
        pillarGroup.position.copy(pillar.position);
        pillar.position.set(0, 0, 0);
        
        scene.add(pillarGroup);
        pillars.push(pillarGroup);
        
        return pillarGroup;
    }

    // Ajouter une lumière pour voir les piliers
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(0, 10, 0);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040));

    // Animation des piliers
    function animatePillars() {
        pillars.forEach((pillarGroup) => {
            if (pillarGroup.position.y > 0) {
                pillarGroup.position.y -= 0.1; // Vitesse de chute
                // Légère rotation pendant la chute (optionnel)
                pillarGroup.rotation.y += 0.01;
            }
        });
    }

    // Créer un nouveau pilier toutes les 2 secondes
    const pillarInterval = setInterval(() => {
      if (pillars.length < 20) { // Limite le nombre de piliers
        createPillar();
      }
    }, 2000);

    // Timer to update video time
    let videoTimeInterval: number;

    // Function to format time as mm:ss
    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    // Start video playback when user interacts
    document.addEventListener("click", () => {
      if (video.paused) {
        video
          .play()
          .then(() => {
            console.log("Video playing");
            // Start timer when video plays
            videoTimeInterval = window.setInterval(() => {
              setVideoTime(formatTime(video.currentTime));
            }, 1000);
          })
          .catch((err) => console.error("Error playing video:", err));
      }
    });

    // Auto-play attempt (may be blocked by browser)
    video
      .play()
      .catch((err) => {
        console.log("Auto-play prevented. Click to play the video.");
      })
      .then(() => {
        // Start timer if auto-play succeeds
        videoTimeInterval = window.setInterval(() => {
          setVideoTime(formatTime(video.currentTime));
        }, 1000);
      });

    // Animation loop for VR
    function animate() {
      // Update controls only in non-VR mode
      if (!renderer.xr.isPresenting) {
        controls.update();
      }

      animatePillars(); // Ajouter l'animation des piliers

      // Ensure video texture updates
      if (video.readyState >= video.HAVE_CURRENT_DATA) {
        videoTexture.needsUpdate = true;
      }

      renderer.render(scene, camera);
    }

    // Use the XR animation loop instead of requestAnimationFrame
    renderer.setAnimationLoop(animate);

    // Handle window resize
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    window.addEventListener("resize", handleResize);

    // Cleanup function
    return () => {
      window.removeEventListener("resize", handleResize);
      mountRef.current?.removeChild(renderer.domElement);
      renderer.setAnimationLoop(null);
      video.pause();
      video.src = "";

      // Clear the video time interval
      if (videoTimeInterval) {
        clearInterval(videoTimeInterval);
      }

      // Remove VR button
      const vrButton = document.querySelector(".VRButton");
      if (vrButton) {
        vrButton.remove();
      }

      clearInterval(pillarInterval);
      pillars.forEach(pillar => scene.remove(pillar));
    };
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }}></div>
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          left: "20px",
          background: "rgba(0,0,0,0.5)",
          color: "white",
          padding: "5px 10px",
          borderRadius: "5px",
          fontSize: "16px",
          zIndex: 100,
        }}
      >
        {videoTime}
      </div>
    </div>
  );
}