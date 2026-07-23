# Script-to-3D Animation Studio
## Technical Design and Implementation Blueprint

**Working title:** SceneScript  
**Document purpose:** Core engineering design document suitable for implementation with Codex or another coding agent.  
**Primary stack assumption:** ASP.NET Core + React + TypeScript + Three.js / React Three Fiber  
**Primary asset format:** glTF 2.0 / GLB  
**Target:** Browser-based editor that converts natural-language scripts into deterministic, editable 3D scenes and animations.

---

# 1. Product Definition

Build a browser application where a user can:

1. Create or import arbitrary 3D objects and characters.
2. Assign semantic meaning and capabilities to those objects.
3. Describe a scene in natural language.
4. Have an LLM translate that description into a structured scene plan.
5. Execute the plan deterministically in a real-time 3D engine.
6. Edit every generated result manually.
7. Re-prompt specific parts without regenerating everything.
8. Maintain a unique visual style across scenes and projects.
9. Export the result as video, image sequences, scene data, or glTF where practical.

Example user input:

> A red minimalist character and a blue robot are sitting across from each other at a desk.
> The red character looks nervous.
> After two seconds the robot stands up, walks to the window, and looks outside.
> The camera slowly pushes toward the red character.

The application should not ask a generative video model to hallucinate every frame.

Instead:

```text
Natural language
    ↓
Structured scene intent
    ↓
Validated scene graph + timeline commands
    ↓
Deterministic animation/runtime engine
    ↓
Editable 3D scene
    ↓
Rendered frames/video
```

The LLM is a planner and editor.

The 3D runtime is the executor.

---

# 2. Core Product Principles

## 2.1 Deterministic, not pixel-generative

Given the same:

- scene
- assets
- timeline
- random seed
- engine version

the rendered result should be reproducible.

Do not make core scene execution dependent on a generative video model.

AI may assist with:

- interpreting scripts
- generating scene plans
- suggesting assets
- generating metadata
- generating procedural geometry parameters
- creating textures
- generating speech
- generating motion suggestions
- retargeting or generating animation offline

But the saved project must resolve to explicit structured data.

---

## 2.2 Everything generated must remain editable

Never store only:

```json
{
  "prompt": "two people talk in an office"
}
```

Store the resolved scene:

```json
{
  "entities": [],
  "timeline": [],
  "cameras": [],
  "lights": [],
  "styles": {},
  "dialogue": []
}
```

A user must be able to:

- move an object
- replace an asset
- edit a material
- change an action
- drag an animation clip
- change camera timing
- change dialogue
- change scene duration

without re-running the original prompt.

---

## 2.3 Assets are not limited to characters

The engine must support arbitrary assets:

- humanoid characters
- animals
- robots
- vehicles
- furniture
- buildings
- doors
- tools
- abstract shapes
- custom user-created objects
- static meshes
- rigged meshes
- morph-target meshes
- procedural primitives
- grouped scenes

The system must therefore distinguish between:

```text
Asset
Entity
Capability
Behavior
Animation
Semantic metadata
```

rather than assuming every imported object is a humanoid.

---

# 3. Recommended Technology Stack

## Frontend

```text
React
TypeScript
Vite
Three.js
@react-three/fiber
@react-three/drei
Zustand
TanStack Query
```

Optional:

```text
React Flow
Monaco Editor
Leva
@react-three/postprocessing
```

Recommended preference:

```text
React + TypeScript + Vite
```

Use React Three Fiber as the React renderer over Three.js.

Do not hide Three.js completely behind abstractions. Animation mixers, loaders, render targets, picking, transforms, post-processing, and export will require direct Three.js access.

---

## Backend

```text
ASP.NET Core
.NET 10 or current supported .NET version
Entity Framework Core
PostgreSQL
SignalR
Object storage
Background workers
```

Object storage:

```text
MinIO in development
S3-compatible storage in production
```

Potential production providers:

```text
Cloudflare R2
AWS S3
Azure Blob Storage
```

Use PostgreSQL for:

- users
- projects
- scenes
- asset metadata
- style kits
- version history
- jobs
- permissions

Do not store large GLB/video binaries directly in PostgreSQL.

---

# 4. Primary Architecture

```text
┌──────────────────────────────────────────────────────────┐
│                       Browser                            │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ Prompt/Chat  │  │ Scene Editor │  │ Timeline       │ │
│  └──────┬───────┘  └──────┬───────┘  └───────┬────────┘ │
│         │                  │                  │          │
│         └──────────────┬───┴──────────────────┘          │
│                        │                                 │
│               Project State Store                       │
│                        │                                 │
│                 Scene Runtime                            │
│                        │                                 │
│           Three.js / React Three Fiber                   │
└────────────────────────┬─────────────────────────────────┘
                         │ HTTPS / WebSocket
┌────────────────────────▼─────────────────────────────────┐
│                    ASP.NET Core API                      │
│                                                          │
│ Project API      Asset API       AI Planning API         │
│ Timeline API     Render API      Style API               │
│                                                          │
│             Scene Command Validator                      │
│                       │                                  │
│             LLM Orchestration Layer                      │
└──────────────┬────────┴─────────────┬────────────────────┘
               │                      │
        PostgreSQL             Object Storage
                                      │
                             GLB / textures / video
```

---

# 5. Core Domain Model

Primary concepts:

```text
Project
Scene
AssetDefinition
EntityInstance
Component
Capability
Behavior
Timeline
Track
Clip
SceneCommand
Constraint
StyleKit
Camera
Light
Dialogue
Environment
RenderJob
```

---

# 6. AssetDefinition vs EntityInstance

An `AssetDefinition` is reusable.

```json
{
  "id": "asset_robot_01",
  "name": "Blue Office Robot",
  "assetType": "character",
  "source": {
    "type": "glb",
    "uri": "/assets/robot.glb"
  }
}
```

An `EntityInstance` is an occurrence of that asset in a scene.

```json
{
  "id": "entity_robot_bob",
  "assetId": "asset_robot_01",
  "name": "Bob",
  "transform": {
    "position": [2, 0, 3],
    "rotation": [0, 1.57, 0],
    "scale": [1, 1, 1]
  }
}
```

This supports:

```text
1 asset definition
100 scene instances
```

without duplicating geometry.

---

# 7. Component-Based Entity Model

Prefer composition over deep inheritance.

Bad:

```text
SceneObject
  └ Character
      └ Human
          └ MaleHuman
```

Preferred:

```json
{
  "id": "bob",
  "components": {
    "transform": {},
    "renderable": {},
    "animator": {},
    "humanoid": {},
    "locomotion": {},
    "speech": {},
    "lookAt": {},
    "interactable": {}
  }
}
```

Chair:

```json
{
  "components": {
    "transform": {},
    "renderable": {},
    "seat": {},
    "interactable": {}
  }
}
```

Door:

```json
{
  "components": {
    "transform": {},
    "renderable": {},
    "hinge": {},
    "openable": {},
    "interactable": {}
  }
}
```

Car:

```json
{
  "components": {
    "transform": {},
    "renderable": {},
    "vehicle": {},
    "drivable": {},
    "seatProvider": {}
  }
}
```

---

# 8. Capability System

Capabilities answer:

> What can this entity do?

Examples:

```text
Movable
Locomotion
Speakable
LookAt
Point
SittableActor
SeatProvider
Drivable
Openable
Closeable
Pickable
PickupActor
Attachable
AnimationPlayback
Morphable
ParticleEmitter
PathFollower
SurfaceProvider
Container
```

