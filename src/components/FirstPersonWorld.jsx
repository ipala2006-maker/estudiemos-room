import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Casa1 } from '../maps/Casa1.js';

const activeMap = Casa1;
const startPosition = activeMap.startPosition;
const houseDoorPosition = activeMap.entrancePosition;
const computerPosition = activeMap.computerPosition;
const toonGradient = createToonGradient();

export function FirstPersonWorld({
  onDoorOpenChange,
  onNearComputerChange,
  onNearDoorChange,
  resetRef,
  toggleDoorRef,
  controlsEnabled = true,
  screenPlatformId = 'youtube'
}) {
  const mountRef = useRef(null);
  const nearDoorRef = useRef(false);
  const nearComputerRef = useRef(false);
  const doorOpenRef = useRef(false);
  const controlsEnabledRef = useRef(controlsEnabled);
  const screenPlatformRef = useRef(screenPlatformId);

  useEffect(() => {
    controlsEnabledRef.current = controlsEnabled;
    if (!controlsEnabled) {
      document.exitPointerLock?.();
    }
  }, [controlsEnabled]);

  useEffect(() => {
    screenPlatformRef.current = screenPlatformId;
  }, [screenPlatformId]);

  useEffect(() => {
    const mount = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x7ddff0);
    scene.fog = new THREE.Fog(0x7ddff0, 46, 98);

    const camera = new THREE.PerspectiveCamera(68, mount.clientWidth / mount.clientHeight, 0.1, 120);
    camera.position.copy(startPosition);
    camera.rotation.order = 'YXZ';

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.HemisphereLight(0xffffff, 0x24425e, 1.55);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff1a0, 4.35);
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

    const rimLight = new THREE.DirectionalLight(0xff4f9a, 1.35);
    rimLight.position.set(-24, 14, 22);
    scene.add(rimLight);

    const softFill = new THREE.DirectionalLight(0x5ce6ff, 0.95);
    softFill.position.set(-18, 12, -8);
    scene.add(softFill);

    const { giantScreen } = buildWorldScene(scene);

    const keys = {
      forward: false,
      backward: false,
      left: false,
      right: false
    };
    const inputDirection = new THREE.Vector3();
    const cameraForwardHorizontal = new THREE.Vector3();
    const cameraRightHorizontal = new THREE.Vector3();
    let yaw = 0;
    let pitch = 0;
    let pointerLocked = false;

    function clearMovementInput() {
      keys.forward = false;
      keys.backward = false;
      keys.left = false;
      keys.right = false;
    }

    function resetCamera() {
      camera.position.copy(startPosition);
      yaw = 0;
      pitch = 0;
      camera.rotation.set(pitch, yaw, 0);
      doorOpenRef.current = false;
      nearDoorRef.current = false;
      nearComputerRef.current = false;
      onDoorOpenChange(false);
      onNearDoorChange(false);
      onNearComputerChange(false);
    }

    resetRef.current = resetCamera;
    toggleDoorRef.current = () => {
      doorOpenRef.current = !doorOpenRef.current;
      camera.position.copy(doorOpenRef.current ? activeMap.interiorSpawnPosition : startPosition);
      yaw = doorOpenRef.current ? Math.PI : 0;
      pitch = 0;
      camera.rotation.set(pitch, yaw, 0);
      clearMovementInput();
      onDoorOpenChange(doorOpenRef.current);
    };

    function onKeyDown(event) {
      if (!controlsEnabledRef.current) {
        clearMovementInput();
        return;
      }

      if (updateMovementKey(event.code, true)) {
        event.preventDefault();
      }
      if (event.code === 'KeyR') resetCamera();
    }

    function onKeyUp(event) {
      updateMovementKey(event.code, false);
    }

    function updateMovementKey(code, isPressed) {
      if (code === 'KeyW' || code === 'ArrowUp') keys.forward = isPressed;
      else if (code === 'KeyS' || code === 'ArrowDown') keys.backward = isPressed;
      else if (code === 'KeyA' || code === 'ArrowLeft') keys.left = isPressed;
      else if (code === 'KeyD' || code === 'ArrowRight') keys.right = isPressed;
      else return false;

      return true;
    }

    function onPointerLockChange() {
      pointerLocked = document.pointerLockElement === renderer.domElement;
    }

    function onCanvasClick() {
      if (!controlsEnabledRef.current) return;
      renderer.domElement.requestPointerLock?.();
    }

    function onMouseMove(event) {
      if (!controlsEnabledRef.current || !pointerLocked) {
        return;
      }

      yaw -= event.movementX * 0.0022;
      pitch = clamp(pitch - event.movementY * 0.0019, -0.7, 0.5);
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
      if (!controlsEnabledRef.current) {
        clearMovementInput();
      }

      camera.getWorldDirection(cameraForwardHorizontal);
      cameraForwardHorizontal.y = 0;
      cameraForwardHorizontal.normalize();
      cameraRightHorizontal.crossVectors(cameraForwardHorizontal, camera.up).normalize();

      const inputVertical = Number(keys.forward) - Number(keys.backward);
      const inputHorizontal = Number(keys.right) - Number(keys.left);
      inputDirection.set(0, 0, 0);
      inputDirection.addScaledVector(cameraForwardHorizontal, inputVertical);
      inputDirection.addScaledVector(cameraRightHorizontal, inputHorizontal);

      if (controlsEnabledRef.current && inputDirection.lengthSq() > 0) {
        inputDirection.normalize();
        camera.position.addScaledVector(inputDirection, 6.4 * delta);
        const bounds = doorOpenRef.current ? activeMap.interiorBounds : activeMap.neighborhoodBounds;
        camera.position.x = clamp(camera.position.x, bounds.minX, bounds.maxX);
        camera.position.z = clamp(camera.position.z, bounds.minZ, bounds.maxZ);
      }

      updateGiantScreen(giantScreen, screenPlatformRef.current);

      const nearDoor = doorOpenRef.current
        ? camera.position.distanceTo(activeMap.interiorExitPosition) < 4.5
        : camera.position.distanceTo(houseDoorPosition) < 5;
      if (nearDoor !== nearDoorRef.current) {
        nearDoorRef.current = nearDoor;
        onNearDoorChange(nearDoor);
      }

      const nearComputer = doorOpenRef.current && camera.position.distanceTo(computerPosition) < 7;
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

function buildWorldScene(scene) {
  const textures = {
    grass: createTexture('grass'),
    path: createTexture('path'),
    plaster: createTexture('plaster'),
    wood: createTexture('wood'),
    roof: createTexture('roof'),
    comicWall: createTexture('comicWall'),
    screenFrame: createTexture('screenFrame'),
    blackStripe: createTexture('blackStripe')
  };
  const groundMaterial = makeMaterial(0x31c96d, 0.42, 0, textures.grass);
  const pathMaterial = makeMaterial(0xffcf32, 0.34, 0, textures.path);
  const wallMaterial = makeMaterial(0x93ecff, 0.36, 0, textures.comicWall);
  const houseWall = makeMaterial(0xffef9b, 0.32, 0, textures.plaster);
  const roofMaterial = makeMaterial(0xff3d34, 0.26, 0, textures.roof);
  const doorMaterial = makeMaterial(0x211a3d, 0.28, 0, textures.wood);

  addNeighborhood(scene, { groundMaterial, pathMaterial, wallMaterial, houseWall, roofMaterial, doorMaterial, textures });
  const giantScreen = addCasa1Interior(scene, textures);
  return { giantScreen };
}

function addNeighborhood(scene, materials) {
  const { groundMaterial, pathMaterial, wallMaterial, houseWall, roofMaterial, doorMaterial, textures } = materials;
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
  addPathSign(scene, textures);
  addNeighborhoodAccents(scene);
  addRhythmRoad(scene);
  addNeighborhoodHouse(scene, { houseWall, roofMaterial, doorMaterial, textures }, 0, -20, true);
  addNeighborhoodHouse(scene, { houseWall, roofMaterial, doorMaterial, textures }, -18, -18, false);
  addNeighborhoodHouse(scene, { houseWall, roofMaterial, doorMaterial, textures }, 18, -18, false);
  addSkylinePanels(scene);
  addTrees(scene);
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
    addEdges(wall, 0x2f6c78, 0.34);
  });

  const capMaterial = makeMaterial(0xfff0c9, 0.5);
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

function addPathSign(scene, textures) {
  const post = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 2.1, 0.3),
    makeMaterial(0x2f2846, 0.5, 0, textures.wood)
  );
  post.position.set(-4.6, 1.05, 5.5);
  post.castShadow = true;
  scene.add(post);

  const board = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 1, 0.22),
    makeMaterial(0xffd95c, 0.48, 0, textures.wood)
  );
  board.position.set(-4.6, 2.3, 5.5);
  board.castShadow = true;
  scene.add(board);

  const arrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.55, 1.2, 3),
    makeMaterial(0xff4f4a, 0.42)
  );
  arrow.position.set(-4.6, 2.3, 4.82);
  arrow.rotation.x = Math.PI / 2;
  arrow.rotation.z = Math.PI;
  scene.add(arrow);

  const marker = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.05, 13),
    makeMaterial(0xff4f4a, 0.48)
  );
  marker.position.set(0, 0.16, -7);
  marker.receiveShadow = true;
  scene.add(marker);
}

