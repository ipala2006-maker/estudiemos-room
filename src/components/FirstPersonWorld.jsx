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
  addEdges(ground, 0x111622, 0.18);

  const path = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.1, 35), pathMaterial);
  path.position.set(0, 0.04, 2.5);
  path.receiveShadow = true;
  scene.add(path);
  addEdges(path, 0x111622, 0.26);

  [-3.05, 3.05].forEach((x) => {
    const pathEdge = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.18, 35),
      makeMaterial(x < 0 ? 0x38d8ff : 0xff4f4a, 0.2)
    );
    pathEdge.position.set(x, 0.1, 2.5);
    pathEdge.receiveShadow = true;
    scene.add(pathEdge);
    addEdges(pathEdge, 0x111622, 0.32);
  });

  addBoundaryWalls(scene, wallMaterial);
  addPathSign(scene, textures);
  addNeighborhoodAccents(scene);
  addRhythmRoad(scene);
  addDesignedPath(scene);
  addNeighborhoodHouse(scene, { houseWall, roofMaterial, doorMaterial, textures }, 0, -20, true);
  addNeighborhoodHouse(scene, { houseWall, roofMaterial, doorMaterial, textures }, -18, -18, false);
  addNeighborhoodHouse(scene, { houseWall, roofMaterial, doorMaterial, textures }, 18, -18, false);
  addSkylinePanels(scene);
  addStageSetPieces(scene);
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
  addBoundaryMurals(scene);

  [
    { position: [-16, 3.4, -29.25], size: [8, 4.8, 0.22], color: 0xff4f4a, rot: -0.08 },
    { position: [14, 3.1, -29.2], size: [10, 4.2, 0.22], color: 0xffd95c, rot: 0.08 },
    { position: [-29.2, 3.2, 12], size: [0.22, 4.4, 8], color: 0x38d8ff, rot: 0 },
    { position: [29.2, 3.6, -12], size: [0.22, 5.1, 9], color: 0xff4f4a, rot: 0 }
  ].forEach((spec) => {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(...spec.size), makeMaterial(spec.color, 0.22));
    panel.position.set(...spec.position);
    panel.rotation.z = spec.rot;
    panel.castShadow = true;
    scene.add(panel);
    addEdges(panel, 0x111622, 0.45);
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

  const bolt = createBoltMesh(0xffd95c, 1.15);
  bolt.position.set(-4.6, 2.42, 4.63);
  bolt.rotation.y = Math.PI;
  scene.add(bolt);
  addEdges(bolt, 0x111622, 0.45);
}

