export class UIManager {
  constructor() {
    this.statusDot = document.getElementById('status-dot');
    this.statusText = document.getElementById('status-text');
    this.toastContainer = document.getElementById('toast-container');
    this.cards = document.querySelectorAll('.card');

    // 新增UI元素
    this.distanceValue = document.getElementById('distance-value');
    this.angleValue = document.getElementById('angle-value');
    this.gestureIcon = document.getElementById('gesture-icon');
    this.gestureName = document.getElementById('gesture-name');
    this.confidenceBar = document.getElementById('confidence-bar');
    this.intensityBar = document.getElementById('intensity-bar');

    // 手势名称映射
    this.gestureNames = {
      'idle': { icon: '👋', name: '等待检测' },
      'rotate': { icon: '✋', name: '旋转中' },
      'zoom-out': { icon: '✊', name: '拉远中' },
      'zoom-in': { icon: '🖐️', name: '靠近中' }
    };
  }

  setStatus(status, message) {
    this.statusText.textContent = message;
    this.statusDot.className = 'dot';

    if (status === 'loading') {
      this.statusDot.classList.add('loading');
    } else if (status === 'active') {
      this.statusDot.classList.add('active');
    }
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  highlightCard(index) {
    this.cards.forEach((card, i) => {
      if (i === index) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });

    // 更新手势状态面板
    const gestureTypes = ['rotate', 'zoom-out', 'zoom-in'];
    if (index >= 0 && index < gestureTypes.length) {
      this.setGestureState(gestureTypes[index]);
    } else {
      this.setGestureState('idle');
    }
  }

  // 更新相机数据显示
  updateCameraStats(distance, angle) {
    if (this.distanceValue) {
      this.distanceValue.textContent = distance.toFixed(1);
    }
    if (this.angleValue) {
      this.angleValue.textContent = `${(angle * 180 / Math.PI).toFixed(0)}°`;
    }
  }

  // 设置手势状态
  setGestureState(gestureType) {
    const gesture = this.gestureNames[gestureType] || this.gestureNames['idle'];

    if (this.gestureIcon) {
      this.gestureIcon.textContent = gesture.icon;
      if (gestureType !== 'idle') {
        this.gestureIcon.classList.add('active');
      } else {
        this.gestureIcon.classList.remove('active');
      }
    }

    if (this.gestureName) {
      this.gestureName.textContent = gesture.name;
    }
  }

  // 更新检测置信度
  updateConfidence(value) {
    if (this.confidenceBar) {
      this.confidenceBar.style.width = `${Math.min(100, value * 100)}%`;
    }
  }

  // 更新手势强度
  updateIntensity(value) {
    if (this.intensityBar) {
      this.intensityBar.style.width = `${Math.min(100, value * 100)}%`;
    }
  }
}