function addNeighborhoodAccents(scene) {
  const accentSpecs = [
    { position: [-8, 0.12, -6], size: [1.1, 0.08, 1.1], color: 0x38d8ff },
    { position: [8, 0.12, -10], size: [1.1, 0.08, 1.1], color: 0xff4f4a },
    { position: [-10, 0.12, 8], size: [1.1, 0.08, 1.1], color: 0xffd95c },
    { position: [11, 0.12, 7], size: [1.1, 0.08, 1.1], color: 0x7df58a }
  ];

  accentSpecs.forEach((spec) => {
    const tile = new THREE.Mesh(new THREE.BoxGeometry(...spec.size), makeMaterial(spec.color, 0.46));
    tile.position.set(...spec.position);
    tile.rotation.y = Math.PI / 4;
    tile.receiveShadow = true;
    scene.add(tile);
    addEdges(tile, 0x142326, 0.24);
  });
}

function addRhythmRoad(scene) {
  const colors = [0xff4f4a, 0x38d8ff, 0xffd95c];
  for (let i = 0; i < 9; i += 1) {
    const z = 16 - i * 3.9;
    const leftDash = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.08, 1.35),
      makeMaterial(colors[i % colors.length], 0.24)
    );
    leftDash.position.set(-2.05, 0.2, z);
    leftDash.rotation.y = -0.35;
    scene.add(leftDash);
    addEdges(leftDash, 0x111622, 0.42);

    const rightDash = leftDash.clone();
    rightDash.material = leftDash.material;
    rightDash.position.x = 2.05;
    rightDash.rotation.y = 0.35;
    scene.add(rightDash);
    addEdges(rightDash, 0x111622, 0.42);
  }
}

