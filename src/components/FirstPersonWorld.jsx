import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CSS3DObject, CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { Casa1 } from '../maps/Casa1.js';
import { buildYouTubeEmbedUrl } from '../utils/youtube.js';

const activeMap = Casa1;
const startPosition = activeMap.startPosition;
const houseDoorPosition = activeMap.entrancePosition;
const computerPosition = activeMap.computerPosition;
const modelLoader = new GLTFLoader();
const textureCache = new Map();
const materialCache = new Map();
const emissiveMaterialCache = new Map();
const edgeMaterialCache = new Map();
const PLAYER_RADIUS = 0.58;
const WALK_SPEED = 9.6;
const WALK_ACCELERATION = 18;
const WALK_DECELERATION = 24;
const EDGE_OPACITY_SCALE = 0.28;
const INTERIOR_LOOK_TARGET = activeMap.interiorSpawnLookAt ?? new THREE.Vector3(84, 2.1, -24);
const GIANT_SCREEN_WORLD = {
  center: new THREE.Vector3(90, 8.5, -34.25),
  width: 34.6,
  height: 12.8
};
const GIANT_SCREEN_DOM_SIZE = {
  width: 1730,
  height: 640
};
const DEFAULT_SCREEN_LAYOUT = 'split-70-30';
const DEFAULT_SCREEN_ZONES = {
  upper: { videoId: '', embedUrl: '', contentType: 'empty', resourceUrl: '', title: '', muted: true, volume: 70, updatedAt: 0 },
  lower: { videoId: '', embedUrl: '', contentType: 'empty', resourceUrl: '', title: '', muted: true, volume: 70, updatedAt: 0 }
};

export function FirstPersonWorld({
  onDoorOpenChange,
  onNearComputerChange,
  onNearDoorChange,
  resetRef,
  toggleDoorRef,
  controlsEnabled = true,
  screenZones = DEFAULT_SCREEN_ZONES,
  screenLayout = DEFAULT_SCREEN_LAYOUT
}) {
  const mountRef = useRef(null);
  const nearDoorRef = useRef(false);
  const nearComputerRef = useRef(false);
  const doorOpenRef = useRef(false);
  const controlsEnabledRef = useRef(controlsEnabled);
  const screenZonesRef = useRef(screenZones);
  const screenLayoutRef = useRef(screenLayout);

  useEffect(() => {
    controlsEnabledRef.current = controlsEnabled;
    if (!controlsEnabled) {
      document.exitPointerLock?.();
    }
  }, [controlsEnabled]);

  useEffect(() => {
    screenZonesRef.current = screenZones;
  }, [screenZones]);

  useEffect(() => {
    screenLayoutRef.current = screenLayout;
  }, [screenLayout]);

  useEffect(() => {
    const mount = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9ea99a);
    scene.fog = new THREE.Fog(0xa7ad9d, 54, 142);
    addStaticSkyDome(scene);

    const camera = new THREE.PerspectiveCamera(68, mount.clientWidth / mount.clientHeight, 0.1, 120);
    camera.position.copy(startPosition);
    camera.rotation.order = 'YXZ';

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const cssScene = new THREE.Scene();
    const cssRenderer = new CSS3DRenderer();
    cssRenderer.setSize(mount.clientWidth, mount.clientHeight);
    cssRenderer.domElement.className = 'css3d-world-layer';
    cssRenderer.domElement.style.position = 'absolute';
    cssRenderer.domElement.style.inset = '0';
    cssRenderer.domElement.style.pointerEvents = 'none';
    mount.appendChild(cssRenderer.domElement);

    const cssGiantScreen = createCssGiantScreenObject();
    cssGiantScreen.visible = false;
    cssScene.add(cssGiantScreen);

    const ambient = new THREE.HemisphereLight(0xfff0d2, 0x263a36, 0.9);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffdca6, 2.45);
    sun.position.set(28, 31, 16);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 74;
    sun.shadow.camera.left = -42;
    sun.shadow.camera.right = 42;
    sun.shadow.camera.top = 42;
    sun.shadow.camera.bottom = -42;
    scene.add(sun);

    const rimLight = new THREE.DirectionalLight(0xb9d7df, 0.32);
    rimLight.position.set(-24, 13, 24);
    scene.add(rimLight);

    const softFill = new THREE.DirectionalLight(0xfff0d2, 0.24);
    softFill.position.set(-18, 11, -8);
    scene.add(softFill);

    const { giantScreen, colliders } = buildWorldScene(scene);

    const keys = {
      forward: false,
      backward: false,
      left: false,
      right: false
    };
    const inputDirection = new THREE.Vector3();
    const cameraForwardHorizontal = new THREE.Vector3();
    const cameraRightHorizontal = new THREE.Vector3();
    const movementVelocity = new THREE.Vector3();
    const targetVelocity = new THREE.Vector3();
    const movementStep = new THREE.Vector3();
    let yaw = 0;
    let pitch = 0;
    let pointerLocked = false;
    let verticalVelocity = 0;
    let isGrounded = true;
    const eyeHeight = startPosition.y;

    function clearMovementInput() {
      keys.forward = false;
      keys.backward = false;
      keys.left = false;
      keys.right = false;
    }

    function resetCamera() {
      camera.position.copy(startPosition);
      movementVelocity.set(0, 0, 0);
      verticalVelocity = 0;
      isGrounded = true;
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

    function faceCameraToward(target) {
      yaw = Math.atan2(camera.position.x - target.x, camera.position.z - target.z);
      pitch = 0;
      camera.rotation.set(pitch, yaw, 0);
    }

    resetRef.current = resetCamera;
    toggleDoorRef.current = () => {
      doorOpenRef.current = !doorOpenRef.current;
      camera.position.copy(doorOpenRef.current ? activeMap.interiorSpawnPosition : startPosition);
      movementVelocity.set(0, 0, 0);
      yaw = 0;
      pitch = 0;
      if (doorOpenRef.current) {
        faceCameraToward(INTERIOR_LOOK_TARGET);
      } else {
        camera.rotation.set(pitch, yaw, 0);
      }
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
      if (event.code === 'Space' && isGrounded) {
        verticalVelocity = 6.2;
        isGrounded = false;
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

    function onPointerLockError() {
      pointerLocked = false;
    }

    function requestCameraLock() {
      if (!controlsEnabledRef.current || document.pointerLockElement === renderer.domElement) return;
      const lockRequest = renderer.domElement.requestPointerLock?.();
      lockRequest?.catch?.(() => {});
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
      cssRenderer.setSize(mount.clientWidth, mount.clientHeight);
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onResize);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('pointerlockerror', onPointerLockError);
    mount.addEventListener('click', requestCameraLock);

    const timer = new THREE.Timer();
    timer.connect(document);
    let frameId = 0;

    function animate(timestamp) {
      timer.update(timestamp);
      const delta = Math.min(timer.getDelta(), 0.04);
      if (!controlsEnabledRef.current) {
        clearMovementInput();
        movementVelocity.set(0, 0, 0);
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

      const hasMovementInput = controlsEnabledRef.current && inputDirection.lengthSq() > 0;
      targetVelocity.set(0, 0, 0);
      if (hasMovementInput) {
        inputDirection.normalize();
        targetVelocity.addScaledVector(inputDirection, WALK_SPEED);
      }

      const response = 1 - Math.exp(-(hasMovementInput ? WALK_ACCELERATION : WALK_DECELERATION) * delta);
      movementVelocity.lerp(targetVelocity, response);
      if (!hasMovementInput && movementVelocity.lengthSq() < 0.0025) {
        movementVelocity.set(0, 0, 0);
      }

      if (controlsEnabledRef.current && movementVelocity.lengthSq() > 0) {
        movementStep.copy(movementVelocity).multiplyScalar(delta);
        const isInterior = doorOpenRef.current;
        const bounds = isInterior ? activeMap.interiorBounds : activeMap.neighborhoodBounds;
        const collisionResult = movePlayerWithCollisions(
          camera.position,
          movementStep,
          bounds,
          isInterior ? colliders.interior : colliders.exterior,
          PLAYER_RADIUS
        );
        if (collisionResult.blockedX) movementVelocity.x = 0;
        if (collisionResult.blockedZ) movementVelocity.z = 0;
      }

      if (controlsEnabledRef.current || !isGrounded) {
        verticalVelocity -= 16.5 * delta;
        camera.position.y += verticalVelocity * delta;
        if (camera.position.y <= eyeHeight) {
          camera.position.y = eyeHeight;
          verticalVelocity = 0;
          isGrounded = true;
        }
      }

      updateGiantScreen(giantScreen, screenZonesRef.current, screenLayoutRef.current);
      updateCssGiantScreenContent(cssGiantScreen, screenZonesRef.current, screenLayoutRef.current);
      cssGiantScreen.visible = doorOpenRef.current;

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
      cssRenderer.render(cssScene, camera);
      frameId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      timer.dispose();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      document.removeEventListener('pointerlockerror', onPointerLockError);
      mount.removeEventListener('click', requestCameraLock);
      renderer.dispose();
      mount.removeChild(cssRenderer.domElement);
      mount.removeChild(renderer.domElement);
    };
  }, [onDoorOpenChange, onNearComputerChange, onNearDoorChange, resetRef, toggleDoorRef]);

  return <section className="three-world" ref={mountRef} aria-label="Mundo 3D en primera persona" />;
}

function createCssGiantScreenObject() {
  const root = document.createElement('div');
  root.className = 'physical-screen-content';
  root.style.width = `${GIANT_SCREEN_DOM_SIZE.width}px`;
  root.style.height = `${GIANT_SCREEN_DOM_SIZE.height}px`;

  const object = new CSS3DObject(root);
  object.position.copy(GIANT_SCREEN_WORLD.center);
  object.position.z += 0.16;
  object.scale.setScalar(GIANT_SCREEN_WORLD.width / GIANT_SCREEN_DOM_SIZE.width);
  object.userData.contentRoot = root;
  object.userData.screenStateKey = '';

  return object;
}

function getScreenLayoutDefinition(screenLayout, screenZones = DEFAULT_SCREEN_ZONES) {
  const upperHasVideo = Boolean(screenZones.upper?.videoId);
  const lowerHasVideo = Boolean(screenZones.lower?.videoId);

  if (screenLayout === 'single') {
    const zoneId = upperHasVideo || !lowerHasVideo ? 'upper' : 'lower';
    return {
      id: 'single',
      label: '1 video',
      rows: ['1fr'],
      slots: [
        {
          zoneId,
          label: 'Pantalla completa',
          slotLabel: '100%',
          accent: '#b9d7df',
          isPrimary: true
        }
      ]
    };
  }

  const layouts = {
    'split-50-50': { label: '50/50', upper: 50, lower: 50 },
    'split-30-70': { label: '30/70', upper: 30, lower: 70 },
    'split-70-30': { label: '70/30', upper: 70, lower: 30 }
  };
  const selected = layouts[screenLayout] ?? layouts[DEFAULT_SCREEN_LAYOUT];

  return {
    id: screenLayout,
    label: selected.label,
    rows: [`${selected.upper}fr`, `${selected.lower}fr`],
    slots: [
      {
        zoneId: 'upper',
        label: activeMap.screenChannels.primaryContent.label,
        slotLabel: `SUPERIOR ${selected.upper}%`,
        accent: '#b9d7df',
        isPrimary: selected.upper >= selected.lower
      },
      {
        zoneId: 'lower',
        label: activeMap.screenChannels.secondaryContent.label,
        slotLabel: `INFERIOR ${selected.lower}%`,
        accent: '#d7c28a',
        isPrimary: selected.lower > selected.upper
      }
    ]
  };
}

function updateCssGiantScreenContent(cssGiantScreen, screenZones, screenLayout) {
  const layout = getScreenLayoutDefinition(screenLayout, screenZones);
  const stateKey = JSON.stringify({
    layout: layout.id,
    upper: {
      videoId: screenZones.upper.videoId,
      contentType: screenZones.upper.contentType,
      resourceUrl: screenZones.upper.resourceUrl,
      title: screenZones.upper.title,
      muted: screenZones.upper.muted,
      volume: screenZones.upper.volume,
      updatedAt: screenZones.upper.updatedAt
    },
    lower: {
      videoId: screenZones.lower.videoId,
      contentType: screenZones.lower.contentType,
      resourceUrl: screenZones.lower.resourceUrl,
      title: screenZones.lower.title,
      muted: screenZones.lower.muted,
      volume: screenZones.lower.volume,
      updatedAt: screenZones.lower.updatedAt
    }
  });

  if (cssGiantScreen.userData.screenStateKey === stateKey) return;
  cssGiantScreen.userData.screenStateKey = stateKey;

  const root = cssGiantScreen.userData.contentRoot;
  root.textContent = '';
  root.style.gridTemplateRows = layout.rows.join(' ');

  layout.slots.forEach((slotConfig) => {
    const zone = screenZones[slotConfig.zoneId];
    const src = zone.contentType === 'pdf' ? buildPdfEmbedUrl(zone.resourceUrl) : buildYouTubeEmbedUrl(zone);
    const slot = document.createElement('div');
    slot.className = 'physical-screen-slot';

    if (src) {
      const iframe = document.createElement('iframe');
      iframe.src = src;
      iframe.title = `${slotConfig.label} - ${zone.title || zone.contentType || 'Contenido'}`;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.allowFullscreen = true;
      slot.appendChild(iframe);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'physical-screen-placeholder';
      const slotLabel = document.createElement('span');
      slotLabel.textContent = slotConfig.slotLabel;
      const emptyLabel = document.createElement('strong');
      emptyLabel.textContent = 'Sin video';
      placeholder.append(slotLabel, emptyLabel);
      slot.appendChild(placeholder);
    }

    root.appendChild(slot);
  });
}

function buildPdfEmbedUrl(resourceUrl) {
  if (!resourceUrl) return '';
  return `${resourceUrl}#toolbar=0&navpanes=0&view=FitH`;
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
    blackStripe: createTexture('blackStripe'),
    paper: createTexture('paper'),
    brushedMetal: createTexture('brushedMetal'),
    cork: createTexture('cork')
  };
  const groundMaterial = makeMaterial(0x526947, 0.82, 0, textures.grass);
  const pathMaterial = makeMaterial(0x8f877b, 0.74, 0, textures.path);
  const wallMaterial = makeMaterial(0x8f8678, 0.78, 0, textures.comicWall);
  const houseWall = makeMaterial(0xbfa17f, 0.68, 0, textures.plaster);
  const roofMaterial = makeMaterial(0x6f5546, 0.7, 0, textures.roof);
  const doorMaterial = makeMaterial(0x2e271f, 0.56, 0.01, textures.wood);

  addNeighborhood(scene, { groundMaterial, pathMaterial, wallMaterial, houseWall, roofMaterial, doorMaterial, textures });
  const giantScreen = addCasa1Interior(scene, textures);
  const colliders = createWorldColliders();
  return { giantScreen, colliders };
}

function addStaticSkyDome(scene) {
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(260, 64, 32),
    new THREE.MeshBasicMaterial({
      map: createSkyBackgroundTexture(),
      side: THREE.BackSide,
      depthWrite: false,
      fog: false
    })
  );
  sky.position.set(0, -18, 0);
  sky.renderOrder = -20;
  scene.add(sky);
}