The planner must not invent unsupported actions.

Example:

```json
{
  "action": "open",
  "actor": "bob",
  "target": "door"
}
```

Validator checks:

```text
bob can interact
door has Openable
```

---

# 9. Imported 3D Object Support

Arbitrary 3D import is a first-class feature.

## Initial formats

Accept:

```text
.glb
.gltf + referenced dependencies
```

Normalize internally to GLB where practical.

Later optional import support:

```text
FBX
OBJ
USDZ
VRM
DAE
Blend via conversion worker
```

Do not support all these directly in the runtime.

Convert to glTF/GLB.

---

# 10. Asset Import Pipeline

```text
Upload
  ↓
Validate file and quotas
  ↓
Store original
  ↓
Parse glTF metadata
  ↓
Inspect scene graph
  ↓
Inspect meshes
  ↓
Inspect materials/textures
  ↓
Inspect skeletons
  ↓
Inspect animation clips
  ↓
Inspect morph targets
  ↓
Calculate bounds
  ↓
Generate thumbnail
  ↓
Suggest asset classification
  ↓
Semantic configuration wizard
  ↓
Optimize runtime copy
  ↓
Ready
```

---

# 11. Asset Manifest

Persist normalized metadata:

```json
{
  "assetId": "robot-01",
  "format": "glb",
  "version": 1,
  "geometry": {
    "meshCount": 4,
    "triangleCount": 18240,
    "boundingBox": {
      "min": [-0.5, 0, -0.3],
      "max": [0.5, 1.9, 0.3]
    }
  },
  "rig": {
    "hasSkeleton": true,
    "boneCount": 64,
    "rigType": "humanoid",
    "boneMap": {}
  },
  "animations": [
    {
      "name": "Idle",
      "duration": 3.2
    },
    {
      "name": "Walk",
      "duration": 1.1
    }
  ],
  "morphTargets": [],
  "semantic": {
    "category": "character",
    "tags": ["robot", "humanoid"]
  }
}
```

---

# 12. Asset Configuration Wizard

## Step 1: classification

Choices:

```text
Character
Animal
Prop
Furniture
Vehicle
Building
Environment
Door
Container
Custom
```

AI may suggest classification.

User remains authoritative.

---

## Step 2: orientation and scale

Application convention:

```text
Y = up
meters = world unit
one fixed forward-axis convention
```

Pick one forward convention and enforce it everywhere.

Allow user to set visually:

```text
ground point
forward direction
default scale
pivot
```

---

## Step 3: semantic anchors

Anchors are named transforms attached to an asset.

Chair:

```text
seat
seatFront
leftArm
rightArm
```

Door:

```text
handle
hinge
frontApproach
backApproach
```

Desk:

```text
seatA
seatB
surfaceCenter
leftEdge
rightEdge
```

Vehicle:

```text
driverSeat
passengerSeat
entryLeft
entryRight
steeringWheel
```

Generic:

```text
top
center
grip
attach
focus
```

Example:

```json
{
  "id": "seat",
  "node": "ChairRoot",
  "position": [0, 0.52, 0],
  "rotation": [0, 3.14159, 0]
}
```

Anchors are essential for deterministic interaction.

---

# 13. Custom Capabilities for Imported Objects

Users must be able to make imported objects programmable without code.

Example: treasure chest.

User configures:

```text
Capability: Openable
Moving node: Lid
Rotation X: 0 → -110°
Duration: 0.6s
```

Saved:

```json
{
  "capability": "openable",
  "parameters": {
    "node": "Lid",
    "openTransform": {
      "rotation": [-1.92, 0, 0]
    },
    "duration": 0.6
  }
}
```

Now:

> John opens the chest.

is executable.

---

# 14. Behavior Definitions

Capability says what can happen.

Behavior says how.

Example:

```json
{
  "id": "open",
  "requiredCapabilities": ["openable"],
  "executor": "TransformTweenBehavior",
  "duration": 0.6
}
```

Humanoid:

```json
{
  "id": "walkTo",
  "requiredCapabilities": ["locomotion"],
  "executor": "CharacterLocomotionBehavior"
}
```

TypeScript contract:

```ts
interface BehaviorExecutor<TCommand = SceneCommand> {
  canExecute(context: BehaviorContext, command: TCommand): boolean;
  prepare(context: BehaviorContext, command: TCommand): PreparedAction;
  update(context: BehaviorContext, action: PreparedAction, time: number): void;
  dispose(context: BehaviorContext, action: PreparedAction): void;
}
```

---

# 15. Humanoid Characters

Humanoid-specific support:

```text
skeletal rig
animation retargeting
locomotion
IK
look-at
hand targets
sit alignment
lip sync
facial morphs
gesture library
```

Do not require all characters to be humanoid.

---

# 16. Standard Humanoid Rig Abstraction

Application bone mapping:

```text
hips
spine
chest
neck
head

leftShoulder
leftUpperArm
leftLowerArm
leftHand

rightShoulder
rightUpperArm
rightLowerArm
rightHand

leftUpperLeg
leftLowerLeg
leftFoot

rightUpperLeg
rightLowerLeg
rightFoot
```

Imported model mapping:

```json
{
  "hips": "mixamorig:Hips",
  "head": "mixamorig:Head",
  "leftHand": "mixamorig:LeftHand"
}
```

This enables animation retargeting.

---

# 17. Animation Sources

## Embedded animation

Imported GLB contains:

```text
Idle
Walk
Run
Sit
Wave
```

Use directly.

## Shared animation library

Application clips:

```text
idle
walk
run
sit
stand
wave
point
talk_generic
angry_gesture
laugh
pick_up
```

Retarget to compatible humanoids.

## Procedural animation

Examples:

```text
lookAt
head turn
hand reach
pointing
camera motion
door opening
vehicle path motion
simple object movement
```

## Generated animation

Future:

```text
text-to-motion
video mocap
AI motion generation
pose-sequence import
```

Convert generated motion into persistent clips.

---

# 18. Static and Unrigged Objects

Unrigged assets can still:

```text
move
rotate
scale
follow paths
attach
detach
change material
hide/show
emit particles
act as physics bodies
act as targets
contain anchors
expose custom articulated-node behaviors
```

Example:

> The spaceship flies over the city and lands behind the building.

No humanoid rig is required.

---

# 19. Procedural Primitives

Built-in generators:

```text
box
sphere
capsule
cylinder
cone
plane
torus
line
text
```

Stick figures should be a procedural humanoid asset.

Example:

```text
Head = sphere
Torso = capsule
Arms = cylinders
Legs = cylinders
```

Bind to the same standard humanoid skeleton.

Then realistic humans, robots, and stick figures can share the same animation system.

---

# 20. Style Kit System

```json
{
  "id": "ivo_minimal",
  "palette": {
    "primary": "#D94B4B",
    "secondary": "#3D6AD6",
    "background": "#EEE8DE",
    "dark": "#222222"
  },
  "geometry": {
    "detailLevel": "low",
    "edgeStyle": "rounded"
  },
  "materials": {
    "roughness": 0.8,
    "metalness": 0.0,
    "texturesEnabled": false
  },
  "lighting": {
    "preset": "softStudio"
  },
  "camera": {
    "defaultFov": 40
  },
  "animation": {
    "speedMultiplier": 1.0,
    "steppedFps": null
  }
}
```

---

# 21. Styling Imported Assets

## Runtime, non-destructive

Override:

