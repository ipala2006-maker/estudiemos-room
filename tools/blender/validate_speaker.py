"""Validate the editable speaker source and exported GLB."""

from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[2]
GLB_PATH = ROOT / "public" / "models" / "custom" / "study-speaker.glb"


def assert_source() -> None:
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    materials = {slot.material.name for obj in meshes for slot in obj.material_slots if slot.material}
    assert len(meshes) >= 45, f"Expected detailed speaker geometry, found {len(meshes)} meshes"
    assert len(materials) >= 8, f"Expected varied speaker materials, found {len(materials)}"
    assert min(obj.location.z for obj in meshes) >= 0, "Speaker source must remain base aligned"


def assert_export() -> None:
    assert GLB_PATH.exists(), f"Missing export: {GLB_PATH}"
    assert GLB_PATH.stat().st_size > 100_000, "Speaker GLB is unexpectedly small"
    assert GLB_PATH.stat().st_size < 4_000_000, "Speaker GLB is too heavy for the web prototype"

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(GLB_PATH))
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    assert len(meshes) >= 45, f"Export lost geometry: {len(meshes)} meshes"

    min_x = min(point[0] + obj.location.x for obj in meshes for point in obj.bound_box)
    max_x = max(point[0] + obj.location.x for obj in meshes for point in obj.bound_box)
    min_y = min(point[1] + obj.location.y for obj in meshes for point in obj.bound_box)
    max_y = max(point[1] + obj.location.y for obj in meshes for point in obj.bound_box)
    min_z = min(point[2] + obj.location.z for obj in meshes for point in obj.bound_box)
    max_z = max(point[2] + obj.location.z for obj in meshes for point in obj.bound_box)
    dimensions = (max_x - min_x, max_y - min_y, max_z - min_z)
    assert dimensions[0] < 3.3 and dimensions[1] < 2.5 and dimensions[2] < 4.9, (
        f"Unexpected exported dimensions: {dimensions}"
    )


assert_source()
assert_export()
print("Speaker source and GLB validation passed.")