function createWorldColliders() {
  const interiorCollider = (x, z, width, depth) => createCollider(90 + x, -6 + z, width, depth);

  return {
    exterior: [
      createCollider(0, -20.8, 15.2, 8.7),
      createCollider(-18, -19, 12.5, 8.5),
      createCollider(18, -19, 12.5, 8.5),
      createCollider(-4.35, -7.4, 0.8, 12.1),
      createCollider(4.35, -7.4, 0.8, 12.1),
      createCollider(-6.6, 4.8, 3.4, 1.1),
      createCollider(5.7, -12.8, 2.3, 1.1),
      createCollider(-19.5, -9.8, 2.7, 2.7),
      createCollider(20.4, -9.4, 2.7, 2.7),
      createCollider(-23.4, 7.6, 2.4, 2.4),
      createCollider(23.2, 12.8, 2.4, 2.4),
      createCollider(-25.2, 23, 2.1, 2.1),
      createCollider(25.1, 22.5, 2.1, 2.1),
      createCollider(-5.6, 8.6, 2.8, 1.9),
      createCollider(5.5, 7.9, 2.2, 1.6),
      createCollider(22.8, 5.2, 2.6, 1.8),
      createCollider(-23, 17, 2.1, 1.5)
    ],
    interior: [
      interiorCollider(0, -28.3, 39, 3.6),
      interiorCollider(-11.4, -8.6, 4.8, 2.6)
    ]
  };
}

function createCollider(centerX, centerZ, width, depth) {
  return {
    minX: centerX - width / 2,
    maxX: centerX + width / 2,
    minZ: centerZ - depth / 2,
    maxZ: centerZ + depth / 2
  };
}

function movePlayerWithCollisions(position, movementStep, bounds, colliders, radius) {
  let blockedX = false;
  let blockedZ = false;

  const nextX = clamp(position.x + movementStep.x, bounds.minX, bounds.maxX);
  if (!isPlayerColliding(nextX, position.z, colliders, radius)) {
    position.x = nextX;
  } else {
    blockedX = true;
  }

  const nextZ = clamp(position.z + movementStep.z, bounds.minZ, bounds.maxZ);
  if (!isPlayerColliding(position.x, nextZ, colliders, radius)) {
    position.z = nextZ;
  } else {
    blockedZ = true;
  }

  return { blockedX, blockedZ };
}

function isPlayerColliding(x, z, colliders, radius) {
  return colliders.some((collider) =>
    x + radius > collider.minX &&
    x - radius < collider.maxX &&
    z + radius > collider.minZ &&
    z - radius < collider.maxZ
  );
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
      makeMaterial(x < 0 ? 0x8a9188 : 0x77786e, 0.2)
    );
    pathEdge.position.set(x, 0.1, 2.5);
    pathEdge.receiveShadow = true;
    scene.add(pathEdge);
    addEdges(pathEdge, 0x111622, 0.32);
  });

  addBoundaryWalls(scene, wallMaterial);
  addExteriorHorizon(scene);
  addModelNeighborhoodHouses(scene);
  addModelNatureAssets(scene);
  addProfessionalGrassLayer(scene);
  addGrassEdgeBlends(scene, textures);
  addExteriorApproachDressing(scene, textures);
  addExteriorIdentityDetails(scene, textures);
  addExteriorCinematicLighting(scene);
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
    addEdges(wall, 0x7a7468, 0.24);
  });

  const capMaterial = makeMaterial(0xc7bea9, 0.5);
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

