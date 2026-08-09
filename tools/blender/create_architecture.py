"""Build the modular Estudiemos Room architecture library.

Run with:
    blender --background --python tools/blender/create_architecture.py

The script owns the source .blend and exports one optimized GLB per reusable
architectural component. Blender uses Z-up; the glTF exporter converts the
assets to the Y-up coordinate system used by Three.js.
"""

from __future__ import annotations

import math
import random
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
TOOLS_DIR = ROOT / "tools" / "blender"
TEXTURE_DIR = TOOLS_DIR / "textures"
EXPORT_DIR = ROOT / "public" / "models" / "custom" / "architecture"
BLEND_PATH = TOOLS_DIR / "estudiemos-architecture.blend"

TEXTURE_SIZE = 256
MODULES: dict[str, bpy.types.Collection] = {}
MATERIALS: dict[str, bpy.types.Material] = {}


def srgb(hex_value: str) -> tuple[float, float, float, float]:
    value = hex_value.lstrip("#")

    def to_linear(channel: str) -> float:
        encoded = int(channel, 16) / 255
        return encoded / 12.92 if encoded <= 0.04045 else ((encoded + 0.055) / 1.055) ** 2.4

    return (
        to_linear(value[0:2]),
        to_linear(value[2:4]),
        to_linear(value[4:6]),
        1.0,
    )


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in list(bpy.data.collections):
        if collection.name != "Collection":
            bpy.data.collections.remove(collection)
    root = bpy.data.collections.get("Collection")
    if root:
        root.name = "Architecture_Library"
    bpy.context.scene.unit_settings.system = "METRIC"
    bpy.context.scene.unit_settings.scale_length = 1.0
    bpy.context.scene.render.engine = "BLENDER_EEVEE"
    bpy.context.scene.world.color = srgb("#d9dfdc")[:3]


def make_texture(
    name: str,
    base_hex: str,
    kind: str,
    seed: int,
) -> bpy.types.Image:
    randomizer = random.Random(seed)
    base = srgb(base_hex)
    pixels: list[float] = []

    for y in range(TEXTURE_SIZE):
        for x in range(TEXTURE_SIZE):
            nx = x / TEXTURE_SIZE
            ny = y / TEXTURE_SIZE
            variation = 0.0

            if kind == "oak":
                grain = math.sin(nx * 70 + math.sin(ny * 9) * 4) * 0.035
                bands = math.sin(nx * 13 + ny * 1.8) * 0.022
                variation = grain + bands + randomizer.uniform(-0.012, 0.012)
            elif kind == "terrazzo":
                variation = randomizer.uniform(-0.018, 0.018)
                cell = ((x * 37 + y * 61 + seed) % 251)
                if cell < 7:
                    variation += 0.13 if cell % 2 else -0.09
            elif kind == "fabric":
                weave = (0.022 if x % 4 == 0 else 0) + (0.018 if y % 5 == 0 else 0)
                variation = weave + randomizer.uniform(-0.01, 0.01)
            elif kind == "metal":
                brushed = math.sin(ny * 145) * 0.018
                variation = brushed + randomizer.uniform(-0.007, 0.007)
            elif kind == "plaster":
                cloud = math.sin(nx * 8) * math.sin(ny * 7) * 0.012
                variation = cloud + randomizer.uniform(-0.01, 0.01)

            pixels.extend(
                (
                    max(0.0, min(1.0, base[0] + variation)),
                    max(0.0, min(1.0, base[1] + variation)),
                    max(0.0, min(1.0, base[2] + variation)),
                    1.0,
                )
            )

    image = bpy.data.images.new(name, width=TEXTURE_SIZE, height=TEXTURE_SIZE, alpha=False)
    image.pixels.foreach_set(pixels)
    image.file_format = "PNG"
    image.filepath_raw = str(TEXTURE_DIR / f"{name}.png")
    image.save()
    image.pack()
    return image


def set_principled_input(node: bpy.types.Node, names: tuple[str, ...], value) -> None:
    for name in names:
        socket = node.inputs.get(name)
        if socket is not None:
            socket.default_value = value
            return


def make_material(
    name: str,
    color: str,
    roughness: float,
    metallic: float = 0.0,
    texture: bpy.types.Image | None = None,
    alpha: float = 1.0,
    emission: str | None = None,
    emission_strength: float = 0.0,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.use_backface_culling = alpha >= 1
    material.diffuse_color = (*srgb(color)[:3], alpha)
    material.metallic = metallic
    material.roughness = roughness

    nodes = material.node_tree.nodes
    links = material.node_tree.links
    principled = nodes.get("Principled BSDF")
    set_principled_input(principled, ("Base Color",), srgb(color))
    set_principled_input(principled, ("Roughness",), roughness)
    set_principled_input(principled, ("Metallic",), metallic)
    set_principled_input(principled, ("Alpha",), alpha)

    if texture:
        texture_node = nodes.new("ShaderNodeTexImage")
        texture_node.name = f"{name}_BaseColor"
        texture_node.image = texture
        texture_node.interpolation = "Linear"
        texture_node.extension = "REPEAT"
        links.new(texture_node.outputs["Color"], principled.inputs["Base Color"])

    if emission:
        set_principled_input(principled, ("Emission Color", "Emission"), srgb(emission))
        set_principled_input(principled, ("Emission Strength",), emission_strength)

    if alpha < 1:
        material.surface_render_method = "DITHERED"
        material.use_transparency_overlap = False

    MATERIALS[name] = material
    return material


def create_materials() -> None:
    TEXTURE_DIR.mkdir(parents=True, exist_ok=True)
    oak = make_texture("oak_warm", "#815a3d", "oak", 11)
    terrazzo = make_texture("terrazzo_greige", "#7f8884", "terrazzo", 23)
    fabric = make_texture("fabric_sage", "#315d54", "fabric", 37)
    metal = make_texture("metal_charcoal", "#273634", "metal", 41)
    plaster = make_texture("plaster_warm", "#c9c7bd", "plaster", 53)

    make_material("Plaster_WarmWhite", "#c9c7bd", 0.76, texture=plaster)
    make_material("Plaster_SoftGrey", "#919b96", 0.7, texture=plaster)
    make_material("Terrazzo_Greige", "#7f8884", 0.66, texture=terrazzo)
    make_material("Stair_Riser_Matte", "#737d79", 0.78)
    make_material("Stair_Nosing_Matte", "#293e3a", 0.48, metallic=0.12)
    make_material("Oak_Warm", "#815a3d", 0.49, texture=oak)
    make_material("Oak_Dark", "#352925", 0.55, texture=oak)
    make_material("Metal_Charcoal", "#273634", 0.3, metallic=0.62, texture=metal)
    make_material("Metal_Black", "#111918", 0.27, metallic=0.56, texture=metal)
    make_material("Metal_BrushedSteel", "#687873", 0.27, metallic=0.76, texture=metal)
    make_material("Metal_GraphiteSatin", "#3b4b48", 0.32, metallic=0.64, texture=metal)
    make_material("Metal_ElevatorDoor", "#657570", 0.38, metallic=0.58, texture=metal)
    make_material("Brass_Satin", "#b28d51", 0.32, metallic=0.7)
    make_material("Sage_Fabric", "#315d54", 0.78, texture=fabric)
    make_material("Sage_Panel", "#3e6a60", 0.57)
    make_material("Glass_Clear", "#a8d1c7", 0.16, metallic=0.02, alpha=0.25)
    make_material("Glass_Smoke", "#385450", 0.2, metallic=0.06, alpha=0.32)
    make_material(
        "Light_Warm",
        "#fff0d2",
        0.28,
        emission="#ffe2aa",
        emission_strength=1.65,
    )
    make_material(
        "Light_Mint",
        "#bde4d9",
        0.3,
        emission="#9dd8c7",
        emission_strength=1.55,
    )
    make_material("Rubber_Dark", "#141b1a", 0.9)


def module_collection(name: str) -> bpy.types.Collection:
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    MODULES[name] = collection
    return collection


def move_to_collection(obj: bpy.types.Object, collection: bpy.types.Collection) -> None:
    for source in list(obj.users_collection):
        source.objects.unlink(obj)
    collection.objects.link(obj)


def assign_material(obj: bpy.types.Object, material_name: str) -> None:
    obj.data.materials.clear()
    obj.data.materials.append(MATERIALS[material_name])


def apply_bevel(obj: bpy.types.Object, width: float, segments: int = 2) -> None:
    if width <= 0:
        return
    modifier = obj.modifiers.new(name="Architectural_Bevel", type="BEVEL")
    modifier.width = width
    modifier.segments = segments
    modifier.limit_method = "ANGLE"
    modifier.harden_normals = True
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)


