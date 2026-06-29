import * as THREE from 'three';

export const Casa1 = {
  id: 'casa-1',
  name: 'Casa 1',
  startPosition: new THREE.Vector3(0, 1.7, 20),
  doorPosition: new THREE.Vector3(0, 1.7, -13.7),
  computerPosition: new THREE.Vector3(-3, 1.7, -23.3),
  bounds: {
    minX: -27.5,
    maxX: 27.5,
    minZ: -27.5,
    maxZ: 27.5
  },
  style: {
    interiorWall: 0xf4f4ef,
    interiorFloor: 0xe8e8df,
    exteriorWall: 0xe7dfc9,
    desk: 0x565656
  }
};