function addExteriorHorizon(scene) {
  const horizonMaterial = makeMaterial(0x6f806a, 0.58);
  const distantTreeMaterial = makeMaterial(0x506653, 0.6);
  const hazeMaterial = new THREE.MeshBasicMaterial({
    color: 0xd9dfd2,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    fog: false
  });

  [
    { position: [0, 5.9, -30.62], size: [60, 1.5, 0.08] },
    { position: [0, 5.9, 30.62], size: [60, 1.5, 0.08] },
    { position: [-30.62, 5.9, 0], size: [0.08, 1.5, 60] },
    { position: [30.62, 5.9, 0], size: [0.08, 1.5, 60] }
  ].forEach((band) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...band.size), horizonMaterial);
    mesh.position.set(...band.position);
    scene.add(mesh);
  });

  [
    [-26, -30.72, 3.2], [-18, -30.72, 2.5], [-9, -30.72, 3.6], [4, -30.72, 2.9], [16, -30.72, 3.4], [25, -30.72, 2.7],
    [-30.72, -22, 2.6], [-30.72, -8, 3.2], [-30.72, 7, 2.8], [-30.72, 20, 3.5],
    [30.72, -21, 3.1], [30.72, -6, 2.6], [30.72, 9, 3.4], [30.72, 23, 2.9]
  ].forEach(([x, z, h]) => {
    const tree = new THREE.Mesh(new THREE.ConeGeometry(1.4, h, 7), distantTreeMaterial);
    tree.position.set(x, 6.35 + h * 0.2, z);
    tree.rotation.y = x === -30.72 ? Math.PI / 2 : x === 30.72 ? -Math.PI / 2 : 0;
    scene.add(tree);
  });

  const haze = new THREE.Mesh(new THREE.BoxGeometry(62, 3.2, 0.05), hazeMaterial);
  haze.position.set(0, 7.2, -30.86);
  scene.add(haze);
}

function addExteriorCinematicLighting(scene) {
  [
    { position: [-4.7, 2.5, -14.35], color: 0xffd39b, intensity: 1.25, distance: 14 },
    { position: [4.7, 2.5, -14.35], color: 0xffd39b, intensity: 1.25, distance: 14 },
    { position: [-3.2, 0.9, 7.4], color: 0xd7c28a, intensity: 0.55, distance: 8 },
    { position: [3.2, 0.9, 2.2], color: 0xd7c28a, intensity: 0.45, distance: 8 }
  ].forEach((lightSpec) => {
    const light = new THREE.PointLight(lightSpec.color, lightSpec.intensity, lightSpec.distance, 2.05);
    light.position.set(...lightSpec.position);
    scene.add(light);
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
      targetSize: 19.2,
      rotationY: Math.PI
    },
    {
      file: 'House.glb',
      position: [-18, 0, -18],
      targetSize: 16.2,
      rotationY: Math.PI
    },
    {
      file: 'Two story house-sGgL4Nt7I7.glb',
      position: [18, 0, -18],
      targetSize: 16.4,
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

function addModelNatureAssets(scene) {
  [
    { x: -19.5, z: -9.8, height: 5.9, lean: -0.08, crown: 1.05 },
    { x: 20.4, z: -9.4, height: 5.8, lean: 0.06, crown: 1 },
    { x: -23.4, z: 7.6, height: 5.4, lean: 0.04, crown: 0.9 },
    { x: 23.2, z: 12.8, height: 5.7, lean: -0.1, crown: 0.98 },
    { x: -25.2, z: 23, height: 4.9, lean: 0.05, crown: 0.82 },
    { x: 25.1, z: 22.5, height: 5.1, lean: -0.04, crown: 0.86 }
  ].forEach((tree) => addLightweightTree(scene, tree));

  [
    { x: -8.7, z: 13.1, scale: 1.25, flowers: true },
    { x: 8.8, z: 13.3, scale: 1.1, flowers: false },
    { x: -3.9, z: -13.2, scale: 0.82, flowers: true },
    { x: 3.9, z: -13.1, scale: 0.76, flowers: true },
    { x: -25.8, z: -3.6, scale: 0.95, flowers: false }
  ].forEach((bush) => addLightweightBush(scene, bush));

  [
    { x: -5.6, z: 8.6, scale: 1.05 },
    { x: 5.5, z: 7.9, scale: 0.8 },
    { x: 22.8, z: 5.2, scale: 1 },
    { x: -23, z: 17, scale: 0.82 }
  ].forEach((rock) => addLightweightRock(scene, rock));
}

function addProfessionalGrassLayer(scene) {
  const geometry = new THREE.BoxGeometry(0.055, 0.34, 0.035);
  const material = makeMaterial(0x789268, 0.48);
  const bladeCount = 180;
  const grass = new THREE.InstancedMesh(geometry, material, bladeCount);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const rotation = new THREE.Euler();
  let index = 0;

  for (let i = 0; i < bladeCount; i += 1) {
    const x = -26 + ((i * 7.7) % 52);
    const z = -25 + ((i * 11.3) % 50);
    const nearMainPath = Math.abs(x) < 4.2 && z > -15.6 && z < 20.8;
    const nearHouse = Math.abs(x) < 11.2 && z < -12.5;
    if (nearMainPath || nearHouse) continue;

    position.set(x + Math.sin(i * 1.9) * 0.46, 0.18, z + Math.cos(i * 1.3) * 0.46);
    rotation.set(0.05 + (i % 5) * 0.025, i * 0.71, (i % 7 - 3) * 0.045);
    quaternion.setFromEuler(rotation);
    const height = 0.85 + (i % 6) * 0.11;
    scale.set(0.72 + (i % 4) * 0.12, height, 0.72);
    matrix.compose(position, quaternion, scale);
    grass.setMatrixAt(index, matrix);
    index += 1;
  }

  grass.count = index;
  grass.castShadow = true;
  grass.receiveShadow = true;
  scene.add(grass);
}

function addGrassEdgeBlends(scene, textures) {
  const material = makeMaterial(0x758b62, 0.5, 0, textures.grass);
  [
    { position: [-4.25, 0.08, 2.5], size: [0.72, 0.08, 34.6] },
    { position: [4.25, 0.08, 2.5], size: [0.72, 0.08, 34.6] },
    { position: [-1.8, 0.09, -15.8], size: [2.3, 0.07, 0.85] },
    { position: [1.8, 0.09, -15.8], size: [2.3, 0.07, 0.85] },
    { position: [-8.2, 0.08, 12.8], size: [5.6, 0.07, 1.05] },
    { position: [8.4, 0.08, 12.4], size: [5.4, 0.07, 1.05] }
  ].forEach((patch, index) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...patch.size), material);
    mesh.position.set(...patch.position);
    mesh.rotation.y = index % 2 === 0 ? -0.035 : 0.035;
    mesh.receiveShadow = true;
    scene.add(mesh);
  });
}

function addLightweightTree(scene, { x, z, height, lean, crown }) {
  const trunkMaterial = makeMaterial(0x4b3c32, 0.34);
  const leafMaterial = makeMaterial(0x5e7f63, 0.28);
  const leafAccentMaterial = makeMaterial(0x819879, 0.3);
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.72, height * 0.62, 0.72), trunkMaterial);
  trunk.position.y = height * 0.31;
  trunk.rotation.z = lean;
  trunk.castShadow = true;
  group.add(trunk);

  [
    { pos: [-0.35, height * 0.68, 0], scale: [1.6, 1.05, 1.45], material: leafMaterial },
    { pos: [0.42, height * 0.82, -0.15], scale: [1.45, 1, 1.35], material: leafAccentMaterial },
    { pos: [0, height * 0.98, 0.12], scale: [1.2, 0.88, 1.12], material: leafMaterial }
  ].forEach((leaf) => {
    const crownMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(crown, 0), leaf.material);
    crownMesh.position.set(...leaf.pos);
    crownMesh.scale.set(...leaf.scale);
    crownMesh.castShadow = true;
    group.add(crownMesh);
  });

  scene.add(group);
  addGroupEdges(group, 0x111622, 0.22);
}

function addLightweightBush(scene, { x, z, scale, flowers }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const bushMaterial = makeMaterial(0x667f5d, 0.32);
  const accentMaterial = makeMaterial(0x84936d, 0.34);
  [
    { pos: [-0.42, 0.55, 0], s: [0.9, 0.55, 0.8], material: bushMaterial },
    { pos: [0.38, 0.62, 0.12], s: [0.78, 0.62, 0.72], material: accentMaterial },
    { pos: [0.02, 0.88, -0.18], s: [0.65, 0.48, 0.58], material: bushMaterial }
  ].forEach((part) => {
    const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(scale, 0), part.material);
    mesh.position.set(...part.pos);
    mesh.scale.set(...part.s);
    mesh.castShadow = true;
    group.add(mesh);
  });

  if (flowers) {
    [-0.42, 0.12, 0.48].forEach((offset, index) => {
      const flower = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), makeMaterial(index % 2 === 0 ? 0xb88c7a : 0xd7c28a, 0.4));
      flower.position.set(offset, 1.05 + index * 0.03, 0.28 - index * 0.2);
      flower.castShadow = true;
      group.add(flower);
    });
  }

  scene.add(group);
  addGroupEdges(group, 0x111622, 0.2);
}

function addLightweightRock(scene, { x, z, scale }) {
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(scale, 0), makeMaterial(0x8f8777, 0.42));
  rock.position.set(x, scale * 0.34, z);
  rock.scale.set(1.35, 0.46, 0.9);
  rock.rotation.set(0.1, x * 0.05, -0.05);
  rock.castShadow = true;
  rock.receiveShadow = true;
  scene.add(rock);
  addEdges(rock, 0x5d5a52, 0.2);
}

