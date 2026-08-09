import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CSS3DObject, CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { getEquippedSkinState, getSkinVisuals } from '../data/focusEconomy.js';
import { getStudyAgendaBoardLines, studyAgendaItems } from '../data/studyAgenda.js';
import {
  BUILDING_ELEVATOR_CENTER,
  BUILDING_ELEVATOR_SIZE,
  BUILDING_FLOOR_HEIGHT,
  BUILDING_LOBBY_OFFSET,
  BuildingWorld
} from '../maps/BuildingWorld.js';
import { Casa1 } from '../maps/Casa1.js';
import {
  addArchitectureModel,
  addRepeatedWall,
  BUILDING_ARCHITECTURE,
  preloadBuildingArchitecture
} from '../world/buildingArchitecture.js';
import {
  ensureInteractionTargetingInScene,
  updateInteractionTargeting
} from '../utils/installInteractionTargeting.js';
import { ensureRoomShopInScene, updateRoomShopInScene } from '../utils/installRoomShopWorldPolishFix.js';
import {
  ensureRoomSpeakerInScene,
  updateRoomSpeakerInScene
} from '../utils/installRoomSpeakerWorld.js';
import { buildYouTubeEmbedUrl } from '../utils/youtube.js';
import playerAvatarBackUrl from '../assets/player-avatar-back.png';
import playerAvatarFrontUrl from '../assets/player-avatar-front.png';
import playerAvatarSideUrl from '../assets/player-avatar-side.png';
import playerHandViewModelUrl from '../assets/player-hand-viewmodel.png';
import playerVehicleBackUrl from '../assets/player-vehicle-back.png';
import playerVehicleFrontUrl from '../assets/player-vehicle-front.png';
import playerVehicleSideUrl from '../assets/player-vehicle-side.png';

const CANVAS_FONT_STACK = '"Plus Jakarta Sans", "Segoe UI", system-ui, sans-serif';

function canvasFont(weight, size) {
  return `${weight} ${size}px ${CANVAS_FONT_STACK}`;
}

const activeMap = BuildingWorld;
const startPosition = activeMap.startPosition;
const computerPosition = activeMap.computerPosition;
const textureCache = new Map();
const materialCache = new Map();
const emissiveMaterialCache = new Map();
const edgeMaterialCache = new Map();
const modelLoader = new GLTFLoader();
const PERFORMANCE_PROFILE = {
  maxPixelRatio: 1,
  grassBlades: 24,
  horizonTrees: 8,
  horizonShrubs: 8,
  horizonFlowers: 12,
  skyWidthSegments: 24,
  skyHeightSegments: 12
};
const MEADOW_SIZE = 1400;
const MEADOW_HORIZON_RADIUS = 118;
const PERFORMANCE_PASS_MARKER = 'premium-building-pass-2026-08-09';
const CSS_CONTENT_SYNC_INTERVAL_MS = 220;
const ELEVATOR_FEEDBACK_INTERVAL_MS = 120;
const PLAYER_RADIUS = 0.58;
const WALK_SPEED = 9.1;
const WALK_ACCELERATION = 22;
const WALK_DECELERATION = 30;
const CAMERA_SMOOTHING = 38;
const CAMERA_SENSITIVITY = {
  yaw: 0.002,
  pitch: 0.0017
};
const CAMERA_VIEW_MODES = [
  { id: 'first-person', label: 'Primera persona' }
];
const CAMERA_VIEW_TRANSITION = 11;
const FREE_MOUSE_LOOK_SCALE = 0.62;
const FREE_MOUSE_JUMP_LIMIT = 180;
const FIRST_PERSON_ARM_SWING_SECONDS = 0.26;
const PLAYER_AVATAR_FRONT_ASPECT = 364 / 1024;
const PLAYER_AVATAR_BACK_ASPECT = 380 / 1024;
const PLAYER_AVATAR_SIDE_ASPECT = 282 / 1024;
const PLAYER_HAND_VIEWMODEL_ASPECT = 960 / 583;
const PLAYER_VEHICLE_BACK_ASPECT = 960 / 424;
const PLAYER_VEHICLE_FRONT_ASPECT = 960 / 364;
const PLAYER_VEHICLE_SIDE_ASPECT = 720 / 216;
const EDGE_OPACITY_SCALE = 0.28;
const MIN_EDGE_OPACITY = 0.04;
const COMPANION_SIDE_OFFSET = -2.35;
const COMPANION_BACK_OFFSET = -3.35;
const COMPANION_FOLLOW_RESPONSE = 4.4;
const COMPANION_DIRECTION_RESPONSE = 8.5;
const COMPANION_IDLE_SIT_DELAY = 0.85;
const COMPANION_STILL_SPEED = 0.16;
const COMPANION_MIN_PLAYER_DISTANCE = 2.35;
const INTERIOR_LOOK_TARGET = activeMap.interiorSpawnLookAt ?? new THREE.Vector3(84, 2.1, -24);
const GIANT_SCREEN_WORLD = {
  center: new THREE.Vector3(90, 8.25, -34.25),
  width: 48,
  height: 13.5
};
const GIANT_SCREEN_INTERACTION_PADDING = 2.4;
const GIANT_SCREEN_INTERACTION_DISTANCE = 44;
const GIANT_SCREEN_DOM_SIZE = {
  width: 2560,
  height: 720
};
const COMPUTER_MONITOR_OCCLUDER_WORLD = {
  center: new THREE.Vector3(78.6, 2.15, -14.86),
  width: 3.35
};
const COMPUTER_MONITOR_OCCLUDER_DOM_SIZE = {
  width: 420,
  height: 270
};
const AGENDA_BOARD_WORLD = {
  center: new THREE.Vector3(117.55, 4.3, -6),
  width: 8.4
};
const AGENDA_BOARD_DOM_SIZE = {
  width: 520,
  height: 330
};
const AGENDA_BOARD_INTERACTION_PADDING = 0.65;
const AGENDA_BOARD_INTERACTION_DISTANCE = 18;
const WORLD_MODE_QUERY_KEY = 'world';
const LEGACY_WORLD_MODE = 'legacy';
const BUILDING_WORLD_MODE = 'building';
const BUILDING_STAIR_RISE = BUILDING_FLOOR_HEIGHT;
const BUILDING_LOBBY_REAR_WALL_Z = -13.2;
const BUILDING_LOBBY_FRONT_WALL_Z = 19.75;
const BUILDING_LOBBY_DEPTH = BUILDING_LOBBY_FRONT_WALL_Z - BUILDING_LOBBY_REAR_WALL_Z;
const BUILDING_LOBBY_CENTER_Z = (BUILDING_LOBBY_FRONT_WALL_Z + BUILDING_LOBBY_REAR_WALL_Z) / 2;
const BUILDING_STAIR_MIN_Z = -8.2;
const BUILDING_STAIR_MAX_Z = 7.2;
const BUILDING_STAIR_MIN_X = -17.1;
const BUILDING_STAIR_MAX_X = -10.5;
const BUILDING_STAIR_OPENING_MIN_X = BUILDING_STAIR_MIN_X - 0.3;
const BUILDING_STAIR_OPENING_MAX_X = BUILDING_STAIR_MAX_X + 0.3;
const BUILDING_STAIR_WORLD_MIN_Z = BUILDING_LOBBY_OFFSET.z + BUILDING_STAIR_MIN_Z;
const BUILDING_STAIR_WORLD_MAX_Z = BUILDING_LOBBY_OFFSET.z + BUILDING_STAIR_MAX_Z;
const BUILDING_STAIR_WORLD_MIN_X = BUILDING_LOBBY_OFFSET.x + BUILDING_STAIR_MIN_X;
const BUILDING_STAIR_WORLD_MAX_X = BUILDING_LOBBY_OFFSET.x + BUILDING_STAIR_MAX_X;
const BUILDING_STAIR_SAFE_MIN_X = BUILDING_STAIR_WORLD_MIN_X + PLAYER_RADIUS;
const BUILDING_STAIR_SAFE_MAX_X = BUILDING_STAIR_WORLD_MAX_X - PLAYER_RADIUS;
const BUILDING_STAIR_APPROACH_PADDING = 2.4;
const BUILDING_ELEVATOR_X = BUILDING_ELEVATOR_CENTER.x;
const BUILDING_ELEVATOR_Z = BUILDING_ELEVATOR_CENTER.z;
const STUDY_ROOM_ORIGIN_X = 90;
const STUDY_ROOM_ORIGIN_Z = -6;
const ELEVATOR_INTERACTION_DISTANCE = 5.2;
const ELEVATOR_BOARDING_GUIDE_DISTANCE = 5.4;
const ELEVATOR_BUTTON_AIM_DISTANCE = 5.2;
const ELEVATOR_BUTTON_AIM_RADIUS = 0.48;
const ELEVATOR_DOOR_SECONDS = 0.82;
const ELEVATOR_LIFT_SECONDS = 2.85;
const ELEVATOR_CABIN_WIDTH = BUILDING_ELEVATOR_SIZE.width;
const ELEVATOR_CABIN_DEPTH = BUILDING_ELEVATOR_SIZE.depth;
const ELEVATOR_CABIN_HALF_WIDTH = ELEVATOR_CABIN_WIDTH / 2;
const ELEVATOR_CABIN_HALF_DEPTH = ELEVATOR_CABIN_DEPTH / 2;
const ELEVATOR_SHAFT_SHELL_WIDTH = 10.9;
const ELEVATOR_SHAFT_SHELL_DEPTH = 6.6;
const ELEVATOR_SHAFT_SHELL_HALF_WIDTH = ELEVATOR_SHAFT_SHELL_WIDTH / 2;
const ELEVATOR_SHAFT_WALL_THICKNESS = 0.4;
const ELEVATOR_PORTAL_OPENING_WIDTH = 8.3;
const ELEVATOR_DOOR_PANEL_WIDTH = 4.22;
const ELEVATOR_DOOR_CLOSED_OFFSET = ELEVATOR_DOOR_PANEL_WIDTH / 2;
const ELEVATOR_DOOR_SLIDE_DISTANCE = 2.32;
const ELEVATOR_CALL_STATION_OFFSET = 5.05;
const ELEVATOR_FRONT_PIER_WIDTH = (ELEVATOR_SHAFT_SHELL_WIDTH - ELEVATOR_PORTAL_OPENING_WIDTH) / 2;
const BUILDING_LOBBY_ELEVATOR_DOOR_Z = BUILDING_ELEVATOR_Z + ELEVATOR_CABIN_HALF_DEPTH;
const BUILDING_STUDY_ELEVATOR_DOOR_Z = BUILDING_ELEVATOR_Z - ELEVATOR_CABIN_HALF_DEPTH;
const BUILDING_LOBBY_ELEVATOR_LOCAL_X = BUILDING_ELEVATOR_X - BUILDING_LOBBY_OFFSET.x;
const BUILDING_LOBBY_REAR_FACADE_Z =
  BUILDING_LOBBY_ELEVATOR_DOOR_Z - BUILDING_LOBBY_OFFSET.z;
const BUILDING_LOBBY_SHOP_LOCAL_Z = BUILDING_LOBBY_REAR_FACADE_Z + 1.6;
const BUILDING_LOBBY_SHOP_WORLD_Z = BUILDING_LOBBY_OFFSET.z + BUILDING_LOBBY_SHOP_LOCAL_Z;
const STUDY_ELEVATOR_LOCAL_X = BUILDING_ELEVATOR_X - STUDY_ROOM_ORIGIN_X;
const STUDY_ELEVATOR_FACADE_Z = BUILDING_STUDY_ELEVATOR_DOOR_Z - STUDY_ROOM_ORIGIN_Z;
const STUDY_STAIR_OPENING_MIN_X =
  BUILDING_LOBBY_OFFSET.x + BUILDING_STAIR_OPENING_MIN_X - STUDY_ROOM_ORIGIN_X;
const STUDY_STAIR_OPENING_MAX_X =
  BUILDING_LOBBY_OFFSET.x + BUILDING_STAIR_OPENING_MAX_X - STUDY_ROOM_ORIGIN_X;
const STUDY_ELEVATOR_OPENING_MIN_X = STUDY_ELEVATOR_LOCAL_X - ELEVATOR_SHAFT_SHELL_HALF_WIDTH;
const STUDY_ELEVATOR_OPENING_MAX_X = STUDY_ELEVATOR_LOCAL_X + ELEVATOR_SHAFT_SHELL_HALF_WIDTH;
const STUDY_FRONT_SOLID_SEGMENTS = Object.freeze([
  { name: 'left', minX: -28, maxX: STUDY_STAIR_OPENING_MIN_X },
  { name: 'center', minX: STUDY_STAIR_OPENING_MAX_X, maxX: STUDY_ELEVATOR_OPENING_MIN_X },
  { name: 'right', minX: STUDY_ELEVATOR_OPENING_MAX_X, maxX: 28 }
]);
const BUILDING_VISUAL_AUDIT_VIEWS = Object.freeze({
  'lobby-elevator-left': {
    floor: 'lobby',
    position: [92.2, -8.3, 29.4],
    lookAt: [94.3, -7.7, BUILDING_LOBBY_ELEVATOR_DOOR_Z]
  },
  'lobby-elevator-right': {
    floor: 'lobby',
    position: [103.4, -8.3, 29.4],
    lookAt: [101.5, -7.7, BUILDING_LOBBY_ELEVATOR_DOOR_Z]
  },
  'lobby-elevator-call': {
    floor: 'lobby',
    position: [94.6, -8.3, 29.2],
    lookAt: [92.85, -8.94, BUILDING_LOBBY_ELEVATOR_DOOR_Z + 0.66],
    pitch: -0.19
  },
  'lobby-elevator-call-away': {
    floor: 'lobby',
    position: [94.6, -8.3, 29.2],
    lookAt: [92.85, -8.94, BUILDING_LOBBY_ELEVATOR_DOOR_Z + 0.66],
    pitch: -0.19,
    elevatorState: 'away'
  },
  'lobby-elevator-boarding': {
    floor: 'lobby',
    position: [BUILDING_ELEVATOR_X, -8.3, BUILDING_LOBBY_ELEVATOR_DOOR_Z + 3.15],
    lookAt: [BUILDING_ELEVATOR_X, -8.25, BUILDING_ELEVATOR_Z],
    elevatorState: 'boarding-outside'
  },
  'lobby-elevator-cabin': {
    floor: 'lobby',
    position: [BUILDING_ELEVATOR_X, -8.3, BUILDING_ELEVATOR_Z],
    lookAt: [BUILDING_ELEVATOR_X + ELEVATOR_CABIN_HALF_WIDTH - 0.38, -8.32, BUILDING_ELEVATOR_Z + 0.13],
    elevatorState: 'ready-inside'
  },
  'lobby-elevator-cabin-close': {
    floor: 'lobby',
    position: [BUILDING_ELEVATOR_X, -8.3, BUILDING_ELEVATOR_Z],
    lookAt: [BUILDING_ELEVATOR_X + ELEVATOR_CABIN_HALF_WIDTH - 0.38, -9.1, BUILDING_ELEVATOR_Z + 0.35],
    pitch: -0.24,
    elevatorState: 'boarding-inside'
  },
  'lobby-elevator-exit': {
    floor: 'lobby',
    position: [BUILDING_ELEVATOR_X, -8.3, BUILDING_LOBBY_ELEVATOR_DOOR_Z + 1.35],
    lookAt: [BUILDING_ELEVATOR_X, -7.9, BUILDING_LOBBY_ELEVATOR_DOOR_Z + 5],
    elevatorState: 'boarding-inside'
  },
  'lobby-back-left': {
    floor: 'lobby',
    position: [83, -8.3, 44],
    lookAt: [76, -7.7, 28]
  },
  'lobby-back-right': {
    floor: 'lobby',
    position: [103.2, -8.3, 30.2],
    lookAt: [98.4, -7.7, 26.2]
  },
  'lobby-front-left': {
    floor: 'lobby',
    position: [71.8, -8.3, 48.2],
    lookAt: [76.6, -7.7, 43.4]
  },
  'lobby-front-right': {
    floor: 'lobby',
    position: [103.2, -8.3, 48.2],
    lookAt: [98.4, -7.7, 43.4]
  },
  'lobby-stair-bottom': {
    floor: 'lobby',
    position: [73.5, -8.3, 42.7],
    lookAt: [73.5, -5.9, 35.8]
  },
  'lobby-stair-transition-up': {
    floor: 'lobby',
    position: [73.5, 1.65, 24.58],
    lookAt: [73.5, 1.7, 22.1]
  },
  'study-stair-top': {
    floor: 'study',
    position: [73.5, 1.7, 23.75],
    lookAt: [73.5, -1.2, 30.4],
    pitch: -0.42
  },
  'study-stair-transition-down': {
    floor: 'study',
    position: [73.5, -8.25, 39.82],
    lookAt: [73.5, -8.3, 42.4]
  },
  'study-elevator-left': {
    floor: 'study',
    position: [92.2, 1.7, 16.2],
    lookAt: [94.3, 2.3, BUILDING_STUDY_ELEVATOR_DOOR_Z]
  },
  'study-elevator-right': {
    floor: 'study',
    position: [103.4, 1.7, 16.2],
    lookAt: [101.5, 2.3, BUILDING_STUDY_ELEVATOR_DOOR_Z]
  },
  'study-elevator-exit': {
    floor: 'study',
    position: [BUILDING_ELEVATOR_X, 1.7, BUILDING_STUDY_ELEVATOR_DOOR_Z - 1.35],
    lookAt: [BUILDING_ELEVATOR_X, 2.1, BUILDING_STUDY_ELEVATOR_DOOR_Z - 5],
    elevatorState: 'boarding-inside'
  },
  'study-front-left': {
    floor: 'study',
    position: [63.8, 1.7, 21.8],
    lookAt: [68.5, 2.3, 17.2]
  },
  'study-front-right': {
    floor: 'study',
    position: [116.2, 1.7, 21.8],
    lookAt: [111.5, 2.3, 17.2]
  },
  'study-back-left': {
    floor: 'study',
    position: [63.8, 1.7, -33.8],
    lookAt: [68.5, 2.3, -29]
  },
  'study-back-right': {
    floor: 'study',
    position: [116.2, 1.7, -33.8],
    lookAt: [111.5, 2.3, -29]
  },
  'study-computer': {
    floor: 'study',
    position: [82.2, 1.7, -11.8],
    lookAt: [78.6, 2.35, -14.55]
  }
});
const ELEVATOR_CABIN_COLLIDER_THICKNESS = 0.3;
const ELEVATOR_INSIDE_CLEARANCE = 0.06;
const ELEVATOR_CABIN_SAFE_MIN_X =
  BUILDING_ELEVATOR_X -
  ELEVATOR_CABIN_HALF_WIDTH +
  ELEVATOR_CABIN_COLLIDER_THICKNESS +
  PLAYER_RADIUS +
  ELEVATOR_INSIDE_CLEARANCE;
const ELEVATOR_CABIN_SAFE_MAX_X =
  BUILDING_ELEVATOR_X +
  ELEVATOR_CABIN_HALF_WIDTH -
  ELEVATOR_CABIN_COLLIDER_THICKNESS -
  PLAYER_RADIUS -
  ELEVATOR_INSIDE_CLEARANCE;
const ELEVATOR_CABIN_SAFE_MIN_Z =
  BUILDING_ELEVATOR_Z -
  ELEVATOR_CABIN_HALF_DEPTH +
  ELEVATOR_CABIN_COLLIDER_THICKNESS +
  PLAYER_RADIUS +
  ELEVATOR_INSIDE_CLEARANCE;
const ELEVATOR_CABIN_SAFE_MAX_Z =
  BUILDING_ELEVATOR_Z +
  ELEVATOR_CABIN_HALF_DEPTH -
  ELEVATOR_CABIN_COLLIDER_THICKNESS -
  PLAYER_RADIUS -
  ELEVATOR_INSIDE_CLEARANCE;
const ELEVATOR_CALL_STATION = Object.freeze({
  lobby: {
    anchor: new THREE.Vector3(
      BUILDING_ELEVATOR_X - ELEVATOR_CALL_STATION_OFFSET,
      BUILDING_LOBBY_OFFSET.y + 0.28,
      BUILDING_LOBBY_ELEVATOR_DOOR_Z + 0.42
    ),
    button: new THREE.Vector3(
      BUILDING_ELEVATOR_X - ELEVATOR_CALL_STATION_OFFSET,
      BUILDING_LOBBY_OFFSET.y + 1.06,
      BUILDING_LOBBY_ELEVATOR_DOOR_Z + 0.66
    )
  },
  study: {
    anchor: new THREE.Vector3(
      BUILDING_ELEVATOR_X - ELEVATOR_CALL_STATION_OFFSET,
      0.28,
      BUILDING_STUDY_ELEVATOR_DOOR_Z - 0.42
    ),
    button: new THREE.Vector3(
      BUILDING_ELEVATOR_X - ELEVATOR_CALL_STATION_OFFSET,
      1.06,
      BUILDING_STUDY_ELEVATOR_DOOR_Z - 0.66
    )
  }
});
const ELEVATOR_CABIN_PANEL = Object.freeze({
  anchorX: ELEVATOR_CABIN_HALF_WIDTH - 0.18,
  anchorY: 0.55,
  anchorZ: 0.35,
  scale: 0.82,
  faceOffsetX: -0.24,
  buttons: Object.freeze({
    'floor-study': { y: 1.38, z: -0.27 },
    'floor-lobby': { y: 0.95, z: -0.27 },
    close: { y: 0.43, z: 0 }
  })
});
const ELEVATOR_CABIN_BUTTON_ENTRIES = Object.freeze(Object.entries(ELEVATOR_CABIN_PANEL.buttons));
const ELEVATOR_PASSENGER_PHASES = Object.freeze(['boarding', 'closing-inside', 'ready', 'traveling']);
const DEFAULT_SCREEN_LAYOUT = 'split-70-30';
const DEFAULT_SCREEN_ZONES = {
  upper: { videoId: '', embedUrl: '', contentType: 'empty', resourceUrl: '', title: '', muted: true, volume: 70, displayScale: 100, updatedAt: 0 },
  lower: { videoId: '', embedUrl: '', contentType: 'empty', resourceUrl: '', title: '', muted: true, volume: 70, displayScale: 100, updatedAt: 0 }
};

