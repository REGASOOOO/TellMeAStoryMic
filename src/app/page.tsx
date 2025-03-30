"use client";

import React, { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import FallingPillars, {
  updatePillarsImages,
} from "./components/FallingPillars";
import { testHistory } from "./utils/const";
import { generateRomanStory } from "./utils/generateStory";

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
  const [autoplayEnabled, setAutoplayEnabled] = useState(false);
  const [storyPrompt, setStoryPrompt] = useState<string>("");
  const [transitioning, setTransitioning] = useState(false);

  type HistoryData = {
    chapters?: Array<{
      images?: Array<string | undefined>;
      [key: string]: any;
    }>;
    [key: string]: any;
  };

  const [history, setHistory] = useState<HistoryData>();
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleStorySubmitEnhanced = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransitioning(true);
    setTimeout(async () => {
      try {
        console.log("Generating story with prompt:", storyPrompt);
        setHistory(testHistory);
        setStorySubmitted(true);
        setAutoplayEnabled(true);
      } catch (error) {
        console.error("Error generating story:", error);
      }
    }, 800);
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
    if (renderer.xr.isPresenting && sceneRef.current) {
      cleanUpScene(sceneRef.current);
    }

    sceneRef.current = newScene;

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
      if (!sceneData.videoSrc) {
        console.error(`Scene ${sceneId} has no valid videoSrc`);
        return;
      }

      const videoPath = sceneData.videoSrc;
      console.log(`Changing to scene ${sceneId} with video source:`, videoPath);

      const newVideo = document.createElement("video");

      fetch(videoPath)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Video file not found: ${videoPath}`);
          }
          return response;
        })
        .then(() => {
          newVideo.src = videoPath;
          newVideo.crossOrigin = "anonymous";
          newVideo.loop = false;
          newVideo.muted = true;
          newVideo.playsInline = true;

          newVideo.addEventListener("timeupdate", () => {
            if (newVideo.currentTime >= endTime) {
              newVideo.currentTime = startTime;
            }
          });

          newVideo.load();
          newVideo.currentTime = sceneData.defaultStartTime;

          videoRef.current = newVideo;

          if (autoplayEnabled) {
            const playPromise = newVideo.play();
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  console.log(
                    `Video for scene ${sceneId} playing successfully`
                  );

                  if (videoTextureRef.current) {
                    videoTextureRef.current.source = new THREE.VideoTexture(
                      newVideo
                    ).source;
                    videoTextureRef.current.needsUpdate = true;
                  } else {
                    const videoTexture = new THREE.VideoTexture(newVideo);
                    videoTexture.minFilter = THREE.LinearFilter;
                    videoTexture.magFilter = THREE.LinearFilter;
                    videoTexture.format = THREE.RGBAFormat;
                    videoTexture.mapping =
                      THREE.EquirectangularReflectionMapping;
                    videoTextureRef.current = videoTexture;

                    if (
                      sphereRef.current &&
                      sphereRef.current.material instanceof
                        THREE.MeshBasicMaterial
                    ) {
                      sphereRef.current.material.map = videoTexture;
                      sphereRef.current.material.needsUpdate = true;
                    }
                  }
                })
                .catch((err) => {
                  console.error("Auto-play prevented after scene change:", err);
                });
            }
          }
        })
        .catch((error) => {
          console.error(error);
        });
    }

    const newScene = new THREE.Scene();
    if (rendererRef.current && cameraRef.current) {
      switchScene(rendererRef.current, newScene, cameraRef.current);
    } else {
      console.error("Renderer or camera not initialized");
    }
  };

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

    document.addEventListener("click", () => {
      if (video.paused) {
        video.currentTime = startTime;
        video
          .play()
          .then(() => {
            console.log("Video playing");
            setAutoplayEnabled(true);
            if (videoTimeIntervalRef.current)
              clearInterval(videoTimeIntervalRef.current);
            videoTimeIntervalRef.current = window.setInterval(() => {
              setVideoTime(formatTime(video.currentTime));
            }, 1000);
          })
          .catch((err) => console.error("Error playing video:", err));
      }
    });

    video.currentTime = startTime;

    if (autoplayEnabled) {
      video
        .play()
        .catch((err) => {
          console.log("Auto-play prevented. Click to play the video.");
        })
        .then(() => {
          if (video.played.length > 0) {
            if (videoTimeIntervalRef.current)
              clearInterval(videoTimeIntervalRef.current);
            videoTimeIntervalRef.current = window.setInterval(() => {
              setVideoTime(formatTime(video.currentTime));
            }, 1000);
          }
        });
    } else {
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

  useEffect(() => {
    if (
      !history ||
      !history.chapters ||
      currentChapterIndex >= history.chapters.length ||
      !storySubmitted ||
      activeSceneId !== 3 ||
      !sceneRef.current ||
      !cameraRef.current
    ) {
      return;
    }

    console.log(`Starting chapter ${currentChapterIndex}`);
    const currentChapter = history.chapters[currentChapterIndex];

    if (sceneRef.current && currentChapter.images) {
      updatePillarsImages(sceneRef.current, [
        currentChapter.images[0] || "/default-image1.jpg",
        currentChapter.images[1] || "/default-image2.jpg",
      ]);
    }

    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.pause();
      audioRef.current.src = "";
    }

    const audio = new Audio();
    audio.src = currentChapter.mp3;

    audio.onloadeddata = () => {
      console.log(
        `Audio for chapter ${currentChapterIndex} loaded, playing now`
      );
      audio
        .play()
        .then(() =>
          console.log(`Audio playing for chapter ${currentChapterIndex}`)
        )
        .catch((err) => console.error("Error playing audio:", err));
    };

    audio.oncanplaythrough = () => {
      audio.onended = () => {
        console.log(
          `Chapter ${currentChapterIndex} audio ended, moving to next chapter`
        );

        if (
          history.chapters &&
          currentChapterIndex < history.chapters.length - 1
        ) {
          setCurrentChapterIndex((prevIndex) => prevIndex + 1);
        } else {
          console.log("Last chapter completed");
        }
      };
    };

    audioRef.current = audio;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.onended = null;
        audioRef.current.oncanplaythrough = null;
        audioRef.current.onloadeddata = null;
      }
    };
  }, [currentChapterIndex, history, storySubmitted, activeSceneId]);

  const updateVideoSegment = (start: number, end: number) => {
    setStartTime(start);
    setEndTime(end);
    if (videoRef.current) {
      videoRef.current.currentTime = start;
    }
  };

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
          className={`home-container ${transitioning ? "fadeOut" : "fadeIn"}`}
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            backgroundImage:
              "url('https://i.ibb.co/8nj2T13j/colosseum-amphitheatre-ancient-colosseum-amphitheatre-wallpaper-98364d8890109c4830bc01ce98b2847a.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background:
                "radial-gradient(circle, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.8) 100%)",
              zIndex: 1,
            }}
          />
          <h1
            style={{
              fontSize: "2.8rem",
              marginBottom: "30px",
              color: "#f7f1a7",
              textShadow: "0 0 15px rgba(0,0,0,0.7)",
              zIndex: 2,
              position: "relative",
              fontFamily: "'Merriweather', serif",
              animation: "pulse 2s infinite alternate",
            }}
          >
            Tell me a story ...
          </h1>
          <form
            onSubmit={handleStorySubmitEnhanced}
            style={{
              width: "100%",
              maxWidth: "600px",
              zIndex: 2,
              position: "relative",
              padding: "20px",
              borderRadius: "12px",
              background: "rgba(0, 0, 0, 0.5)",
              backdropFilter: "blur(8px)",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)",
            }}
          >
            <input
              type="text"
              placeholder="Entrez votre histoire ici..."
              value={storyPrompt}
              onChange={(e) => setStoryPrompt(e.target.value)}
              list="suggestions"
              style={{
                width: "100%",
                padding: "18px",
                fontSize: "1.2rem",
                borderRadius: "10px",
                border: "2px solid #f7f1a7",
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                transition: "transform 0.3s ease, box-shadow 0.3s ease",
                outline: "none",
                color: "#000", // force input text to be black
              }}
              onFocus={(e) => {
                e.currentTarget.style.transform = "scale(1.02)";
                e.currentTarget.style.boxShadow =
                  "0 8px 20px rgba(0, 0, 0, 0.5)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "none";
              }}
              required
            />
            <datalist id="suggestions">
              <option value="Spartacus en révolte" />
              <option value="Romulus et Remus" />
              <option value="Legions invincibles" />
              <option value="Gladiateurs en furie" />
              <option value="Empereur conquérant" />
            </datalist>
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "18px",
                fontSize: "1.2rem",
                borderRadius: "10px",
                border: "none",
                marginTop: "20px",
                background: "linear-gradient(135deg, #f7f1a7, #e0c97a)",
                color: "#3c2a21",
                cursor: "pointer",
                transition: "transform 0.3s ease, box-shadow 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.03)";
                e.currentTarget.style.boxShadow =
                  "0 8px 20px rgba(0, 0, 0, 0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              Soumettre
            </button>
          </form>
          <p
            style={{
              position: "absolute",
              bottom: "20px",
              color: "#f7f1a7",
              fontSize: "0.95rem",
              textAlign: "center",
              zIndex: 2,
              width: "100%",
              maxWidth: "600px",
              textShadow: "0 0 8px rgba(0,0,0,0.7)",
            }}
          >
            Plongez dans un voyage immersif dans l'Empire romain dès votre première idée
          </p>
          <style
            dangerouslySetInnerHTML={{
              __html: `
              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
              }
              @keyframes fadeOut {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(-20px); }
              }
              @keyframes pulse {
                from { transform: scale(0.98); }
                to { transform: scale(1.02); }
              }
              .fadeIn {
                animation: fadeIn 0.8s forwards;
              }
              .fadeOut {
                animation: fadeOut 0.8s forwards;
              }
            `,
            }}
          />
        </div>
      ) : (
        <div ref={mountRef} style={{ width: "100%", height: "100%" }} className="fadeIn"></div>
      )}
      {storySubmitted &&
        activeSceneId === 3 &&
        sceneRef.current &&
        cameraRef.current && (
          <FallingPillars
            scene={sceneRef.current}
            camera={cameraRef.current}
            image1={
              history?.chapters?.[currentChapterIndex]?.images?.[0] ||
              "/default-image1.jpg"
            }
            image2={
              history?.chapters?.[currentChapterIndex]?.images?.[1] ||
              "/default-image2.jpg"
            }
          />
        )}
      <audio ref={audioRef} style={{ display: "none" }} />
    </div>
  );
}
