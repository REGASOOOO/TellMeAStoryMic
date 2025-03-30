"use client";

import React, { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import FallingPillars from "./components/FallingPillars";
import { fetchTestHistory } from "./utils/testHistory";

const SCENES = [
  {
    id: 1,
    name: "New-York",
    videoSrc: "/NY.mp4",
    defaultStartTime: 150,
    defaultEndTime: 155,
    duration: 5,
  },
  {
    id: 2,
    name: "Transtion",
    videoSrc: "/transition3.mp4",
    defaultStartTime: 9,
    defaultEndTime: 14,
    duration: 5,
  },
  {
    id: 3,
    name: "Rome",
    videoSrc: "/romev2.mp4",
    defaultStartTime: 215,
    defaultEndTime: 420,
  },
];

export default function Home() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [videoTime, setVideoTime] = useState("0:00");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [activeSceneId, setActiveSceneId] = useState(1);
  const [startTime, setStartTime] = useState(SCENES[0].defaultStartTime);
  const [endTime, setEndTime] = useState(SCENES[0].defaultEndTime);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(new THREE.Scene());
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sphereRef = useRef<THREE.Mesh | null>(null);
  const videoTextureRef = useRef<THREE.VideoTexture | null>(null);
  const vrButtonRef = useRef<HTMLElement | null>(null);
  const videoTimeIntervalRef = useRef<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [storySubmitted, setStorySubmitted] = useState(false);
  // Add a state to control video autoplay
  const [autoplayEnabled, setAutoplayEnabled] = useState(false);

  // State to store the test history
  const [testHistory, setTestHistory] = useState<any[]>([]);

  // Fetch the test history when component mounts or story is submitted
  useEffect(() => {
    if (storySubmitted) {
      fetchTestHistory()
        .then((data) => setTestHistory(Array.isArray(data) ? data : [data]))
        .catch((error) => console.error("Error fetching test history:", error));
    }
  }, [storySubmitted]);

  const handleStorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStorySubmitted(true);
    // Optional: Enable autoplay only after story is submitted if that's the desired behavior
    setAutoplayEnabled(true);
  };

  function cleanUpScene(scene: THREE.Scene) {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      }
    });
  }

  function switchScene(
    renderer: THREE.WebGLRenderer,
    newScene: THREE.Scene,
    camera: THREE.Camera
  ) {
    // Clean up the current scene
    if (renderer.xr.isPresenting && sceneRef.current) {
      cleanUpScene(sceneRef.current);
    }

    // Set the new scene
    sceneRef.current = newScene;

    // Set the new animation loop
    renderer.setAnimationLoop(() => {
      renderer.render(newScene, camera);
    });
  }

  const changeScene = (sceneId: number) => {
    const sceneData = SCENES.find((scene) => scene.id === sceneId);
    if (!sceneData) return;

    setActiveSceneId(sceneId);
    setStartTime(sceneData.defaultStartTime);
    setEndTime(sceneData.defaultEndTime);

    if (videoRef.current) {
      videoRef.current.src = sceneData.videoSrc;
      videoRef.current.currentTime = sceneData.defaultStartTime;

      // Only play the video if autoplay is enabled
      if (autoplayEnabled) {
        videoRef.current.play().catch((err) => {
          console.log(
            "Auto-play prevented after scene change. Click to play the video."
          );
        });
      }
    }

    // Create a new scene and switch to it
    const newScene = new THREE.Scene();
    switchScene(rendererRef.current!, newScene, cameraRef.current!);
  };

  // Modified to respect the autoplay setting
  useEffect(() => {
    if (activeSceneId === 1 && !isTransitioning && autoplayEnabled) {
      const transitionTimeout = setTimeout(() => {
        setIsTransitioning(true);
        changeScene(2);

        setTimeout(() => {
          changeScene(3);
          setIsTransitioning(false);
        }, (SCENES[1].duration ?? 5) * 1000);
      }, (SCENES[0].duration ?? 5) * 1000);
      return () => clearTimeout(transitionTimeout);
    }
  }, [activeSceneId, isTransitioning, autoplayEnabled]);

  useEffect(() => {
    if (!storySubmitted) return;

    if (!mountRef.current) return;
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

    const vrButton = VRButton.createButton(renderer);
    vrButtonRef.current = vrButton;
    document.body.appendChild(vrButton);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.minDistance = 1;
    controls.maxDistance = 40;

    const groundGeometry = new THREE.CircleGeometry(20, 32);
    const groundMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = Math.PI / 2;
    ground.position.y = -20;
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

    if (activeSceneId === 1 || activeSceneId === 2) {
      camera.position.set(1, 0, 1);
      camera.rotation.y = Math.PI / 4;
    } else {
      camera.position.set(-1, 0, 0);
    }
    camera.lookAt(0, 0, 0);

    controls.target.set(0, 0, 0);
    controls.update();

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

    const video = document.createElement("video");
    videoRef.current = video;

    const activeScene = SCENES.find((scene) => scene.id === activeSceneId);
    video.src = activeScene?.videoSrc || SCENES[0].videoSrc;
    video.crossOrigin = "anonymous";
    video.loop = false;
    video.muted = true;
    video.playsInline = true;

    video.addEventListener("timeupdate", () => {
      if (video.currentTime >= endTime) {
        video.currentTime = startTime;
      }
    });

    const videoTexture = new THREE.VideoTexture(video);
    videoTextureRef.current = videoTexture;
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBAFormat;
    videoTexture.mapping = THREE.EquirectangularReflectionMapping;

    const sphereGeometry = new THREE.SphereGeometry(500, 60, 40);
    sphereGeometry.scale(-1, 1, 1);

    const sphereMaterial = new THREE.MeshBasicMaterial({
      map: videoTexture,
    });

    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphereRef.current = sphere;
    scene.add(sphere);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(0, 10, 0);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040));

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    // Modified click handler to toggle video playback
    document.addEventListener("click", () => {
      if (video.paused) {
        video.currentTime = startTime;
        video
          .play()
          .then(() => {
            console.log("Video playing");
            setAutoplayEnabled(true); // Enable autoplay when user explicitly plays video
            if (videoTimeIntervalRef.current)
              clearInterval(videoTimeIntervalRef.current);
            videoTimeIntervalRef.current = window.setInterval(() => {
              setVideoTime(formatTime(video.currentTime));
            }, 1000);
          })
          .catch((err) => console.error("Error playing video:", err));
      } else {
        // Optional: Allow pausing by clicking again
        // video.pause();
        // setAutoplayEnabled(false);
      }
    });

    // Set initial video time without auto-playing
    video.currentTime = startTime;

    // Only attempt to play if autoplay is enabled
    if (autoplayEnabled) {
      video
        .play()
        .catch((err) => {
          console.log("Auto-play prevented. Click to play the video.");
        })
        .then(() => {
          if (video.played.length > 0) {
            // Only set up interval if video actually played
            if (videoTimeIntervalRef.current)
              clearInterval(videoTimeIntervalRef.current);
            videoTimeIntervalRef.current = window.setInterval(() => {
              setVideoTime(formatTime(video.currentTime));
            }, 1000);
          }
        });
    } else {
      // Just display the first frame without playing
      console.log("Video autoplay disabled. Click to play.");
    }

    function animate() {
      if (!renderer.xr.isPresenting) {
        controls.update();
      }
      if (scene.userData.animationFunctions) {
        scene.userData.animationFunctions.forEach((fn: Function) => fn());
      }
      if (video.readyState >= video.HAVE_CURRENT_DATA) {
        videoTexture.needsUpdate = true;
      }
      renderer.render(scene, camera);
    }

    renderer.setAnimationLoop(animate);

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    window.addEventListener("resize", handleResize);

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
  }, [storySubmitted, activeSceneId, startTime, endTime, autoplayEnabled]);

  // Function to modify start and end points
  const updateVideoSegment = (start: number, end: number) => {
    setStartTime(start);
    setEndTime(end);
    if (videoRef.current) {
      videoRef.current.currentTime = start;
    }
  };

  // Added play/pause controls for the UI
  const toggleVideoPlayback = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current
          .play()
          .then(() => setAutoplayEnabled(true))
          .catch((err) => console.error("Error playing video:", err));
      } else {
        videoRef.current.pause();
        setAutoplayEnabled(false);
      }
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh" }}>
      {!storySubmitted ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            backgroundColor: "#f0f0f0",
          }}
        >
          <h1 style={{ fontSize: "2.5rem", marginBottom: "20px" }}>
            Quel histoire vous voulez connaitre ?
          </h1>
          <form
            onSubmit={handleStorySubmit}
            style={{ width: "100%", maxWidth: "600px" }}
          >
            <input
              type="text"
              placeholder="Entrez votre histoire ici..."
              style={{
                width: "100%",
                padding: "15px",
                fontSize: "1.2rem",
                borderRadius: "8px",
                border: "1px solid #ccc",
                marginBottom: "20px",
              }}
            />
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "15px",
                fontSize: "1.2rem",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "#007BFF",
                color: "white",
                cursor: "pointer",
              }}
            >
              Soumettre
            </button>
          </form>
        </div>
      ) : (
        <div ref={mountRef} style={{ width: "100%", height: "100%" }}></div>
      )}
      {storySubmitted &&
        activeSceneId === 3 &&
        sceneRef.current &&
        cameraRef.current && (
          <FallingPillars scene={sceneRef.current} camera={cameraRef.current} />
        )}
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          left: "20px",
          backgroundColor: "rgba(0,0,0,0.7)",
          color: "white",
          padding: "10px",
          borderRadius: "5px",
          maxHeight: "200px",
          overflowY: "auto",
          width: "300px",
        }}
      >
        {testHistory.length > 0 ? (
          testHistory.map((history, index) => (
            <div
              key={index}
              style={{
                marginBottom: "10px",
                padding: "8px",
                borderBottom: "1px solid rgba(255,255,255,0.3)",
              }}
            >
              <h4 style={{ margin: "0 0 5px 0" }}>
                {history.title || `Story ${index + 1}`}
              </h4>
              <p style={{ margin: "0", fontSize: "14px" }}>
                {history.description || history.text || JSON.stringify(history)}
              </p>
              {history.timestamp && (
                <span style={{ fontSize: "12px", opacity: "0.7" }}>
                  {new Date(history.timestamp).toLocaleString()}
                </span>
              )}
            </div>
          ))
        ) : (
          <p>No history data available</p>
        )}
      </div>
    </div>
  );
}