function addSkylinePanels(scene) {
  [
    { x: -25.6, z: -12, color: 0xff4f4a, height: 5.5 },
    { x: 25.6, z: -5, color: 0xffd95c, height: 4.4 },
    { x: -25.6, z: 11, color: 0x38d8ff, height: 4.8 },
    { x: 25.6, z: 15, color: 0x211a3d, height: 5.2 }
  ].forEach((panel) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, panel.height, 4.8), makeMaterial(panel.color, 0.28));
    mesh.position.set(panel.x, panel.height / 2, panel.z);
    mesh.castShadow = true;
    scene.add(mesh);
    addEdges(mesh, 0x111622, 0.46);
  });
}

function addNeighborhoodHouse(scene, materials, xOffset, zOffset, isCasa1) {
  const houseGroup = new THREE.Group();
  houseGroup.position.set(xOffset, 0, zOffset);

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
    addEdges(wall, 0x4f3356, 0.38);
  });

  addHouseGraphicTrim(houseGroup, isCasa1);

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(11.4, 0.18, 8.4),
    makeMaterial(activeMap.style.interiorFloor, 0.72, 0, materials.textures.plaster)
  );
  floor.position.y = 0.09;
  floor.receiveShadow = true;
  houseGroup.add(floor);

  const rug = new THREE.Mesh(
    new THREE.BoxGeometry(4.9, 0.06, 2.6),
    makeMaterial(0x38d8ff, 0.58)
  );
  rug.position.set(-2.5, 0.16, -2.1);
  rug.receiveShadow = true;
  houseGroup.add(rug);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(8.8, 4.8, 4), materials.roofMaterial);
  roof.position.y = 9.4;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  houseGroup.add(roof);
  addEdges(roof, 0x642f4c, 0.42);

  const doorPivot = new THREE.Group();
  doorPivot.position.set(-1.25, 0, 4.72);
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.5, 4, 0.18), materials.doorMaterial);
  door.position.set(1.25, 2, 0);
  door.castShadow = true;
  doorPivot.add(door);
  addEdges(door, 0x151022, 0.48);
  houseGroup.add(doorPivot);

  const doorGlow = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 4.7, 0.1),
    makeEmissiveMaterial(isCasa1 ? 0x38d8ff : 0xffd95c, isCasa1 ? 0.6 : 0.24)
  );
  doorGlow.position.set(0, 2.25, 4.62);
  houseGroup.add(doorGlow);

  if (!isCasa1) {
    const blocked = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 3.6, 0.12),
      makeMaterial(0x9d9d95, 0.72)
    );
    blocked.position.set(0, 2, 4.9);
    blocked.castShadow = true;
    houseGroup.add(blocked);
  }

  const windowMaterial = makeMaterial(0x9beaff, 0.18, 0.05);
  [-3.8, 3.8].forEach((x) => {
    const window = new THREE.Mesh(new THREE.BoxGeometry(2, 1.8, 0.16), windowMaterial);
    window.position.set(x, 4.5, 4.7);
    houseGroup.add(window);
    addWindowFrame(houseGroup, x, 4.5, 4.82);
  });

  const roomLight = new THREE.PointLight(0xffdf9a, 2.3, 14, 1.8);
  roomLight.position.set(-2.5, 5.4, -2);
  houseGroup.add(roomLight);

  scene.add(houseGroup);
}