```text
materials
colors
roughness
metalness
texture visibility
outlines
shadows
lighting
post-processing
```

## Future destructive restyling

Possible later:

```text
mesh simplification
remeshing
texture regeneration
AI-generated replacement assets
procedural stylization
```

Keep this outside MVP.

---

# 22. Scene Document Format

Use an application-owned JSON schema.

Do not persist raw Three.js scene objects.

```json
{
  "schemaVersion": "1.0",
  "scene": {
    "id": "scene_01",
    "name": "Office Argument",
    "duration": 18
  },
  "environment": {
    "background": "#EEE8DE"
  },
  "entities": [],
  "lights": [],
  "cameras": [],
  "timeline": {
    "tracks": []
  }
}
```

---

# 23. Entity Schema

```json
{
  "id": "john",
  "name": "John",
  "assetId": "character_red_01",
  "transform": {
    "position": [-1.5, 0, 0],
    "rotation": [0, 0, 0],
    "scale": [1, 1, 1]
  },
  "overrides": {
    "materials": {
      "body": {
        "color": "#D94949"
      }
    }
  },
  "metadata": {
    "role": "employee",
    "description": "nervous red character"
  }
}
```

---

# 24. Timeline Model

Use tracks and clips.

```text
Timeline
  Character tracks
  Object tracks
  Camera track
  Audio track
  Dialogue track
  Effects track
```

Example:

```json
{
  "tracks": [
    {
      "id": "track_john",
      "entityId": "john",
      "clips": [
        {
          "id": "clip_1",
          "type": "animation",
          "start": 0,
          "duration": 3,
          "animation": "sit_idle"
        },
        {
          "id": "clip_2",
          "type": "behavior",
          "start": 3,
          "behavior": "stand"
        }
      ]
    }
  ]
}
```

---

# 25. Scene Command Language

LLM output must be a restricted intermediate command language.

Never execute arbitrary LLM-generated JavaScript.

Example:

```json
{
  "command": "WalkTo",
  "actorId": "robot",
  "target": {
    "entityId": "window",
    "anchorId": "viewPoint"
  },
  "startTime": 5,
  "parameters": {
    "speed": 1.2
  }
}
```

---

# 26. Command Registry

Initial commands:

```text
MoveTo
WalkTo
RunTo
RotateTo
LookAt
PlayAnimation
Sit
Stand
Speak
PickUp
Drop
Attach
Detach
Open
Close
Follow
FollowPath
SetMaterial
SetVisibility
CameraCut
CameraMove
CameraFollow
CameraLookAt
PlayAudio
Wait
```

Later:

```text
Drive
EnterVehicle
ExitVehicle
Climb
Jump
Throw
Dance
CustomBehavior
```

Every command needs:

```text
schema
validator
required capabilities
runtime executor
editor representation
serialization
planner hints
```

---

# 27. Strong Command Typing

TypeScript:

```ts
type SceneCommand =
  | MoveToCommand
  | WalkToCommand
  | LookAtCommand
  | PlayAnimationCommand
  | SitCommand
  | SpeakCommand
  | CameraMoveCommand;

interface WalkToCommand {
  kind: "walkTo";
  id: string;
  actorId: string;
  target: SpatialTarget;
  startTime: number;
  speed?: number;
}
```

Mirror contracts in C#.

Prefer shared JSON schema/OpenAPI generation.

---

# 28. LLM Planning Architecture

Pipeline:

```text
1. Parse narrative
2. Resolve entities
3. Resolve assets
4. Resolve spatial relationships
5. Resolve actions
6. Resolve timing
7. Validate capabilities
8. Compile commands
9. Simulate/validate
10. Apply scene patch
```

Do not ask one giant prompt to produce final trusted project JSON.

---

# 29. Narrative Understanding

Input:

> Two red stick figures are sitting at a desk. One gets up and walks to the door.

Intermediate output:

```json
{
  "characters": [
    {
      "tempId": "personA",
      "description": "red stick figure"
    },
    {
      "tempId": "personB",
      "description": "red stick figure"
    }
  ],
  "objects": [
    {
      "tempId": "desk",
      "description": "desk"
    },
    {
      "tempId": "door",
      "description": "door"
    }
  ],
  "events": [
    {
      "actor": "personA",
      "action": "sit",
      "target": "desk"
    },
    {
      "actor": "personB",
      "action": "sit",
      "target": "desk"
    },
    {
      "actor": "personA",
      "action": "stand"
    },
    {
      "actor": "personA",
      "action": "walkTo",
      "target": "door"
    }
  ]
}
```

---

# 30. Asset Resolution

For requested entities:

```text
Already in scene?
Project asset?
Built-in library?
Procedurally generatable?
Needs user import/selection?
```

Example:

```text
red stick figure
→ built-in procedural humanoid
→ instantiate twice
→ body color override red
```

---

# 31. Asset Search

Metadata:

```json
{
  "name": "Minimal Office Desk",
  "tags": ["desk", "office", "table", "furniture"],
  "capabilities": ["surface", "seatArrangement"]
}
```

MVP:

```text
PostgreSQL tags + full-text search
```

Later:

```text
embeddings/vector search
```

---

# 32. Spatial Planning

Natural language describes relationships, not coordinates.

Example:

```text
two people sit opposite each other at a desk
```

Convert to constraints:

```json
[
  {
    "type": "placeAtAnchor",
    "entity": "personA",
    "target": "desk",
    "anchor": "seatA"
  },
  {
    "type": "placeAtAnchor",
    "entity": "personB",
    "target": "desk",
    "anchor": "seatB"
  }
]
```

---

# 33. Spatial Relationships

Support:

```text
leftOf
rightOf
inFrontOf
behind
above
below
inside
onTopOf
near
far
facing
opposite
nextTo
between
atAnchor
attachedTo
```

Keep relationships as constraints until scene compilation.

---

# 34. Constraint Solver

MVP heuristics are sufficient.

Example:

```text
Place desk at origin.
Use seat anchors when available.
Orient characters toward desk center.
Calculate world-space bounds.
Detect overlap.
Push apart if necessary.
Re-run validation.
```

Do not start by building a generalized symbolic physics planner.

---

# 35. Navigation and Movement

Characters should not lerp through walls.

Use navigation meshes for locomotion-capable actors.

Recommended:

```text
three-pathfinding
recast-navigation / recast-detour WASM
```

Architecture:

```text
Scene static geometry
    ↓
Navmesh generation
    ↓
WalkTo target
    ↓
Nearest valid nav point
    ↓
Path query
    ↓
Waypoints
    ↓
Locomotion controller
    ↓
Animation + root movement
```

MVP can initially use obstacle-free direct movement in simple scenes.

The architecture must allow navmesh integration without changing the command model.

---

# 36. Locomotion Controller

Responsibilities:

```text
calculate route
move root transform
rotate toward travel direction
play walk/run animation
match movement speed to animation
stop within target tolerance
transition to idle
```

Avoid relying purely on root motion for initial implementation.

Recommended MVP:

```text
code-driven root translation
animation provides visual gait
```

Later support root-motion extraction.

---

# 37. Sitting

`Sit` is not simply playing a sit animation.

Required process:

```text
1. Resolve SeatProvider target.
2. Resolve seat anchor.
3. Navigate to approach anchor.
4. Rotate actor to correct orientation.
5. Play sit-down animation.
6. Snap/align hips/root.
7. Enter seated idle state.
```

Seat capability:

