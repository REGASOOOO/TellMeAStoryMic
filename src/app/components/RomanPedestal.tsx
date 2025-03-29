// Création d'un nouveau composant pour le pilier romain
import { useEffect, useState, useRef } from "react";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

interface RomanPedestalProps {
  scene: THREE.Scene;
  position?: [number, number, number];
  scale?: [number, number, number];
  onLoaded?: () => void;
}

export default function RomanPedestal({
  scene,
  position = [25, -30, -10],
  scale = [0.5, 0.5, 0.5],
  onLoaded,
}: RomanPedestalProps) {
  // Utiliser useRef pour stocker le modèle et éviter les re-renders
  const modelRef = useRef<THREE.Group | null>(null);
  const isLoadedRef = useRef<boolean>(false);
  const isInitializedRef = useRef<boolean>(false);

  // Effet pour charger le modèle une seule fois
  useEffect(() => {
    // Éviter les appels multiples
    if (!scene || isInitializedRef.current) return;

    // Marquer comme initialisé pour éviter les chargements multiples
    isInitializedRef.current = true;

    // Ajouter une lumière pour éclairer le modèle 3D
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Activer les ombres dans le renderer
    if (scene.userData.renderer) {
      scene.userData.renderer.shadowMap.enabled = true;
      scene.userData.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    // Charger un modèle 3D avec le bon loader selon le format
    const gltfLoader = new GLTFLoader();
    const objLoader = new OBJLoader();
    const mtlLoader = new MTLLoader();

    // Fonction pour charger un modèle 3D selon son extension
    const loadModel = (modelPath: string) => {
      // Déterminer l'extension du fichier
      const extension = modelPath.split(".").pop()?.toLowerCase();

      if (extension === "glb" || extension === "gltf") {
        // Charger le modèle GLTF/GLB
        gltfLoader.load(
          modelPath,
          (gltf) => {
            const loadedModel = gltf.scene;
            setupModel(loadedModel);
          },
          (xhr) => {
            console.log((xhr.loaded / xhr.total) * 100 + "% chargé");
          },
          (error) => {
            console.error("Erreur lors du chargement du modèle 3D:", error);
          }
        );
      } else if (extension === "obj") {
        // Vérifier s'il existe un fichier MTL associé (même nom, extension .mtl)
        const mtlPath = modelPath.replace(".obj", ".mtl");

        // Essayer de charger le fichier MTL d'abord (matériaux)
        fetch(mtlPath)
          .then((response) => {
            if (response.ok) {
              // Le fichier MTL existe, chargeons-le d'abord
              mtlLoader.load(
                mtlPath,
                (materials) => {
                  materials.preload();
                  objLoader.setMaterials(materials);
                  // Puis charger l'OBJ
                  objLoader.load(
                    modelPath,
                    (object) => {
                      setupModel(object);
                    },
                    (xhr) => {
                      console.log((xhr.loaded / xhr.total) * 100 + "% chargé");
                    },
                    (error) => {
                      console.error(
                        "Erreur lors du chargement du modèle OBJ:",
                        error
                      );
                    }
                  );
                },
                undefined,
                (error) => {
                  console.warn("Pas de fichier MTL trouvé ou erreur:", error);
                  // Charger l'OBJ sans MTL
                  loadOBJWithoutMTL(modelPath);
                }
              );
            } else {
              // Pas de fichier MTL, charger l'OBJ directement
              loadOBJWithoutMTL(modelPath);
            }
          })
          .catch((error) => {
            // Erreur lors de la vérification du MTL, charger l'OBJ directement
            loadOBJWithoutMTL(modelPath);
          });
      } else {
        console.error("Format de fichier non pris en charge:", extension);
      }
    };

    // Fonction auxiliaire pour charger un OBJ sans MTL
    const loadOBJWithoutMTL = (objPath: string) => {
      objLoader.load(
        objPath,
        (object) => {
          setupModel(object);
        },
        (xhr) => {
          console.log((xhr.loaded / xhr.total) * 100 + "% chargé");
        },
        (error) => {
          console.error("Erreur lors du chargement du modèle OBJ:", error);
        }
      );
    };

    // Configurer le modèle une fois chargé
    const setupModel = (loadedModel: THREE.Group) => {
      // Ajuster la taille et la position du modèle
      loadedModel.scale.set(scale[0], scale[1], scale[2]);
      loadedModel.position.set(position[0], position[1], position[2]);

      // Configurer les ombres sans remplacer les matériaux du MTL
      loadedModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Conserver le matériau original du MTL
          // Juste activer les ombres
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      scene.add(loadedModel);
      modelRef.current = loadedModel;
      isLoadedRef.current = true;
      console.log("Modèle 3D chargé avec succès");

      // Ajouter un point lumineux pour mieux voir le modèle
      const spotLight = new THREE.SpotLight(0xffffff, 2);
      spotLight.position.set(0, 15, -5);
      spotLight.angle = Math.PI / 4;
      spotLight.penumbra = 0.1;
      spotLight.decay = 2;
      spotLight.distance = 200;

      spotLight.target = loadedModel;
      scene.add(spotLight);

      // Notifier le parent que le modèle est chargé
      if (onLoaded) {
        onLoaded();
      }
    };

    // Charger le modèle
    loadModel("/pedestal/roman_pedestal.obj");

    // Nettoyer les ressources lors du démontage du composant
    return () => {
      scene.remove(ambientLight);
      scene.remove(directionalLight);

      if (modelRef.current) {
        scene.remove(modelRef.current);
      }

      if (scene.userData.animationFunctions) {
        // Supprimer toutes les fonctions d'animation associées à ce composant
        // Idéalement, vous devriez stocker une référence à l'animation spécifique
        scene.userData.animationFunctions =
          scene.userData.animationFunctions.filter(
            (fn: Function) => !fn.toString().includes("rotation.y += 0.005")
          );
      }

      // Réinitialiser les refs
      isInitializedRef.current = false;
      isLoadedRef.current = false;
      modelRef.current = null;
    };
  }, [scene]); // Dépendance uniquement sur scene pour éviter les rechargements inutiles

  return null; // Ce composant ne rend rien visuellement dans le DOM
}
