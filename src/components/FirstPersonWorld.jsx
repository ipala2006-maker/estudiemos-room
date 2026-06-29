import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Casa1 } from '../maps/Casa1.js';

const activeMap = Casa1;
const startPosition = activeMap.startPosition;
const houseDoorPosition = activeMap.entrancePosition;
const computerPosition = activeMap.computerPosition;
const toonGradient = createToonGradient();
const modelLoader = new GLTFLoader();

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
  addModelNeighborhoodHouses(scene);
  addSkylinePanels(scene);
  addStageSetPieces(scene);
  addCourtyardProps(scene, textures);
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
    new THREE.BoxGeometry(2.55, 1.1, 0.28),
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

  const cap = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.22, 0.42), makeMaterial(0x111622, 0.18));
  cap.position.set(-4.6, 2.92, 5.5);
  cap.rotation.z = -0.08;
  scene.add(cap);

  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.1, 0.24), makeMaterial(0x111622, 0.18));
  bracket.position.set(-3.12, 2.18, 5.5);
  bracket.rotation.z = -0.22;
  scene.add(bracket);

  const bolt = createBoltMesh(0xffd95c, 1.15);
  bolt.position.set(-4.6, 2.42, 4.63);
  bolt.rotation.y = Math.PI;
  scene.add(bolt);
  addEdges(bolt, 0x111622, 0.45);
}

function addPathGeometryDepth(scene, pathMaterial) {
  const curbMaterial = makeMaterial(0x111622, 0.18);
  for (let i = 0; i < 5; i += 1) {
    const z = 8.8 - i * 4.8;
    const width = 8.2 - i * 0.42;
    const lip = createGroundShapeMesh(
      [
        [-width / 2, z],
        [width / 2, z - 0.55],
        [width / 2 - 0.22, z - 1.05],
        [-width / 2 - 0.22, z - 0.5]
      ],
      0x111622
    );
    lip.position.y = 0.285;
    scene.add(lip);

    const riser = new THREE.Mesh(new THREE.BoxGeometry(width, 0.18, 0.24), curbMaterial);
    riser.position.set(0, 0.18, z - 0.7);
    riser.rotation.y = -0.06;
    riser.castShadow = true;
    scene.add(riser);
  }

  [-3.85, 3.85].forEach((x) => {
    const railBase = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 29), pathMaterial);
    railBase.position.set(x, 0.25, 1.6);
    railBase.castShadow = true;
    railBase.receiveShadow = true;
    scene.add(railBase);
    addEdges(railBase, 0x111622, 0.28);
  });
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

function addCourtyardProps(scene, textures) {
  addCartoonCrateStack(scene, -21.5, 4.5, 0.9, textures);
  addCartoonCrateStack(scene, 21.2, 2.8, -0.9, textures);
  addGraphicBench(scene, -15, -7.8, 0.28);
  addGraphicBench(scene, 15, -7.2, -0.24);
  addRoundStudySpot(scene, -16.5, 13.2, 0x8fb9b0);
  addRoundStudySpot(scene, 16.8, 12.5, 0xd1a86a);
  addRailSegment(scene, -24, 16, -24, 2, 0x1d7b69);
  addRailSegment(scene, 24, 15, 24, 1, 0x1d7b69);
  addGroundGrate(scene, -18.8, 18.2, 0.15);
  addGroundGrate(scene, 18.8, 18.2, -0.15);
}

function addModelNeighborhoodHouses(scene) {
  const houseModels = [
    {
      file: 'Two story house-9N6ROCbmO1.glb',
      position: [0, 0, -20],
      targetSize: 12.8,
      rotationY: Math.PI
    },
    {
      file: 'House.glb',
      position: [-18, 0, -18],
      targetSize: 11.4,
      rotationY: Math.PI
    },
    {
      file: 'Two story house-sGgL4Nt7I7.glb',
      position: [18, 0, -18],
      targetSize: 11.6,
      rotationY: Math.PI
    }
  ];

  houseModels.forEach((config, index) => {
    const url = `${import.meta.env.BASE_URL}models/vendor/poly-pizza/suburban-houses/${encodeURIComponent(config.file)}`;
    modelLoader.load(
      url,
      (gltf) => {
        const root = gltf.scene;
        root.name = `cc0-house-${index + 1}`;
        prepareImportedModel(root);
        fitImportedModel(root, config.targetSize);
        root.rotation.y = config.rotationY;
        root.position.set(config.position[0], config.position[1], config.position[2]);
        scene.add(root);
      },
      undefined,
      () => {
        addNeighborhoodHouse(scene, createFallbackHouseMaterials(), config.position[0], config.position[2], index === 0);
      }
    );
  });
}

