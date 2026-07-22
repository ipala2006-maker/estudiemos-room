import * as THREE from 'three';
import { Casa1 } from './Casa1.js';

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
  startPosition: new THREE.Vector3(0, 1.7, 13.5),
  startLookAt: new THREE.Vector3(0, 2.2, -7.5),
  lobbyBounds: {
    minX: -17.2,
    maxX: 17.2,
    minZ: -19.2,
    maxZ: 17.2
  },
  neighborhoodBounds: {
    minX: -17.2,
    maxX: 17.2,
    minZ: -19.2,
    maxZ: 17.2
  },
  lobbyStairsPosition: new THREE.Vector3(-11.1, 8.1, -8.2),
  lobbyStairsArrival: new THREE.Vector3(-11.1, 8.1, -7.25),
  lobbyElevatorPosition: new THREE.Vector3(10.6, 1.7, -14.3),
  lobbyElevatorArrival: new THREE.Vector3(10.6, 1.7, -10.8),
  studyStairsPosition: new THREE.Vector3(76.2, 1.7, 18.1),
  studyStairsArrival: new THREE.Vector3(76.2, 1.7, 14.8),
  studyElevatorPosition: new THREE.Vector3(105.4, 1.7, 18.1),
  studyElevatorArrival: new THREE.Vector3(105.4, 1.7, 14.8),
  floors: BUILDING_FLOORS,
  legacy: Casa1
};

export function getBuildingFloor(floorId) {
  return BUILDING_FLOORS.find((floor) => floor.id === floorId) ?? BUILDING_FLOORS[0];
}