function addExteriorApproachDressing(scene, textures) {
  const trimMaterial = makeMaterial(0x5e6b63, 0.26, 0, textures.wood);
  const stoneMaterial = makeMaterial(0xa9a091, 0.36, 0, textures.path);
  const porchMaterial = makeMaterial(0x8f8777, 0.32, 0, textures.path);

  [-4.35, 4.35].forEach((x) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 11.5), trimMaterial);
    rail.position.set(x, 0.72, -7.4);
    rail.castShadow = true;
    scene.add(rail);
    addEdges(rail, 0x111622, 0.22);

    [-12.4, -8.4, -4.4].forEach((z) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.2, 0.22), trimMaterial);
      post.position.set(x, 0.6, z);
      post.castShadow = true;
      scene.add(post);
      addEdges(post, 0x111622, 0.22);
    });
  });

  [
    { x: -2.05, z: -16.2, w: 1.25 },
    { x: 0, z: -15.25, w: 1.7 },
    { x: 2.05, z: -16.05, w: 1.25 }
  ].forEach((step) => {
    const stone = new THREE.Mesh(new THREE.BoxGeometry(step.w, 0.12, 0.72), stoneMaterial);
    stone.position.set(step.x, 0.11, step.z);
    stone.receiveShadow = true;
    scene.add(stone);
    addEdges(stone, 0x6c665c, 0.18);
  });

  const porchPad = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.14, 2.4), porchMaterial);
  porchPad.position.set(0, 0.1, -14.25);
  porchPad.receiveShadow = true;
  scene.add(porchPad);
  addEdges(porchPad, 0x6c665c, 0.16);

  [
    { x: -4.7, z: -14.35 },
    { x: 4.7, z: -14.35 }
  ].forEach((light) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.7, 0.22), trimMaterial);
    post.position.set(light.x, 0.85, light.z);
    post.castShadow = true;
    scene.add(post);
    addEdges(post, 0x111622, 0.2);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.36, 0.58), makeEmissiveMaterial(0xf0dfbf, 0.32));
    cap.position.set(light.x, 1.86, light.z);
    scene.add(cap);
    addEdges(cap, 0x6c665c, 0.16);
  });
}

function addExteriorIdentityDetails(scene, textures) {
  const signPostMaterial = makeMaterial(0x4b554e, 0.28, 0, textures.wood);
  const sign = createCanvasSign({
    width: 512,
    height: 256,
    background: '#f4f0e5',
    accent: '#4f6f78',
    title: 'ESTUDIEMOS',
    subtitle: 'Casa 1 - sala de enfoque'
  });
  sign.position.set(-6.6, 2.2, 4.8);
  sign.rotation.y = 0.18;
  sign.scale.set(3.2, 1.6, 1);
  scene.add(sign);

  [
    { x: -7.85, z: 4.92 },
    { x: -5.35, z: 4.68 }
  ].forEach((postSpec) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.4, 0.18), signPostMaterial);
    post.position.set(postSpec.x, 1.18, postSpec.z);
    post.castShadow = true;
    scene.add(post);
    addEdges(post, 0x111622, 0.2);
  });

  const smallMarker = createCanvasSign({
    width: 384,
    height: 192,
    background: '#172426',
    accent: '#d7d0c0',
    title: 'ENTRADA',
    subtitle: 'Computadora y pantalla'
  });
  smallMarker.position.set(5.7, 1.45, -12.8);
  smallMarker.rotation.y = -0.28;
  smallMarker.scale.set(2.1, 1.05, 1);
  scene.add(smallMarker);

  const markerPost = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.7, 0.16), signPostMaterial);
  markerPost.position.set(5.7, 0.84, -12.8);
  markerPost.castShadow = true;
  scene.add(markerPost);
  addEdges(markerPost, 0x111622, 0.2);
}

function addImportedAsset(parent, config) {
  const {
    folder,
    file,
    basePath = 'models/vendor/poly-pizza',
    name,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    targetSize = 1,
    scale = 1,
    outlineColor = 0x111622,
    outlineOpacity = 0.28,
    onError
  } = config;
  const url = `${import.meta.env.BASE_URL}${basePath}/${folder ? `${folder}/` : ''}${encodeURIComponent(file)}`;

  modelLoader.load(
    url,
    (gltf) => {
      const root = gltf.scene;
      root.name = name ?? file.replace('.glb', '');
      prepareImportedModel(root, outlineColor, outlineOpacity);
      fitImportedModel(root, targetSize);
      root.scale.multiplyScalar(scale);
      root.rotation.set(rotation[0], rotation[1], rotation[2]);
      root.position.set(position[0], position[1], position[2]);
      parent.add(root);
    },
    undefined,
    onError
  );
}

function prepareImportedModelWithStyle(root, outlineColor = 0x111622, outlineOpacity = 0.32) {
  root.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        softenMaterialColor(material);
        if ('roughness' in material) material.roughness = Math.max(material.roughness ?? 0.64, 0.58);
        if ('metalness' in material) material.metalness = Math.min(material.metalness ?? 0, 0.08);
        if ('envMapIntensity' in material) material.envMapIntensity = 0.24;
        material.side = THREE.FrontSide;
        material.needsUpdate = true;
      });
    }
    addEdges(child, outlineColor, outlineOpacity);
  });
}

function prepareImportedModel(root, outlineColor = 0x111622, outlineOpacity = 0.32) {
  prepareImportedModelWithStyle(root, outlineColor, outlineOpacity);
}

function softenMaterialColor(material) {
  if (!material?.color) return;
  const hsl = {};
  material.color.getHSL(hsl);
  material.color.setHSL(hsl.h, hsl.s * 0.38, Math.min(0.68, hsl.l * 0.86 + 0.04));
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
  houseGroup.scale.setScalar(isCasa1 ? 1.35 : 1.2);

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
    makeMaterial(0x6a4a32, 0.68, 0.02, createTexture('hardwoodFloor'))
  );
  floor.position.set(0, -0.2, 0);
  floor.receiveShadow = true;
  room.add(floor);

  const wallMaterial = makeMaterial(0x4b4135, 0.82, 0.01, createTexture('paintedWall'));
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

  addStudyRoomArchitecture(room, textures);
  addFunctionalComputerStation(room);
  addStudyRoomSetDressing(room, textures);

  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(56, 0.4, 58), makeMaterial(0x26231f, 0.88, 0, createTexture('quietCeiling')));
  ceiling.position.set(0, 16, 0);
  ceiling.receiveShadow = true;
  room.add(ceiling);

  const screenFrame = new THREE.Mesh(new THREE.BoxGeometry(37.4, 15.2, 0.26), makeMaterial(0x0f1214, 0.42, 0.16, textures.brushedMetal));
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
      emissiveIntensity: 0.42,
      roughness: 0.28,
      metalness: 0.04
    })
  );
  screenSurface.position.set(0, 8.5, -28.25);
  room.add(screenSurface);

  const keyLight = new THREE.SpotLight(0xffc27a, 4.8, 36, Math.PI / 5.8, 0.55, 1.35);
  keyLight.position.set(-8.2, 7.2, -4.8);
  keyLight.target.position.set(-11.2, 0.85, -8.3);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(512, 512);
  keyLight.shadow.bias = -0.00025;
  room.add(keyLight);
  room.add(keyLight.target);

  const screenBounce = new THREE.PointLight(0xb9d7df, 1.05, 32, 2.05);
  screenBounce.position.set(0, 7.5, -19);
  room.add(screenBounce);

  const warmRoomFill = new THREE.PointLight(0xffdfaf, 1.25, 38, 2.2);
  warmRoomFill.position.set(11, 8.5, -5);
  room.add(warmRoomFill);

  const ceilingPractical = new THREE.PointLight(0xffebcf, 0.85, 24, 2);
  ceilingPractical.position.set(0, 13.7, -4);
  room.add(ceilingPractical);

  scene.add(room);
  return { canvas: screenCanvas, context: screenCanvas.getContext('2d'), texture: screenTexture, currentScreenStateKey: '' };
}