function addBoundaryMurals(scene) {
  const murals = [
    {
      points: [
        [-9, -2.2],
        [7.2, -2.2],
        [8.8, 1.8],
        [3.3, 2.7],
        [-7.6, 2.1]
      ],
      position: [-13, 3.4, -29.42],
      color: 0xff4f4a
    },
    {
      points: [
        [-7.8, -1.9],
        [8.2, -2.3],
        [6.4, 2.5],
        [-3.4, 2.9],
        [-9.2, 0.6]
      ],
      position: [13.8, 3.55, -29.44],
      color: 0xffd95c
    },
    {
      points: [
        [-2.2, -5.5],
        [2.4, -4.6],
        [2.1, 5.3],
        [-2.6, 4.4],
        [-3.1, -1.2]
      ],
      position: [-29.45, 3.8, 10],
      color: 0x38d8ff,
      rotateY: Math.PI / 2
    },
    {
      points: [
        [-2.6, -5.1],
        [2.5, -4.1],
        [2.8, 5.1],
        [-1.8, 5.8],
        [-3.1, 1.2]
      ],
      position: [29.45, 3.7, -12],
      color: 0x211a3d,
      rotateY: -Math.PI / 2
    }
  ];

  murals.forEach((mural) => {
    const mesh = createVerticalShapeMesh(mural.points, mural.color);
    mesh.position.set(...mural.position);
    mesh.rotation.y = mural.rotateY ?? 0;
    scene.add(mesh);
    addEdges(mesh, 0x111622, 0.58);

    const slash = createVerticalShapeMesh(
      [
        [-1.2, -2.4],
        [0.3, -2.4],
        [2.2, 2.4],
        [0.6, 2.4]
      ],
      0xffffff
    );
    slash.position.copy(mesh.position);
    slash.position.z += mural.rotateY ? 0 : 0.04;
    slash.position.x += mural.rotateY ? (mural.rotateY > 0 ? 0.04 : -0.04) : 0;
    slash.rotation.copy(mesh.rotation);
    scene.add(slash);
  });
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

function addDesignedPath(scene) {
  const pathSections = [
    { z0: 19, z1: 12, left: -3.8, right: 3.8, color: 0xffd95c },
    { z0: 12, z1: 5, left: -3.25, right: 3.25, color: 0xffc829 },
    { z0: 5, z1: -3.5, left: -2.85, right: 2.85, color: 0xffd95c },
    { z0: -3.5, z1: -13.2, left: -2.3, right: 2.3, color: 0xffc829 }
  ];

  pathSections.forEach((section, index) => {
    const slab = createGroundShapeMesh(
      [
        [section.left, section.z0],
        [section.right, section.z0 - 0.9],
        [section.right * 0.82, section.z1],
        [section.left * 0.82, section.z1 + 0.7]
      ],
      section.color
    );
    slab.position.y = 0.19 + index * 0.003;
    scene.add(slab);
    addEdges(slab, 0x111622, 0.34);
  });

  for (let i = 0; i < 11; i += 1) {
    const z = 17.5 - i * 2.8;
    const stripe = createGroundShapeMesh(
      [
        [-1.6, z],
        [1.45, z - 0.35],
        [1.3, z - 0.7],
        [-1.75, z - 0.35]
      ],
      i % 2 === 0 ? 0xffffff : 0x211a3d
    );
    stripe.position.y = 0.245;
    scene.add(stripe);
  }
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

function addStageSetPieces(scene) {
  const specs = [
    { position: [-11, 0.72, 14], size: [3.8, 1.2, 0.42], color: 0xff4f4a, rot: -0.42 },
    { position: [12, 0.72, 13], size: [4.3, 1.2, 0.42], color: 0x38d8ff, rot: 0.38 },
    { position: [-13, 0.78, -5], size: [3.2, 1.4, 0.42], color: 0xffd95c, rot: 0.5 },
    { position: [13, 0.78, -3], size: [3.2, 1.4, 0.42], color: 0x211a3d, rot: -0.5 }
  ];

  specs.forEach((spec) => {
    const wedge = new THREE.Mesh(new THREE.BoxGeometry(...spec.size), makeMaterial(spec.color, 0.18));
    wedge.position.set(...spec.position);
    wedge.rotation.y = spec.rot;
    wedge.rotation.z = 0.12;
    wedge.castShadow = true;
    scene.add(wedge);
    addEdges(wedge, 0x111622, 0.5);
  });

  [-22, 22].forEach((x) => {
    const tower = new THREE.Group();
    tower.position.set(x, 0, 22);
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, 6.2, 1.4), makeMaterial(0x111622, 0.18));
    base.position.y = 3.1;
    tower.add(base);
    const face = new THREE.Mesh(new THREE.BoxGeometry(2.42, 2.1, 0.16), makeEmissiveMaterial(x < 0 ? 0xff4f4a : 0x38d8ff, 0.42));
    face.position.set(0, 4.1, -0.78);
    tower.add(face);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.42, 2.2), makeMaterial(0xffd95c, 0.18));
    cap.position.y = 6.4;
    tower.add(cap);
    tower.rotation.y = x < 0 ? 0.28 : -0.28;
    scene.add(tower);
    addGroupEdges(tower, 0x111622, 0.42);
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
  addHouseAngularMasses(houseGroup, isCasa1);
  addHouseDesignedFacade(houseGroup, isCasa1);

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

  const roof = new THREE.Mesh(new THREE.ConeGeometry(9.4, 4.9, 4), materials.roofMaterial);
  roof.position.y = 9.45;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  houseGroup.add(roof);
  addEdges(roof, 0x642f4c, 0.42);

  const roofBlade = new THREE.Mesh(new THREE.BoxGeometry(13.4, 0.34, 1.2), makeMaterial(0x111622, 0.16));
  roofBlade.position.set(0, 8.78, 4.22);
  roofBlade.rotation.z = -0.05;
  houseGroup.add(roofBlade);

  const roofAccent = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.24, 0.48), makeMaterial(isCasa1 ? 0x38d8ff : 0xffd95c, 0.16));
  roofAccent.position.set(0, 8.48, 4.86);
  houseGroup.add(roofAccent);

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

  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(3.35, 4.95, 0.18), makeMaterial(0x111622, 0.16));
  doorFrame.position.set(0, 2.42, 4.56);
  houseGroup.add(doorFrame);
  doorFrame.renderOrder = -1;

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

