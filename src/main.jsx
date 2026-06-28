import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DoorOpen, Monitor, RotateCcw, X } from 'lucide-react';
import * as THREE from 'three';
import { studySubjects } from './data/mockStudyContent.js';
import './styles/app.css';

const startPosition = new THREE.Vector3(0, 1.7, 20);
const houseDoorPosition = new THREE.Vector3(0, 1.7, -15.8);
const computerPosition = new THREE.Vector3(0, 1.7, -24.2);

function App() {
  const [studyOpen, setStudyOpen] = useState(false);
  const [isNearDoor, setIsNearDoor] = useState(false);
  const [isDoorOpen, setIsDoorOpen] = useState(false);
  const [isNearComputer, setIsNearComputer] = useState(false);
  const [subjectId, setSubjectId] = useState(studySubjects[0].id);
  const [videoId, setVideoId] = useState(studySubjects[0].videos[0].id);
  const resetWorldRef = useRef(() => {});
  const openDoorRef = useRef(() => {});

  const subject = useMemo(
    () => studySubjects.find((item) => item.id === subjectId) ?? studySubjects[0],
    [subjectId]
  );
  const video = useMemo(
    () => subject.videos.find((item) => item.id === videoId) ?? subject.videos[0],
    [subject, videoId]
  );

  useEffect(() => {
    function onKeyDown(event) {
      const key = event.key.toLowerCase();
      if (studyOpen && key === 'escape') {
        setStudyOpen(false);
        return;
      }

      if (!studyOpen && isNearDoor && !isDoorOpen && (key === 'e' || key === 'enter')) {
        openDoorRef.current();
        return;
      }

      if (!studyOpen && isNearComputer && (key === 'e' || key === 'enter')) {
        setStudyOpen(true);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDoorOpen, isNearComputer, isNearDoor, studyOpen]);

  function changeSubject(nextSubjectId) {
    const nextSubject = studySubjects.find((item) => item.id === nextSubjectId) ?? studySubjects[0];
    setSubjectId(nextSubject.id);
    setVideoId(nextSubject.videos[0].id);
  }

  return (
    <main className="game-shell">
      <FirstPersonWorld
        onDoorOpenChange={setIsDoorOpen}
        onNearComputerChange={setIsNearComputer}
        onNearDoorChange={setIsNearDoor}
        openDoorRef={openDoorRef}
        resetRef={resetWorldRef}
      />

      <Hud
        isDoorOpen={isDoorOpen}
        isNearComputer={isNearComputer}
        isNearDoor={isNearDoor}
        onReset={() => resetWorldRef.current()}
      />

      {isNearDoor && !isDoorOpen && (
        <button className="interaction-prompt" type="button" onClick={() => openDoorRef.current()}>
          <DoorOpen size={18} aria-hidden="true" />
          Abrir puerta
        </button>
      )}

      {isNearComputer && (
        <button className="interaction-prompt" type="button" onClick={() => setStudyOpen(true)}>
          <Monitor size={18} aria-hidden="true" />
          Abrir computadora
        </button>
      )}

      {studyOpen && (
        <StudyOverlay
          subject={subject}
          video={video}
          onSubjectChange={changeSubject}
          onVideoChange={setVideoId}
          onClose={() => setStudyOpen(false)}
        />
      )}
    </main>
  );
}

function FirstPersonWorld({ onDoorOpenChange, onNearComputerChange, onNearDoorChange, openDoorRef, resetRef }) {
  const mountRef = useRef(null);
  const nearDoorRef = useRef(false);
  const nearComputerRef = useRef(false);
  const doorOpenRef = useRef(false);

  useEffect(() => {
    const mount = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x8ed2f0);
    scene.fog = new THREE.Fog(0x8ed2f0, 30, 72);

    const camera = new THREE.PerspectiveCamera(74, mount.clientWidth / mount.clientHeight, 0.1, 120);
    camera.position.copy(startPosition);
    camera.rotation.order = 'YXZ';

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.HemisphereLight(0xffffff, 0x4d6b45, 2.2);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 2.8);
    sun.position.set(12, 20, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    scene.add(sun);

    const { doorPivot } = buildLobbyScene(scene);

    const keys = new Set();
    let yaw = 0;
    let pitch = 0;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    function resetCamera() {
      camera.position.copy(startPosition);
      yaw = 0;
      pitch = 0;
      camera.rotation.set(pitch, yaw, 0);
      doorOpenRef.current = false;
      doorPivot.rotation.y = 0;
      nearDoorRef.current = false;
      nearComputerRef.current = false;
      onDoorOpenChange(false);
      onNearDoorChange(false);
      onNearComputerChange(false);
    }

    resetRef.current = resetCamera;
    openDoorRef.current = () => {
      doorOpenRef.current = true;
      onDoorOpenChange(true);
      onNearDoorChange(false);
      nearDoorRef.current = false;
    };

    function onKeyDown(event) {
      const key = event.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key)) {
        keys.add(key);
        moveCameraForKey(key, 0.55);
        event.preventDefault();
      }
      if (key === 'r') resetCamera();
    }

    function onKeyUp(event) {
      keys.delete(event.key.toLowerCase());
    }

    function onPointerDown(event) {
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      mount.setPointerCapture?.(event.pointerId);
      renderer.domElement.requestPointerLock?.();
    }

    function onPointerMove(event) {
      if (!dragging) return;
      const dx = document.pointerLockElement === renderer.domElement ? event.movementX : event.clientX - lastX;
      const dy = document.pointerLockElement === renderer.domElement ? event.movementY : event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      yaw -= dx * 0.004;
      pitch = clamp(pitch - dy * 0.003, -0.72, 0.52);
      camera.rotation.set(pitch, yaw, 0);
    }

    function onMouseMove(event) {
      if (document.pointerLockElement !== renderer.domElement) return;
      yaw -= event.movementX * 0.004;
      pitch = clamp(pitch - event.movementY * 0.003, -0.72, 0.52);
      camera.rotation.set(pitch, yaw, 0);
    }

    function onPointerUp(event) {
      if (document.pointerLockElement === renderer.domElement) return;
      dragging = false;
      mount.releasePointerCapture?.(event.pointerId);
    }

    function onPointerLockChange() {
      dragging = document.pointerLockElement === renderer.domElement;
    }

    function onResize() {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    }

    function moveCameraForKey(key, step) {
      const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw) * -1);
      const right = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
      const move = new THREE.Vector3();

      if (key === 'w' || key === 'arrowup') move.add(forward);
      if (key === 's' || key === 'arrowdown') move.sub(forward);
      if (key === 'd' || key === 'arrowright') move.add(right);
      if (key === 'a' || key === 'arrowleft') move.sub(right);

      if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(step);
        camera.position.add(move);
        camera.position.x = clamp(camera.position.x, -27.5, 27.5);
        camera.position.z = clamp(camera.position.z, -27.5, 27.5);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onResize);
    document.addEventListener('mousemove', onMouseMove);
    mount.addEventListener('pointerdown', onPointerDown);
    mount.addEventListener('pointermove', onPointerMove);
    mount.addEventListener('pointerup', onPointerUp);
    mount.addEventListener('pointerleave', onPointerUp);
    document.addEventListener('pointerlockchange', onPointerLockChange);

    const clock = new THREE.Clock();
    let frameId = 0;

    function animate() {
      const delta = Math.min(clock.getDelta(), 0.04);
      const speed = 8.5 * delta;
      const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw) * -1);
      const right = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
      const move = new THREE.Vector3();

      if (keys.has('w') || keys.has('arrowup')) move.add(forward);
      if (keys.has('s') || keys.has('arrowdown')) move.sub(forward);
      if (keys.has('d') || keys.has('arrowright')) move.add(right);
      if (keys.has('a') || keys.has('arrowleft')) move.sub(right);

      if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(speed);
        camera.position.add(move);
        camera.position.x = clamp(camera.position.x, -27.5, 27.5);
        camera.position.z = clamp(camera.position.z, -27.5, 27.5);
        if (!doorOpenRef.current && camera.position.z < -15.25 && Math.abs(camera.position.x) < 1.8) {
          camera.position.z = -15.25;
        }
      }

      doorPivot.rotation.y += ((doorOpenRef.current ? -Math.PI * 0.62 : 0) - doorPivot.rotation.y) * 0.16;

      const nearDoor = !doorOpenRef.current && camera.position.distanceTo(houseDoorPosition) < 5;
      if (nearDoor !== nearDoorRef.current) {
        nearDoorRef.current = nearDoor;
        onNearDoorChange(nearDoor);
      }

      const nearComputer =
        doorOpenRef.current && (camera.position.distanceTo(computerPosition) < 7.4 || camera.position.z < -14.8);
      if (nearComputer !== nearComputerRef.current) {
        nearComputerRef.current = nearComputer;
        onNearComputerChange(nearComputer);
      }

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('mousemove', onMouseMove);
      mount.removeEventListener('pointerdown', onPointerDown);
      mount.removeEventListener('pointermove', onPointerMove);
      mount.removeEventListener('pointerup', onPointerUp);
      mount.removeEventListener('pointerleave', onPointerUp);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [onDoorOpenChange, onNearComputerChange, onNearDoorChange, openDoorRef, resetRef]);

  return <section className="three-world" ref={mountRef} aria-label="Mundo 3D en primera persona" />;
}