function addStudyRoomArchitecture(room, textures) {
  const trimMaterial = makeMaterial(0x211b17, 0.66, 0.02, textures.wood);
  const panelMaterial = makeMaterial(0x62513f, 0.74, 0.01, createTexture('paintedWall'));
  const acousticMaterial = makeMaterial(0x2e3331, 0.86, 0, textures.blackStripe);
  const brassMaterial = makeMaterial(0xb18a45, 0.42, 0.18, textures.brushedMetal);

  [
    { position: [0, 0.72, -28.68], size: [55, 0.62, 0.34] },
    { position: [0, 15.12, -28.7], size: [55, 0.42, 0.28] },
    { position: [-27.7, 0.72, 0], size: [0.34, 0.62, 56] },
    { position: [27.7, 0.72, 0], size: [0.34, 0.62, 56] },
    { position: [0, 0.72, 28.68], size: [55, 0.62, 0.34] }
  ].forEach((part) => {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(...part.size), trimMaterial);
    trim.position.set(...part.position);
    trim.castShadow = true;
    trim.receiveShadow = true;
    room.add(trim);
  });

  [-19.5, 19.5].forEach((x) => {
    const screenColumn = new THREE.Mesh(new THREE.BoxGeometry(2.2, 13.8, 0.55), panelMaterial);
    screenColumn.position.set(x, 7.7, -28.45);
    screenColumn.castShadow = true;
    screenColumn.receiveShadow = true;
    room.add(screenColumn);

    const brassLine = new THREE.Mesh(new THREE.BoxGeometry(0.12, 13.4, 0.62), brassMaterial);
    brassLine.position.set(x + (x < 0 ? 1.22 : -1.22), 7.8, -28.1);
    brassLine.castShadow = true;
    room.add(brassLine);
  });

  [
    [-23.5, 5.4, -16, Math.PI / 2],
    [-23.5, 5.4, -9.2, Math.PI / 2],
    [23.5, 5.4, -16, -Math.PI / 2],
    [23.5, 5.4, -9.2, -Math.PI / 2],
    [-11.5, 5.4, 28.42, Math.PI],
    [11.5, 5.4, 28.42, Math.PI]
  ].forEach(([x, y, z, rotY], index) => {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.28, 5.6, 4.4), acousticMaterial);
    panel.position.set(x, y, z);
    panel.rotation.y = rotY;
    panel.castShadow = true;
    panel.receiveShadow = true;
    room.add(panel);
    if (index < 4) addEdges(panel, 0x9a7a4d, 0.14);
  });

  for (let x = -22; x <= 22; x += 8.8) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.62, 57), trimMaterial);
    beam.position.set(x, 15.55, 0);
    beam.castShadow = true;
    room.add(beam);
  }

  [-16, 0, 16].forEach((z) => {
    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(55, 0.42, 0.38), trimMaterial);
    crossBeam.position.set(0, 15.48, z);
    crossBeam.castShadow = true;
    room.add(crossBeam);
  });

  const screenStage = new THREE.Mesh(new THREE.BoxGeometry(41, 0.24, 4.2), makeMaterial(0x2d2721, 0.62, 0.02, textures.wood));
  screenStage.position.set(0, 0.14, -25.9);
  screenStage.receiveShadow = true;
  room.add(screenStage);

  const wallWash = new THREE.Mesh(new THREE.BoxGeometry(42, 0.12, 0.12), makeEmissiveMaterial(0xd7c28a, 0.38));
  wallWash.position.set(0, 1.1, -28.05);
  room.add(wallWash);

  const whiteboard = createCanvasSign({
    width: 640,
    height: 360,
    background: '#ece7dc',
    accent: '#b18a45',
    title: 'PLAN DE ESTUDIO',
    subtitle: 'Foco - recursos - repaso'
  });
  whiteboard.position.set(-27.62, 6.2, -4);
  whiteboard.rotation.y = Math.PI / 2;
  whiteboard.scale.set(5.8, 3.3, 1);
  room.add(whiteboard);

  const cork = createCanvasStudyBoard({
    title: 'Agenda',
    lines: ['Clase pendiente', 'Ejercicios', 'Resumen semanal'],
    background: '#70583c',
    accent: '#e0c47a'
  });
  cork.position.set(-27.6, 5.6, -12.8);
  cork.rotation.y = Math.PI / 2;
  cork.scale.set(3.2, 2.25, 1);
  room.add(cork);
}

function addFunctionalComputerStation(room) {
  const furnitureFolder = 'furniture-pack';
  const kenneyPath = 'models/vendor/kenney/furniture-kit';
  [
    { folder: furnitureFolder, file: 'Desk.glb', name: 'functional-computer-desk', position: [-11.4, 0, -8.6], rotation: [0, Math.PI, 0], targetSize: 3.18, outlineOpacity: 0.26 },
    { basePath: 'models/custom', file: 'study-computer.glb', name: 'functional-study-computer', position: [-11.4, 0, -8.8], rotation: [0, Math.PI, 0], targetSize: 2.82, outlineOpacity: 0.26 },
    { basePath: kenneyPath, file: 'computerKeyboard.glb', name: 'functional-computer-keyboard', position: [-11.3, 0.82, -7.72], rotation: [0, Math.PI, 0], targetSize: 0.54, outlineOpacity: 0.18 },
    { basePath: kenneyPath, file: 'computerMouse.glb', name: 'functional-computer-mouse', position: [-10.48, 0.82, -7.68], rotation: [0, Math.PI + 0.1, 0], targetSize: 0.28, outlineOpacity: 0.16 }
  ].forEach((asset) => addImportedAsset(room, asset));
}

function addStudyRoomSetDressing(room, textures) {
  const kenneyPath = 'models/vendor/kenney/furniture-kit';
  const interiorFolder = 'house-interior-pack';

  [
    { folder: interiorFolder, file: 'Round Rug.glb', name: 'warm-study-rug', position: [0.5, 0.03, -8.5], rotation: [0, 0.05, 0], targetSize: 8.8, outlineOpacity: 0.08 },
    { folder: 'furniture-pack', file: 'Office Chair.glb', name: 'study-office-chair', position: [-11.4, 0, -5.55], rotation: [0, Math.PI, 0], targetSize: 1.75, outlineOpacity: 0.1 },
    { folder: interiorFolder, file: 'Light Desk.glb', name: 'desk-task-lamp', position: [-8.7, 0.78, -7.98], rotation: [0, -0.65, 0], targetSize: 0.88, outlineOpacity: 0.08 },
    { folder: interiorFolder, file: 'Shelf Large.glb', name: 'right-study-shelf', position: [24.2, 0, -15.8], rotation: [0, -Math.PI / 2, 0], targetSize: 5.4, outlineOpacity: 0.08 },
    { folder: interiorFolder, file: 'Light Floor.glb', name: 'reading-floor-lamp', position: [18.6, 0, -12.6], rotation: [0, -0.35, 0], targetSize: 1.4, outlineOpacity: 0.08 },
    { folder: interiorFolder, file: 'Couch Large.glb', name: 'quiet-study-sofa', position: [16.2, 0, -3.8], rotation: [0, -Math.PI / 2, 0], targetSize: 4.7, outlineOpacity: 0.08 },
    { folder: interiorFolder, file: 'Houseplant.glb', name: 'study-room-plant', position: [23.2, 0, 11.6], rotation: [0, -0.2, 0], targetSize: 1.7, outlineOpacity: 0.08 },
    { basePath: kenneyPath, file: 'books.glb', name: 'desk-book-stack-left', position: [-13.35, 0.92, -8.22], rotation: [0, 0.35, 0], targetSize: 0.72, outlineOpacity: 0.08 },
    { basePath: kenneyPath, file: 'books.glb', name: 'shelf-book-stack', position: [23.6, 2.3, -17.2], rotation: [0, -Math.PI / 2, 0], targetSize: 0.9, outlineOpacity: 0.08 },
    { basePath: kenneyPath, file: 'speakerSmall.glb', name: 'small-desk-speaker-left', position: [-13.35, 0.84, -7.36], rotation: [0, Math.PI, 0], targetSize: 0.34, outlineOpacity: 0.08 },
    { basePath: kenneyPath, file: 'speakerSmall.glb', name: 'small-desk-speaker-right', position: [-9.52, 0.84, -7.22], rotation: [0, Math.PI, 0], targetSize: 0.34, outlineOpacity: 0.08 },
    { basePath: kenneyPath, file: 'rugRectangle.glb', name: 'desk-chair-mat', position: [-11.4, 0.05, -6.25], rotation: [0, 0, 0], targetSize: 3.3, outlineOpacity: 0.05 }
  ].forEach((asset) => addImportedAsset(room, asset));

  addDeskPaperworkCluster(room, textures);
  addDeskCableRuns(room);
  addStudyShelfDetails(room, textures);
  addFramedDeskPhoto(room, textures);
}

function addDeskPaperworkCluster(room, textures) {
  const paperMaterial = makeMaterial(0xe8dfcf, 0.88, 0, textures.paper);
  const folderMaterial = makeMaterial(0xb98a56, 0.72, 0, textures.paper);
  const darkFolderMaterial = makeMaterial(0x3f4b48, 0.74, 0, textures.paper);
  const notebookMaterial = makeMaterial(0x21312f, 0.68, 0.02, textures.paper);

  [
    { position: [-9.75, 0.91, -8.12], size: [1.12, 0.035, 0.78], rotation: -0.18, material: paperMaterial },
    { position: [-9.08, 0.94, -8.25], size: [1.2, 0.035, 0.82], rotation: 0.11, material: paperMaterial },
    { position: [-12.7, 0.94, -7.62], size: [1.34, 0.07, 0.92], rotation: -0.28, material: folderMaterial },
    { position: [-12.18, 1.02, -7.48], size: [1.14, 0.08, 0.82], rotation: -0.2, material: darkFolderMaterial },
    { position: [-10.42, 0.9, -8.72], size: [0.92, 0.09, 0.68], rotation: 0.28, material: notebookMaterial }
  ].forEach((sheet) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...sheet.size), sheet.material);
    mesh.position.set(...sheet.position);
    mesh.rotation.y = sheet.rotation;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    room.add(mesh);
  });

  for (let i = 0; i < 4; i += 1) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.012, 0.035), makeMaterial(0x6f645b, 0.86));
    strip.position.set(-9.07, 0.965 + i * 0.004, -8.52 + i * 0.13);
    strip.rotation.y = 0.11;
    room.add(strip);
  }

  [
    { position: [-13.72, 1.04, -7.82], size: [0.72, 0.09, 0.54], color: 0xe0c47a },
    { position: [-13.62, 1.14, -7.72], size: [0.68, 0.08, 0.52], color: 0x96b2a5 },
    { position: [-13.52, 1.23, -7.6], size: [0.7, 0.08, 0.5], color: 0xcab8a0 }
  ].forEach((book) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...book.size), makeMaterial(book.color, 0.78, 0, textures.paper));
    mesh.position.set(...book.position);
    mesh.rotation.y = -0.12;
    mesh.castShadow = true;
    room.add(mesh);
  });
}

