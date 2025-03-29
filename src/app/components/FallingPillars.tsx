import { useEffect, useState, useRef } from "react";
import * as THREE from "three";

interface FallingPillarsProps {
  scene: THREE.Scene;
  camera?: THREE.Camera;
}

export default function FallingPillars({ scene, camera }: FallingPillarsProps) {
  const [pillars, setPillars] = useState<THREE.Group[]>([]);
  const cameraRef = useRef<THREE.Camera | null>(null);

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

    // Création des géométries et matériaux pour les piliers avec effet marbre
    const pillarGeometry = new THREE.CylinderGeometry(0.5, 0.6, 1, 32);

    // Matériau de base blanc pour simuler le marbre
    const pillarMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      specular: 0x111111,
      shininess: 100,
      reflectivity: 1,
      emissive: 0x444444,
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

    // Suivre quels piliers ont déjà leurs images créées
    const imageCreated: boolean[] = [];

    // Chargeur de textures pour les images
    const textureLoader = new THREE.TextureLoader();

    // Chemins des images à afficher au-dessus des piliers
    const imagePaths = ["/globe.svg", "/window.svg"];

    // Création des piliers initiaux
    function createInitialPillars() {
      const numberOfPillars = 2;
      const radius = 8;
      const arcAngle = Math.PI / 3;

      for (let i = 0; i < numberOfPillars; i++) {
        const angle = -Math.PI / 6 + (i * arcAngle) / (numberOfPillars - 1);
        const x = radius * Math.cos(angle);
        const z = radius * Math.sin(angle);

        const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
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

        // Initialiser le tracking des images créées
        imageCreated[i] = false;
      }

      setPillars(createdPillars);
    }

    // Créer une image au-dessus d'un pilier tombé
    function createImageAbovePillar(pillarIndex: number) {
      // Vérifier que l'image n'a pas déjà été créée pour ce pilier
      if (imageCreated[pillarIndex]) return;

      if (
        pillarIndex >= imagePaths.length ||
        pillarIndex >= createdPillars.length
      )
        return;

      const pillar = createdPillars[pillarIndex];

      // Marquer cette image comme créée pour éviter les duplications
      imageCreated[pillarIndex] = true;

      textureLoader.load(
        imagePaths[pillarIndex],
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

          // Positionner l'image juste au-dessus du pilier tombé
          imageGroup.position.set(
            pillar.position.x,
            2, // Position fixe au-dessus du pilier tombé
            pillar.position.z
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
      const currentTime = Date.now();

      // Vérifier si c'est le moment de faire tomber un nouveau pilier
      if (
        currentPillarIndex < createdPillars.length &&
        currentTime - lastFallTime > fallDelay
      ) {
        createdPillars[currentPillarIndex].userData.shouldFall = true;
        lastFallTime = currentTime;
        currentPillarIndex++;
      }

      // Animer les piliers qui doivent tomber
      createdPillars.forEach((pillarGroup, index) => {
        if (pillarGroup.userData.shouldFall && pillarGroup.position.y > 0) {
          pillarGroup.position.y -= 1; // Vitesse de chute

          // Arrêter au niveau du sol
          if (pillarGroup.position.y < 0) {
            pillarGroup.position.y = 0;

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
            createImageAbovePillar(index);
          }, 1000); // Délai avant de créer l'image
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

          // Légère animation de flottement
          imageData.group.position.y = 2 + Math.sin(currentTime * 0.001) * 0.2;

          // Effet de pulsation pour le halo
          if (imageData.mesh.children.length > 0) {
            const halo = imageData.mesh.children[0];
            if (
              halo instanceof THREE.Mesh &&
              halo.material instanceof THREE.MeshBasicMaterial
            ) {
              halo.material.opacity = 0.3 + Math.sin(currentTime * 0.002) * 0.2;
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

    // Animation frame function
    let animationFrameId: number;

    function animate() {
      animationFrameId = requestAnimationFrame(animate);
      animatePillars();
    }

    // Démarrer l'animation
    animate();

    // Cleanup à la désinstanciation du composant
    return () => {
      cancelAnimationFrame(animationFrameId);

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

      // Supprimer la lumière ambiante
      scene.remove(ambientLight);
    };
  }, [scene, camera]);

  return null;
}