function addHouseGraphicTrim(houseGroup, isCasa1) {
  const dark = makeMaterial(0x111622, 0.22);
  const cyan = makeMaterial(0x38d8ff, 0.22);
  const red = makeMaterial(0xff4f4a, 0.22);
  const yellow = makeMaterial(0xffd95c, 0.22);

  [
    { position: [0, 7.05, 4.78], size: [12.5, 0.25, 0.16], material: dark },
    { position: [-6.15, 3.5, 4.8], size: [0.24, 7.1, 0.16], material: dark },
    { position: [6.15, 3.5, 4.8], size: [0.24, 7.1, 0.16], material: dark },
    { position: [0, 0.8, 4.84], size: [11, 0.24, 0.16], material: isCasa1 ? cyan : yellow },
    { position: [-4.2, 5.85, 4.86], size: [2.8, 0.18, 0.16], material: red },
    { position: [4.2, 5.85, 4.86], size: [2.8, 0.18, 0.16], material: cyan }
  ].forEach((trim) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...trim.size), trim.material);
    mesh.position.set(...trim.position);
    mesh.castShadow = true;
    houseGroup.add(mesh);
  });
}

function addCasa1Interior(scene, textures) {
  const room = new THREE.Group();
  room.position.set(90, 0, -6);

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(56, 0.4, 58),
    makeMaterial(0xfdfdf2, 0.34, 0.02, createTexture('whitePanel'))
  );
  floor.position.set(0, -0.2, 0);
  floor.receiveShadow = true;
  room.add(floor);

  const wallMaterial = makeMaterial(0xffffff, 0.3, 0.01, createTexture('whitePanel'));
  [
    { position: [0, 8, -29], size: [56, 16, 0.5] },
    { position: [-28, 8, 0], size: [0.5, 16, 58] },
    { position: [28, 8, 0], size: [0.5, 16, 58] },
    { position: [0, 8, 29], size: [56, 16, 0.5] }
  ].forEach((part) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(...part.size), wallMaterial);
    wall.position.set(...part.position);
    wall.receiveShadow = true;
    wall.castShadow = true;
    room.add(wall);
  });

  addMinimalRoomDetails(room);

  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(56, 0.4, 58), makeMaterial(0xf8fbff, 0.36));
  ceiling.position.set(0, 16, 0);
  ceiling.receiveShadow = true;
  room.add(ceiling);

  const screenFrame = new THREE.Mesh(new THREE.BoxGeometry(36.4, 14.4, 0.22), makeMaterial(0x111622, 0.18, 0.08, textures.screenFrame));
  screenFrame.position.set(0, 8.5, -28.55);
  screenFrame.castShadow = true;
  room.add(screenFrame);

  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = 1024;
  screenCanvas.height = 512;
  const screenTexture = new THREE.CanvasTexture(screenCanvas);
  screenTexture.colorSpace = THREE.SRGBColorSpace;

  const screenSurface = new THREE.Mesh(
    new THREE.BoxGeometry(34.6, 12.8, 0.12),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: screenTexture,
      emissive: 0xffffff,
      emissiveIntensity: 0.34,
      roughness: 0.22,
      metalness: 0.04
    })
  );
  screenSurface.position.set(0, 8.5, -28.25);
  room.add(screenSurface);
  addScreenStageDetails(room);

  addScreenControllerComputer(room, textures);
  addInteriorExitMarker(room);

  const keyLight = new THREE.PointLight(0xffffff, 2.8, 46, 1.7);
  keyLight.position.set(0, 12, 0);
  room.add(keyLight);

  [-18, 0, 18].forEach((x) => {
    const stripLight = new THREE.PointLight(x === 0 ? 0xffd95c : 0x38d8ff, 1.35, 22, 2.2);
    stripLight.position.set(x, 13.8, -14);
    room.add(stripLight);
  });

  scene.add(room);
  return { canvas: screenCanvas, context: screenCanvas.getContext('2d'), texture: screenTexture, currentPlatformId: '' };
}