function addHouseAngularMasses(houseGroup, isCasa1) {
  const sideColor = isCasa1 ? 0x38d8ff : 0xffd95c;
  const darkMaterial = makeMaterial(0x111622, 0.16);
  const sideMaterial = makeMaterial(sideColor, 0.2);
  const redMaterial = makeMaterial(0xff4f4a, 0.18);

  [
    { position: [-6.85, 3.15, -0.3], size: [0.5, 6.3, 8.7], material: darkMaterial, rotZ: -0.04 },
    { position: [6.85, 3.15, -0.3], size: [0.5, 6.3, 8.7], material: darkMaterial, rotZ: 0.04 },
    { position: [-6.55, 4.5, 2.4], size: [0.42, 2.4, 3.6], material: sideMaterial, rotZ: -0.08 },
    { position: [6.55, 4.5, -2.2], size: [0.42, 2.4, 3.6], material: redMaterial, rotZ: 0.08 },
    { position: [0, 6.8, -4.86], size: [11.6, 0.36, 0.32], material: darkMaterial, rotZ: 0 }
  ].forEach((part) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...part.size), part.material);
    mesh.position.set(...part.position);
    mesh.rotation.z = part.rotZ;
    mesh.castShadow = true;
    houseGroup.add(mesh);
    addEdges(mesh, 0x111622, 0.42);
  });

  const bolt = createBoltMesh(isCasa1 ? 0xffd95c : 0x38d8ff, 0.8);
  bolt.position.set(isCasa1 ? -3.5 : 3.5, 5.35, 4.95);
  bolt.rotation.y = Math.PI;
  houseGroup.add(bolt);
}

function addHouseDesignedFacade(houseGroup, isCasa1) {
  const backing = createVerticalShapeMesh(
    [
      [-6.9, -3.55],
      [-6.1, 2.85],
      [-3.2, 4.05],
      [-0.45, 5.0],
      [3.8, 4.05],
      [6.5, 2.65],
      [6.95, -3.3],
      [2.7, -3.65],
      [-3.8, -3.45]
    ],
    0x111622
  );
  backing.position.set(0, 4.25, 5.02);
  houseGroup.add(backing);

  const face = createVerticalShapeMesh(
    [
      [-5.7, -3.0],
      [-5.25, 2.25],
      [-2.6, 3.2],
      [-0.2, 3.95],
      [3.1, 3.18],
      [5.45, 2.0],
      [5.7, -2.9],
      [2.4, -3.2],
      [-3.2, -3.05]
    ],
    isCasa1 ? 0xffef9b : 0xffe7a8
  );
  face.position.set(0, 4.18, 5.1);
  houseGroup.add(face);

  [
    { x: -3.35, y: 4.65, color: 0x9beaff },
    { x: 3.25, y: 4.55, color: 0x9beaff }
  ].forEach((window) => {
    const frame = createVerticalShapeMesh(
      [
        [-1.18, -0.82],
        [0.88, -1.02],
        [1.2, 0.7],
        [-0.92, 1.02]
      ],
      0x111622
    );
    frame.position.set(window.x, window.y, 5.22);
    houseGroup.add(frame);

    const glass = createVerticalShapeMesh(
      [
        [-0.82, -0.55],
        [0.62, -0.68],
        [0.82, 0.45],
        [-0.58, 0.66]
      ],
      window.color
    );
    glass.position.set(window.x, window.y, 5.28);
    houseGroup.add(glass);
  });

  const entry = createVerticalShapeMesh(
    [
      [-1.25, -2.95],
      [1.25, -2.95],
      [1.25, 0.4],
      [0.55, 1.15],
      [-0.65, 1.15],
      [-1.25, 0.32]
    ],
    0x211a3d
  );
  entry.position.set(0, 2.95, 5.34);
  houseGroup.add(entry);

  const accent = createVerticalShapeMesh(
    [
      [-5.4, -2.85],
      [-4.55, -2.75],
      [4.95, 2.3],
      [4.1, 2.55]
    ],
    isCasa1 ? 0x38d8ff : 0xff4f4a
  );
  accent.position.set(0, 4.12, 5.36);
  houseGroup.add(accent);
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
  addInteriorSetPieces(room);

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
  addScreenHeroFrame(room);

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

function addInteriorSetPieces(room) {
  const pieces = [
    { position: [-24.5, 8, -18], size: [0.38, 9.5, 7.4], color: 0xff4f4a, rz: -0.08 },
    { position: [24.5, 7.4, -14], size: [0.38, 8.6, 8.2], color: 0x38d8ff, rz: 0.08 },
    { position: [-20, 0.25, 2], size: [9.5, 0.24, 2.3], color: 0x211a3d, ry: -0.24 },
    { position: [19, 0.25, -3], size: [10.5, 0.24, 2.3], color: 0xffd95c, ry: 0.22 },
    { position: [-17, 12.6, -27.95], size: [6.5, 0.28, 0.22], color: 0xffd95c, rz: 0.18 },
    { position: [16, 12.8, -27.95], size: [7.5, 0.28, 0.22], color: 0xff4f4a, rz: -0.16 }
  ];

  pieces.forEach((piece) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...piece.size), makeMaterial(piece.color, 0.18));
    mesh.position.set(...piece.position);
    mesh.rotation.z = piece.rz ?? 0;
    mesh.rotation.y = piece.ry ?? 0;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    room.add(mesh);
    addEdges(mesh, 0x111622, 0.42);
  });

  const floorGlyph = createGroundShapeMesh(
    [
      [-7.2, 13.2],
      [5.6, 11.3],
      [7.2, 14.4],
      [1.4, 18.4],
      [-6.4, 17.2]
    ],
    0x38d8ff
  );
  floorGlyph.position.y = 0.13;
  room.add(floorGlyph);
  addEdges(floorGlyph, 0x111622, 0.34);

  const screenArrow = createGroundShapeMesh(
    [
      [-3.2, -4.5],
      [3.2, -4.5],
      [3.2, -8.5],
      [6.2, -8.5],
      [0, -14.2],
      [-6.2, -8.5],
      [-3.2, -8.5]
    ],
    0xffd95c
  );
  screenArrow.position.y = 0.135;
  room.add(screenArrow);
  addEdges(screenArrow, 0x111622, 0.34);

  [
    { x: -23, z: 21, color: 0x38d8ff },
    { x: 23, z: 21, color: 0xff4f4a },
    { x: -23, z: -24, color: 0xffd95c },
    { x: 23, z: -24, color: 0x211a3d }
  ].forEach((spec) => {
    const column = new THREE.Group();
    column.position.set(spec.x, 0, spec.z);
    const core = new THREE.Mesh(new THREE.BoxGeometry(1.1, 10, 1.1), makeMaterial(0x111622, 0.16));
    core.position.y = 5;
    column.add(core);
    const band1 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.42, 1.5), makeMaterial(spec.color, 0.16));
    band1.position.y = 2.4;
    column.add(band1);
    const band2 = band1.clone();
    band2.position.y = 7.3;
    column.add(band2);
    room.add(column);
    addGroupEdges(column, 0x111622, 0.42);
  });
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