```json
{
  "seatAnchor": "seat",
  "approachAnchor": "seatFront",
  "recommendedAnimation": "sit"
}
```

---

# 38. Pick Up and Object Interaction

For `PickUp`:

```text
1. Verify actor can pick up.
2. Verify object is pickable.
3. Walk within interaction distance.
4. Orient toward object.
5. Play reach animation.
6. Use IK if available.
7. Attach item to hand anchor at contact frame.
8. Continue animation.
```

Store attachment:

```json
{
  "parentEntityId": "john",
  "parentAnchor": "rightHand",
  "localTransform": {}
}
```

---

# 39. Inverse Kinematics

MVP does not require advanced full-body IK.

Initial useful IK:

```text
head look-at
eye look-at where supported
hand target
foot grounding later
```

Potential libraries/approaches:

```text
custom CCD/FABRIK
Three.js examples
WASM IK library
animation preprocessing
```

Keep IK optional per rig.

---

# 40. Animation State Machine

Each animated actor should have runtime states:

```text
Idle
Locomotion
Action
Transition
Seated
Attached
Disabled
```

Example transitions:

```text
Idle → Locomotion → Idle
Idle → StandAction → Idle
Idle → SitAction → Seated
Seated → StandAction → Idle
```

Timeline commands schedule requested behavior.

State machine enforces valid execution.

---

# 41. Animation Blending

Use `THREE.AnimationMixer`.

Support:

```text
crossFade
fadeIn
fadeOut
loop modes
timeScale
additive layers later
```

Do not abruptly switch clips.

Example:

```text
idle → 0.2s blend → walk
walk → 0.15s blend → stop
```

---

# 42. Camera System

Camera is a first-class animated entity.

Support:

```text
PerspectiveCamera
OrthographicCamera
```

Initial camera behaviors:

```text
Static
Cut
MoveTo
LookAt
Follow
Orbit
PushIn
PullOut
Pan
Dolly
Track
```

Example:

```json
{
  "kind": "cameraFollow",
  "cameraId": "camera_main",
  "targetId": "robot",
  "offset": [2, 1.5, -4],
  "startTime": 4,
  "duration": 6
}
```

---

# 43. Camera Shot Abstraction

LLM should understand cinematic concepts:

```text
wide shot
medium shot
close-up
over-the-shoulder
two-shot
establishing shot
top-down
low angle
high angle
tracking shot
```

Compile these into actual transforms using target bounds.

Example:

```text
close-up John
```

Compiler calculates:

```text
John head/world bounds
camera distance from FOV
look target
safe framing margins
```

---

# 44. Dialogue and Speech

Dialogue model:

```json
{
  "id": "dialogue_01",
  "speakerId": "john",
  "text": "We have a problem.",
  "startTime": 2.0,
  "voiceId": "voice_03"
}
```

Pipeline:

```text
dialogue text
→ optional TTS
→ audio duration
→ timeline clip
→ optional lip sync
→ optional gesture generation
```

MVP can support:

```text
text captions
audio upload
manual duration
generic talk animation
```

TTS and lip sync can be later.

---

# 45. Lip Sync

Possible progression:

## MVP

Generic talking animation while audio plays.

## Phase 2

Audio amplitude drives jaw/open-mouth morph.

## Phase 3

Phoneme/viseme timeline:

```text
audio
→ speech analysis
→ visemes
→ facial morph targets
```

Support common viseme maps where assets expose facial morph targets.

---

# 46. Emotion

Do not treat emotion as magic.

Represent emotion as parameters that can influence:

```text
facial expression
animation selection
pose
movement speed
gesture frequency
camera framing
speech delivery metadata
```

Example:

```json
{
  "emotion": "angry",
  "intensity": 0.8
}
```

Planner can resolve:

```text
stand animation = stand_aggressive
walk speed = 1.3x
gesture = angry_gesture
```

when assets support them.

Fallback gracefully when unsupported.

---

# 47. Physics

Do not make full physics simulation mandatory.

Use physics selectively.

Potential:

```text
Rapier.js
cannon-es
Ammo.js
```

Recommended:

```text
Rapier
```

Use for:

```text
collision
falling props
simple rigid bodies
trigger zones
optional ragdolls later
```

Most cinematic actions should remain authored/deterministic, not uncontrolled simulation.

---

# 48. Scene Editor UI

Recommended layout:

```text
┌─────────────────────────────────────────────────────────────┐
│ Toolbar                                                     │
├──────────────┬───────────────────────────────┬──────────────┤
│ Scene Tree   │                               │ Inspector    │
│              │        3D Viewport            │              │
│ Assets       │                               │ Properties   │
│              │                               │ Capabilities │
├──────────────┴───────────────────────────────┴──────────────┤
│ Timeline                                                    │
├─────────────────────────────────────────────────────────────┤
│ Prompt / Scene Assistant                                    │
└─────────────────────────────────────────────────────────────┘
```

---

# 49. Scene Tree

Show:

```text
Scene
├ Cameras
├ Lights
├ Environment
├ John
├ Robot
├ Desk
├ Chair 1
├ Chair 2
└ Door
```

Support:

```text
select
rename
duplicate
delete
group
hide
lock
focus
```

---

# 50. Inspector

Sections:

```text
Transform
Asset
Materials
Components
Capabilities
Animations
Anchors
Constraints
Metadata
```

For a door:

```text
Transform
Renderable
Openable
  Closed state
  Open state
  Duration
Anchors
  Handle
  Approach
```

---

# 51. Gizmos

Use transform controls:

```text
translate
rotate
scale
```

Three.js:

```text
TransformControls
```

Include:

```text
local/world mode
axis snapping
rotation snapping
grid snapping
```

---

# 52. Timeline Editor

Required MVP interactions:

```text
play
pause
seek
scrub
zoom
select clip
move clip
resize where valid
delete clip
duplicate clip
multi-select later
```

Tracks grouped by entity.

Example:

```text
John
  Animation
  Movement
  Speech

Robot
  Animation
  Movement

Camera
  Shots

Audio
```

---

# 53. Prompt Assistant

Prompt examples:

```text
Add two chairs opposite each other at the desk.
Make John stand up at 4 seconds.
Replace John with the blue robot.
Move the camera closer.
Make the whole room monochrome.
Make the robot walk slower.
Remove everything after 12 seconds.
```

The assistant should produce a proposed `ScenePatch`.

---

# 54. Scene Patch Model

Never blindly replace the entire scene.

Example:

```json
{
  "operations": [
    {
      "op": "addEntity",
      "entity": {}
    },
    {
      "op": "updateEntity",
      "entityId": "john",
      "changes": {}
    },
    {
      "op": "addClip",
      "trackId": "john_actions",
      "clip": {}
    }
  ]
}
```

Operations:

```text
AddEntity
RemoveEntity
UpdateEntity
ReplaceAsset
AddTrack
RemoveTrack
AddClip
UpdateClip
RemoveClip
AddConstraint
RemoveConstraint
UpdateStyle
AddCamera
UpdateCamera
```

---

# 55. AI Change Preview

Before applying an AI modification, optionally show:

```text
+ Added "Window"
~ Changed Robot movement speed 1.0 → 0.7
~ Camera shot changed Wide → Medium
- Removed clip "Robot Wave"
```

User can:

```text
Apply
Reject
Undo
```

MVP may auto-apply with strong undo support.

---

# 56. Undo/Redo

Mandatory.

Use command/event approach.

Every editor operation should have inverse data.

Examples:

```text
Move entity
Add entity
Delete clip
Change material
Apply AI scene patch
```

AI-generated scene updates should be one undo transaction.

---

# 57. Project Versioning

Save snapshots periodically.

Tables conceptually:

```text
Project
Scene
SceneRevision
```

Revision:

```json
{
  "sceneId": "...",
  "revision": 42,
  "documentUri": "...",
  "createdAt": "...",
  "createdBy": "...",
  "source": "manual|ai|autosave"
}
```

Do not store every mouse movement as a server revision.

Use client undo stack plus periodic persisted revisions.

---

# 58. Persistence Strategy

Store scene JSON separately from large assets.

Possible structure:

```text
/projects/{projectId}/
  scenes/
    scene-01/
      revisions/
        000001.json
        000002.json

/assets/{assetId}/
  original.glb
  runtime.glb
  thumbnail.webp

/renders/{renderId}/
  output.mp4
```

Database stores metadata and paths.

---

# 59. Backend API Surface

Example endpoints:

```text
POST   /api/projects
GET    /api/projects/{id}
PUT    /api/projects/{id}

POST   /api/projects/{id}/scenes
GET    /api/scenes/{id}
PUT    /api/scenes/{id}

POST   /api/assets/upload
GET    /api/assets/{id}
PATCH  /api/assets/{id}
POST   /api/assets/{id}/analyze

POST   /api/scenes/{id}/plan
POST   /api/scenes/{id}/apply-patch

POST   /api/renders
GET    /api/renders/{id}

GET    /api/style-kits
POST   /api/style-kits
```

---

# 60. AI Planning Endpoint

Example:

```http
POST /api/scenes/{sceneId}/plan
```

Request:

```json
{
  "instruction": "Make the robot stand up and walk to the window after John speaks.",
  "selection": {
    "entityIds": []
  },
  "currentTime": 0
}
```

Response:

```json
{
  "summary": "Robot stands and walks to the window after John's speech.",
  "patch": {
    "operations": []
  },
  "warnings": []
}
```

---

# 61. LLM Context Construction

Do not send the complete raw GLB or enormous scene JSON.

Build a semantic scene summary.

Example:

```text
Scene duration: 18s

Entities:
- john: humanoid character, red, supports walk/sit/stand/speak/lookAt
- robot: humanoid robot, blue, supports walk/sit/stand/lookAt
- desk: furniture, anchors seatA/seatB/surfaceCenter
- window: prop, anchor viewPoint

Current timeline:
0-4 John seated
0-4 Robot seated
2-3.5 John speaks

Available built-in assets:
chair, office desk, door, window...
```

This reduces tokens and hallucinations.

---

# 62. Structured LLM Output

Use provider-supported structured JSON output where available.

Validate using JSON Schema.

Never trust raw model output.

Flow:

```text
LLM output
→ JSON parsing
→ schema validation
→ semantic validation
→ capability validation
→ reference validation
→ timeline validation
→ spatial validation
→ patch
```

---

# 63. Planner Error Handling

Possible planner warnings:

```text
Requested "fly", but John has no flying capability.
No chair exists for requested Sit action.
Door asset has no Openable capability.
Requested asset "dragon" was not found.
```

Possible resolutions:

```text
suggest asset
use fallback
ask user only when essential
skip unsupported action
```

For coding-agent implementation, prefer deterministic fallback over excessive UI blocking.

---

# 64. Runtime Scene Compiler

Do not execute persisted JSON directly through ad hoc component code.

Compile:

```text
SceneDocument
    ↓
Validation
    ↓
Resolved asset references
    ↓
Runtime graph
    ↓
Behavior instances
    ↓
Animation mixers
    ↓
Timeline schedule
```

Runtime graph can contain Three.js references, but persistence model must not.

---

# 65. Runtime Update Loop

Conceptual:

```ts
function update(deltaTime: number) {
  timeline.advance(deltaTime);
  scheduler.evaluate(timeline.currentTime);
  behaviorSystem.update(deltaTime);
  animationSystem.update(deltaTime);
  navigationSystem.update(deltaTime);
  ikSystem.update(deltaTime);
  physicsSystem.update(deltaTime);
  constraintSystem.update(deltaTime);
  cameraSystem.update(deltaTime);
}
```

Order matters.

Define and test a stable execution order.

---

# 66. Time Model

Use seconds as canonical timeline time.

```text
1.5 = one and a half seconds
```

Do not store timeline state primarily as frame numbers.

Rendering converts time to frames:

```text
frame = time * fps
```

Support:

```text
24 fps
25 fps
30 fps
60 fps
```

---

# 67. Deterministic Playback

Avoid using wall-clock time.

Use scene playback time.

Given:

```text
t = 4.2s
```

scene state should be reproducible.

This enables:

```text
scrubbing
frame export
video rendering
undo
timeline editing
```

Behaviors should be seekable where possible.

---

# 68. Seekable Actions

Prefer actions defined as functions of timeline time.

Example transform tween:

```text
position(t) = interpolate(start, end, normalizedTime)
```

Harder systems such as physics may require snapshot/replay.

For MVP, keep core animation timeline seekable and deterministic.

---

# 69. Scene Rendering

Two rendering modes.

## Interactive

Browser:

```text
WebGL initially
WebGPU optionally later
```

## Export

Options:

### MVP
Render frames in browser and encode.

### Better production path
Headless Chromium renderer:

```text
Playwright
Chromium
scene URL
fixed resolution
fixed frame stepping
frame capture
FFmpeg encoding
```

This keeps Three.js rendering identical between editor and exporter.

---

# 70. Video Export Pipeline

```text
User requests render
    ↓
Create RenderJob
    ↓
Worker starts Chromium
    ↓
Load immutable scene revision
    ↓
Load assets
    ↓
Step timeline frame-by-frame
    ↓
Capture frames
    ↓
Encode with FFmpeg
    ↓
Upload MP4/WebM
    ↓
Mark job complete
```

---

# 71. Export Formats

MVP:

```text
MP4
PNG thumbnail/still
scene JSON
```

Later:

```text
WebM with alpha where supported
PNG sequence
glTF scene export
GIF
vertical social presets
```

---

# 72. Render Presets

Examples:

```text
YouTube 16:9 1920×1080
TikTok/Reels 9:16 1080×1920
Square 1:1 1080×1080
720p preview
4K
```

Store preset separately from scene.

---

# 73. Asset Performance Optimization

Import processing may:

```text
compress geometry with Draco or Meshopt
resize textures
convert textures to KTX2/Basis
deduplicate materials
remove unused nodes
generate LODs later
```

Runtime should prefer:

```text
GLB + Meshopt
KTX2 where useful
```

Avoid optimizing so aggressively that user assets visibly break.

Keep original upload.

---

# 74. Asset Limits

Enforce configurable limits:

```text
max file size
max triangle count warning
max texture dimensions
max animation count
max scene asset count
```

Do not silently reject moderately large assets.

Provide warnings and optimization.

---

# 75. Asset Library

Sources:

```text
Built-in assets
User assets
Project assets
Generated assets later
Marketplace later
```

Filters:

```text
category
tags
capabilities
style
rig type
animated/static
```

---

# 76. Reusable Characters

A Character Definition should include:

```text
base asset
material overrides
bone mapping
animation mappings
voice
facial mapping
default behavior settings
semantic identity
```

Example:

```json
{
  "name": "John",
  "baseAssetId": "stickman_male_base",
  "style": {
    "bodyColor": "#D84A4A"
  },
  "voiceId": "voice_01"
}
```