function addInteriorExitMarker(room) {
  const marker = new THREE.Mesh(new THREE.BoxGeometry(6, 0.08, 2), makeMaterial(0xffd95c, 0.52));
  marker.position.set(0, 0.05, 26);
  marker.receiveShadow = true;
  room.add(marker);
}

function addScreenStageDetails(room) {
  const sideMaterial = makeMaterial(0xff4f4a, 0.2);
  const cyanMaterial = makeMaterial(0x38d8ff, 0.2);
  const yellowMaterial = makeMaterial(0xffd95c, 0.22);
  const darkMaterial = makeMaterial(0x111622, 0.18);

  [
    { position: [-19.5, 8.5, -28.2], size: [0.34, 15.5, 0.28], material: sideMaterial },
    { position: [19.5, 8.5, -28.2], size: [0.34, 15.5, 0.28], material: cyanMaterial },
    { position: [0, 16.45, -28.18], size: [39.4, 0.3, 0.26], material: yellowMaterial },
    { position: [0, 0.72, -28.18], size: [39.4, 0.3, 0.26], material: darkMaterial }
  ].forEach((part) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...part.size), part.material);
    mesh.position.set(...part.position);
    mesh.castShadow = true;
    room.add(mesh);
    addEdges(mesh, 0x111622, 0.38);
  });

  [-15, -7.5, 7.5, 15].forEach((x, index) => {
    const marker = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.18, 0.18),
      makeMaterial(index % 2 === 0 ? 0xffd95c : 0x38d8ff, 0.2)
    );
    marker.position.set(x, 15.72, -28.03);
    marker.rotation.z = index % 2 === 0 ? 0.18 : -0.18;
    room.add(marker);
  });
}

function addMinimalRoomDetails(room) {
  const seamMaterial = makeMaterial(0xd8e9ef, 0.56);
  const baseboardMaterial = makeMaterial(0x111622, 0.24, 0.02);
  const accentMaterial = makeMaterial(0x38d8ff, 0.38, 0.02);

  for (let x = -21; x <= 21; x += 7) {
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.035, 56), seamMaterial);
    seam.position.set(x, 0.035, 0);
    seam.receiveShadow = true;
    room.add(seam);
  }

  for (let z = -21; z <= 21; z += 7) {
    const seam = new THREE.Mesh(new THREE.BoxGeometry(54, 0.04, 0.045), seamMaterial);
    seam.position.set(0, 0.04, z);
    seam.receiveShadow = true;
    room.add(seam);
  }

  [
    { position: [0, 0.55, -28.68], size: [52, 0.34, 0.16] },
    { position: [0, 0.55, 28.68], size: [52, 0.34, 0.16] },
    { position: [-27.68, 0.55, 0], size: [0.16, 0.34, 54] },
    { position: [27.68, 0.55, 0], size: [0.16, 0.34, 54] }
  ].forEach((part) => {
    const baseboard = new THREE.Mesh(new THREE.BoxGeometry(...part.size), baseboardMaterial);
    baseboard.position.set(...part.position);
    baseboard.castShadow = true;
    room.add(baseboard);
  });

  [-18, -9, 9, 18].forEach((x) => {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 9.5, 0.18), accentMaterial);
    panel.position.set(x, 7.2, -28.42);
    panel.castShadow = true;
    room.add(panel);
  });

  [-22, 22].forEach((x) => {
    const rhythmLine = new THREE.Mesh(new THREE.BoxGeometry(0.14, 10.2, 0.2), makeMaterial(0xff4f4a, 0.42));
    rhythmLine.position.set(x, 7.5, -28.32);
    rhythmLine.castShadow = true;
    room.add(rhythmLine);
  });

  [
    { position: [-27.45, 7.2, -12], size: [0.16, 6.2, 8.5], color: 0xff4f4a },
    { position: [27.45, 7.2, 12], size: [0.16, 6.2, 8.5], color: 0x38d8ff },
    { position: [-12, 0.08, 13], size: [7, 0.08, 1.5], color: 0xffd95c },
    { position: [13, 0.08, 5], size: [7, 0.08, 1.5], color: 0xff4f4a }
  ].forEach((part) => {
    const graphic = new THREE.Mesh(new THREE.BoxGeometry(...part.size), makeMaterial(part.color, 0.24));
    graphic.position.set(...part.position);
    graphic.castShadow = true;
    graphic.receiveShadow = true;
    room.add(graphic);
    addEdges(graphic, 0x111622, 0.28);
  });

  const screenHalo = new THREE.Mesh(
    new THREE.BoxGeometry(39.2, 15.8, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xbaf3ff, emissive: 0x80eaff, emissiveIntensity: 0.22, roughness: 0.38 })
  );
  screenHalo.position.set(0, 8.5, -28.72);
  room.add(screenHalo);
}

