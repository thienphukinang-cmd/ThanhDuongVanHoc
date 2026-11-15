---
name: three-mesh-bvh
description: Use when implementing accelerated raycasting, spatial hierarchy indexing (BVH), character capsule collisions, wall/stair gliding physics, or constructive solid geometry (CSG Boolean operations via three-bvh-csg) in Three.js.
---

# three-mesh-bvh: Bounding Volume Hierarchy & Spatial Collision System

## Overview
**`three-mesh-bvh`** is an ultra-fast Bounding Volume Hierarchy (BVH) implementation for Three.js. It speeds up raycasting, point-distance queries, camera collision, and character physics from $O(N)$ brute-force down to $O(\log N)$. Together with **`three-bvh-csg`**, it enables fast WebGL Constructive Solid Geometry (Boolean subtraction, union, intersection) in real-time.

Local reference source: `d:\BaoTang3D\skills\three-bvh-csg-main`

---

## When to Use three-mesh-bvh
- Player character / camera walking through museum rooms, stairs, ramps, and doors without clipping through walls or dropping through floors.
- Accelerating mouse click / hover raycasts on complex exhibit models with thousands of triangles.
- Real-time Constructive Solid Geometry (CSG): punching doorway arches, windows, or roof notches procedurally.
- Replacing basic bounding box (`Box3`) collision with accurate triangle-level mesh collisions.

---

## Core Usage & Setup

### 1. Initializing BVH on Meshes
```javascript
import * as THREE from 'three';
import { 
  computeBoundsTree, 
  disposeBoundsTree, 
  acceleratedRaycast 
} from 'three-mesh-bvh';

// Patch Three.js BufferGeometry and Raycaster prototypes
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

// Build BVH for static palace colliders (walls, floors, steps)
export function buildColliderBVH(mesh) {
  if (!mesh.geometry.boundsTree) {
    mesh.geometry.computeBoundsTree({
      maxLeafTris: 10,
      strategy: 0 // CENTER
    });
  }
  return mesh;
}
```

### 2. First-Person Character Capsule Collision
```javascript
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three-stdlib';

export class CharacterCollider {
  constructor(colliderMesh) {
    this.colliderMesh = colliderMesh;
    this.capsuleRadius = 0.4;
    this.capsuleHeight = 1.6;
    this.playerVelocity = new THREE.Vector3();
    this.playerOnGround = false;
  }

  updatePlayer(playerGroup, delta) {
    if (!this.colliderMesh.geometry.boundsTree) return;

    // Gravity
    this.playerVelocity.y -= 9.8 * delta;
    playerGroup.position.addScaledVector(this.playerVelocity, delta);

    // Collision detection using shapecast against BVH
    const tempBox = new THREE.Box3();
    const tempMat = new THREE.Matrix4();
    const tempSegment = new THREE.Line3();

    // Segment representing character capsule spine
    tempSegment.start.copy(playerGroup.position);
    tempSegment.end.copy(playerGroup.position).add(new THREE.Vector3(0, this.capsuleHeight, 0));

    // Transform segment to collider local space
    tempMat.copy(this.colliderMesh.matrixWorld).invert();
    tempSegment.applyMatrix4(tempMat);

    this.colliderMesh.geometry.boundsTree.shapecast({
      intersectsBounds: (box) => {
        return box.intersectsBox(tempBox.setFromCenterAndSize(
          tempSegment.getCenter(new THREE.Vector3()),
          new THREE.Vector3(this.capsuleRadius * 2, this.capsuleHeight + this.capsuleRadius * 2, this.capsuleRadius * 2)
        ));
      },
      intersectsTriangle: (tri) => {
        // Resolve penetration vector against triangle plane
        const closestPoint = new THREE.Vector3();
        tri.closestPointToSegment(tempSegment, closestPoint);
        // Push capsule out of colliding geometry
        // ...
      }
    });
  }
}
```

### 3. Procedural Architecture with CSG (`three-bvh-csg`)
When carving out traditional Vietnamese temple doorways (curved archways) or window louvers from procedural walls:
```javascript
import { Evaluator, Operation, SUBTRACTION } from 'three-bvh-csg';
import * as THREE from 'three';

export function carvePalaceDoorway(wallMesh, doorCutterMesh) {
  const evaluator = new Evaluator();
  evaluator.attributes = ['position', 'normal', 'uv'];

  const wallOp = new Operation(wallMesh.geometry, wallMesh.material);
  const cutterOp = new Operation(doorCutterMesh.geometry, doorCutterMesh.material);
  
  cutterOp.operation = SUBTRACTION;

  const resultMesh = evaluator.evaluate(wallOp, cutterOp);
  resultMesh.geometry.computeVertexNormals();
  return resultMesh;
}
```

---

## Performance Rules
1. **Static vs Dynamic:** Only compute BVH trees once for static architectural models (walls, terrain, stairs).
2. **Dispose Memory:** Always call `geometry.disposeBoundsTree()` when unloading a room or resetting the museum scene to avoid GPU/V8 memory retention.
3. **Merging Geometries:** For best collision performance, merge static room collision meshes using `BufferGeometryUtils.mergeGeometries()` before calling `computeBoundsTree()`.
