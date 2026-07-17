import * as THREE from 'three';

export const Casa1 = {
  id: 'casa-1',
  name: 'Casa 1',
  startPosition: new THREE.Vector3(0, 1.7, 20),
  entrancePosition: new THREE.Vector3(0, 1.7, -13.7),
  interiorSpawnPosition: new THREE.Vector3(104, 1.7, -18.5),
  interiorSpawnLookAt: new THREE.Vector3(84, 2.1, -24),
  interiorExitPosition: new THREE.Vector3(90, 1.7, 20),
  computerPosition: new THREE.Vector3(78.6, 1.7, -14.6),
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
    minX: -54,
    maxX: 54,
    minZ: -50,
    maxZ: 34
  },
  interiorBounds: {
    minX: 62,
    maxX: 118,
    minZ: -36,
    maxZ: 23
  },
  style: {
    interiorWall: 0xffffff,
    interiorFloor: 0xf4f6ee,
    exteriorWall: 0xffefbd,
    desk: 0x30344f
  }
};