This makes John persistent across scenes.

---

# 77. Identity and Continuity

The system should support:

```text
Character "John"
Office "Main Office"
Car "John's Car"
```

across multiple scenes.

A project has reusable named entities/assets.

Then prompts can say:

```text
Put John in the same office as the previous scene.
```

Resolve against project context.

---

# 78. Environment System

Environment can contain:

```text
background color
HDRI
skybox
ground
fog
lighting preset
environment asset
```

Example:

```json
{
  "background": "#EEE8DE",
  "ground": {
    "enabled": true,
    "material": "matte"
  },
  "lightingPreset": "softStudio"
}
```

---

# 79. Lighting Presets

Initial presets:

```text
Soft Studio
Bright Day
Overcast
Warm Interior
Night
Dramatic
Flat Toon
```

Users can manually add:

```text
DirectionalLight
PointLight
SpotLight
AmbientLight
HemisphereLight
```

---

# 80. Unique Visual Style

The application should make visual consistency easier than raw Blender.

Style Kit controls defaults.

Asset overrides handle exceptions.

Scene can override Style Kit.

Priority:

```text
Global defaults
→ Style Kit
→ Asset definition
→ Scene entity override
→ Timeline/action override
```

---

# 81. Custom Shader/Outline Support

Potential styles:

```text
flat shaded
toon
outline
wireframe
clay
monochrome
low-poly
unlit
```

Do not make shader authoring an MVP requirement.

Start with reusable material presets and optional outline post-processing.

---

# 82. Script Document Support

A full script can be structured into scenes.

Example input:

```text
SCENE 1 - OFFICE

John sits across from Sarah.

JOHN:
We have a problem.

Sarah gets up and walks to the window.
```

Parser output:

```text
Scene
Characters
Dialogue
Stage directions
Shots optional
```

Each script scene becomes an editable 3D scene.

---

# 83. Script Parsing Model

Internal representation:

```json
{
  "scenes": [
    {
      "heading": "OFFICE",
      "characters": ["John", "Sarah"],
      "beats": [
        {
          "type": "stageDirection",
          "text": "John sits across from Sarah."
        },
        {
          "type": "dialogue",
          "speaker": "John",
          "text": "We have a problem."
        },
        {
          "type": "stageDirection",
          "text": "Sarah gets up and walks to the window."
        }
      ]
    }
  ]
}
```

Keep script source separate from resolved timeline.

---

# 84. Scene Generation Modes

Support two conceptual modes.

## Prompt mode

```text
"Two people argue in an office..."
```

Good for rapid generation.

## Script mode

Structured screenplay or narration.

Good for longer projects.

Both compile into the same `SceneDocument`.

---

# 85. Procedural Scene Templates

Templates:

```text
Office conversation
Interview
Podcast desk
Classroom
Street
Simple room
Presentation stage
Explainer void
```

A template includes:

```text
environment
common props
anchors
camera presets
lighting
```

This dramatically improves AI reliability.

---

# 86. Built-In MVP Asset Pack

Ship a deliberately small reliable pack.

Characters:

```text
Minimal humanoid
Stick humanoid
Robot humanoid
```

Props:

```text
desk
chair
door
window
phone
laptop
box
cup
car
tree
simple building
```

Environments:

```text
empty studio
office
simple street
```

Animations:

```text
idle
walk
run
sit
stand
wave
point
talk
pick up
```

This allows an end-to-end product before arbitrary asset behavior becomes polished.

---

# 87. Importing User-Created Assets

User workflow:

```text
Upload GLB
→ preview
→ classify
→ orient
→ set scale
→ define anchors
→ detect/map rig if relevant
→ map animations
→ add capabilities
→ save
```

After setup, imported asset is first-class.

---

# 88. Importing Rigged Characters

Workflow:

```text
Detect skeleton
→ attempt humanoid bone auto-mapping
→ show mapping UI
→ preview test pose
→ preview walk animation retarget
→ save mapping
```

Do not promise arbitrary rigs will automatically work.

Support:

```text
standard humanoid rigs first
custom animated objects separately
```

---

# 89. Importing Non-Humanoid Animated Models

Example:

```text
dragon
quadruped
machine
spaceship with moving wings
```

They can expose named embedded clips:

```text
idle
fly
attack
open_wings
```

User maps semantic action names:

```text
"fly" → animation clip "FlyCycle"
```

No humanoid retargeting required.

---

# 90. Custom Action Mapping

Asset configuration:

```json
{
  "semanticActions": {
    "idle": {
      "type": "animation",
      "clip": "Idle_01"
    },
    "fly": {
      "type": "animation",
      "clip": "Flight_Loop"
    }
  }
}
```

Then planner sees available action:

```text
fly
```

---

# 91. Generic Custom Behaviors

Eventually expose a no-code behavior editor.

Examples:

```text
Open
Close
Extend
Retract
Spin
Glow
Explode
TurnOn
TurnOff
```

Behavior can consist of tracks:

```text
node transform
material property
visibility
animation clip
particle effect
audio
```

---

# 92. Plugin-Friendly Behavior Architecture

Define behavior executors through registration.

Example:

```ts
behaviorRegistry.register("open", openBehavior);
behaviorRegistry.register("walkTo", walkToBehavior);
```

Do not hardcode all action dispatch into one giant `switch`.

Backend planner metadata should derive from the same behavior/capability definitions where possible.

---

# 93. Scene Validation

Validate:

```text
duplicate IDs
missing asset references
missing entity references
invalid anchors
unsupported actions
overlapping exclusive timeline clips
invalid duration
unavailable animation mappings
unresolved constraints
invalid camera references
asset loading failures
```

Return actionable errors.

---

# 94. Timeline Conflict Rules

Examples:

```text
Actor cannot WalkTo and Sit simultaneously.
Actor may Speak while seated.
Actor may LookAt while walking.
Camera may move and lookAt simultaneously.
```

Represent action channels:

```text
RootMotion
FullBodyAnimation
UpperBody
HeadLook
Speech
Facial
Attachment
```

Commands claim channels.

Conflict validator uses channel overlap.

---

# 95. Layered Animation

Later support:

```text
walking + waving
sitting + talking gesture
walking + looking at target
```

Requires animation masks/additive blending.

Do not require this for first MVP.

MVP can serialize some actions instead.

---

# 96. Database Sketch

Core tables:

```text
Users
Projects
ProjectMembers
Scenes
SceneRevisions
Assets
AssetVersions
AssetCapabilities
StyleKits
RenderJobs
AiRequests
```

Scene document can be:

```text
JSONB for latest editable state
object storage snapshots for revisions
```

Either is acceptable.

Avoid over-normalizing timeline clips into dozens of relational tables initially.

---

# 97. Suggested C# Project Layout

```text
src/
  SceneScript.Api/
  SceneScript.Application/
  SceneScript.Domain/
  SceneScript.Infrastructure/
  SceneScript.Workers/
  SceneScript.Contracts/

tests/
  SceneScript.Domain.Tests/
  SceneScript.Application.Tests/
  SceneScript.Api.Tests/
```

Domain:

```text
Scenes/
Assets/
Timeline/
Capabilities/
Commands/
Styles/
Rendering/
```

---

# 98. Suggested Frontend Layout

```text
src/
  app/
  api/
  editor/
    viewport/
    timeline/
    inspector/
    scene-tree/
    assistant/
  engine/
    runtime/
    assets/
    animation/
    behaviors/
    navigation/
    cameras/
    constraints/
  domain/
  state/
  components/
```