export function FirstPersonWorld({
  onDoorOpenChange,
  onNearComputerChange,
  onNearDoorChange,
  onNearElevatorChange = () => {},
  onElevatorActionChange = () => {},
  onElevatorSessionChange = () => {},
  onFloorChange = () => {},
  onAgendaBoardAimChange = () => {},
  onScreenAimChange,
  resetRef,
  toggleDoorRef,
  travelToFloorRef,
  elevatorActionRef,
  controlsEnabled = true,
  screenContentEnabled = controlsEnabled,
  screenZones = DEFAULT_SCREEN_ZONES,
  screenLayout = DEFAULT_SCREEN_LAYOUT,
  agendaItems = studyAgendaItems,
  focusProgress,
  initialInside = false
}) {
  const mountRef = useRef(null);
  const nearDoorRef = useRef(false);
  const nearElevatorRef = useRef(false);
  const nearComputerRef = useRef(false);
  const agendaBoardAimRef = useRef(false);
  const screenAimRef = useRef(false);
  const doorOpenRef = useRef(false);
  const controlsEnabledRef = useRef(controlsEnabled);
  const screenContentEnabledRef = useRef(screenContentEnabled);
  const screenZonesRef = useRef(screenZones);
  const screenLayoutRef = useRef(screenLayout);
  const agendaItemsRef = useRef(agendaItems);
  const focusProgressRef = useRef(focusProgress);

  useEffect(() => {
    controlsEnabledRef.current = controlsEnabled;
    if (!controlsEnabled) {
      document.exitPointerLock?.();
    }
  }, [controlsEnabled]);

  useEffect(() => {
    screenContentEnabledRef.current = screenContentEnabled;
  }, [screenContentEnabled]);

  useEffect(() => {
    screenZonesRef.current = screenZones;
  }, [screenZones]);

  useEffect(() => {
    screenLayoutRef.current = screenLayout;
  }, [screenLayout]);

  useEffect(() => {
    agendaItemsRef.current = agendaItems;
  }, [agendaItems]);

  useEffect(() => {
    focusProgressRef.current = focusProgress;
  }, [focusProgress]);

  useEffect(() => {
    const mount = mountRef.current;
    const worldMode = getRequestedWorldMode();
    const isLegacyWorld = worldMode === LEGACY_WORLD_MODE;
    const requestedInitialFloor = getRequestedInitialFloor();
    const modeStartPosition = isLegacyWorld ? Casa1.startPosition.clone() : getRequestedBuildingStartPosition(requestedInitialFloor);
    const modeStartLookTarget = isLegacyWorld
      ? Casa1.entrancePosition.clone()
      : getRequestedBuildingStartLookTarget(requestedInitialFloor);
    const exteriorBounds = isLegacyWorld ? Casa1.neighborhoodBounds : activeMap.lobbyBounds;
    const scene = new THREE.Scene();
    scene.userData.performancePass = PERFORMANCE_PASS_MARKER;
    scene.userData.worldMode = worldMode;
    scene.background = new THREE.Color(0xaab7b1);
    scene.fog = new THREE.Fog(0xaab7b1, 92, 230);

    const shouldStartInside = isLegacyWorld ? Boolean(initialInside) : requestedInitialFloor === 'study';
    const playerPosition = (isLegacyWorld && shouldStartInside ? activeMap.interiorSpawnPosition : modeStartPosition).clone();
    const camera = new THREE.PerspectiveCamera(68, mount.clientWidth / mount.clientHeight, 0.1, 230);
    camera.position.copy(playerPosition);
    camera.rotation.order = 'YXZ';
    scene.add(camera);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, PERFORMANCE_PROFILE.maxPixelRatio));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.86;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    mount.appendChild(renderer.domElement);

    const environmentGenerator = new THREE.PMREMGenerator(renderer);
    const environmentRenderTarget = environmentGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = environmentRenderTarget.texture;
    scene.environmentIntensity = 0.48;
    environmentGenerator.dispose();

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
    const cssComputerMonitorOccluder = createCssComputerMonitorOccluderObject();
    cssComputerMonitorOccluder.visible = false;
    cssScene.add(cssComputerMonitorOccluder);
    const cssAgendaBoard = createCssAgendaBoardObject();
    cssAgendaBoard.visible = false;
    cssScene.add(cssAgendaBoard);

    const ambient = new THREE.HemisphereLight(0xfff0d8, 0x263b38, 0.48);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffe0ae, 1.64);
    sun.position.set(28, 31, 16);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 74;
    sun.shadow.camera.left = -42;
    sun.shadow.camera.right = 42;
    sun.shadow.camera.top = 42;
    sun.shadow.camera.bottom = -42;
    sun.shadow.bias = -0.00015;
    sun.shadow.normalBias = 0.045;
    scene.add(sun);

    const rimLight = new THREE.DirectionalLight(0x9fdccc, 0.26);
    rimLight.position.set(-24, 13, 24);
    scene.add(rimLight);

    const softFill = new THREE.DirectionalLight(0xffe9c8, 0.16);
    softFill.position.set(-18, 11, -8);
    scene.add(softFill);

    const { giantScreen, colliders, exteriorGroup, elevatorCabin } = buildWorldScene(scene, worldMode);

    let disposed = false;
    preloadBuildingArchitecture()
      .then(() => {
        if (disposed) return;
        const previousRoomVisibility = giantScreen.room.visible;
        const previousLobbyVisibility = exteriorGroup.visible;
        giantScreen.room.visible = true;
        exteriorGroup.visible = true;

        const textures = new Set();
        scene.traverse((object) => {
          if (!object.isMesh || !object.material) return;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => {
            ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'alphaMap'].forEach((key) => {
              if (material?.[key]) textures.add(material[key]);
            });
          });
        });
        textures.forEach((texture) => renderer.initTexture(texture));
        const compilePromise = renderer.compileAsync(scene, camera);

        giantScreen.room.visible = previousRoomVisibility;
        exteriorGroup.visible = previousLobbyVisibility;
        return compilePromise;
      })
      .then(() => {
        if (!disposed) mount.dataset.renderWarmup = 'ready';
      })
      .catch(() => {
        if (!disposed) mount.dataset.renderWarmup = 'skipped';
      });
    const elevatorDoors = createBuildingElevatorDoorController(scene);
    const elevatorCabinDoors = createBuildingElevatorCabinDoorController(elevatorCabin);
    const elevatorCabinColliders = createBuildingElevatorCabinColliders();
    ensureInteractionTargetingInScene(scene, cssScene);
    ensureRoomShopInScene(scene);
    ensureRoomSpeakerInScene(scene);
    doorOpenRef.current = shouldStartInside;
    giantScreen.room.visible = shouldStartInside;
    exteriorGroup.visible = !shouldStartInside;
    const companionMascot = createCompanionDachshund(getEquippedSkinState(focusProgressRef.current));
    scene.add(companionMascot.group);
    const firstPersonArm = createFirstPersonArmViewModel();
    firstPersonArm.handPlane.visible = false;
    camera.add(firstPersonArm.group);

    const keys = {
      forward: false,
      backward: false,
      left: false,
      right: false
    };
    const inputDirection = new THREE.Vector3();
    const playerForwardHorizontal = new THREE.Vector3();
    const cameraRightHorizontal = new THREE.Vector3();
    const cameraModeForward = new THREE.Vector3();
    const cameraDesiredPosition = new THREE.Vector3();
    const cameraLookTarget = new THREE.Vector3();
    const elevatorDirection = new THREE.Vector3();
    const elevatorAimDirection = new THREE.Vector3();
    const elevatorButtonTarget = new THREE.Vector3();
    const movementVelocity = new THREE.Vector3();
    const targetVelocity = new THREE.Vector3();
    const movementStep = new THREE.Vector3();
    const playerViewProxy = {
      position: playerPosition,
      up: camera.up,
      getWorldDirection(target) {
        return target.copy(playerForwardHorizontal);
      }
    };
    let yaw = 0;
    let pitch = 0;
    let targetYaw = 0;
    let targetPitch = 0;
    const cameraMode = CAMERA_VIEW_MODES[0].id;
    let pointerLocked = false;
    let lastFreeMouseX = null;
    let lastFreeMouseY = null;
    let verticalVelocity = 0;
    let isGrounded = true;
    const eyeHeight = Casa1.startPosition.y;
    let currentFloor = shouldStartInside ? 'study' : isLegacyWorld ? 'legacy' : 'lobby';
    let elevatorPhase = 'idle';
    let elevatorSequence = null;
    let elevatorFloor = currentFloor;
    let elevatorPassengerInside = false;
    let elevatorHasBoarded = false;
    let publishedElevatorAction = null;
    applyCameraModeVisuals();

    function publishElevatorAction(action) {
      if (publishedElevatorAction === action) return;
      publishedElevatorAction = action;
      onElevatorActionChange(action);
    }

    function getAimedElevatorControlAction() {
      camera.getWorldDirection(elevatorAimDirection).normalize();

      if (!elevatorPassengerInside) {
        const callTarget = ELEVATOR_CALL_STATION[currentFloor]?.button;
        if (!callTarget || camera.position.distanceTo(callTarget) > ELEVATOR_BUTTON_AIM_DISTANCE) return null;
        return raySphereHitDistance(
          camera.position,
          elevatorAimDirection,
          callTarget,
          ELEVATOR_BUTTON_AIM_RADIUS
        ) !== null
          ? 'call'
          : null;
      }

      let nearestAction = null;
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (const [action, button] of ELEVATOR_CABIN_BUTTON_ENTRIES) {
        elevatorButtonTarget.set(
          BUILDING_ELEVATOR_X +
            ELEVATOR_CABIN_PANEL.anchorX +
            ELEVATOR_CABIN_PANEL.faceOffsetX * ELEVATOR_CABIN_PANEL.scale,
          elevatorCabin.position.y + ELEVATOR_CABIN_PANEL.anchorY + button.y * ELEVATOR_CABIN_PANEL.scale,
          BUILDING_ELEVATOR_Z + ELEVATOR_CABIN_PANEL.anchorZ + button.z * ELEVATOR_CABIN_PANEL.scale
        );
        if (camera.position.distanceTo(elevatorButtonTarget) > ELEVATOR_BUTTON_AIM_DISTANCE) continue;
        const hitDistance = raySphereHitDistance(
          camera.position,
          elevatorAimDirection,
          elevatorButtonTarget,
          ELEVATOR_BUTTON_AIM_RADIUS
        );
        if (hitDistance !== null && hitDistance < nearestDistance) {
          nearestAction = action;
          nearestDistance = hitDistance;
        }
      }
      return nearestAction;
    }

    function clearMovementInput() {
      keys.forward = false;
      keys.backward = false;
      keys.left = false;
      keys.right = false;
    }

    function applyRequestedElevatorAuditState() {
      const auditState = getRequestedBuildingAuditView(currentFloor)?.elevatorState;
      if (isLegacyWorld || !elevatorCabin || !auditState) return false;

      if (auditState === 'away') {
        elevatorFloor = currentFloor === 'study' ? 'lobby' : 'study';
        elevatorCabin.position.y = elevatorFloor === 'study' ? 0 : BUILDING_LOBBY_OFFSET.y;
        elevatorPassengerInside = false;
        elevatorHasBoarded = false;
        elevatorSequence = null;
        elevatorPhase = 'idle';
        onElevatorSessionChange(false);
        setAllBuildingElevatorDoors(elevatorDoors, 0);
        setAllBuildingElevatorCabinDoors(elevatorCabinDoors, 0);
        delete mount.dataset.buildingTransit;
        return true;
      }

      if (auditState === 'boarding-outside') {
        elevatorFloor = currentFloor;
        elevatorCabin.position.y = currentFloor === 'study' ? 0 : BUILDING_LOBBY_OFFSET.y;
        elevatorPassengerInside = false;
        elevatorHasBoarded = false;
        elevatorSequence = null;
        elevatorPhase = 'boarding';
        onElevatorSessionChange(false);
        setBuildingElevatorDoorProgress(elevatorDoors, currentFloor, 1);
        setBuildingElevatorCabinDoorProgress(elevatorCabinDoors, getElevatorEntrySide(currentFloor), 1);
        mount.dataset.buildingTransit = 'boarding';
        return true;
      }

      elevatorFloor = currentFloor;
      elevatorCabin.position.y = currentFloor === 'study' ? 0 : BUILDING_LOBBY_OFFSET.y;
      elevatorPassengerInside = true;
      elevatorHasBoarded = true;
      elevatorSequence = null;
      onElevatorSessionChange(true);

      if (auditState === 'boarding-inside') {
        elevatorPhase = 'boarding';
        setBuildingElevatorDoorProgress(elevatorDoors, currentFloor, 1);
        setBuildingElevatorCabinDoorProgress(elevatorCabinDoors, getElevatorEntrySide(currentFloor), 1);
        mount.dataset.buildingTransit = 'boarding';
      } else {
        elevatorPhase = 'ready';
        setAllBuildingElevatorDoors(elevatorDoors, 0);
        setAllBuildingElevatorCabinDoors(elevatorCabinDoors, 0);
        mount.dataset.buildingTransit = 'ready';
      }
      return true;
    }

    function resetCamera() {
      elevatorSequence = null;
      elevatorPhase = 'idle';
      currentFloor = isLegacyWorld ? 'legacy' : shouldStartInside ? 'study' : 'lobby';
      elevatorFloor = currentFloor;
      elevatorPassengerInside = false;
      elevatorHasBoarded = false;
      playerPosition.copy(modeStartPosition);
      camera.position.copy(playerPosition);
      movementVelocity.set(0, 0, 0);
      verticalVelocity = 0;
      isGrounded = true;
      yaw = 0;
      pitch = 0;
      targetYaw = yaw;
      targetPitch = pitch;
      camera.rotation.set(pitch, yaw, 0);
      doorOpenRef.current = shouldStartInside;
      nearDoorRef.current = false;
      nearElevatorRef.current = false;
      nearComputerRef.current = false;
      screenAimRef.current = false;
      onDoorOpenChange(shouldStartInside);
      onNearDoorChange(false);
      onNearElevatorChange(false);
      onElevatorSessionChange(false);
      publishElevatorAction(null);
      onNearComputerChange(false);
      onFloorChange(currentFloor);
      onAgendaBoardAimChange(false);
      onScreenAimChange(false);
      giantScreen.room.visible = shouldStartInside;
      exteriorGroup.visible = !shouldStartInside;
      if (elevatorCabin) elevatorCabin.position.y = shouldStartInside ? 0 : BUILDING_LOBBY_OFFSET.y;
      setAllBuildingElevatorDoors(elevatorDoors, 0);
      setAllBuildingElevatorCabinDoors(elevatorCabinDoors, 0);
      delete mount.dataset.buildingTransit;
      applyRequestedElevatorAuditState();
      mount.dataset.elevatorPhase = elevatorPhase;
      mount.dataset.elevatorFloor = elevatorFloor;
      mount.dataset.elevatorPassenger = elevatorPassengerInside ? 'inside' : 'outside';
      if (!isLegacyWorld) {
        faceCameraToward(shouldStartInside && !hasRequestedBuildingSpawn() ? INTERIOR_LOOK_TARGET : modeStartLookTarget);
      }
    }

    function faceCameraToward(target) {
      yaw = Math.atan2(playerPosition.x - target.x, playerPosition.z - target.z);
      pitch = getRequestedBuildingAuditView(currentFloor)?.pitch ?? 0;
      targetYaw = yaw;
      targetPitch = pitch;
      camera.rotation.set(pitch, yaw, 0);
    }

    function applyCameraModeVisuals() {
      firstPersonArm.group.visible = true;
      mount.dataset.cameraMode = cameraMode;
      mount.dataset.cameraModeLabel = CAMERA_VIEW_MODES[0].label;
    }

    resetRef.current = resetCamera;
    if (shouldStartInside) {
      faceCameraToward(!isLegacyWorld && hasRequestedBuildingSpawn() ? modeStartLookTarget : INTERIOR_LOOK_TARGET);
      onDoorOpenChange(true);
    } else {
      onDoorOpenChange(false);
      if (!isLegacyWorld) faceCameraToward(modeStartLookTarget);
    }
    onFloorChange(currentFloor);
    if (elevatorCabin) elevatorCabin.position.y = currentFloor === 'study' ? 0 : BUILDING_LOBBY_OFFSET.y;
    setAllBuildingElevatorDoors(elevatorDoors, 0);
    setAllBuildingElevatorCabinDoors(elevatorCabinDoors, 0);
    applyRequestedElevatorAuditState();
    mount.dataset.elevatorPhase = elevatorPhase;
    mount.dataset.elevatorFloor = elevatorFloor;
    mount.dataset.elevatorPassenger = elevatorPassengerInside ? 'inside' : 'outside';

    function setActiveFloor(targetFloor) {
      const nextIsStudyFloor = targetFloor === 'study';
      if (
        targetFloor !== currentFloor &&
        !elevatorPassengerInside &&
        elevatorPhase !== 'idle' &&
        elevatorPhase !== 'traveling'
      ) {
        setAllBuildingElevatorDoors(elevatorDoors, 0);
        setAllBuildingElevatorCabinDoors(elevatorCabinDoors, 0);
        const cabinNearStudy = Math.abs(elevatorCabin.position.y) <= Math.abs(elevatorCabin.position.y - BUILDING_LOBBY_OFFSET.y);
        elevatorFloor = cabinNearStudy ? 'study' : 'lobby';
        elevatorCabin.position.y = cabinNearStudy ? 0 : BUILDING_LOBBY_OFFSET.y;
        elevatorPhase = 'idle';
        elevatorSequence = null;
        elevatorHasBoarded = false;
        onElevatorSessionChange(false);
        publishElevatorAction(null);
        delete mount.dataset.buildingTransit;
      }
      currentFloor = nextIsStudyFloor ? 'study' : isLegacyWorld ? 'legacy' : 'lobby';
      doorOpenRef.current = nextIsStudyFloor;
      giantScreen.room.visible = nextIsStudyFloor;
      exteriorGroup.visible = !nextIsStudyFloor;

      nearDoorRef.current = false;
      nearElevatorRef.current = false;
      onNearDoorChange(false);
      onNearElevatorChange(false);
      onDoorOpenChange(nextIsStudyFloor);
      onFloorChange(currentFloor);
    }

    function applyFloor(targetFloor, travelMode = 'stairs') {
      const nextIsStudyFloor = targetFloor === 'study';

      const arrival = nextIsStudyFloor
        ? isLegacyWorld
          ? activeMap.interiorSpawnPosition
          : travelMode === 'elevator'
            ? activeMap.studyElevatorArrival
            : activeMap.studyStairsArrival
        : isLegacyWorld
          ? Casa1.startPosition
          : travelMode === 'elevator'
            ? activeMap.lobbyElevatorArrival
            : activeMap.lobbyStairsArrival;

      playerPosition.copy(arrival);
      camera.position.copy(playerPosition);
      movementVelocity.set(0, 0, 0);
      verticalVelocity = 0;
      isGrounded = true;
      yaw = 0;
      pitch = 0;
      targetYaw = yaw;
      targetPitch = pitch;

      if (nextIsStudyFloor) {
        faceCameraToward(new THREE.Vector3(90, 2.2, -8));
      } else if (!isLegacyWorld && travelMode === 'stairs') {
        faceCameraToward(new THREE.Vector3(73.5, -7.8, 46));
      } else if (!isLegacyWorld) {
        faceCameraToward(new THREE.Vector3(0, 2.2, -5));
      } else {
        camera.rotation.set(pitch, yaw, 0);
      }

      clearMovementInput();
      setActiveFloor(targetFloor);
    }

    function travelToFloor(targetFloor, travelMode = 'stairs') {
      if (isLegacyWorld) {
        applyFloor(targetFloor === 'study' ? 'study' : 'legacy', travelMode);
        return;
      }

      if (
        travelMode !== 'elevator' ||
        !elevatorCabin ||
        elevatorPhase !== 'ready' ||
        !elevatorPassengerInside ||
        targetFloor === currentFloor
      ) {
        return;
      }

      clearMovementInput();
      movementVelocity.set(0, 0, 0);
      verticalVelocity = 0;
      isGrounded = true;

      const sourceFloorY = currentFloor === 'study' ? 0 : BUILDING_LOBBY_OFFSET.y;
      const targetFloorY = targetFloor === 'study' ? 0 : BUILDING_LOBBY_OFFSET.y;
      elevatorCabin.position.y = sourceFloorY;
      elevatorPhase = 'traveling';
      publishElevatorAction(null);
      mount.dataset.buildingTransit = targetFloor === 'study' ? 'ascending' : 'descending';
      mount.dataset.elevatorPhase = elevatorPhase;
      elevatorSequence = {
        kind: 'travel',
        sourceFloor: currentFloor,
        targetFloor,
        sourceFloorY,
        targetFloorY,
        startedAt: null,
        floorApplied: false
      };
    }

    function beginElevatorDoorOpening(floor) {
      if (isLegacyWorld || !elevatorCabin || elevatorPhase !== 'idle') return;

      const floorY = floor === 'study' ? 0 : BUILDING_LOBBY_OFFSET.y;
      elevatorFloor = floor;
      elevatorCabin.position.y = floorY;
      elevatorPassengerInside = false;
      elevatorHasBoarded = false;
      onElevatorSessionChange(false);
      setAllBuildingElevatorDoors(elevatorDoors, 0);
      setAllBuildingElevatorCabinDoors(elevatorCabinDoors, 0);
      elevatorPhase = 'opening';
      publishElevatorAction(null);
      mount.dataset.buildingTransit = 'opening';
      mount.dataset.elevatorPhase = elevatorPhase;
      elevatorSequence = {
        kind: 'open',
        floor,
        startedAt: null
      };
    }

    function beginElevatorCall() {
      if (isLegacyWorld || !elevatorCabin || elevatorPhase !== 'idle') return;
      if (elevatorFloor === currentFloor) {
        beginElevatorDoorOpening(currentFloor);
        return;
      }

      const targetFloorY = currentFloor === 'study' ? 0 : BUILDING_LOBBY_OFFSET.y;
      elevatorPhase = 'calling';
      publishElevatorAction(null);
      setAllBuildingElevatorDoors(elevatorDoors, 0);
      setAllBuildingElevatorCabinDoors(elevatorCabinDoors, 0);
      mount.dataset.buildingTransit = 'calling';
      mount.dataset.elevatorPhase = elevatorPhase;
      elevatorSequence = {
        kind: 'call',
        sourceFloor: elevatorFloor,
        targetFloor: currentFloor,
        sourceFloorY: elevatorCabin.position.y,
        targetFloorY,
        startedAt: null,
        floorApplied: false
      };
    }

    function beginElevatorClosing() {
      if (isLegacyWorld || elevatorPhase !== 'boarding' || elevatorPassengerInside) return;

      elevatorPhase = 'closing';
      elevatorHasBoarded = false;
      publishElevatorAction(null);
      mount.dataset.buildingTransit = 'closing';
      mount.dataset.elevatorPhase = elevatorPhase;
      elevatorSequence = {
        kind: 'close',
        floor: elevatorFloor,
        startedAt: null
      };
    }

    function beginElevatorPassengerClosing() {
      if (isLegacyWorld || elevatorPhase !== 'boarding' || !elevatorPassengerInside) return;

      elevatorPhase = 'closing-inside';
      publishElevatorAction(null);
      mount.dataset.buildingTransit = 'closing-inside';
      mount.dataset.elevatorPhase = elevatorPhase;
      elevatorSequence = {
        kind: 'close-inside',
        floor: elevatorFloor,
        startedAt: null
      };
    }

    function runElevatorAction() {
      if (publishedElevatorAction === 'call') {
        beginElevatorCall();
      } else if (publishedElevatorAction === 'close') {
        beginElevatorPassengerClosing();
      } else if (publishedElevatorAction === 'floor-study') {
        travelToFloor('study', 'elevator');
      } else if (publishedElevatorAction === 'floor-lobby') {
        travelToFloor('lobby', 'elevator');
      }
    }

    function updateElevatorSequence(frameTime) {
      if (!elevatorSequence) return;
      if (elevatorSequence.startedAt === null) elevatorSequence.startedAt = frameTime;

      const elapsed = Math.max(0, (frameTime - elevatorSequence.startedAt) / 1000);
      const ease = (value) => value * value * value * (value * (value * 6 - 15) + 10);

      if (elevatorSequence.kind === 'open') {
        const progress = ease(clamp(elapsed / ELEVATOR_DOOR_SECONDS, 0, 1));
        setBuildingElevatorDoorProgress(elevatorDoors, elevatorSequence.floor, progress);
        setBuildingElevatorCabinDoorProgress(
          elevatorCabinDoors,
          getElevatorEntrySide(elevatorSequence.floor),
          progress
        );
        if (elapsed >= ELEVATOR_DOOR_SECONDS) {
          setBuildingElevatorDoorProgress(elevatorDoors, elevatorSequence.floor, 1);
          setBuildingElevatorCabinDoorProgress(
            elevatorCabinDoors,
            getElevatorEntrySide(elevatorSequence.floor),
            1
          );
          elevatorFloor = elevatorSequence.floor;
          elevatorSequence = null;
          elevatorPhase = 'boarding';
          elevatorHasBoarded = false;
          mount.dataset.buildingTransit = 'boarding';
          mount.dataset.elevatorPhase = elevatorPhase;
        }
      } else if (elevatorSequence.kind === 'call') {
        const liftEnd = ELEVATOR_LIFT_SECONDS;
        const arrivalEnd = liftEnd + ELEVATOR_DOOR_SECONDS;

        if (elapsed < liftEnd) {
          const progress = ease(clamp(elapsed / ELEVATOR_LIFT_SECONDS, 0, 1));
          elevatorCabin.position.y = THREE.MathUtils.lerp(
            elevatorSequence.sourceFloorY,
            elevatorSequence.targetFloorY,
            progress
          );
        } else {
          if (!elevatorSequence.floorApplied) {
            elevatorSequence.floorApplied = true;
            elevatorCabin.position.y = elevatorSequence.targetFloorY;
            elevatorFloor = elevatorSequence.targetFloor;
          }
          const progress = ease(clamp((elapsed - liftEnd) / ELEVATOR_DOOR_SECONDS, 0, 1));
          setBuildingElevatorDoorProgress(elevatorDoors, elevatorSequence.targetFloor, progress);
          setBuildingElevatorCabinDoorProgress(
            elevatorCabinDoors,
            getElevatorEntrySide(elevatorSequence.targetFloor),
            progress
          );

          if (elapsed >= arrivalEnd) {
            setBuildingElevatorDoorProgress(elevatorDoors, elevatorSequence.targetFloor, 1);
            setBuildingElevatorCabinDoorProgress(
              elevatorCabinDoors,
              getElevatorEntrySide(elevatorSequence.targetFloor),
              1
            );
            elevatorSequence = null;
            elevatorPhase = 'boarding';
            elevatorHasBoarded = false;
            mount.dataset.buildingTransit = 'boarding';
            mount.dataset.elevatorPhase = elevatorPhase;
          }
        }
      } else if (elevatorSequence.kind === 'travel') {
        const liftEnd = ELEVATOR_LIFT_SECONDS;
        const arrivalEnd = liftEnd + ELEVATOR_DOOR_SECONDS;

        if (elapsed < liftEnd) {
          setBuildingElevatorDoorProgress(elevatorDoors, elevatorSequence.sourceFloor, 0);
          setAllBuildingElevatorCabinDoors(elevatorCabinDoors, 0);
          const progress = ease(clamp(elapsed / ELEVATOR_LIFT_SECONDS, 0, 1));
          elevatorCabin.position.y = THREE.MathUtils.lerp(elevatorSequence.sourceFloorY, elevatorSequence.targetFloorY, progress);
        } else {
          if (!elevatorSequence.floorApplied) {
            elevatorSequence.floorApplied = true;
            elevatorCabin.position.y = elevatorSequence.targetFloorY;
            elevatorFloor = elevatorSequence.targetFloor;
            setActiveFloor(elevatorSequence.targetFloor);
          }
          const progress = ease(clamp((elapsed - liftEnd) / ELEVATOR_DOOR_SECONDS, 0, 1));
          setBuildingElevatorDoorProgress(elevatorDoors, elevatorSequence.targetFloor, progress);
          setBuildingElevatorCabinDoorProgress(
            elevatorCabinDoors,
            getElevatorEntrySide(elevatorSequence.targetFloor),
            progress
          );

          if (elapsed >= arrivalEnd) {
            setBuildingElevatorDoorProgress(elevatorDoors, elevatorSequence.targetFloor, 1);
            setBuildingElevatorCabinDoorProgress(
              elevatorCabinDoors,
              getElevatorEntrySide(elevatorSequence.targetFloor),
              1
            );
            elevatorSequence = null;
            elevatorPhase = 'boarding';
            elevatorHasBoarded = true;
            mount.dataset.buildingTransit = 'boarding';
            mount.dataset.elevatorPhase = elevatorPhase;
          }
        }
      } else if (elevatorSequence.kind === 'close' || elevatorSequence.kind === 'close-inside') {
        const progress = ease(clamp(elapsed / ELEVATOR_DOOR_SECONDS, 0, 1));
        setBuildingElevatorDoorProgress(elevatorDoors, elevatorSequence.floor, 1 - progress);
        setBuildingElevatorCabinDoorProgress(
          elevatorCabinDoors,
          getElevatorEntrySide(elevatorSequence.floor),
          1 - progress
        );
        if (elapsed >= ELEVATOR_DOOR_SECONDS) {
          setBuildingElevatorDoorProgress(elevatorDoors, elevatorSequence.floor, 0);
          setAllBuildingElevatorCabinDoors(elevatorCabinDoors, 0);
          const closedWithPassenger = elevatorSequence.kind === 'close-inside';
          elevatorSequence = null;
          elevatorPhase = closedWithPassenger ? 'ready' : 'idle';
          if (closedWithPassenger) {
            mount.dataset.buildingTransit = 'ready';
          } else {
            delete mount.dataset.buildingTransit;
          }
          mount.dataset.elevatorPhase = elevatorPhase;
        }
      }

      if (elevatorPassengerInside || elevatorPhase === 'traveling') {
        playerPosition.y = elevatorCabin.position.y + eyeHeight;
        verticalVelocity = 0;
        isGrounded = true;
        camera.position.copy(playerPosition);
      }
    }

    toggleDoorRef.current = () => {
      if (isLegacyWorld) travelToFloor(doorOpenRef.current ? 'legacy' : 'study', 'stairs');
    };
    if (travelToFloorRef) travelToFloorRef.current = travelToFloor;
    if (elevatorActionRef) elevatorActionRef.current = runElevatorAction;

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
      if (event.code === 'KeyE') {
        firstPersonArm.swing = FIRST_PERSON_ARM_SWING_SECONDS;
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
      lastFreeMouseX = null;
      lastFreeMouseY = null;
    }

    function onPointerLockError() {
      pointerLocked = false;
      lastFreeMouseX = null;
      lastFreeMouseY = null;
    }

    function requestCameraLock() {
      if (!controlsEnabledRef.current || document.pointerLockElement === renderer.domElement) return;
      const lockRequest = renderer.domElement.requestPointerLock?.();
      lockRequest?.catch?.(() => {});
    }

    function onMouseMove(event) {
      if (!controlsEnabledRef.current) {
        lastFreeMouseX = null;
        lastFreeMouseY = null;
        return;
      }

      if (pointerLocked) {
        targetYaw -= event.movementX * CAMERA_SENSITIVITY.yaw;
        targetPitch = clamp(targetPitch - event.movementY * CAMERA_SENSITIVITY.pitch, -0.7, 0.5);
        return;
      }

      if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;

      if (lastFreeMouseX === null || lastFreeMouseY === null) {
        lastFreeMouseX = event.clientX;
        lastFreeMouseY = event.clientY;
        return;
      }

      const deltaX = event.clientX - lastFreeMouseX;
      const deltaY = event.clientY - lastFreeMouseY;
      lastFreeMouseX = event.clientX;
      lastFreeMouseY = event.clientY;

      if (Math.abs(deltaX) > FREE_MOUSE_JUMP_LIMIT || Math.abs(deltaY) > FREE_MOUSE_JUMP_LIMIT) return;
      targetYaw -= deltaX * CAMERA_SENSITIVITY.yaw * FREE_MOUSE_LOOK_SCALE;
      targetPitch = clamp(targetPitch - deltaY * CAMERA_SENSITIVITY.pitch * FREE_MOUSE_LOOK_SCALE, -0.7, 0.5);
    }

    function resetFreeMouseLook() {
      lastFreeMouseX = null;
      lastFreeMouseY = null;
    }

    function resetInputState() {
      resetFreeMouseLook();
      clearMovementInput();
      movementVelocity.set(0, 0, 0);
    }

    function onVisibilityChange() {
      if (document.hidden) resetInputState();
    }

    function onResize() {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      cssRenderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.shadowMap.needsUpdate = true;
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onResize);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('pointerlockerror', onPointerLockError);
    window.addEventListener('blur', resetInputState);
    document.addEventListener('visibilitychange', onVisibilityChange);
    mount.addEventListener('mouseleave', resetFreeMouseLook);
    mount.addEventListener('click', requestCameraLock);

    const timer = new THREE.Timer();
    timer.connect(document);
    let frameId = 0;
    let lastCssContentSyncTime = Number.NEGATIVE_INFINITY;
    let lastElevatorFeedbackTime = Number.NEGATIVE_INFINITY;

    function animate(timestamp) {
      timer.update(timestamp);
      const delta = Math.min(timer.getDelta(), 0.04);
      const frameTime = typeof timestamp === 'number' ? timestamp : 0;
      updateElevatorSequence(frameTime);
      const elevatorControlsPlayer = !isLegacyWorld && (elevatorPassengerInside || elevatorPhase === 'traveling');
      const canControlWorld = controlsEnabledRef.current;
      if (!canControlWorld) {
        clearMovementInput();
        movementVelocity.set(0, 0, 0);
      }

      const cameraResponse = 1 - Math.exp(-CAMERA_SMOOTHING * delta);
      yaw += (targetYaw - yaw) * cameraResponse;
      pitch += (targetPitch - pitch) * cameraResponse;

      setHorizontalForwardFromYaw(playerForwardHorizontal, yaw);
      cameraRightHorizontal.crossVectors(playerForwardHorizontal, camera.up).normalize();

      const inputVertical = Number(keys.forward) - Number(keys.backward);
      const inputHorizontal = Number(keys.right) - Number(keys.left);
      inputDirection.set(0, 0, 0);
      inputDirection.addScaledVector(playerForwardHorizontal, inputVertical);
      inputDirection.addScaledVector(cameraRightHorizontal, inputHorizontal);

      const hasMovementInput = canControlWorld && inputDirection.lengthSq() > 0;
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

      if (canControlWorld && movementVelocity.lengthSq() > 0) {
        movementStep.copy(movementVelocity).multiplyScalar(delta);
        const isInterior = doorOpenRef.current;
        const onPhysicalStairs = !isLegacyWorld && isPositionOnBuildingStairs(playerPosition);
        const bounds =
          onPhysicalStairs || elevatorControlsPlayer
            ? activeMap.neighborhoodBounds
            : isInterior
              ? activeMap.interiorBounds
              : exteriorBounds;
        const baseColliders = onPhysicalStairs
          ? colliders.stairs
          : isInterior
            ? colliders.interior
            : colliders.exterior;
        const elevatorDoorsOpenForBoarding =
          !isLegacyWorld && elevatorPhase === 'boarding' && elevatorFloor === currentFloor;
        const roomColliders = elevatorDoorsOpenForBoarding
          ? baseColliders.filter((collider) => collider.tag !== 'elevator-door')
          : baseColliders;
        const cabinMovementColliders = !isLegacyWorld
          ? getBuildingElevatorMovementColliders(elevatorCabinColliders, elevatorPhase, currentFloor)
          : [];
        const activeColliders =
          cabinMovementColliders.length > 0 ? [...roomColliders, ...cabinMovementColliders] : roomColliders;
        const collisionResult = movePlayerWithCollisions(
          playerPosition,
          movementStep,
          bounds,
          activeColliders,
          PLAYER_RADIUS
        );
        if (collisionResult.blockedX) movementVelocity.x = 0;
        if (collisionResult.blockedZ) movementVelocity.z = 0;
      }

      const baseGroundHeight = !isLegacyWorld ? getBuildingGroundHeight(playerPosition, currentFloor) : 0;
      const floorEyeHeight = eyeHeight + baseGroundHeight;
      if (!elevatorControlsPlayer) {
        const onPhysicalStairs = !isLegacyWorld && isPositionOnBuildingStairs(playerPosition);
        if (onPhysicalStairs && isGrounded) {
          verticalVelocity = 0;
          playerPosition.y = floorEyeHeight;
        } else if (canControlWorld || !isGrounded) {
          verticalVelocity -= 16.5 * delta;
          playerPosition.y += verticalVelocity * delta;
          if (playerPosition.y <= floorEyeHeight || (isGrounded && playerPosition.y < floorEyeHeight)) {
            playerPosition.y = floorEyeHeight;
            verticalVelocity = 0;
            isGrounded = true;
          }
        }

        if (isGrounded && Math.abs(playerPosition.y - floorEyeHeight) > 0.001) {
          playerPosition.y += (floorEyeHeight - playerPosition.y) * (1 - Math.exp(-24 * delta));
        }
      } else {
        verticalVelocity = 0;
        isGrounded = true;
      }

      if (
        !isLegacyWorld &&
        !elevatorPassengerInside &&
        elevatorPhase !== 'traveling' &&
        isPositionOnBuildingStairs(playerPosition)
      ) {
        if (baseGroundHeight >= -0.08 && currentFloor !== 'study') {
          setActiveFloor('study');
        } else if (baseGroundHeight <= BUILDING_LOBBY_OFFSET.y + 0.08 && currentFloor !== 'lobby') {
          setActiveFloor('lobby');
        }
      }

      if (
        doorOpenRef.current &&
        elevatorPhase !== 'traveling' &&
        frameTime - lastCssContentSyncTime >= CSS_CONTENT_SYNC_INTERVAL_MS
      ) {
        lastCssContentSyncTime = frameTime;
        updateGiantScreen(giantScreen, screenZonesRef.current, screenLayoutRef.current);
        updateCssGiantScreenContent(cssGiantScreen, screenZonesRef.current, screenLayoutRef.current);
        updateCssAgendaContent(cssComputerMonitorOccluder, agendaItemsRef.current, 3);
        updateCssAgendaContent(cssAgendaBoard, agendaItemsRef.current, 4);
      }
      const companionHiddenForTransit =
        !isLegacyWorld &&
        (elevatorPassengerInside || isPositionOnBuildingStairs(playerPosition));
      companionMascot.group.visible = !companionHiddenForTransit;
      if (!companionHiddenForTransit) {
        updateCompanionDachshund(
          companionMascot,
          playerViewProxy,
          delta,
          doorOpenRef.current,
          focusProgressRef.current,
          doorOpenRef.current ? activeMap.interiorBounds : exteriorBounds
        );
      }
      updateFirstPersonArmViewModel(firstPersonArm, delta, hasMovementInput, frameTime);
      updateCameraForViewMode(
        camera,
        playerPosition,
        yaw,
        pitch,
        cameraMode,
        elevatorControlsPlayer
          ? activeMap.neighborhoodBounds
          : doorOpenRef.current
            ? activeMap.interiorBounds
            : exteriorBounds,
        delta,
        cameraModeForward,
        cameraDesiredPosition,
        cameraLookTarget
      );
      const elevatorIsTraveling = !isLegacyWorld && elevatorPhase === 'traveling';
      const buildingInStairTransition = !isLegacyWorld && isPositionOnBuildingStairs(playerPosition);
      giantScreen.room.visible = isLegacyWorld
        ? doorOpenRef.current
        : !elevatorIsTraveling && (currentFloor === 'study' || buildingInStairTransition);
      exteriorGroup.visible = isLegacyWorld
        ? !doorOpenRef.current
        : !elevatorIsTraveling && (currentFloor === 'lobby' || buildingInStairTransition);
      if (!elevatorIsTraveling) {
        updateRoomShopInScene(scene, camera, frameTime);
        updateRoomSpeakerInScene(scene, camera);
        updateInteractionTargeting(scene, camera);
      }
      const showPhysicalScreenContent =
        doorOpenRef.current &&
        screenContentEnabledRef.current &&
        (isLegacyWorld || !isPositionInBuildingVerticalTransition(playerPosition));
      cssGiantScreen.visible = showPhysicalScreenContent;
      cssComputerMonitorOccluder.visible = showPhysicalScreenContent;
      cssAgendaBoard.visible = showPhysicalScreenContent;
      cssRenderer.domElement.style.visibility = showPhysicalScreenContent ? 'visible' : 'hidden';

      const nearDoor = isLegacyWorld
        ? doorOpenRef.current
          ? playerPosition.distanceTo(Casa1.interiorExitPosition) < 4.5
          : playerPosition.distanceTo(Casa1.entrancePosition) < 5
        : false;
      if (nearDoor !== nearDoorRef.current) {
        nearDoorRef.current = nearDoor;
        onNearDoorChange(nearDoor);
      }

      const passengerWasInside = elevatorPassengerInside;
      let passengerIsInside = elevatorPassengerInside;
      if (isLegacyWorld || !ELEVATOR_PASSENGER_PHASES.includes(elevatorPhase)) {
        passengerIsInside = false;
      } else if (elevatorPhase === 'traveling') {
        passengerIsInside = true;
      } else if (!elevatorPassengerInside) {
        passengerIsInside = isPositionInsideBuildingElevator(playerPosition);
      } else if (hasPlayerClearedBuildingElevator(playerPosition, currentFloor)) {
        passengerIsInside = false;
      }
      if (passengerIsInside !== elevatorPassengerInside) {
        elevatorPassengerInside = passengerIsInside;
        onElevatorSessionChange(elevatorPassengerInside);
        if (elevatorPassengerInside) {
          elevatorHasBoarded = true;
        } else if (passengerWasInside && elevatorPhase === 'boarding' && elevatorHasBoarded) {
          beginElevatorClosing();
        }
      }

      const elevatorDoorPosition =
        currentFloor === 'study' ? activeMap.studyElevatorPosition : activeMap.lobbyElevatorPosition;
      elevatorDirection.copy(elevatorDoorPosition).sub(playerPosition);
      elevatorDirection.y = 0;
      const elevatorDistance = elevatorDirection.length();
      const isFacingElevator =
        elevatorDistance > 0.001 &&
        elevatorDirection.normalize().dot(playerForwardHorizontal) >= 0.42;
      const aimedElevatorControl = getAimedElevatorControlAction();
      const hasCrossedElevatorDoor =
        currentFloor === 'study'
          ? playerPosition.z >= BUILDING_STUDY_ELEVATOR_DOOR_Z
          : playerPosition.z <= BUILDING_LOBBY_ELEVATOR_DOOR_Z;
      const canBoardElevator =
        elevatorPhase === 'boarding' &&
        !elevatorPassengerInside &&
        elevatorDistance < ELEVATOR_BOARDING_GUIDE_DISTANCE &&
        (isFacingElevator || hasCrossedElevatorDoor);
      const canCallElevator =
        elevatorPhase === 'idle' &&
        aimedElevatorControl === 'call';
      const canCloseElevator =
        elevatorPhase === 'boarding' &&
        elevatorPassengerInside &&
        aimedElevatorControl === 'close';
      const selectedFloorAction =
        elevatorPhase === 'ready' && elevatorPassengerInside && aimedElevatorControl?.startsWith('floor-')
          ? aimedElevatorControl
          : null;
      const isElevatorStatusVisible =
        elevatorDistance < ELEVATOR_INTERACTION_DISTANCE &&
        ['calling', 'opening', 'closing-inside', 'traveling'].includes(elevatorPhase);
      const nearElevator =
        !isLegacyWorld &&
        (canBoardElevator || canCallElevator || canCloseElevator || selectedFloorAction || isElevatorStatusVisible);
      if (nearElevator !== nearElevatorRef.current) {
        nearElevatorRef.current = nearElevator;
        onNearElevatorChange(nearElevator);
      }
      if (!isLegacyWorld) {
        if (canCloseElevator) publishElevatorAction('close');
        else if (selectedFloorAction === `floor-${currentFloor}`) publishElevatorAction('current-floor');
        else if (selectedFloorAction) publishElevatorAction(selectedFloorAction);
        else if (canBoardElevator) publishElevatorAction('board');
        else if (canCallElevator) publishElevatorAction('call');
        else if (elevatorPhase === 'calling' && isElevatorStatusVisible) publishElevatorAction('waiting');
        else if (elevatorPhase === 'opening' && isElevatorStatusVisible) publishElevatorAction('opening');
        else if (elevatorPhase === 'closing-inside' && isElevatorStatusVisible) publishElevatorAction('closing');
        else if (elevatorPhase === 'traveling') publishElevatorAction('traveling');
        else publishElevatorAction(null);
      }

      const elevatorFeedbackInterval =
        elevatorPhase === 'traveling' ? ELEVATOR_FEEDBACK_INTERVAL_MS * 2 : ELEVATOR_FEEDBACK_INTERVAL_MS;
      if (frameTime - lastElevatorFeedbackTime >= elevatorFeedbackInterval) {
        lastElevatorFeedbackTime = frameTime;
        updateElevatorControlFeedback(scene, elevatorCabin, publishedElevatorAction, elevatorPhase, currentFloor, frameTime);
      }

      const nearComputer = doorOpenRef.current && playerPosition.distanceTo(computerPosition) < 7;
      if (nearComputer !== nearComputerRef.current) {
        nearComputerRef.current = nearComputer;
        onNearComputerChange(nearComputer);
      }

      const aimingAtAgendaBoard =
        canControlWorld && isPlayerAimingAtAgendaBoard(playerPosition, doorOpenRef.current, playerForwardHorizontal);
      if (aimingAtAgendaBoard !== agendaBoardAimRef.current) {
        agendaBoardAimRef.current = aimingAtAgendaBoard;
        onAgendaBoardAimChange(aimingAtAgendaBoard);
      }

      const aimingAtScreen =
        canControlWorld && isPlayerAimingAtGiantScreen(playerPosition, doorOpenRef.current, playerForwardHorizontal);
      if (aimingAtScreen !== screenAimRef.current) {
        screenAimRef.current = aimingAtScreen;
        onScreenAimChange(aimingAtScreen);
      }

      mount.dataset.currentFloor = currentFloor;
      mount.dataset.elevatorPhase = elevatorPhase;
      mount.dataset.elevatorFloor = elevatorFloor;
      mount.dataset.elevatorPassenger = elevatorPassengerInside ? 'inside' : 'outside';
      mount.dataset.playerPosition = [playerPosition.x, playerPosition.y, playerPosition.z]
        .map((value) => value.toFixed(2))
        .join(',');

      if (scene.userData.architectureShadowDirty) {
        renderer.shadowMap.needsUpdate = true;
        scene.userData.architectureShadowDirty = false;
      }
      renderer.render(scene, camera);
      if (showPhysicalScreenContent) {
        cssRenderer.render(cssScene, camera);
      }
      frameId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      timer.dispose();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      document.removeEventListener('pointerlockerror', onPointerLockError);
      window.removeEventListener('blur', resetInputState);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      mount.removeEventListener('mouseleave', resetFreeMouseLook);
      mount.removeEventListener('click', requestCameraLock);
      environmentRenderTarget.dispose();
      renderer.dispose();
      onAgendaBoardAimChange(false);
      onNearElevatorChange(false);
      onElevatorActionChange(null);
      onElevatorSessionChange(false);
      onScreenAimChange(false);
      if (travelToFloorRef) travelToFloorRef.current = () => {};
      if (elevatorActionRef) elevatorActionRef.current = () => {};
      mount.removeChild(cssRenderer.domElement);
      mount.removeChild(renderer.domElement);
    };
  }, [
    initialInside,
    onAgendaBoardAimChange,
    onDoorOpenChange,
    onFloorChange,
    onElevatorActionChange,
    onNearComputerChange,
    onNearDoorChange,
    onNearElevatorChange,
    onElevatorSessionChange,
    onScreenAimChange,
    resetRef,
    toggleDoorRef,
    travelToFloorRef,
    elevatorActionRef
  ]);

  return <section className="three-world" ref={mountRef} aria-label="Mundo 3D en primera persona" />;
}

