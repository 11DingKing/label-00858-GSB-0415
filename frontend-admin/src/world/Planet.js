import * as THREE from 'three';
import { CONFIG } from '../config.js';

// 创建更亮的发光粒子纹理
function createParticleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');

  // 更强的发光效果
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.1, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.3, 'rgba(255, 200, 100, 0.8)');
  gradient.addColorStop(0.5, 'rgba(255, 140, 0, 0.4)');
  gradient.addColorStop(0.7, 'rgba(255, 100, 0, 0.1)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export class Planet {
  constructor(scene) {
    this.scene = scene;
    this.mesh = null;
    this.init();
  }

  init() {
    const geometry = new THREE.BufferGeometry();
    const count = CONFIG.PLANET.PARTICLE_COUNT;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    const color = new THREE.Color(CONFIG.PLANET.COLOR);
    const radius = CONFIG.PLANET.RADIUS;

    // 70%的粒子在表面，30%在内部（让球面更密集）
    const surfaceRatio = 0.7;

    for (let i = 0; i < count; i++) {
      let r;
      if (Math.random() < surfaceRatio) {
        // 表面粒子 - 在球面附近
        r = radius * (0.9 + Math.random() * 0.1);
      } else {
        // 内部粒子
        r = radius * Math.cbrt(Math.random()) * 0.9;
      }

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // 颜色变化 - 橙色到金色
      const colorVariation = 0.8 + Math.random() * 0.2;
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g * colorVariation;
      colors[i * 3 + 2] = color.b * (0.5 + Math.random() * 0.5);

      // 随机大小变化
      sizes[i] = CONFIG.PLANET.PARTICLE_SIZE * (0.5 + Math.random() * 1.0);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: CONFIG.PLANET.PARTICLE_SIZE,
      map: createParticleTexture(),
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 1.0,
      sizeAttenuation: true
    });

    this.mesh = new THREE.Points(geometry, material);
    this.scene.add(this.mesh);
  }

  update(time) {
    if (this.mesh) {
      this.mesh.rotation.y = time * 0.05;
    }
  }
}
