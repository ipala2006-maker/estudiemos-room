import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Casa1 } from '../maps/Casa1.js';

const activeMap = Casa1;
const startPosition = activeMap.startPosition;
const houseDoorPosition = activeMap.doorPosition;
const computerPosition = activeMap.computerPosition;

export function FirstPersonWorld({
  onDoorOpenChange,
  onNearComputerChange,
  onNearDoorChange,
  resetRef,
  toggleDoorRef,
  controlsEnabled = true
}) {
  const mountRef = useRef(null);
  const nearDoorRef = useRef(false);
  const nearComputerRef = useRef(false);
  const doorOpenRef = useRef(false);
  const controlsEnabledRef = useRef(controlsEnabled);

  useEffect(() => {
    controlsEnabledRef.current = controlsEnabled;
    if (!controlsEnabled) {
      document.exitPointerLock?.();
    }
  }, [controlsEnabled]);

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
        camera.position.x = clamp(camera.position.x, activeMap.bounds.minX, activeMap.bounds.maxX);
        camera.position.z = clamp(camera.position.z, activeMap.bounds.minZ, activeMap.bounds.maxZ);

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
  const textures = {
    grass: createTexture('grass'),
    path: createTexture('path'),
    plaster: createTexture('plaster'),
    wood: createTexture('wood'),
    roof: createTexture('roof')
  };
  const groundMaterial = makeMaterial(0x6f9f6a, 0.88, 0, textures.grass);
  const pathMaterial = makeMaterial(0xcab47e, 0.8, 0, textures.path);
  const wallMaterial = makeMaterial(0xdbe5df, 0.62, 0, textures.plaster);
  const houseWall = makeMaterial(activeMap.style.interiorWall, 0.7, 0, textures.plaster);
  const roofMaterial = makeMaterial(0x87463f, 0.58, 0, textures.roof);
  const doorMaterial = makeMaterial(0x5a3d30, 0.58, 0, textures.wood);

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
  const doorPivot = addHouse(scene, { houseWall, roofMaterial, doorMaterial, textures });
  addDeskComputer(scene, textures);
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

function addPathSign(scene, textures) {
  const post = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 2.1, 0.3),
    makeMaterial(0x5d4336, 0.72, 0, textures.wood)
  );
  post.position.set(-4.6, 1.05, 5.5);
  post.castShadow = true;
  scene.add(post);

  const board = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 1, 0.22),
    makeMaterial(0xe4cc8e, 0.68, 0, textures.wood)
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

  const marker = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.05, 13),
    makeMaterial(0xf6e7b8, 0.78)
  );
  marker.position.set(0, 0.16, -7);
  marker.receiveShadow = true;
  scene.add(marker);
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
    makeMaterial(activeMap.style.interiorFloor, 0.72, 0, materials.textures.plaster)
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
    addWindowFrame(houseGroup, x, 4.5, 4.82);
  });

  const roomLight = new THREE.PointLight(0xffdf9a, 2.1, 14, 1.8);
  roomLight.position.set(-2.5, 5.4, -2);
  houseGroup.add(roomLight);

  scene.add(houseGroup);
  return doorPivot;
}

function addDeskComputer(scene, textures) {
  const desk = new THREE.Mesh(
    new THREE.BoxGeometry(4.8, 1, 1.8),
    makeMaterial(activeMap.style.desk, 0.56, 0, textures.wood)
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

  const lampBase = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.12, 0.45), makeMaterial(0x2f3a3c, 0.42, 0.08));
  lampBase.position.set(-5.05, 1.63, -24.2);
  lampBase.castShadow = true;
  scene.add(lampBase);

  const lampArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), makeMaterial(0x2f3a3c, 0.42, 0.08));
  lampArm.position.set(-5.05, 2.18, -24.2);
  lampArm.castShadow = true;
  scene.add(lampArm);

  const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.36, 6), makeMaterial(0xe2c575, 0.5));
  lampShade.position.set(-5.05, 2.82, -24.2);
  lampShade.castShadow = true;
  scene.add(lampShade);

  const lampLight = new THREE.PointLight(0xffd98a, 1.25, 7, 2);
  lampLight.position.set(-5.05, 2.7, -23.8);
  scene.add(lampLight);
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

function makeMaterial(color, roughness, metalness = 0, texture = null) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    map: texture,
    flatShading: false
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

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(type === 'wood' ? 1.8 : 4, type === 'wood' ? 1.8 : 4);
  texture.anisotropy = 4;
  return texture;
}

function drawGrassTexture(ctx) {
  ctx.fillStyle = '#6e9f69';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 420; i++) {
    const shade = i % 3 === 0 ? '#5d8d59' : i % 3 === 1 ? '#7dac72' : '#88b77c';
    ctx.fillStyle = shade;
    ctx.fillRect((i * 47) % 128, (i * 29) % 128, 2 + (i % 3), 1);
  }
}

function drawPathTexture(ctx) {
  ctx.fillStyle = '#c8b177';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#bda468' : '#d8c48b';
    ctx.fillRect((i * 31) % 128, (i * 53) % 128, 3, 2);
  }
}

function drawPlasterTexture(ctx) {
  ctx.fillStyle = '#ded7c5';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(118, 104, 84, 0.14)';
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
  ctx.fillStyle = '#76523c';
  ctx.fillRect(0, 0, 128, 128);
  for (let y = 12; y < 128; y += 20) {
    ctx.strokeStyle = 'rgba(46, 31, 22, 0.34)';
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(36, y + 5, 84, y - 5, 128, y + 2);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255, 226, 180, 0.14)';
  for (let y = 6; y < 128; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(128, y + 3);
    ctx.stroke();
  }
}

function drawRoofTexture(ctx) {
  ctx.fillStyle = '#88463f';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(48, 24, 24, 0.28)';
  for (let y = 0; y < 128; y += 18) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(128, y + 0.5);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255, 214, 172, 0.12)';
  for (let x = 0; x < 128; x += 24) {
    ctx.fillRect(x, 0, 4, 128);
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