function addScreenControllerComputer(room, textures) {
  const desk = new THREE.Mesh(
    new THREE.BoxGeometry(5.4, 1, 2.1),
    makeMaterial(0x211a3d, 0.24, 0, textures.blackStripe)
  );
  desk.position.set(-12, 1.05, -4);
  desk.castShadow = true;
  room.add(desk);
  addEdges(desk, 0x111622, 0.5);

  const deskAccent = new THREE.Mesh(new THREE.BoxGeometry(5.7, 0.18, 0.18), makeMaterial(0xffd95c, 0.18));
  deskAccent.position.set(-12, 1.63, -2.98);
  room.add(deskAccent);

  const upperScreen = new THREE.Mesh(
    new THREE.BoxGeometry(3.15, 1.9, 0.24),
    makeMaterial(0x111622, 0.16, 0.04, textures.screenFrame)
  );
  upperScreen.position.set(-12, 2.7, -4.35);
  upperScreen.castShadow = true;
  room.add(upperScreen);

  const upperGlow = new THREE.Mesh(
    new THREE.BoxGeometry(2.62, 1.3, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x9beaff, roughness: 0.18, emissive: 0x18d8ff, emissiveIntensity: 0.9 })
  );
  upperGlow.position.set(-12, 2.7, -4.18);
  room.add(upperGlow);

  const chair = new THREE.Mesh(
    new THREE.BoxGeometry(1.25, 1.5, 1.15),
    makeMaterial(0xff4f4a, 0.48)
  );
  chair.position.set(-12, 0.86, -1.9);
  chair.castShadow = true;
  room.add(chair);
  addEdges(chair, 0x151f22, 0.32);

  const interactionRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.35, 0.055, 8, 32),
    makeEmissiveMaterial(0xffd95c, 0.7)
  );
  interactionRing.position.set(-12, 0.08, -4);
  interactionRing.rotation.x = Math.PI / 2;
  room.add(interactionRing);
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

function addWindowFrame(group, x, y, z) {
  const material = makeMaterial(0xf0dfbf, 0.58);
  [
    { position: [x, y + 1.02, z], size: [2.3, 0.18, 0.12] },
    { position: [x, y - 1.02, z], size: [2.3, 0.18, 0.12] },
    { position: [x - 1.14, y, z], size: [0.18, 2.1, 0.12] },
    { position: [x + 1.14, y, z], size: [0.18, 2.1, 0.12] },
    { position: [x, y, z], size: [0.12, 2, 0.12] }
  ].forEach((part) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(...part.size), material);
    bar.position.set(...part.position);
    bar.castShadow = true;
    group.add(bar);
  });
}

function updateGiantScreen(giantScreen, platformId) {
  if (giantScreen.currentPlatformId === platformId) return;
  giantScreen.currentPlatformId = platformId;

  const ctx = giantScreen.context;
  const width = giantScreen.canvas.width;
  const height = giantScreen.canvas.height;
  const platform = getPlatformScreenState(platformId);
  const primaryContent = platform.primaryContent ?? activeMap.screenChannels.primaryContent;
  const secondaryContent = platform.secondaryContent ?? activeMap.screenChannels.secondaryContent;
  const splitY = Math.round(height * 0.7);

  ctx.fillStyle = platform.background;
  ctx.fillRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, 'rgba(255,255,255,0.28)');
  gradient.addColorStop(0.42, 'rgba(255,255,255,0.04)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(width * 0.62, -36);
  ctx.rotate(-0.22);
  ctx.fillStyle = 'rgba(255, 217, 92, 0.28)';
  for (let i = 0; i < 9; i += 1) {
    ctx.fillRect(i * 74, 0, 22, splitY + 110);
  }
  ctx.restore();

  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 3;
  for (let x = 42; x < width; x += 96) {
    ctx.beginPath();
    ctx.moveTo(x, 38);
    ctx.lineTo(x + 42, splitY - 40);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(17,22,34,0.62)';
  ctx.fillRect(38, 56, 540, 86);
  ctx.fillStyle = platform.accent;
  ctx.fillRect(38, 56, 12, 86);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 52px system-ui, sans-serif';
  ctx.fillText(primaryContent.label, 64, 118);

  ctx.fillStyle = 'rgba(17,22,34,0.42)';
  ctx.font = '900 86px system-ui, sans-serif';
  ctx.fillText(platform.title, 70, 228);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 86px system-ui, sans-serif';
  ctx.fillText(platform.title, 64, 220);

  ctx.font = '700 30px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText(platform.subtitle, 68, 270);

  ctx.fillStyle = platform.accent;
  ctx.fillRect(0, splitY - 5, width, 10);
  ctx.fillStyle = 'rgba(17,22,34,0.72)';
  ctx.fillRect(0, splitY - 2, width, 4);

  ctx.fillStyle = 'rgba(17,22,34,0.44)';
  ctx.fillRect(0, splitY, width, height - splitY);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let x = 0; x < width; x += 48) {
    ctx.fillRect(x, splitY, 10, height - splitY);
  }
  ctx.fillStyle = platform.accent;
  ctx.fillRect(0, splitY, 18, height - splitY);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 32px system-ui, sans-serif';
  ctx.fillText(secondaryContent.label, 44, splitY + 44);
  ctx.font = '700 24px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.fillText(platform.secondaryText, 44, splitY + 78);

  ctx.fillStyle = '#ffd95c';
  ctx.fillRect(width - 178, splitY + 34, 112, 12);
  ctx.fillStyle = platform.accent;
  ctx.fillRect(width - 122, splitY + 58, 72, 12);

  giantScreen.texture.needsUpdate = true;
}

