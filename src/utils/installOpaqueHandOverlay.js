import * as THREE from 'three';
import playerHandViewModelUrl from '../assets/player-hand-viewmodel.png';

const INSTALL_FLAG = '__estudiemosOpaqueHandOverlayInstalled';
const HAND_PLANE_NAME = 'illustrated-first-person-hand-plane';
const HAND_OVERLAY_CLASS = 'first-person-hand-viewmodel-overlay';
const FIRST_PERSON_ARM_SWING_SECONDS = 0.26;

const movementKeys = new Set();
const state = {
  element: null,
  frameId: 0,
  lastFrameTime: 0,
  swing: 0,
  lastTransform: ''
};

export function installOpaqueHandOverlay() {
  if (typeof window === 'undefined' || window[INSTALL_FLAG]) return;
  window[INSTALL_FLAG] = true;
  document.documentElement.dataset.estudiemosOpaqueHandOverlay = '0002';

  patchFirstPersonHandMesh();
  window.addEventListener('keydown', handleKeyDown, true);
  window.addEventListener('keyup', handleKeyUp, true);
  state.frameId = window.requestAnimationFrame(updateOverlay);
}

function patchFirstPersonHandMesh() {
  if (THREE.Object3D.prototype.__estudiemosOpaqueHandOverlayAddHooked) return;

  THREE.Object3D.prototype.__estudiemosOpaqueHandOverlayAddHooked = true;
  const originalAdd = THREE.Object3D.prototype.add;

  THREE.Object3D.prototype.add = function addWithOpaqueHandOverlay(...objects) {
    const result = originalAdd.apply(this, objects);
    objects.forEach(hideOriginalHandPlane);
    return result;
  };
}

function hideOriginalHandPlane(object) {
  if (!object) return;

  if (object.name === HAND_PLANE_NAME) {
    object.visible = false;
    object.renderOrder = -100;
    if (object.material) {
      object.material.opacity = 0;
      object.material.depthWrite = false;
    }
  }

  object.traverse?.((child) => {
    if (child !== object) hideOriginalHandPlane(child);
  });
}

function handleKeyDown(event) {
  if (isMovementKey(event.code)) movementKeys.add(event.code);
  if (event.code === 'KeyE' || event.code === 'KeyQ') {
    state.swing = FIRST_PERSON_ARM_SWING_SECONDS;
  }
}

function handleKeyUp(event) {
  if (isMovementKey(event.code)) movementKeys.delete(event.code);
}

function isMovementKey(code) {
  return (
    code === 'KeyW' ||
    code === 'KeyA' ||
    code === 'KeyS' ||
    code === 'KeyD' ||
    code === 'ArrowUp' ||
    code === 'ArrowLeft' ||
    code === 'ArrowDown' ||
    code === 'ArrowRight'
  );
}

function ensureOverlayElement() {
  const mount = document.querySelector('.three-world');
  if (!mount) return null;

  if (state.element && state.element.parentElement === mount) return state.element;

  state.element?.remove();
  const element = document.createElement('img');
  element.className = HAND_OVERLAY_CLASS;
  element.src = playerHandViewModelUrl;
  element.alt = '';
  element.decoding = 'async';
  element.draggable = false;
  element.setAttribute('aria-hidden', 'true');
  Object.assign(element.style, {
    position: 'absolute',
    right: 'clamp(-8px, 1.6vw, 28px)',
    bottom: 'clamp(-40px, -2.6vh, -18px)',
    width: 'clamp(300px, 40vw, 540px)',
    height: 'auto',
    zIndex: '12',
    display: 'block',
    opacity: '1',
    pointerEvents: 'none',
    userSelect: 'none',
    WebkitUserDrag: 'none',
    mixBlendMode: 'normal',
    transformOrigin: '72% 82%',
    willChange: 'transform',
    filter: 'drop-shadow(0 18px 24px rgba(0, 0, 0, 0.28))'
  });

  mount.appendChild(element);
  state.element = element;
  return element;
}

function updateOverlay(frameTime = 0) {
  const element = ensureOverlayElement();
  const delta = state.lastFrameTime > 0 ? Math.min((frameTime - state.lastFrameTime) / 1000, 0.05) : 0;
  state.lastFrameTime = frameTime;
  state.swing = Math.max(0, state.swing - delta);

  if (element) {
    const isWalking = movementKeys.size > 0;
    const bob = isWalking ? Math.sin(frameTime * 0.012) : Math.sin(frameTime * 0.004) * 0.18;
    const swingProgress = state.swing > 0 ? 1 - state.swing / FIRST_PERSON_ARM_SWING_SECONDS : 1;
    const punch = state.swing > 0 ? Math.sin(swingProgress * Math.PI) : 0;
    const xMotion = Math.sin(frameTime * 0.009) * (isWalking ? 9 : 2);
    const yMotion = bob * (isWalking ? 8 : 3) - punch * 14;
    const zMotion = -punch * 10;
    const rotation = punch * 5 + Math.sin(frameTime * 0.004) * 1.2;
    const scale = 1 + punch * 0.035 + (isWalking ? Math.sin(frameTime * 0.012) * 0.012 : 0);
    const transform = `translate3d(${xMotion.toFixed(2)}px, ${(yMotion + zMotion).toFixed(2)}px, 0) rotate(${rotation.toFixed(2)}deg) scale(${scale.toFixed(3)})`;

    if (state.lastTransform !== transform) {
      element.style.transform = transform;
      state.lastTransform = transform;
    }

    element.style.opacity = '1';
    element.style.visibility = 'visible';
  }

  state.frameId = window.requestAnimationFrame(updateOverlay);
}

installOpaqueHandOverlay();