function getRequestedWorldMode() {
  if (typeof window === 'undefined') return BUILDING_WORLD_MODE;
  const queryMode = new URLSearchParams(window.location.search).get(WORLD_MODE_QUERY_KEY);
  return queryMode === LEGACY_WORLD_MODE ? LEGACY_WORLD_MODE : BUILDING_WORLD_MODE;
}

function getRequestedInitialFloor() {
  if (typeof window === 'undefined') return 'lobby';
  return new URLSearchParams(window.location.search).get('floor') === 'study' ? 'study' : 'lobby';
}

function hasRequestedBuildingSpawn() {
  if (typeof window === 'undefined') return false;
  const searchParams = new URLSearchParams(window.location.search);
  return (
    ['elevator', 'stairs', 'shop'].includes(searchParams.get('spawn')) ||
    Boolean(BUILDING_VISUAL_AUDIT_VIEWS[searchParams.get('audit')])
  );
}

function getRequestedBuildingAuditView(requestedFloor) {
  if (typeof window === 'undefined') return null;
  const auditView = BUILDING_VISUAL_AUDIT_VIEWS[new URLSearchParams(window.location.search).get('audit')];
  return auditView?.floor === requestedFloor ? auditView : null;
}

function getRequestedBuildingStartPosition(requestedFloor = 'lobby') {
  if (typeof window === 'undefined') return activeMap.startPosition.clone();
  const auditView = getRequestedBuildingAuditView(requestedFloor);
  if (auditView) return new THREE.Vector3(...auditView.position);
  const spawn = new URLSearchParams(window.location.search).get('spawn');
  if (spawn === 'elevator') {
    return (requestedFloor === 'study' ? activeMap.studyElevatorArrival : activeMap.lobbyElevatorArrival).clone();
  }
  if (spawn === 'stairs') {
    return (requestedFloor === 'study' ? activeMap.studyStairsArrival : activeMap.lobbyStairsArrival).clone();
  }
  if (spawn === 'shop') {
    return new THREE.Vector3(87.3, activeMap.startPosition.y, BUILDING_LOBBY_SHOP_WORLD_Z + 4.7);
  }
  if (requestedFloor === 'study') return activeMap.interiorSpawnPosition.clone();
  return activeMap.startPosition.clone();
}

function getRequestedBuildingStartLookTarget(requestedFloor = 'lobby') {
  if (typeof window === 'undefined') return activeMap.startLookAt.clone();
  const auditView = getRequestedBuildingAuditView(requestedFloor);
  if (auditView) return new THREE.Vector3(...auditView.lookAt);
  const spawn = new URLSearchParams(window.location.search).get('spawn');
  if (spawn === 'stairs') return new THREE.Vector3(73.5, 0.7, 25.1);
  if (spawn === 'elevator') {
    return (
      requestedFloor === 'study'
        ? activeMap.studyElevatorPosition
        : activeMap.lobbyElevatorPosition
    ).clone();
  }
  if (spawn === 'shop') return new THREE.Vector3(87.3, -8.2, BUILDING_LOBBY_SHOP_WORLD_Z);
  return activeMap.startLookAt.clone();
}

function isPositionInsideBuildingElevator(position) {
  return (
    position.x >= ELEVATOR_CABIN_SAFE_MIN_X &&
    position.x <= ELEVATOR_CABIN_SAFE_MAX_X &&
    position.z >= ELEVATOR_CABIN_SAFE_MIN_Z &&
    position.z <= ELEVATOR_CABIN_SAFE_MAX_Z
  );
}

function hasPlayerClearedBuildingElevator(position, floor) {
  const clearance = PLAYER_RADIUS + 0.58;
  return floor === 'study'
    ? position.z <= BUILDING_STUDY_ELEVATOR_DOOR_Z - clearance
    : position.z >= BUILDING_LOBBY_ELEVATOR_DOOR_Z + clearance;
}

function isPositionInBuildingElevatorVestibule(position) {
  return (
    position.x >= BUILDING_ELEVATOR_X - ELEVATOR_CABIN_HALF_WIDTH - 1.2 &&
    position.x <= BUILDING_ELEVATOR_X + ELEVATOR_CABIN_HALF_WIDTH + 1.2 &&
    position.z >= BUILDING_STUDY_ELEVATOR_DOOR_Z - 5.5 &&
    position.z <= BUILDING_LOBBY_ELEVATOR_DOOR_Z + 1.2
  );
}

function isPositionInBuildingStairTransition(position) {
  return (
    position.x >= BUILDING_STAIR_WORLD_MIN_X - 0.45 &&
    position.x <= BUILDING_STAIR_WORLD_MAX_X + 0.45 &&
    position.z >= BUILDING_STAIR_WORLD_MIN_Z - 0.1 &&
    position.z <= BUILDING_STAIR_WORLD_MAX_Z + 1
  );
}

function isPositionInBuildingVerticalTransition(position) {
  return (
    isPositionInBuildingElevatorVestibule(position) ||
    isPositionInBuildingStairTransition(position)
  );
}

function isPositionOnBuildingStairs(position) {
  return (
    position.x >= BUILDING_STAIR_SAFE_MIN_X &&
    position.x <= BUILDING_STAIR_SAFE_MAX_X &&
    position.z >= BUILDING_STAIR_WORLD_MIN_Z - BUILDING_STAIR_APPROACH_PADDING &&
    position.z <= BUILDING_STAIR_WORLD_MAX_Z + BUILDING_STAIR_APPROACH_PADDING
  );
}

function getBuildingGroundHeight(position, currentFloor) {
  if (
    position.x < BUILDING_STAIR_SAFE_MIN_X ||
    position.x > BUILDING_STAIR_SAFE_MAX_X ||
    position.z < BUILDING_STAIR_WORLD_MIN_Z - BUILDING_STAIR_APPROACH_PADDING ||
    position.z > BUILDING_STAIR_WORLD_MAX_Z + BUILDING_STAIR_APPROACH_PADDING
  ) {
    return currentFloor === 'study' ? 0 : BUILDING_LOBBY_OFFSET.y;
  }

  if (position.z <= BUILDING_STAIR_WORLD_MIN_Z) return 0;
  if (position.z >= BUILDING_STAIR_WORLD_MAX_Z) return BUILDING_LOBBY_OFFSET.y;
  const progress =
    (BUILDING_STAIR_WORLD_MAX_Z - position.z) /
    (BUILDING_STAIR_WORLD_MAX_Z - BUILDING_STAIR_WORLD_MIN_Z);
  return BUILDING_LOBBY_OFFSET.y + clamp(progress, 0, 1) * BUILDING_STAIR_RISE;
}

function createViewModelMaterial(color) {
  return new THREE.MeshBasicMaterial({
    color,
    depthTest: false,
    depthWrite: false,
    fog: false
  });
}

function getImageAssetTexture(url) {
  const cacheKey = `asset-texture:${url}`;
  if (textureCache.has(cacheKey)) return textureCache.get(cacheKey);
  const texture = new THREE.TextureLoader().load(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  textureCache.set(cacheKey, texture);
  return texture;
}

function createImageAssetMaterial(
  url,
  { depthTest = true, depthWrite = false, alphaTest = 0.16, opacity = 1, side = THREE.DoubleSide } = {}
) {
  return new THREE.MeshBasicMaterial({
    map: getImageAssetTexture(url),
    transparent: true,
    alphaTest,
    opacity,
    depthTest,
    depthWrite,
    side,
    fog: false
  });
}

function addViewModelMesh(parent, geometry, material, position, scale = [1, 1, 1], rotation = [0, 0, 0], renderOrder = 10001) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.rotation.set(...rotation);
  mesh.renderOrder = renderOrder;
  parent.add(mesh);
  return mesh;
}

function createIllustratedFirstPersonArmViewModel() {
  const group = new THREE.Group();
  group.name = 'first-person-illustrated-study-hand-v3';
  group.renderOrder = 10000;

  const pivot = new THREE.Group();
  pivot.position.set(0.58, -0.52, -1.08);
  pivot.rotation.set(-0.06, -0.08, 0.02);
  group.add(pivot);

  const width = 1.34;
  const handPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(width, width / PLAYER_HAND_VIEWMODEL_ASPECT),
    createImageAssetMaterial(playerHandViewModelUrl, {
      depthTest: false,
      depthWrite: false,
      alphaTest: 0.18
    })
  );
  handPlane.name = 'illustrated-first-person-hand-plane';
  handPlane.position.set(0, 0, 0);
  handPlane.renderOrder = 10002;
  pivot.add(handPlane);

  return {
    group,
    pivot,
    handPlane,
    basePosition: pivot.position.clone(),
    baseRotation: pivot.rotation.clone(),
    swing: 0
  };
}

function createFirstPersonArmViewModel() {
  return createIllustratedFirstPersonArmViewModel();

  const group = new THREE.Group();
  group.name = 'first-person-professional-study-hand';
  group.renderOrder = 10000;
  group.scale.setScalar(0.86);

  const pivot = new THREE.Group();
  pivot.position.set(0.43, -0.61, -1.05);
  pivot.rotation.set(-0.64, -0.27, 0.14);
  group.add(pivot);

  const sleeveMaterial = createViewModelMaterial(0x1a3430);
  const sleeveShadowMaterial = createViewModelMaterial(0x0d1a18);
  const cuffMaterial = createViewModelMaterial(0xd9bd72);
  const cuffTrimMaterial = createViewModelMaterial(0x7f6a36);
  const gloveMaterial = createViewModelMaterial(0x0d1718);
  const glovePanelMaterial = createViewModelMaterial(0x243d37);
  const gloveHighlightMaterial = createViewModelMaterial(0x31574f);
  const seamMaterial = createViewModelMaterial(0x95b4a0);
  const skinMaterial = createViewModelMaterial(0xd99c6d);
  const skinShadowMaterial = createViewModelMaterial(0xa86e4b);
  const nailMaterial = createViewModelMaterial(0xf0c7a6);

  addViewModelMesh(
    pivot,
    new THREE.CapsuleGeometry(0.13, 0.58, 8, 14),
    sleeveMaterial,
    [0.006, 0.012, -0.19],
    [1.12, 0.84, 0.96],
    [Math.PI / 2, -0.02, 0.02],
    10001
  );
  addViewModelMesh(
    pivot,
    new THREE.CapsuleGeometry(0.112, 0.46, 6, 12),
    sleeveShadowMaterial,
    [-0.008, -0.058, -0.18],
    [0.92, 0.72, 0.88],
    [Math.PI / 2, -0.02, 0.08],
    10002
  );
  addViewModelMesh(pivot, new THREE.BoxGeometry(0.31, 0.05, 0.34), cuffTrimMaterial, [0, -0.074, -0.355], [1, 1, 1], [0.12, 0, 0.02], 10003);
  addViewModelMesh(pivot, new THREE.BoxGeometry(0.31, 0.18, 0.11), cuffMaterial, [0.003, 0.004, -0.427], [1, 1, 1], [0.03, 0, 0.01], 10004);
  addViewModelMesh(pivot, new THREE.BoxGeometry(0.25, 0.032, 0.022), seamMaterial, [0.006, 0.096, -0.43], [1, 1, 1], [0, 0, 0], 10005);

  addViewModelMesh(
    pivot,
    new THREE.SphereGeometry(0.165, 22, 14),
    skinMaterial,
    [0.01, -0.004, -0.565],
    [1.22, 0.72, 1.05],
    [0.08, 0, -0.03],
    10006
  );
  addViewModelMesh(
    pivot,
    new THREE.SphereGeometry(0.15, 18, 10),
    skinShadowMaterial,
    [0.008, -0.052, -0.552],
    [1.02, 0.32, 0.78],
    [0.08, 0, -0.03],
    10007
  );
  addViewModelMesh(pivot, new THREE.BoxGeometry(0.27, 0.075, 0.235), gloveMaterial, [0.006, 0.054, -0.565], [1, 1, 1], [0.08, 0, -0.025], 10008);
  addViewModelMesh(pivot, new THREE.BoxGeometry(0.15, 0.024, 0.16), glovePanelMaterial, [0.01, 0.103, -0.572], [1, 1, 1], [0.08, 0, -0.025], 10009);
  addViewModelMesh(pivot, new THREE.BoxGeometry(0.085, 0.018, 0.12), gloveHighlightMaterial, [0.09, 0.109, -0.565], [1, 1, 1], [0.08, 0, -0.08], 10010);
  addViewModelMesh(pivot, new THREE.BoxGeometry(0.21, 0.016, 0.032), seamMaterial, [0.002, 0.116, -0.666], [1, 1, 1], [0.08, 0, -0.025], 10011);

  const fingerSpecs = [
    { x: -0.092, z: -0.682, lengths: [0.085, 0.066, 0.052], radius: 0.024, tilt: -0.13, y: 0.003 },
    { x: -0.032, z: -0.704, lengths: [0.102, 0.081, 0.064], radius: 0.027, tilt: -0.045, y: 0.008 },
    { x: 0.029, z: -0.706, lengths: [0.1, 0.078, 0.061], radius: 0.026, tilt: 0.04, y: 0.006 },
    { x: 0.087, z: -0.686, lengths: [0.082, 0.062, 0.049], radius: 0.023, tilt: 0.13, y: -0.002 }
  ];

  fingerSpecs.forEach((finger, fingerIndex) => {
    let cursorZ = finger.z;
    finger.lengths.forEach((length, segmentIndex) => {
      const segmentY = finger.y - segmentIndex * 0.012;
      const segmentZ = cursorZ - length * 0.5 - segmentIndex * 0.012;
      addViewModelMesh(
        pivot,
        new THREE.CapsuleGeometry(finger.radius * (1 - segmentIndex * 0.09), length, 5, 10),
        skinMaterial,
        [finger.x + finger.tilt * segmentIndex * 0.012, segmentY, segmentZ],
        [1, 0.94, 1],
        [Math.PI / 2 + segmentIndex * 0.04, finger.tilt, 0],
        10012 + fingerIndex * 6 + segmentIndex
      );
      cursorZ -= length + 0.006;
    });

    addViewModelMesh(
      pivot,
      new THREE.BoxGeometry(finger.radius * 2.15, 0.024, 0.065),
      glovePanelMaterial,
      [finger.x, 0.063, finger.z + 0.048],
      [1, 1, 1],
      [0.08, finger.tilt, 0],
      10040 + fingerIndex
    );
    addViewModelMesh(
      pivot,
      new THREE.BoxGeometry(finger.radius * 1.5, 0.006, 0.022),
      nailMaterial,
      [finger.x + finger.tilt * 0.02, finger.y - 0.045, cursorZ + 0.028],
      [1, 1, 1],
      [0.08, finger.tilt, 0],
      10046 + fingerIndex
    );
  });

  addViewModelMesh(
    pivot,
    new THREE.CapsuleGeometry(0.037, 0.168, 6, 10),
    skinShadowMaterial,
    [-0.142, -0.028, -0.56],
    [1, 0.98, 1],
    [0.68, 0.18, 0.5],
    10052
  );
  addViewModelMesh(
    pivot,
    new THREE.CapsuleGeometry(0.031, 0.112, 6, 10),
    skinMaterial,
    [-0.158, -0.03, -0.632],
    [1, 0.9, 0.98],
    [0.86, 0.28, 0.55],
    10053
  );
  addViewModelMesh(pivot, new THREE.BoxGeometry(0.058, 0.028, 0.12), glovePanelMaterial, [-0.1, 0.047, -0.536], [1, 1, 1], [0.18, 0, 0.24], 10054);
  addViewModelMesh(pivot, new THREE.BoxGeometry(0.046, 0.012, 0.18), seamMaterial, [0.136, 0.064, -0.57], [1, 1, 1], [0.08, 0, -0.2], 10055);
  addViewModelMesh(pivot, new THREE.BoxGeometry(0.18, 0.014, 0.018), cuffTrimMaterial, [-0.008, -0.108, -0.43], [1, 1, 1], [0.02, 0, 0.02], 10056);

  return {
    group,
    pivot,
    basePosition: pivot.position.clone(),
    baseRotation: pivot.rotation.clone(),
    swing: 0
  };
}