Keep rendering/runtime code separate from React UI where practical.

---

# 99. Shared Contracts

Use generated TypeScript API clients from OpenAPI.

For scene JSON, maintain JSON Schema versioning.

Example:

```text
scene-document.schema.json
scene-patch.schema.json
scene-command.schema.json
asset-manifest.schema.json
```

Add migration functions:

```text
v1 → v2
v2 → v3
```

Never assume scene schema will remain unchanged.

---

# 100. Security

Asset uploads are untrusted.

Requirements:

```text
file size limits
extension/MIME validation
isolated conversion workers
no execution of scripts embedded in assets
sanitize paths
block directory traversal
signed object-storage URLs
authorization on every project/asset
rate-limit AI and render endpoints
```

Never pass arbitrary uploaded Blender scripts into a trusted process.

---

# 101. Cost Controls

Expensive operations:

```text
LLM calls
render jobs
TTS
asset generation
conversion
storage
```

Track usage.

Use:

```text
project quotas
upload quotas
render duration limits
resolution limits
LLM token limits
```

MVP can expose usage diagnostics without billing.

---

# 102. Testing Strategy

## Unit tests

```text
scene command validation
timeline conflict resolution
capability checks
constraint math
scene patch application
schema migrations
```

## Runtime tests

```text
action produces expected transform at t
seek produces deterministic result
animation transitions
camera framing
attachments
```

## Integration tests

```text
upload GLB
create scene
AI plan mocked
apply patch
save
reload
render
```

## Visual regression

Render known scenes and compare screenshots within tolerance.

---

# 103. Golden Test Scenes

Create deterministic scenes:

```text
01_two_people_at_desk
02_walk_to_door
03_open_chest
04_pick_up_cup
05_camera_follow
06_imported_robot
07_custom_door
```

These become regression fixtures.

---

# 104. Observability

Track:

```text
asset load failures
scene compile errors
planner schema failures
unsupported action frequency
render failures
render duration
LLM latency
LLM correction rate
```

Log scene IDs and command IDs, not unnecessarily sensitive prompt content.

---

# 105. MVP Definition

The MVP should prove this exact loop:

```text
Create project
→ type prompt
→ generate scene
→ play animation
→ edit scene
→ prompt a modification
→ export video
```

Required scope:

```text
3 built-in humanoid styles
10-20 props
GLB import
basic asset classification
transform editor
anchors
simple capabilities
walk/sit/stand/lookAt
basic object transform behaviors
camera commands
timeline
LLM scene patching
undo/redo
save/load
MP4 render
```

---

# 106. MVP Non-Goals

Do not initially build:

```text
photorealistic rendering
perfect full-body IK
arbitrary procedural rigging
multiplayer editing
AI mesh generation
Blender replacement
advanced cloth
hair simulation
fluid simulation
high-end facial capture
general robotics-level planning
```

These will delay the core product unnecessarily.

---

# 107. Phase 0: Technical Prototype

Goal:

```text
prove deterministic script → commands → 3D playback
```

Build:

1. React Three Fiber scene.
2. One stick humanoid.
3. Desk/chair/door.
4. Hard-coded actions.
5. JSON timeline.
6. Play/pause/scrub.
7. Basic prompt translated manually or via LLM.

Demo:

> Two red stick figures sit at a desk. Person A stands and walks to the door.

No backend required beyond a thin API.

---

# 108. Phase 1: Real Editor

Build:

```text
scene tree
viewport selection
transform gizmos
inspector
timeline
undo/redo
project persistence
asset library
```

At this stage users can manually create scenes even without AI.

This is important.

AI should accelerate a functional editor, not compensate for a nonexistent editor.

---

# 109. Phase 2: Asset Import

Build:

```text
GLB upload
preview
asset manifests
classification
orientation
scale normalization
semantic anchors
animation listing
custom capability configuration
```

Support arbitrary static GLB immediately.

Support humanoid rigging as a specialized layer.

---

# 110. Phase 3: AI Planner

Build robust:

```text
semantic scene summary
structured output
asset resolution
command generation
scene patch generation
validation
error correction
```

AI should operate on existing project state.

---

# 111. Phase 4: Better Animation

Add:

```text
animation retargeting
IK
improved locomotion
navmesh
layered animations
speech
lip sync
gesture selection
```

---

# 112. Phase 5: Creator Product

Add:

```text
style kits
character continuity
scene templates
script import
shot presets
social export presets
voice library
project-wide reusable sets
```

---

# 113. Phase 6: Advanced Asset Intelligence

Potential:

```text
AI classification
automatic semantic anchor suggestions
automatic capability inference
automatic rig mapping
asset restyling
text-to-3D integrations
motion generation
```

Keep these optional.

The deterministic engine remains the source of truth.

---

# 114. First Repository Milestones

Recommended implementation order for Codex.

## Milestone 1

Create monorepo:

```text
/backend
/frontend
/contracts
```

Backend:

```text
ASP.NET Core API
health endpoint
PostgreSQL
EF migrations
```

Frontend:

```text
React
TypeScript
Vite
React Three Fiber
basic editor shell
```

---

## Milestone 2

Implement scene schema:

```text
SceneDocument
EntityInstance
Transform
AssetDefinition
Timeline
Track
Clip
```

Create:

```text
load
save
validate
clone
```

---

## Milestone 3

Implement runtime:

```text
SceneCompiler
EntityRuntime
TimelinePlayer
BehaviorRegistry
AnimationSystem
CameraSystem
```

---

## Milestone 4

Create built-in primitive assets.

Include procedural stick humanoid.

Implement:

```text
idle
walk
sit
stand
lookAt
```

---

## Milestone 5

Build editor:

```text
selection
transform controls
scene tree
inspector
timeline
playback
undo/redo
```

---

## Milestone 6

GLB import:

```text
upload
storage
GLTFLoader
manifest extraction
thumbnail
asset preview
scene instantiation
```

---

## Milestone 7

Semantic asset setup:

```text
classification
anchors
capabilities
animation mappings
```

---

## Milestone 8

LLM planning:

```text
prompt endpoint
scene semantic summary
structured ScenePatch output
validation
apply patch
```

---

## Milestone 9

Render/export.

Start with:

```text
headless Chromium
frame stepping
FFmpeg
MP4
```

---

# 115. Suggested Initial Scene Schema

```ts
export interface SceneDocument {
  schemaVersion: "1.0";
  id: string;
  name: string;
  duration: number;

  environment: EnvironmentDefinition;

  entities: EntityInstance[];
  cameras: CameraDefinition[];
  lights: LightDefinition[];

  timeline: TimelineDefinition;

  styleKitId?: string;
}

export interface EntityInstance {
  id: string;
  name: string;
  assetId: string;
  transform: TransformDefinition;
  componentOverrides?: Record<string, unknown>;
  metadata?: Record<string, string>;
}

export interface TransformDefinition {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}
```

---

# 116. Suggested Capability Contract

```ts
export interface CapabilityDefinition {
  type: string;
  version: number;
  config: unknown;
}

export interface AssetDefinition {
  id: string;
  name: string;
  source: AssetSource;
  capabilities: CapabilityDefinition[];
  anchors: AnchorDefinition[];
  animationMappings: Record<string, string>;
}
```

---

# 117. Suggested Behavior Registry

