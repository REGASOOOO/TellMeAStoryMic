import { useEffect, useState, useRef } from "react";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

// Add declaration for window.renderer
declare global {
  interface Window {
    renderer?: {
      xr?: {
        isPresenting: boolean;
        addEventListener: (event: string, listener: () => void) => void;
      };
      setAnimationLoop: (callback: (() => void) | null) => void;
    };
  }
}

interface FallingPillarsProps {
  scene: THREE.Scene;
  camera?: THREE.Camera;
}

// Images en base64
const GLOBE_SVG_BASE64 =
  "data:image/svg+xml;base64,PHN2ZyBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+PGcgY2xpcC1wYXRoPSJ1cmwoI2EpIj48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTEwLjI3IDE0LjFhNi41IDYuNSAwIDAgMCAzLjY3LTMuNDVxLTEuMjQuMjEtMi43LjM0LS4zMSAxLjgzLS45NyAzLjFNOCAxNkE4IDggMCAxIDAgOCAwYTggOCAwIDAgMCAwIDE2bS40OC0xLjUyYTcgNyAwIDAgMS0uOTYgMEg3LjVhNCAwIDAgMS0uODQtMS4zMnEtLjM4LS44OS0uNjMtMi4wOGE0MCAwIDAgMCAzLjkyIDBxLS4yNSAxLjItLjYzIDIuMDhhNCAwIDAgMS0uODQgMS4zMXptMi45NC00Ljc2cTEuNjYtLjE1IDIuOTUtLjQzYTcgNyAwIDAgMCAwLTIuNThxLTEuMy0uMjctMi45NS0uNDNhMTggMCAwIDEgMCAzLjQ0bS0xLjI3LTMuNTRhMTcgMCAwIDEgMCAzLjY0YTM5IDAgMCAxLTQuMyAwYTE3IDAgMCAxIDAtMy42NCAzOSAwIDAgMSA0LjMgMG0xLjEtMS4xN3ExLjQ1LjEzIDIuNjkuMzRhNi41IDYuNSAwIDAgMC0zLjY3LTMuNDRxLjY1IDEuMjYuOTggMy4xTTguNDggMS41bC4wMS4wMnEuNDEuMzcuODQgMS4zMS4zOC44OS42MyAyLjA4YTQwIDAgMCAwLTMuOTIgMHEuMjUtMS4yLjYzLTIuMDhhNCAwIDAgMS44NS0xLjMyIDcgNyAwIDAgMSAuOTYgMG0tMi43NS40YTYuNSA2LjUgMCAwIDAtMy42NyAzLjQ0IDI5IDAgMCAxIDIuNy0uMzRxLjMxLTEuODMuOTctMy4xTTQuNTggNi4yOHEtMS42Ni4xNi0yLjk1LjQzYTcgNyAwIDAgMCAwIDIuNThxMS4zLjI3IDIuOTUuNDNhMTggMCAwIDEgMC0zLjQ0bS4xNyA0LjcxcS0xLjQ1LS4xMi0yLjY5LS4zNGE2LjUgNi41IDAgMCAwIDMuNjcgMy40NHEtLjY1LTEuMjctLjk4LTMuMSIgZmlsbD0iIzY2NiIvPjwvZz48ZGVmcz48Y2xpcFBhdGggaWQ9ImEiPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Ik0wIDBoMTZ2MTZIMHoiLz48L2NsaXBQYXRoPjwvZGVmcz48L3N2Zz4=";
const WINDOW_SVG_BASE64 =
  "data:image/svg+xml;base64,PHN2ZyBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+PHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xLjUgMi41aDEzdjEwYTEgMSAwIDAgMS0xIDFoLTExYTEgMSAwIDAgMS0xLTF6TTAgMWgxNnYxMS41YTIuNSAyLjUgMCAwIDEtMi41IDIuNWgtMTFBMi41IDIuNSAwIDAgMSAwIDEyLjV6bTMuNzUgNC41YS43NS43NSAwIDEgMCAwLTEuNS43NS43NSAwIDAgMCAwIDEuNU03IDQuNzVhLjc1Ljc1IDAgMSAxLTEuNSAwIC43NS43NSAwIDAgMSAxLjUgMG0xLjc1Ljc1YS43NS43NSAwIDEgMCAwLTEuNS43NS43NSAwIDAgMCAwIDEuNSIgZmlsbD0iIzY2NiIvPjwvc3ZnPg==";