function updateFirstPersonArmViewModel(viewModel, delta, isWalking, frameTime) {
  const bob = isWalking ? Math.sin(frameTime * 0.012) : Math.sin(frameTime * 0.004) * 0.18;
  viewModel.swing = Math.max(0, viewModel.swing - delta);
  const swingProgress = viewModel.swing > 0 ? 1 - viewModel.swing / FIRST_PERSON_ARM_SWING_SECONDS : 1;
  const punch = viewModel.swing > 0 ? Math.sin(swingProgress * Math.PI) : 0;

  viewModel.pivot.position.copy(viewModel.basePosition);
  viewModel.pivot.position.x += Math.sin(frameTime * 0.009) * (isWalking ? 0.018 : 0.004);
  viewModel.pivot.position.y += bob * (isWalking ? 0.02 : 0.007) - punch * 0.032;
  viewModel.pivot.position.z -= punch * 0.13;

  viewModel.pivot.rotation.copy(viewModel.baseRotation);
  viewModel.pivot.rotation.x -= punch * 0.28;
  viewModel.pivot.rotation.y += Math.sin(frameTime * 0.01) * (isWalking ? 0.024 : 0.008);
  viewModel.pivot.rotation.z += punch * 0.1;

  if (viewModel.handPlane) {
    const walkScale = isWalking ? Math.sin(frameTime * 0.012) * 0.012 : 0;
    viewModel.handPlane.scale.setScalar(1 + punch * 0.035 + walkScale);
    viewModel.handPlane.rotation.z = punch * 0.025 + Math.sin(frameTime * 0.004) * 0.006;
  }
}

function createIllustratedStudyPlayerAvatar() {
  const group = new THREE.Group();
  group.name = 'estudiemos-player-illustrated-skin-v3';
  group.visible = false;

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.58, 32),
    new THREE.MeshBasicMaterial({
      color: 0x050706,
      transparent: true,
      opacity: 0.22,
      depthWrite: false
    })
  );
  shadow.name = 'illustrated-player-contact-shadow';
  shadow.position.set(0, 0.035, 0);
  shadow.scale.set(1.06, 0.46, 1);
  shadow.rotation.x = -Math.PI / 2;
  group.add(shadow);

  const artGroup = new THREE.Group();
  artGroup.name = 'illustrated-player-art-rig';
  artGroup.position.y = 0.2;
  group.add(artGroup);

  const vehicleGroup = new THREE.Group();
  vehicleGroup.name = 'illustrated-player-hover-vehicle';
  vehicleGroup.position.y = 0.14;
  group.add(vehicleGroup);

  const avatarHeight = 2.36;
  const vehicleWidth = 1.74;
  const vehicleSideWidth = 1.64;
  const vehicleBackPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(vehicleWidth, vehicleWidth / PLAYER_VEHICLE_BACK_ASPECT),
    createImageAssetMaterial(playerVehicleBackUrl, {
      alphaTest: 0.18,
      depthTest: true,
      depthWrite: false,
      side: THREE.FrontSide
    })
  );
  vehicleBackPlane.name = 'illustrated-player-vehicle-back-sprite';
  vehicleBackPlane.position.set(0, vehicleWidth / PLAYER_VEHICLE_BACK_ASPECT / 2, 0.14);
  vehicleBackPlane.renderOrder = 20;
  vehicleGroup.add(vehicleBackPlane);

  const vehicleFrontPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(vehicleWidth, vehicleWidth / PLAYER_VEHICLE_FRONT_ASPECT),
    createImageAssetMaterial(playerVehicleFrontUrl, {
      alphaTest: 0.18,
      depthTest: true,
      depthWrite: false,
      side: THREE.FrontSide
    })
  );
  vehicleFrontPlane.name = 'illustrated-player-vehicle-front-sprite';
  vehicleFrontPlane.position.set(0, vehicleWidth / PLAYER_VEHICLE_FRONT_ASPECT / 2, -0.14);
  vehicleFrontPlane.rotation.y = Math.PI;
  vehicleFrontPlane.renderOrder = 20;
  vehicleGroup.add(vehicleFrontPlane);

  const vehicleSidePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(vehicleSideWidth, vehicleSideWidth / PLAYER_VEHICLE_SIDE_ASPECT),
    createImageAssetMaterial(playerVehicleSideUrl, {
      alphaTest: 0.18,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  vehicleSidePlane.name = 'illustrated-player-vehicle-side-sprite';
  vehicleSidePlane.position.set(0, vehicleSideWidth / PLAYER_VEHICLE_SIDE_ASPECT / 2 + 0.02, 0);
  vehicleSidePlane.rotation.y = Math.PI / 2;
  vehicleSidePlane.renderOrder = 19;
  vehicleGroup.add(vehicleSidePlane);

  const frontPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(avatarHeight * PLAYER_AVATAR_FRONT_ASPECT, avatarHeight),
    createImageAssetMaterial(playerAvatarFrontUrl, {
      alphaTest: 0.2,
      depthTest: true,
      depthWrite: false,
      side: THREE.FrontSide
    })
  );
  frontPlane.name = 'illustrated-player-front-sprite';
  frontPlane.position.set(0, avatarHeight * 0.5, -0.09);
  frontPlane.rotation.y = Math.PI;
  frontPlane.renderOrder = 18;
  artGroup.add(frontPlane);

  const backPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(avatarHeight * PLAYER_AVATAR_BACK_ASPECT, avatarHeight),
    createImageAssetMaterial(playerAvatarBackUrl, {
      alphaTest: 0.2,
      depthTest: true,
      depthWrite: false,
      side: THREE.FrontSide
    })
  );
  backPlane.name = 'illustrated-player-back-sprite';
  backPlane.position.set(0, avatarHeight * 0.5, 0.09);
  backPlane.renderOrder = 18;
  artGroup.add(backPlane);

  const sidePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(avatarHeight * PLAYER_AVATAR_SIDE_ASPECT, avatarHeight),
    createImageAssetMaterial(playerAvatarSideUrl, {
      alphaTest: 0.2,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  sidePlane.name = 'illustrated-player-side-sprite';
  sidePlane.position.set(0, avatarHeight * 0.5, 0);
  sidePlane.rotation.y = Math.PI / 2;
  sidePlane.renderOrder = 17;
  artGroup.add(sidePlane);

  return {
    kind: 'illustrated-avatar',
    group,
    artGroup,
    vehicleGroup,
    frontPlane,
    backPlane,
    sidePlane,
    vehicleFrontPlane,
    vehicleBackPlane,
    vehicleSidePlane,
    shadow,
    baseArtPosition: artGroup.position.clone(),
    baseArtRotation: artGroup.rotation.clone(),
    baseVehiclePosition: vehicleGroup.position.clone(),
    baseVehicleRotation: vehicleGroup.rotation.clone(),
    baseShadowScale: shadow.scale.clone()
  };
}

function createStudyPlayerAvatar() {
  return createIllustratedStudyPlayerAvatar();

  const group = new THREE.Group();
  group.name = 'estudiemos-player-avatar-skin-v2';
  group.visible = false;

  const materials = {
    shadow: new THREE.MeshBasicMaterial({ color: 0x050706, transparent: true, opacity: 0.22, depthWrite: false }),
    sole: makeMaterial(0x080d0e, 0.58, 0.03),
    sneaker: makeMaterial(0x18282a, 0.48, 0.04),
    sneakerTrim: makeMaterial(0xe0c47a, 0.42, 0.02),
    pants: makeMaterial(0x273d47, 0.54, 0.02),
    pantsPanel: makeMaterial(0x35515e, 0.48, 0.02),
    hoodie: makeMaterial(0x1b3732, 0.5, 0.03),
    hoodieDark: makeMaterial(0x0f2421, 0.56, 0.02),
    hoodieAccent: makeMaterial(0xe0c47a, 0.38, 0.02),
    zipper: makeMaterial(0xb9d7df, 0.34, 0.08),
    skin: makeMaterial(0xd99c6d, 0.58, 0.01),
    skinShade: makeMaterial(0xb97955, 0.6, 0.01),
    hair: makeMaterial(0x21170f, 0.5, 0.02),
    eye: makeMaterial(0x071011, 0.34, 0.02),
    mouth: makeMaterial(0x7b3c36, 0.54, 0.01),
    headphones: makeMaterial(0x0f1718, 0.34, 0.08),
    glow: makeEmissiveMaterial(0x8ed7d2, 0.44),
    backpack: makeMaterial(0x162625, 0.52, 0.04),
    strap: makeMaterial(0x0e1d1b, 0.56, 0.03),
    glove: makeMaterial(0x101718, 0.54, 0.03)
  };

  const shadow = addAvatarMesh(
    group,
    new THREE.CircleGeometry(0.78, 24),
    materials.shadow,
    [0, 0.035, 0],
    [1.08, 0.52, 1],
    [-Math.PI / 2, 0, 0]
  );
  shadow.renderOrder = -1;

  const bodyGroup = new THREE.Group();
  bodyGroup.name = 'avatar-body-rig';
  group.add(bodyGroup);

  const hipsGroup = new THREE.Group();
  hipsGroup.name = 'avatar-hips';
  hipsGroup.position.set(0, 0.82, 0);
  bodyGroup.add(hipsGroup);
  const hips = addAvatarMesh(hipsGroup, new THREE.CapsuleGeometry(0.23, 0.25, 6, 12), materials.pants, [0, 0, 0], [1.24, 0.86, 0.84], [0, 0, Math.PI / 2]);
  const belt = addAvatarMesh(hipsGroup, new THREE.BoxGeometry(0.58, 0.055, 0.36), materials.hoodieDark, [0, 0.16, -0.01], [1, 1, 1]);
  const beltBuckle = addAvatarMesh(hipsGroup, new THREE.BoxGeometry(0.12, 0.063, 0.02), materials.hoodieAccent, [0, 0.17, -0.19], [1, 1, 1]);

  const torsoGroup = new THREE.Group();
  torsoGroup.name = 'avatar-torso';
  torsoGroup.position.set(0, 1.22, 0);
  bodyGroup.add(torsoGroup);
  const torso = addAvatarMesh(
    torsoGroup,
    new THREE.CapsuleGeometry(0.33, 0.6, 8, 16),
    materials.hoodie,
    [0, 0, 0],
    [0.95, 1, 0.78]
  );
  const shoulderLine = addAvatarMesh(torsoGroup, new THREE.CapsuleGeometry(0.065, 0.74, 6, 12), materials.hoodieDark, [0, 0.29, -0.01], [1, 1, 0.8], [0, 0, Math.PI / 2]);
  const chestPanel = addAvatarMesh(torsoGroup, new THREE.BoxGeometry(0.42, 0.34, 0.044), materials.hoodieAccent, [0, 0.05, -0.27], [1, 1, 1]);
  const chestInset = addAvatarMesh(torsoGroup, new THREE.BoxGeometry(0.32, 0.22, 0.048), materials.hoodie, [0, 0.04, -0.296], [1, 1, 1]);
  const pocket = addAvatarMesh(torsoGroup, new THREE.BoxGeometry(0.32, 0.12, 0.052), materials.hoodieDark, [0, -0.18, -0.3], [1, 1, 1]);
  const zipper = addAvatarMesh(torsoGroup, new THREE.BoxGeometry(0.022, 0.47, 0.056), materials.zipper, [0, 0.09, -0.32], [1, 1, 1]);
  const badge = addAvatarMesh(torsoGroup, new THREE.CylinderGeometry(0.064, 0.064, 0.018, 18), materials.glow, [0.17, 0.18, -0.334], [1, 1, 1], [Math.PI / 2, 0, 0]);
  const hoodieCollar = addAvatarMesh(torsoGroup, new THREE.TorusGeometry(0.22, 0.038, 8, 24), materials.hoodieDark, [0, 0.42, -0.02], [1.08, 0.72, 0.78], [Math.PI / 2, 0, 0]);
  const leftString = addAvatarMesh(torsoGroup, new THREE.CylinderGeometry(0.011, 0.011, 0.31, 8), materials.zipper, [-0.095, 0.19, -0.335], [1, 1, 1], [0.08, 0.02, 0.02]);
  const rightString = addAvatarMesh(torsoGroup, new THREE.CylinderGeometry(0.011, 0.011, 0.31, 8), materials.zipper, [0.095, 0.19, -0.335], [1, 1, 1], [0.08, -0.02, -0.02]);
  const leftStringTip = addAvatarMesh(torsoGroup, new THREE.SphereGeometry(0.022, 8, 6), materials.hoodieAccent, [-0.11, 0.03, -0.34], [1, 1, 1]);
  const rightStringTip = addAvatarMesh(torsoGroup, new THREE.SphereGeometry(0.022, 8, 6), materials.hoodieAccent, [0.11, 0.03, -0.34], [1, 1, 1]);

  const backpackGroup = new THREE.Group();
  backpackGroup.name = 'avatar-backpack';
  backpackGroup.position.set(0, -0.01, 0.38);
  torsoGroup.add(backpackGroup);
  const backpack = addAvatarMesh(backpackGroup, new THREE.BoxGeometry(0.48, 0.62, 0.18), materials.backpack, [0, 0, 0], [1, 1, 1]);
  const backpackCap = addAvatarMesh(backpackGroup, new THREE.BoxGeometry(0.42, 0.09, 0.19), materials.hoodieAccent, [0, 0.23, 0.012], [1, 1, 1]);
  const backpackStripe = addAvatarMesh(backpackGroup, new THREE.BoxGeometry(0.31, 0.045, 0.025), materials.glow, [0, 0.08, -0.102], [1, 1, 1]);
  const leftStrap = addAvatarMesh(torsoGroup, new THREE.BoxGeometry(0.052, 0.58, 0.032), materials.strap, [-0.25, 0.05, -0.16], [1, 1, 1], [0, 0, -0.07]);
  const rightStrap = addAvatarMesh(torsoGroup, new THREE.BoxGeometry(0.052, 0.58, 0.032), materials.strap, [0.25, 0.05, -0.16], [1, 1, 1], [0, 0, 0.07]);

  const neck = addAvatarMesh(bodyGroup, new THREE.CylinderGeometry(0.105, 0.12, 0.18, 14), materials.skinShade, [0, 1.58, 0], [1, 1, 1]);
  const headGroup = new THREE.Group();
  headGroup.name = 'avatar-head';
  headGroup.position.set(0, 1.77, -0.01);
  bodyGroup.add(headGroup);
  const head = addAvatarMesh(headGroup, new THREE.SphereGeometry(0.245, 22, 14), materials.skin, [0, 0, 0], [0.94, 1.06, 0.88]);
  const hair = addAvatarMesh(headGroup, new THREE.SphereGeometry(0.252, 22, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), materials.hair, [0, 0.125, -0.01], [1.02, 0.58, 0.92]);
  const fringe = addAvatarMesh(headGroup, new THREE.SphereGeometry(0.09, 12, 8), materials.hair, [-0.085, 0.12, -0.18], [1.25, 0.6, 0.72], [-0.14, 0.16, -0.28]);
  const nose = addAvatarMesh(headGroup, new THREE.SphereGeometry(0.032, 10, 6), materials.skinShade, [0, -0.015, -0.22], [0.78, 1, 0.72]);
  const leftEye = addAvatarMesh(headGroup, new THREE.SphereGeometry(0.022, 8, 6), materials.eye, [-0.075, 0.05, -0.214], [1, 0.7, 0.45]);
  const rightEye = addAvatarMesh(headGroup, new THREE.SphereGeometry(0.022, 8, 6), materials.eye, [0.075, 0.05, -0.214], [1, 0.7, 0.45]);
  const mouth = addAvatarMesh(headGroup, new THREE.BoxGeometry(0.08, 0.012, 0.01), materials.mouth, [0, -0.085, -0.221], [1, 1, 1]);
  const leftHeadphone = addAvatarMesh(headGroup, new THREE.BoxGeometry(0.075, 0.22, 0.13), materials.headphones, [-0.245, 0.0, 0], [1, 1, 1]);
  const rightHeadphone = addAvatarMesh(headGroup, new THREE.BoxGeometry(0.075, 0.22, 0.13), materials.headphones, [0.245, 0.0, 0], [1, 1, 1]);
  const band = addAvatarMesh(headGroup, new THREE.TorusGeometry(0.235, 0.015, 6, 24, Math.PI), materials.headphones, [0, 0.035, 0], [1, 1, 0.74], [0, Math.PI / 2, 0]);

  function createArm(side) {
    const armGroup = new THREE.Group();
    armGroup.name = side < 0 ? 'avatar-left-arm' : 'avatar-right-arm';
    armGroup.position.set(side * 0.4, 1.39, -0.01);
    bodyGroup.add(armGroup);
    const shoulder = addAvatarMesh(armGroup, new THREE.SphereGeometry(0.09, 12, 8), materials.hoodieDark, [0, 0, 0], [1.1, 0.9, 0.9]);
    const upper = addAvatarMesh(armGroup, new THREE.CapsuleGeometry(0.065, 0.34, 6, 10), materials.hoodie, [side * 0.03, -0.18, -0.015], [1, 1, 0.92], [0.05, 0, side * 0.12]);
    const elbow = addAvatarMesh(armGroup, new THREE.SphereGeometry(0.07, 10, 8), materials.hoodieDark, [side * 0.055, -0.39, -0.02], [1, 0.9, 0.9]);
    const forearm = addAvatarMesh(armGroup, new THREE.CapsuleGeometry(0.058, 0.3, 6, 10), materials.hoodie, [side * 0.07, -0.56, -0.025], [0.92, 1, 0.86], [-0.02, 0, side * 0.08]);
    const cuff = addAvatarMesh(armGroup, new THREE.BoxGeometry(0.14, 0.055, 0.115), materials.hoodieAccent, [side * 0.082, -0.735, -0.03], [1, 1, 1], [0, 0, side * 0.05]);
    const handGroup = new THREE.Group();
    handGroup.name = side < 0 ? 'avatar-left-hand' : 'avatar-right-hand';
    handGroup.position.set(side * 0.085, -0.81, -0.035);
    armGroup.add(handGroup);
    const palm = addAvatarMesh(handGroup, new THREE.SphereGeometry(0.07, 12, 8), materials.skin, [0, 0, 0], [1.08, 0.92, 0.8]);
    const glove = addAvatarMesh(handGroup, new THREE.BoxGeometry(0.11, 0.04, 0.085), materials.glove, [0, 0.035, -0.006], [1, 1, 1]);
    const thumb = addAvatarMesh(handGroup, new THREE.CapsuleGeometry(0.018, 0.07, 5, 8), materials.skinShade, [side * 0.058, -0.005, -0.032], [1, 1, 1], [0.4, 0.15, side * 0.72]);
    [-0.031, 0, 0.031].forEach((offset, index) => {
      addAvatarMesh(
        handGroup,
        new THREE.CapsuleGeometry(0.013, 0.062 - index * 0.004, 4, 7),
        materials.skin,
        [offset, -0.054, -0.012],
        [1, 1, 0.9],
        [0.12, 0, 0]
      );
    });
    return {
      group: armGroup,
      handGroup,
      basePosition: armGroup.position.clone(),
      baseRotation: armGroup.rotation.clone(),
      parts: [shoulder, upper, elbow, forearm, cuff, palm, glove, thumb]
    };
  }

  function createLeg(side) {
    const legGroup = new THREE.Group();
    legGroup.name = side < 0 ? 'avatar-left-leg' : 'avatar-right-leg';
    legGroup.position.set(side * 0.15, 0.76, 0);
    bodyGroup.add(legGroup);
    const thigh = addAvatarMesh(legGroup, new THREE.CapsuleGeometry(0.09, 0.34, 6, 10), materials.pants, [0, -0.18, 0], [1, 1, 0.9]);
    const kneePad = addAvatarMesh(legGroup, new THREE.BoxGeometry(0.14, 0.09, 0.035), materials.pantsPanel, [0, -0.38, -0.08], [1, 1, 1]);
    const shin = addAvatarMesh(legGroup, new THREE.CapsuleGeometry(0.08, 0.32, 6, 10), materials.pants, [0, -0.56, -0.01], [0.92, 1, 0.88]);
    const shoeGroup = new THREE.Group();
    shoeGroup.name = side < 0 ? 'avatar-left-shoe' : 'avatar-right-shoe';
    shoeGroup.position.set(0, -0.82, -0.055);
    legGroup.add(shoeGroup);
    const shoe = addAvatarMesh(shoeGroup, new THREE.BoxGeometry(0.22, 0.095, 0.36), materials.sneaker, [0, 0, 0], [1, 1, 1]);
    const toe = addAvatarMesh(shoeGroup, new THREE.SphereGeometry(0.088, 12, 6), materials.sneaker, [0, 0.004, -0.18], [1.22, 0.52, 0.64]);
    const sole = addAvatarMesh(shoeGroup, new THREE.BoxGeometry(0.24, 0.035, 0.38), materials.sole, [0, -0.06, 0.002], [1, 1, 1]);
    const lace = addAvatarMesh(shoeGroup, new THREE.BoxGeometry(0.12, 0.011, 0.018), materials.sneakerTrim, [0, 0.058, -0.045], [1, 1, 1]);
    return {
      group: legGroup,
      shoeGroup,
      basePosition: legGroup.position.clone(),
      baseRotation: legGroup.rotation.clone(),
      shoeBasePosition: shoeGroup.position.clone(),
      parts: [thigh, kneePad, shin, shoe, toe, sole, lace]
    };
  }

  const leftArmRig = createArm(-1);
  const rightArmRig = createArm(1);
  const leftLegRig = createLeg(-1);
  const rightLegRig = createLeg(1);

  [
    bodyGroup,
    hipsGroup,
    torsoGroup,
    headGroup,
    torso,
    hips,
    belt,
    beltBuckle,
    shoulderLine,
    chestPanel,
    chestInset,
    pocket,
    zipper,
    badge,
    hoodieCollar,
    leftString,
    rightString,
    leftStringTip,
    rightStringTip,
    head,
    hair,
    fringe,
    nose,
    leftEye,
    rightEye,
    mouth,
    neck,
    leftHeadphone,
    rightHeadphone,
    band,
    backpack,
    backpackCap,
    backpackStripe,
    leftStrap,
    rightStrap,
    ...leftArmRig.parts,
    ...rightArmRig.parts,
    ...leftLegRig.parts,
    ...rightLegRig.parts
  ].forEach((part) => {
    if (!part.isMesh) return;
    part.castShadow = false;
    part.receiveShadow = false;
  });

  return {
    group,
    bodyGroup,
    hipsGroup,
    torsoGroup,
    torso,
    chestPanel,
    pocket,
    backpackGroup,
    headGroup,
    head,
    mouth,
    arms: [
      { ...leftArmRig, side: -1 },
      { ...rightArmRig, side: 1 }
    ],
    legs: [
      { ...leftLegRig, side: -1 },
      { ...rightLegRig, side: 1 }
    ],
    baseBodyPosition: bodyGroup.position.clone(),
    baseTorsoPosition: torsoGroup.position.clone(),
    baseTorsoRotation: torsoGroup.rotation.clone(),
    baseHipsPosition: hipsGroup.position.clone(),
    baseHipsRotation: hipsGroup.rotation.clone(),
    baseHeadPosition: headGroup.position.clone(),
    baseHeadRotation: headGroup.rotation.clone()
  };
}

function addAvatarMesh(group, geometry, material, position, scale = [1, 1, 1], rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.rotation.set(...rotation);
  group.add(mesh);
  return mesh;
}

function updateStudyPlayerAvatar(avatar, playerPosition, yaw, isWalking, velocity, delta, frameTime, cameraMode, eyeHeight) {
  const visible = cameraMode !== 'first-person';
  avatar.group.visible = visible;
  if (!visible) return;

  avatar.group.position.set(playerPosition.x, playerPosition.y - eyeHeight, playerPosition.z);
  avatar.group.rotation.y = dampAngle(avatar.group.rotation.y, yaw, 14, delta);

  if (avatar.kind === 'illustrated-avatar') {
    const showFront = cameraMode === 'front-person';
    avatar.frontPlane.visible = showFront;
    avatar.backPlane.visible = !showFront;
    avatar.sidePlane.visible = true;
    avatar.vehicleFrontPlane.visible = showFront;
    avatar.vehicleBackPlane.visible = !showFront;
    avatar.vehicleSidePlane.visible = true;
    avatar.artGroup.position.copy(avatar.baseArtPosition);
    avatar.artGroup.rotation.copy(avatar.baseArtRotation);
    avatar.artGroup.scale.set(1, 1, 1);
    avatar.vehicleGroup.position.copy(avatar.baseVehiclePosition);
    avatar.vehicleGroup.rotation.copy(avatar.baseVehicleRotation);
    avatar.vehicleGroup.scale.set(1, 1, 1);
    avatar.shadow.scale.copy(avatar.baseShadowScale);
    avatar.shadow.scale.x = 1.32;
    avatar.shadow.scale.y = 0.54;
    avatar.shadow.material.opacity = 0.24;
    return;
  }

  const speed = clamp(velocity.length() / WALK_SPEED, 0, 1);
  const walk = isWalking ? speed : 0;
  const phase = frameTime * 0.0115;
  const idle = Math.sin(frameTime * 0.0024);
  const stride = Math.sin(phase) * 0.44 * walk;
  const counterStride = Math.sin(phase + Math.PI) * 0.44 * walk;
  const bounce = Math.abs(Math.sin(phase)) * 0.045 * walk + idle * 0.006;
  const lean = clamp(speed, 0, 1) * 0.055;

  avatar.bodyGroup.position.copy(avatar.baseBodyPosition);
  avatar.torsoGroup.position.copy(avatar.baseTorsoPosition);
  avatar.torsoGroup.position.y += bounce;
  avatar.torsoGroup.rotation.copy(avatar.baseTorsoRotation);
  avatar.torsoGroup.rotation.x = -lean;
  avatar.torsoGroup.rotation.z = Math.sin(phase) * 0.025 * walk;

  avatar.hipsGroup.position.copy(avatar.baseHipsPosition);
  avatar.hipsGroup.position.y += bounce * 0.45;
  avatar.hipsGroup.rotation.copy(avatar.baseHipsRotation);
  avatar.hipsGroup.rotation.z = Math.sin(phase + Math.PI) * 0.018 * walk;

  avatar.headGroup.position.copy(avatar.baseHeadPosition);
  avatar.headGroup.position.y += bounce * 0.62;
  avatar.headGroup.rotation.copy(avatar.baseHeadRotation);
  avatar.headGroup.rotation.x = idle * 0.018 - lean * 0.4;
  avatar.headGroup.rotation.y = Math.sin(frameTime * 0.0018) * 0.04 * (1 - walk * 0.55);
  avatar.mouth.scale.x = 1 + Math.abs(idle) * 0.08;

  avatar.arms.forEach((arm) => {
    const armStride = arm.side < 0 ? counterStride : stride;
    arm.group.position.copy(arm.basePosition);
    arm.group.position.y += bounce * 0.42;
    arm.group.rotation.copy(arm.baseRotation);
    arm.group.rotation.x = armStride * 0.68 - lean * 0.35;
    arm.group.rotation.z = arm.side * (0.06 + walk * 0.035);
    arm.handGroup.rotation.x = -armStride * 0.22;
    arm.handGroup.rotation.z = Math.sin(phase + arm.side * Math.PI) * 0.08 * walk;
  });

  avatar.legs.forEach((leg) => {
    const legStride = leg.side < 0 ? stride : counterStride;
    const stepLift = Math.max(0, Math.sin(phase + (leg.side < 0 ? 0 : Math.PI))) * 0.06 * walk;
    leg.group.position.copy(leg.basePosition);
    leg.group.position.y += bounce * 0.18 + stepLift * 0.18;
    leg.group.rotation.copy(leg.baseRotation);
    leg.group.rotation.x = legStride * 0.78;
    leg.group.rotation.z = leg.side * 0.018 * walk;
    leg.shoeGroup.position.copy(leg.shoeBasePosition);
    leg.shoeGroup.position.y += stepLift;
    leg.shoeGroup.position.z += legStride * 0.1;
    leg.shoeGroup.rotation.x = -legStride * 0.28;
  });
}

function setHorizontalForwardFromYaw(target, yaw) {
  target.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  if (target.lengthSq() < 0.001) target.set(0, 0, -1);
  return target.normalize();
}

function updateCameraForViewMode(
  camera,
  playerPosition,
  yaw,
  pitch,
  cameraMode,
  bounds,
  delta,
  forward,
  desiredPosition,
  lookTarget
) {
  if (cameraMode === 'first-person') {
    camera.position.copy(playerPosition);
    camera.rotation.set(pitch, yaw, 0);
    return;
  }

  setHorizontalForwardFromYaw(forward, yaw);
  const pitchLift = clamp(-pitch * 2.25, -1.0, 1.25);

  if (cameraMode === 'front-person') {
    desiredPosition.copy(playerPosition).addScaledVector(forward, 4.1);
    desiredPosition.y += 2.05 + pitchLift * 0.42;
    lookTarget.copy(playerPosition).addScaledVector(forward, -0.55);
    lookTarget.y += 0.96;
  } else {
    desiredPosition.copy(playerPosition).addScaledVector(forward, -5.4);
    desiredPosition.y += 2.45 + pitchLift;
    lookTarget.copy(playerPosition).addScaledVector(forward, 1.45);
    lookTarget.y += 0.96 + clamp(-pitch * 0.55, -0.45, 0.55);
  }

  desiredPosition.x = clamp(desiredPosition.x, bounds.minX + 0.45, bounds.maxX - 0.45);
  desiredPosition.z = clamp(desiredPosition.z, bounds.minZ + 0.45, bounds.maxZ - 0.45);
  const response = 1 - Math.exp(-CAMERA_VIEW_TRANSITION * Math.max(delta, 0.001));
  camera.position.lerp(desiredPosition, response);
  camera.lookAt(lookTarget);
}

function createCompanionDachshund(equippedSkin) {
  const group = new THREE.Group();
  group.name = 'estudiemos-3d-dachshund-companion';
  group.position.set(startPosition.x + COMPANION_SIDE_OFFSET, 0, startPosition.z + Math.abs(COMPANION_BACK_OFFSET));
  group.rotation.order = 'YXZ';

  const materials = {
    body: new THREE.MeshStandardMaterial({ color: 0xb46d3c, roughness: 0.58, metalness: 0.02 }),
    belly: new THREE.MeshStandardMaterial({ color: 0xf3c391, roughness: 0.64, metalness: 0 }),
    ear: new THREE.MeshStandardMaterial({ color: 0x743b27, roughness: 0.62, metalness: 0.01 }),
    accent: new THREE.MeshStandardMaterial({ color: 0x2a6f64, roughness: 0.34, metalness: 0.03 }),
    glow: new THREE.MeshStandardMaterial({ color: 0xe0c47a, emissive: 0xe0c47a, emissiveIntensity: 0.58, roughness: 0.26, metalness: 0 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x111819, roughness: 0.48, metalness: 0.04 }),
    eye: new THREE.MeshStandardMaterial({ color: 0x050706, roughness: 0.24, metalness: 0.02 }),
    shine: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0 }),
    skateDeck: new THREE.MeshStandardMaterial({ color: 0xd7c28a, roughness: 0.48, metalness: 0.02 }),
    skateGrip: new THREE.MeshStandardMaterial({ color: 0x101718, roughness: 0.62, metalness: 0.02 }),
    skateTruck: new THREE.MeshStandardMaterial({ color: 0xb9d7df, roughness: 0.36, metalness: 0.18 }),
    skateWheel: new THREE.MeshStandardMaterial({ color: 0x2a6f64, roughness: 0.42, metalness: 0.03 }),
    shadow: new THREE.MeshBasicMaterial({ color: 0x050706, transparent: true, opacity: 0.18, depthWrite: false })
  };

  const contactShadow = addDogMesh(
    group,
    new THREE.CircleGeometry(0.95, 18),
    materials.shadow,
    [0, 0.035, 0],
    [1.35, 0.52, 1],
    [-Math.PI / 2, 0, 0]
  );
  contactShadow.renderOrder = -1;

  const body = addDogMesh(
    group,
    new THREE.CapsuleGeometry(0.3, 1.34, 6, 12),
    materials.body,
    [0, 0.58, 0],
    [1, 0.82, 0.78],
    [0, 0, Math.PI / 2]
  );
  const belly = addDogMesh(group, new THREE.SphereGeometry(0.32, 16, 8), materials.belly, [0.08, 0.45, 0], [1.42, 0.24, 0.58]);
  const chest = addDogMesh(group, new THREE.SphereGeometry(0.22, 14, 8), materials.belly, [0.62, 0.58, 0], [0.72, 0.82, 0.78]);
  const head = addDogMesh(group, new THREE.SphereGeometry(0.32, 16, 12), materials.body, [0.88, 0.72, 0], [1.04, 0.92, 0.94]);
  const snout = addDogMesh(group, new THREE.SphereGeometry(0.18, 14, 8), materials.belly, [1.16, 0.66, 0], [1.22, 0.7, 0.82]);
  const nose = addDogMesh(group, new THREE.SphereGeometry(0.062, 8, 6), materials.eye, [1.36, 0.68, 0], [1.08, 0.82, 1]);
  const noseShine = addDogMesh(group, new THREE.SphereGeometry(0.018, 8, 6), materials.shine, [1.39, 0.705, 0.024], [1, 1, 1]);

  const leftEar = addDogMesh(
    group,
    new THREE.CapsuleGeometry(0.095, 0.42, 5, 8),
    materials.ear,
    [0.74, 0.58, -0.25],
    [0.85, 1, 0.58],
    [0.18, 0.2, 0.1]
  );
  const rightEar = addDogMesh(
    group,
    new THREE.CapsuleGeometry(0.095, 0.42, 5, 8),
    materials.ear,
    [0.74, 0.58, 0.25],
    [0.85, 1, 0.58],
    [-0.18, -0.2, 0.1]
  );

  const eyes = [
    addDogMesh(group, new THREE.SphereGeometry(0.035, 8, 6), materials.eye, [1.14, 0.79, -0.12], [1, 1, 1]),
    addDogMesh(group, new THREE.SphereGeometry(0.035, 8, 6), materials.eye, [1.14, 0.79, 0.12], [1, 1, 1])
  ];
  const eyeShines = [];
  eyes.forEach((eye) => {
    eyeShines.push(
      addDogMesh(group, new THREE.SphereGeometry(0.011, 6, 4), materials.shine, [eye.position.x + 0.018, eye.position.y + 0.012, eye.position.z + 0.008], [1, 1, 1])
    );
  });

  const legs = [
    addDogLeg(group, materials.ear, materials.belly, [-0.45, 0.29, -0.2]),
    addDogLeg(group, materials.ear, materials.belly, [0.45, 0.29, -0.2]),
    addDogLeg(group, materials.ear, materials.belly, [-0.45, 0.29, 0.2]),
    addDogLeg(group, materials.ear, materials.belly, [0.45, 0.29, 0.2])
  ];

  const tail = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.72, 0.66, 0),
        new THREE.Vector3(-0.98, 0.82, 0.03),
        new THREE.Vector3(-1.18, 0.98, 0.12)
      ]),
      10,
      0.03,
      5,
      false
    ),
    materials.ear
  );
  tail.castShadow = true;
  group.add(tail);

  const skateboard = createCompanionSkateboard(materials);
  group.add(skateboard);

  const collar = addDogMesh(group, new THREE.TorusGeometry(0.205, 0.024, 8, 18), materials.accent, [0.62, 0.67, 0], [1, 1.1, 0.86], [0, Math.PI / 2, 0]);
  const tag = addDogMesh(group, new THREE.CylinderGeometry(0.055, 0.055, 0.018, 12), materials.glow, [0.78, 0.49, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);

  const cyberGroup = new THREE.Group();
  cyberGroup.name = 'dachshund-cyber-kit';
  cyberGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.12, 0.42), materials.glow));
  cyberGroup.children[0].position.set(1.19, 0.79, 0);
  cyberGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.055, 0.88), materials.glow));
  cyberGroup.children[1].position.set(0.04, 0.86, 0);
  group.add(cyberGroup);

  const engineerGroup = new THREE.Group();
  engineerGroup.name = 'dachshund-engineer-kit';
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2), materials.glow);
  helmet.position.set(0.88, 0.95, 0);
  helmet.scale.set(1.06, 0.74, 0.88);
  engineerGroup.add(helmet);
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.045, 0.14), materials.glow);
  brim.position.set(1.06, 0.88, 0);
  engineerGroup.add(brim);
  group.add(engineerGroup);

  const premiumRing = addDogMesh(group, new THREE.TorusGeometry(0.78, 0.018, 8, 24), materials.glow, [0, 0.58, 0], [1, 0.16, 0.58], [Math.PI / 2, 0, 0]);
  const legendaryGroup = new THREE.Group();
  legendaryGroup.name = 'dachshund-legendary-stars';
  [
    [-0.42, 1.08, -0.36],
    [0.24, 1.18, 0.38],
    [0.78, 1.03, -0.28]
  ].forEach((position) => {
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), materials.glow);
    star.position.set(...position);
    legendaryGroup.add(star);
  });
  group.add(legendaryGroup);

  const companion = {
    group,
    materials,
    body,
    belly,
    chest,
    head,
    snout,
    nose,
    noseShine,
    eyes,
    eyeShines,
    ears: [leftEar, rightEar],
    legs,
    tail,
    skateboard,
    collar,
    tag,
    cyberGroup,
    engineerGroup,
    premiumRing,
    legendaryGroup,
    visualKey: '',
    walkPhase: 0,
    idleTimer: 0,
    sitAmount: 0,
    hasCameraPosition: false,
    hasFollowBasis: false,
    followForward: new THREE.Vector3(0, 0, -1),
    lastPosition: group.position.clone(),
    lastCameraPosition: new THREE.Vector3(),
    scratch: {
      forward: new THREE.Vector3(),
      right: new THREE.Vector3(),
      target: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      cameraDelta: new THREE.Vector3(),
      toCamera: new THREE.Vector3()
    }
  };

  group.userData.performancePass = PERFORMANCE_PASS_MARKER;
  applyCompanionDachshundVisuals(companion, equippedSkin);
  return companion;
}

