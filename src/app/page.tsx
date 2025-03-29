"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";

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

    // Add more objects for spatial reference in VR
    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);

    // Create a video element
    const video = document.createElement("video");
    video.src = "/romev2.mp4"; // Replace with your video path
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