function buildLobbyScene(scene) {
  const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x57a957, roughness: 0.95 });
  const pathMaterial = new THREE.MeshStandardMaterial({ color: 0xc9ad72, roughness: 1 });
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xb8d4dd, roughness: 0.8 });
  const houseWall = new THREE.MeshStandardMaterial({ color: 0xe6c894, roughness: 0.9 });
  const roofMaterial = new THREE.MeshStandardMaterial({ color: 0xb64d43, roughness: 0.8 });
  const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x6f4a35, roughness: 0.85 });

  const ground = new THREE.Mesh(new THREE.BoxGeometry(60, 0.6, 60), groundMaterial);
  ground.position.y = -0.3;
  ground.receiveShadow = true;
  scene.add(ground);

  const path = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.08, 35), pathMaterial);
  path.position.set(0, 0.04, 2.5);
  path.receiveShadow = true;
  scene.add(path);

  const wallSpecs = [
    { position: [0, 3, -30], size: [60, 6, 1] },
    { position: [0, 3, 30], size: [60, 6, 1] },
    { position: [-30, 3, 0], size: [1, 6, 60] },
    { position: [30, 3, 0], size: [1, 6, 60] }
  ];

  wallSpecs.forEach((spec) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(...spec.size), wallMaterial);
    wall.position.set(...spec.position);
    wall.receiveShadow = true;
    wall.castShadow = true;
    scene.add(wall);
  });

  const houseGroup = new THREE.Group();
  houseGroup.position.set(0, 0, -20);

  const wallParts = [
    { position: [-4.75, 3.5, 4.5], size: [2.5, 7, 0.35] },
    { position: [4.75, 3.5, 4.5], size: [2.5, 7, 0.35] },
    { position: [0, 5.75, 4.5], size: [7, 2.5, 0.35] },
    { position: [0, 3.5, -4.5], size: [12, 7, 0.35] },
    { position: [-6, 3.5, 0], size: [0.35, 7, 9] },
    { position: [6, 3.5, 0], size: [0.35, 7, 9] }
  ];

  wallParts.forEach((part) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(...part.size), houseWall);
    wall.position.set(...part.position);
    wall.castShadow = true;
    wall.receiveShadow = true;
    houseGroup.add(wall);
  });

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(11.4, 0.18, 8.4),
    new THREE.MeshStandardMaterial({ color: 0xb9865f, roughness: 0.95 })
  );
  floor.position.y = 0.09;
  floor.receiveShadow = true;
  houseGroup.add(floor);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(8.8, 4.8, 4), roofMaterial);
  roof.position.y = 9.4;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  houseGroup.add(roof);

  const doorPivot = new THREE.Group();
  doorPivot.position.set(-1.25, 0, 4.72);
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.5, 4, 0.18), doorMaterial);
  door.position.set(1.25, 2, 0);
  door.castShadow = true;
  doorPivot.add(door);
  houseGroup.add(doorPivot);

  const windowMaterial = new THREE.MeshStandardMaterial({ color: 0x74c7df, roughness: 0.35 });
  [-3.8, 3.8].forEach((x) => {
    const window = new THREE.Mesh(new THREE.BoxGeometry(2, 1.8, 0.16), windowMaterial);
    window.position.set(x, 4.5, 4.7);
    houseGroup.add(window);
  });

  scene.add(houseGroup);

  const desk = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 1, 1.8),
    new THREE.MeshStandardMaterial({ color: 0x6a4635, roughness: 0.9 })
  );
  desk.position.set(0, 1.05, -24.4);
  desk.castShadow = true;
  scene.add(desk);

  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(2.7, 1.8, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x203336, roughness: 0.5 })
  );
  screen.position.set(0, 2.55, -24.08);
  screen.castShadow = true;
  scene.add(screen);

  const screenGlow = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 1.25, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x57c1c8, emissive: 0x1b6f74, emissiveIntensity: 0.6 })
  );
  screenGlow.position.set(0, 2.55, -23.92);
  scene.add(screenGlow);

  [
    [-17, -12],
    [18, -8],
    [-21, 7],
    [21, 13]
  ].forEach(([x, z]) => {
    const trunk = new THREE.Mesh(
      new THREE.BoxGeometry(1, 3.2, 1),
      new THREE.MeshStandardMaterial({ color: 0x7a5136, roughness: 0.9 })
    );
    trunk.position.set(x, 1.6, z);
    trunk.castShadow = true;
    scene.add(trunk);

    const leaves = new THREE.Mesh(
      new THREE.ConeGeometry(2.8, 5.5, 4),
      new THREE.MeshStandardMaterial({ color: 0x2f7f42, roughness: 0.9 })
    );
    leaves.position.set(x, 5.3, z);
    leaves.rotation.y = Math.PI / 4;
    leaves.castShadow = true;
    scene.add(leaves);
  });

  return { doorPivot };
}