function addDeskCableRuns(room) {
  const cableMaterial = new THREE.MeshStandardMaterial({
    color: 0x0a0c0d,
    roughness: 0.78,
    metalness: 0.02
  });

  [
    [
      [-11.2, 0.91, -7.45],
      [-11.1, 0.88, -7.82],
      [-10.7, 0.86, -8.12],
      [-10.48, 0.84, -7.72]
    ],
    [
      [-11.5, 0.92, -7.58],
      [-11.75, 0.9, -7.92],
      [-12.35, 0.87, -8.25],
      [-13.0, 0.84, -8.12]
    ]
  ].forEach((points) => {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.018, 6, false), cableMaterial);
    cable.castShadow = true;
    room.add(cable);
  });
}

function addStudyShelfDetails(room, textures) {
  const boxMaterial = makeMaterial(0x705a42, 0.74, 0, textures.paper);
  const fileMaterial = makeMaterial(0xd0bd8d, 0.82, 0, textures.paper);

  [
    { pos: [23.55, 1.2, -14.9], size: [0.72, 0.62, 0.42], rot: -0.08, mat: boxMaterial },
    { pos: [23.55, 1.95, -15.8], size: [0.86, 0.72, 0.4], rot: 0.1, mat: fileMaterial },
    { pos: [23.55, 2.82, -14.5], size: [0.7, 0.58, 0.36], rot: -0.14, mat: makeMaterial(0x2f3835, 0.74, 0, textures.paper) }
  ].forEach((item) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...item.size), item.mat);
    mesh.position.set(...item.pos);
    mesh.rotation.y = item.rot;
    mesh.castShadow = true;
    room.add(mesh);
  });
}

function addFramedDeskPhoto(room, textures) {
  const frameMaterial = makeMaterial(0x211b17, 0.54, 0.04, textures.wood);
  const photoMaterial = makeMaterial(0xd9c8a7, 0.66, 0, textures.paper);
  const group = new THREE.Group();
  group.position.set(-8.88, 1.02, -8.74);
  group.rotation.set(-0.18, -0.48, 0);

  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.52, 0.055), frameMaterial);
  frame.castShadow = true;
  group.add(frame);

  const photo = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.38, 0.065), photoMaterial);
  photo.position.z = -0.016;
  group.add(photo);

  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.34, 0.04), frameMaterial);
  stand.position.set(0, -0.31, 0.14);
  stand.rotation.x = -0.62;
  group.add(stand);

  room.add(group);
}

function createCanvasSign({ width = 512, height = 256, background, accent, title, subtitle }) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, Math.max(12, width * 0.04), height);
  ctx.fillRect(0, 0, width, Math.max(8, height * 0.035));

  ctx.fillStyle = background === '#172426' ? '#ffffff' : '#172426';
  ctx.font = `900 ${Math.round(height * 0.22)}px system-ui, sans-serif`;
  ctx.fillText(title, width * 0.11, height * 0.47);
  ctx.font = `700 ${Math.round(height * 0.105)}px system-ui, sans-serif`;
  ctx.fillStyle = background === '#172426' ? 'rgba(255,255,255,0.78)' : 'rgba(23,36,38,0.7)';
  ctx.fillText(subtitle, width * 0.11, height * 0.66);

  ctx.strokeStyle = background === '#172426' ? 'rgba(255,255,255,0.16)' : 'rgba(23,36,38,0.18)';
  ctx.lineWidth = Math.max(4, width * 0.012);
  ctx.strokeRect(width * 0.04, height * 0.08, width * 0.9, height * 0.8);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.46,
    metalness: 0.02,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, height / width), material);
  mesh.castShadow = true;
  return mesh;
}

function createCanvasStudyBoard({ title, lines, background, accent }) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < 90; i += 1) {
    ctx.fillRect((i * 37) % canvas.width, (i * 59) % canvas.height, 2 + (i % 4), 1 + (i % 3));
  }

  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, canvas.width, 16);
  ctx.fillRect(0, 0, 16, canvas.height);
  ctx.fillStyle = '#fff2d2';
  ctx.font = '900 52px system-ui, sans-serif';
  ctx.fillText(title, 46, 78);

  lines.forEach((line, index) => {
    const y = 138 + index * 72;
    ctx.fillStyle = index % 2 === 0 ? '#efe4c8' : '#c6d9cf';
    ctx.fillRect(54, y - 28, 242 + index * 22, 46);
    ctx.fillStyle = '#1b2524';
    ctx.font = '800 24px system-ui, sans-serif';
    ctx.fillText(line, 76, y + 3);
  });

  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 8;
  ctx.strokeRect(22, 22, canvas.width - 44, canvas.height - 44);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.78,
    metalness: 0.02,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, canvas.height / canvas.width), material);
  mesh.castShadow = true;
  return mesh;
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

function updateGiantScreen(giantScreen, screenZones, screenLayout) {
  const layout = getScreenLayoutDefinition(screenLayout, screenZones);
  const stateKey = JSON.stringify({
    layout: layout.id,
    upper: {
      videoId: screenZones.upper.videoId,
      contentType: screenZones.upper.contentType,
      resourceUrl: screenZones.upper.resourceUrl,
      title: screenZones.upper.title,
      muted: screenZones.upper.muted,
      volume: screenZones.upper.volume,
      updatedAt: screenZones.upper.updatedAt
    },
    lower: {
      videoId: screenZones.lower.videoId,
      contentType: screenZones.lower.contentType,
      resourceUrl: screenZones.lower.resourceUrl,
      title: screenZones.lower.title,
      muted: screenZones.lower.muted,
      volume: screenZones.lower.volume,
      updatedAt: screenZones.lower.updatedAt
    }
  });

  if (giantScreen.currentScreenStateKey === stateKey) return;
  giantScreen.currentScreenStateKey = stateKey;

  const ctx = giantScreen.context;
  const width = giantScreen.canvas.width;
  const height = giantScreen.canvas.height;

  ctx.fillStyle = '#111817';
  ctx.fillRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, 'rgba(185,215,223,0.18)');
  gradient.addColorStop(0.52, 'rgba(255,255,255,0.03)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.52)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  let cursorY = 0;
  layout.slots.forEach((slotConfig, index) => {
    const ratio = layout.rows[index] === '1fr' ? 1 : Number.parseFloat(layout.rows[index]) / 100;
    const slotHeight = index === layout.slots.length - 1 ? height - cursorY : Math.round(height * ratio);

    drawGiantScreenZone(ctx, {
      zone: screenZones[slotConfig.zoneId],
      x: 0,
      y: cursorY,
      width,
      height: slotHeight,
      label: slotConfig.label,
      slotLabel: slotConfig.slotLabel,
      accent: slotConfig.accent,
      isPrimary: slotConfig.isPrimary || layout.slots.length === 1
    });

    cursorY += slotHeight;
    if (index < layout.slots.length - 1) {
      ctx.fillStyle = '#d7c28a';
      ctx.fillRect(0, cursorY - 5, width, 10);
      ctx.fillStyle = 'rgba(17,22,34,0.72)';
      ctx.fillRect(0, cursorY - 2, width, 4);
    }
  });

  giantScreen.texture.needsUpdate = true;
}

