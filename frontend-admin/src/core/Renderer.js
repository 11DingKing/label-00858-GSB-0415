import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class Renderer {
  constructor() {
    this.canvasContainer = document.getElementById('canvas-container');

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CONFIG.SCENE.BG_COLOR);
    this.scene.fog = new THREE.FogExp2(CONFIG.SCENE.BG_COLOR, 0.0005);

    this.camera = new THREE.PerspectiveCamera(
      CONFIG.SCENE.FOV,
      window.innerWidth / window.innerHeight,
      CONFIG.SCENE.NEAR,
      CONFIG.SCENE.FAR
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.canvasContainer.appendChild(this.renderer.domElement);

    window.addEventListener('resize', this.onResize.bind(this));
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
