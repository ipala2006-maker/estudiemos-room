import * as THREE from 'three';

export const Casa1 = {
  id: 'casa-1',
  name: 'Casa 1',
  startPosition: new THREE.Vector3(0, 1.7, 20),
  entrancePosition: new THREE.Vector3(0, 1.7, -13.7),
  interiorSpawnPosition: new THREE.Vector3(90, 1.7, 12),
  interiorExitPosition: new THREE.Vector3(90, 1.7, 20),
  computerPosition: new THREE.Vector3(78, 1.7, -4),
  screenChannels: {
    primaryContent: {
      label: 'Contenido principal',
      slot: 'upper'
    },
    secondaryContent: {
      label: 'Contenido secundario',
      slot: 'lower'
    }
  },
  neighborhoodBounds: {
    minX: -27.5,
    maxX: 27.5,
    minZ: -27.5,
    maxZ: 27.5
  },
  interiorBounds: {
    minX: 62,
    maxX: 118,
    minZ: -36,
    maxZ: 23
  },
  neighborhoodColliders: [
    { minX: -7, maxX: 7, minZ: -27.5, maxZ: -14.25 },
    { minX: -24.8, maxX: -11.7, minZ: -27.5, maxZ: -12.6 },
    { minX: 11.7, maxX: 24.8, minZ: -27.5, maxZ: -12.6 }
  ],
  interiorColliders: [
    { minX: 74.7, maxX: 81.3, minZ: -12.2, maxZ: -7.9 },
    { minX: 64.3, maxX: 76.2, minZ: -26.5, maxZ: -21 },
    { minX: 103.2, maxX: 115.2, minZ: -26.5, maxZ: -20.5 },
    { minX: 95.7, maxX: 102.3, minZ: 5.8, maxZ: 9 },
    { minX: 104.2, maxX: 113.4, minZ: 11.8, maxZ: 18 }
  ],
  style: {
    interiorWall: 0xffffff,
    interiorFloor: 0xf4f6ee,
    exteriorWall: 0xffefbd,
    desk: 0x30344f
  }
};