function prepareImportedModel(root) {
  root.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        material.side = THREE.FrontSide;
        material.needsUpdate = true;
      });
    }
    addEdges(child, 0x111622, 0.32);
  });
}

function fitImportedModel(root, targetSize) {
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const widest = Math.max(size.x, size.z, 0.001);
  const scale = targetSize / widest;
  root.scale.setScalar(scale);

  const scaledBox = new THREE.Box3().setFromObject(root);
  const scaledCenter = new THREE.Vector3();
  scaledBox.getCenter(scaledCenter);
  root.position.sub(scaledCenter);
  root.position.y -= scaledBox.min.y;
}

function createFallbackHouseMaterials() {
  const textures = {
    plaster: createTexture('plaster'),
    wood: createTexture('wood')
  };
  return {
    houseWall: makeMaterial(0xffef9b, 0.32, 0, textures.plaster),
    roofMaterial: makeMaterial(0xff3d34, 0.26, 0, createTexture('roof')),
    doorMaterial: makeMaterial(0x211a3d, 0.28, 0, textures.wood),
    textures
  };
}

function addCartoonCrateStack(scene, x, z, lean, textures) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  [
    { pos: [0, 0.75, 0], size: [3.3, 1.5, 2.2], color: 0xb07b52, rz: 0.02 },
    { pos: [1.15, 2.15, -0.25], size: [2.2, 1.35, 2], color: 0xc59464, rz: -0.08 },
    { pos: [-1.2, 2.1, 0.45], size: [2, 1.25, 1.8], color: 0x7aa98f, rz: 0.08 }
  ].forEach((crate) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...crate.size), makeMaterial(crate.color, 0.24, 0, textures.wood));
    mesh.position.set(...crate.pos);
    mesh.rotation.z = crate.rz + lean * 0.03;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    addCrateMarks(group, crate.pos, crate.size);
  });
  scene.add(group);
  addGroupEdges(group, 0x111622, 0.44);
}

function addCrateMarks(group, pos, size) {
  const mark = createVerticalShapeMesh(
    [
      [-0.75, -0.08],
      [-0.56, -0.28],
      [0, 0.15],
      [0.58, -0.3],
      [0.78, -0.08],
      [0.18, 0.38],
      [0.76, 0.82],
      [0.56, 1.02],
      [0, 0.58],
      [-0.58, 1.02],
      [-0.78, 0.82],
      [-0.18, 0.38]
    ],
    0x27352f
  );
  mark.position.set(pos[0], pos[1] + 0.1, pos[2] + size[2] / 2 + 0.03);
  mark.scale.setScalar(Math.min(size[0], size[1]) * 0.42);
  group.add(mark);
}

function addGraphicBench(scene, x, z, rotationY) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotationY;
  const seat = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.38, 1.45), makeMaterial(0x7fb88b, 0.22));
  seat.position.y = 1.1;
  group.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(5.35, 1.35, 0.34), makeMaterial(0x8fc59a, 0.22));
  back.position.set(0, 1.85, -0.62);
  back.rotation.x = -0.12;
  group.add(back);
  [-2.25, 2.25].forEach((lx) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.26, 1.08, 0.26), makeMaterial(0x2a2a2e, 0.18));
    leg.position.set(lx, 0.55, 0.42);
    group.add(leg);
  });
  const pillow = createVerticalShapeMesh(
    [
      [-0.75, -0.46],
      [0.74, -0.34],
      [0.84, 0.42],
      [-0.56, 0.55]
    ],
    0x38d8ff
  );
  pillow.position.set(1.35, 2.05, -0.83);
  pillow.scale.set(0.9, 0.9, 0.9);
  group.add(pillow);
  scene.add(group);
  addGroupEdges(group, 0x111622, 0.42);
}

