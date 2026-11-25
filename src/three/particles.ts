import * as THREE from 'three';

export interface ParticleSpawnOptions {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  r: number;
  g: number;
  b: number;
  life: number;
}

export class ParticlePool {
  public readonly points: THREE.Points;
  private readonly maxCount: number;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly velocities: Float32Array;
  private readonly lives: Float32Array;
  private readonly maxLives: Float32Array;
  private readonly gravity: number;
  private readonly drag: number;
  private cursor = 0;

  constructor(
    maxCount: number,
    texture: THREE.Texture,
    options: {
      size: number;
      additive?: boolean;
      opacity?: number;
      gravity?: number;
      drag?: number;
    }
  ) {
    this.maxCount = maxCount;
    this.gravity = options.gravity ?? -9.8;
    this.drag = options.drag ?? 0.98;

    this.positions = new Float32Array(maxCount * 3);
    this.colors = new Float32Array(maxCount * 3);
    this.velocities = new Float32Array(maxCount * 3);
    this.lives = new Float32Array(maxCount);
    this.maxLives = new Float32Array(maxCount);

    for (let i = 0; i < maxCount; i++) {
      this.positions[i * 3 + 1] = -9999;
      this.lives[i] = 0;
      this.maxLives[i] = 1;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    const material = new THREE.PointsMaterial({
      size: options.size,
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: options.opacity ?? 0.95,
      depthWrite: false,
      blending: options.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
  }

  public spawn(opts: ParticleSpawnOptions) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.maxCount;

    const i3 = i * 3;
    this.positions[i3] = opts.x;
    this.positions[i3 + 1] = opts.y;
    this.positions[i3 + 2] = opts.z;

    this.velocities[i3] = opts.vx;
    this.velocities[i3 + 1] = opts.vy;
    this.velocities[i3 + 2] = opts.vz;

    this.colors[i3] = opts.r;
    this.colors[i3 + 1] = opts.g;
    this.colors[i3 + 2] = opts.b;

    this.lives[i] = opts.life;
    this.maxLives[i] = opts.life;
  }

  public update(dt: number) {
    const damping = Math.pow(this.drag, dt * 60);
    for (let i = 0; i < this.maxCount; i++) {
      const life = this.lives[i];
      if (life <= 0) continue;

      const nextLife = life - dt;
      this.lives[i] = nextLife;
      const i3 = i * 3;

      if (nextLife <= 0) {
        this.positions[i3 + 1] = -9999;
        continue;
      }

      this.velocities[i3] *= damping;
      this.velocities[i3 + 1] = this.velocities[i3 + 1] * damping + this.gravity * dt;
      this.velocities[i3 + 2] *= damping;

      this.positions[i3] += this.velocities[i3] * dt;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * dt;
      this.positions[i3 + 2] += this.velocities[i3 + 2] * dt;

      const fade = Math.max(0, nextLife / this.maxLives[i]);
      if (fade < 0.35) {
        const s = fade / 0.35;
        this.colors[i3] *= 0.94 + 0.06 * s;
        this.colors[i3 + 1] *= 0.94 + 0.06 * s;
        this.colors[i3 + 2] *= 0.94 + 0.06 * s;
      }
    }

    (this.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.points.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  public dispose() {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}
