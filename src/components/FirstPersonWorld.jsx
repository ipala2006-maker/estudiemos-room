import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const startPosition = new THREE.Vector3(0, 1.7, 20);
const houseDoorPosition = new THREE.Vector3(0, 1.7, -13.7);
const computerPosition = new THREE.Vector3(-3, 1.7, -23.3);
const tmpBox = new THREE.Box3();

export function FirstPersonWorld({
  onDoorOpenChange,
  onNearComputerChange,
  onNearDoorChange,
  resetRef,
  toggleDoorRef
}) {
  const mountRef = useRef(null);
  const nearDoorRef = useRef(false);
  const nearComputerRef = useRef(false);
  const doorOpenRef = useRef(false);

  useEffect(() => {
    const mount = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa9cfdd);
    scene.fog = new THREE.Fog(0xa9cfdd, 38, 88);

    const camera = new THREE.PerspectiveCamera(68, mount.clientWidth / mount.clientHeight, 0.1, 120);
    camera.position.copy(startPosition);
    camera.rotation.order = 'YXZ';

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.HemisphereLight(0xf7f0df, 0x60706a, 1.15);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff0ca, 3.35);
    sun.position.set(18, 24, 16);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 70;
    sun.shadow.camera.left = -34;
    sun.shadow.camera.right = 34;
    sun.shadow.camera.top = 34;
    sun.shadow.camera.bottom = -34;
    scene.add(sun);

    const softFill = new THREE.DirectionalLight(0xd7efff, 0.42);
    softFill.position.set(-18, 12, -8);
    scene.add(softFill);

    const { doorPivot } = buildLobbyScene(scene);

    const keys = new Set();
    let yaw = 0;
    let pitch = 0;
    let lastMouseX = null;
    let lastMouseY = null;
    let pointerLocked = false;

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
    toggleDoorRef.current = () => {
      doorOpenRef.current = !doorOpenRef.current;
      onDoorOpenChange(doorOpenRef.current);
    };

    function onKeyDown(event) {
      const key = event.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key)) {
        keys.add(key);
        event.preventDefault();
      }
      if (key === 'r') resetCamera();
    }

    function onKeyUp(event) {
      keys.delete(event.key.toLowerCase());
    }

    function onPointerLockChange() {
      pointerLocked = document.pointerLockElement === renderer.domElement;
      lastMouseX = null;
      lastMouseY = null;
    }

    function onCanvasClick() {
      renderer.domElement.requestPointerLock?.();
    }

    function onMouseMove(event) {
      if (pointerLocked) {
        yaw -= event.movementX * 0.0019;
        pitch = clamp(pitch - event.movementY * 0.0016, -0.58, 0.42);
        camera.rotation.set(pitch, yaw, 0);
        return;
      }

      if (lastMouseX == null || lastMouseY == null || !mount.matches(':hover')) {
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
        return;
      }

      const dx = event.clientX - lastMouseX;
      const dy = event.clientY - lastMouseY;
      lastMouseX = event.clientX;
      lastMouseY = event.clientY;
      yaw -= dx * 0.0015;
      pitch = clamp(pitch - dy * 0.0012, -0.58, 0.42);
      camera.rotation.set(pitch, yaw, 0);
    }

    function onResize() {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onResize);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    renderer.domElement.addEventListener('click', onCanvasClick);

    const clock = new THREE.Clock();
    let frameId = 0;

    function animate() {
      const delta = Math.min(clock.getDelta(), 0.04);
      const speed = 5.9 * delta;
      const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw) * -1);
      const right = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
      const move = new THREE.Vector3();

      if (isMoving(keys, 'w', 'arrowup')) move.add(forward);
      if (isMoving(keys, 's', 'arrowdown')) move.sub(forward);
      if (isMoving(keys, 'd', 'arrowright')) move.add(right);
      if (isMoving(keys, 'a', 'arrowleft')) move.sub(right);

      if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(speed);
        camera.position.add(move);
        camera.position.x = clamp(camera.position.x, -27.5, 27.5);
        camera.position.z = clamp(camera.position.z, -27.5, 27.5);

        if (!doorOpenRef.current && camera.position.z < -13.7 && Math.abs(camera.position.x) < 7.2) {
          camera.position.z = -13.7;
        }

        if (doorOpenRef.current && camera.position.z < -22.15 && Math.abs(camera.position.x) < 7.2) {
          camera.position.z = -22.15;
        }
      }

      doorPivot.rotation.y += ((doorOpenRef.current ? -Math.PI * 0.62 : 0) - doorPivot.rotation.y) * 0.16;

      const nearDoor = camera.position.distanceTo(houseDoorPosition) < 5;
      if (nearDoor !== nearDoorRef.current) {
        nearDoorRef.current = nearDoor;
        onNearDoorChange(nearDoor);
      }

      const isInsideHouse = camera.position.z < -17.2 && Math.abs(camera.position.x) < 7;
      const nearComputer = doorOpenRef.current && (isInsideHouse || camera.position.distanceTo(computerPosition) < 5.8);
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
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      renderer.domElement.removeEventListener('click', onCanvasClick);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [onDoorOpenChange, onNearComputerChange, onNearDoorChange, resetRef, toggleDoorRef]);

  return <section className="three-world" ref={mountRef} aria-label="Mundo 3D en primera persona" />;
}