function addScreenHeroFrame(room) {
  const backBurst = createVerticalShapeMesh(
    [
      [-22, -8.5],
      [-18.4, 6.2],
      [-8.2, 8.4],
      [0, 7.2],
      [10.8, 8.6],
      [21.8, 5.8],
      [23.2, -7.8],
      [11.5, -8.9],
      [0, -7.8],
      [-12.6, -9.1]
    ],
    0x111622
  );
  backBurst.position.set(0, 8.45, -28.84);
  room.add(backBurst);

  const cyanWing = createVerticalShapeMesh(
    [
      [-22.8, -5.8],
      [-18.8, 5.7],
      [-15.1, 4.9],
      [-18.1, -6.4]
    ],
    0x38d8ff
  );
  cyanWing.position.set(0, 8.45, -28.76);
  room.add(cyanWing);

  const redWing = createVerticalShapeMesh(
    [
      [22.8, -5.7],
      [18.3, 5.9],
      [14.8, 4.9],
      [18.1, -6.6]
    ],
    0xff4f4a
  );
  redWing.position.set(0, 8.45, -28.75);
  room.add(redWing);

  const lowerTag = createVerticalShapeMesh(
    [
      [-13.5, -8.4],
      [13.5, -8.4],
      [11.8, -10.2],
      [-11.3, -10.2]
    ],
    0xffd95c
  );
  lowerTag.position.set(0, 8.45, -28.69);
  room.add(lowerTag);
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
  const platform = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.32, 4.2), makeMaterial(0x111622, 0.16, 0, textures.blackStripe));
  platform.position.set(-12, 0.18, -4);
  platform.castShadow = true;
  platform.receiveShadow = true;
  room.add(platform);
  addEdges(platform, 0x38d8ff, 0.32);

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

  const consoleSlab = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.32, 1.25), makeMaterial(0xff4f4a, 0.18));
  consoleSlab.position.set(-12, 1.78, -3.55);
  consoleSlab.rotation.x = -0.18;
  room.add(consoleSlab);
  addEdges(consoleSlab, 0x111622, 0.44);

  [-13.65, -10.35].forEach((x) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.65, 0.28), makeMaterial(0x111622, 0.16));
    arm.position.set(x, 2.12, -4.25);
    arm.rotation.z = x < -12 ? -0.24 : 0.24;
    room.add(arm);
    addEdges(arm, 0x38d8ff, 0.32);
  });

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

  const monitorFace = createVerticalShapeMesh(
    [
      [-1.8, -1.12],
      [1.45, -1.0],
      [1.82, 0.78],
      [0.92, 1.22],
      [-1.55, 1.02],
      [-1.95, 0.05]
    ],
    0x111622
  );
  monitorFace.position.set(-12, 2.72, -4.08);
  room.add(monitorFace);

  const monitorScreen = createVerticalShapeMesh(
    [
      [-1.28, -0.66],
      [1.0, -0.56],
      [1.22, 0.48],
      [0.55, 0.74],
      [-1.05, 0.62],
      [-1.34, 0.04]
    ],
    0x9beaff
  );
  monitorScreen.position.set(-12, 2.72, -4.0);
  room.add(monitorScreen);

  const monitorCrown = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.28, 0.28), makeMaterial(0xffd95c, 0.18));
  monitorCrown.position.set(-12, 3.75, -4.22);
  monitorCrown.rotation.z = -0.05;
  room.add(monitorCrown);

  const miniBolt = createBoltMesh(0xff4f4a, 0.42);
  miniBolt.position.set(-10.62, 2.72, -4.05);
  miniBolt.rotation.y = Math.PI;
  room.add(miniBolt);

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
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.85, 3.2, 0.85), makeMaterial(0x211a3d, 0.22));
    trunk.position.set(x, 1.6, z);
    trunk.rotation.z = x < 0 ? -0.08 : 0.08;
    trunk.castShadow = true;
    scene.add(trunk);
    addEdges(trunk, 0x111622, 0.42);

    const foliageGroup = new THREE.Group();
    foliageGroup.position.set(x, 4.6, z);
    [
      { y: 0, scale: [3.4, 2.2, 2.9], color: 0x27c36a, rz: -0.12 },
      { y: 1.35, scale: [2.8, 2.1, 2.45], color: 0x53ec7e, rz: 0.1 },
      { y: 2.55, scale: [2.05, 1.75, 1.9], color: 0xffd95c, rz: -0.08 }
    ].forEach((leaf) => {
      const mesh = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4), makeMaterial(leaf.color, 0.2));
      mesh.scale.set(...leaf.scale);
      mesh.position.y = leaf.y;
      mesh.rotation.y = Math.PI / 4;
      mesh.rotation.z = leaf.rz;
      mesh.castShadow = true;
      foliageGroup.add(mesh);
    });
    scene.add(foliageGroup);
    addGroupEdges(foliageGroup, 0x111622, 0.34);
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