function getPlatformScreenState(platformId) {
  if (platformId === 'netflix') {
    return {
      title: 'Netflix',
      subtitle: 'Placeholder bloqueado: requiere soporte DRM',
      secondaryText: 'Canal secundario: estado de plataforma / aviso DRM',
      primaryContent: { label: 'Contenido principal', slot: 'upper' },
      secondaryContent: { label: 'Contenido secundario', slot: 'lower' },
      background: '#2b1014',
      accent: '#e50914'
    };
  }

  if (platformId === 'custom-video') {
    return {
      title: 'Video externo',
      subtitle: 'Placeholder para futuras fuentes aprobadas',
      secondaryText: 'Canal secundario: cola futura / metadatos / controles',
      primaryContent: { label: 'Contenido principal', slot: 'upper' },
      secondaryContent: { label: 'Contenido secundario', slot: 'lower' },
      background: '#10243f',
      accent: '#4f8cff'
    };
  }

  return {
    title: 'YouTube',
    subtitle: 'Placeholder de app preparada para integracion',
    secondaryText: 'Canal secundario: playlist, subtitulos o controles futuros',
    primaryContent: { label: 'Contenido principal', slot: 'upper' },
    secondaryContent: { label: 'Contenido secundario', slot: 'lower' },
    background: '#2c1111',
    accent: '#ff3b30'
  };
}

function makeMaterial(color, roughness, metalness = 0, texture = null) {
  return new THREE.MeshToonMaterial({
    color,
    gradientMap: toonGradient,
    map: texture,
    dithering: true
  });
}

function makeEmissiveMaterial(color, intensity = 0.6) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.18,
    metalness: 0
  });
}

function addEdges(mesh, color, opacity) {
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

function createTexture(type) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  if (type === 'grass') drawGrassTexture(ctx);
  if (type === 'path') drawPathTexture(ctx);
  if (type === 'plaster') drawPlasterTexture(ctx);
  if (type === 'wood') drawWoodTexture(ctx);
  if (type === 'roof') drawRoofTexture(ctx);
  if (type === 'whitePanel') drawWhitePanelTexture(ctx);
  if (type === 'comicWall') drawComicWallTexture(ctx);
  if (type === 'screenFrame') drawScreenFrameTexture(ctx);
  if (type === 'blackStripe') drawBlackStripeTexture(ctx);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  const repeat = {
    wood: [1.8, 1.8],
    screenFrame: [2, 2],
    blackStripe: [3, 1.5],
    roof: [2.8, 2.8],
    comicWall: [3, 3]
  }[type] ?? [4, 4];
  texture.repeat.set(repeat[0], repeat[1]);
  texture.anisotropy = 4;
  return texture;
}

function createToonGradient() {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  ['#303030', '#777777', '#c8c8c8', '#ffffff'].forEach((color, index) => {
    ctx.fillStyle = color;
    ctx.fillRect(index, 0, 1, 1);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return texture;
}

function drawGrassTexture(ctx) {
  ctx.fillStyle = '#29ba68';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 520; i++) {
    const shade = i % 4 === 0 ? '#0e9150' : i % 4 === 1 ? '#47e37a' : i % 4 === 2 ? '#75f291' : '#1ea75c';
    ctx.fillStyle = shade;
    ctx.fillRect((i * 47) % 128, (i * 29) % 128, 3 + (i % 5), 2);
  }
  ctx.strokeStyle = 'rgba(17, 22, 34, 0.14)';
  for (let x = -128; x < 256; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, 128);
    ctx.lineTo(x + 128, 0);
    ctx.stroke();
  }
}