function addRoundStudySpot(scene, x, z, color) {
  const rug = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 0.06, 48), makeMaterial(color, 0.24));
  rug.position.set(x, 0.08, z);
  rug.receiveShadow = true;
  scene.add(rug);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.55, 0.045, 8, 64), makeMaterial(0x111622, 0.18));
  ring.position.set(x, 0.14, z);
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);
}

function addRailSegment(scene, x1, z1, x2, z2, color) {
  const group = new THREE.Group();
  const dx = x2 - x1;
  const dz = z2 - z1;
  const length = Math.hypot(dx, dz);
  const angle = Math.atan2(dx, dz);
  group.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
  group.rotation.y = angle;
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, length), makeMaterial(color, 0.18));
  rail.position.y = 1.8;
  group.add(rail);
  for (let i = -length / 2; i <= length / 2; i += 2.1) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.8, 0.18), makeMaterial(0x17463f, 0.18));
    post.position.set(0, 0.9, i);
    group.add(post);
  }
  scene.add(group);
  addGroupEdges(group, 0x111622, 0.36);
}

function addGroundGrate(scene, x, z, rotationY) {
  const group = new THREE.Group();
  group.position.set(x, 0.17, z);
  group.rotation.y = rotationY;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.08, 2.2), makeMaterial(0x2c3036, 0.18));
  group.add(frame);
  for (let i = -2.1; i <= 2.1; i += 0.52) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.11, 2.3), makeMaterial(0x9aa4a8, 0.18));
    bar.position.x = i;
    group.add(bar);
  }
  scene.add(group);
  addGroupEdges(group, 0x111622, 0.32);
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

function addLayeredRoofGeometry(houseGroup, isCasa1) {
  [
    { y: 8.08, z: 4.72, width: 13.4, depth: 0.62 },
    { y: 7.72, z: 4.98, width: 11.2, depth: 0.42 }
  ].forEach((layer, index) => {
    const eave = new THREE.Mesh(
      new THREE.BoxGeometry(layer.width, 0.28, layer.depth),
      makeMaterial(index === 0 ? 0x111622 : isCasa1 ? 0x38d8ff : 0xffd95c, 0.16)
    );
    eave.position.set(0, layer.y, layer.z);
    eave.rotation.x = -0.06;
    houseGroup.add(eave);
    addEdges(eave, 0x111622, 0.34);
  });

  [-4.9, 4.9].forEach((x) => {
    const support = new THREE.Mesh(new THREE.BoxGeometry(0.36, 1.25, 0.36), makeMaterial(0x111622, 0.16));
    support.position.set(x, 7.25, 4.52);
    support.rotation.z = x < 0 ? -0.22 : 0.22;
    houseGroup.add(support);
  });
}

function addHouseDepthDetails(houseGroup, isCasa1, materials) {
  const wallTone = isCasa1 ? 0xffef9b : 0xffe7a8;
  [
    { x: -3.35, y: 4.65, w: 2.55, h: 1.75, rz: -0.1 },
    { x: 3.25, y: 4.55, w: 2.45, h: 1.7, rz: 0.1 }
  ].forEach((win) => {
    const recess = new THREE.Mesh(new THREE.BoxGeometry(win.w, win.h, 0.42), makeMaterial(0x111622, 0.16));
    recess.position.set(win.x, win.y, 4.98);
    recess.rotation.z = win.rz;
    houseGroup.add(recess);

    const sill = new THREE.Mesh(new THREE.BoxGeometry(win.w + 0.42, 0.24, 0.58), makeMaterial(0xffd95c, 0.16));
    sill.position.set(win.x, win.y - win.h / 2 - 0.22, 5.22);
    sill.rotation.z = win.rz;
    houseGroup.add(sill);
  });

  const porch = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.36, 2.1), makeMaterial(wallTone, 0.18, 0, materials.textures.plaster));
  porch.position.set(0, 0.35, 5.55);
  porch.castShadow = true;
  porch.receiveShadow = true;
  houseGroup.add(porch);
  addEdges(porch, 0x111622, 0.36);

  const entryCanopy = createVerticalShapeMesh(
    [
      [-2.55, -0.35],
      [2.45, -0.22],
      [1.9, 0.62],
      [-2.2, 0.76]
    ],
    0x111622
  );
  entryCanopy.position.set(0, 4.05, 5.58);
  houseGroup.add(entryCanopy);

  const sideBay = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.7, 2.2), makeMaterial(wallTone, 0.2, 0, materials.textures.plaster));
  sideBay.position.set(isCasa1 ? -5.9 : 5.9, 3.1, 1.6);
  sideBay.rotation.y = isCasa1 ? -0.12 : 0.12;
  sideBay.castShadow = true;
  sideBay.receiveShadow = true;
  houseGroup.add(sideBay);
  addEdges(sideBay, 0x111622, 0.38);
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
  addInteriorWorkstationSet(room, textures);

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

