import * as THREE from 'three';
import { CONFIG } from '../config.js';

// 创建更亮的白色发光粒子纹理
function createParticleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');

  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.15, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.4, 'rgba(200, 220, 255, 0.6)');
  gradient.addColorStop(0.7, 'rgba(150, 180, 255, 0.2)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export class Rings {
  constructor(scene) {
    this.scene = scene;
    this.mesh = null;
    this.init();
  }

  init() {
    const geometry = new THREE.BufferGeometry();
    const count = CONFIG.RINGS.PARTICLE_COUNT;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    // 两层环带
    const innerRadius = CONFIG.RINGS.INNER_RADIUS;
    const outerRadius = CONFIG.RINGS.OUTER_RADIUS;
    const midRadius = (innerRadius + outerRadius) / 2;

    for (let i = 0; i < count; i++) {
      // 分配到两个环带
      let baseRadius;
      let spread;

      if (i < count * 0.5) {
        // 内环
        baseRadius = innerRadius;
        spread = 25;
      } else {
        // 外环
        baseRadius = outerRadius;
        spread = 35;
      }

      const r = baseRadius + (Math.random() - 0.5) * spread * 2;
      const theta = Math.random() * Math.PI * 2;

      const x = r * Math.cos(theta);
      const y = (Math.random() - 0.5) * 8; // 稍微厚一点的环
      const z = r * Math.sin(theta);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // 随机大小
      sizes[i] = CONFIG.RINGS.PARTICLE_SIZE * (0.6 + Math.random() * 0.8);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: CONFIG.RINGS.PARTICLE_SIZE,
      color: CONFIG.RINGS.COLOR,
      map: createParticleTexture(),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true
    });

    this.mesh = new THREE.Points(geometry, material);
    // 倾斜环
    this.mesh.rotation.x = Math.PI * 0.12;
    this.mesh.rotation.z = Math.PI * 0.05;

    this.scene.add(this.mesh);
  }

  update(time) {
    if (this.mesh) {
      this.mesh.rotation.y = -time * 0.02;
    }
  }
}