function addDogMesh(group, geometry, material, position, scale = [1, 1, 1], rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function addDogLeg(group, legMaterial, pawMaterial, position) {
  const leg = addDogMesh(group, new THREE.CylinderGeometry(0.058, 0.072, 0.42, 8), legMaterial, position);
  const paw = addDogMesh(group, new THREE.SphereGeometry(0.095, 8, 6), pawMaterial, [position[0] + 0.035, 0.08, position[2]], [1.26, 0.46, 0.86]);
  return {
    leg,
    paw,
    baseX: position[0],
    baseY: position[1],
    baseZ: position[2],
    pawBaseX: paw.position.x,
    pawBaseY: paw.position.y,
    pawBaseZ: paw.position.z
  };
}

function createCompanionSkateboard(materials) {
  const skateboard = new THREE.Group();
  skateboard.name = 'dachshund-3d-skateboard';
  skateboard.userData.wheels = [];

  const deck = new THREE.Mesh(createSkateboardDeckGeometry(), materials.skateDeck);
  deck.position.set(0.02, 0.095, 0);
  deck.castShadow = true;
  deck.receiveShadow = true;
  skateboard.add(deck);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.012, 0.28), materials.skateGrip);
  grip.position.set(0.04, 0.13, 0);
  grip.castShadow = true;
  grip.receiveShadow = true;
  skateboard.add(grip);

  [-0.62, 0.72].forEach((x) => {
    const truck = new THREE.Group();
    truck.position.set(x, 0.062, 0);

    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.78, 10), materials.skateTruck);
    axle.rotation.x = Math.PI / 2;
    axle.castShadow = true;
    axle.receiveShadow = true;
    truck.add(axle);

    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.045, 0.14), materials.skateTruck);
    mount.position.y = 0.018;
    mount.castShadow = true;
    mount.receiveShadow = true;
    truck.add(mount);

    [-0.39, 0.39].forEach((z) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.08, 16), materials.skateWheel);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(0, -0.025, z);
      wheel.castShadow = true;
      wheel.receiveShadow = true;
      truck.add(wheel);
      skateboard.userData.wheels.push(wheel);
    });

    skateboard.add(truck);
  });

  const noseStripe = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.014, 0.36), materials.glow);
  noseStripe.position.set(0.88, 0.137, 0);
  noseStripe.castShadow = true;
  skateboard.add(noseStripe);

  skateboard.userData.deck = deck;
  return skateboard;
}

function createSkateboardDeckGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.86, -0.24);
  shape.bezierCurveTo(-1.08, -0.23, -1.18, -0.12, -1.18, 0);
  shape.bezierCurveTo(-1.18, 0.12, -1.08, 0.23, -0.86, 0.24);
  shape.lineTo(0.86, 0.24);
  shape.bezierCurveTo(1.08, 0.23, 1.18, 0.12, 1.18, 0);
  shape.bezierCurveTo(1.18, -0.12, 1.08, -0.23, 0.86, -0.24);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.06,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.02,
    bevelSegments: 2,
    curveSegments: 8
  });
  geometry.rotateX(Math.PI / 2);
  geometry.center();
  return geometry;
}

function updateCompanionDachshund(companion, camera, delta, isInterior, progress, activeBounds = null) {
  applyCompanionDachshundVisuals(companion, getEquippedSkinState(progress));

  const { forward, right, target, velocity, cameraDelta, toCamera } = companion.scratch;
  const responseDelta = Math.max(delta, 0.001);
  if (!companion.hasCameraPosition) {
    companion.lastCameraPosition.copy(camera.position);
    companion.hasCameraPosition = true;
  }
  cameraDelta.copy(camera.position).sub(companion.lastCameraPosition);
  cameraDelta.y = 0;
  const cameraSpeed = cameraDelta.length() / responseDelta;
  const playerIsStill = cameraSpeed < COMPANION_STILL_SPEED;

  camera.getWorldDirection(forward);
  forward.y = 0;
  if (forward.lengthSq() < 0.001) forward.set(0, 0, -1);
  forward.normalize();
  if (!companion.hasFollowBasis) {
    companion.followForward.copy(forward);
    companion.hasFollowBasis = true;
  }
  if (!playerIsStill && cameraDelta.lengthSq() > 0.0001) {
    cameraDelta.normalize();
    companion.followForward.lerp(cameraDelta, 1 - Math.exp(-COMPANION_DIRECTION_RESPONSE * delta));
    companion.followForward.normalize();
  }
  forward.copy(companion.followForward);
  right.crossVectors(forward, camera.up).normalize();

  target.copy(camera.position);
  target.addScaledVector(right, COMPANION_SIDE_OFFSET);
  target.addScaledVector(forward, COMPANION_BACK_OFFSET);
  target.y = camera.position.y - Casa1.startPosition.y;

  const bounds = activeBounds ?? (isInterior ? activeMap.interiorBounds : activeMap.neighborhoodBounds);
  target.x = clamp(target.x, bounds.minX + 1.1, bounds.maxX - 1.1);
  target.z = clamp(target.z, bounds.minZ + 1.1, bounds.maxZ - 1.1);
  toCamera.copy(target).sub(camera.position);
  toCamera.y = 0;
  if (toCamera.lengthSq() < COMPANION_MIN_PLAYER_DISTANCE * COMPANION_MIN_PLAYER_DISTANCE) {
    if (toCamera.lengthSq() < 0.001) {
      toCamera.copy(right).multiplyScalar(Math.sign(COMPANION_SIDE_OFFSET) || -1);
    }
    toCamera.normalize().multiplyScalar(COMPANION_MIN_PLAYER_DISTANCE);
    target.copy(camera.position).add(toCamera);
    target.y = camera.position.y - Casa1.startPosition.y;
    target.x = clamp(target.x, bounds.minX + 1.1, bounds.maxX - 1.1);
    target.z = clamp(target.z, bounds.minZ + 1.1, bounds.maxZ - 1.1);
  }

  toCamera.copy(camera.position);
  toCamera.y = companion.group.position.y;
  const playerDistance = companion.group.position.distanceTo(toCamera);
  const targetDistanceBeforeMove = companion.group.position.distanceTo(target);
  const canHoldRestPosition =
    playerIsStill &&
    companion.sitAmount > 0.55 &&
    playerDistance > 2.15 &&
    playerDistance < 6.7 &&
    targetDistanceBeforeMove < 2.4;
  if (canHoldRestPosition) {
    target.copy(companion.group.position);
  }

  if (companion.group.position.distanceTo(target) > 22) {
    companion.group.position.copy(target);
    companion.lastPosition.copy(target);
  } else {
    companion.group.position.lerp(target, 1 - Math.exp(-COMPANION_FOLLOW_RESPONSE * delta));
  }

  velocity.copy(companion.group.position).sub(companion.lastPosition);
  const speed = velocity.length() / responseDelta;
  const targetDistance = companion.group.position.distanceTo(target);
  if (playerIsStill && speed < 0.14 && targetDistance < 0.5 && playerDistance > 2.05) {
    companion.idleTimer += delta;
  } else {
    companion.idleTimer = Math.max(0, companion.idleTimer - delta * 2.4);
  }

  const targetSitAmount = companion.idleTimer >= COMPANION_IDLE_SIT_DELAY ? 1 : 0;
  companion.sitAmount += (targetSitAmount - companion.sitAmount) * (1 - Math.exp(-5.6 * delta));
  const sit = companion.sitAmount;
  const walkAmount = clamp(speed / WALK_SPEED, 0, 1) * (1 - sit);
  const skateRoll = speed * delta * 4.8;

  toCamera.copy(camera.position).sub(companion.group.position);
  toCamera.y = 0;
  if (sit > 0.22 && toCamera.lengthSq() > 0.01) {
    const desiredYaw = Math.atan2(-toCamera.z, toCamera.x);
    companion.group.rotation.y = dampAngle(companion.group.rotation.y, desiredYaw, 7, delta);
  } else if (speed > 0.03) {
    const desiredYaw = Math.atan2(-velocity.z, velocity.x);
    companion.group.rotation.y = dampAngle(companion.group.rotation.y, desiredYaw, 12, delta);
  }

  companion.walkPhase += delta * (4.8 + walkAmount * 7.5);
  const stride = Math.sin(companion.walkPhase) * 0.34 * walkAmount;
  const counterStride = Math.sin(companion.walkPhase + Math.PI) * 0.34 * walkAmount;
  companion.legs.forEach((part, index) => {
    const walkingSwing = index % 2 === 0 ? stride : counterStride;
    const isFrontLeg = part.baseX > 0;
    const sittingLegRotation = isFrontLeg ? 0.08 : -0.82;
    part.leg.rotation.z = THREE.MathUtils.lerp(walkingSwing, sittingLegRotation, sit);
    part.leg.position.x = THREE.MathUtils.lerp(part.baseX, part.baseX + (isFrontLeg ? 0.03 : -0.08), sit);
    part.leg.position.y = THREE.MathUtils.lerp(part.baseY, isFrontLeg ? 0.28 : 0.22, sit);
    part.leg.position.z = part.baseZ;
    part.paw.position.x = THREE.MathUtils.lerp(part.pawBaseX + walkingSwing * 0.12, part.pawBaseX + (isFrontLeg ? 0.02 : -0.16), sit);
    part.paw.position.y = THREE.MathUtils.lerp(part.pawBaseY, isFrontLeg ? 0.075 : 0.12, sit);
    part.paw.position.z = part.pawBaseZ;
  });

  const bob = Math.sin(companion.walkPhase * 2) * 0.025 * walkAmount;
  companion.body.position.x = THREE.MathUtils.lerp(0, -0.08, sit);
  companion.body.position.y = THREE.MathUtils.lerp(0.58 + bob, 0.48, sit);
  companion.body.rotation.z = THREE.MathUtils.lerp(Math.PI / 2, Math.PI / 2 - 0.16, sit);
  companion.belly.position.x = THREE.MathUtils.lerp(0.08, -0.03, sit);
  companion.belly.position.y = THREE.MathUtils.lerp(0.45 + bob * 0.55, 0.38, sit);
  companion.chest.position.x = THREE.MathUtils.lerp(0.62, 0.55, sit);
  companion.chest.position.y = THREE.MathUtils.lerp(0.58 + bob * 0.7, 0.65, sit);
  companion.head.position.x = THREE.MathUtils.lerp(0.88, 0.78, sit);
  companion.head.position.y = THREE.MathUtils.lerp(0.72 + bob * 0.9, 0.88, sit);
  companion.snout.position.x = THREE.MathUtils.lerp(1.16, 1.05, sit);
  companion.snout.position.y = THREE.MathUtils.lerp(0.66 + bob * 0.9, 0.82, sit);
  companion.nose.position.x = THREE.MathUtils.lerp(1.36, 1.25, sit);
  companion.nose.position.y = THREE.MathUtils.lerp(0.68 + bob * 0.9, 0.84, sit);
  companion.noseShine.position.x = THREE.MathUtils.lerp(1.39, 1.28, sit);
  companion.noseShine.position.y = THREE.MathUtils.lerp(0.705 + bob * 0.9, 0.865, sit);
  companion.eyes.forEach((eye, index) => {
    const eyeZ = index === 0 ? -0.12 : 0.12;
    eye.position.x = THREE.MathUtils.lerp(1.14, 1.04, sit);
    eye.position.y = THREE.MathUtils.lerp(0.79 + bob * 0.9, 0.95, sit);
    eye.position.z = eyeZ;
  });
  companion.eyeShines.forEach((shine, index) => {
    const shineZ = index === 0 ? -0.112 : 0.128;
    shine.position.x = THREE.MathUtils.lerp(1.158, 1.058, sit);
    shine.position.y = THREE.MathUtils.lerp(0.802 + bob * 0.9, 0.962, sit);
    shine.position.z = shineZ;
  });
  companion.ears.forEach((ear, index) => {
    const isLeft = index === 0;
    ear.position.x = THREE.MathUtils.lerp(0.74, 0.66, sit);
    ear.position.y = THREE.MathUtils.lerp(0.58 + bob * 0.7, 0.76, sit);
    ear.position.z = isLeft ? -0.25 : 0.25;
    ear.rotation.x = THREE.MathUtils.lerp(isLeft ? 0.18 : -0.18, isLeft ? 0.26 : -0.26, sit);
    ear.rotation.z = THREE.MathUtils.lerp(0.1, 0.02, sit);
  });
  companion.collar.position.x = THREE.MathUtils.lerp(0.62, 0.54, sit);
  companion.collar.position.y = THREE.MathUtils.lerp(0.67, 0.79, sit);
  companion.tag.position.x = THREE.MathUtils.lerp(0.78, 0.68, sit);
  companion.tag.position.y = THREE.MathUtils.lerp(0.49, 0.58, sit);
  companion.cyberGroup.position.x = -0.08 * sit;
  companion.cyberGroup.position.y = 0.13 * sit;
  companion.engineerGroup.position.x = -0.1 * sit;
  companion.engineerGroup.position.y = 0.14 * sit;
  companion.skateboard.position.y = THREE.MathUtils.lerp(0, -0.012, sit);
  companion.skateboard.rotation.z = Math.sin(companion.walkPhase * 1.8) * 0.018 * walkAmount;
  companion.skateboard.userData.wheels?.forEach((wheel, index) => {
    wheel.rotation.z += (index % 2 === 0 ? 1 : -1) * skateRoll;
  });
  companion.tail.rotation.z = THREE.MathUtils.lerp(
    0.16 + Math.sin(companion.walkPhase * 1.6) * 0.18,
    -0.34 + Math.sin(companion.walkPhase * 1.2) * 0.04,
    sit
  );
  companion.legendaryGroup.rotation.y += delta * 1.6;

  companion.lastPosition.copy(companion.group.position);
  companion.lastCameraPosition.copy(camera.position);
}

function applyCompanionDachshundVisuals(companion, equippedSkin) {
  const skin = equippedSkin?.skin;
  const rank = Math.max(1, equippedSkin?.rank ?? 1);
  const visualKey = `${skin?.id ?? 'classic'}-${rank}`;
  if (companion.visualKey === visualKey) return;

  const visuals = getSkinVisuals(skin?.id, rank);
  setMaterialColor(companion.materials.body, visuals.body);
  setMaterialColor(companion.materials.belly, visuals.belly);
  setMaterialColor(companion.materials.ear, visuals.ear);
  setMaterialColor(companion.materials.accent, visuals.accent);
  setMaterialColor(companion.materials.glow, visuals.glow);
  setMaterialColor(companion.materials.skateWheel, visuals.accent);
  setMaterialColor(companion.materials.skateDeck, visuals.glow);

  companion.group.scale.setScalar(0.92 * visuals.scale);
  companion.cyberGroup.visible = skin?.id === 'cyber';
  companion.engineerGroup.visible = skin?.id === 'engineer';
  companion.premiumRing.visible = rank >= 5;
  companion.legendaryGroup.visible = rank >= 7;
  companion.materials.glow.emissiveIntensity = rank >= 7 ? 0.92 : rank >= 5 ? 0.68 : 0.42;
  companion.materials.shadow.opacity = rank >= 5 ? 0.22 : 0.17;
  companion.visualKey = visualKey;
}