function addInteriorWorkstationSet(room, textures) {
  addMonitorDeskBank(room, textures, -19.8, -18.5, 0.18);
  addMonitorDeskBank(room, textures, 19.2, -18.2, -0.18);
  addCableRuns(room);
  addStorageWall(room, textures);
  addSmallTableCluster(room);
}

function addInteriorArchitectureDepth(room) {
  const structural = makeMaterial(0x111622, 0.18);
  const lightPanel = makeMaterial(0xffffff, 0.22);
  const accentPanel = makeMaterial(0xfdfdf2, 0.22);

  [-22, -11, 11, 22].forEach((x) => {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.65, 15.2, 0.55), structural);
    rib.position.set(x, 7.6, -28.25);
    rib.castShadow = true;
    room.add(rib);
    addEdges(rib, 0x111622, 0.32);
  });

  [-21.8, 21.8].forEach((x) => {
    const sideRib = new THREE.Mesh(new THREE.BoxGeometry(0.55, 13.5, 0.65), structural);
    sideRib.position.set(x < 0 ? -27.25 : 27.25, 7.1, -11);
    sideRib.rotation.z = x < 0 ? -0.02 : 0.02;
    sideRib.castShadow = true;
    room.add(sideRib);
  });

  [
    { pos: [-27.18, 8.2, 6], size: [0.44, 8.6, 10.5], rot: 0.04 },
    { pos: [27.18, 8.2, 7], size: [0.44, 8.6, 10.5], rot: -0.04 },
    { pos: [-27.12, 6.4, -20], size: [0.42, 6.5, 8.4], rot: -0.05 },
    { pos: [27.12, 6.4, -21], size: [0.42, 6.5, 8.4], rot: 0.05 }
  ].forEach((panel, index) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...panel.size), index % 2 === 0 ? lightPanel : accentPanel);
    mesh.position.set(...panel.pos);
    mesh.rotation.z = panel.rot;
    mesh.castShadow = true;
    room.add(mesh);
    addEdges(mesh, 0x111622, 0.22);
  });

  [-18, 0, 18].forEach((x) => {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.45, 1.2), structural);
    beam.position.set(x, 15.35, -5);
    beam.rotation.z = x === 0 ? 0 : x < 0 ? -0.08 : 0.08;
    beam.castShadow = true;
    room.add(beam);
  });
}

function addScreenStructuralSupports(room) {
  const material = makeMaterial(0x111622, 0.16);
  [
    { pos: [-18.4, 7.4, -27.92], size: [0.72, 14.2, 0.72], rz: -0.04 },
    { pos: [18.4, 7.4, -27.92], size: [0.72, 14.2, 0.72], rz: 0.04 },
    { pos: [-9.2, 1.15, -27.6], size: [7.8, 0.55, 1.25], rz: 0.03 },
    { pos: [9.2, 1.15, -27.6], size: [7.8, 0.55, 1.25], rz: -0.03 }
  ].forEach((part) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...part.size), material);
    mesh.position.set(...part.pos);
    mesh.rotation.z = part.rz;
    mesh.castShadow = true;
    room.add(mesh);
    addEdges(mesh, 0x111622, 0.34);
  });

  [-14.5, 14.5].forEach((x) => {
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.35, 0.45, 6), makeMaterial(0x211a3d, 0.18));
    foot.position.set(x, 0.28, -27.2);
    foot.rotation.y = Math.PI / 6;
    foot.castShadow = true;
    room.add(foot);
    addEdges(foot, 0x111622, 0.34);
  });
}

