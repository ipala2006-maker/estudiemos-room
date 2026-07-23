import * as THREE from 'three';
import { Casa1 } from './Casa1.js';

export const BUILDING_FLOOR_HEIGHT = 10;
export const BUILDING_LOBBY_OFFSET = new THREE.Vector3(87.3, -BUILDING_FLOOR_HEIGHT, 32.7);

export const BUILDING_FLOORS = [
  {
    id: 'lobby',
    number: 0,
    shortLabel: 'PB',
    label: 'Lobby',
    description: 'Recepcion y Tienda Salchi'
  },
  {
    id: 'study',
    number: 1,
    shortLabel: 'P1',
    label: 'Sala de estudio',
    description: 'Computadora, agenda, pantalla y audio'
  }
];

export const BuildingWorld = {
  ...Casa1,
  id: 'estudiemos-building',
  name: 'Edificio Estudiemos',
  startPosition: new THREE.Vector3(87.3, -8.3, 48.4),
  startLookAt: new THREE.Vector3(87.3, -7.8, 40.1),
  lobbyBounds: {
    minX: 70.1,
    maxX: 104.5,
    minZ: 13.5,
    maxZ: 49.9
  },
  neighborhoodBounds: {
    minX: 62,
    maxX: 118,
    minZ: -36,
    maxZ: 49.9
  },
  lobbyStairsPosition: new THREE.Vector3(76.2, -8.3, 39.2),
  lobbyStairsArrival: new THREE.Vector3(76.2, -8.3, 41.2),
  lobbyElevatorPosition: new THREE.Vector3(97.9, -8.3, 27.3),
  lobbyElevatorArrival: new THREE.Vector3(97.9, -8.3, 26.2),
  studyStairsPosition: new THREE.Vector3(76.2, 1.7, 19.4),
  studyStairsArrival: new THREE.Vector3(76.2, 1.7, 20.3),
  studyElevatorPosition: new THREE.Vector3(97.9, 1.7, 19.4),
  studyElevatorArrival: new THREE.Vector3(97.9, 1.7, 20.3),
  floors: BUILDING_FLOORS,
  legacy: Casa1
};

export function getBuildingFloor(floorId) {
  return BUILDING_FLOORS.find((floor) => floor.id === floorId) ?? BUILDING_FLOORS[0];
}