function setMaterialColor(material, color) {
  material.color.set(color);
  if (material.emissive) material.emissive.set(color);
  material.needsUpdate = true;
}

function createCssComputerMonitorOccluderObject() {
  const root = document.createElement('div');
  root.className = 'computer-monitor-occluder';
  root.style.width = `${COMPUTER_MONITOR_OCCLUDER_DOM_SIZE.width}px`;
  root.style.height = `${COMPUTER_MONITOR_OCCLUDER_DOM_SIZE.height}px`;

  const monitor = document.createElement('div');
  monitor.className = 'computer-monitor-occluder-frame';

  const screen = document.createElement('div');
  screen.className = 'computer-monitor-occluder-screen';

  const header = document.createElement('div');
  header.className = 'computer-monitor-occluder-header';
  const title = document.createElement('strong');
  title.textContent = 'Estudiemos OS';
  const status = document.createElement('span');
  status.textContent = 'Agenda sincronizada';
  header.append(title, status);

  const list = document.createElement('div');
  list.className = 'computer-monitor-occluder-list';

  screen.append(header, list);
  monitor.appendChild(screen);

  const neck = document.createElement('div');
  neck.className = 'computer-monitor-occluder-neck';
  const base = document.createElement('div');
  base.className = 'computer-monitor-occluder-base';

  root.append(monitor, neck, base);

  const object = new CSS3DObject(root);
  object.position.copy(COMPUTER_MONITOR_OCCLUDER_WORLD.center);
  object.scale.setScalar(COMPUTER_MONITOR_OCCLUDER_WORLD.width / COMPUTER_MONITOR_OCCLUDER_DOM_SIZE.width);
  object.userData.agendaList = list;
  object.userData.agendaStateKey = '';

  return object;
}

function createCssAgendaBoardObject() {
  const root = document.createElement('div');
  root.className = 'css-agenda-board';
  root.style.width = `${AGENDA_BOARD_DOM_SIZE.width}px`;
  root.style.height = `${AGENDA_BOARD_DOM_SIZE.height}px`;

  const panel = document.createElement('div');
  panel.className = 'css-agenda-board-panel';

  const header = document.createElement('div');
  header.className = 'css-agenda-board-header';
  const title = document.createElement('strong');
  title.textContent = 'Agenda';
  const status = document.createElement('span');
  status.textContent = 'Sincronizada';
  header.append(title, status);

  const list = document.createElement('div');
  list.className = 'css-agenda-board-list';
  panel.append(header, list);
  root.appendChild(panel);

  const object = new CSS3DObject(root);
  object.position.copy(AGENDA_BOARD_WORLD.center);
  object.rotation.y = -Math.PI / 2;
  object.scale.setScalar(AGENDA_BOARD_WORLD.width / AGENDA_BOARD_DOM_SIZE.width);
  object.userData.agendaList = list;
  object.userData.agendaStateKey = '';

  return object;
}

function updateCssAgendaContent(object, agendaItems, limit) {
  const list = object.userData.agendaList;
  if (!list) return;

  const sourceItems = sortAgendaItemsBySchedule(Array.isArray(agendaItems) ? agendaItems : studyAgendaItems);
  const items = sourceItems.filter((item) => !item.completed).slice(0, limit);
  const nextKey = JSON.stringify(sourceItems.map((item) => [item.date, item.time, item.title, item.detail, item.completed]));
  if (object.userData.agendaStateKey === nextKey) return;

  object.userData.agendaStateKey = nextKey;
  if (items.length === 0) {
    const row = document.createElement('div');
    const time = document.createElement('span');
    time.textContent = sourceItems.length > 0 ? 'OK' : '--:--';
    const copy = document.createElement('p');
    const task = document.createElement('strong');
    task.textContent = sourceItems.length > 0 ? 'Todo completado' : 'Agenda vacia';
    const detail = document.createElement('small');
    detail.textContent = sourceItems.length > 0 ? 'No quedan bloques pendientes' : 'Agrega bloques desde la computadora';
    copy.append(task, detail);
    row.append(time, copy);
    list.replaceChildren(row);
    return;
  }

  list.replaceChildren(
    ...items.map((item) => {
      const row = document.createElement('div');
      const time = document.createElement('span');
      time.textContent = item.time || '--:--';
      const copy = document.createElement('p');
      const task = document.createElement('strong');
      task.textContent = item.title || 'Bloque sin titulo';
      const detail = document.createElement('small');
      detail.textContent = item.date ? `${formatAgendaDate(item.date)} - ${item.detail || 'Sin detalle cargado'}` : item.detail || 'Sin detalle cargado';
      copy.append(task, detail);
      row.append(time, copy);
      return row;
    })
  );
}

function sortAgendaItemsBySchedule(items) {
  return [...items].sort((a, b) => `${a.date ?? ''} ${a.time ?? ''}`.localeCompare(`${b.date ?? ''} ${b.time ?? ''}`));
}

function formatAgendaDate(dateValue) {
  const [year, month, day] = String(dateValue).split('-').map(Number);
  if (!year || !month || !day) return '';

  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
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
      columns: ['1fr'],
      axis: 'rows',
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

  if (screenLayout === 'side-by-side') {
    return {
      id: 'side-by-side',
      label: '2 x 16:9',
      rows: ['1fr'],
      columns: ['1fr', '1fr'],
      axis: 'columns',
      slots: [
        {
          zoneId: 'upper',
          label: 'Pantalla izquierda',
          slotLabel: 'IZQUIERDA 16:9',
          accent: '#b9d7df',
          isPrimary: true
        },
        {
          zoneId: 'lower',
          label: 'Pantalla derecha',
          slotLabel: 'DERECHA 16:9',
          accent: '#d7c28a',
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
    columns: ['1fr'],
    axis: 'rows',
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
      updatedAt: screenZones.upper.updatedAt
    },
    lower: {
      videoId: screenZones.lower.videoId,
      contentType: screenZones.lower.contentType,
      resourceUrl: screenZones.lower.resourceUrl,
      title: screenZones.lower.title,
      updatedAt: screenZones.lower.updatedAt
    }
  });

  if (cssGiantScreen.userData.screenStateKey === stateKey) {
    updateCssGiantScreenSlotScales(cssGiantScreen.userData.contentRoot, screenZones);
    applyCssGiantScreenCommands(cssGiantScreen.userData.contentRoot, screenZones);
    return;
  }
  cssGiantScreen.userData.screenStateKey = stateKey;

  const root = cssGiantScreen.userData.contentRoot;
  root.textContent = '';
  root.style.gridTemplateRows = layout.rows.join(' ');
  root.style.gridTemplateColumns = layout.columns.join(' ');
  root.dataset.layout = layout.id;

  layout.slots.forEach((slotConfig) => {
    const zone = screenZones[slotConfig.zoneId];
    const src = buildScreenEmbedUrl(zone);
    const displayScale = clampScreenDisplayScale(zone.displayScale);
    const scaleValue = String(displayScale / 100);
    const slot = document.createElement('div');
    slot.className = 'physical-screen-slot';
    slot.dataset.zoneId = slotConfig.zoneId;
    slot.dataset.screenScale = scaleValue;
    slot.style.setProperty('--screen-content-scale', scaleValue);

    if (src) {
      const iframe = document.createElement('iframe');
      iframe.src = src;
      iframe.title = `${slotConfig.label} - ${zone.title || zone.contentType || 'Contenido'}`;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.allowFullscreen = true;
      slot.appendChild(iframe);
      const loading = document.createElement('span');
      loading.className = 'physical-screen-loading';
      loading.textContent = zone.contentType === 'spotify' ? 'Cargando Spotify' : 'Cargando video';
      slot.appendChild(loading);
      iframe.addEventListener('load', () => {
        slot.classList.add('is-loaded');
        applyScreenCommandToIframe(iframe, zone.playerCommand, zone);
      });
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'physical-screen-placeholder';
      const slotLabel = document.createElement('span');
      slotLabel.textContent = slotConfig.slotLabel;
      const emptyLabel = document.createElement('strong');
      emptyLabel.textContent = 'Sin contenido';
      placeholder.append(slotLabel, emptyLabel);
      slot.appendChild(placeholder);
    }

    root.appendChild(slot);
  });
  applyCssGiantScreenCommands(root, screenZones);
}

function updateCssGiantScreenSlotScales(root, screenZones) {
  root.querySelectorAll('.physical-screen-slot').forEach((slot) => {
    const zone = screenZones[slot.dataset.zoneId];
    if (!zone) return;
    const nextScale = String(clampScreenDisplayScale(zone.displayScale) / 100);
    if (slot.dataset.screenScale === nextScale) return;
    slot.dataset.screenScale = nextScale;
    slot.style.setProperty('--screen-content-scale', nextScale);
  });
}

function applyCssGiantScreenCommands(root, screenZones) {
  root.querySelectorAll('.physical-screen-slot').forEach((slot) => {
    const zone = screenZones[slot.dataset.zoneId];
    const command = zone?.playerCommand;
    if (!command || slot.dataset.lastCommandId === String(command.id)) return;

    const iframe = slot.querySelector('iframe');
    if (!iframe || !applyScreenCommandToIframe(iframe, command, zone)) return;
    slot.dataset.lastCommandId = String(command.id);
  });
}

function applyScreenCommandToIframe(iframe, command, zone) {
  if (!command || zone?.contentType !== 'youtube' || !iframe.contentWindow) return false;

  if (command.action === 'play') {
    return postYouTubeCommandWithRetry(iframe, 'playVideo');
  }

  if (command.action === 'pause') {
    return postYouTubeCommandWithRetry(iframe, 'pauseVideo');
  }

  if (command.action === 'restart') {
    postYouTubeCommand(iframe, 'seekTo', [0, true]);
    return postYouTubeCommandWithRetry(iframe, 'playVideo');
  }

  if (command.action === 'seek') {
    const seconds = Math.max(0, Math.round(Number(command.payload?.seconds ?? 0)));
    postYouTubeCommand(iframe, 'seekTo', [seconds, true]);
    return command.payload?.play === false
      ? postYouTubeCommandWithRetry(iframe, 'pauseVideo')
      : postYouTubeCommandWithRetry(iframe, 'playVideo');
  }

  if (command.action === 'sync-audio') {
    const volume = Math.min(100, Math.max(0, Math.round(Number(command.payload?.volume ?? zone.volume ?? 70))));
    postYouTubeCommand(iframe, 'setVolume', [volume]);
    return postYouTubeCommandWithRetry(iframe, command.payload?.muted ? 'mute' : 'unMute');
  }

  return false;
}

function postYouTubeCommandWithRetry(iframe, func, args = []) {
  postYouTubeCommand(iframe, func, args);
  window.setTimeout(() => postYouTubeCommand(iframe, func, args), 180);
  window.setTimeout(() => postYouTubeCommand(iframe, func, args), 650);
  return true;
}

function postYouTubeCommand(iframe, func, args = []) {
  iframe.contentWindow?.postMessage(
    JSON.stringify({
      event: 'command',
      func,
      args
    }),
    '*'
  );
  return true;
}

function buildPdfEmbedUrl(resourceUrl) {
  if (!resourceUrl) return '';
  return `${resourceUrl}#toolbar=0&navpanes=0&view=FitH`;
}

function buildScreenEmbedUrl(zone) {
  if (zone.contentType === 'pdf') return buildPdfEmbedUrl(zone.resourceUrl);
  if (zone.contentType === 'spotify') return zone.resourceUrl || zone.embedUrl || '';
  return buildYouTubeEmbedUrl(zone);
}

function isPlayerAimingAtGiantScreen(position, isInterior, directionScratch) {
  if (!isInterior) return false;

  if (Math.abs(directionScratch.z) < 0.001) return false;

  const distanceToScreenPlane = (GIANT_SCREEN_WORLD.center.z - position.z) / directionScratch.z;
  if (distanceToScreenPlane < 1.5 || distanceToScreenPlane > GIANT_SCREEN_INTERACTION_DISTANCE) return false;

  const hitX = position.x + directionScratch.x * distanceToScreenPlane;
  const hitY = position.y + directionScratch.y * distanceToScreenPlane;
  const halfWidth = GIANT_SCREEN_WORLD.width / 2 + GIANT_SCREEN_INTERACTION_PADDING;
  const halfHeight = GIANT_SCREEN_WORLD.height / 2 + GIANT_SCREEN_INTERACTION_PADDING;

  return (
    hitX >= GIANT_SCREEN_WORLD.center.x - halfWidth &&
    hitX <= GIANT_SCREEN_WORLD.center.x + halfWidth &&
    hitY >= GIANT_SCREEN_WORLD.center.y - halfHeight &&
    hitY <= GIANT_SCREEN_WORLD.center.y + halfHeight
  );
}

function isPlayerAimingAtAgendaBoard(position, isInterior, directionScratch) {
  if (!isInterior) return false;

  if (Math.abs(directionScratch.x) < 0.001) return false;

  const distanceToBoardPlane = (AGENDA_BOARD_WORLD.center.x - position.x) / directionScratch.x;
  if (distanceToBoardPlane < 1.2 || distanceToBoardPlane > AGENDA_BOARD_INTERACTION_DISTANCE) return false;

  const hitY = position.y + directionScratch.y * distanceToBoardPlane;
  const hitZ = position.z + directionScratch.z * distanceToBoardPlane;
  const halfWidth = AGENDA_BOARD_WORLD.width / 2 + AGENDA_BOARD_INTERACTION_PADDING;
  const halfHeight =
    (AGENDA_BOARD_WORLD.width * (AGENDA_BOARD_DOM_SIZE.height / AGENDA_BOARD_DOM_SIZE.width)) / 2 +
    AGENDA_BOARD_INTERACTION_PADDING;

  return (
    hitZ >= AGENDA_BOARD_WORLD.center.z - halfWidth &&
    hitZ <= AGENDA_BOARD_WORLD.center.z + halfWidth &&
    hitY >= AGENDA_BOARD_WORLD.center.y - halfHeight &&
    hitY <= AGENDA_BOARD_WORLD.center.y + halfHeight
  );
}

function buildWorldScene(scene, worldMode = BUILDING_WORLD_MODE) {
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
  const groundMaterial = makeMaterial(0x587a4c, 0.84, 0, textures.grass);
  const houseWall = makeMaterial(0xbfa17f, 0.68, 0, textures.plaster);
  const roofMaterial = makeMaterial(0x6f5546, 0.7, 0, textures.roof);
  const doorMaterial = makeMaterial(0x2e271f, 0.56, 0.01, textures.wood);

  const exteriorGroup = new THREE.Group();
  if (worldMode === LEGACY_WORLD_MODE) {
    exteriorGroup.name = 'estudiemos-room-exterior-neighborhood';
    addNeighborhood(exteriorGroup, { groundMaterial, houseWall, roofMaterial, doorMaterial, textures });
  } else {
    exteriorGroup.name = 'estudiemos-room-building-lobby';
    addBuildingLobby(exteriorGroup);
    exteriorGroup.position.copy(BUILDING_LOBBY_OFFSET);
  }
  scene.add(exteriorGroup);
  const giantScreen = addCasa1Interior(scene, textures, worldMode !== LEGACY_WORLD_MODE);
  let elevatorCabin = null;
  if (worldMode !== LEGACY_WORLD_MODE) {
    addStudyFloorCirculation(giantScreen.room);
    elevatorCabin = addBuildingElevatorCabin(scene);
  }
  const colliders = createWorldColliders(worldMode);
  return { giantScreen, colliders, exteriorGroup, elevatorCabin };
}

function addStaticSkyDome(scene) {
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(260, PERFORMANCE_PROFILE.skyWidthSegments, PERFORMANCE_PROFILE.skyHeightSegments),
    new THREE.MeshBasicMaterial({
      map: createSkyBackgroundTexture(),
      side: THREE.BackSide,
      depthWrite: false,
      fog: false
    })
  );
  sky.position.set(0, -38, 0);
  sky.renderOrder = -20;
  scene.add(sky);
}

function createWorldColliders(worldMode = BUILDING_WORLD_MODE) {
  const interiorCollider = (x, z, width, depth, tag = '') =>
    createCollider(STUDY_ROOM_ORIGIN_X + x, STUDY_ROOM_ORIGIN_Z + z, width, depth, tag);
  const lobbyCollider = (x, z, width, depth, tag = '') =>
    createCollider(BUILDING_LOBBY_OFFSET.x + x, BUILDING_LOBBY_OFFSET.z + z, width, depth, tag);
  const stairRunCenterZ = (BUILDING_STAIR_WORLD_MIN_Z + BUILDING_STAIR_WORLD_MAX_Z) / 2;
  const stairRunDepth = BUILDING_STAIR_WORLD_MAX_Z - BUILDING_STAIR_WORLD_MIN_Z + 0.4;
  const stairWallThickness = 0.28;
  const buildingStairColliders = [
    createCollider(
      BUILDING_STAIR_WORLD_MIN_X - stairWallThickness / 2,
      stairRunCenterZ,
      stairWallThickness,
      stairRunDepth,
      'stair-rail'
    ),
    createCollider(
      BUILDING_STAIR_WORLD_MAX_X + stairWallThickness / 2,
      stairRunCenterZ,
      stairWallThickness,
      stairRunDepth,
      'stair-rail'
    )
  ];
  const buildingRearWallCollider = lobbyCollider(0, BUILDING_LOBBY_REAR_WALL_Z, 36, 0.46, 'rear-wall');
  const elevatorOpeningMinX = BUILDING_LOBBY_ELEVATOR_LOCAL_X - ELEVATOR_SHAFT_SHELL_HALF_WIDTH;
  const elevatorOpeningMaxX = BUILDING_LOBBY_ELEVATOR_LOCAL_X + ELEVATOR_SHAFT_SHELL_HALF_WIDTH;
  const buildingRearFacadeColliders = [
    {
      minX: -18,
      maxX: BUILDING_STAIR_OPENING_MIN_X
    },
    {
      minX: BUILDING_STAIR_OPENING_MAX_X,
      maxX: elevatorOpeningMinX
    },
    {
      minX: elevatorOpeningMaxX,
      maxX: 18
    }
  ].map(({ minX, maxX }) =>
    lobbyCollider(
      (minX + maxX) / 2,
      BUILDING_LOBBY_REAR_FACADE_Z,
      maxX - minX,
      0.46,
      'rear-facade'
    )
  );
  const studyFacadeColliders = STUDY_FRONT_SOLID_SEGMENTS.map((segment) =>
    interiorCollider(
      (segment.minX + segment.maxX) / 2,
      STUDY_ELEVATOR_FACADE_Z,
      segment.maxX - segment.minX,
      0.46,
      'study-service-wall'
    )
  );
  const legacyExteriorColliders = [
    createCollider(0, -20.8, 15.2, 8.7),
    createCollider(-18, -19, 12.5, 8.5),
    createCollider(18, -19, 12.5, 8.5),
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
  ];

  return {
    exterior:
      worldMode === LEGACY_WORLD_MODE
        ? legacyExteriorColliders
        : [
            lobbyCollider(0, BUILDING_LOBBY_SHOP_LOCAL_Z, 4.35, 2.45, 'shop'),
            lobbyCollider(16.55, 6.7, 1.35, 5, 'lobby-bench'),
            buildingRearWallCollider,
            ...buildingRearFacadeColliders,
            ...createBuildingElevatorShaftColliders('lobby'),
            createCollider(
              BUILDING_ELEVATOR_X,
              BUILDING_LOBBY_ELEVATOR_DOOR_Z,
              ELEVATOR_CABIN_WIDTH,
              0.55,
              'elevator-door'
            ),
            ...buildingStairColliders
          ],
    interior: [
      interiorCollider(0, -28.3, 39, 3.6),
      interiorCollider(-11.4, -8.6, 6.7, 2.7, 'computer-desk'),
      interiorCollider(-25.35, -22.8, 2.9, 2.3, 'speaker'),
      interiorCollider(-26.85, -13.2, 1.4, 5, 'study-bench'),
      interiorCollider(26.85, -10.8, 1.1, 3.9, 'study-shelf'),
      interiorCollider(26.85, -15.2, 1.1, 3.9, 'study-shelf'),
      ...studyFacadeColliders,
      ...createBuildingElevatorShaftColliders('study'),
      createCollider(
        BUILDING_ELEVATOR_X,
        BUILDING_STUDY_ELEVATOR_DOOR_Z,
        ELEVATOR_CABIN_WIDTH,
        0.55,
        'elevator-door'
      ),
      ...buildingStairColliders
    ],
    stairs: [...buildingStairColliders, buildingRearWallCollider]
  };
}

function createBuildingElevatorShaftColliders(floor) {
  const direction = floor === 'study' ? 1 : -1;
  const doorZ = floor === 'study' ? BUILDING_STUDY_ELEVATOR_DOOR_Z : BUILDING_LOBBY_ELEVATOR_DOOR_Z;
  const wallCenterZ = doorZ + direction * (ELEVATOR_SHAFT_SHELL_DEPTH / 2);
  const backWallZ =
    doorZ + direction * (ELEVATOR_SHAFT_SHELL_DEPTH - ELEVATOR_SHAFT_WALL_THICKNESS / 2);
  const sideWallX =
    ELEVATOR_SHAFT_SHELL_HALF_WIDTH - ELEVATOR_SHAFT_WALL_THICKNESS / 2;
  const frontPierX = ELEVATOR_PORTAL_OPENING_WIDTH / 2 + ELEVATOR_FRONT_PIER_WIDTH / 2;

  return [
    createCollider(
      BUILDING_ELEVATOR_X - sideWallX,
      wallCenterZ,
      ELEVATOR_SHAFT_WALL_THICKNESS,
      ELEVATOR_SHAFT_SHELL_DEPTH,
      'elevator-shaft'
    ),
    createCollider(
      BUILDING_ELEVATOR_X + sideWallX,
      wallCenterZ,
      ELEVATOR_SHAFT_WALL_THICKNESS,
      ELEVATOR_SHAFT_SHELL_DEPTH,
      'elevator-shaft'
    ),
    createCollider(
      BUILDING_ELEVATOR_X,
      backWallZ,
      ELEVATOR_SHAFT_SHELL_WIDTH,
      ELEVATOR_SHAFT_WALL_THICKNESS,
      'elevator-shaft'
    ),
    createCollider(
      BUILDING_ELEVATOR_X - frontPierX,
      doorZ,
      ELEVATOR_FRONT_PIER_WIDTH,
      0.55,
      'elevator-shaft'
    ),
    createCollider(
      BUILDING_ELEVATOR_X + frontPierX,
      doorZ,
      ELEVATOR_FRONT_PIER_WIDTH,
      0.55,
      'elevator-shaft'
    )
  ];
}

function createBuildingElevatorCabinColliders() {
  const wallThickness = ELEVATOR_CABIN_COLLIDER_THICKNESS;
  const sideDepth = ELEVATOR_CABIN_DEPTH;
  const endWidth = ELEVATOR_CABIN_WIDTH;
  return {
    sides: [
      createCollider(
        BUILDING_ELEVATOR_X - ELEVATOR_CABIN_HALF_WIDTH + wallThickness / 2,
        BUILDING_ELEVATOR_Z,
        wallThickness,
        sideDepth
      ),
      createCollider(
        BUILDING_ELEVATOR_X + ELEVATOR_CABIN_HALF_WIDTH - wallThickness / 2,
        BUILDING_ELEVATOR_Z,
        wallThickness,
        sideDepth
      )
    ],
    negativeEnd: createCollider(
      BUILDING_ELEVATOR_X,
      BUILDING_ELEVATOR_Z - ELEVATOR_CABIN_HALF_DEPTH + wallThickness / 2,
      endWidth,
      wallThickness
    ),
    positiveEnd: createCollider(
      BUILDING_ELEVATOR_X,
      BUILDING_ELEVATOR_Z + ELEVATOR_CABIN_HALF_DEPTH - wallThickness / 2,
      endWidth,
      wallThickness
    )
  };
}

function getBuildingElevatorMovementColliders(cabinColliders, phase, currentFloor) {
  if (phase === 'closing-inside' || phase === 'ready' || phase === 'traveling') {
    return [...cabinColliders.sides, cabinColliders.negativeEnd, cabinColliders.positiveEnd];
  }
  if (phase !== 'boarding') return [];
  return [
    ...cabinColliders.sides,
    currentFloor === 'study' ? cabinColliders.positiveEnd : cabinColliders.negativeEnd
  ];
}