function addMonitorDeskBank(room, textures, x, z, angle) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = angle;
  const desk = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.55, 2.4), makeMaterial(0x565e60, 0.22, 0, textures.blackStripe));
  desk.position.y = 2.25;
  group.add(desk);
  [-4.4, 4.4].forEach((lx) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.32, 2.2, 0.32), makeMaterial(0x20252a, 0.18));
    leg.position.set(lx, 1.1, 0.85);
    group.add(leg);
  });

  [
    { x: -3.2, y: 3.45, rot: -0.16, scale: 1 },
    { x: 0.3, y: 3.85, rot: 0.04, scale: 1.18 },
    { x: 3.7, y: 3.45, rot: 0.16, scale: 1 }
  ].forEach((screen) => {
    addTechMonitor(group, screen.x, screen.y, -0.9, screen.rot, screen.scale);
  });

  const tower = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.2, 1.1), makeMaterial(0x20252a, 0.18));
  tower.position.set(-5.1, 1.15, -0.35);
  group.add(tower);
  const towerLight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.08), makeEmissiveMaterial(0x38d8ff, 0.7));
  towerLight.position.set(-5.1, 1.8, -0.93);
  group.add(towerLight);

  room.add(group);
  addGroupEdges(group, 0x111622, 0.38);
}

function addTechMonitor(group, x, y, z, rotationZ, scale) {
  const frame = createVerticalShapeMesh(
    [
      [-1.5, -0.8],
      [1.6, -0.72],
      [1.45, 0.92],
      [-1.35, 0.8]
    ],
    0x111622
  );
  frame.position.set(x, y, z);
  frame.rotation.z = rotationZ;
  frame.scale.setScalar(scale);
  group.add(frame);

  const display = createVerticalShapeMesh(
    [
      [-1.22, -0.58],
      [1.26, -0.52],
      [1.12, 0.66],
      [-1.08, 0.58]
    ],
    0x155cff
  );
  display.position.set(x, y, z + 0.06);
  display.rotation.z = rotationZ;
  display.scale.setScalar(scale);
  group.add(display);

  const glow = new THREE.PointLight(0x38d8ff, 0.38, 6, 2);
  glow.position.set(x, y, z + 0.8);
  group.add(glow);

  for (let i = 0; i < 4; i += 1) {
    const line = createVerticalShapeMesh(
      [
        [-0.92 + i * 0.42, -0.35],
        [-0.82 + i * 0.42, -0.35],
        [-0.72 + i * 0.42, 0.35],
        [-0.82 + i * 0.42, 0.35]
      ],
      i % 2 === 0 ? 0x38d8ff : 0xffd95c
    );
    line.position.set(x, y, z + 0.08);
    line.rotation.z = rotationZ;
    line.scale.setScalar(scale);
    group.add(line);
  }
}

function addCableRuns(room) {
  [
    { points: [[-18, 0.12, -15], [-12, 0.12, -9], [-8, 0.12, -10]], color: 0x111622 },
    { points: [[18, 0.12, -16], [12, 0.12, -9], [8, 0.12, -10]], color: 0x111622 },
    { points: [[-13, 0.14, -3], [-7, 0.14, 1], [-2, 0.14, -2]], color: 0xff4f4a }
  ].forEach((cable) => {
    for (let i = 0; i < cable.points.length - 1; i += 1) {
      const [x1, y1, z1] = cable.points[i];
      const [x2, y2, z2] = cable.points[i + 1];
      const dx = x2 - x1;
      const dz = z2 - z1;
      const length = Math.hypot(dx, dz);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, length), makeMaterial(cable.color, 0.16));
      mesh.position.set((x1 + x2) / 2, y1, (z1 + z2) / 2);
      mesh.rotation.y = Math.atan2(dx, dz);
      room.add(mesh);
    }
  });
}

function addStorageWall(room, textures) {
  const group = new THREE.Group();
  group.position.set(-24.8, 0, 12);
  group.rotation.y = Math.PI / 2;
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.32, 1.2), makeMaterial(0x565e60, 0.22));
  shelf.position.y = 3.2;
  group.add(shelf);
  const shelf2 = shelf.clone();
  shelf2.position.y = 5.2;
  group.add(shelf2);
  [
    { pos: [-3, 1.1, 0], size: [1.6, 2.2, 1.2], color: 0xb07b52 },
    { pos: [-1.3, 1.55, 0.1], size: [1.8, 3.1, 1.2], color: 0xc59464 },
    { pos: [1, 1.25, 0], size: [1.7, 2.5, 1.2], color: 0x7aa98f },
    { pos: [3, 0.8, 0], size: [1.5, 1.6, 1.2], color: 0xffd95c }
  ].forEach((box) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...box.size), makeMaterial(box.color, 0.24, 0, textures.wood));
    mesh.position.set(...box.pos);
    group.add(mesh);
  });
  room.add(group);
  addGroupEdges(group, 0x111622, 0.38);
}

