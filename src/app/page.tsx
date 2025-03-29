"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import FallingPillars from "./components/FallingPillars";

const SCENES = [
  {
    id: 1,
    name: "Rome",
    videoSrc: "/romev2.mp4",
    defaultStartTime: 215,
    defaultEndTime: 420,
  },
  {
    id: 2,
    name: "Petra",
    videoSrc: "/romev2.mp4",
    defaultStartTime: 200,
    defaultEndTime: 400,
  },
];

export default function Home() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [videoTime, setVideoTime] = useState("0:00");
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // État pour gérer les scènes
  const [activeSceneId, setActiveSceneId] = useState(1);

  // États individuels pour chaque scène
  const [startTime, setStartTime] = useState(SCENES[0].defaultStartTime);
  const [endTime, setEndTime] = useState(SCENES[0].defaultEndTime);

  // Références pour le rendu et l'animation
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(new THREE.Scene());
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sphereRef = useRef<THREE.Mesh | null>(null);
  const videoTextureRef = useRef<THREE.VideoTexture | null>(null);
  const vrButtonRef = useRef<HTMLElement | null>(null);

  // Référence pour l'intervalle de mise à jour du temps
  const videoTimeIntervalRef = useRef<number | null>(null);

  // Fonction pour changer de scène
  const changeScene = (sceneId: number) => {
    const sceneData = SCENES.find((scene) => scene.id === sceneId);
    if (!sceneData) return;

    setActiveSceneId(sceneId);

    // Mettre à jour les temps par défaut pour la nouvelle scène
    setStartTime(sceneData.defaultStartTime);
    setEndTime(sceneData.defaultEndTime);

    // Mettre à jour la vidéo
    if (videoRef.current) {
      videoRef.current.src = sceneData.videoSrc;
      videoRef.current.currentTime = sceneData.defaultStartTime;
      videoRef.current.play().catch((err) => {
        console.log(
          "Auto-play prevented after scene change. Click to play the video."
        );
      });
    }
  };

  useEffect(() => {
    if (!mountRef.current) return;

    // Créer la scène, la caméra et le renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    rendererRef.current = renderer;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.xr.enabled = true;

    mountRef.current.appendChild(renderer.domElement);

    // Ajouter le bouton VR
    const vrButton = VRButton.createButton(renderer);
    vrButtonRef.current = vrButton;
    document.body.appendChild(vrButton);

    // Contrôles pour la caméra
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.minDistance = 1;
    controls.maxDistance = 40;

    // Créer le sol et les éléments visuels (identique à votre code existant)
    const groundGeometry = new THREE.CircleGeometry(20, 32);
    const groundMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = Math.PI / 2;
    ground.position.y = -10;
    scene.add(ground);

    const centerGeometry = new THREE.CircleGeometry(1, 32);
    const centerMaterial = new THREE.MeshBasicMaterial({
      color: 0x3366ff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const centerMark = new THREE.Mesh(centerGeometry, centerMaterial);
    centerMark.rotation.x = Math.PI / 2;
    centerMark.position.y = -4.9;
    scene.add(centerMark);

    camera.position.set(-1, 0, 0);
    camera.lookAt(0, 0, 90);

    controls.target.set(0, 0, 0);
    controls.update();

    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);

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

    // Créer l'élément vidéo
    const video = document.createElement("video");
    videoRef.current = video;

    // Utiliser la source de la scène active
    const activeScene = SCENES.find((scene) => scene.id === activeSceneId);
    video.src = activeScene?.videoSrc || SCENES[0].videoSrc;
    video.crossOrigin = "anonymous";
    video.loop = false;
    video.muted = true;
    video.playsInline = true;

    // Gestion de la boucle vidéo
    video.addEventListener("timeupdate", () => {
      if (video.currentTime >= endTime) {
        video.currentTime = startTime;
      }
    });

    // Créer la texture vidéo
    const videoTexture = new THREE.VideoTexture(video);
    videoTextureRef.current = videoTexture;
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBAFormat;
    videoTexture.mapping = THREE.EquirectangularReflectionMapping;

    // Créer la sphère pour afficher la vidéo 360
    const sphereGeometry = new THREE.SphereGeometry(500, 60, 40);
    sphereGeometry.scale(-1, 1, 1);

    const sphereMaterial = new THREE.MeshBasicMaterial({
      map: videoTexture,
    });

    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphereRef.current = sphere;
    scene.add(sphere);

    // Ajouter une lumière pour voir les modèles 3D
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(0, 10, 0);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040));

    // Timer to update video time
    let videoTimeInterval: number;

    // Function to format time as mm:ss
    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    // Démarrer la lecture vidéo sur interaction
    document.addEventListener("click", () => {
      if (video.paused) {
        video.currentTime = startTime;
        video
          .play()
          .then(() => {
            console.log("Video playing");
            if (videoTimeIntervalRef.current)
              clearInterval(videoTimeIntervalRef.current);
            videoTimeIntervalRef.current = window.setInterval(() => {
              setVideoTime(formatTime(video.currentTime));
            }, 1000);
          })
          .catch((err) => console.error("Error playing video:", err));
      }
    });

    // Tentative d'auto-play
    video.currentTime = startTime;
    video
      .play()
      .catch((err) => {
        console.log("Auto-play prevented. Click to play the video.");
      })
      .then(() => {
        if (videoTimeIntervalRef.current)
          clearInterval(videoTimeIntervalRef.current);
        videoTimeIntervalRef.current = window.setInterval(() => {
          setVideoTime(formatTime(video.currentTime));
        }, 1000);
      });

    // Boucle d'animation
    function animate() {
      if (!renderer.xr.isPresenting) {
        controls.update();
      }

      // Exécuter toutes les fonctions d'animation enregistrées
      if (scene.userData.animationFunctions) {
        scene.userData.animationFunctions.forEach((fn: Function) => fn());
      }

      if (video.readyState >= video.HAVE_CURRENT_DATA) {
        videoTexture.needsUpdate = true;
      }

      renderer.render(scene, camera);
    }

    renderer.setAnimationLoop(animate);

    // Gestion du redimensionnement
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    window.addEventListener("resize", handleResize);

    // Nettoyage
    return () => {
      window.removeEventListener("resize", handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.setAnimationLoop(null);
      video.pause();
      video.src = "";

      if (videoTimeIntervalRef.current) {
        clearInterval(videoTimeIntervalRef.current);
      }

      if (vrButtonRef.current) {
        vrButtonRef.current.remove();
      }
    };
  }, [activeSceneId, startTime, endTime]); // Ajouter activeSceneId comme dépendance

  // Fonction pour modifier les points de début et de fin
  const updateVideoSegment = (start: number, end: number) => {
    setStartTime(start);
    setEndTime(end);
    if (videoRef.current) {
      videoRef.current.currentTime = start;
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }}></div>

      {/* Utilisation du composant FallingPillars avec triggerFall */}
      {SCENES[1] && sceneRef.current && cameraRef.current && (
        <FallingPillars scene={sceneRef.current} camera={cameraRef.current} />
      )}

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
      <div className="video-controls">
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
            className="time-input"
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
            className="time-input"
          />
        </div>
      </div>

      <div className="scene-selector">
        {SCENES.map((scene) => (
          <button
            key={scene.id}
            className={`scene-button ${
              activeSceneId === scene.id ? "active" : ""
            }`}
            onClick={() => changeScene(scene.id)}
          >
            {scene.name}
          </button>
        ))}
      </div>
    </div>
  );
}
