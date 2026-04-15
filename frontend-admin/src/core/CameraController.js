import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class CameraController {
  constructor(camera, domElement, uiManager = null) {
    this.camera = camera;
    this.domElement = domElement;
    this.uiManager = uiManager;

    // Spherical coordinates
    this.spherical = new THREE.Spherical(CONFIG.CAMERA.INITIAL_DISTANCE, Math.PI / 2, 0);
    this.targetSpherical = this.spherical.clone();

    // Zoom state
    this.isZoomingOut = false;
    this.isZoomingIn = false;
    this.zoomOutVelocity = 0; // 用于"先慢后快"
    this.zoomInStartDistance = 0; // 记录开始缩放时的距离
    this.zoomInProgress = 0; // 缩放进度 0-1

    this.updateCamera();
  }

  update() {
    // 1. Zoom Out: 先慢后快 (加速度递增)
    if (this.isZoomingOut) {
      this.zoomOutVelocity += CONFIG.CAMERA.ZOOM_OUT_ACCELERATION;
      this.targetSpherical.radius += this.zoomOutVelocity;
    }
    // 2. Zoom In: 先快后慢 (使用easeOut曲线)
    else if (this.isZoomingIn) {
      // 使用easeOutQuad曲线: 先快后慢
      this.zoomInProgress += CONFIG.CAMERA.ZOOM_IN_DECELERATION;
      this.zoomInProgress = Math.min(this.zoomInProgress, 1);

      // easeOutQuad: t * (2 - t)
      const eased = this.zoomInProgress * (2 - this.zoomInProgress);
      const targetDistance = CONFIG.CAMERA.MIN_DISTANCE;
      this.targetSpherical.radius = this.zoomInStartDistance +
        (targetDistance - this.zoomInStartDistance) * eased;
    }

    // Constraints
    this.targetSpherical.radius = THREE.MathUtils.clamp(
      this.targetSpherical.radius,
      CONFIG.CAMERA.MIN_DISTANCE,
      CONFIG.CAMERA.MAX_DISTANCE
    );

    // Apply Smoothing
    this.spherical.theta += (this.targetSpherical.theta - this.spherical.theta) * CONFIG.CAMERA.DAMPING;
    this.spherical.radius += (this.targetSpherical.radius - this.spherical.radius) * CONFIG.CAMERA.DAMPING;

    this.updateCamera();

    // 更新UI显示
    if (this.uiManager) {
      this.uiManager.updateCameraStats(this.spherical.radius, this.spherical.theta);
    }
  }

  updateCamera() {
    this.spherical.makeSafe();
    const position = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(position);
    this.camera.lookAt(0, 0, 0);
  }

  rotate(deltaTheta) {
    // deltaTheta: 手旋转的角度变化
    this.targetSpherical.theta += deltaTheta * CONFIG.GESTURES.ROTATION_SENSITIVITY;
  }

  startZoomOut() {
    if (!this.isZoomingOut) {
      this.isZoomingOut = true;
      this.isZoomingIn = false;
      this.zoomOutVelocity = 0.5; // 初始速度较小
    }
  }

  startZoomIn() {
    if (!this.isZoomingIn) {
      this.isZoomingIn = true;
      this.isZoomingOut = false;
      this.zoomInStartDistance = this.spherical.radius;
      this.zoomInProgress = 0;
    }
  }

  stopZoom() {
    this.isZoomingOut = false;
    this.isZoomingIn = false;
    this.zoomOutVelocity = 0;
    this.zoomInProgress = 0;
    this.targetSpherical.radius = this.spherical.radius;
  }
}