```ts
export interface BehaviorExecutor<T extends SceneCommand = SceneCommand> {
  readonly kind: T["kind"];

  validate(
    command: T,
    context: BehaviorValidationContext
  ): ValidationResult;

  create(
    command: T,
    context: BehaviorCreationContext
  ): RuntimeBehavior;
}
```

Registry:

```ts
class BehaviorRegistry {
  private executors = new Map<string, BehaviorExecutor>();

  register(executor: BehaviorExecutor) {
    this.executors.set(executor.kind, executor);
  }

  get(kind: string) {
    return this.executors.get(kind);
  }
}
```

---

# 118. Suggested Scene Patch Contract

```ts
export interface ScenePatch {
  id: string;
  operations: ScenePatchOperation[];
}

export type ScenePatchOperation =
  | AddEntityOperation
  | RemoveEntityOperation
  | UpdateEntityOperation
  | AddClipOperation
  | UpdateClipOperation
  | RemoveClipOperation
  | ReplaceAssetOperation
  | UpdateStyleOperation;
```

Apply patches through one service.

Do not let UI, AI, and backend mutate scene structures differently.

---

# 119. Planner Prompt Principles

System prompt should explicitly state:

```text
You are a scene planner, not a renderer.

Only use entities, assets, capabilities, commands, and anchors provided in context.

Never invent IDs.

Never emit code.

Return only schema-valid structured output.

Prefer minimal changes to the current scene.

Preserve unrelated user edits.

If an action is unsupported, return a warning instead of inventing functionality.
```

---

# 120. AI Planner Tool Model

Instead of giving the LLM unlimited freedom, expose conceptual tools:

```text
findAsset(query)
inspectEntity(id)
inspectCapabilities(id)
inspectTimeline(entityId)
addEntity(...)
addAction(...)
moveEntity(...)
replaceAsset(...)
```

Even if implemented internally as structured planning, tool-oriented design reduces hallucination.

---

# 121. Example End-to-End Flow

User:

> Add a blue robot opposite John at the desk. After John says "We need to leave", the robot gets up and walks to the door.

System:

```text
1. Identify John from existing scene.
2. Resolve desk.
3. Search assets for blue humanoid robot.
4. Instantiate robot.
5. Resolve desk opposite seat anchor.
6. Place robot.
7. Add seated initial state.
8. Add John dialogue.
9. Calculate dialogue duration.
10. Schedule robot Stand after dialogue.
11. Schedule WalkTo door.
12. Validate nav target.
13. Add timeline clips.
14. Return ScenePatch.
15. Apply patch.
16. Preview.
```

---

# 122. Example Imported Custom Object Flow

User uploads:

```text
alien-machine.glb
```

System detects:

```text
static mesh
3 child nodes
2 embedded animations
no humanoid skeleton
```

User configures:

```text
Type: machine
Animation "MachineOpen" → semantic action "open"
Anchor "controlPanel"
Capability: Openable
```

Later prompt:

> The robot walks to the alien machine and opens it.

Planner sees:

```text
robot: locomotion
alien-machine: openable
```

and compiles:

```text
WalkTo robot → machine.controlPanel
Open machine
```

This demonstrates why the architecture supports anything, not only stick figures.

---

# 123. Key Technical Risks

## Risk 1: Arbitrary assets are inconsistent

Mitigation:

```text
normalization wizard
semantic anchors
explicit capability configuration
humanoid bone mapping
asset validation
```

## Risk 2: LLM produces impossible scenes

Mitigation:

```text
strict commands
capability validation
asset lookup
constraint solver
warnings
```

## Risk 3: Animation retargeting quality

Mitigation:

```text
support known humanoid rigs first
test-pose wizard
animation preview
per-character correction profiles
```

## Risk 4: Automatic spatial layout looks bad

Mitigation:

```text
scene templates
anchors
heuristic placement
manual editing
AI modifies structured scene rather than regenerating
```

## Risk 5: Browser performance

Mitigation:

```text
GLB optimization
instancing
LOD later
texture compression
asset budgets
lazy loading
```

---

# 124. Architectural Rule: AI Must Never Be Required for Playback

A saved project must play without calling an LLM.

This is non-negotiable.

Persist:

```text
resolved assets
resolved commands
timeline
scene transforms
styles
```

AI is an authoring tool.

It is not the runtime.

---

# 125. Architectural Rule: User Assets Are First-Class

Do not design:

```text
built-in supported object types
+
random imported decoration
```

Design:

```text
any asset
+
metadata
+
anchors
+
capabilities
+
behaviors
```

Built-in assets simply arrive preconfigured.

Imported assets can become equally capable after configuration.

---

# 126. Architectural Rule: Separate Semantics From Geometry

"Chair" is not a mesh.

It is:

```text
geometry
+
semantic category
+
seat anchors
+
SeatProvider capability
```

"Door" is:

```text
geometry
+
hinge/open state
+
approach anchors
+
Openable capability
```

This abstraction is what allows natural-language control.

---

# 127. Architectural Rule: Everything Important Must Be Inspectable

For debugging and user trust, expose:

```text
selected entity ID
asset ID
capabilities
anchors
active behaviors
timeline clips
current state
planner warnings
```

A developer/debug panel should show this early.

---

# 128. Recommended First Vertical Slice

Implement exactly this scenario before expanding:

> Two custom-colored humanoids sit opposite each other at a desk. One says a line, stands, walks to a door, opens it, and exits. The camera follows.

Required systems:

```text
scene schema
built-in assets
anchors
humanoid animation
timeline
WalkTo
Sit
Stand
Speak placeholder
Open
camera follow
LLM planner
editor
save/load
```

If this scenario works reliably and is editable, the architecture is valid.

---

# 129. Definition of Done for Initial Product

A user can:

1. Create a project.
2. Upload a GLB.
3. Preview it.
4. Classify it.
5. Define anchors/capabilities where relevant.
6. Add it to a scene.
7. Use built-in or imported characters.
8. Type a natural-language scene instruction.
9. Get a valid structured scene.
10. Play it deterministically.
11. Scrub the timeline.
12. Manually modify the result.
13. Prompt a targeted modification.
14. Undo the modification.
15. Save/reload without changes.
16. Export an MP4.

At that point the product is real.

---

# 130. Final Product Model

The application should ultimately behave like:

```text
Canva
+
simple Blender scene editor
+
animation timeline
+
semantic asset system
+
LLM director
```

The key differentiator is not raw 3D rendering.

The key differentiator is:

> Any configured 3D asset becomes understandable and controllable through natural language while remaining deterministic and fully editable.

The foundation is:

```text
Asset
+ Semantics
+ Capabilities
+ Anchors
+ Behaviors
+ Timeline
```

Everything else builds on that model.

---

# 131. Implementation Instruction for Coding Agents

When implementing this system:

1. Do not bypass domain contracts with ad hoc Three.js state.
2. Do not let LLM output directly mutate runtime objects.
3. Do not execute arbitrary generated code.
4. Keep persistence models independent of Three.js classes.
5. Use schema validation at every AI boundary.
6. Build features as reusable capabilities and behaviors.
7. Preserve deterministic playback.
8. Preserve user editability.
9. Treat arbitrary GLB import as a core architectural requirement.
10. Implement the first vertical slice before adding broad feature coverage.

The first priority is not feature count.

The first priority is proving:

```text
Natural language
→ valid scene patch
→ deterministic runtime
→ editable timeline
→ reusable arbitrary assets
```

Once that loop is solid, expand the asset library, commands, animation quality, and AI sophistication.