function drawPathTexture(ctx) {
  ctx.fillStyle = '#f2c94c';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  for (let x = -80; x < 180; x += 22) {
    ctx.beginPath();
    ctx.moveTo(x, 128);
    ctx.lineTo(x + 48, 0);
    ctx.lineTo(x + 58, 0);
    ctx.lineTo(x + 10, 128);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(17, 22, 34, 0.2)';
  ctx.lineWidth = 2;
  for (let y = 12; y < 128; y += 26) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(128, y + 8);
    ctx.stroke();
  }
}

function drawPlasterTexture(ctx) {
  ctx.fillStyle = '#ffef9b';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = 'rgba(255, 79, 74, 0.14)';
  ctx.fillRect(0, 0, 128, 14);
  ctx.fillRect(0, 64, 128, 8);
  ctx.strokeStyle = 'rgba(17, 22, 34, 0.24)';
  ctx.lineWidth = 2;
  for (let y = 0; y < 128; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(128, y + 0.5);
    ctx.stroke();
  }
  for (let x = 0; x < 128; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, 128);
    ctx.stroke();
  }
}

function drawWoodTexture(ctx) {
  ctx.fillStyle = '#443452';
  ctx.fillRect(0, 0, 128, 128);
  for (let y = 12; y < 128; y += 20) {
    ctx.strokeStyle = 'rgba(22, 15, 32, 0.36)';
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(36, y + 5, 84, y - 5, 128, y + 2);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255, 225, 115, 0.18)';
  for (let y = 6; y < 128; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(128, y + 3);
    ctx.stroke();
  }
}

function drawRoofTexture(ctx) {
  ctx.fillStyle = '#f05a4f';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(79, 31, 62, 0.34)';
  for (let y = 0; y < 128; y += 18) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(128, y + 0.5);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255, 225, 115, 0.16)';
  for (let x = 0; x < 128; x += 24) {
    ctx.fillRect(x, 0, 4, 128);
  }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  for (let x = -128; x < 128; x += 34) {
    ctx.beginPath();
    ctx.moveTo(x, 128);
    ctx.lineTo(x + 60, 0);
    ctx.lineTo(x + 70, 0);
    ctx.lineTo(x + 10, 128);
    ctx.closePath();
    ctx.fill();
  }
}

function drawWhitePanelTexture(ctx) {
  ctx.fillStyle = '#fbfbf6';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(56, 216, 255, 0.13)';
  for (let x = 0; x <= 128; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, 128);
    ctx.stroke();
  }
  for (let y = 0; y <= 128; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(128, y + 0.5);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.fillRect(0, 0, 128, 2);
  ctx.fillRect(0, 0, 2, 128);
}

function drawComicWallTexture(ctx) {
  ctx.fillStyle = '#93ecff';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.fillRect(0, 0, 128, 28);
  ctx.strokeStyle = 'rgba(17, 22, 34, 0.22)';
  ctx.lineWidth = 3;
  for (let y = 0; y < 128; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(128, y + 0.5);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255, 79, 74, 0.42)';
  for (let x = -128; x < 180; x += 44) {
    ctx.beginPath();
    ctx.moveTo(x, 128);
    ctx.lineTo(x + 52, 0);
    ctx.stroke();
  }
}

function drawScreenFrameTexture(ctx) {
  ctx.fillStyle = '#111622';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = 'rgba(56, 216, 255, 0.24)';
  for (let x = 0; x < 128; x += 24) {
    ctx.fillRect(x, 0, 8, 128);
  }
  ctx.fillStyle = 'rgba(255, 217, 92, 0.3)';
  ctx.fillRect(0, 0, 128, 10);
  ctx.fillRect(0, 118, 128, 10);
}

function drawBlackStripeTexture(ctx) {
  ctx.fillStyle = '#211a3d';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = 'rgba(56, 216, 255, 0.18)';
  for (let x = -128; x < 160; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, 128);
    ctx.lineTo(x + 42, 0);
    ctx.lineTo(x + 56, 0);
    ctx.lineTo(x + 14, 128);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255, 217, 92, 0.34)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 24);
  ctx.lineTo(128, 54);
  ctx.stroke();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
