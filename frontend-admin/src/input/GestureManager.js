import { CONFIG } from '../config.js';

export class GestureManager {
  constructor(cameraController, uiManager) {
    this.cameraController = cameraController;
    this.uiManager = uiManager;

    this.hands = null;
    this.camera = null;

    // 手势历史记录
    this.lastHandSize = 0;
    this.rotationHistory = []; // 存储手的旋转角度历史
    this.lastHandAngle = null; // 上一帧手的角度

    this.state = 'IDLE';
    this.noHandFrames = 0; // 连续无手帧数

    this.init();
  }

  async init() {
    this.uiManager.setStatus('loading', '正在初始化视觉系统...');

    if (!window.Hands) {
      console.error('MediaPipe Hands not loaded');
      this.uiManager.showToast('MediaPipe 加载失败', 'error');
      return;
    }

    this.hands = new window.Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });

    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6
    });

    this.hands.onResults(this.onResults.bind(this));

    const videoElement = document.getElementById('input-video');
    this.camera = new window.Camera(videoElement, {
      onFrame: async () => {
        await this.hands.send({image: videoElement});
      },
      width: 640,
      height: 480
    });

    try {
      await this.camera.start();
      this.uiManager.setStatus('active', '系统就绪');
    } catch (e) {
      console.error(e);
      this.uiManager.setStatus('inactive', '摄像头错误');
      this.uiManager.showToast('摄像头访问被拒绝', 'error');
    }
  }

  onResults(results) {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      this.noHandFrames++;
      // 连续多帧无手才停止，避免抖动
      if (this.noHandFrames > 5) {
        this.cameraController.stopZoom();
        this.state = 'IDLE';
        this.lastHandAngle = null;
        this.uiManager.highlightCard(-1);
        this.uiManager.updateConfidence(0);
        this.uiManager.updateIntensity(0);
      }
      return;
    }

    this.noHandFrames = 0;
    const landmarks = results.multiHandLandmarks[0];

    // 更新置信度显示
    this.uiManager.updateConfidence(0.85);

    // 1. 旋转检测 - 基于手的旋转角度变化
    const handAngle = this.calculateHandRotation(landmarks);

    if (this.lastHandAngle !== null) {
      let deltaAngle = handAngle - this.lastHandAngle;

      // 处理角度跨越 -PI 到 PI 的情况
      if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
      if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;

      // 平滑处理
      this.rotationHistory.push(deltaAngle);
      if (this.rotationHistory.length > CONFIG.GESTURES.ROTATION_HISTORY_SIZE) {
        this.rotationHistory.shift();
      }

      // 计算平均旋转
      const avgRotation = this.rotationHistory.reduce((a, b) => a + b, 0) / this.rotationHistory.length;

      // 应用旋转（阈值过滤微小抖动）
      if (Math.abs(avgRotation) > 0.01) {
        this.cameraController.rotate(avgRotation);
        this.uiManager.highlightCard(0);
        this.uiManager.updateIntensity(Math.min(1, Math.abs(avgRotation) * 10));
      }
    }
    this.lastHandAngle = handAngle;

    // 2. 缩放检测
    const wrist = landmarks[0];
    const middleMCP = landmarks[9];
    const handSize = Math.sqrt(
      Math.pow(wrist.x - middleMCP.x, 2) +
      Math.pow(wrist.y - middleMCP.y, 2)
    );

    const isFist = this.detectFist(landmarks);
    const isOpen = this.detectOpenHand(landmarks);
    const deltaSize = handSize - this.lastHandSize;
    const moveThreshold = CONFIG.GESTURES.ZOOM_MOVE_THRESHOLD;

    if (isFist && deltaSize < -moveThreshold) {
      // 握拳 + 拉远 -> Zoom Out (先慢后快)
      this.cameraController.startZoomOut();
      this.uiManager.highlightCard(1);
      this.uiManager.updateIntensity(Math.min(1, Math.abs(deltaSize) * 20));
      this.state = 'ZOOM_OUT';
    } else if (isOpen && deltaSize > moveThreshold) {
      // 张开 + 靠近 -> Zoom In (先快后慢)
      this.cameraController.startZoomIn();
      this.uiManager.highlightCard(2);
      this.uiManager.updateIntensity(Math.min(1, Math.abs(deltaSize) * 20));
      this.state = 'ZOOM_IN';
    } else if (!isFist && !isOpen) {
      // 非握拳非张开状态，停止缩放
      if (this.state === 'ZOOM_OUT' || this.state === 'ZOOM_IN') {
        this.cameraController.stopZoom();
        this.state = 'IDLE';
      }
    } else if (isFist && deltaSize >= -moveThreshold) {
      // 握拳但没有拉远动作，保持当前缩放状态或停止
      if (this.state !== 'ZOOM_OUT') {
        // 不是正在zoom out，不做任何事
      }
    } else if (isOpen && deltaSize <= moveThreshold) {
      // 张开但没有靠近动作
      if (this.state !== 'ZOOM_IN') {
        // 不是正在zoom in，不做任何事
      }
    }

    this.lastHandSize = handSize;
  }

  // 计算手的旋转角度（基于手腕到中指MCP的向量）
  calculateHandRotation(landmarks) {
    const wrist = landmarks[0];
    const middleMCP = landmarks[9];

    // 计算从手腕到中指根部的向量角度
    const dx = middleMCP.x - wrist.x;
    const dy = middleMCP.y - wrist.y;

    return Math.atan2(dy, dx);
  }

  detectFist(landmarks) {
    const fingerTips = [8, 12, 16, 20];
    const fingerPIPs = [6, 10, 14, 18];

    let foldedCount = 0;
    for (let i = 0; i < 4; i++) {
      const tip = landmarks[fingerTips[i]];
      const pip = landmarks[fingerPIPs[i]];
      const wrist = landmarks[0];

      const distTip = this.dist(tip, wrist);
      const distPip = this.dist(pip, wrist);

      if (distTip < distPip) foldedCount++;
    }

    return foldedCount >= 3;
  }

  detectOpenHand(landmarks) {
    const fingerTips = [8, 12, 16, 20];
    const fingerPIPs = [6, 10, 14, 18];

    let openCount = 0;
    for (let i = 0; i < 4; i++) {
      const tip = landmarks[fingerTips[i]];
      const pip = landmarks[fingerPIPs[i]];
      const wrist = landmarks[0];

      const distTip = this.dist(tip, wrist);
      const distPip = this.dist(pip, wrist);

      if (distTip > distPip) openCount++;
    }

    return openCount >= 4;
  }

  dist(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  }
}
