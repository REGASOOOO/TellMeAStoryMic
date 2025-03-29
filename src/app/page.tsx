"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";

export default function Home() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [videoTime, setVideoTime] = useState("0:00");
  // Référence pour le contrôle de la vidéo
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Paramètres pour le segment de vidéo à répéter (en secondes)
  const [startTime, setStartTime] = useState(215); // Début du segment
  const [endTime, setEndTime] = useState(420); // Fin du segment (30 secondes par défaut)

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

    // Remplacer le sol vert par un sol semi-transparent
    const groundGeometry = new THREE.CircleGeometry(20, 32);
    const groundMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = Math.PI / 2; // Rotation horizontale
    ground.position.y = -5; // Position légèrement plus haute pour une meilleure visibilité
    scene.add(ground);

    // Ajouter un disque plus petit pour marquer le centre
    const centerGeometry = new THREE.CircleGeometry(1, 32);
    const centerMaterial = new THREE.MeshBasicMaterial({
      color: 0x3366ff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const centerMark = new THREE.Mesh(centerGeometry, centerMaterial);
    centerMark.rotation.x = Math.PI / 2;
    centerMark.position.y = -4.9; // Légèrement au-dessus du sol
    scene.add(centerMark);

    // Position camera for better VR experience - slightly elevated
    camera.position.set(0, 1.6, 0); // Position centrale pour VR

    // Create a primitive object to represent controller position
    const controllerModelFactory = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.1),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );

    // Remplacer la grille par des repères circulaires
    const circleHelper = new THREE.Line(
      new THREE.CircleGeometry(10, 64).setFromPoints(
        Array.from({ length: 65 }).map((_, i) => {
          const theta = (i / 64) * Math.PI * 2;
          return new THREE.Vector3(
            Math.cos(theta) * 10,
            -4.9,
            Math.sin(theta) * 10
          );
        })
      ),
      new THREE.LineBasicMaterial({
        color: 0x888888,
        transparent: true,
        opacity: 0.4,
      })
    );
    scene.add(circleHelper);

    // Create a video element
    const video = document.createElement("video");
    videoRef.current = video;
    video.src = "/romev2.mp4"; // Replace with your video path
    video.crossOrigin = "anonymous";
    video.loop = false; // Désactiver la boucle automatique pour gérer notre propre boucle
    video.muted = true;
    video.playsInline = true;

    // Gérer la lecture en boucle de la section spécifique
    video.addEventListener("timeupdate", () => {
      // Si la vidéo dépasse la fin du segment, revenir au début du segment
      if (video.currentTime >= endTime) {
        video.currentTime = startTime;
      }
    });

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
        // S'assurer que la vidéo commence au début du segment
        video.currentTime = startTime;
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
    video.currentTime = startTime; // Commencer du point de départ défini
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
    };
  }, [startTime, endTime]);

  // Fonction pour modifier les points de début et de fin
  const updateVideoSegment = (start: number, end: number) => {
    setStartTime(start);
    setEndTime(end);
    // Mettre à jour le temps de lecture si la vidéo est chargée
    if (videoRef.current) {
      videoRef.current.currentTime = start;
    }
  };

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
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          background: "rgba(0,0,0,0.5)",
          color: "white",
          padding: "10px",
          borderRadius: "5px",
          zIndex: 100,
        }}
      >
        <div>
          <label htmlFor="startTime">Début: </label>
          <input
            id="startTime"
            type="number"
            min="0"
            max={endTime - 1}
            value={startTime}
            onChange={(e) =>
              updateVideoSegment(Number(e.target.value), endTime)
            }
            style={{ width: "60px", marginRight: "10px" }}
          />
          <label htmlFor="endTime">Fin: </label>
          <input
            id="endTime"
            type="number"
            min={startTime + 1}
            value={endTime}
            onChange={(e) =>
              updateVideoSegment(startTime, Number(e.target.value))
            }
            style={{ width: "60px" }}
          />
        </div>
      </div>
    </div>
  );
}