function buildLobbyScene(scene) {
  const groundMaterial = makeMaterial(0x6f9f6a, 0.88);
  const pathMaterial = makeMaterial(0xcab47e, 0.8);
  const wallMaterial = makeMaterial(0xdbe5df, 0.62);
  const houseWall = makeMaterial(0xe5c98f, 0.7);
  const roofMaterial = makeMaterial(0x87463f, 0.58);
  const doorMaterial = makeMaterial(0x5a3d30, 0.58);

  const ground = new THREE.Mesh(new THREE.BoxGeometry(60, 0.6, 60), groundMaterial);
  ground.position.y = -0.3;
  ground.receiveShadow = true;
  scene.add(ground);
  addEdges(ground, 0x4d7750, 0.22);

  const path = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.08, 35), pathMaterial);
  path.position.set(0, 0.04, 2.5);
  path.receiveShadow = true;
  scene.add(path);

  [-3.05, 3.05].forEach((x) => {
    const pathEdge = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.11, 35),
      makeMaterial(0xe7d39d, 0.72)
    );
    pathEdge.position.set(x, 0.1, 2.5);
    pathEdge.receiveShadow = true;
    scene.add(pathEdge);
  });

  addBoundaryWalls(scene, wallMaterial);
  addPathSign(scene);
  const doorPivot = addHouse(scene, { houseWall, roofMaterial, doorMaterial });
  addDeskComputer(scene);
  addTrees(scene);

  return { doorPivot };
}

function addBoundaryWalls(scene, wallMaterial) {
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
    addEdges(wall, 0x879c98, 0.28);
  });

  const capMaterial = makeMaterial(0xf4f1e6, 0.56);
  [
    { position: [0, 6.25, -30], size: [60, 0.32, 1.1] },
    { position: [0, 6.25, 30], size: [60, 0.32, 1.1] },
    { position: [-30, 6.25, 0], size: [1.1, 0.32, 60] },
    { position: [30, 6.25, 0], size: [1.1, 0.32, 60] }
  ].forEach((spec) => {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(...spec.size), capMaterial);
    cap.position.set(...spec.position);
    cap.castShadow = true;
    scene.add(cap);
  });
}

function addPathSign(scene) {
  const post = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 2.1, 0.3),
    makeMaterial(0x5d4336, 0.72)
  );
  post.position.set(-4.6, 1.05, 5.5);
  post.castShadow = true;
  scene.add(post);

  const board = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 1, 0.22),
    makeMaterial(0xe4cc8e, 0.68)
  );
  board.position.set(-4.6, 2.3, 5.5);
  board.castShadow = true;
  scene.add(board);

  const arrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.55, 1.2, 3),
    makeMaterial(0x253331, 0.5)
  );
  arrow.position.set(-4.6, 2.3, 4.82);
  arrow.rotation.x = Math.PI / 2;
  arrow.rotation.z = Math.PI;
  scene.add(arrow);
}

function addHouse(scene, materials) {
  const houseGroup = new THREE.Group();
  houseGroup.position.set(0, 0, -20);

  const wallParts = [
    { position: [-4.15, 3.5, 4.5], size: [3.7, 7, 0.35] },
    { position: [4.15, 3.5, 4.5], size: [3.7, 7, 0.35] },
    { position: [-1.775, 2, 4.5], size: [1.05, 4, 0.35] },
    { position: [1.775, 2, 4.5], size: [1.05, 4, 0.35] },
    { position: [0, 5.75, 4.5], size: [7, 2.5, 0.35] },
    { position: [0, 3.5, -4.5], size: [12, 7, 0.35] },
    { position: [-6, 3.5, 0], size: [0.35, 7, 9] },
    { position: [6, 3.5, 0], size: [0.35, 7, 9] }
  ];

  wallParts.forEach((part) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(...part.size), materials.houseWall);
    wall.position.set(...part.position);
    wall.castShadow = true;
    wall.receiveShadow = true;
    houseGroup.add(wall);
    addEdges(wall, 0xa98862, 0.3);
  });

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(11.4, 0.18, 8.4),
    makeMaterial(0xa67855, 0.62)
  );
  floor.position.y = 0.09;
  floor.receiveShadow = true;
  houseGroup.add(floor);

  const rug = new THREE.Mesh(
    new THREE.BoxGeometry(4.9, 0.06, 2.6),
    makeMaterial(0x6f9889, 0.78)
  );
  rug.position.set(-2.5, 0.16, -2.1);
  rug.receiveShadow = true;
  houseGroup.add(rug);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(8.8, 4.8, 4), materials.roofMaterial);
  roof.position.y = 9.4;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  houseGroup.add(roof);
  addEdges(roof, 0x5c302d, 0.34);

  const doorPivot = new THREE.Group();
  doorPivot.position.set(-1.25, 0, 4.72);
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.5, 4, 0.18), materials.doorMaterial);
  door.position.set(1.25, 2, 0);
  door.castShadow = true;
  doorPivot.add(door);
  addEdges(door, 0x2f221c, 0.38);
  houseGroup.add(doorPivot);

  const windowMaterial = makeMaterial(0x8fc9d4, 0.2, 0.05);
  [-3.8, 3.8].forEach((x) => {
    const window = new THREE.Mesh(new THREE.BoxGeometry(2, 1.8, 0.16), windowMaterial);
    window.position.set(x, 4.5, 4.7);
    houseGroup.add(window);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.22, 2.02, 0.08), makeMaterial(0xf4e5c8, 0.58));
    frame.position.set(x, 4.5, 4.62);
    houseGroup.add(frame);
    frame.renderOrder = -1;
  });

  const roomLight = new THREE.PointLight(0xffdf9a, 2.1, 14, 1.8);
  roomLight.position.set(-2.5, 5.4, -2);
  houseGroup.add(roomLight);

  scene.add(houseGroup);
  return doorPivot;
}

