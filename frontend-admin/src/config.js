export const CONFIG = {
  SCENE: {
    BG_COLOR: 0x050510,
    FOV: 45,
    NEAR: 0.1,
    FAR: 2000,
  },
  PLANET: {
    RADIUS: 150,
    PARTICLE_COUNT: 20000,
    COLOR: 0xff8c00, // Orange
    PARTICLE_SIZE: 4.0, // 更大的粒子
  },
  RINGS: {
    INNER_RADIUS: 220,
    OUTER_RADIUS: 400,
    PARTICLE_COUNT: 8000,
    COLOR: 0xffffff,
    PARTICLE_SIZE: 3.5, // 更大的粒子
  },
  CAMERA: {
    MIN_DISTANCE: 300,
    MAX_DISTANCE: 1500,
    INITIAL_DISTANCE: 800,
    DAMPING: 0.15, // 提高响应速度
    ZOOM_OUT_ACCELERATION: 0.2, // 加快缩放
    ZOOM_IN_DECELERATION: 0.15, // 加快缩放
  },
  GESTURES: {
    ROTATION_SENSITIVITY: 4.0, // 提高旋转灵敏度
    ZOOM_MOVE_THRESHOLD: 0.002, // 降低阈值，更容易触发
    ROTATION_HISTORY_SIZE: 3, // 减少历史记录，更快响应
  }
};