function addSmallTableCluster(room) {
  const table = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.28, 2.8), makeMaterial(0xe1d2ad, 0.22));
  table.position.set(0, 1.35, 13.4);
  room.add(table);
  addEdges(table, 0x111622, 0.36);
  [-1.65, 1.65].forEach((x) => {
    [-1, 1].forEach((z) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.35, 0.18), makeMaterial(0x111622, 0.18));
      leg.position.set(x, 0.68, 13.4 + z);
      room.add(leg);
    });
  });
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.7, 16), makeMaterial(0xff4f4a, 0.2));
  cup.position.set(1.25, 1.85, 13.1);
  room.add(cup);
  const tablet = createGroundShapeMesh(
    [
      [-0.7, -0.45],
      [0.7, -0.36],
      [0.62, 0.45],
      [-0.62, 0.36]
    ],
    0x155cff
  );
  tablet.position.set(-0.8, 1.53, 13.4);
  tablet.rotation.y = 0.2;
  room.add(tablet);
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

function addControlConsoleGeometry(room, textures) {
  const consoleShell = createGroundShapeMesh(
    [
      [-2.6, -1.1],
      [2.45, -0.88],
      [1.95, 0.95],
      [-2.25, 1.2]
    ],
    0x211a3d
  );
  consoleShell.position.set(-12, 1.96, -3.62);
  consoleShell.rotation.x = -0.22;
  room.add(consoleShell);

  [
    { x: -13.45, z: -3.55, s: 0.32 },
    { x: -12.55, z: -3.45, s: 0.24 },
    { x: -11.65, z: -3.5, s: 0.3 },
    { x: -10.85, z: -3.42, s: 0.22 }
  ].forEach((button) => {
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(button.s, button.s * 0.82, 0.18, 12), makeEmissiveMaterial(0x38d8ff, 0.42));
    knob.position.set(button.x, 2.12, button.z);
    knob.rotation.x = Math.PI / 2;
    room.add(knob);
    addEdges(knob, 0x111622, 0.28);
  });

  const sidePanel = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.25, 2.2), makeMaterial(0x111622, 0.16, 0, textures.blackStripe));
  sidePanel.position.set(-14.85, 1.15, -4);
  sidePanel.rotation.z = -0.08;
  room.add(sidePanel);
  const sidePanel2 = sidePanel.clone();
  sidePanel2.position.x = -9.15;
  sidePanel2.rotation.z = 0.08;
  room.add(sidePanel2);
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

    [-0.42, 0.42].forEach((offset) => {
      const root = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.28, 0.34), makeMaterial(0x211a3d, 0.22));
      root.position.set(x + offset, 0.18, z + (offset > 0 ? 0.28 : -0.22));
      root.rotation.y = offset > 0 ? 0.45 : -0.35;
      root.castShadow = true;
      scene.add(root);
      addEdges(root, 0x111622, 0.34);
    });

    const foliageGroup = new THREE.Group();
    foliageGroup.position.set(x, 4.6, z);
    [
      { pos: [-0.42, -0.1, 0.08], scale: [2.65, 1.6, 2.2], color: 0x27c36a, rz: -0.18, ry: 0.2 },
      { pos: [0.7, 0.85, -0.22], scale: [2.35, 1.55, 2.05], color: 0x53ec7e, rz: 0.14, ry: -0.35 },
      { pos: [-0.1, 1.85, 0.15], scale: [1.75, 1.35, 1.55], color: 0xffd95c, rz: -0.08, ry: 0.55 },
      { pos: [-0.95, 0.9, -0.15], scale: [1.55, 1.2, 1.45], color: 0x38d8ff, rz: 0.22, ry: -0.2 }
    ].forEach((leaf) => {
      const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), makeMaterial(leaf.color, 0.2));
      mesh.scale.set(...leaf.scale);
      mesh.position.set(...leaf.pos);
      mesh.rotation.y = leaf.ry;
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
