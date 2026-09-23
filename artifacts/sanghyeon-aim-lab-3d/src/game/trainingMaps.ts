import * as THREE from 'three';
import type { TrainingMapId } from './types';

export type TrainingMap = {
  id: TrainingMapId;
  name: string;
  callout: string;
  description: string;
};

export type WorldCollider = { minX: number; maxX: number; minZ: number; maxZ: number };
export type TrainingWorld = {
  colliders: WorldCollider[];
  bulletBlockers: THREE.Object3D[];
};

export const TRAINING_MAPS: TrainingMap[] = [
  { id: 'range', name: '사격장', callout: 'MARKSMANSHIP BAY', description: '거리와 높이가 다른 표적으로 정밀 사격을 연습합니다.' },
  { id: 'corridor', name: '코너 코스', callout: 'CLEARING COURSE', description: '코너와 엄폐물을 확인하며 피킹과 브레이킹을 연습합니다.' },
  { id: 'arena', name: '자유 훈련장', callout: 'OPEN COMBAT YARD', description: '넓은 공간에서 자유롭게 움직이고 타겟을 전환합니다.' },
];

const COLORS = {
  floor: '#414b49',
  floorDark: '#293331',
  wall: '#77827d',
  wallLight: '#aab2aa',
  concrete: '#596662',
  concreteDark: '#35413f',
  metal: '#394644',
  trim: '#bd925f',
  accent: '#a9c98f',
  hazard: '#d0a45c',
};

function material(color: string, roughness = 0.82, metalness = 0.08) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