function addDeskComputer(scene) {
  const desk = new THREE.Mesh(
    new THREE.BoxGeometry(4.8, 1, 1.8),
    makeMaterial(0x654738, 0.56)
  );
  desk.position.set(-3, 1.05, -24.35);
  desk.castShadow = true;
  scene.add(desk);
  addEdges(desk, 0x3d2b22, 0.32);

  const upperScreen = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 2.25, 0.2),
    makeMaterial(0x12191c, 0.34, 0.04)
  );
  upperScreen.position.set(-3, 3.75, -24.08);
  upperScreen.castShadow = true;
  scene.add(upperScreen);

  const upperGlow = new THREE.Mesh(
    new THREE.BoxGeometry(3.62, 1.68, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x9ed8d0, roughness: 0.38, emissive: 0x28736e, emissiveIntensity: 0.54 })
  );
  upperGlow.position.set(-3, 3.75, -23.92);
  scene.add(upperGlow);

  const lowerScreen = new THREE.Mesh(
    new THREE.BoxGeometry(3.45, 1.35, 0.2),
    makeMaterial(0x12191c, 0.34, 0.04)
  );
  lowerScreen.position.set(-3, 2.05, -24.08);
  lowerScreen.castShadow = true;
  scene.add(lowerScreen);

  const lowerGlow = new THREE.Mesh(
    new THREE.BoxGeometry(2.86, 0.86, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xb2dfbd, roughness: 0.42, emissive: 0x357047, emissiveIntensity: 0.48 })
  );
  lowerGlow.position.set(-3, 2.05, -23.92);
  scene.add(lowerGlow);

  const chair = new THREE.Mesh(
    new THREE.BoxGeometry(1.25, 1.5, 1.15),
    makeMaterial(0x2d3b3f, 0.52)
  );
  chair.position.set(-3, 0.86, -22.45);
  chair.castShadow = true;
  scene.add(chair);
  addEdges(chair, 0x151f22, 0.32);
}

function addTrees(scene) {
  [
    [-17, -12],
    [18, -8],
    [-21, 7],
    [21, 13]
  ].forEach(([x, z]) => {
    const trunk = new THREE.Mesh(
      new THREE.BoxGeometry(1, 3.2, 1),
      makeMaterial(0x6e4b36, 0.74)
    );
    trunk.position.set(x, 1.6, z);
    trunk.castShadow = true;
    scene.add(trunk);

    const leaves = new THREE.Mesh(
      new THREE.ConeGeometry(2.8, 5.5, 4),
      makeMaterial(0x3f7850, 0.7)
    );
    leaves.position.set(x, 5.3, z);
    leaves.rotation.y = Math.PI / 4;
    leaves.castShadow = true;
    scene.add(leaves);
    addEdges(leaves, 0x2c5638, 0.22);
  });
}

function makeMaterial(color, roughness, metalness = 0) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    flatShading: false
  });
}

function addEdges(mesh, color, opacity) {
  tmpBox.setFromObject(mesh);
  const geometry = new THREE.EdgesGeometry(mesh.geometry, 25);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false
  });
  const edges = new THREE.LineSegments(geometry, material);
  edges.position.copy(mesh.position);
  edges.rotation.copy(mesh.rotation);
  edges.scale.copy(mesh.scale);
  edges.renderOrder = 2;
  mesh.parent?.add(edges);
  return edges;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isMoving(keys, primary, alternate) {
  return keys.has(primary) || keys.has(alternate);
}
