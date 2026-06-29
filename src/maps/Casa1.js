import * as THREE from 'three';

export const Casa1 = {
  id: 'casa-1',
  name: 'Casa 1',
  startPosition: new THREE.Vector3(0, 1.7, 20),
  entrancePosition: new THREE.Vector3(0, 1.7, -13.7),
  interiorSpawnPosition: new THREE.Vector3(90, 1.7, 16),
  interiorExitPosition: new THREE.Vector3(90, 1.7, 20),
  computerPosition: new THREE.Vector3(78, 1.7, -10),
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
  style: {
    interiorWall: 0xf4f4ef,
    interiorFloor: 0xe8e8df,
    exteriorWall: 0xe7dfc9,
    desk: 0x565656
  }
};