export default function FallingPillars({ scene, camera }: FallingPillarsProps) {
  const [pillars, setPillars] = useState<THREE.Group[]>([]);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const pedestalModelRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (!scene) return;

    // Utiliser la caméra passée en prop ou rechercher dans la scène
    cameraRef.current = camera || null;

    // Chercher la caméra dans la scène si elle n'est pas fournie
    if (!cameraRef.current) {
      scene.traverse((object) => {
        if (
          object instanceof THREE.PerspectiveCamera ||
          object instanceof THREE.OrthographicCamera
        ) {
          cameraRef.current = object;
        }
      });
    }

    // Vérifier si nous sommes en mode VR
    let isVRSession = false;

    // Function pour vérifier l'état VR - appelée lors de chaque frame
    function checkVRState() {
      // Vérifier si le renderer est en session XR
      if (
        window.renderer &&
        window.renderer.xr &&
        window.renderer.xr.isPresenting
      ) {
        isVRSession = true;
      } else {
        isVRSession = false;
      }
    }

    // Précharger le modèle OBJ du piédestal romain
    const objLoader = new OBJLoader();
    objLoader.load(
      "/pedestal/roman_pedestal.obj",
      (object) => {
        // Appliquer le matériau au modèle
        object.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = new THREE.MeshPhongMaterial({
              color: 0xdddddd,
              specular: 0x111111,
              shininess: 100,
            });
          }
        });

        // Ajuster l'échelle et l'orientation si nécessaire
        object.scale.set(0.1, 0.1, 0.1);

        // Stocker le modèle pour une utilisation ultérieure
        pedestalModelRef.current = object;
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
      },
      (error) => {
        console.error("Error loading OBJ model:", error);
      }
    );

    // Création des géométries et matériaux pour les piliers avec effet marbre
    const pillarGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.8, 32);

    // Matériau de base blanc pour simuler le marbre (avec transparence)
    const pillarMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      specular: 0x111111,
      shininess: 100,
      reflectivity: 1,
      emissive: 0x444444,
      transparent: true,
      opacity: 1, // On commencera avec une opacité pleine puis on la réduira
    });

    // Paramètres d'animation
    const fallDelay = 1000;
    let lastFallTime = Date.now() + 2000;
    let currentPillarIndex = 0;
    const createdPillars: THREE.Group[] = [];
    const pillarLights: THREE.SpotLight[] = [];
    const floatingImages: {
      mesh: THREE.Mesh;
      group: THREE.Group;
      pillarIndex: number;
    }[] = [];
    const placedPedestals: THREE.Group[] = [];

    // Suivre quels piliers ont déjà leurs images créées et lesquels ont été remplacés
    const imageCreated: boolean[] = [];
    const pedestalPlaced: boolean[] = [];

    // Chargeur de textures pour les images
    const textureLoader = new THREE.TextureLoader();

    // Tableau des images en base64 au lieu des chemins
    const imageBase64Sources = [GLOBE_SVG_BASE64, WINDOW_SVG_BASE64];

    // Fonction pour placer le modèle 3D OBJ à l'endroit du pilier et rendre le pilier transparent
    function placeObjectAndFadePillar(pillarIndex: number) {
      // Vérifier si un piédestal a déjà été placé pour ce pilier
      if (pedestalPlaced[pillarIndex]) return;

      // Vérifier si le modèle est chargé
      if (!pedestalModelRef.current) {
        console.warn("Modèle de piédestal non chargé");
        return;
      }

      const pillarGroup = createdPillars[pillarIndex];

      // Cloner le modèle OBJ pour chaque pilier
      const pedestalModel = pedestalModelRef.current.clone();

      // Réduire l'échelle du piédestal - il est trop grand
      pedestalModel.scale.set(0.02, 0.02, 0.02); // Réduction significative de l'échelle

      // Copier exactement la position X et Z du pilier, mais fixer Y à -20 (sol)
      const pillarPosition = pillarGroup.position.clone();
      pedestalModel.position.set(
        pillarPosition.x - 0.1,
        -0.5, // Position Y au niveau du sol
        pillarPosition.z - 0.1
      );

      // Copier exactement la rotation du pilier
      pedestalModel.rotation.copy(pillarGroup.rotation);

      // Pour le debugging
      console.log(
        `Pilier position: ${pillarPosition.x}, ${pillarPosition.y}, ${pillarPosition.z}`
      );
      console.log(
        `Piédestal placé à: ${pedestalModel.position.x}, ${pedestalModel.position.y}, ${pedestalModel.position.z}`
      );

      // Ajouter à la scène
      scene.add(pedestalModel);
      placedPedestals.push(pedestalModel);

      // Rendre le pilier existant transparent progressivement
      const pillarMesh = pillarGroup.children.find(
        (child) => child instanceof THREE.Mesh
      ) as THREE.Mesh;
      if (
        pillarMesh &&
        pillarMesh.material instanceof THREE.MeshPhongMaterial
      ) {
        // Animation de fade out sur 1 seconde
        // Note: Pour rendre le piédestal plus petit, il faut modifier l'échelle ailleurs
        const startTime = Date.now();
        const duration = 1000; // ms
        const fadeOut = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);

          // Réduire l'opacité progressivement
          (pillarMesh.material as THREE.MeshPhongMaterial).opacity =
            1 - progress;

          if (progress < 1) {
            requestAnimationFrame(fadeOut);
          } else {
            // Complètement transparent, on peut cacher le pilier
            pillarMesh.visible = false;
          }
        };

        fadeOut();
      }

      // Marquer ce pilier comme traité
      pedestalPlaced[pillarIndex] = true;
    }

    // Création des piliers initiaux
    function createInitialPillars() {
      const numberOfPillars = 2;
      const radius = 4;
      const arcAngle = Math.PI / 3;

      for (let i = 0; i < numberOfPillars; i++) {
        const angle = -Math.PI / 6 + (i * arcAngle) / (numberOfPillars - 1);
        const x = radius * Math.cos(angle);
        const z = radius * Math.sin(angle);

        const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial.clone()); // Clone du matériau pour chaque pilier
        const pillarGroup = new THREE.Group();
        pillarGroup.add(pillar);

        pillarGroup.position.set(x, 20, z);
        pillarGroup.userData.shouldFall = false;
        pillarGroup.userData.landed = false;

        pillarGroup.lookAt(0, 20, -15);

        // Ajouter une lumière au-dessus du pilier
        const pillarLight = new THREE.SpotLight(
          0xffffdd,
          8,
          15,
          Math.PI / 4,
          0.5,
          1
        );
        pillarLight.position.set(0, 6, 0);
        pillarLight.target = pillar;

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(0, 10, 0);
        directionalLight.target = pillar;
        pillarGroup.add(directionalLight);

        pillarGroup.add(pillarLight);
        pillarLights.push(pillarLight);

        scene.add(pillarGroup);
        createdPillars.push(pillarGroup);

        // Stocker l'index du pilier pour référence future
        pillarGroup.userData.pillarIndex = i;

        // Initialiser le tracking des images créées et des piédestaux placés
        imageCreated[i] = false;
        pedestalPlaced[i] = false;
      }

      setPillars(createdPillars);
    }

    // Créer une image au-dessus d'un pilier tombé
    function createImageAbovePillar(pillarIndex: number) {
      // Vérifier que l'image n'a pas déjà été créée pour ce pilier
      if (imageCreated[pillarIndex]) return;

      if (
        pillarIndex >= imageBase64Sources.length ||
        pillarIndex >= createdPillars.length
      )
        return;

      const pillar = createdPillars[pillarIndex];

      // Marquer cette image comme créée pour éviter les duplications
      imageCreated[pillarIndex] = true;

      textureLoader.load(
        imageBase64Sources[pillarIndex],
        (texture) => {
          // Créer un plan avec l'image comme texture
          const imageGeometry = new THREE.PlaneGeometry(1.5, 1.5);
          const imageMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true,
          });

          // Créer l'image dans un groupe pour faciliter l'orientation
          const imageGroup = new THREE.Group();
          const imageMesh = new THREE.Mesh(imageGeometry, imageMaterial);
          imageGroup.add(imageMesh);

          // Positionner l'image juste au-dessus du piédestal
          imageGroup.position.set(
            pillar.position.x - 0.1, // Aligner avec le piédestal qui a un offset
            1.5, // Position Y juste au-dessus du piédestal (qui est à -0.5)
            pillar.position.z - 0.1 // Aligner avec le piédestal qui a un offset
          );

          // Ajouter un halo lumineux autour de l'image
          const haloGeometry = new THREE.RingGeometry(0.8, 1.2, 32);
          const haloMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffaa,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5,
          });

          const halo = new THREE.Mesh(haloGeometry, haloMaterial);
          halo.position.set(0, 0, -0.1);
          imageMesh.add(halo);

          scene.add(imageGroup);

          floatingImages.push({
            mesh: imageMesh,
            group: imageGroup,
            pillarIndex: pillarIndex,
          });
        },
        undefined,
        (error) => {
          console.error("Erreur lors du chargement de l'image:", error);
          // Réinitialiser le flag si le chargement échoue pour permettre une nouvelle tentative
          imageCreated[pillarIndex] = false;
        }
      );
    }

    // Animation des piliers et des images
    function animatePillars() {
      checkVRState(); // Vérifier l'état VR à chaque frame

      // Utiliser soit le timestamp passé à la fonction, soit l'horloge système
      // En VR, XR gère sa propre animation, donc on doit éviter les timers basés sur Date.now()
      const currentTime =
        window.renderer && window.renderer.xr && window.renderer.xr.isPresenting
          ? window.performance.now()
          : Date.now();

      // Le reste du code d'animation mais avec currentTime modifié pour être compatible VR
      // Vérifier si c'est le moment de faire tomber un nouveau pilier - adaptation pour VR
      if (
        currentPillarIndex < createdPillars.length &&
        currentTime - lastFallTime > fallDelay
      ) {
        createdPillars[currentPillarIndex].userData.shouldFall = true;
        lastFallTime = currentTime;
        currentPillarIndex++;
      }

      // Animer les piliers - utilisation d'une vitesse de chute basée sur le framerate, pas sur le temps
      createdPillars.forEach((pillarGroup, index) => {
        if (pillarGroup.userData.shouldFall && pillarGroup.position.y > 0) {
          // En VR, utiliser une vitesse constante par frame plutôt qu'une valeur fixe
          const fallSpeed = isVRSession ? 0.1 : 1; // Ajuster selon les besoins
          pillarGroup.position.y -= fallSpeed;

          // Arrêter au niveau du sol
          if (pillarGroup.position.y < -20) {
            pillarGroup.position.y = -20;

            // Si le pilier n'était pas déjà marqué comme atterri
            if (!pillarGroup.userData.landed) {
              pillarGroup.userData.landed = true;

              // Flash lumineux à l'impact
              if (pillarLights[index]) {
                pillarLights[index].intensity = 15;
                setTimeout(() => {
                  if (pillarLights[index]) {
                    pillarLights[index].intensity = 0;
                  }
                }, 200);
              }
            }
          }

          setTimeout(() => {
            placeObjectAndFadePillar(index);
            createImageAbovePillar(index);
          }, 500); // Délai avant de créer l'image
        }
      });

      // Orientation des images vers la caméra
      if (cameraRef.current) {
        const cameraPosition = new THREE.Vector3();
        cameraRef.current.getWorldPosition(cameraPosition);

        floatingImages.forEach((imageData) => {
          if (!imageData.group) return;

          // Faire en sorte que l'image regarde toujours la caméra
          imageData.group.lookAt(cameraPosition);

          // Légère animation de flottement - ajustée pour la nouvelle position Y de base
          const pillarIndex = imageData.pillarIndex;
          const pillar = createdPillars[pillarIndex];

          // Animation de flottement au-dessus du piédestal
          const floatSpeed = isVRSession ? 0.0005 : 0.001;
          imageData.group.position.y =
            1.5 + Math.sin(currentTime * floatSpeed) * 0.2;

          // Effet de pulsation pour le halo
          if (imageData.mesh.children.length > 0) {
            const halo = imageData.mesh.children[0];
            if (
              halo instanceof THREE.Mesh &&
              halo.material instanceof THREE.MeshBasicMaterial
            ) {
              const pulseSpeed = isVRSession ? 0.001 : 0.002;
              halo.material.opacity =
                0.3 + Math.sin(currentTime * pulseSpeed) * 0.2;
            }
          }
        });
      }
    }

    // Ajouter une lumière ambiante
    const ambientLight = new THREE.AmbientLight(0xcccccc, 1.5);
    scene.add(ambientLight);

    // Créer les piliers initiaux
    createInitialPillars();

    // Animation frame function - modifiée pour supporter WebXR
    let animationFrameId: number;

    // Se connecter à l'animation XR si disponible, sinon utiliser requestAnimationFrame standard
    function animate() {
      if (window.renderer && window.renderer.xr) {
        // Si renderer.xr existe, s'assurer que notre fonction est appelée lors de l'animation XR
        window.renderer.xr.addEventListener("sessionstart", () => {
          console.log("Session XR commencée - animations adaptées");
          isVRSession = true;
        });

        window.renderer.xr.addEventListener("sessionend", () => {
          console.log("Session XR terminée");
          isVRSession = false;
        });

        // S'assurer que animatePillars est appelé à chaque frame rendue
        window.renderer.setAnimationLoop(() => {
          animatePillars();
        });
      } else {
        // Méthode classique pour l'animation non-VR
        function animateFrame() {
          animationFrameId = requestAnimationFrame(animateFrame);
          animatePillars();
        }
        animateFrame();
      }
    }

    // Démarrer l'animation
    animate();

    // Cleanup à la désinstanciation du composant
    return () => {
      // Arrêter les animations
      if (window.renderer && window.renderer.xr) {
        window.renderer.setAnimationLoop(null);
      } else {
        cancelAnimationFrame(animationFrameId);
      }

      // Supprimer les piliers de la scène
      createdPillars.forEach((pillar) => {
        scene.remove(pillar);
      });

      // Supprimer les images flottantes
      floatingImages.forEach((imageData) => {
        if (imageData.group) {
          scene.remove(imageData.group);
        }
      });

      // Supprimer les piédestaux placés
      placedPedestals.forEach((pedestal) => {
        scene.remove(pedestal);
      });

      // Supprimer la lumière ambiante
      scene.remove(ambientLight);
    };
  }, [scene, camera]);

  return null;
}