function createCollider(centerX, centerZ, width, depth, tag = '') {
  return {
    minX: centerX - width / 2,
    maxX: centerX + width / 2,
    minZ: centerZ - depth / 2,
    maxZ: centerZ + depth / 2,
    tag
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

function addFloorBacking(parent, { name, size, position }) {
  const backing = new THREE.Mesh(
    new THREE.BoxGeometry(size[0] + 0.16, 0.24, size[1] + 0.16),
    makeMaterial(0x9f9d94, 0.9, 0.01)
  );
  backing.name = name;
  backing.position.set(position[0], -0.2, position[2]);
  backing.receiveShadow = true;
  parent.add(backing);
  return backing;
}

function addFloorInlay(parent, { name, size, position, color }) {
  const inlay = new THREE.Mesh(
    new THREE.BoxGeometry(size[0], 0.045, size[1]),
    makeMaterial(color, 0.88, 0.01)
  );
  inlay.name = name;
  inlay.position.set(position[0], 0.025, position[2]);
  inlay.receiveShadow = true;
  parent.add(inlay);
  return inlay;
}

function addBuildingLobby(group) {
  addFloorBacking(group, {
    name: 'building-lobby-continuous-floor-backing',
    size: [36, BUILDING_LOBBY_DEPTH],
    position: [0, 0, BUILDING_LOBBY_CENTER_Z]
  });
  const elevatorDoorZ = BUILDING_LOBBY_ELEVATOR_DOOR_Z - BUILDING_LOBBY_OFFSET.z;
  const stairOpeningMinX = BUILDING_STAIR_OPENING_MIN_X;
  const stairOpeningMaxX = BUILDING_STAIR_OPENING_MAX_X;
  const elevatorOpeningMinX = BUILDING_LOBBY_ELEVATOR_LOCAL_X - ELEVATOR_SHAFT_SHELL_HALF_WIDTH;
  const elevatorOpeningMaxX = BUILDING_LOBBY_ELEVATOR_LOCAL_X + ELEVATOR_SHAFT_SHELL_HALF_WIDTH;
  const floorParts = [
    {
      name: 'left-edge',
      size: [stairOpeningMinX + 18, BUILDING_LOBBY_DEPTH],
      position: [(-18 + stairOpeningMinX) / 2, 0, BUILDING_LOBBY_CENTER_Z]
    },
    {
      name: 'center',
      size: [elevatorOpeningMinX - stairOpeningMaxX, BUILDING_LOBBY_DEPTH],
      position: [(stairOpeningMaxX + elevatorOpeningMinX) / 2, 0, BUILDING_LOBBY_CENTER_Z]
    },
    {
      name: 'right-edge',
      size: [18 - elevatorOpeningMaxX, BUILDING_LOBBY_DEPTH],
      position: [(elevatorOpeningMaxX + 18) / 2, 0, BUILDING_LOBBY_CENTER_Z]
    },
    {
      name: 'stairs-rear',
      size: [stairOpeningMaxX - stairOpeningMinX, BUILDING_STAIR_MIN_Z - BUILDING_LOBBY_REAR_WALL_Z],
      position: [
        (stairOpeningMinX + stairOpeningMaxX) / 2,
        0,
        (BUILDING_STAIR_MIN_Z + BUILDING_LOBBY_REAR_WALL_Z) / 2
      ]
    },
    {
      name: 'stairs-front',
      size: [stairOpeningMaxX - stairOpeningMinX, BUILDING_LOBBY_FRONT_WALL_Z - BUILDING_STAIR_MAX_Z],
      position: [
        (stairOpeningMinX + stairOpeningMaxX) / 2,
        0,
        (BUILDING_STAIR_MAX_Z + BUILDING_LOBBY_FRONT_WALL_Z) / 2
      ]
    },
    {
      name: 'elevator-front',
      size: [elevatorOpeningMaxX - elevatorOpeningMinX, BUILDING_LOBBY_FRONT_WALL_Z - elevatorDoorZ],
      position: [
        (elevatorOpeningMinX + elevatorOpeningMaxX) / 2,
        0,
        (elevatorDoorZ + BUILDING_LOBBY_FRONT_WALL_Z) / 2
      ]
    }
  ];
  floorParts.forEach(({ name, size, position }) => {
    addArchitectureModel(group, {
      asset: BUILDING_ARCHITECTURE.floorPanel,
      name: `building-lobby-floor-${name}`,
      position,
      scale: [size[0] / 4, 1.35, size[1] / 4],
      castShadow: false
    });
  });

  addFloorInlay(group, {
    name: 'building-lobby-entry-inlay',
    size: [8.8, 5.2],
    position: [0, 0, 14.6],
    color: 0x294740
  });

  [
    {
      name: 'left-wall',
      center: [-17.75, 0, BUILDING_LOBBY_CENTER_Z],
      length: BUILDING_LOBBY_DEPTH,
      rotationY: Math.PI / 2
    },
    {
      name: 'right-wall',
      center: [17.75, 0, BUILDING_LOBBY_CENTER_Z],
      length: BUILDING_LOBBY_DEPTH,
      rotationY: Math.PI / 2
    },
    {
      name: 'back-left',
      center: [(-18 + elevatorOpeningMinX) / 2, 0, BUILDING_LOBBY_REAR_WALL_Z],
      length: elevatorOpeningMinX + 18,
      rotationY: 0
    },
    {
      name: 'back-right',
      center: [(elevatorOpeningMaxX + 18) / 2, 0, BUILDING_LOBBY_REAR_WALL_Z],
      length: 18 - elevatorOpeningMaxX,
      rotationY: 0
    },
    { name: 'front-left', center: [-11, 0, 19.75], length: 14, rotationY: 0 },
    { name: 'front-right', center: [11, 0, 19.75], length: 14, rotationY: 0 }
  ].forEach((wall) => {
    addRepeatedWall(group, {
      ...wall,
      name: `building-lobby-${wall.name}`,
      height: 9.4,
      maxModuleLength: 8
    });
  });
  [
    { name: 'left', minX: -18, maxX: stairOpeningMinX },
    { name: 'center', minX: stairOpeningMaxX, maxX: elevatorOpeningMinX },
    { name: 'right', minX: elevatorOpeningMaxX, maxX: 18 }
  ].forEach(({ name, minX, maxX }) => {
    addRepeatedWall(group, {
      name: `building-lobby-rear-facade-${name}`,
      center: [(minX + maxX) / 2, 0, BUILDING_LOBBY_REAR_FACADE_Z],
      length: maxX - minX,
      height: 9.4,
      maxModuleLength: 7.7
    });
  });
  addRepeatedWall(group, {
    name: 'building-lobby-front-header',
    center: [0, 7.15, 19.75],
    length: 8.5,
    height: 2.25,
    maxModuleLength: 4.25
  });

  const ceilingParts = [
    {
      name: 'rear-center',
      size: [elevatorOpeningMinX - stairOpeningMaxX, elevatorDoorZ - BUILDING_LOBBY_REAR_WALL_Z],
      position: [
        (stairOpeningMaxX + elevatorOpeningMinX) / 2,
        9.28,
        (BUILDING_LOBBY_REAR_WALL_Z + elevatorDoorZ) / 2
      ]
    },
    {
      name: 'rear-right',
      size: [18 - elevatorOpeningMaxX, elevatorDoorZ - BUILDING_LOBBY_REAR_WALL_Z],
      position: [
        (elevatorOpeningMaxX + 18) / 2,
        9.28,
        (BUILDING_LOBBY_REAR_WALL_Z + elevatorDoorZ) / 2
      ]
    },
    {
      name: 'stair-side',
      size: [stairOpeningMinX + 18, BUILDING_STAIR_MAX_Z - BUILDING_LOBBY_REAR_WALL_Z],
      position: [
        (-18 + stairOpeningMinX) / 2,
        9.28,
        (BUILDING_LOBBY_REAR_WALL_Z + BUILDING_STAIR_MAX_Z) / 2
      ]
    },
    {
      name: 'middle',
      size: [18 - stairOpeningMaxX, BUILDING_STAIR_MAX_Z - elevatorDoorZ],
      position: [
        (stairOpeningMaxX + 18) / 2,
        9.28,
        (elevatorDoorZ + BUILDING_STAIR_MAX_Z) / 2
      ]
    },
    {
      name: 'front',
      size: [36, BUILDING_LOBBY_FRONT_WALL_Z - BUILDING_STAIR_MAX_Z],
      position: [0, 9.28, (BUILDING_STAIR_MAX_Z + BUILDING_LOBBY_FRONT_WALL_Z) / 2]
    }
  ];
  ceilingParts.forEach((part) => {
    addArchitectureModel(group, {
      asset: BUILDING_ARCHITECTURE.ceilingPanel,
      name: `building-lobby-ceiling-${part.name}`,
      position: part.position,
      scale: [part.size[0] / 4, 1, part.size[1] / 4],
      castShadow: false
    });
  });

  addArchitectureModel(group, {
    asset: BUILDING_ARCHITECTURE.entryPortal,
    name: 'building-lobby-entry-portal',
    position: [0, 0.03, 19.54]
  });
  addBuildingStairs(group);
  addBuildingElevator(group);
  addBuildingLoggia(group);
  addArchitectureModel(group, {
    asset: BUILDING_ARCHITECTURE.builtInBench,
    name: 'building-lobby-wall-bench',
    position: [16.8, 0, 6.7],
    rotation: [0, -Math.PI / 2, 0]
  });

  const lobbyAmbient = new THREE.AmbientLight(0xe9e6dc, 0.16);
  group.add(lobbyAmbient);
  const welcomeLight = new THREE.PointLight(0xffd59a, 1.05, 28, 2.05);
  welcomeLight.position.set(0, 7.6, 5.5);
  group.add(welcomeLight);
  const circulationLight = new THREE.PointLight(0x9ee0cf, 0.82, 22, 2.05);
  circulationLight.position.set(-9, 6.2, -7);
  group.add(circulationLight);
  const stairLight = new THREE.PointLight(0xffce87, 1.12, 19, 2.1);
  stairLight.position.set((BUILDING_STAIR_MIN_X + BUILDING_STAIR_MAX_X) / 2, 8.25, -8.8);
  group.add(stairLight);
}

function addBuildingStairs(group) {
  const stairCenterX = (BUILDING_STAIR_MIN_X + BUILDING_STAIR_MAX_X) / 2;
  addArchitectureModel(group, {
    asset: BUILDING_ARCHITECTURE.stairwellPortal,
    name: 'building-lobby-stair-bottom-portal',
    position: [stairCenterX, 0, 7.85]
  });
  addArchitectureModel(group, {
    asset: BUILDING_ARCHITECTURE.stairFlight,
    name: 'building-lobby-stair-flight',
    position: [stairCenterX, 0, -0.5]
  });
  addArchitectureModel(group, {
    asset: BUILDING_ARCHITECTURE.stairLanding,
    name: 'building-lobby-stair-landing',
    position: [stairCenterX, BUILDING_STAIR_RISE, -10.5]
  });
}

function addBuildingLoggia(group) {
  addArchitectureModel(group, {
    asset: BUILDING_ARCHITECTURE.floorPanel,
    name: 'building-lobby-loggia-floor',
    position: [0, 0, 22],
    scale: [12 / 4, 1, 3.6 / 4],
    castShadow: false
  });
  addArchitectureModel(group, {
    asset: BUILDING_ARCHITECTURE.ceilingPanel,
    name: 'building-lobby-loggia-roof',
    position: [0, 8.72, 22],
    scale: [12.6 / 4, 1, 3.85 / 4],
    castShadow: false
  });
  [-5.6, 5.6].forEach((x, index) => {
    addArchitectureModel(group, {
      asset: BUILDING_ARCHITECTURE.column,
      name: `building-lobby-loggia-column-${index + 1}`,
      position: [x, 0, 22],
      scale: [0.62, 8.7 / 3, 0.62]
    });
  });
  addArchitectureModel(group, {
    asset: BUILDING_ARCHITECTURE.railing,
    name: 'building-lobby-loggia-front-rail',
    position: [0, 0, 23.65],
    scale: [11.8 / 4, 1, 1]
  });
  [-5.95, 5.95].forEach((x, index) => {
    addArchitectureModel(group, {
      asset: BUILDING_ARCHITECTURE.railing,
      name: `building-lobby-loggia-side-rail-${index + 1}`,
      position: [x, 0, 22],
      rotation: [0, Math.PI / 2, 0],
      scale: [3.2 / 4, 1, 1]
    });
  });
  addBuildingLabel(group, {
    name: 'building-lobby-loggia-label',
    title: 'LOGIA',
    subtitle: 'Acceso principal',
    position: [0, 5.95, 23.78],
    size: [4.15, 0.9],
    accent: '#9fd1be',
    rotationY: Math.PI
  });
}

function addBuildingElevator(group) {
  const elevatorDoorZ = BUILDING_LOBBY_ELEVATOR_DOOR_Z - BUILDING_LOBBY_OFFSET.z;
  addArchitectureModel(group, {
    asset: BUILDING_ARCHITECTURE.elevatorShaftShell,
    name: 'building-lobby-elevator-shaft-shell',
    position: [BUILDING_LOBBY_ELEVATOR_LOCAL_X, 0, elevatorDoorZ]
  });
  addArchitectureModel(group, {
    asset: BUILDING_ARCHITECTURE.elevatorPortal,
    name: 'building-lobby-elevator-portal',
    position: [BUILDING_LOBBY_ELEVATOR_LOCAL_X, 0, elevatorDoorZ]
  });
  addElevatorCallStation(group, {
    name: 'building-lobby-elevator-call-station',
    position: [BUILDING_LOBBY_ELEVATOR_LOCAL_X - ELEVATOR_CALL_STATION_OFFSET, 0.28, elevatorDoorZ + 0.42],
    direction: 'up'
  });
  addArchitectureModel(group, {
    asset: BUILDING_ARCHITECTURE.elevatorDoorPanel,
    name: 'building-lobby-elevator-left-door',
    position: [BUILDING_LOBBY_ELEVATOR_LOCAL_X - ELEVATOR_DOOR_CLOSED_OFFSET, 0.18, elevatorDoorZ + 0.13],
    scale: [ELEVATOR_DOOR_PANEL_WIDTH / 3.7, 6.5 / 5.8, 1],
    castShadow: false,
    receiveShadow: false
  });
  addArchitectureModel(group, {
    asset: BUILDING_ARCHITECTURE.elevatorDoorPanel,
    name: 'building-lobby-elevator-right-door',
    position: [BUILDING_LOBBY_ELEVATOR_LOCAL_X + ELEVATOR_DOOR_CLOSED_OFFSET, 0.18, elevatorDoorZ + 0.13],
    scale: [ELEVATOR_DOOR_PANEL_WIDTH / 3.7, 6.5 / 5.8, 1],
    castShadow: false,
    receiveShadow: false
  });
  addBuildingLabel(group, {
    name: 'building-lobby-elevator-sign',
    title: 'ASCENSOR',
    subtitle: 'E  llamar  |  entra caminando',
    position: [BUILDING_LOBBY_ELEVATOR_LOCAL_X, 8.55, elevatorDoorZ + 0.4],
    size: [6.2, 1.08],
    accent: '#9fd1be'
  });
}

function addStudyFloorCirculation(room) {
  const stairCenterX = (STUDY_STAIR_OPENING_MIN_X + STUDY_STAIR_OPENING_MAX_X) / 2;
  const stairwellEndZ = 46.55;
  const stairwellLength = stairwellEndZ - STUDY_ELEVATOR_FACADE_Z;
  const stairwellCenterZ = (STUDY_ELEVATOR_FACADE_Z + stairwellEndZ) / 2;

  STUDY_FRONT_SOLID_SEGMENTS.forEach((segment) => {
    addRepeatedWall(room, {
      name: `building-study-service-wall-${segment.name}`,
      center: [(segment.minX + segment.maxX) / 2, 0, STUDY_ELEVATOR_FACADE_Z],
      length: segment.maxX - segment.minX,
      height: 7.8,
      maxModuleLength: 7.2
    });
  });
  addRepeatedWall(room, {
    name: 'building-study-service-wall-header',
    center: [0, 7.8, STUDY_ELEVATOR_FACADE_Z],
    length: 56,
    height: 8.2,
    maxModuleLength: 8
  });

  [
    { name: 'left', center: [STUDY_STAIR_OPENING_MIN_X - 0.12, -10.3, stairwellCenterZ] },
    { name: 'right', center: [STUDY_STAIR_OPENING_MAX_X + 0.12, -10.3, stairwellCenterZ] }
  ].forEach((wall) => {
    addRepeatedWall(room, {
      name: `building-study-stairwell-${wall.name}-wall`,
      center: wall.center,
      length: stairwellLength,
      height: 18.4,
      rotationY: Math.PI / 2,
      maxModuleLength: 6.9
    });
  });
  addArchitectureModel(room, {
    asset: BUILDING_ARCHITECTURE.ceilingPanel,
    name: 'building-study-stairwell-ceiling',
    position: [stairCenterX, 8.02, stairwellCenterZ],
    scale: [7.78 / 4, 1, stairwellLength / 4],
    castShadow: false
  });
  addRepeatedWall(room, {
    name: 'building-study-stairwell-end-wall',
    center: [stairCenterX, -2.2, 46.55],
    length: 7.78,
    height: 10.3,
    maxModuleLength: 3.89
  });

  const circulationLight = new THREE.PointLight(0x9fddcd, 0.48, 19, 2.1);
  circulationLight.position.set(-2.8, 5.4, 24.2);
  room.add(circulationLight);
  const stairwellNearLight = new THREE.PointLight(0xbff3e4, 1.12, 20, 2.05);
  stairwellNearLight.position.set(stairCenterX, 4.8, 31.6);
  room.add(stairwellNearLight);
  const stairwellFarLight = new THREE.PointLight(0xffd39a, 1.05, 19, 2.05);
  stairwellFarLight.position.set(stairCenterX, 4.8, 41.4);
  room.add(stairwellFarLight);
  const stairwellEndLight = new THREE.PointLight(0xffd39a, 0.72, 11, 2.05);
  stairwellEndLight.position.set(stairCenterX, 3.9, 45.8);
  room.add(stairwellEndLight);

  addArchitectureModel(room, {
    asset: BUILDING_ARCHITECTURE.stairwellPortal,
    name: 'building-study-stair-top-portal',
    position: [stairCenterX, 0, STUDY_ELEVATOR_FACADE_Z + 0.08],
    rotation: [0, Math.PI, 0]
  });

  const elevatorX = STUDY_ELEVATOR_LOCAL_X;
  const elevatorDoorZ = STUDY_ELEVATOR_FACADE_Z;
  addArchitectureModel(room, {
    asset: BUILDING_ARCHITECTURE.elevatorShaftShell,
    name: 'building-study-elevator-shaft-shell',
    position: [elevatorX, 0, elevatorDoorZ],
    rotation: [0, Math.PI, 0]
  });
  addArchitectureModel(room, {
    asset: BUILDING_ARCHITECTURE.elevatorPortal,
    name: 'building-study-elevator-portal',
    position: [elevatorX, 0, elevatorDoorZ],
    rotation: [0, Math.PI, 0]
  });
  addElevatorCallStation(room, {
    name: 'building-study-elevator-call-station',
    position: [elevatorX - ELEVATOR_CALL_STATION_OFFSET, 0.28, elevatorDoorZ - 0.42],
    rotationY: Math.PI,
    direction: 'down'
  });
  addArchitectureModel(room, {
    asset: BUILDING_ARCHITECTURE.elevatorDoorPanel,
    name: 'building-study-elevator-left-door',
    position: [elevatorX - ELEVATOR_DOOR_CLOSED_OFFSET, 0.18, elevatorDoorZ - 0.13],
    rotation: [0, Math.PI, 0],
    scale: [ELEVATOR_DOOR_PANEL_WIDTH / 3.7, 6.5 / 5.8, 1],
    castShadow: false,
    receiveShadow: false
  });
  addArchitectureModel(room, {
    asset: BUILDING_ARCHITECTURE.elevatorDoorPanel,
    name: 'building-study-elevator-right-door',
    position: [elevatorX + ELEVATOR_DOOR_CLOSED_OFFSET, 0.18, elevatorDoorZ - 0.13],
    rotation: [0, Math.PI, 0],
    scale: [ELEVATOR_DOOR_PANEL_WIDTH / 3.7, 6.5 / 5.8, 1],
    castShadow: false,
    receiveShadow: false
  });
  addBuildingLabel(room, {
    name: 'building-study-elevator-label',
    title: 'ASCENSOR',
    subtitle: 'E  llamar  |  entra caminando',
    position: [elevatorX, 8.55, elevatorDoorZ - 0.4],
    size: [6.2, 1.08],
    accent: '#9fcfbe',
    rotationY: Math.PI
  });
}

function addBuildingElevatorCabin(scene) {
  const cabin = new THREE.Group();
  cabin.name = 'building-elevator-moving-cabin';
  cabin.position.set(BUILDING_ELEVATOR_X, BUILDING_LOBBY_OFFSET.y, BUILDING_ELEVATOR_Z);

  addArchitectureModel(cabin, {
    asset: BUILDING_ARCHITECTURE.elevatorCabinShell,
    name: 'building-elevator-cabin-shell',
    castShadow: false,
    receiveShadow: false
  });

  addElevatorCabinDoorPair(
    cabin,
    'positive',
    ELEVATOR_CABIN_HALF_DEPTH - 0.14,
    1
  );
  addElevatorCabinDoorPair(
    cabin,
    'negative',
    -ELEVATOR_CABIN_HALF_DEPTH + 0.14,
    -1
  );

  addArchitectureModel(cabin, {
    asset: BUILDING_ARCHITECTURE.elevatorControlPanel,
    name: 'building-elevator-cabin-control-panel',
    position: [ELEVATOR_CABIN_PANEL.anchorX, ELEVATOR_CABIN_PANEL.anchorY, ELEVATOR_CABIN_PANEL.anchorZ],
    rotation: [0, -Math.PI / 2, 0],
    scale: [ELEVATOR_CABIN_PANEL.scale, ELEVATOR_CABIN_PANEL.scale, ELEVATOR_CABIN_PANEL.scale],
    castShadow: false,
    receiveShadow: false,
    onReady: prepareElevatorInteractiveModel
  });

  const cabinLight = new THREE.PointLight(0xc8f2e7, 1.55, 9, 2);
  cabinLight.position.set(0, 5.45, 0);
  cabin.add(cabinLight);
  scene.add(cabin);
  return cabin;
}

function addElevatorCabinDoorPair(parent, side, z, faceDirection) {
  const doorWidth = ELEVATOR_DOOR_PANEL_WIDTH;
  const closedOffset = ELEVATOR_DOOR_CLOSED_OFFSET;
  const rotationY = faceDirection < 0 ? Math.PI : 0;
  addArchitectureModel(parent, {
    asset: BUILDING_ARCHITECTURE.elevatorDoorPanel,
    name: `building-elevator-cabin-${side}-left-door`,
    position: [-closedOffset, 0.18, z],
    rotation: [0, rotationY, 0],
    scale: [doorWidth / 3.7, 5.76 / 5.8, 1],
    castShadow: false,
    receiveShadow: false
  });
  addArchitectureModel(parent, {
    asset: BUILDING_ARCHITECTURE.elevatorDoorPanel,
    name: `building-elevator-cabin-${side}-right-door`,
    position: [closedOffset, 0.18, z],
    rotation: [0, rotationY, 0],
    scale: [doorWidth / 3.7, 5.76 / 5.8, 1],
    castShadow: false,
    receiveShadow: false
  });
}

function prepareElevatorInteractiveModel(anchor, model) {
  const controls = [];
  const controlNames = [
    ['Elevator_Call_Button', 'call'],
    ['Elevator_Control_P1_Button', 'floor-study'],
    ['Elevator_Control_PB_Button', 'floor-lobby'],
    ['Elevator_Control_Close_Button', 'close']
  ];

  model.traverse((child) => {
    if (!child.isMesh) return;
    const match = controlNames.find(([meshName]) => child.name === meshName);
    if (!match) return;

    if (Array.isArray(child.material)) {
      child.material = child.material.map((material) => material.clone());
    } else if (child.material) {
      child.material = child.material.clone();
    }
    child.userData.elevatorControlId = match[1];
    child.userData.baseScale = child.scale.clone();
    const primaryMaterial = Array.isArray(child.material) ? child.material[0] : child.material;
    child.userData.baseEmissiveIntensity = primaryMaterial?.emissiveIntensity ?? 0;
    controls.push(child);
  });
  anchor.userData.elevatorControls = controls;
}

function updateElevatorControlFeedback(scene, cabin, action, phase, currentFloor, frameTime) {
  const pulse = 0.5 + Math.sin(frameTime * 0.006) * 0.5;
  const lobbyStation = scene.getObjectByName('building-lobby-elevator-call-station');
  const studyStation = scene.getObjectByName('building-study-elevator-call-station');
  const cabinPanel = cabin?.getObjectByName('building-elevator-cabin-control-panel');

  [
    ['lobby', lobbyStation],
    ['study', studyStation]
  ].forEach(([floor, station]) => {
    station?.userData.elevatorControls?.forEach((button) => {
      const isCurrentFloor = floor === currentFloor;
      const isBusy = isCurrentFloor && (phase === 'calling' || phase === 'opening');
      setElevatorButtonFeedback(button, {
        available: isCurrentFloor && phase === 'idle',
        active: isCurrentFloor && action === 'call',
        intensity: isBusy ? 1.35 + pulse * 0.8 : undefined
      });
    });
  });

  cabinPanel?.userData.elevatorControls?.forEach((button) => {
    const controlId = button.userData.elevatorControlId;
    const isClose = controlId === 'close';
    const isFloor = controlId?.startsWith('floor-');
    const targetFloor = isFloor ? controlId.slice('floor-'.length) : null;
    setElevatorButtonFeedback(button, {
      available: (isClose && phase === 'boarding') || (isFloor && phase === 'ready' && targetFloor !== currentFloor),
      active: action === controlId,
      intensity: phase === 'traveling' && targetFloor === currentFloor ? 1.15 + pulse * 0.55 : undefined
    });
  });
}

function setElevatorButtonFeedback(button, { available = false, active = false, intensity } = {}) {
  const targetScale = active ? 1.09 : 1;
  const baseScale = button.userData.baseScale;
  if (baseScale) {
    button.scale.set(
      baseScale.x * targetScale,
      baseScale.y * targetScale,
      baseScale.z * targetScale
    );
  }

  const materials = Array.isArray(button.material) ? button.material : [button.material];
  materials.filter(Boolean).forEach((material) => {
    if (!material.emissive) return;
    material.emissiveIntensity = intensity ?? (active ? 2.6 : available ? 1.15 : 0.28);
  });
}

function addElevatorCallStation(parent, { name, position, rotationY = 0, direction = 'up' }) {
  return addArchitectureModel(parent, {
    asset: BUILDING_ARCHITECTURE.elevatorCallStation,
    name,
    position,
    rotation: [0, rotationY, 0],
    onReady: prepareElevatorInteractiveModel
  });
}

function createBuildingElevatorDoorController(scene) {
  const createFloorDoors = (prefix) => {
    const left = scene.getObjectByName(`building-${prefix}-elevator-left-door`);
    const right = scene.getObjectByName(`building-${prefix}-elevator-right-door`);
    return {
      left,
      right,
      leftClosedX: left?.position.x ?? 0,
      rightClosedX: right?.position.x ?? 0
    };
  };

  return {
    lobby: createFloorDoors('lobby'),
    study: createFloorDoors('study')
  };
}

function createBuildingElevatorCabinDoorController(cabin) {
  const createSideDoors = (side) => {
    const left = cabin?.getObjectByName(`building-elevator-cabin-${side}-left-door`);
    const right = cabin?.getObjectByName(`building-elevator-cabin-${side}-right-door`);
    return {
      left,
      right,
      leftClosedX: left?.position.x ?? 0,
      rightClosedX: right?.position.x ?? 0
    };
  };

  return {
    positive: createSideDoors('positive'),
    negative: createSideDoors('negative')
  };
}

function getElevatorEntrySide(floor) {
  return floor === 'study' ? 'negative' : 'positive';
}

function setBuildingElevatorDoorProgress(controller, floor, openProgress) {
  const doors = controller?.[floor];
  if (!doors) return;
  const progress = clamp(openProgress, 0, 1);
  const slideDistance = ELEVATOR_DOOR_SLIDE_DISTANCE;

  if (doors.left) doors.left.position.x = doors.leftClosedX - slideDistance * progress;
  if (doors.right) doors.right.position.x = doors.rightClosedX + slideDistance * progress;
}

function setAllBuildingElevatorDoors(controller, openProgress) {
  setBuildingElevatorDoorProgress(controller, 'lobby', openProgress);
  setBuildingElevatorDoorProgress(controller, 'study', openProgress);
}

function setBuildingElevatorCabinDoorProgress(controller, side, openProgress) {
  const doors = controller?.[side];
  if (!doors) return;
  const progress = clamp(openProgress, 0, 1);
  const slideDistance = ELEVATOR_DOOR_SLIDE_DISTANCE;

  if (doors.left) doors.left.position.x = doors.leftClosedX - slideDistance * progress;
  if (doors.right) doors.right.position.x = doors.rightClosedX + slideDistance * progress;
}

function setAllBuildingElevatorCabinDoors(controller, openProgress) {
  setBuildingElevatorCabinDoorProgress(controller, 'positive', openProgress);
  setBuildingElevatorCabinDoorProgress(controller, 'negative', openProgress);
}

function addBuildingLabel(parent, { name, title, subtitle, position, size, accent, rotationY = 0 }) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 320;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const background = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  background.addColorStop(0, '#172622');
  background.addColorStop(1, '#0b1211');
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = accent;
  context.fillRect(0, 0, 18, canvas.height);
  context.fillRect(48, canvas.height - 34, 220, 8);
  context.fillStyle = '#fff7df';
  context.font = canvasFont(900, 82);
  context.textBaseline = 'middle';
  context.fillText(title, 54, 116);
  context.fillStyle = 'rgba(231,238,230,0.76)';
  context.font = canvasFont(700, 34);
  String(subtitle)
    .split('\n')
    .slice(0, 2)
    .forEach((line, index) => context.fillText(line, 58, 205 + index * 43));

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(...size),
    new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide })
  );
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.y = rotationY;
  parent.add(mesh);
  return mesh;
}

function addNeighborhood(scene, materials) {
  const { textures } = materials;
  const meadowMaterial = materials.groundMaterial.clone();
  if (meadowMaterial.map) {
    meadowMaterial.map = meadowMaterial.map.clone();
    meadowMaterial.map.repeat.set(120, 120);
    meadowMaterial.map.needsUpdate = true;
  }

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(MEADOW_SIZE, MEADOW_SIZE, 1, 1), meadowMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  ground.receiveShadow = true;
  scene.add(ground);

  addStaticSkyDome(scene);
  addModelNeighborhoodHouses(scene);
  addModelNatureAssets(scene);
  addProfessionalGrassLayer(scene);
  addInfiniteMeadowBackdrop(scene);
  addExteriorIdentityDetails(scene, textures);
  addExteriorCinematicLighting(scene);
}

