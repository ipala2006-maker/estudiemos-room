"""Validate the modular architecture source and exported GLB files.

Run with:
    blender tools/blender/estudiemos-architecture.blend --background \
      --python tools/blender/validate_architecture.py
"""

from __future__ import annotations

from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[2]
EXPORT_DIR = ROOT / "public" / "models" / "custom" / "architecture"
EXPECTED_MODULES = {
    "wall-solid",
    "wall-door",
    "wall-window",
    "floor-panel",
    "ceiling-panel",
    "column",
    "railing",
    "stair-flight",
    "stair-landing",
    "elevator-portal",
    "elevator-door-panel",
    "elevator-cabin-shell",
    "reception-desk",
    "built-in-bench",
    "entry-portal",
    "giant-screen-surround",
    "study-workstation",
    "shop-counter",
    "study-shelf",
    "architectural-planter",
}
MAX_MODULE_BYTES = 2 * 1024 * 1024
MAX_TOTAL_TRIANGLES = 200_000


def fail(message: str) -> None:
    raise RuntimeError(message)


def validate_mesh_object(module_name: str, obj: bpy.types.Object) -> int:
    mesh = obj.data
    if not mesh.vertices or not mesh.polygons:
        fail(f"{module_name}/{obj.name}: empty mesh")
    if not obj.material_slots or any(slot.material is None for slot in obj.material_slots):
        fail(f"{module_name}/{obj.name}: missing material")
    if any(abs(axis - 1.0) > 0.001 for axis in obj.scale):
        fail(f"{module_name}/{obj.name}: unapplied scale {tuple(obj.scale)}")
    if min(obj.dimensions) <= 0:
        fail(f"{module_name}/{obj.name}: invalid dimensions {tuple(obj.dimensions)}")

    mesh.calc_loop_triangles()
    return len(mesh.loop_triangles)


def main() -> None:
    available = set(bpy.data.collections.keys())
    missing_collections = sorted(EXPECTED_MODULES - available)
    if missing_collections:
        fail(f"Missing module collections: {', '.join(missing_collections)}")

    missing_exports = []
    oversized_exports = []
    total_bytes = 0
    total_triangles = 0

    for module_name in sorted(EXPECTED_MODULES):
        collection = bpy.data.collections[module_name]
        mesh_objects = [obj for obj in collection.all_objects if obj.type == "MESH"]
        if not mesh_objects:
            fail(f"{module_name}: no mesh objects")

        module_triangles = sum(validate_mesh_object(module_name, obj) for obj in mesh_objects)
        total_triangles += module_triangles

        export_path = EXPORT_DIR / f"{module_name}.glb"
        if not export_path.exists():
            missing_exports.append(export_path.name)
            export_bytes = 0
        else:
            export_bytes = export_path.stat().st_size
            total_bytes += export_bytes
            if export_bytes > MAX_MODULE_BYTES:
                oversized_exports.append(export_path.name)

        print(
            f"[OK] {module_name:24} "
            f"objects={len(mesh_objects):3d} "
            f"triangles={module_triangles:6d} "
            f"glb={export_bytes / 1024:7.1f} KiB"
        )

    if missing_exports:
        fail(f"Missing GLB exports: {', '.join(missing_exports)}")
    if oversized_exports:
        fail(f"GLB files over 2 MiB: {', '.join(oversized_exports)}")
    if total_triangles > MAX_TOTAL_TRIANGLES:
        fail(f"Triangle budget exceeded: {total_triangles:,}")

    print(
        f"Validated {len(EXPECTED_MODULES)} modules: "
        f"{total_triangles:,} triangles, {total_bytes / 1024 / 1024:.2f} MiB total."
    )


main()