function Hud({ isDoorOpen, isNearComputer, isNearDoor, onReset }) {
  return (
    <aside className="hud">
      <div>
        <strong>Lobby 3D</strong>
        <span>WASD o flechas para caminar</span>
        <span>Click en la escena para mirar con el mouse</span>
      </div>
      <div>
        <span>{isDoorOpen ? 'Entra a la casa y acercate a la computadora' : 'Camina por el sendero hasta la puerta'}</span>
        <span>E / Enter para interactuar cuando estes cerca</span>
      </div>
      <button type="button" onClick={onReset}>
        <RotateCcw size={16} aria-hidden="true" />
        Reiniciar
      </button>
      {isNearDoor && <p className="hud-ready">Estas frente a la puerta.</p>}
      {isNearComputer && <p className="hud-ready">Estas frente a la computadora.</p>}
    </aside>
  );
}

function StudyOverlay({ subject, video, onSubjectChange, onVideoChange, onClose }) {
  return (
    <section className="study-overlay" aria-label="Pantalla de estudio">
      <div className="study-window">
        <header className="study-header">
          <div>
            <span>Estudiemos Room</span>
            <h1>Pantalla de estudio</h1>
          </div>
          <button type="button" className="close-button" onClick={onClose} aria-label="Cerrar pantalla de estudio">
            <X size={22} aria-hidden="true" />
          </button>
        </header>

        <div className="study-grid">
          <section className="study-primary">
            <div className="selectors">
              <label>
                Materia
                <select value={subject.id} onChange={(event) => onSubjectChange(event.target.value)}>
                  {studySubjects.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Video mock
                <select value={video.id} onChange={(event) => onVideoChange(event.target.value)}>
                  {subject.videos.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="video-stage">
              <Monitor size={68} aria-hidden="true" />
              <h2>{video.title}</h2>
              <p>{video.duration} - Placeholder de video controlado</p>
            </div>

            <article className="lesson-card">
              <h3>{video.lessonTitle}</h3>
              <p>{video.description}</p>
            </article>
          </section>

          <aside className="study-secondary">
            <div className="calm-animation">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <h2>Estimulo tranquilo</h2>
            <p>{subject.ambientText}</p>
          </aside>
        </div>
      </div>
    </section>
  );
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

createRoot(document.getElementById('root')).render(<App />);