def box(
    collection: bpy.types.Collection,
    name: str,
    size: tuple[float, float, float],
    location: tuple[float, float, float],
    material: str,
    bevel: float = 0.025,
    rotation: tuple[float, float, float] = (0, 0, 0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign_material(obj, material)
    apply_bevel(obj, min(bevel, min(size) * 0.22), 2)
    move_to_collection(obj, collection)
    return obj


def cylinder(
    collection: bpy.types.Collection,
    name: str,
    radius: float,
    depth: float,
    location: tuple[float, float, float],
    material: str,
    rotation: tuple[float, float, float] = (0, 0, 0),
    vertices: int = 16,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    assign_material(obj, material)
    bevel = obj.modifiers.new(name="Edge_Soften", type="BEVEL")
    bevel.width = min(radius * 0.16, 0.025)
    bevel.segments = 2
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    move_to_collection(obj, collection)
    return obj


def uv_sphere(
    collection: bpy.types.Collection,
    name: str,
    radius: float,
    location: tuple[float, float, float],
    material: str,
    scale: tuple[float, float, float] = (1, 1, 1),
    segments: int = 24,
    rings: int = 12,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments,
        ring_count=rings,
        radius=radius,
        location=location,
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign_material(obj, material)
    move_to_collection(obj, collection)
    return obj


def curve_tube(
    collection: bpy.types.Collection,
    name: str,
    points: tuple[tuple[float, float, float], ...],
    radius: float,
    material: str,
) -> bpy.types.Object:
    curve_data = bpy.data.curves.new(name=f"{name}_Curve", type="CURVE")
    curve_data.dimensions = "3D"
    curve_data.resolution_u = 2
    curve_data.bevel_depth = radius
    curve_data.bevel_resolution = 2
    spline = curve_data.splines.new(type="BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, coordinate in zip(spline.bezier_points, points):
        point.co = coordinate
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve_data)
    curve_data.materials.append(MATERIALS[material])
    collection.objects.link(obj)
    return obj


def triangular_prism(
    collection: bpy.types.Collection,
    name: str,
    x_center: float,
    thickness: float,
    y_min: float,
    y_max: float,
    z_min: float,
    z_max: float,
    material: str,
) -> bpy.types.Object:
    x_min = x_center - thickness / 2
    x_max = x_center + thickness / 2
    vertices = (
        (x_min, y_min, z_min),
        (x_min, y_max, z_min),
        (x_min, y_max, z_max),
        (x_max, y_min, z_min),
        (x_max, y_max, z_min),
        (x_max, y_max, z_max),
    )
    faces = (
        (0, 2, 1),
        (3, 4, 5),
        (0, 1, 4, 3),
        (1, 2, 5, 4),
        (2, 0, 3, 5),
    )
    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(vertices, (), faces)
    mesh.update(calc_edges=True)
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    assign_material(obj, material)
    return obj


def text_mesh(
    collection: bpy.types.Collection,
    name: str,
    text: str,
    location: tuple[float, float, float],
    material: str,
    size: float,
    extrude: float = 0.012,
    align: str = "CENTER",
) -> bpy.types.Object:
    bpy.ops.object.text_add(location=location, rotation=(math.pi / 2, 0, 0))
    obj = bpy.context.object
    obj.name = name
    obj.data.body = text
    obj.data.align_x = align
    obj.data.align_y = "CENTER"
    obj.data.size = size
    obj.data.extrude = extrude
    obj.data.bevel_depth = min(0.006, extrude * 0.35)
    obj.data.materials.append(MATERIALS[material])
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    move_to_collection(obj, collection)
    return obj


def create_wall_solid() -> None:
    c = module_collection("wall-solid")
    # One continuous plaster volume avoids seams, repeated trims and z-fighting.
    box(c, "Wall_Core", (4.0, 0.36, 3.0), (0, 0, 1.5), "Plaster_WarmWhite", 0)


def create_wall_door() -> None:
    c = module_collection("wall-door")
    box(c, "DoorWall_Left", (0.95, 0.34, 3.0), (-1.525, 0, 1.5), "Plaster_WarmWhite", 0.04)
    box(c, "DoorWall_Right", (0.95, 0.34, 3.0), (1.525, 0, 1.5), "Plaster_WarmWhite", 0.04)
    box(c, "DoorWall_Header", (2.1, 0.34, 0.58), (0, 0, 2.71), "Plaster_WarmWhite", 0.035)
    for side in (-1, 1):
        face_y = side * 0.2
        box(c, f"Door_Jamb_Left_{side}", (0.14, 0.1, 2.42), (-1.06, face_y, 1.21), "Metal_Charcoal", 0.018)
        box(c, f"Door_Jamb_Right_{side}", (0.14, 0.1, 2.42), (1.06, face_y, 1.21), "Metal_Charcoal", 0.018)
        box(c, f"Door_Jamb_Head_{side}", (2.26, 0.1, 0.14), (0, face_y, 2.42), "Oak_Warm", 0.018)
    box(c, "Door_Threshold", (2.16, 0.5, 0.075), (0, 0, 0.035), "Brass_Satin", 0.015)


def create_wall_window() -> None:
    c = module_collection("wall-window")
    box(c, "WindowWall_Left", (0.7, 0.34, 3.0), (-1.65, 0, 1.5), "Plaster_WarmWhite", 0.04)
    box(c, "WindowWall_Right", (0.7, 0.34, 3.0), (1.65, 0, 1.5), "Plaster_WarmWhite", 0.04)
    box(c, "WindowWall_Base", (2.6, 0.34, 0.78), (0, 0, 0.39), "Plaster_WarmWhite", 0.04)
    box(c, "WindowWall_Header", (2.6, 0.34, 0.68), (0, 0, 2.66), "Plaster_WarmWhite", 0.04)
    box(c, "Window_Glass", (2.42, 0.08, 1.52), (0, 0, 1.64), "Glass_Clear", 0.01)
    box(c, "Window_Frame_Left", (0.12, 0.19, 1.68), (-1.27, 0, 1.64), "Metal_Charcoal", 0.012)
    box(c, "Window_Frame_Right", (0.12, 0.19, 1.68), (1.27, 0, 1.64), "Metal_Charcoal", 0.012)
    box(c, "Window_Frame_Top", (2.66, 0.19, 0.12), (0, 0, 2.48), "Metal_Charcoal", 0.012)
    box(c, "Window_Frame_Bottom", (2.66, 0.19, 0.12), (0, 0, 0.8), "Metal_Charcoal", 0.012)
    box(c, "Window_Mullion", (0.1, 0.2, 1.54), (0, 0, 1.64), "Brass_Satin", 0.012)
    box(c, "Window_Sill", (2.84, 0.62, 0.1), (0, 0, 0.74), "Oak_Warm", 0.018)


def create_floor_panel() -> None:
    c = module_collection("floor-panel")
    box(c, "Floor_Slab", (4.0, 4.0, 0.24), (0, 0, -0.12), "Terrazzo_Greige", 0)


def create_ceiling_panel() -> None:
    c = module_collection("ceiling-panel")
    box(c, "Ceiling_Slab", (4.0, 4.0, 0.2), (0, 0, 0.1), "Plaster_SoftGrey", 0)
    box(c, "Ceiling_Recess", (3.05, 2.4, 0.055), (0, 0, -0.025), "Sage_Panel", 0.018)
    box(c, "Ceiling_Light", (2.35, 0.24, 0.04), (0, 0, -0.065), "Light_Warm", 0.012)


def create_column() -> None:
    c = module_collection("column")
    box(c, "Column_Core", (0.8, 0.8, 3.0), (0, 0, 1.5), "Plaster_SoftGrey", 0.028)


def create_railing() -> None:
    c = module_collection("railing")
    box(c, "Railing_Top", (4.0, 0.11, 0.11), (0, 0, 1.08), "Metal_Charcoal", 0.025)
    box(c, "Railing_Bottom", (3.88, 0.08, 0.08), (0, 0, 0.16), "Metal_Charcoal", 0.018)
    for x in (-1.92, 1.92):
        box(c, f"Railing_Post_{x}", (0.1, 0.1, 1.04), (x, 0, 0.54), "Metal_Charcoal", 0.022)
    box(c, "Railing_Glass", (3.72, 0.035, 0.72), (0, 0, 0.58), "Glass_Clear", 0.008)


def create_stair_flight() -> None:
    c = module_collection("stair-flight")
    width = 6.6
    run = 15.4
    rise = 10.0
    step_count = 32
    step_depth = run / step_count
    step_rise = rise / step_count

    # One continuous stepped surface replaces the old stack of overlapping
    # treads, risers and under-panels. The stairwell walls close both sides;
    # omitting concave side caps avoids invalid glTF triangulation in WebGL.
    profile: list[tuple[float, float]] = [(-run / 2, 0.0)]
    for index in range(step_count):
        y_min = -run / 2 + step_depth * index
        y_max = y_min + step_depth
        height = step_rise * (index + 1)
        profile.extend(((y_min, height), (y_max, height)))
    half_width = width / 2
    vertices = [(-half_width, y, z) for y, z in profile]
    vertices.extend((half_width, y, z) for y, z in profile)
    profile_size = len(profile)

    faces: list[tuple[int, ...]] = []
    face_materials: list[int] = []
    for index, (point_a, point_b) in enumerate(zip(profile, profile[1:])):
        next_index = index + 1
        is_tread = abs(point_a[1] - point_b[1]) < 0.0001 and point_a[1] > 0
        if is_tread:
            nosing_depth = min(0.1, abs(point_b[0] - point_a[0]) * 0.24)
            split_y = point_a[0] + nosing_depth
            left_split = len(vertices)
            vertices.append((-half_width, split_y, point_a[1]))
            right_split = len(vertices)
            vertices.append((half_width, split_y, point_a[1]))
            faces.extend(
                (
                    (index, left_split, right_split, profile_size + index),
                    (left_split, next_index, profile_size + next_index, right_split),
                )
            )
            face_materials.extend((2, 0))
        else:
            riser_height = point_b[1] - point_a[1]
            if abs(point_a[0] - point_b[0]) < 0.0001 and riser_height > 0.0001:
                strip_height = min(0.065, riser_height * 0.28)
                split_height = point_b[1] - strip_height
                left_split = len(vertices)
                vertices.append((-half_width, point_a[0], split_height))
                right_split = len(vertices)
                vertices.append((half_width, point_a[0], split_height))
                faces.extend(
                    (
                        (index, left_split, right_split, profile_size + index),
                        (left_split, next_index, profile_size + next_index, right_split),
                    )
                )
                face_materials.extend((1, 2))
            else:
                faces.append((index, next_index, profile_size + next_index, profile_size + index))
                face_materials.append(1)

    mesh = bpy.data.meshes.new("StairFlight_Solid_Mesh")
    mesh.from_pydata(vertices, (), faces)
    mesh.materials.append(MATERIALS["Terrazzo_Greige"])
    mesh.materials.append(MATERIALS["Stair_Riser_Matte"])
    mesh.materials.append(MATERIALS["Stair_Nosing_Matte"])
    for polygon, material_index in zip(mesh.polygons, face_materials):
        polygon.material_index = material_index

    mesh.validate(verbose=True)
    normal_mesh = bmesh.new()
    normal_mesh.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(normal_mesh, faces=normal_mesh.faces)
    normal_mesh.to_mesh(mesh)
    normal_mesh.free()
    mesh.update(calc_edges=True)

    uv_layer = mesh.uv_layers.new(name="StairFlight_UV")
    for polygon in mesh.polygons:
        normal = polygon.normal
        for loop_index in polygon.loop_indices:
            vertex = mesh.vertices[mesh.loops[loop_index].vertex_index].co
            if abs(normal.z) >= max(abs(normal.x), abs(normal.y)):
                uv_layer.data[loop_index].uv = (vertex.x / 2, vertex.y / 2)
            elif abs(normal.x) >= abs(normal.y):
                uv_layer.data[loop_index].uv = (vertex.y / 2, vertex.z / 2)
            else:
                uv_layer.data[loop_index].uv = (vertex.x / 2, vertex.z / 2)

    stair = bpy.data.objects.new("StairFlight_Solid", mesh)
    c.objects.link(stair)

    # Thin structural cheeks close the exposed underside from side views while
    # preserving the open walking width and the clean wall-to-stair junction.
    for side in (-1, 1):
        triangular_prism(
            c,
            f"StairFlight_SideSupport_{side}",
            side * (half_width + 0.09),
            0.18,
            -run / 2,
            run / 2,
            0,
            rise,
            "Plaster_SoftGrey",
        )


def create_stair_landing() -> None:
    c = module_collection("stair-landing")
    # Matches the room threshold to the first tread exactly. The previous
    # oversized slab overlapped the flight and could shimmer at grazing angles.
    depth = 4.6
    box(c, "Landing_Slab", (7.0, depth, 0.26), (0, 0, -0.13), "Terrazzo_Greige", 0.012)


def create_stairwell_portal() -> None:
    c = module_collection("stairwell-portal")
    width = 7.8
    height = 7.8
    box(c, "StairPortal_Left", (0.46, 0.66, height), (-3.67, 0, height / 2), "Plaster_SoftGrey", 0.018)
    box(c, "StairPortal_Right", (0.46, 0.66, height), (3.67, 0, height / 2), "Plaster_SoftGrey", 0.018)
    box(c, "StairPortal_Header", (width, 0.66, 0.46), (0, 0, height - 0.23), "Plaster_SoftGrey", 0.018)
    box(c, "StairPortal_Light", (3.5, 0.16, 0.07), (0, -0.38, height - 0.56), "Light_Warm", 0.012)


def create_elevator_shaft_shell() -> None:
    c = module_collection("elevator-shaft-shell")
    width = 10.9
    depth = 6.6
    height = 9.25
    wall = 0.34
    front_opening = 8.3
    front_fill = (width - front_opening) / 2

    for x in (-width / 2 + wall / 2, width / 2 - wall / 2):
        box(
            c,
            f"Shaft_SideClosure_{x}",
            (wall - 0.06, depth + 0.08, height + 0.06),
            (x, depth / 2, height / 2 - 0.01),
            "Plaster_WarmWhite",
            0,
        )
        box(c, f"Shaft_Side_{x}", (wall, depth, height), (x, depth / 2, height / 2), "Plaster_WarmWhite", 0.018)

    box(
        c,
        "Shaft_BackClosure",
        (width + 0.08, wall - 0.06, height + 0.06),
        (0, depth - wall / 2, height / 2 - 0.01),
        "Plaster_WarmWhite",
        0,
    )
    box(c, "Shaft_BackWall", (width, wall, height), (0, depth - wall / 2, height / 2), "Plaster_WarmWhite", 0.018)
    box(c, "Shaft_Ceiling", (width, depth, 0.24), (0, depth / 2, height - 0.12), "Plaster_SoftGrey", 0.016)
    box(c, "Shaft_CeilingLight", (5.4, 0.48, 0.055), (0, depth / 2, height - 0.27), "Light_Mint", 0.012)

    for side in (-1, 1):
        x = side * (front_opening / 2 + front_fill / 2)
        box(
            c,
            f"Shaft_FrontPierClosure_{side}",
            (front_fill + 0.08, 0.44, height + 0.06),
            (x, 0.22, height / 2 - 0.01),
            "Plaster_WarmWhite",
            0,
        )
        box(c, f"Shaft_FrontPier_{side}", (front_fill, 0.52, height), (x, 0.2, height / 2), "Plaster_WarmWhite", 0.018)
    box(c, "Shaft_FrontHeaderClosure", (width + 0.08, 0.44, 1.16), (0, 0.22, 8.68), "Plaster_WarmWhite", 0)
    box(c, "Shaft_FrontHeader", (width, 0.52, 1.1), (0, 0.2, 8.7), "Plaster_WarmWhite", 0.018)


def create_elevator_portal() -> None:
    c = module_collection("elevator-portal")
    # The portal is recessed into the wall: broad plaster piers and one slim
    # metal jamb avoid the old freestanding black block.
    box(c, "Portal_Closure_Left", (1.46, 0.62, 7.84), (-4.84, 0.04, 3.92), "Plaster_WarmWhite", 0)
    box(c, "Portal_Closure_Right", (1.46, 0.62, 7.84), (4.84, 0.04, 3.92), "Plaster_WarmWhite", 0)
    box(c, "Portal_Closure_Header", (11.08, 0.62, 0.78), (0, 0.04, 7.58), "Plaster_WarmWhite", 0)
    box(c, "Portal_Left", (1.3, 0.7, 7.72), (-4.82, 0, 3.86), "Plaster_SoftGrey", 0.018)
    box(c, "Portal_Right", (1.3, 0.7, 7.72), (4.82, 0, 3.86), "Plaster_SoftGrey", 0.018)
    box(c, "Portal_Header", (10.94, 0.7, 0.64), (0, 0, 7.56), "Plaster_SoftGrey", 0.018)
    box(c, "Portal_InnerJamb_Left", (0.2, 0.76, 7.08), (-4.22, -0.02, 3.54), "Metal_GraphiteSatin", 0.018)
    box(c, "Portal_InnerJamb_Right", (0.2, 0.76, 7.08), (4.22, -0.02, 3.54), "Metal_GraphiteSatin", 0.018)
    box(c, "Portal_InnerJamb_Header", (8.64, 0.76, 0.2), (0, -0.02, 7.02), "Metal_GraphiteSatin", 0.018)
    box(c, "Portal_Threshold", (8.74, 0.86, 0.1), (0, -0.04, 0.045), "Metal_Charcoal", 0.012)
    box(c, "Portal_Light", (4.8, 0.18, 0.08), (0, -0.46, 7.28), "Light_Mint", 0.015)


def create_elevator_door_panel() -> None:
    c = module_collection("elevator-door-panel")
    box(c, "Elevator_Door_Core", (3.7, 0.18, 5.84), (0, 0, 2.92), "Metal_BrushedSteel", 0.014)
    box(c, "Elevator_Door_Face", (3.5, 0.035, 5.58), (0, -0.105, 2.92), "Metal_ElevatorDoor", 0.01)


def create_elevator_cabin_shell() -> None:
    c = module_collection("elevator-cabin-shell")
    width = 8.4
    depth = 6.2
    height = 6.2
    box(c, "Cabin_Floor", (width, depth, 0.22), (0, 0, -0.11), "Metal_Charcoal", 0.014)
    box(c, "Cabin_Floor_Inlay", (6.95, 4.78, 0.035), (0, 0, 0.025), "Sage_Panel", 0.08)
    for x in (-width / 2 + 0.09, width / 2 - 0.09):
        box(c, f"Cabin_Side_{x}", (0.2, depth, height), (x, 0, height / 2), "Plaster_SoftGrey", 0.016)
        inner_x = x - math.copysign(0.115, x)
        box(c, f"Cabin_SideInset_{x}", (0.045, 4.7, 2.1), (inner_x, 0, 2.65), "Sage_Panel", 0.035)
        if x < 0:
            cylinder(
                c,
                f"Cabin_Handrail_{x}",
                0.075,
                depth - 0.9,
                (x - math.copysign(0.18, x), 0, 1.32),
                "Oak_Warm",
                rotation=(math.pi / 2, 0, 0),
                vertices=16,
            )
    box(c, "Cabin_Ceiling", (width, depth, 0.2), (0, 0, height + 0.1), "Plaster_SoftGrey", 0.016)
    box(c, "Cabin_Ceiling_Recess", (6.9, 4.9, 0.055), (0, 0, height - 0.03), "Sage_Panel", 0.018)
    box(c, "Cabin_Light", (4.6, 0.48, 0.045), (0, 0, height - 0.08), "Light_Mint", 0.014)


def create_elevator_call_station() -> None:
    c = module_collection("elevator-call-station")

    box(c, "CallStation_WallGasket", (1.02, 0.08, 1.78), (0, 0.055, 0.89), "Rubber_Dark", 0.055)
    box(c, "CallStation_Housing", (0.9, 0.2, 1.66), (0, 0, 0.86), "Metal_BrushedSteel", 0.095)
    box(c, "CallStation_Face", (0.72, 0.075, 1.43), (0, -0.13, 0.86), "Metal_Black", 0.06)
    box(c, "CallStation_Display", (0.48, 0.035, 0.25), (0, -0.185, 1.39), "Glass_Smoke", 0.035)
    box(c, "CallStation_StatusLight", (0.3, 0.025, 0.045), (0, -0.207, 1.39), "Light_Mint", 0.012)

    cylinder(
        c,
        "CallStation_ButtonOuter",
        0.255,
        0.115,
        (0, -0.19, 0.78),
        "Brass_Satin",
        rotation=(math.pi / 2, 0, 0),
        vertices=32,
    )
    cylinder(
        c,
        "CallStation_ButtonBezel",
        0.205,
        0.13,
        (0, -0.215, 0.78),
        "Metal_Charcoal",
        rotation=(math.pi / 2, 0, 0),
        vertices=32,
    )
    cylinder(
        c,
        "Elevator_Call_Button",
        0.155,
        0.145,
        (0, -0.24, 0.78),
        "Light_Mint",
        rotation=(math.pi / 2, 0, 0),
        vertices=32,
    )

    box(c, "CallStation_ArrowLeft", (0.18, 0.035, 0.055), (-0.058, -0.322, 0.79), "Metal_Black", 0.012, rotation=(0, math.radians(-42), 0))
    box(c, "CallStation_ArrowRight", (0.18, 0.035, 0.055), (0.058, -0.322, 0.79), "Metal_Black", 0.012, rotation=(0, math.radians(42), 0))
    text_mesh(c, "CallStation_Label", "LLAMAR", (0, -0.205, 0.32), "Plaster_WarmWhite", 0.16, 0.008)

    for x in (-0.33, 0.33):
        for z in (0.18, 1.53):
            cylinder(
                c,
                f"CallStation_Fastener_{x}_{z}",
                0.026,
                0.045,
                (x, -0.185, z),
                "Brass_Satin",
                rotation=(math.pi / 2, 0, 0),
                vertices=16,
            )


def create_elevator_control_panel() -> None:
    c = module_collection("elevator-control-panel")

    box(c, "ControlPanel_WallGasket", (1.4, 0.08, 2.24), (0, 0.055, 1.12), "Rubber_Dark", 0.07)
    box(c, "ControlPanel_Housing", (1.28, 0.2, 2.12), (0, 0, 1.08), "Metal_BrushedSteel", 0.1)
    box(c, "ControlPanel_Face", (1.08, 0.075, 1.9), (0, -0.132, 1.08), "Metal_Black", 0.065)
    box(c, "ControlPanel_Display", (0.82, 0.035, 0.28), (0, -0.184, 1.83), "Glass_Smoke", 0.035)
    text_mesh(c, "ControlPanel_DisplayText", "PISO", (-0.25, -0.21, 1.83), "Light_Mint", 0.13, 0.006, "LEFT")
    box(c, "ControlPanel_DisplayBar", (0.22, 0.025, 0.04), (0.31, -0.214, 1.83), "Light_Mint", 0.01)

    button_specs = (
        ("P1", 1.38, "Elevator_Control_P1_Button", "Light_Mint"),
        ("PB", 0.95, "Elevator_Control_PB_Button", "Light_Warm"),
    )
    for label, z, button_name, light_material in button_specs:
        cylinder(
            c,
            f"{button_name}_Outer",
            0.2,
            0.105,
            (-0.27, -0.19, z),
            "Brass_Satin",
            rotation=(math.pi / 2, 0, 0),
            vertices=32,
        )
        cylinder(
            c,
            button_name,
            0.145,
            0.14,
            (-0.27, -0.238, z),
            light_material,
            rotation=(math.pi / 2, 0, 0),
            vertices=32,
        )
        text_mesh(c, f"{button_name}_Label", label, (0.2, -0.205, z), "Plaster_WarmWhite", 0.2, 0.008)

    box(c, "ControlPanel_DoorCloseBezel", (0.84, 0.12, 0.34), (0, -0.19, 0.43), "Brass_Satin", 0.1)
    box(c, "Elevator_Control_Close_Button", (0.72, 0.1, 0.24), (0, -0.255, 0.43), "Light_Warm", 0.075)
    box(c, "ControlPanel_CloseArrowLeft", (0.2, 0.03, 0.05), (-0.12, -0.32, 0.43), "Metal_Black", 0.01, rotation=(0, math.radians(35), 0))
    box(c, "ControlPanel_CloseArrowRight", (0.2, 0.03, 0.05), (0.12, -0.32, 0.43), "Metal_Black", 0.01, rotation=(0, math.radians(-35), 0))
    text_mesh(c, "ControlPanel_CloseLabel", "CERRAR", (0, -0.205, 0.18), "Plaster_WarmWhite", 0.13, 0.006)

    for x in (-0.48, 0.48):
        for z in (0.16, 2.0):
            cylinder(
                c,
                f"ControlPanel_Fastener_{x}_{z}",
                0.026,
                0.045,
                (x, -0.185, z),
                "Brass_Satin",
                rotation=(math.pi / 2, 0, 0),
                vertices=16,
            )


def create_lobby_circulation_screen() -> None:
    c = module_collection("lobby-circulation-screen")
    width = 5.0
    box(c, "CirculationScreen_Plinth", (width, 0.46, 0.64), (0, 0, 0.32), "Oak_Dark", 0.09)
    box(c, "CirculationScreen_Body", (width - 0.16, 0.34, 1.55), (0, 0, 1.37), "Plaster_SoftGrey", 0.075)
    box(c, "CirculationScreen_Inset", (width - 0.52, 0.07, 0.98), (0, -0.205, 1.42), "Sage_Panel", 0.045)
    box(c, "CirculationScreen_Top", (width + 0.12, 0.54, 0.15), (0, 0, 2.21), "Oak_Warm", 0.055)
    box(c, "CirculationScreen_Light", (2.4, 0.035, 0.055), (0.92, -0.245, 1.88), "Light_Mint", 0.014)
    text_mesh(c, "CirculationScreen_Title", "ESCALERAS", (-1.98, -0.25, 1.57), "Plaster_WarmWhite", 0.24, 0.008, "LEFT")
    text_mesh(c, "CirculationScreen_Subtitle", "PISO 1", (-1.98, -0.25, 1.18), "Light_Warm", 0.17, 0.006, "LEFT")
    for x in (-2.24, 2.24):
        box(c, f"CirculationScreen_EndCap_{x}", (0.14, 0.5, 2.05), (x, 0, 1.16), "Metal_Charcoal", 0.025)


def create_reception_desk() -> None:
    c = module_collection("reception-desk")
    box(c, "Reception_Base", (4.7, 1.55, 0.85), (0, 0, 0.425), "Oak_Dark", 0.12)
    box(c, "Reception_Front", (4.35, 0.22, 1.12), (0, -0.72, 0.64), "Sage_Panel", 0.08, rotation=(math.radians(-4), 0, 0))
    box(c, "Reception_Top", (4.95, 1.78, 0.14), (0, 0, 1.02), "Terrazzo_Greige", 0.07)
    box(c, "Reception_Worktop", (3.35, 0.95, 0.11), (0.45, 0.12, 1.13), "Oak_Warm", 0.055)
    for x in (-1.72, -0.86, 0, 0.86, 1.72):
        box(c, f"Reception_Rib_{x}", (0.08, 0.08, 0.72), (x, -0.86, 0.57), "Brass_Satin", 0.015)
    box(c, "Reception_Kick", (3.95, 0.1, 0.1), (0, -0.82, 0.16), "Metal_Black", 0.02)


def create_built_in_bench() -> None:
    c = module_collection("built-in-bench")
    box(c, "Bench_Platform", (4.8, 1.18, 0.28), (0, 0, 0.46), "Oak_Dark", 0.08)
    box(c, "Bench_Seat", (4.5, 1.05, 0.24), (0, -0.03, 0.72), "Sage_Fabric", 0.1)
    box(c, "Bench_Back", (4.5, 0.24, 1.18), (0, 0.47, 1.25), "Sage_Fabric", 0.11, rotation=(math.radians(-6), 0, 0))
    for x in (-1.65, 0, 1.65):
        box(c, f"Bench_Leg_{x}", (0.16, 0.82, 0.46), (x, 0, 0.23), "Metal_Charcoal", 0.035)
    box(c, "Bench_BackRail", (4.72, 0.13, 0.13), (0, 0.6, 1.78), "Oak_Warm", 0.035)


def create_entry_portal() -> None:
    c = module_collection("entry-portal")
    box(c, "Entry_Left", (0.38, 0.5, 7.1), (-3.92, 0, 3.55), "Metal_Charcoal", 0.055)
    box(c, "Entry_Right", (0.38, 0.5, 7.1), (3.92, 0, 3.55), "Metal_Charcoal", 0.055)
    box(c, "Entry_Header", (8.22, 0.5, 0.38), (0, 0, 7.02), "Metal_Charcoal", 0.055)
    box(c, "Entry_Glass_Left", (3.65, 0.06, 6.55), (-1.88, 0, 3.36), "Glass_Clear", 0.012)
    box(c, "Entry_Glass_Right", (3.65, 0.06, 6.55), (1.88, 0, 3.36), "Glass_Clear", 0.012)
    for x in (-1.88, 1.88):
        box(c, f"Entry_Handle_{x}", (0.1, 0.22, 1.0), (x + math.copysign(0.55, -x), -0.18, 3.05), "Metal_BrushedSteel", 0.025)
    box(c, "Entry_Threshold", (8.0, 0.88, 0.12), (0, 0, 0.055), "Terrazzo_Greige", 0.025)
    box(c, "Entry_Canopy_Light", (5.2, 0.2, 0.07), (0, -0.48, 7.32), "Light_Warm", 0.02)


def create_giant_screen_surround() -> None:
    c = module_collection("giant-screen-surround")
    width = 50.6
    height = 15.4
    frame = 0.5
    # A recessed acoustic backer makes the display read as one intentional
    # installation instead of a dark rectangle floating on a blank wall.
    box(c, "Screen_AcousticBacker", (52.2, 0.18, 16.2), (0, 0.2, 8.1), "Sage_Panel", 0.16)
    box(c, "Screen_Frame_Left", (frame, 0.48, height), (-width / 2 + frame / 2, 0, height / 2), "Metal_GraphiteSatin", 0.045)
    box(c, "Screen_Frame_Right", (frame, 0.48, height), (width / 2 - frame / 2, 0, height / 2), "Metal_GraphiteSatin", 0.045)
    box(c, "Screen_Frame_Top", (width - frame * 2, 0.48, frame), (0, 0, height - frame / 2), "Metal_GraphiteSatin", 0.045)
    box(c, "Screen_Frame_Bottom", (width - frame * 2, 0.48, frame), (0, 0, frame / 2), "Metal_GraphiteSatin", 0.045)
    box(c, "Screen_Low_Console", (39.5, 0.86, 0.38), (0, 0.3, 0.22), "Oak_Dark", 0.06)
    box(c, "Screen_Low_Console_Top", (39.1, 0.72, 0.08), (0, 0.3, 0.46), "Oak_Warm", 0.025)


def create_study_workstation() -> None:
    c = module_collection("study-workstation")
    box(c, "Workstation_DesktopCore", (6.48, 2.4, 0.17), (0, 0, 1.02), "Oak_Dark", 0.06)
    box(c, "Workstation_Desktop", (6.36, 2.28, 0.2), (0, -0.01, 1.12), "Oak_Warm", 0.105)
    box(c, "Workstation_Desktop_Inlay", (5.76, 0.045, 0.035), (0, -1.165, 1.17), "Brass_Satin", 0.009)
    box(c, "Workstation_CableTray", (3.65, 0.52, 0.16), (0.15, 0.48, 0.79), "Metal_Charcoal", 0.04)
    for x in (-2.82, 2.82):
        box(c, f"Workstation_Leg_{x}", (0.22, 1.72, 0.88), (x, 0.04, 0.53), "Metal_Charcoal", 0.055)
        box(c, f"Workstation_LegInset_{x}", (0.12, 1.38, 0.62), (x, 0.04, 0.53), "Sage_Panel", 0.035)
        box(c, f"Workstation_Foot_{x}_Front", (0.48, 0.48, 0.08), (x, -0.65, 0.04), "Rubber_Dark", 0.028)
        box(c, f"Workstation_Foot_{x}_Back", (0.48, 0.48, 0.08), (x, 0.65, 0.04), "Rubber_Dark", 0.028)
    box(c, "Workstation_Drawer", (1.08, 1.46, 0.82), (-2.2, 0.05, 0.51), "Oak_Dark", 0.075)
    for z in (0.38, 0.67):
        box(c, f"Workstation_DrawerFront_{z}", (0.9, 0.08, 0.24), (-2.2, -0.72, z), "Sage_Panel", 0.045)
        cylinder(c, f"Workstation_DrawerPull_{z}", 0.045, 0.38, (-2.2, -0.8, z), "Brass_Satin", rotation=(0, math.pi / 2, 0), vertices=16)

    box(c, "Workstation_Monitor_Base", (1.42, 0.76, 0.09), (0, 0.12, 1.26), "Metal_Charcoal", 0.055)
    cylinder(c, "Workstation_Monitor_Pivot", 0.19, 0.2, (0, 0.37, 1.47), "Brass_Satin", rotation=(math.pi / 2, 0, 0), vertices=24)
    box(c, "Workstation_Monitor_Stem", (0.18, 0.18, 0.75), (0, 0.36, 1.67), "Metal_Charcoal", 0.05, rotation=(0, math.radians(-6), 0))
    box(c, "Workstation_Monitor_Frame", (2.86, 0.22, 1.7), (0, 0.49, 2.42), "Metal_Black", 0.115)
    box(c, "Workstation_Monitor_Recess", (2.5, 0.06, 1.34), (0, 0.36, 2.42), "Glass_Smoke", 0.055)
    box(c, "Workstation_Monitor_Chin", (1.0, 0.045, 0.08), (0, 0.35, 1.66), "Brass_Satin", 0.018)
    cylinder(c, "Workstation_Monitor_Camera", 0.035, 0.035, (0, 0.34, 3.18), "Light_Mint", rotation=(math.pi / 2, 0, 0), vertices=16)

    box(c, "Workstation_Tower", (0.9, 1.04, 1.43), (2.33, 0.15, 0.76), "Metal_Black", 0.105)
    box(c, "Workstation_TowerInset", (0.67, 0.055, 1.12), (2.33, -0.395, 0.79), "Sage_Panel", 0.05)
    for row in range(5):
        box(c, f"Workstation_TowerVent_{row}", (0.5, 0.03, 0.035), (2.33, -0.43, 0.43 + row * 0.13), "Metal_BrushedSteel", 0.008)
    cylinder(c, "Workstation_TowerButtonRing", 0.105, 0.06, (2.33, -0.43, 1.19), "Brass_Satin", rotation=(math.pi / 2, 0, 0), vertices=24)
    cylinder(c, "Workstation_TowerButton", 0.068, 0.075, (2.33, -0.455, 1.19), "Light_Mint", rotation=(math.pi / 2, 0, 0), vertices=24)

    box(c, "Workstation_Keyboard", (2.02, 0.62, 0.075), (-0.48, -0.68, 1.25), "Metal_Charcoal", 0.055, rotation=(math.radians(-3), 0, 0))
    for row in range(3):
        for col in range(9):
            box(
                c,
                f"Workstation_Key_{row}_{col}",
                (0.145, 0.105, 0.035),
                (-1.15 + col * 0.17, -0.9 + row * 0.135, 1.31),
                "Plaster_WarmWhite",
                0.012,
            )
    box(c, "Workstation_MousePad", (1.12, 0.78, 0.035), (1.25, -0.68, 1.2), "Rubber_Dark", 0.075)
    uv_sphere(c, "Workstation_Mouse", 0.24, (1.25, -0.68, 1.3), "Plaster_SoftGrey", scale=(0.72, 1.0, 0.43))
    box(c, "Workstation_MouseDivider", (0.018, 0.3, 0.018), (1.25, -0.79, 1.405), "Metal_Charcoal", 0.004)

    cylinder(c, "Workstation_Lamp_Base", 0.34, 0.07, (-2.55, 0.48, 1.25), "Metal_Charcoal", vertices=24)
    curve_tube(c, "Workstation_Lamp_Arm", ((-2.55, 0.48, 1.28), (-2.72, 0.5, 1.86), (-2.35, 0.47, 2.33)), 0.055, "Metal_Charcoal")
    box(c, "Workstation_Lamp_Head", (0.72, 0.48, 0.22), (-2.15, 0.46, 2.38), "Oak_Dark", 0.11, rotation=(0, math.radians(-12), 0))
    box(c, "Workstation_Lamp_Light", (0.46, 0.26, 0.05), (-2.12, 0.21, 2.31), "Light_Warm", 0.025)

    curve_tube(c, "Workstation_MonitorCable", ((0.12, 0.47, 1.95), (0.35, 0.62, 1.35), (0.55, 0.52, 0.82)), 0.022, "Rubber_Dark")
    curve_tube(c, "Workstation_TowerCable", ((1.98, 0.48, 0.98), (1.48, 0.62, 0.72), (0.62, 0.52, 0.78)), 0.024, "Rubber_Dark")


def create_shop_counter() -> None:
    c = module_collection("shop-counter")
    box(c, "Shop_Counter_Plinth", (3.65, 1.42, 0.12), (0, 0, 0.06), "Metal_Charcoal", 0.055)
    box(c, "Shop_Counter_Body", (3.82, 1.5, 0.78), (0, 0, 0.5), "Sage_Panel", 0.18)
    box(c, "Shop_Counter_Front", (3.5, 0.12, 0.62), (0, -0.78, 0.52), "Metal_Black", 0.09, rotation=(math.radians(-3), 0, 0))
    box(c, "Shop_Counter_Top", (4.05, 1.7, 0.16), (0, 0, 0.97), "Oak_Warm", 0.105)
    box(c, "Shop_Counter_ToeKick", (3.35, 0.16, 0.13), (0, -0.64, 0.16), "Oak_Dark", 0.035)
    for x in (-1.45, -0.72, 0, 0.72, 1.45):
        box(c, f"Shop_Counter_Rib_{x}", (0.075, 0.09, 0.53), (x, -0.85, 0.53), "Brass_Satin", 0.016)

    box(c, "Shop_Display_Base", (1.72, 0.82, 0.08), (0.78, 0.1, 1.1), "Metal_Charcoal", 0.04)
    box(c, "Shop_Display_GlassFront", (1.64, 0.045, 0.58), (0.78, -0.33, 1.38), "Glass_Clear", 0.025)
    box(c, "Shop_Display_GlassBack", (1.64, 0.045, 0.58), (0.78, 0.53, 1.38), "Glass_Clear", 0.025)
    for x in (-0.04, 1.6):
        box(c, f"Shop_Display_End_{x}", (0.045, 0.82, 0.58), (x, 0.1, 1.38), "Glass_Clear", 0.025)
    box(c, "Shop_Display_Top", (1.74, 0.9, 0.08), (0.78, 0.1, 1.71), "Brass_Satin", 0.045)

    for index, (x, y, material_name) in enumerate((
        (0.35, -0.03, "Light_Warm"),
        (0.77, 0.06, "Light_Mint"),
        (1.17, -0.08, "Plaster_WarmWhite"),
    )):
        cylinder(c, f"Shop_Display_Item_{index + 1}", 0.13, 0.16, (x, y, 1.21), material_name, vertices=24)

    box(c, "Shop_Register_Base", (0.7, 0.58, 0.08), (-1.05, 0.18, 1.09), "Metal_Charcoal", 0.045)
    box(c, "Shop_Register_Screen", (0.74, 0.12, 0.52), (-1.05, 0.35, 1.39), "Metal_Black", 0.075, rotation=(math.radians(-12), 0, 0))
    box(c, "Shop_Register_Display", (0.59, 0.035, 0.37), (-1.05, 0.27, 1.4), "Light_Mint", 0.045, rotation=(math.radians(-12), 0, 0))
    cylinder(c, "Shop_Register_Button", 0.055, 0.045, (-1.32, -0.13, 1.1), "Light_Warm", rotation=(math.pi / 2, 0, 0), vertices=20)


def create_study_shelf() -> None:
    c = module_collection("study-shelf")
    width = 3.6
    height = 3.25
    box(c, "Shelf_Back", (width, 0.16, height), (0, 0.2, height / 2), "Sage_Panel", 0.06)
    for x in (-width / 2 + 0.12, width / 2 - 0.12):
        box(c, f"Shelf_Side_{x}", (0.22, 0.62, height), (x, 0, height / 2), "Oak_Dark", 0.055)
    for index, z in enumerate((0.14, 0.92, 1.7, 2.48, 3.13)):
        box(c, f"Shelf_Board_{index + 1}", (width, 0.65, 0.13), (0, 0, z), "Oak_Warm", 0.045)
    palette = ("Plaster_WarmWhite", "Brass_Satin", "Sage_Fabric", "Oak_Dark", "Metal_Charcoal")
    randomizer = random.Random(71)
    for row in range(4):
        cursor = -1.48
        for item in range(7):
            book_width = randomizer.uniform(0.18, 0.36)
            book_height = randomizer.uniform(0.36, 0.62)
            box(
                c,
                f"Shelf_Book_{row}_{item}",
                (book_width, 0.34, book_height),
                (cursor + book_width / 2, -0.18, 0.22 + row * 0.78 + book_height / 2),
                palette[(row + item) % len(palette)],
                0.025,
                rotation=(0, randomizer.uniform(-0.035, 0.035), randomizer.uniform(-0.04, 0.04)),
            )
            cursor += book_width + 0.08
    box(c, "Shelf_Base", (3.78, 0.74, 0.16), (0, 0, 0.08), "Metal_Charcoal", 0.055)
    box(c, "Shelf_Top_Light", (2.2, 0.16, 0.055), (0, -0.38, 3.02), "Light_Warm", 0.018)


def create_architectural_planter() -> None:
    c = module_collection("architectural-planter")
    box(c, "Planter_Base", (1.15, 1.15, 0.72), (0, 0, 0.36), "Terrazzo_Greige", 0.12)
    box(c, "Planter_Rim", (1.28, 1.28, 0.16), (0, 0, 0.72), "Oak_Warm", 0.07)
    box(c, "Planter_Soil", (0.94, 0.94, 0.09), (0, 0, 0.79), "Oak_Dark", 0.035)
    stems = [
        (-0.18, 0.05, 1.72, -0.12),
        (0.16, -0.1, 1.5, 0.14),
        (0.02, 0.16, 1.92, 0.02),
        (-0.28, -0.16, 1.34, -0.22),
    ]
    for index, (x, y, top, lean) in enumerate(stems):
        depth = top - 0.78
        cylinder(
            c,
            f"Planter_Stem_{index + 1}",
            0.045,
            depth,
            (x, y, 0.78 + depth / 2),
            "Sage_Panel",
            rotation=(0, lean, 0),
            vertices=12,
        )
        for leaf_index, side in enumerate((-1, 1)):
            leaf = box(
                c,
                f"Planter_Leaf_{index + 1}_{leaf_index + 1}",
                (0.5, 0.2, 0.16),
                (x + side * 0.22, y, top - 0.18 - leaf_index * 0.18),
                "Sage_Fabric" if (index + leaf_index) % 2 else "Sage_Panel",
                0.08,
                rotation=(0, side * 0.28, side * 0.36),
            )
    cylinder(c, "Planter_Brass_Pin", 0.07, 0.05, (0.42, -0.6, 0.38), "Brass_Satin", rotation=(math.pi / 2, 0, 0), vertices=16)


def create_modules() -> None:
    create_wall_solid()
    create_wall_door()
    create_wall_window()
    create_floor_panel()
    create_ceiling_panel()
    create_column()
    create_railing()
    create_stair_flight()
    create_stair_landing()
    create_stairwell_portal()
    create_elevator_shaft_shell()
    create_elevator_portal()
    create_elevator_door_panel()
    create_elevator_cabin_shell()
    create_elevator_call_station()
    create_elevator_control_panel()
    create_lobby_circulation_screen()
    create_reception_desk()
    create_built_in_bench()
    create_entry_portal()
    create_giant_screen_surround()
    create_study_workstation()
    create_shop_counter()
    create_study_shelf()
    create_architectural_planter()


def collection_objects(collection: bpy.types.Collection) -> list[bpy.types.Object]:
    result = list(collection.objects)
    for child in collection.children:
        result.extend(collection_objects(child))
    return result


def export_modules() -> None:
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    for module_name, collection in MODULES.items():
        bpy.ops.object.select_all(action="DESELECT")
        objects = collection_objects(collection)
        for obj in objects:
            obj.select_set(True)
        if not objects:
            continue
        bpy.context.view_layer.objects.active = objects[0]
        bpy.ops.export_scene.gltf(
            filepath=str(EXPORT_DIR / f"{module_name}.glb"),
            export_format="GLB",
            use_selection=True,
            export_apply=True,
            export_yup=True,
            export_materials="EXPORT",
            export_cameras=False,
            export_lights=False,
            export_texcoords=True,
            export_normals=True,
            export_tangents=False,
            export_animations=False,
        )


def main() -> None:
    reset_scene()
    create_materials()
    create_modules()
    bpy.context.scene["asset_library"] = "Estudiemos Room Architecture"
    bpy.context.scene["units"] = "meters"
    bpy.context.scene["export_format"] = "glTF 2.0 binary"
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH), compress=True)
    export_modules()
    print(f"Created {len(MODULES)} architecture modules in {EXPORT_DIR}")


if __name__ == "__main__":
    main()
