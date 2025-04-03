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
  image1: string;
  image2: string;
}

export default function FallingPillars({
  scene,
  camera,
  image1,
  image2,
}: FallingPillarsProps) {
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
    const imageBase64Sources = [image1, image2];

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

      // Charger la texture directement à partir de la source base64
      const texture = new THREE.TextureLoader().load(
        imageBase64Sources[pillarIndex]
      );
      texture.format = THREE.RGBAFormat; // Forcer le format RGBA pour la compatibilité
      texture.minFilter = THREE.LinearFilter; // Désactiver le mipmapping
      texture.magFilter = THREE.LinearFilter;
      texture.needsUpdate = true; // Forcer la mise à jour de la texture

      const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        color: 0xffffff, // Couleur blanche pour ne pas altérer la texture
        transparent: true,
        opacity: 1.0, // Assurez-vous que l'opacité est à 1
        depthTest: false, // Désactiver le depth test pour éviter les problèmes de rendu
        depthWrite: false, // Ne pas écrire dans le depth buffer
        sizeAttenuation: true, // L'échelle change avec la distance
      });

      // Créer un sprite au lieu d'un mesh plan
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(1.5, 1.5, 1);

      // Créer un groupe pour contenir le sprite et les effets
      const imageGroup = new THREE.Group();
      imageGroup.add(sprite);

      // Positionner l'image juste au-dessus du piédestal
      imageGroup.position.set(
        pillar.position.x - 0.1,
        1.5,
        pillar.position.z - 0.1
      );

      // Ajouter une lumière très puissante pour s'assurer de la visibilité en VR
      const imageLight = new THREE.PointLight(0xffffff, 5, 3);
      imageLight.position.set(0, 0, 0);
      imageGroup.add(imageLight);

      // Ajouter un éclairage secondaire coloré
      const colorLight = new THREE.PointLight(
        0x3388ff, // Couleur bleue pour le premier pilier
        2,
        2
      );
      colorLight.position.set(0, 0.5, 0);
      imageGroup.add(colorLight);

      scene.add(imageGroup);

      floatingImages.push({
        mesh: sprite as unknown as THREE.Mesh, // forcer le typage puisque nous utilisons Sprite
        group: imageGroup,
        pillarIndex: pillarIndex,
      });
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

          // Pas besoin d'orienter les sprites, ils font face automatiquement à la caméra
          // imageData.group.lookAt(cameraPosition);

          // Légère animation de flottement - ajustée pour la nouvelle position Y de base
          const pillarIndex = imageData.pillarIndex;

          // Animation de flottement au-dessus du piédestal
          const floatSpeed = isVRSession ? 0.0005 : 0.001;
          imageData.group.position.y =
            1.5 + Math.sin(currentTime * floatSpeed) * 0.2;

          // Animation de pulse pour la taille du sprite
          if (imageData.mesh) {
            const pulseSpeed = isVRSession ? 0.001 : 0.002;
            const pulseScale = 1 + Math.sin(currentTime * pulseSpeed) * 0.1;
            imageData.mesh.scale.set(1.5 * pulseScale, 1.5 * pulseScale, 1);
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

/**
 * Updates the images above the pillars with new base64 images.
 * @param scene The THREE.Scene containing the pillars and images.
 * @param pillarIndex The index of the pillar to update.
 * @param newBase64Image The new base64 image to set above the pillar.
 */
export function updatePillarImage(
  scene: THREE.Scene,
  pillarIndex: number,
  newBase64Image: string
) {
  // Find the pillar group by its index
  const pillarGroup = scene.children.find(
    (child) => child.userData.pillarIndex === pillarIndex
  ) as THREE.Group;

  if (!pillarGroup) {
    console.warn(`Pillar with index ${pillarIndex} not found.`);
    return;
  }

  // Find the image group above the pillar
  const imageGroup = pillarGroup.children.find(
    (child) => child.userData.isImageGroup
  ) as THREE.Group;

  if (!imageGroup) {
    console.warn(`Image group for pillar ${pillarIndex} not found.`);
    return;
  }

  // Load the new texture from the base64 image
  const texture = new THREE.TextureLoader().load(newBase64Image);
  texture.format = THREE.RGBAFormat;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  // Update the sprite material with the new texture
  const sprite = imageGroup.children.find(
    (child) => child instanceof THREE.Sprite
  ) as THREE.Sprite;

  if (sprite && sprite.material instanceof THREE.SpriteMaterial) {
    sprite.material.map = texture;
    sprite.material.needsUpdate = true;
  } else {
    console.warn(`Sprite for pillar ${pillarIndex} not found.`);
  }
}

/**
 * Updates the images above the two pillars with new base64 images.
 * @param scene The THREE.Scene containing the pillars and images.
 * @param newBase64Images An array of two base64 images to set above the two pillars.
 */
export function updatePillarsImages(
  scene: THREE.Scene,
  newBase64Images: [string, string]
) {
  console.log("Updating pillars images with:", newBase64Images);

  // Stocker tous les groupes contenant des sprites
  const spriteGroups: THREE.Group[] = [];

  // Trouver tous les groupes contenant des sprites dans la scène
  scene.traverse((object) => {
    if (object instanceof THREE.Group) {
      // Rechercher un sprite dans ce groupe
      const sprite = object.children.find(
        (child) => child instanceof THREE.Sprite
      );

      if (sprite) {
        spriteGroups.push(object);
        console.log("Found sprite group at position:", object.position);
      }
    }
  });

  // Si nous avons trouvé exactement 2 groupes
  if (spriteGroups.length === 2) {
    // Trier les groupes par position X (gauche à droite)
    spriteGroups.sort((a, b) => a.position.x - b.position.x);

    // Mettre à jour les deux sprites
    spriteGroups.forEach((group, index) => {
      if (index < newBase64Images.length && newBase64Images[index]) {
        const sprite = group.children.find(
          (child) => child instanceof THREE.Sprite
        ) as THREE.Sprite;

        if (sprite && sprite.material instanceof THREE.SpriteMaterial) {
          console.log(
            `Updating texture for pillar ${index} at position:`,
            group.position
          );

          // Créer une nouvelle texture et l'appliquer au sprite
          new THREE.TextureLoader().load(
            newBase64Images[index],
            (loadedTexture) => {
              console.log(`Texture for pillar ${index} loaded successfully`);

              // Configurer la texture
              loadedTexture.format = THREE.RGBAFormat;
              loadedTexture.minFilter = THREE.LinearFilter;
              loadedTexture.magFilter = THREE.LinearFilter;
              loadedTexture.needsUpdate = true;

              // Appliquer la texture au matériel du sprite
              sprite.material.map = loadedTexture;
              sprite.material.needsUpdate = true;
            },
            undefined,
            (error) => {
              console.error(
                `Error loading texture for pillar ${index}:`,
                error
              );
            }
          );
        }
      }
    });

    console.log("Successfully updated both pillar images");
  } else {
    console.warn(`Expected 2 sprite groups, found ${spriteGroups.length}`);
  }
}