function createBoltMesh(color, scale = 1) {
  const shape = new THREE.Shape();
  shape.moveTo(-0.18, 0.62);
  shape.lineTo(0.28, 0.62);
  shape.lineTo(0.02, 0.08);
  shape.lineTo(0.42, 0.08);
  shape.lineTo(-0.28, -0.72);
  shape.lineTo(-0.08, -0.18);
  shape.lineTo(-0.46, -0.18);
  shape.lineTo(-0.18, 0.62);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.08,
    bevelEnabled: false
  });
  geometry.center();
  const mesh = new THREE.Mesh(geometry, makeMaterial(color, 0.18));
  mesh.scale.setScalar(scale);
  mesh.castShadow = true;
  return mesh;
}

function createVerticalShapeMesh(points, color) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], index) => {
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  const mesh = new THREE.Mesh(geometry, makeMaterial(color, 0.16));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createGroundShapeMesh(points, color) {
  const shape = new THREE.Shape();
  points.forEach(([x, z], index) => {
    if (index === 0) shape.moveTo(x, z);
    else shape.lineTo(x, z);
  });
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, makeMaterial(color, 0.16));
  mesh.receiveShadow = true;
  return mesh;
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

function addGroupEdges(group, color, opacity) {
  group.traverse((child) => {
    if (child.isMesh) addEdges(child, color, opacity);
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
