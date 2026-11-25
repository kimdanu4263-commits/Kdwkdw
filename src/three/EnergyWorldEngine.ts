import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import {
  PlantKey,
  SimulationState,
  STAGES,
  StageId,
  TelemetryPoint,
} from '../types/energy';
import { createProceduralTextures } from '../utils/textures';
import { createMaterialLibrary } from './materials';
import { ParticlePool } from './particles';
import { buildCorridorAndShell } from './rooms/buildCorridorAndShell';
import { buildCoilMagnetRoom } from './rooms/buildCoilMagnetRoom';
import { buildBicycleRoom } from './rooms/buildBicycleRoom';
import { buildHydroRoom } from './rooms/buildHydroRoom';
import { buildThermalRoom } from './rooms/buildThermalRoom';
import { buildWaveRoom } from './rooms/buildWaveRoom';
import { buildNuclearRoom } from './rooms/buildNuclearRoom';
import { buildCityHall } from './rooms/buildCityHall';
import { buildPowerGrid } from './buildPowerGrid';
import { soundEngine } from '../utils/audio';

const _pointer = new THREE.Vector2();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _moveVec = new THREE.Vector3();

export class EnergyWorldEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private hemiLight!: THREE.HemisphereLight;
  private isSoftwareGl: boolean;

  private frameId = 0;
  private disposed = false;
  private clock = new THREE.Clock();

  // First-person & Energy View camera state
  private yaw = 0;
  private pitch = -0.05;
  private targetYaw = 0;
  private targetPitch = -0.05;
  private targetFov = 62;
  private playerPos = new THREE.Vector3(0, 3.0, -17.5);
  private savedStandingPos: THREE.Vector3 | null = null;
  private savedGroundPose: {
    pos: THREE.Vector3;
    yaw: number;
    pitch: number;
    fov: number;
  } | null = null;
  private velocity = new THREE.Vector3();
  private moveInput = new THREE.Vector2(0, 0);
  private keyState: Record<string, boolean> = {};
  private cameraGlideTarget: {
    pos: THREE.Vector3;
    yaw: number;
    pitch: number;
    fov?: number;
  } | null = null;

  // Pointer & 3D interaction state
  private raycaster = new THREE.Raycaster();
  private activePointerId: number | null = null;
  private pointerDownPos = new THREE.Vector2();
  private lastPointerPos = new THREE.Vector2();
  private pointerDragged = false;
  private dragMode: 'none' | 'look' | 'magnet' | 'wave' = 'none';
  private magnetOffset = new THREE.Vector2(0.35, 0.0);
  private prevMagnetOffset = new THREE.Vector2(0.35, 0.0);
  private magnetBuffer = 0;
  private lastWaveStrokeTime = 0;

  // Particle pools
  private sparkPool: ParticlePool;
  private waterPool: ParticlePool;
  private steamPool: ParticlePool;
  private firePool: ParticlePool;

  // Simulation state
  public state: SimulationState;
  private telemetryHistory: TelemetryPoint[] = [];
  private lastTelemetryTime = 0;
  private lastUiSyncTime = 0;
  private onStateChange: (state: SimulationState, telemetry: TelemetryPoint[]) => void;
  private onRequestExplanation: (stageIndex: number) => void;
  private onRequestDashboard: () => void;

  // Subsystems
  private corridor: ReturnType<typeof buildCorridorAndShell>;
  private powerGrid: ReturnType<typeof buildPowerGrid>;
  private coilRoom: ReturnType<typeof buildCoilMagnetRoom>;
  private bikeRoom: ReturnType<typeof buildBicycleRoom>;
  private hydroRoom: ReturnType<typeof buildHydroRoom>;
  private thermalRoom: ReturnType<typeof buildThermalRoom>;
  private waveRoom: ReturnType<typeof buildWaveRoom>;
  private nuclearRoom: ReturnType<typeof buildNuclearRoom>;
  private cityHall: ReturnType<typeof buildCityHall>;
  private interactiveTargets: THREE.Object3D[] = [];
  private disposeCallbacks: (() => void)[] = [];

  constructor(
    container: HTMLElement,
    onStateChange: (state: SimulationState, telemetry: TelemetryPoint[]) => void,
    onRequestExplanation: (stageIndex: number) => void,
    onRequestDashboard: () => void
  ) {
    this.container = container;
    this.onStateChange = onStateChange;
    this.onRequestExplanation = onRequestExplanation;
    this.onRequestDashboard = onRequestDashboard;

    // Initial state: dark, power-starved city awaiting electricity from user-operated plants!
    this.state = {
      currentStageIndex: 6,
      unlockedStageIndex: 6,
      energyView: false,
      flowHighlight: false,
      inSeoulModel: false,
      totalMw: 0,
      totalGenerated: 0,
      bulbLit: {
        coil: true,
        bicycle: true,
        hydro: true,
        thermal: true,
        wave: true,
        nuclear: true,
        city: true,
      },
      cityLit: true,
      fov: 62,
      magnetFlux: 0,
      bicycleRiding: false,
      bicycleRpm: 0,
      bicycleGear: 2,
      hydroGateOpen: 0,
      hydroTurbulence: 0,
      thermalCoalFuel: 0,
      thermalTempC: 24,
      thermalSteamPressure: 0,
      thermalDamper: 0.75,
      waveEnergyLevel: 0,
      waveSensitivity: 1.0,
      nuclearRodWithdraw: 0,
      nuclearCoreTempC: 28,
      nuclearSteamPressure: 0,
      plants: {
        coil: { enabled: true, throttle: 1.0, currentMw: 0 },
        bicycle: { enabled: true, throttle: 1.0, currentMw: 0 },
        hydro: { enabled: true, throttle: 1.0, currentMw: 0 },
        thermal: { enabled: true, throttle: 1.0, currentMw: 0 },
        wave: { enabled: true, throttle: 1.0, currentMw: 0 },
        nuclear: { enabled: true, throttle: 1.0, currentMw: 0 },
      },
      cityDemandMw: 88,
      cityPowerRatio: 0,
      cityLevels: {
        streetlights: false,
        traffic: false,
        residential: false,
        school: false,
        shops: false,
        factory: false,
        fullCity: false,
      },
      nearbyHint: null,
    };

    // Detect Software WebGL
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x03060c);
    // Light atmospheric depth so Substation & Dark City remain clearly visible across the valley
    this.scene.fog = new THREE.FogExp2(0x03060c, 0.0042);

    this.camera = new THREE.PerspectiveCamera(62, width / height, 0.1, 320);
    this.camera.rotation.order = 'YXZ';
    this.camera.position.copy(this.playerPos);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04
    ).texture;
    this.scene.environmentIntensity = 0.14;
    pmremGenerator.dispose();

    // Soft twilight ambient so dark city silhouettes read clearly at 0 MW without blowing out
    this.hemiLight = new THREE.HemisphereLight(0x475569, 0x050912, 0.18);
    this.scene.add(this.hemiLight);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const textures = createProceduralTextures(maxAniso);
    const mats = createMaterialLibrary(textures, this.isSoftwareGl);
    this.disposeCallbacks.push(() => mats.dispose());

    // Particle pools
    this.sparkPool = new ParticlePool(450, textures.particleGlow, {
      size: 0.16,
      additive: true,
      gravity: -3.2,
      drag: 0.94,
    });
    this.waterPool = new ParticlePool(650, textures.waterDroplet, {
      size: 0.19,
      additive: false,
      opacity: 0.78,
      gravity: -11.5,
      drag: 0.99,
    });
    this.steamPool = new ParticlePool(550, textures.waterDroplet, {
      size: 0.42,
      additive: false,
      opacity: 0.42,
      gravity: 1.4,
      drag: 0.96,
    });
    this.firePool = new ParticlePool(350, textures.particleGlow, {
      size: 0.24,
      additive: true,
      gravity: 2.2,
      drag: 0.94,
    });

    this.scene.add(
      this.sparkPool.points,
      this.waterPool.points,
      this.steamPool.points,
      this.firePool.points
    );

    // Build unified Energy Valley + Transmission Grid + Reactive Seoul City
    this.corridor = buildCorridorAndShell(mats);
    this.powerGrid = buildPowerGrid(mats, textures.particleGlow);
    this.coilRoom = buildCoilMagnetRoom(mats, textures, this.sparkPool);
    this.bikeRoom = buildBicycleRoom(mats, this.sparkPool);
    this.hydroRoom = buildHydroRoom(mats, this.waterPool, this.sparkPool);
    this.thermalRoom = buildThermalRoom(
      mats,
      this.firePool,
      this.steamPool,
      this.sparkPool
    );
    this.waveRoom = buildWaveRoom(mats, this.waterPool, this.sparkPool);
    this.nuclearRoom = buildNuclearRoom(mats, this.steamPool, this.sparkPool);
    this.cityHall = buildCityHall(mats, textures);

    this.corridor.registerStageGroup('coil', this.coilRoom.group);
    this.corridor.registerStageGroup('bicycle', this.bikeRoom.group);
    this.corridor.registerStageGroup('hydro', this.hydroRoom.group);
    this.corridor.registerStageGroup('thermal', this.thermalRoom.group);
    this.corridor.registerStageGroup('wave', this.waveRoom.group);
    this.corridor.registerStageGroup('nuclear', this.nuclearRoom.group);

    this.scene.add(
      this.corridor.group,
      this.powerGrid.group,
      this.coilRoom.group,
      this.bikeRoom.group,
      this.hydroRoom.group,
      this.thermalRoom.group,
      this.waveRoom.group,
      this.nuclearRoom.group,
      this.cityHall.group
    );

    this.interactiveTargets = [
      ...this.coilRoom.interactiveObjects,
      ...this.corridor.interactiveObjects,
      ...this.bikeRoom.interactiveObjects,
      ...this.hydroRoom.gateInteractiveObjects,
      ...this.thermalRoom.interactiveObjects,
      ...this.waveRoom.interactiveObjects,
      ...this.nuclearRoom.interactiveObjects,
      ...this.cityHall.interactiveObjects,
      this.powerGrid.substationCoreHit,
    ];

    if (!this.isSoftwareGl) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      const bloom = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        0.16,
        0.25,
        0.88
      );
      this.composer.addPass(bloom);
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.pushStateImmediate();
    this.startLoop();
  }

  private bindEvents() {
    const dom = this.renderer.domElement;

    const onPointerDown = (e: PointerEvent) => {
      if (this.activePointerId !== null) return;
      this.activePointerId = e.pointerId;
      dom.setPointerCapture(e.pointerId);
      this.pointerDownPos.set(e.clientX, e.clientY);
      this.lastPointerPos.set(e.clientX, e.clientY);
      this.pointerDragged = false;
      this.cameraGlideTarget = null;

      const hit = this.raycastAt(e.clientX, e.clientY);
      if (hit && hit.object.userData.interactType === 'drag_magnet') {
        this.dragMode = 'magnet';
      } else if (hit && hit.object.userData.interactType === 'trigger_wave') {
        this.dragMode = 'wave';
        this.waveRoom.addWaveImpulse(hit.point.x, hit.point.z, 0.78);
        soundEngine.playWaveSplash();
        this.lastWaveStrokeTime = performance.now();
      } else {
        this.dragMode = 'look';
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (this.activePointerId !== e.pointerId) return;
      const dx = e.clientX - this.lastPointerPos.x;
      const dy = e.clientY - this.lastPointerPos.y;
      this.lastPointerPos.set(e.clientX, e.clientY);

      if (this.pointerDownPos.distanceTo(this.lastPointerPos) > 6) {
        this.pointerDragged = true;
      }

      if (this.dragMode === 'magnet') {
        this.magnetOffset.x = THREE.MathUtils.clamp(
          this.magnetOffset.x + dx * 0.008,
          -1.35,
          1.35
        );
        this.magnetOffset.y = THREE.MathUtils.clamp(
          this.magnetOffset.y - dy * 0.007,
          -0.55,
          0.75
        );
      } else if (this.dragMode === 'wave') {
        const now = performance.now();
        if (now - this.lastWaveStrokeTime > 140) {
          const hit = this.raycastAt(e.clientX, e.clientY);
          if (hit && hit.object === this.waveRoom.oceanHitMesh) {
            this.waveRoom.addWaveImpulse(hit.point.x, hit.point.z, 0.65);
            soundEngine.playWaveSplash();
            this.lastWaveStrokeTime = now;
          }
        }
      } else if (this.dragMode === 'look') {
        const sensitivity = 0.0038 * (this.targetFov / 62);
        this.targetYaw -= dx * sensitivity;
        const minPitch = this.state.energyView ? -1.3 : -1.15;
        const maxPitch = this.state.energyView ? -0.15 : 1.15;
        this.targetPitch = THREE.MathUtils.clamp(
          this.targetPitch - dy * sensitivity,
          minPitch,
          maxPitch
        );
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (this.activePointerId !== e.pointerId) return;
      if (dom.hasPointerCapture(e.pointerId)) {
        dom.releasePointerCapture(e.pointerId);
      }
      if (!this.pointerDragged && this.dragMode !== 'magnet') {
        const hit = this.raycastAt(e.clientX, e.clientY);
        if (hit) {
          this.handleObjectClick(hit);
        }
      }
      this.activePointerId = null;
      this.dragMode = 'none';
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      this.setZoom(this.targetFov + e.deltaY * 0.04);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      this.keyState[e.code] = true;
      if (e.code === 'Space' && this.state.currentStageIndex === 1) {
        e.preventDefault();
        this.pedalBicycleImpulse();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      this.keyState[e.code] = false;
    };

    const onResize = () => {
      if (this.disposed) return;
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.composer?.setSize(w, h);
    };

    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onResize);

    this.disposeCallbacks.push(() => {
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('wheel', onWheel);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
    });
  }

  private raycastAt(clientX: number, clientY: number): THREE.Intersection | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    _pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    _pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(_pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.interactiveTargets, false);
    return hits.length > 0 ? hits[0] : null;
  }

  private handleObjectClick(hit: THREE.Intersection) {
    const data = hit.object.userData;
    if (!data || !data.interactType) return;

    switch (data.interactType) {
      case 'light_bulb':
        this.toggleRoomLight(data.stageId as StageId);
        break;
      case 'toggle_bicycle':
        this.setBicycleRiding(!this.state.bicycleRiding);
        break;
      case 'toggle_hydro_gate':
        this.setHydroGate(this.state.hydroGateOpen > 0.5 ? 0 : 1);
        break;
      case 'add_coal':
        this.addCoal(28);
        break;
      case 'trigger_wave':
        this.waveRoom.addWaveImpulse(hit.point.x, hit.point.z, 0.78);
        soundEngine.playWaveSplash();
        break;
      case 'toggle_rods':
        this.setNuclearRods(this.state.nuclearRodWithdraw > 0.5 ? 0.0 : 0.85);
        break;
      case 'light_city':
        this.toggleCityLight();
        break;
      case 'enter_seoul':
        this.toggleEnterSeoul(!this.state.inSeoulModel);
        break;
      case 'open_explanation':
        this.onRequestExplanation(data.stageIndex as number);
        break;
      case 'open_dashboard':
        this.onRequestDashboard();
        break;
    }
  }

  // Public Controls API
  public setMoveInput(x: number, y: number) {
    this.moveInput.set(x, y);
    if (Math.abs(x) > 0.05 || Math.abs(y) > 0.05) {
      this.cameraGlideTarget = null;
    }
  }

  public setZoom(fov: number) {
    this.targetFov = THREE.MathUtils.clamp(fov, 24, 78);
    this.state.fov = Math.round(this.targetFov);
  }

  public zoomIn() {
    this.setZoom(this.targetFov - 8);
  }

  public zoomOut() {
    this.setZoom(this.targetFov + 8);
  }

  public resetZoom() {
    this.setZoom(62);
  }

  public setFlowHighlight(enabled: boolean) {
    this.state.flowHighlight = enabled;
    this.pushStateImmediate();
  }

  public setEnergyView(enabled: boolean) {
    if (this.state.energyView === enabled) return;
    if (enabled) {
      if (this.state.bicycleRiding) {
        this.state.bicycleRiding = false;
      }
      this.savedGroundPose = {
        pos: this.playerPos.clone(),
        yaw: this.targetYaw,
        pitch: this.targetPitch,
        fov: this.targetFov,
      };
      this.state.energyView = true;
      this.targetFov = 56;
      this.state.fov = 56;
      // Elevated panoramic vantage framing all 6 power plants -> transmission lines -> substation -> city
      this.cameraGlideTarget = {
        pos: new THREE.Vector3(0, 48, 22),
        yaw: 0,
        pitch: -0.52,
        fov: 56,
      };
    } else {
      this.state.energyView = false;
      const back = this.savedGroundPose ?? {
        pos: new THREE.Vector3(0, 3.0, -17.5),
        yaw: 0,
        pitch: -0.05,
        fov: 62,
      };
      this.targetFov = back.fov;
      this.state.fov = Math.round(back.fov);
      this.cameraGlideTarget = {
        pos: back.pos.clone(),
        yaw: back.yaw,
        pitch: back.pitch,
        fov: back.fov,
      };
    }
    this.pushStateImmediate();
  }

  public teleportToStage(index: number) {
    if (this.state.bicycleRiding) {
      this.state.bicycleRiding = false;
    }
    if (this.state.energyView) {
      this.state.energyView = false;
      this.targetFov = 62;
      this.state.fov = 62;
    }
    const stage = STAGES[index];
    if (!stage) return;
    this.cameraGlideTarget = {
      pos: new THREE.Vector3(...stage.spawnPos),
      yaw: stage.spawnYaw,
      pitch: index === 6 ? -0.22 : -0.05,
      fov: 62,
    };
    this.pushStateImmediate();
  }

  public teleportToObservatory() {
    if (this.state.bicycleRiding) {
      this.state.bicycleRiding = false;
    }
    if (this.state.energyView) {
      this.state.energyView = false;
    }
    this.targetFov = 62;
    this.state.fov = 62;
    this.cameraGlideTarget = {
      pos: new THREE.Vector3(0, 3.0, -17.5),
      yaw: 0,
      pitch: -0.05,
      fov: 62,
    };
    this.pushStateImmediate();
  }

  public tryLightRoom(stageId: StageId): boolean {
    if (stageId === 'city') {
      if (!this.state.cityLit) return this.toggleCityLight();
      return true;
    }
    if (!this.state.bulbLit[stageId]) {
      return this.toggleRoomLight(stageId);
    }
    return true;
  }

  public toggleRoomLight(stageId: StageId): boolean {
    if (stageId === 'city') {
      return this.toggleCityLight();
    }
    this.state.bulbLit[stageId] = !this.state.bulbLit[stageId];
    soundEngine.playSwitchLight(false);
    this.pushStateImmediate();
    return true;
  }

  public toggleCityLight(): boolean {
    this.state.cityLit = !this.state.cityLit;
    this.state.bulbLit.city = this.state.cityLit;
    soundEngine.playSwitchLight(true);
    this.pushStateImmediate();
    return true;
  }

  public toggleEnterSeoul(enter: boolean) {
    if (this.state.energyView) {
      this.state.energyView = false;
    }
    if (enter) {
      this.state.inSeoulModel = true;
      this.cameraGlideTarget = {
        pos: new THREE.Vector3(-6.5, 1.85, -90.0),
        yaw: 0,
        pitch: -0.05,
        fov: 62,
      };
    } else {
      this.state.inSeoulModel = false;
      this.cameraGlideTarget = {
        pos: new THREE.Vector3(...STAGES[6].spawnPos),
        yaw: 0,
        pitch: -0.22,
        fov: 62,
      };
    }
    this.pushStateImmediate();
  }

  public shakeMagnetStep(direction: number) {
    this.magnetOffset.x = THREE.MathUtils.clamp(direction * 0.95, -1.25, 1.25);
    this.magnetBuffer = Math.max(this.magnetBuffer, 0.72);
  }

  public applyCrankDelta(deltaRadians: number) {
    const impulse = Math.min(28, Math.abs(deltaRadians) * 18);
    if (impulse > 0.5) {
      this.state.bicycleRpm = Math.min(165, this.state.bicycleRpm + impulse);
      soundEngine.playPedalClick();
    }
  }

  public pedalBicycleImpulse() {
    this.state.bicycleRpm = Math.min(155, this.state.bicycleRpm + 28);
    soundEngine.playPedalClick();
  }

  public setBicycleRiding(riding: boolean) {
    if (this.state.energyView && riding) {
      this.state.energyView = false;
    }
    if (riding && !this.state.bicycleRiding) {
      this.savedStandingPos = this.playerPos.clone();
      this.state.bicycleRiding = true;
      this.cameraGlideTarget = {
        pos: this.bikeRoom.rideCameraPos.clone(),
        yaw: 0,
        pitch: -0.44,
      };
    } else if (!riding && this.state.bicycleRiding) {
      this.state.bicycleRiding = false;
      const backPos =
        this.savedStandingPos ?? new THREE.Vector3(...STAGES[1].spawnPos);
      this.cameraGlideTarget = {
        pos: backPos,
        yaw: 0,
        pitch: -0.05,
      };
    }
    this.pushStateImmediate();
  }

  public setBicycleGear(gear: number) {
    this.state.bicycleGear = THREE.MathUtils.clamp(gear, 1, 3);
  }

  public setHydroGate(val: number) {
    this.state.hydroGateOpen = THREE.MathUtils.clamp(val, 0, 1);
  }

  public addCoal(amount = 28) {
    this.state.thermalCoalFuel = Math.min(100, this.state.thermalCoalFuel + amount);
    soundEngine.playCoalDrop();
  }

  public setThermalDamper(val: number) {
    this.state.thermalDamper = THREE.MathUtils.clamp(val, 0.25, 1.0);
  }

  public triggerManualWave() {
    const [wx, , wz] = STAGES[4].centerPos;
    this.waveRoom.addWaveImpulse(
      wx + (Math.random() - 0.5) * 3.5,
      wz - 0.8 + (Math.random() - 0.5) * 2.5,
      0.85
    );
    soundEngine.playWaveSplash();
  }

  public setWaveSensitivity(val: number) {
    this.state.waveSensitivity = THREE.MathUtils.clamp(val, 0.5, 1.5);
  }

  public setNuclearRods(val: number) {
    this.state.nuclearRodWithdraw = THREE.MathUtils.clamp(val, 0, 1);
  }

  public setPlantEnabled(plant: PlantKey, enabled: boolean) {
    this.state.plants[plant].enabled = enabled;
    // When turning a continuous plant ON from the Control Center, engage dispatch if idle
    if (enabled) {
      if (plant === 'hydro' && this.state.hydroGateOpen < 0.1) {
        this.state.hydroGateOpen = 0.78;
      } else if (plant === 'thermal' && this.state.thermalCoalFuel < 10) {
        this.state.thermalCoalFuel = 85;
      } else if (plant === 'nuclear' && this.state.nuclearRodWithdraw < 0.1) {
        this.state.nuclearRodWithdraw = 0.75;
      } else if (plant === 'wave' && this.state.waveEnergyLevel < 0.1) {
        this.triggerManualWave();
      } else if (plant === 'bicycle' && this.state.bicycleRpm < 15) {
        this.state.bicycleRpm = 90;
      } else if (plant === 'coil') {
        this.magnetBuffer = 0.85;
      }
    }
    this.pushStateImmediate();
  }

  public setPlantThrottle(plant: PlantKey, throttle: number) {
    this.state.plants[plant].throttle = THREE.MathUtils.clamp(throttle, 0.1, 1.0);
    this.pushStateImmediate();
  }

  private pushStateImmediate() {
    this.onStateChange(
      {
        ...this.state,
        bulbLit: { ...this.state.bulbLit },
        cityLevels: { ...this.state.cityLevels },
        plants: {
          coil: { ...this.state.plants.coil },
          bicycle: { ...this.state.plants.bicycle },
          hydro: { ...this.state.plants.hydro },
          thermal: { ...this.state.plants.thermal },
          wave: { ...this.state.plants.wave },
          nuclear: { ...this.state.plants.nuclear },
        },
      },
      [...this.telemetryHistory]
    );
  }

  private startLoop() {
    const tick = () => {
      if (this.disposed) return;
      const dt = Math.min(0.05, this.clock.getDelta());
      const elapsed = this.clock.elapsedTime;

      this.updateCameraAndMovement(dt);
      this.updateSimulation(dt, elapsed);

      if (this.composer && !this.isSoftwareGl) {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (status === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private updateCameraAndMovement(dt: number) {
    if (Math.abs(this.camera.fov - this.targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, this.targetFov, 10, dt);
      this.camera.updateProjectionMatrix();
    }

    if (this.cameraGlideTarget) {
      this.playerPos.lerp(this.cameraGlideTarget.pos, 1 - Math.exp(-6.5 * dt));
      this.targetYaw = this.cameraGlideTarget.yaw;
      this.targetPitch = this.cameraGlideTarget.pitch;
      if (this.playerPos.distanceTo(this.cameraGlideTarget.pos) < 0.05) {
        this.cameraGlideTarget = null;
      }
    }

    this.yaw = THREE.MathUtils.damp(this.yaw, this.targetYaw, 14, dt);
    this.pitch = THREE.MathUtils.damp(this.pitch, this.targetPitch, 14, dt);

    if (!this.state.bicycleRiding) {
      let inputX = this.moveInput.x;
      let inputY = this.moveInput.y;
      if (this.keyState['KeyW'] || this.keyState['ArrowUp']) inputY += 1;
      if (this.keyState['KeyS'] || this.keyState['ArrowDown']) inputY -= 1;
      if (this.keyState['KeyD'] || this.keyState['ArrowRight']) inputX += 1;
      if (this.keyState['KeyA'] || this.keyState['ArrowLeft']) inputX -= 1;

      inputX = THREE.MathUtils.clamp(inputX, -1, 1);
      inputY = THREE.MathUtils.clamp(inputY, -1, 1);

      _forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
      _right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();
      _moveVec
        .set(0, 0, 0)
        .addScaledVector(_forward, inputY)
        .addScaledVector(_right, inputX);
      if (_moveVec.lengthSq() > 1) _moveVec.normalize();

      const walkSpeed = this.state.energyView ? 22.0 : 9.5;
      this.velocity.x = THREE.MathUtils.damp(this.velocity.x, _moveVec.x * walkSpeed, 10, dt);
      this.velocity.z = THREE.MathUtils.damp(this.velocity.z, _moveVec.z * walkSpeed, 10, dt);

      this.playerPos.x += this.velocity.x * dt;
      this.playerPos.z += this.velocity.z * dt;

      // Full open-valley + city bounds
      this.playerPos.x = THREE.MathUtils.clamp(this.playerPos.x, -42, 42);
      this.playerPos.z = THREE.MathUtils.clamp(this.playerPos.z, -114, 28);

      if (!this.state.energyView) {
        // Smooth elevation across Valley (1.7m) -> Overlook Terrace (4.2m) -> Miniature Seoul Streets (1.75m)
        const terraceZ = STAGES[6].spawnPos[2]; // -55.0
        const stairStartZ = terraceZ + 8.4; // -46.6
        const stairEndZ = terraceZ + 4.2; // -50.8
        const seoulEnterStartZ = terraceZ - 4.2; // -59.2
        const seoulFloorStartZ = terraceZ - 9.6; // -64.6

        let groundEyeY = 1.7;
        if (this.playerPos.z <= stairStartZ) {
          if (this.playerPos.z >= stairEndZ && Math.abs(this.playerPos.x) <= 12.0) {
            const t = THREE.MathUtils.clamp((stairStartZ - this.playerPos.z) / 4.2, 0, 1);
            groundEyeY = 1.7 + t * 2.5;
          } else if (this.playerPos.z > seoulEnterStartZ && Math.abs(this.playerPos.x) <= 12.2) {
            groundEyeY = 4.2;
          } else if (this.playerPos.z <= seoulEnterStartZ) {
            if (this.playerPos.z >= seoulFloorStartZ) {
              const t = THREE.MathUtils.clamp(
                (seoulEnterStartZ - this.playerPos.z) / (seoulEnterStartZ - seoulFloorStartZ),
                0,
                1
              );
              groundEyeY = 4.2 - t * 2.45;
            } else {
              groundEyeY = 1.75;
            }
          }
        }
        this.state.inSeoulModel = this.playerPos.z <= seoulEnterStartZ;
        if (!this.cameraGlideTarget) {
          this.playerPos.y = THREE.MathUtils.damp(this.playerPos.y, groundEyeY, 10, dt);
        }
      } else {
        this.state.inSeoulModel = false;
      }
    }

    this.camera.position.copy(this.playerPos);
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    // Nearest station detection
    const px = this.playerPos.x;
    const pz = this.playerPos.z;
    let closestIdx = 6;
    let bestDistSq = Infinity;
    for (let i = 0; i < STAGES.length; i++) {
      const s = STAGES[i];
      const refPos = i === 6 ? s.spawnPos : s.centerPos;
      const dx = px - refPos[0];
      const dz = pz - refPos[2];
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        closestIdx = s.index;
      }
    }
    this.state.currentStageIndex = closestIdx;
  }

  private updateSimulation(dt: number, elapsed: number) {
    // 1. Coil & Magnet induction
    const magnetSpeed =
      this.magnetOffset.distanceTo(this.prevMagnetOffset) / Math.max(0.005, dt);
    this.prevMagnetOffset.copy(this.magnetOffset);
    const instantFlux = THREE.MathUtils.clamp(magnetSpeed * 0.22, 0, 1);
    this.state.magnetFlux = THREE.MathUtils.damp(this.state.magnetFlux, instantFlux, 9, dt);
    if (this.state.magnetFlux > 0.08) {
      this.magnetBuffer = Math.max(this.magnetBuffer, this.state.magnetFlux);
      this.state.totalGenerated += this.state.magnetFlux * 16 * dt;
      if (this.state.magnetFlux > 0.25) soundEngine.playSpark(this.state.magnetFlux);
    }
    // Smooth capacitor decay (~3-4s visible flow pulse when magnet is shaken)
    this.magnetBuffer = THREE.MathUtils.damp(this.magnetBuffer, 0, 0.55, dt);

    // 2. Bicycle Generator (kinetic RPM)
    this.state.bicycleRpm = THREE.MathUtils.damp(this.state.bicycleRpm, 0, 0.65, dt);
    const gearFactor = 0.72 + this.state.bicycleGear * 0.24;
    if (this.state.bicycleRpm > 5) {
      this.state.totalGenerated += (this.state.bicycleRpm / 110) * 22 * gearFactor * dt;
    }

    // 3. Hydroelectric Dam
    this.state.hydroTurbulence = this.state.hydroGateOpen > 0.02 ? this.state.hydroGateOpen : 0;
    if (this.state.hydroGateOpen > 0.02) {
      this.state.totalGenerated += this.state.hydroGateOpen * 32 * dt;
    }

    // 4. Thermal Coal & Steam
    if (this.state.thermalCoalFuel > 0.1) {
      this.state.thermalCoalFuel = Math.max(
        0,
        this.state.thermalCoalFuel - (1.8 + this.state.thermalDamper * 1.6) * dt
      );
      const targetTemp =
        120 +
        Math.min(1, this.state.thermalCoalFuel / 60) *
          400 *
          this.state.thermalDamper;
      this.state.thermalTempC = THREE.MathUtils.damp(
        this.state.thermalTempC,
        targetTemp,
        1.1,
        dt
      );
    } else {
      this.state.thermalTempC = THREE.MathUtils.damp(this.state.thermalTempC, 24, 0.7, dt);
    }
    const targetSteam = THREE.MathUtils.clamp((this.state.thermalTempC - 100) / 380, 0, 1);
    this.state.thermalSteamPressure = THREE.MathUtils.damp(
      this.state.thermalSteamPressure,
      targetSteam,
      1.8,
      dt
    );
    if (this.state.thermalSteamPressure > 0.05) {
      this.state.totalGenerated += this.state.thermalSteamPressure * 38 * dt;
    }

    // 5. Wave Power
    const waveLevel = this.waveRoom.update(
      dt,
      elapsed,
      this.state.waveSensitivity,
      this.state.bulbLit.wave
    );
    this.state.waveEnergyLevel = waveLevel;
    if (waveLevel > 0.05) {
      this.state.totalGenerated += waveLevel * 28 * dt;
    }

    // 6. Nuclear Fission
    if (this.state.nuclearRodWithdraw > 0.02) {
      const targetCoreT = 40 + this.state.nuclearRodWithdraw * 590;
      this.state.nuclearCoreTempC = THREE.MathUtils.damp(
        this.state.nuclearCoreTempC,
        targetCoreT,
        1.0,
        dt
      );
      if (this.state.nuclearRodWithdraw > 0.15) {
        soundEngine.playGeigerTick(this.state.nuclearRodWithdraw);
      }
    } else {
      this.state.nuclearCoreTempC = THREE.MathUtils.damp(this.state.nuclearCoreTempC, 28, 0.8, dt);
    }
    const nucTargetPressure = THREE.MathUtils.clamp(
      (this.state.nuclearCoreTempC - 100) / 480,
      0,
      1
    );
    this.state.nuclearSteamPressure = THREE.MathUtils.damp(
      this.state.nuclearSteamPressure,
      nucTargetPressure,
      1.6,
      dt
    );
    if (this.state.nuclearSteamPressure > 0.05) {
      this.state.totalGenerated += this.state.nuclearSteamPressure * 54 * dt;
    }

    // True live MW calculation strictly driven by user operations + plant switch/throttle!
    const p = this.state.plants;
    const ripple = (freq: number) => 1 + Math.sin(elapsed * freq) * 0.025;

    const coilActive = Math.max(this.state.magnetFlux, this.magnetBuffer);
    p.coil.currentMw =
      p.coil.enabled && coilActive > 0.03
        ? Number((coilActive * 15.0 * p.coil.throttle * ripple(3.1)).toFixed(1))
        : 0;

    p.bicycle.currentMw =
      p.bicycle.enabled && this.state.bicycleRpm > 4
        ? Number(
            (
              (this.state.bicycleRpm / 115) *
              20.0 *
              gearFactor *
              p.bicycle.throttle *
              ripple(2.4)
            ).toFixed(1)
          )
        : 0;

    p.hydro.currentMw =
      p.hydro.enabled && this.state.hydroGateOpen > 0.02
        ? Number((this.state.hydroGateOpen * 32.0 * p.hydro.throttle * ripple(1.7)).toFixed(1))
        : 0;

    p.thermal.currentMw =
      p.thermal.enabled && this.state.thermalSteamPressure > 0.03
        ? Number(
            (this.state.thermalSteamPressure * 38.0 * p.thermal.throttle * ripple(2.0)).toFixed(1)
          )
        : 0;

    p.wave.currentMw =
      p.wave.enabled && this.state.waveEnergyLevel > 0.03
        ? Number((this.state.waveEnergyLevel * 26.0 * p.wave.throttle * ripple(1.3)).toFixed(1))
        : 0;

    p.nuclear.currentMw =
      p.nuclear.enabled && this.state.nuclearSteamPressure > 0.03
        ? Number(
            (this.state.nuclearSteamPressure * 54.0 * p.nuclear.throttle * ripple(0.9)).toFixed(1)
          )
        : 0;

    const totalMw =
      p.coil.currentMw +
      p.bicycle.currentMw +
      p.hydro.currentMw +
      p.thermal.currentMw +
      p.wave.currentMw +
      p.nuclear.currentMw;

    this.state.totalMw = Number(totalMw.toFixed(1));

    const powerRatio = this.state.cityDemandMw > 0 ? totalMw / this.state.cityDemandMw : 1;
    const effectiveRatio = this.state.cityLit ? powerRatio : 0;
    this.state.cityPowerRatio = effectiveRatio;

    this.state.cityLevels = {
      streetlights: effectiveRatio >= 0.04,
      traffic: effectiveRatio >= 0.16,
      residential: effectiveRatio >= 0.28,
      school: effectiveRatio >= 0.36,
      shops: effectiveRatio >= 0.50,
      factory: effectiveRatio >= 0.65,
      fullCity: effectiveRatio >= 0.85,
    };

    // Sky twilight ambient reacts smoothly with city power level (slightly dimmed during Flow Highlight)
    const targetHemi =
      (0.16 + Math.min(1, effectiveRatio) * 0.34) * (this.state.flowHighlight ? 0.65 : 1.0);
    this.hemiLight.intensity = THREE.MathUtils.damp(this.hemiLight.intensity, targetHemi, 2.5, dt);

    // Update 3D Subsystems
    this.corridor.update(dt, elapsed, this.state.bulbLit, this.state.cityLit);
    this.powerGrid.update(
      dt,
      elapsed,
      this.state.plants,
      totalMw,
      this.state.cityDemandMw,
      this.state.energyView,
      this.state.flowHighlight
    );
    this.coilRoom.update(
      dt,
      elapsed,
      this.magnetOffset,
      Math.max(this.state.magnetFlux, this.magnetBuffer * 0.45),
      this.state.bulbLit.coil
    );
    this.bikeRoom.update(dt, elapsed, this.state.bicycleRpm, this.state.bulbLit.bicycle);
    this.hydroRoom.update(
      dt,
      elapsed,
      p.hydro.enabled ? this.state.hydroGateOpen : 0,
      this.state.bulbLit.hydro
    );
    this.thermalRoom.update(
      dt,
      elapsed,
      p.thermal.enabled ? this.state.thermalCoalFuel : 0,
      p.thermal.enabled ? this.state.thermalSteamPressure : 0,
      this.state.bulbLit.thermal
    );
    this.nuclearRoom.update(
      dt,
      elapsed,
      p.nuclear.enabled ? this.state.nuclearRodWithdraw : 0,
      p.nuclear.enabled ? this.state.nuclearSteamPressure : 0,
      this.state.bulbLit.nuclear
    );

    this.cityHall.update(dt, elapsed, this.state.cityLit, effectiveRatio, this.state.flowHighlight);

    this.sparkPool.update(dt);
    this.waterPool.update(dt);
    this.steamPool.update(dt);
    this.firePool.update(dt);

    if (elapsed - this.lastTelemetryTime >= 0.5) {
      this.lastTelemetryTime = elapsed;
      this.telemetryHistory.push({
        time: Math.round(elapsed),
        totalMw: Number(totalMw.toFixed(1)),
        demandMw: this.state.cityDemandMw,
        coil: p.coil.currentMw,
        bicycle: p.bicycle.currentMw,
        hydro: p.hydro.currentMw,
        thermal: p.thermal.currentMw,
        wave: p.wave.currentMw,
        nuclear: p.nuclear.currentMw,
      });
      if (this.telemetryHistory.length > 48) {
        this.telemetryHistory.shift();
      }
    }

    if (elapsed - this.lastUiSyncTime >= 0.065) {
      this.lastUiSyncTime = elapsed;
      this.pushStateImmediate();
    }
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.disposeCallbacks.forEach((fn) => fn());
    this.sparkPool.dispose();
    this.waterPool.dispose();
    this.steamPool.dispose();
    this.firePool.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
