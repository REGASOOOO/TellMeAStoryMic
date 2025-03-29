"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";

export default function Home() {
  const mountRef = useRef<HTMLDivElement>(null);

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

    // Add some content to the scene
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);

    // Create a large sphere around the camera with grid pattern
    const sphereGeometry = new THREE.SphereGeometry(50, 32, 32);

    // Create two materials for the sphere - one solid and one wireframe
    const sphereMaterialSolid = new THREE.MeshBasicMaterial({
      color: 0x87ceeb, // Sky blue color
      side: THREE.BackSide, // Render the inside of the sphere
      transparent: true,
      opacity: 0.8,
    });

    const sphereMaterialWireframe = new THREE.MeshBasicMaterial({
      color: 0x000000, // Black color for grid lines
      wireframe: true,
      side: THREE.BackSide,
    });

    // Create two spheres at the same position - one solid and one wireframe
    const sphereSolid = new THREE.Mesh(sphereGeometry, sphereMaterialSolid);
    const sphereWireframe = new THREE.Mesh(
      sphereGeometry,
      sphereMaterialWireframe
    );

    scene.add(sphereSolid);
    scene.add(sphereWireframe);

    // Add a ground plane
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshBasicMaterial({
      color: 0x228b22, // Forest green
      side: THREE.DoubleSide,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = Math.PI / 2; // Rotate to be horizontal
    ground.position.y = -10; // Position below the cube
    scene.add(ground);

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

    // Animation loop for VR
    function animate() {
      // Update controls only in non-VR mode
      if (!renderer.xr.isPresenting) {
        controls.update();
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

      // Remove VR button
      const vrButton = document.querySelector(".VRButton");
      if (vrButton) {
        vrButton.remove();
      }
    };
  }, []);

  return <div ref={mountRef} style={{ width: "100%", height: "100vh" }}></div>;
}