function drawGiantScreenZone(ctx, { zone, x, y, width, height, label, slotLabel, accent, isPrimary }) {
  const hasContent = Boolean(zone.videoId || zone.resourceUrl);
  const contentLabel = zone.contentType === 'pdf' ? 'PDF' : 'YOUTUBE';
  const innerX = x + 34;
  const innerY = y + (isPrimary ? 36 : 24);
  const titleSize = isPrimary ? 64 : 34;
  const bodySize = isPrimary ? 28 : 21;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();

  ctx.fillStyle = hasContent ? 'rgba(10,18,20,0.28)' : 'rgba(255,255,255,0.035)';
  ctx.fillRect(x, y, width, height);

  ctx.save();
  ctx.translate(width * 0.62, y - 28);
  ctx.rotate(-0.18);
  ctx.fillStyle = hasContent ? 'rgba(185, 215, 223, 0.16)' : 'rgba(215, 194, 138, 0.12)';
  for (let i = 0; i < 10; i += 1) {
    ctx.fillRect(i * 76, 0, 18, height + 120);
  }
  ctx.restore();

  ctx.fillStyle = 'rgba(17,22,34,0.66)';
  ctx.fillRect(innerX, innerY, isPrimary ? 520 : 420, isPrimary ? 74 : 48);
  ctx.fillStyle = accent;
  ctx.fillRect(innerX, innerY, 10, isPrimary ? 74 : 48);

  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${isPrimary ? 38 : 22}px system-ui, sans-serif`;
  ctx.fillText(label, innerX + 24, innerY + (isPrimary ? 48 : 32));

  ctx.fillStyle = hasContent ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.12)';
  ctx.font = `900 ${titleSize}px system-ui, sans-serif`;
  ctx.fillText(hasContent ? contentLabel : 'SIN VIDEO', innerX + 3, innerY + (isPrimary ? 165 : 105));

  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${titleSize}px system-ui, sans-serif`;
  ctx.fillText(hasContent ? contentLabel : 'SIN VIDEO', innerX, innerY + (isPrimary ? 158 : 100));

  ctx.font = `750 ${bodySize}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.86)';
  if (hasContent) {
    ctx.fillText(zone.title ? `Recurso: ${zone.title}` : `Video ID: ${zone.videoId}`, innerX, innerY + (isPrimary ? 205 : 136));
    ctx.fillText(
      zone.contentType === 'pdf' ? 'Documento de Estudiemos' : `${zone.muted ? 'Mute activo' : 'Audio activo'} - Volumen ${zone.volume}%`,
      innerX,
      innerY + (isPrimary ? 242 : 164)
    );
  } else {
    ctx.fillText(`Canal ${slotLabel} listo para recibir YouTube`, innerX, innerY + (isPrimary ? 205 : 136));
  }

  ctx.fillStyle = accent;
  ctx.fillRect(width - 196, y + height - 48, hasContent ? 128 : 76, 10);
  ctx.fillStyle = 'rgba(255,255,255,0.36)';
  ctx.fillRect(width - 196, y + height - 28, hasContent ? 88 : 122, 10);

  ctx.restore();
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
  const key = `${color}-${roughness}-${metalness}-${texture?.uuid ?? 'flat'}`;
  if (materialCache.has(key)) return materialCache.get(key);

  const material = new THREE.MeshStandardMaterial({
    color,
    map: texture,
    roughness,
    metalness,
    dithering: true
  });
  material.envMapIntensity = 0.28;
  materialCache.set(key, material);
  return material;
}

function makeEmissiveMaterial(color, intensity = 0.6) {
  const key = `${color}-${intensity}`;
  if (emissiveMaterialCache.has(key)) return emissiveMaterialCache.get(key);

  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.18,
    metalness: 0
  });
  emissiveMaterialCache.set(key, material);
  return material;
}

function addGroupEdges(group, color, opacity) {
  group.traverse((child) => {
    if (child.isMesh) addEdges(child, color, opacity);
  });
}

function addEdges(mesh, color, opacity) {
  const effectiveOpacity = Math.min(opacity * EDGE_OPACITY_SCALE, 0.16);
  if (effectiveOpacity <= 0.01) return null;

  const geometry = new THREE.EdgesGeometry(mesh.geometry, 25);
  const key = `${color}-${effectiveOpacity}`;
  let material = edgeMaterialCache.get(key);
  if (!material) {
    material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: effectiveOpacity,
      depthWrite: false
    });
    edgeMaterialCache.set(key, material);
  }
  const edges = new THREE.LineSegments(geometry, material);
  edges.position.copy(mesh.position);
  edges.rotation.copy(mesh.rotation);
  edges.scale.copy(mesh.scale);
  edges.renderOrder = 2;
  mesh.parent?.add(edges);
  return edges;
}

function createSkyBackgroundTexture() {
  if (textureCache.has('skyBackground')) return textureCache.get('skyBackground');

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#5f7980');
  gradient.addColorStop(0.35, '#a6b6aa');
  gradient.addColorStop(0.62, '#d3c5a8');
  gradient.addColorStop(0.84, '#898f74');
  gradient.addColorStop(1, '#566349');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const sunGradient = ctx.createRadialGradient(742, 104, 16, 742, 104, 172);
  sunGradient.addColorStop(0, 'rgba(255, 220, 166, 0.88)');
  sunGradient.addColorStop(0.32, 'rgba(255, 194, 122, 0.3)');
  sunGradient.addColorStop(1, 'rgba(255, 243, 211, 0)');
  ctx.fillStyle = sunGradient;
  ctx.fillRect(560, 0, 360, 285);

  const drawCloudCluster = (x, y, scale, opacity) => {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    [
      [-58, 6, 64, 19],
      [-16, -8, 78, 26],
      [34, 2, 82, 22],
      [86, 10, 58, 18],
      [8, 15, 118, 18]
    ].forEach(([ox, oy, rx, ry]) => {
      ctx.beginPath();
      ctx.ellipse(x + ox * scale, y + oy * scale, rx * scale, ry * scale, -0.03, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = 'rgba(126, 151, 159, 0.18)';
    ctx.beginPath();
    ctx.ellipse(x + 12 * scale, y + 22 * scale, 116 * scale, 13 * scale, -0.02, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  [
    [130, 92, 0.9, 0.72],
    [345, 148, 0.62, 0.5],
    [578, 82, 0.82, 0.54],
    [860, 158, 0.76, 0.5],
    [1010, 108, 0.88, 0.56]
  ].forEach((cloud) => drawCloudCluster(...cloud));

  ctx.fillStyle = 'rgba(80, 101, 88, 0.2)';
  ctx.fillRect(0, canvas.height * 0.76, canvas.width, canvas.height * 0.24);
  const treeLine = ctx.createLinearGradient(0, canvas.height * 0.68, 0, canvas.height);
  treeLine.addColorStop(0, 'rgba(77, 99, 81, 0.05)');
  treeLine.addColorStop(0.36, 'rgba(77, 99, 81, 0.24)');
  treeLine.addColorStop(1, 'rgba(56, 75, 59, 0.38)');
  ctx.fillStyle = treeLine;
  for (let x = -12; x < canvas.width + 20; x += 18) {
    const h = 18 + (Math.abs(x * 13) % 32);
    ctx.beginPath();
    ctx.moveTo(x, canvas.height * 0.76);
    ctx.lineTo(x + 10, canvas.height * 0.76 - h);
    ctx.lineTo(x + 22, canvas.height * 0.76);
    ctx.closePath();
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set('skyBackground', texture);
  return texture;
}

function createTexture(type) {
  if (textureCache.has(type)) return textureCache.get(type);

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
  if (type === 'hardwoodFloor') drawHardwoodFloorTexture(ctx);
  if (type === 'paintedWall') drawPaintedWallTexture(ctx);
  if (type === 'quietCeiling') drawQuietCeilingTexture(ctx);
  if (type === 'comicWall') drawComicWallTexture(ctx);
  if (type === 'screenFrame') drawScreenFrameTexture(ctx);
  if (type === 'blackStripe') drawBlackStripeTexture(ctx);
  if (type === 'paper') drawPaperTexture(ctx);
  if (type === 'brushedMetal') drawBrushedMetalTexture(ctx);
  if (type === 'cork') drawCorkTexture(ctx);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  const repeat = {
    wood: [1.8, 1.8],
    screenFrame: [2, 2],
    blackStripe: [3, 1.5],
    roof: [2.8, 2.8],
    comicWall: [3, 3],
    hardwoodFloor: [7, 7],
    paintedWall: [3.5, 2.5],
    quietCeiling: [4, 4],
    paper: [1.5, 1.5],
    brushedMetal: [2.4, 1.2],
    cork: [2.6, 2.6]
  }[type] ?? [4, 4];
  texture.repeat.set(repeat[0], repeat[1]);
  texture.anisotropy = 4;
  textureCache.set(type, texture);
  return texture;
}

function drawGrassTexture(ctx) {
  const base = ctx.createLinearGradient(0, 0, 128, 128);
  base.addColorStop(0, '#6f875e');
  base.addColorStop(0.48, '#637f55');
  base.addColorStop(1, '#526f4d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 128);

  for (let x = -48; x < 176; x += 16) {
    ctx.fillStyle = x % 32 === 0 ? 'rgba(73, 105, 65, 0.24)' : 'rgba(147, 164, 112, 0.18)';
    ctx.beginPath();
    ctx.moveTo(x, 128);
    ctx.lineTo(x + 38, 0);
    ctx.lineTo(x + 47, 0);
    ctx.lineTo(x + 11, 128);
    ctx.closePath();
    ctx.fill();
  }

  for (let i = 0; i < 720; i++) {
    const shade = i % 5 === 0 ? '#425f43' : i % 5 === 1 ? '#75905f' : i % 5 === 2 ? '#9eab7d' : i % 5 === 3 ? '#5e7d53' : '#809466';
    ctx.fillStyle = shade;
    const x = (i * 47) % 128;
    const y = (i * 29) % 128;
    ctx.fillRect(x, y, 1 + (i % 3), 1);
    if (i % 8 === 0) {
      ctx.strokeStyle = 'rgba(229, 220, 174, 0.12)';
      ctx.beginPath();
      ctx.moveTo(x, y + 3);
      ctx.lineTo(x + 2 + (i % 4), y - 3);
      ctx.stroke();
    }
  }

  ctx.strokeStyle = 'rgba(29, 53, 38, 0.14)';
  ctx.lineWidth = 1;
  for (let y = 10; y < 128; y += 18) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(34, y + 4, 78, y - 5, 128, y + 2);
    ctx.stroke();
  }
}

function drawPathTexture(ctx) {
  ctx.fillStyle = '#b6afa2';
  ctx.fillRect(0, 0, 128, 128);

  const slabGradient = ctx.createLinearGradient(0, 0, 128, 128);
  slabGradient.addColorStop(0, 'rgba(255,255,255,0.16)');
  slabGradient.addColorStop(0.55, 'rgba(255,255,255,0)');
  slabGradient.addColorStop(1, 'rgba(71,67,61,0.1)');
  ctx.fillStyle = slabGradient;
  ctx.fillRect(0, 0, 128, 128);

  ctx.strokeStyle = 'rgba(70, 66, 60, 0.2)';
  ctx.lineWidth = 2;
  for (let y = 0; y <= 128; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(128, y + 0.5);
    ctx.stroke();
  }
  for (let x = 0; x <= 128; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, 128);
    ctx.stroke();
  }

  for (let i = 0; i < 150; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.07)' : 'rgba(68,64,58,0.06)';
    ctx.fillRect((i * 37) % 128, (i * 23) % 128, 1 + (i % 3), 1);
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  for (let x = -60; x < 180; x += 42) {
    ctx.beginPath();
    ctx.moveTo(x, 128);
    ctx.lineTo(x + 42, 0);
    ctx.stroke();
  }
}

function drawPlasterTexture(ctx) {
  ctx.fillStyle = '#d3b89d';
  ctx.fillRect(0, 0, 128, 128);

  for (let i = 0; i < 260; i += 1) {
    const alpha = 0.035 + (i % 5) * 0.008;
    ctx.fillStyle = i % 2 === 0 ? `rgba(255, 255, 255, ${alpha})` : `rgba(91, 71, 56, ${alpha})`;
    ctx.fillRect((i * 31) % 128, (i * 19) % 128, 2 + (i % 4), 1);
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.fillRect(0, 0, 128, 10);
  ctx.fillStyle = 'rgba(88, 67, 54, 0.08)';
  ctx.fillRect(0, 66, 128, 5);
  ctx.strokeStyle = 'rgba(78, 58, 47, 0.14)';
  ctx.lineWidth = 1;
  for (let y = 16; y < 128; y += 28) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(128, y + 0.5);
    ctx.stroke();
  }
  for (let x = 0; x < 128; x += 42) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, 128);
    ctx.stroke();
  }
}

function drawWoodTexture(ctx) {
  ctx.fillStyle = '#5a493d';
  ctx.fillRect(0, 0, 128, 128);
  for (let y = 12; y < 128; y += 20) {
    ctx.strokeStyle = 'rgba(47, 35, 28, 0.34)';
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(36, y + 5, 84, y - 5, 128, y + 2);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(214, 191, 157, 0.16)';
  for (let y = 6; y < 128; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(128, y + 3);
    ctx.stroke();
  }
}

function drawRoofTexture(ctx) {
  ctx.fillStyle = '#8f6150';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(61, 44, 39, 0.34)';
  for (let y = 0; y < 128; y += 18) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(128, y + 0.5);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(216, 200, 177, 0.12)';
  for (let x = 0; x < 128; x += 24) {
    ctx.fillRect(x, 0, 4, 128);
  }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
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
  ctx.fillStyle = '#f1efe6';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(94, 88, 78, 0.1)';
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

function drawHardwoodFloorTexture(ctx) {
  ctx.fillStyle = '#a7835e';
  ctx.fillRect(0, 0, 128, 128);

  const plankWidth = 16;
  for (let x = 0; x < 128; x += plankWidth) {
    ctx.fillStyle = x % 32 === 0 ? '#b18d65' : '#967650';
    ctx.fillRect(x, 0, plankWidth - 1, 128);
    ctx.strokeStyle = 'rgba(58, 42, 30, 0.32)';
    ctx.strokeRect(x + 0.5, 0.5, plankWidth - 1, 127);

    for (let y = (x % 32 === 0 ? 0 : 32); y < 128; y += 64) {
      ctx.strokeStyle = 'rgba(58, 42, 30, 0.22)';
      ctx.beginPath();
      ctx.moveTo(x, y + 0.5);
      ctx.lineTo(x + plankWidth - 1, y + 0.5);
      ctx.stroke();
    }
  }

  for (let i = 0; i < 95; i += 1) {
    const x = (i * 23) % 128;
    const y = (i * 41) % 128;
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(223, 190, 141, 0.18)' : 'rgba(54, 39, 26, 0.16)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + 4, y + 2, x + 10, y - 2, x + 15, y + 1);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fillRect(0, 0, 128, 5);
}

function drawPaintedWallTexture(ctx) {
  ctx.fillStyle = '#d4cabc';
  ctx.fillRect(0, 0, 128, 128);

  const gradient = ctx.createLinearGradient(0, 0, 128, 128);
  gradient.addColorStop(0, 'rgba(255,255,255,0.22)');
  gradient.addColorStop(0.55, 'rgba(255,255,255,0)');
  gradient.addColorStop(1, 'rgba(74,66,56,0.08)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.fillRect(0, 0, 128, 18);
  ctx.fillStyle = 'rgba(81, 73, 64, 0.1)';
  ctx.fillRect(0, 112, 128, 8);
  ctx.strokeStyle = 'rgba(83, 77, 68, 0.12)';
  ctx.lineWidth = 1;
  for (let y = 24; y < 128; y += 26) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(128, y + 0.5);
    ctx.stroke();
  }
  for (let x = 32; x < 128; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 20);
    ctx.lineTo(x + 0.5, 112);
    ctx.stroke();
  }
  for (let i = 0; i < 120; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(80,70,60,0.035)';
    ctx.fillRect((i * 41) % 128, (i * 23) % 128, 1, 1);
  }
}

function drawQuietCeilingTexture(ctx) {
  ctx.fillStyle = '#e3ded2';
  ctx.fillRect(0, 0, 128, 128);

  const gradient = ctx.createLinearGradient(0, 0, 128, 128);
  gradient.addColorStop(0, 'rgba(255,255,255,0.26)');
  gradient.addColorStop(1, 'rgba(86,78,68,0.08)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  ctx.strokeStyle = 'rgba(104, 96, 84, 0.11)';
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
  for (let i = 0; i < 220; i += 1) {
    ctx.fillStyle = 'rgba(105, 98, 88, 0.08)';
    ctx.fillRect((i * 29) % 128, (i * 47) % 128, 1, 1);
  }
  ctx.fillStyle = 'rgba(255, 246, 218, 0.14)';
  ctx.fillRect(42, 42, 44, 44);
}

function drawComicWallTexture(ctx) {
  ctx.fillStyle = '#cac0ad';
  ctx.fillRect(0, 0, 128, 128);

  for (let y = 0; y < 128; y += 18) {
    ctx.fillStyle = y % 36 === 0 ? '#d3c8b6' : '#bfb39f';
    ctx.fillRect(0, y, 128, 17);
    ctx.strokeStyle = 'rgba(85, 75, 63, 0.22)';
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(128, y + 0.5);
    ctx.stroke();
  }

  for (let i = 0; i < 110; i += 1) {
    const x = (i * 43) % 128;
    const y = (i * 19) % 128;
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(69,58,47,0.1)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 14, y + ((i % 3) - 1) * 2);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(0, 0, 128, 5);
  ctx.fillStyle = 'rgba(70, 59, 48, 0.08)';
  ctx.fillRect(0, 122, 128, 6);
}

function drawScreenFrameTexture(ctx) {
  ctx.fillStyle = '#2d302d';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = 'rgba(174, 181, 170, 0.18)';
  for (let x = 0; x < 128; x += 24) {
    ctx.fillRect(x, 0, 8, 128);
  }
  ctx.fillStyle = 'rgba(210, 196, 159, 0.24)';
  ctx.fillRect(0, 0, 128, 10);
  ctx.fillRect(0, 118, 128, 10);
}

function drawBlackStripeTexture(ctx) {
  ctx.fillStyle = '#3e3933';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = 'rgba(172, 180, 171, 0.12)';
  for (let x = -128; x < 160; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, 128);
    ctx.lineTo(x + 42, 0);
    ctx.lineTo(x + 56, 0);
    ctx.lineTo(x + 14, 128);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(210, 196, 159, 0.24)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 24);
  ctx.lineTo(128, 54);
  ctx.stroke();
}

function drawPaperTexture(ctx) {
  const base = ctx.createLinearGradient(0, 0, 128, 128);
  base.addColorStop(0, '#efe6d6');
  base.addColorStop(0.55, '#d9ccb8');
  base.addColorStop(1, '#c6b79f');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 128);

  for (let y = 18; y < 128; y += 18) {
    ctx.strokeStyle = 'rgba(88, 80, 70, 0.12)';
    ctx.beginPath();
    ctx.moveTo(8, y + 0.5);
    ctx.lineTo(120, y + 0.5);
    ctx.stroke();
  }

  for (let i = 0; i < 170; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(84,70,52,0.07)';
    ctx.fillRect((i * 31) % 128, (i * 47) % 128, 1 + (i % 2), 1);
  }
}

function drawBrushedMetalTexture(ctx) {
  ctx.fillStyle = '#171b1d';
  ctx.fillRect(0, 0, 128, 128);

  const sheen = ctx.createLinearGradient(0, 0, 128, 0);
  sheen.addColorStop(0, 'rgba(255,255,255,0.03)');
  sheen.addColorStop(0.44, 'rgba(255,255,255,0.15)');
  sheen.addColorStop(0.55, 'rgba(255,255,255,0.02)');
  sheen.addColorStop(1, 'rgba(0,0,0,0.2)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, 128, 128);

  for (let y = 2; y < 128; y += 5) {
    ctx.strokeStyle = y % 10 === 0 ? 'rgba(215,194,138,0.1)' : 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(128, y + 0.5);
    ctx.stroke();
  }
}

function drawCorkTexture(ctx) {
  ctx.fillStyle = '#765a37';
  ctx.fillRect(0, 0, 128, 128);

  for (let i = 0; i < 460; i += 1) {
    const alpha = 0.06 + (i % 5) * 0.018;
    ctx.fillStyle = i % 3 === 0 ? `rgba(235, 197, 130, ${alpha})` : `rgba(46, 32, 21, ${alpha})`;
    ctx.fillRect((i * 17) % 128, (i * 43) % 128, 1 + (i % 4), 1 + (i % 3));
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  for (let x = -32; x < 150; x += 28) {
    ctx.beginPath();
    ctx.moveTo(x, 128);
    ctx.lineTo(x + 34, 0);
    ctx.stroke();
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
