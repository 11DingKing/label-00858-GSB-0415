import * as THREE from 'three';
import { Renderer } from './Renderer.js';
import { CameraController } from './CameraController.js';
import { Planet } from '../world/Planet.js';
import { Rings } from '../world/Rings.js';
import { GestureManager } from '../input/GestureManager.js';
import { UIManager } from '../ui/UIManager.js';

export class App {
  constructor() {
    this.renderer = new Renderer();
    this.uiManager = new UIManager();
    this.cameraController = new CameraController(this.renderer.camera, this.renderer.renderer.domElement, this.uiManager);

    this.scene = this.renderer.scene;

    // World Objects
    this.planet = new Planet(this.scene);
    this.rings = new Rings(this.scene);

    // Input
    this.gestureManager = new GestureManager(this.cameraController, this.uiManager);

    // Ambient light for base visibility
    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);

    // Clock for animations
    this.clock = new THREE.Clock();
  }

  start() {
    this.animate();
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    const time = this.clock.getElapsedTime();

    // Update Logic
    this.cameraController.update();
    this.planet.update(time);
    this.rings.update(time);

    // Render
    this.renderer.render();
  }
}