export function buildTrainingWorld(scene: THREE.Scene, mapId: TrainingMapId): TrainingWorld {
  const colliders: WorldCollider[] = [];
  const bulletBlockers: THREE.Object3D[] = [];
  const floorMat = material(COLORS.floor);
  const wallMat = material(COLORS.wall);
  const lightWallMat = material(COLORS.wallLight, 0.72);
  const concreteMat = material(COLORS.concrete);
  const darkConcreteMat = material(COLORS.concreteDark, 0.74);
  const metalMat = material(COLORS.metal, 0.66, 0.14);
  const trimMat = material(COLORS.trim, 0.46, 0.32);
  const accentMat = new THREE.MeshStandardMaterial({
    color: COLORS.accent,
    emissive: '#516d56',
    emissiveIntensity: 0.12,
    roughness: 0.52,
  });
  const hazardMat = material(COLORS.hazard, 0.64, 0.12);

  const addBox = (
    size: [number, number, number],
    position: [number, number, number],
    surface: THREE.Material,
    options: { collider?: boolean; blocksShots?: boolean; castShadow?: boolean } = {},
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), surface);
    mesh.position.set(...position);
    mesh.castShadow = options.castShadow ?? true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    if (options.collider) {
      colliders.push({
        minX: position[0] - size[0] / 2,
        maxX: position[0] + size[0] / 2,
        minZ: position[2] - size[2] / 2,
        maxZ: position[2] + size[2] / 2,
      });
    }
    if (options.blocksShots) bulletBlockers.push(mesh);
    return mesh;
  };

  const addFloor = () => {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const floorInset = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), material('#505b56', 0.94));
    floorInset.rotation.x = -Math.PI / 2;
    floorInset.position.y = 0.008;
    floorInset.receiveShadow = true;
    scene.add(floorInset);

    // Fine joints make the large concrete slab read as a built space, not a grid overlay.
    for (let offset = -12; offset <= 12; offset += 6) {
      addBox([0.018, 0.008, 25], [offset, 0.014, -1], material('#707773', 1), { castShadow: false });
      addBox([25, 0.008, 0.018], [0, 0.014, offset - 1], material('#707773', 1), { castShadow: false });
    }
  };

  const addShell = () => {
    addBox([30, 8, 0.7], [0, 4, -14.65], wallMat, { collider: true, blocksShots: true });
    addBox([0.7, 8, 30], [-14.65, 4, -1], wallMat, { collider: true, blocksShots: true });
    addBox([0.7, 8, 30], [14.65, 4, -1], wallMat, { collider: true, blocksShots: true });
    addBox([30, 0.5, 0.7], [0, 7.85, -1], concreteMat, { castShadow: false });

    // Architectural insets, kick plates and structural ribs break up the long blank walls.
    addBox([29.25, 0.52, 0.075], [0, 0.3, -14.265], darkConcreteMat, { castShadow: false });
    addBox([29.25, 0.16, 0.075], [0, 0.66, -14.265], trimMat, { castShadow: false });
    addBox([0.075, 0.52, 28.8], [-14.265, 0.3, -1], darkConcreteMat, { castShadow: false });
    addBox([0.075, 0.16, 28.8], [-14.265, 0.66, -1], trimMat, { castShadow: false });
    addBox([0.075, 0.52, 28.8], [14.265, 0.3, -1], darkConcreteMat, { castShadow: false });
    addBox([0.075, 0.16, 28.8], [14.265, 0.66, -1], trimMat, { castShadow: false });

    for (const x of [-12, -8, -4, 4, 8, 12]) {
      addBox([0.09, 3.0, 0.09], [x, 2.25, -14.245], metalMat, { castShadow: false });
      addBox([2.4, 1.48, 0.045], [x + (x < 0 ? 1.8 : -1.8), 3.0, -14.245], darkConcreteMat, { castShadow: false });
    }

    for (const z of [-11, -6, -1, 4, 8]) {
      addBox([0.075, 2.65, 3.2], [-14.255, 3.35, z], darkConcreteMat, { castShadow: false });
      addBox([0.06, 0.055, 3.35], [-14.21, 4.72, z], accentMat, { castShadow: false });
      addBox([0.075, 2.65, 3.2], [14.255, 3.35, z], darkConcreteMat, { castShadow: false });
      addBox([0.06, 0.055, 3.35], [14.21, 4.72, z], accentMat, { castShadow: false });
    }

    for (const x of [-12, 0, 12]) {
      addBox([0.13, 0.16, 27], [x, 7.58, -1], metalMat, { castShadow: false });
    }
    for (const z of [-10, 0, 8]) {
      addBox([29, 0.11, 0.14], [0, 7.56, z], metalMat, { castShadow: false });
      addBox([2.2, 0.055, 0.075], [0, 7.42, z], accentMat, { castShadow: false });
    }

    // High windows and broad light panels brighten the space without neon strips.
    for (const x of [-10, -4, 4, 10]) {
      addBox([3.2, 1.15, 0.1], [x, 5.55, -14.24], lightWallMat, { castShadow: false });
      addBox([0.08, 1.3, 0.13], [x - 1.65, 5.55, -14.18], metalMat, { castShadow: false });
      addBox([0.08, 1.3, 0.13], [x + 1.65, 5.55, -14.18], metalMat, { castShadow: false });
    }

    // Entry-side console, visible as the player faces the range.
    addBox([1.55, 1.1, 0.72], [12.65, 0.55, 5.5], metalMat, { collider: true, blocksShots: true });
    addBox([1.34, 0.08, 0.55], [12.65, 1.12, 5.45], trimMat, { castShadow: false });
    addBox([0.92, 0.53, 0.045], [12.65, 1.48, 5.12], accentMat, { castShadow: false });
    addBox([1.95, 0.12, 0.12], [12.65, 0.08, 7.6], hazardMat, { castShadow: false });
  };

  const addCeilingLights = () => {
    for (const x of [-9, -3, 3, 9]) {
      for (const z of [-10, -4, 2, 8]) {
        addBox([2.1, 0.07, 0.72], [x, 7.28, z], lightWallMat, { castShadow: false });
        addBox([1.68, 0.025, 0.4], [x, 7.225, z], accentMat, { castShadow: false });
        const light = new THREE.PointLight('#f5e5cb', 2.1, 8.5, 1.8);
        light.position.set(x, 6.78, z);
        scene.add(light);
      }
    }

    for (const z of [-12, -7, -2, 3, 8]) {
      addBox([0.14, 0.32, 28], [0, 7.08, z], metalMat, { castShadow: false });
    }
  };

  const addMarkings = () => {
    const laneMat = new THREE.MeshStandardMaterial({ color: COLORS.hazard, roughness: 0.9 });
    for (const x of [-9, 9]) {
      addBox([0.055, 0.012, 19], [x, 0.025, -2], laneMat, { castShadow: false });
    }
    for (const z of [5, 0, -5, -10]) {
      addBox([18, 0.012, 0.035], [0, 0.026, z], material('#d7d0be', 0.95), { castShadow: false });
      addBox([0.58, 0.014, 0.12], [0, 0.03, z], hazardMat, { castShadow: false });
    }
    for (const x of [-10, -5, 5, 10]) {
      addBox([0.75, 0.018, 0.75], [x, 0.03, -11.9], trimMat, { castShadow: false });
      addBox([0.5, 0.025, 0.08], [x, 0.042, -11.9], lightWallMat, { castShadow: false });
    }
  };

  addFloor();
  addShell();
  addCeilingLights();

  if (mapId === 'range') {
    addMarkings();
    for (const x of [-10.5, -5.25, 0, 5.25, 10.5]) {
      // Recessed target bays with a warm edge light and a durable lower strike plate.
      addBox([3.8, 3.55, 0.09], [x, 2.72, -14.245], darkConcreteMat, { castShadow: false });
      addBox([3.48, 3.22, 0.055], [x, 2.75, -14.17], concreteMat, { castShadow: false });
      addBox([3.52, 0.045, 0.04], [x, 0.97, -14.125], trimMat, { castShadow: false });
      addBox([0.055, 3.28, 0.045], [x - 1.76, 2.75, -14.12], metalMat, { castShadow: false });
      addBox([0.055, 3.28, 0.045], [x + 1.76, 2.75, -14.12], metalMat, { castShadow: false });
      addBox([0.18, 4.5, 0.32], [x, 2.25, -13.35], darkConcreteMat, { blocksShots: true });
      addBox([1.1, 0.24, 0.7], [x, 0.12, -11.65], concreteMat, { blocksShots: true });
      addBox([0.96, 0.055, 0.045], [x, 0.27, -11.48], trimMat, { castShadow: false });
    }
    for (const x of [-11.5, 11.5]) {
      addBox([3.1, 2.6, 0.16], [x, 3.2, -13.4], lightWallMat, { blocksShots: true });
      addBox([2.82, 0.13, 0.12], [x, 1.82, -13.26], trimMat, { castShadow: false });
    }
  }

  if (mapId === 'corridor') {
    addMarkings();
    // Staggered concrete returns create clear left/right peek angles.
    for (const [x, z, length] of [
      [-5.6, -8.8, 8.4], [5.6, -6.8, 7.8], [-5.6, 1.1, 5.2], [5.6, 2.2, 4.6],
    ] as const) {
      addBox([0.42, 3.2, length], [x, 1.6, z], concreteMat, { collider: true, blocksShots: true });
      addBox([0.48, 0.22, length + 0.12], [x, 3.24, z], trimMat, { castShadow: false });
    }
    for (const [x, z] of [[-2.25, -10.4], [2.15, -7.6], [-2.15, -2.2], [2.2, 2.1]] as const) {
      addBox([1.1, 1.25, 0.68], [x, 0.625, z], darkConcreteMat, { collider: true, blocksShots: true });
      addBox([1.13, 0.075, 0.7], [x, 1.27, z], trimMat, { castShadow: false });
    }
    for (const z of [-11, -4, 3]) {
      addBox([0.2, 0.18, 0.2], [0, 6.15, z], metalMat, { castShadow: true });
      addBox([0.04, 0.08, 0.04], [0, 6.02, z + 0.12], accentMat, { castShadow: false });
    }
  }

  if (mapId === 'arena') {
    addMarkings();
    const coverPositions: Array<[number, number, number, number, number, number]> = [
      [-8, 1.1, -5, 2.5, 2.2, 1.1],
      [-3.3, 0.8, -9.2, 1.7, 1.6, 1.15],
      [3.4, 0.8, -9.4, 1.7, 1.6, 1.15],
      [8, 1.1, -4.7, 2.5, 2.2, 1.1],
      [-5.6, 1.35, 1.8, 2.2, 2.7, 0.9],
      [5.5, 1.35, 2.1, 2.2, 2.7, 0.9],
      [0, 0.65, -2.9, 2.6, 1.3, 1.0],
    ];
    coverPositions.forEach(([x, y, z, width, height, depth], index) => {
      const surface = index % 2 === 0 ? concreteMat : darkConcreteMat;
      addBox([width, height, depth], [x, y, z], surface, { collider: true, blocksShots: true });
      addBox([width + 0.05, 0.1, depth + 0.05], [x, y + height / 2 + 0.04, z], trimMat, { castShadow: false });
    });
    for (const x of [-11, -7, 7, 11]) {
      addBox([0.14, 4.6, 0.14], [x, 2.3, -13.25], darkConcreteMat, { blocksShots: true });
      addBox([1.3, 0.55, 0.8], [x, 0.275, -11.8], concreteMat, { collider: true, blocksShots: true });
    }
  }

  return { colliders, bulletBlockers };
}