function addInfiniteMeadowBackdrop(scene) {
  const trunkMaterial = makeMaterial(0x38442f, 0.78);
  const crownMaterials = [
    makeMaterial(0x4f6d45, 0.82),
    makeMaterial(0x5f7b4f, 0.8),
    makeMaterial(0x415f3f, 0.84)
  ];
  const shrubMaterials = [
    makeMaterial(0x6c874e, 0.86),
    makeMaterial(0x80905a, 0.84),
    makeMaterial(0x536f47, 0.88)
  ];
  const flowerMaterials = [
    makeMaterial(0xd7c28a, 0.78),
    makeMaterial(0xe7b7a1, 0.8),
    makeMaterial(0xb9d7df, 0.82)
  ];

  for (let i = 0; i < PERFORMANCE_PROFILE.horizonTrees; i += 1) {
    const angle = (i / PERFORMANCE_PROFILE.horizonTrees) * Math.PI * 2 + ((i * 19) % 11) * 0.012;
    const radius = MEADOW_HORIZON_RADIUS + (i % 7) * 9;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const height = 4.6 + (i % 5) * 0.7;

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, height * 0.48, 5), trunkMaterial);
    trunk.position.set(x, height * 0.24, z);
    scene.add(trunk);

    const crown = new THREE.Mesh(new THREE.ConeGeometry(1.35 + (i % 3) * 0.22, height, 7), crownMaterials[i % crownMaterials.length]);
    crown.position.set(x, height * 0.82, z);
    crown.rotation.y = angle;
    scene.add(crown);
  }

  for (let i = 0; i < PERFORMANCE_PROFILE.horizonShrubs; i += 1) {
    const angle = (i / PERFORMANCE_PROFILE.horizonShrubs) * Math.PI * 2 + ((i * 23) % 13) * 0.01;
    const radius = 42 + (i % 9) * 5.8;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (Math.abs(x) < 28 && Math.abs(z) < 32) continue;

    const shrub = new THREE.Mesh(new THREE.SphereGeometry(0.9 + (i % 4) * 0.12, 8, 5), shrubMaterials[i % shrubMaterials.length]);
    shrub.position.set(x, 0.48, z);
    shrub.scale.y = 0.42 + (i % 3) * 0.08;
    scene.add(shrub);
  }

  for (let i = 0; i < PERFORMANCE_PROFILE.horizonFlowers; i += 1) {
    const x = ((i * 17) % 86) - 43;
    const z = ((i * 29) % 92) - 46;
    const nearHouse = Math.abs(x) < 13 && z < -12;
    if (nearHouse || Math.abs(x) < 5 && z > 3) continue;

    const flower = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.08, 5), flowerMaterials[i % flowerMaterials.length]);
    flower.position.set(x, 0.06, z);
    scene.add(flower);
  }
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

function addModelNeighborhoodHouses(scene) {
  const houseModels = [
    {
      file: 'Two story house-9N6ROCbmO1.glb',
      position: [0, 0, -20],
      targetSize: 19.2,
      rotationY: Math.PI,
      isCasa1: true
    },
    {
      file: 'House.glb',
      position: [-18, 0, -18],
      targetSize: 16.2,
      rotationY: Math.PI,
      isCasa1: false
    },
    {
      file: 'Two story house-sGgL4Nt7I7.glb',
      position: [18, 0, -18],
      targetSize: 16.4,
      rotationY: Math.PI,
      isCasa1: false
    }
  ];
  const fallbackMaterials = createFallbackHouseMaterials();

  houseModels.forEach((config, index) => {
    const url = `${import.meta.env.BASE_URL}models/vendor/poly-pizza/suburban-houses/${encodeURIComponent(config.file)}`;
    modelLoader.load(
      url,
      (gltf) => {
        const root = gltf.scene;
        root.name = `suburban-house-${index + 1}`;
        prepareImportedHouseModel(root);
        fitImportedModel(root, config.targetSize);
        root.rotation.y = config.rotationY;
        root.position.set(config.position[0], config.position[1], config.position[2]);
        scene.add(root);
      },
      undefined,
      () => {
        addNeighborhoodHouse(scene, fallbackMaterials, config.position[0], config.position[2], config.isCasa1);
      }
    );
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
    { position: [-4.7, 2.45, -14.35], color: 0xffd39b, intensity: 0.95, distance: 13 },
    { position: [4.7, 2.45, -14.35], color: 0xffd39b, intensity: 0.95, distance: 13 }
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
  const bladeCount = PERFORMANCE_PROFILE.grassBlades;
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
    const nearHouse = Math.abs(x) < 11.2 && z < -12.5;
    if (nearHouse) continue;

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
  grass.castShadow = false;
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
    background: '#101816',
    accent: '#e0c47a',
    title: 'ESTUDIEMOS ROOM',
    subtitle: 'Casa 1 / foco y estudio'
  });
  sign.position.set(-7.2, 2.45, 5.35);
  sign.rotation.y = 0.24;
  sign.scale.set(4.2, 2.1, 1);
  scene.add(sign);
  addEdges(sign, 0xe0c47a, 0.16);

  [
    { x: -8.85, z: 5.76 },
    { x: -5.55, z: 4.98 }
  ].forEach((postSpec) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.55, 0.2), signPostMaterial);
    post.position.set(postSpec.x, 1.24, postSpec.z);
    post.castShadow = true;
    scene.add(post);
    addEdges(post, 0x111622, 0.2);
  });

  const smallMarker = createCanvasSign({
    width: 384,
    height: 192,
    background: '#111817',
    accent: '#9fc1b0',
    title: 'CASA 1',
    subtitle: 'Computadora + pantalla'
  });
  smallMarker.position.set(5.7, 1.62, -12.8);
  smallMarker.rotation.y = -0.28;
  smallMarker.scale.set(2.45, 1.22, 1);
  scene.add(smallMarker);
  addEdges(smallMarker, 0x9fc1b0, 0.18);

  const markerPost = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.7, 0.16), signPostMaterial);
  markerPost.position.set(5.7, 0.84, -12.8);
  markerPost.castShadow = true;
  scene.add(markerPost);
  addEdges(markerPost, 0x111622, 0.2);
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

function prepareImportedHouseModel(root) {
  root.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = false;
    child.receiveShadow = false;
    if (!child.material) return;

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      softenMaterialColor(material);
      if ('roughness' in material) material.roughness = Math.max(material.roughness ?? 0.64, 0.72);
      if ('metalness' in material) material.metalness = Math.min(material.metalness ?? 0, 0.04);
      if ('envMapIntensity' in material) material.envMapIntensity = 0.16;
      material.side = THREE.FrontSide;
      material.needsUpdate = true;
    });
  });
}

function softenMaterialColor(material) {
  if (!material?.color) return;
  const hsl = {};
  material.color.getHSL(hsl);
  material.color.setHSL(hsl.h, hsl.s * 0.34, Math.min(0.7, hsl.l * 0.9 + 0.03));
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

function addCasa1Interior(scene, textures, hasBuildingCirculation = false) {
  const room = new THREE.Group();
  room.position.set(STUDY_ROOM_ORIGIN_X, 0, STUDY_ROOM_ORIGIN_Z);
  room.visible = false;

  const floorParts = hasBuildingCirculation
    ? [
        { name: 'main', position: [0, 0, -1.4], size: [56, 55.2] },
        ...STUDY_FRONT_SOLID_SEGMENTS.map((segment) => ({
          name: `front-${segment.name}`,
          position: [(segment.minX + segment.maxX) / 2, 0, 27.6],
          size: [segment.maxX - segment.minX, 2.8]
        }))
      ]
    : [{ name: 'main', position: [0, 0, 0], size: [56, 58] }];
  floorParts.forEach((part) => {
    addFloorBacking(room, {
      name: `building-study-floor-backing-${part.name}`,
      size: part.size,
      position: part.position
    });
    addArchitectureModel(room, {
      asset: BUILDING_ARCHITECTURE.floorPanel,
      name: `building-study-floor-${part.name}`,
      position: part.position,
      scale: [part.size[0] / 4, 1.45, part.size[1] / 4],
      castShadow: false
    });
  });

  addFloorInlay(room, {
    name: 'building-study-workstation-inlay',
    size: [11.4, 8.2],
    position: [-11.4, 0, -8.7],
    color: 0x294740
  });
  addFloorInlay(room, {
    name: 'building-study-screen-zone-inlay',
    size: [36, 9.5],
    position: [0, 0, -21.6],
    color: 0x455b56
  });

  [
    { name: 'rear-wall', center: [0, 0, -29], length: 56, rotationY: 0 },
    { name: 'left-wall', center: [-28, 0, 0], length: 58, rotationY: Math.PI / 2 },
    { name: 'right-wall', center: [28, 0, 0], length: 58, rotationY: Math.PI / 2 }
  ].forEach((wall) => {
    addRepeatedWall(room, {
      ...wall,
      name: `building-study-${wall.name}`,
      height: 16,
      maxModuleLength: 8
    });
  });

  if (!hasBuildingCirculation) {
    addRepeatedWall(room, {
      name: 'building-study-front-wall',
      center: [0, 0, 29],
      length: 56,
      height: 16,
      maxModuleLength: 8
    });
  }

  addAgendaBoard(room, getStudyAgendaBoardLines(), textures);
  addStudyComputerStation(room);
  addArchitectureModel(room, {
    asset: BUILDING_ARCHITECTURE.builtInBench,
    name: 'building-study-left-wall-bench',
    position: [-27.1, 0, -13.2],
    rotation: [0, Math.PI / 2, 0]
  });
  [-10.8, -15.2].forEach((z, index) => {
    addArchitectureModel(room, {
      asset: BUILDING_ARCHITECTURE.studyShelf,
      name: `building-study-wall-shelf-${index + 1}`,
      position: [27.15, 0, z],
      rotation: [0, -Math.PI / 2, 0]
    });
  });

  const ceilingColumns = 4;
  const ceilingRows = 3;
  const ceilingWidth = 56 / ceilingColumns;
  const ceilingDepth = 58 / ceilingRows;
  for (let row = 0; row < ceilingRows; row += 1) {
    for (let column = 0; column < ceilingColumns; column += 1) {
      addArchitectureModel(room, {
        asset: BUILDING_ARCHITECTURE.ceilingPanel,
        name: `building-study-ceiling-${row + 1}-${column + 1}`,
        position: [
          -28 + ceilingWidth * (column + 0.5),
          15.9,
          -29 + ceilingDepth * (row + 0.5)
        ],
        scale: [ceilingWidth / 4, 1, ceilingDepth / 4],
        castShadow: false
      });
    }
  }

  addArchitectureModel(room, {
    asset: BUILDING_ARCHITECTURE.giantScreenSurround,
    name: 'building-study-giant-screen-surround',
    position: [0, 0.55, -28.55]
  });

  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = GIANT_SCREEN_DOM_SIZE.width;
  screenCanvas.height = GIANT_SCREEN_DOM_SIZE.height;
  const screenTexture = new THREE.CanvasTexture(screenCanvas);
  screenTexture.colorSpace = THREE.SRGBColorSpace;

  const screenSurface = new THREE.Mesh(
    new THREE.BoxGeometry(GIANT_SCREEN_WORLD.width, GIANT_SCREEN_WORLD.height, 0.12),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: screenTexture,
      emissive: 0xffffff,
      emissiveIntensity: 0.24,
      roughness: 0.28,
      metalness: 0.04
    })
  );
  screenSurface.position.set(0, 8.25, -28.25);
  room.add(screenSurface);

  const keyLight = new THREE.SpotLight(0xffbf75, 2.75, 36, Math.PI / 5.8, 0.55, 1.35);
  keyLight.position.set(-8.2, 7.2, -4.8);
  keyLight.target.position.set(-11.2, 0.85, -8.3);
  keyLight.castShadow = false;
  keyLight.shadow.mapSize.set(512, 512);
  keyLight.shadow.bias = -0.00025;
  room.add(keyLight);
  room.add(keyLight.target);

  const screenBounce = new THREE.PointLight(0x9fd9d0, 0.62, 32, 2.05);
  screenBounce.position.set(0, 7.5, -19);
  room.add(screenBounce);

  const warmRoomFill = new THREE.PointLight(0xffd9a4, 0.72, 38, 2.2);
  warmRoomFill.position.set(11, 8.5, -5);
  room.add(warmRoomFill);

  const ceilingPractical = new THREE.PointLight(0xffe5c2, 0.46, 24, 2);
  ceilingPractical.position.set(0, 13.7, -4);
  room.add(ceilingPractical);

  scene.add(room);
  return { room, canvas: screenCanvas, context: screenCanvas.getContext('2d'), texture: screenTexture, currentScreenStateKey: '' };
}

function addAgendaBoard(room, lines, textures) {
  const board = createCanvasStudyBoard({
    title: 'Agenda',
    lines,
    background: '#111a1a',
    accent: '#e0c47a'
  });
  board.position.set(27.55, 4.3, 0);
  board.rotation.y = -Math.PI / 2;
  board.scale.set(8.4, 7.2, 1);
  room.add(board);

  const frameMaterial = makeMaterial(0x0b1112, 0.68, 0.08, textures.brushedMetal);
  [
    { name: 'back', position: [27.66, 4.3, 0], size: [0.18, 5.72, 8.86] },
    { name: 'top', position: [27.54, 7.2, 0], size: [0.24, 0.2, 8.96] },
    { name: 'bottom', position: [27.54, 1.4, 0], size: [0.24, 0.2, 8.96] }
  ].forEach((part) => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(...part.size), frameMaterial);
    frame.name = `building-study-agenda-frame-${part.name}`;
    frame.position.set(...part.position);
    frame.castShadow = true;
    room.add(frame);
  });
}

function addStudyComputerStation(room) {
  const station = new THREE.Group();
  station.position.set(-11.4, 0, -8.55);

  addArchitectureModel(station, {
    asset: BUILDING_ARCHITECTURE.studyWorkstation,
    name: 'building-study-workstation'
  });

  const monitorTexture = createDeskMonitorTexture(studyAgendaItems);
  const monitorScreen = new THREE.Mesh(
    new THREE.BoxGeometry(2.42, 1.28, 0.04),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: monitorTexture,
      emissive: 0xffffff,
      emissiveIntensity: 0.2,
      roughness: 0.34,
      metalness: 0.02
    })
  );
  monitorScreen.name = 'building-study-workstation-live-screen';
  monitorScreen.position.set(0, 2.42, -0.31);
  station.add(monitorScreen);

  const lampGlow = new THREE.PointLight(0xffc985, 0.82, 7.5, 2.1);
  lampGlow.position.set(-2.42, 2.26, 0.2);
  station.add(lampGlow);

  room.add(station);
}

function createDeskMonitorTexture(agendaItems) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 432;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#111a1a');
  gradient.addColorStop(0.52, '#1d302e');
  gradient.addColorStop(1, '#0d1113');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(255, 211, 132, 0.12)';
  ctx.fillRect(0, 0, canvas.width, 74);
  ctx.fillStyle = '#f5ead1';
  ctx.font = canvasFont(900, 42);
  ctx.fillText('Estudiemos OS', 44, 52);
  ctx.fillStyle = 'rgba(245,234,209,0.66)';
  ctx.font = canvasFont(700, 22);
  ctx.fillText('Agenda sincronizada', 500, 50);

  const monitorItems = agendaItems.filter((item) => !item.completed).slice(0, 3);
  if (monitorItems.length === 0) {
    ctx.fillStyle = 'rgba(255, 211, 132, 0.22)';
    ctx.fillRect(44, 104, 680, 74);
    ctx.fillStyle = '#ffd384';
    ctx.font = canvasFont(900, 28);
    ctx.fillText(agendaItems.length > 0 ? 'OK' : '--:--', 68, 150);
    ctx.fillStyle = '#f5ead1';
    ctx.font = canvasFont(900, 28);
    ctx.fillText(agendaItems.length > 0 ? 'Todo completado' : 'Agenda vacia', 166, 148);
    ctx.fillStyle = 'rgba(245,234,209,0.62)';
    ctx.font = canvasFont(700, 18);
    ctx.fillText(agendaItems.length > 0 ? 'No quedan bloques pendientes' : 'Agrega bloques desde la computadora', 166, 174);
  }

  monitorItems.forEach((item, index) => {
    const y = 134 + index * 84;
    ctx.fillStyle = index === 0 ? 'rgba(255, 211, 132, 0.22)' : 'rgba(255,255,255,0.08)';
    ctx.fillRect(44, y - 44, 680, 62);
    ctx.fillStyle = '#ffd384';
    ctx.font = canvasFont(900, 24);
    ctx.fillText(item.time || '--:--', 68, y - 4);
    ctx.fillStyle = '#f5ead1';
    ctx.font = canvasFont(900, 25);
    ctx.fillText(item.title || 'Bloque sin titulo', 166, y - 5);
    ctx.fillStyle = 'rgba(245,234,209,0.62)';
    ctx.font = canvasFont(700, 17);
    ctx.fillText(item.detail || 'Sin detalle cargado', 166, y + 22);
  });

  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 3;
  for (let x = 44; x < canvas.width; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 92);
    ctx.lineTo(x, canvas.height - 30);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createCanvasSign({ width = 512, height = 256, background, accent, title, subtitle }) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const baseGradient = ctx.createLinearGradient(0, 0, width, height);
  baseGradient.addColorStop(0, background);
  baseGradient.addColorStop(0.55, '#182422');
  baseGradient.addColorStop(1, '#070d0f');
  ctx.fillStyle = baseGradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(255,255,255,0.045)';
  for (let i = 0; i < 18; i += 1) {
    const y = 18 + i * 14;
    ctx.fillRect(34, y, width - 68, 1);
  }

  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(0, height - Math.max(24, height * 0.12), width, Math.max(24, height * 0.12));
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, Math.max(14, width * 0.034), height);
  ctx.fillRect(0, 0, width, Math.max(10, height * 0.04));
  ctx.fillRect(width * 0.08, height * 0.75, width * 0.34, Math.max(4, height * 0.018));

  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = Math.max(4, width * 0.012);
  ctx.strokeRect(width * 0.04, height * 0.08, width * 0.9, height * 0.8);

  ctx.fillStyle = '#fff6dc';
  ctx.font = canvasFont(900, Math.round(height * (title.length > 11 ? 0.16 : 0.2)));
  ctx.shadowColor = 'rgba(0,0,0,0.34)';
  ctx.shadowBlur = 10;
  ctx.fillText(title, width * 0.11, height * 0.47);
  ctx.shadowBlur = 0;
  ctx.font = canvasFont(700, Math.round(height * 0.105));
  ctx.fillStyle = 'rgba(247,241,228,0.76)';
  ctx.fillText(subtitle, width * 0.11, height * 0.66);

  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(width * 0.86, height * 0.24, Math.max(8, height * 0.038), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(width * 0.89, height * 0.24, Math.max(4, height * 0.019), 0, Math.PI * 2);
  ctx.fill();

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

  const surfaceGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  surfaceGradient.addColorStop(0, '#20322f');
  surfaceGradient.addColorStop(0.52, background);
  surfaceGradient.addColorStop(1, '#070b0c');
  ctx.fillStyle = surfaceGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(157,216,200,0.045)';
  for (let i = 0; i < 24; i += 1) {
    ctx.fillRect(42 + i * 18, 110, 1, 214);
  }
  ctx.fillStyle = 'rgba(224,196,122,0.075)';
  ctx.fillRect(0, 0, canvas.width, 18);
  ctx.fillRect(0, 0, 18, canvas.height);
  ctx.fillStyle = accent;
  ctx.fillRect(38, 82, 142, 8);
  ctx.fillStyle = '#fff4d7';
  ctx.font = canvasFont(900, 50);
  ctx.fillText(title, 46, 70);

  lines.forEach((line, index) => {
    const y = 138 + index * 72;
    ctx.fillStyle = index % 2 === 0 ? 'rgba(234,213,143,0.18)' : 'rgba(157,216,200,0.16)';
    ctx.beginPath();
    ctx.roundRect(48, y - 30, 304 + index * 18, 48, 13);
    ctx.fill();
    ctx.fillStyle = index % 2 === 0 ? '#ead58f' : '#9dd8c8';
    ctx.fillRect(62, y - 10, 26, 4);
    ctx.fillStyle = '#f7f1e5';
    ctx.font = canvasFont(800, 24);
    ctx.fillText(line, 104, y + 3);
  });

  ctx.strokeStyle = 'rgba(224,196,122,0.28)';
  ctx.lineWidth = 7;
  ctx.strokeRect(22, 22, canvas.width - 44, canvas.height - 44);
  ctx.strokeStyle = 'rgba(157,216,200,0.18)';
  ctx.lineWidth = 2;
  ctx.strokeRect(34, 34, canvas.width - 68, canvas.height - 68);

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
      updatedAt: screenZones.upper.updatedAt
    },
    lower: {
      videoId: screenZones.lower.videoId,
      contentType: screenZones.lower.contentType,
      resourceUrl: screenZones.lower.resourceUrl,
      title: screenZones.lower.title,
      muted: screenZones.lower.muted,
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

  if (layout.axis === 'columns') {
    const marginX = 34;
    const gap = 28;
    const panelWidth = Math.round((width - marginX * 2 - gap) / 2);
    const panelHeight = Math.min(height - 82, Math.round((panelWidth * 9) / 16));
    const panelY = Math.round((height - panelHeight) / 2);

    layout.slots.forEach((slotConfig, index) => {
      drawGiantScreenZone(ctx, {
        zone: screenZones[slotConfig.zoneId],
        x: marginX + index * (panelWidth + gap),
        y: panelY,
        width: panelWidth,
        height: panelHeight,
        label: slotConfig.label,
        slotLabel: slotConfig.slotLabel,
        accent: slotConfig.accent,
        isPrimary: false
      });
    });

    const dividerX = Math.round(width / 2);
    ctx.fillStyle = '#d7c28a';
    ctx.fillRect(dividerX - 3, panelY - 16, 6, panelHeight + 32);
    ctx.fillStyle = 'rgba(17,22,34,0.72)';
    ctx.fillRect(dividerX - 1, panelY - 16, 2, panelHeight + 32);
    giantScreen.texture.needsUpdate = true;
    return;
  }

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

function clampScreenDisplayScale(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 100;
  return Math.min(100, Math.max(80, Math.round(numeric)));
}

function drawGiantScreenZone(ctx, { zone, x, y, width, height, label, slotLabel, accent, isPrimary }) {
  const hasContent = Boolean(zone.videoId || zone.resourceUrl);
  const contentLabel = zone.contentType === 'pdf' ? 'PDF' : zone.contentType === 'spotify' ? 'SPOTIFY' : 'YOUTUBE';
  const innerX = x + 34;
  const innerY = y + (isPrimary ? 36 : 24);
  const titleSize = isPrimary ? 64 : Math.min(34, Math.max(24, Math.round(width * 0.07)));
  const bodySize = isPrimary ? 28 : Math.min(21, Math.max(16, Math.round(width * 0.04)));
  const textMaxWidth = Math.max(160, width - 68);

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
  ctx.fillRect(innerX, innerY, Math.min(isPrimary ? 520 : 320, textMaxWidth), isPrimary ? 74 : 48);
  ctx.fillStyle = accent;
  ctx.fillRect(innerX, innerY, 10, isPrimary ? 74 : 48);

  ctx.fillStyle = '#ffffff';
  ctx.font = canvasFont(900, isPrimary ? 38 : 22);
  ctx.fillText(label, innerX + 24, innerY + (isPrimary ? 48 : 32), textMaxWidth - 32);

  ctx.fillStyle = hasContent ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.12)';
  ctx.font = canvasFont(900, titleSize);
  ctx.fillText(hasContent ? contentLabel : 'SIN VIDEO', innerX + 3, innerY + (isPrimary ? 165 : 105), textMaxWidth);

  ctx.fillStyle = '#ffffff';
  ctx.font = canvasFont(900, titleSize);
  ctx.fillText(hasContent ? contentLabel : 'SIN VIDEO', innerX, innerY + (isPrimary ? 158 : 100), textMaxWidth);

  ctx.font = canvasFont(750, bodySize);
  ctx.fillStyle = 'rgba(255,255,255,0.86)';
  if (hasContent) {
    ctx.fillText(zone.title ? `Recurso: ${zone.title}` : `Video ID: ${zone.videoId}`, innerX, innerY + (isPrimary ? 205 : 136), textMaxWidth);
    ctx.fillText(
      zone.contentType === 'pdf'
        ? `Documento de Estudiemos - Tamano ${clampScreenDisplayScale(zone.displayScale)}%`
        : zone.contentType === 'spotify'
          ? `Musica de fondo - Tamano ${clampScreenDisplayScale(zone.displayScale)}%`
        : `${zone.muted ? 'Mute activo' : 'Audio activo'} - Volumen ${zone.volume}% - Tamano ${clampScreenDisplayScale(zone.displayScale)}%`,
      innerX,
      innerY + (isPrimary ? 242 : 164),
      textMaxWidth
    );
  } else {
    ctx.fillText(`Canal ${slotLabel} listo para recibir contenido`, innerX, innerY + (isPrimary ? 205 : 136), textMaxWidth);
  }

  ctx.fillStyle = accent;
  ctx.fillRect(x + width - 196, y + height - 48, hasContent ? 128 : 76, 10);
  ctx.fillStyle = 'rgba(255,255,255,0.36)';
  ctx.fillRect(x + width - 196, y + height - 28, hasContent ? 88 : 122, 10);

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
  if (effectiveOpacity <= MIN_EDGE_OPACITY) return null;

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
  gradient.addColorStop(0.62, '#d7ceb8');
  gradient.addColorStop(0.84, '#adb79d');
  gradient.addColorStop(1, '#829177');
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
    ctx.fillStyle = 'rgba(255,255,255,0.58)';
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
    ctx.fillStyle = 'rgba(126, 151, 159, 0.08)';
    ctx.beginPath();
    ctx.ellipse(x + 12 * scale, y + 22 * scale, 116 * scale, 13 * scale, -0.02, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  [
    [150, 76, 0.58, 0.34],
    [470, 104, 0.42, 0.24],
    [900, 86, 0.52, 0.28]
  ].forEach((cloud) => drawCloudCluster(...cloud));

  ctx.fillStyle = 'rgba(80, 101, 88, 0.06)';
  ctx.fillRect(0, canvas.height * 0.84, canvas.width, canvas.height * 0.16);
  const treeLine = ctx.createLinearGradient(0, canvas.height * 0.78, 0, canvas.height);
  treeLine.addColorStop(0, 'rgba(77, 99, 81, 0.015)');
  treeLine.addColorStop(0.5, 'rgba(77, 99, 81, 0.08)');
  treeLine.addColorStop(1, 'rgba(56, 75, 59, 0.14)');
  ctx.fillStyle = treeLine;
  for (let x = -12; x < canvas.width + 20; x += 28) {
    const h = 8 + (Math.abs(x * 13) % 14);
    ctx.beginPath();
    ctx.moveTo(x, canvas.height * 0.88);
    ctx.lineTo(x + 10, canvas.height * 0.88 - h);
    ctx.lineTo(x + 22, canvas.height * 0.88);
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

function raySphereHitDistance(origin, direction, center, radius) {
  const toCenterX = center.x - origin.x;
  const toCenterY = center.y - origin.y;
  const toCenterZ = center.z - origin.z;
  const projected = toCenterX * direction.x + toCenterY * direction.y + toCenterZ * direction.z;
  if (projected < 0) return null;

  const centerDistanceSquared =
    toCenterX * toCenterX + toCenterY * toCenterY + toCenterZ * toCenterZ;
  const closestDistanceSquared = centerDistanceSquared - projected * projected;
  const radiusSquared = radius * radius;
  if (closestDistanceSquared > radiusSquared) return null;

  return Math.max(0, projected - Math.sqrt(radiusSquared - closestDistanceSquared));
}

function dampAngle(current, target, lambda, delta) {
  const deltaAngle = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + deltaAngle * (1 - Math.exp(-lambda * delta));
}
