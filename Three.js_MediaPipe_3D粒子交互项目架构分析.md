# Three.js + MediaPipe 3D粒子交互项目架构分析

## 一、渲染管线组织与调用链分析

### 1.1 初始化流程

**入口文件**: `main.js:5-8`
- 监听 `DOMContentLoaded` 事件
- 创建 `App` 实例
- 调用 `app.start()` 启动应用

**App 初始化**: `App.js:10-30`
```
App.constructor()
├── Renderer()          # 渲染器初始化
├── UIManager()         # UI管理器
├── CameraController()  # 相机控制器
├── Planet()            # 行星粒子系统
├── Rings()             # 环带粒子系统
├── GestureManager()    # 手势管理器
├── AmbientLight        # 环境光
└── THREE.Clock()       # 动画时钟
```

**Renderer 初始化**: `Renderer.js:5-26`
- 创建 `THREE.Scene`，设置背景色和雾效
- 创建 `THREE.PerspectiveCamera`
- 创建 `THREE.WebGLRenderer`，设置抗锯齿和像素比
- 监听窗口 `resize` 事件

### 1.2 每帧更新调用链

**主循环**: `App.js:36-48`
```
animate() [requestAnimationFrame]
├── clock.getElapsedTime()          # 获取时间
├── CameraController.update()       # 更新相机状态
│   ├── 处理缩放逻辑 (Zoom In/Out)
│   ├── 应用约束 (Min/Max Distance)
│   ├── 平滑插值 (Damping)
│   ├── updateCamera()              # 更新相机位置
│   └── UIManager.updateCameraStats()
├── Planet.update(time)             # 更新行星旋转
│   └── mesh.rotation.y = time * 0.05
├── Rings.update(time)              # 更新环带旋转
│   └── mesh.rotation.y = -time * 0.02
└── Renderer.render()               # 渲染场景
    └── renderer.render(scene, camera)
```

**关键特点**:
- 使用 `requestAnimationFrame` 实现 60fps 渲染循环
- 时间驱动动画，基于 `THREE.Clock` 的 elapsedTime
- 分层更新：相机 → 场景对象 → 渲染

---

## 二、GestureManager 与 Three.js 场景交互分析

### 2.1 架构设计

**依赖注入**: `GestureManager.js:4-6`
```javascript
constructor(cameraController, uiManager) {
  this.cameraController = cameraController;  // 直接引用
  this.uiManager = uiManager;                // 直接引用
}
```

### 2.2 手势数据流向

**MediaPipe 数据获取**: `GestureManager.js:22-63`
1. 初始化 MediaPipe Hands 模型
2. 启动摄像头捕获
3. `onResults` 回调接收手部关键点数据

**手势识别与数据处理**: `GestureManager.js:65-158`
```
onResults(results)
├── 检测手部关键点
│   ├── 计算手的旋转角度 (calculateHandRotation)
│   ├── 检测握拳手势 (detectFist)
│   ├── 检测张手手势 (detectOpenHand)
│   └── 计算手掌大小变化
├── 旋转手势处理
│   ├── 历史记录平滑 (ROTATION_HISTORY_SIZE = 3)
│   ├── 阈值过滤 ( > 0.01)
│   └── cameraController.rotate(deltaAngle)
├── 缩放手势处理
│   ├── 握拳 + 拉远 → startZoomOut()
│   ├── 张手 + 靠近 → startZoomIn()
│   └── 非握拳非张手 → stopZoom()
└── UI 反馈
    ├── highlightCard(gestureType)
    ├── updateConfidence()
    └── updateIntensity()
```

### 2.3 与 Three.js 场景的交互方式

**间接交互模式**:
- **GestureManager** 不直接操作 Three.js 场景或对象
- 通过 **CameraController** 作为中间层
- 手势数据 → 相机控制参数 → 相机位置变化 → 影响渲染视角

**调用路径示例**:
```
手势旋转检测
    ↓
GestureManager.onResults() [line 107]
    ↓
cameraController.rotate(avgRotation) [CameraController.js:69-72]
    ↓
targetSpherical.theta += deltaTheta * sensitivity
    ↓
下一帧 animate() 循环
    ↓
CameraController.update() [line 51-52]
    ↓
spherical.theta 平滑插值
    ↓
updateCamera() [line 62-67]
    ↓
camera.position.setFromSpherical(spherical)
    ↓
Renderer.render() 使用更新后的相机
```

**数据传递关键点**:
- 手势数据在 `onResults` 回调中处理（MediaPipe 线程）
- 相机状态在 `update()` 中应用（requestAnimationFrame 主线程）
- 通过共享对象 `targetSpherical` 实现线程间数据传递

---

## 三、Planet.js 与 Rings.js 职责划分与耦合分析

### 3.1 职责划分

| 模块 | 职责 | 核心功能 | 配置项 |
|------|------|----------|--------|
| **Planet.js** | 中心行星粒子系统 | 70%表面粒子 + 30%内部粒子<br>橙色金色渐变<br>绕Y轴正方向旋转 | `PARTICLE_COUNT: 20000`<br>`RADIUS: 150`<br>`COLOR: 0xff8c00` |
| **Rings.js** | 外围环带粒子系统 | 内环+外环双层结构<br>白色蓝色发光<br>绕Y轴反方向旋转 | `PARTICLE_COUNT: 8000`<br>`INNER_RADIUS: 220`<br>`OUTER_RADIUS: 400` |

### 3.2 实现对比

**相同点**:
1. **架构模式** 相同：
   - 构造函数接收 `scene` 参数
   - `init()` 方法创建几何体和材质
   - `update(time)` 方法处理动画
   - 使用 `THREE.Points` 作为渲染对象

2. **粒子纹理** 模式相同：
   - Canvas 动态创建径向渐变纹理
   - 使用 `AdditiveBlending` 实现发光效果
   - `depthWrite: false` 避免深度冲突

3. **材质配置** 相似：
   - `transparent: true`
   - `sizeAttenuation: true`
   - 自定义 `size` 属性

**不同点**:

| 特性 | Planet.js | Rings.js |
|------|-----------|----------|
| 粒子分布 | 球面分布（球坐标系） | 平面环分布（极坐标系） |
| 颜色 | `vertexColors: true` 逐粒子变色 | 统一白色 `COLOR: 0xffffff` |
| 旋转方向 | `+time * 0.05`（正向） | `-time * 0.02`（反向） |
| 初始旋转 | 无 | `rotation.x = 0.12π`, `rotation.z = 0.05π` |
| 透明度 | `opacity: 1.0` | `opacity: 0.9` |

### 3.3 耦合性分析

**耦合度: 极低 (松散耦合)**

1. **无直接依赖**:
   - Planet.js 和 Rings.js 之间没有互相 import
   - 没有直接的方法调用
   - 没有共享的状态变量

2. **唯一连接点**: `App.js:18-19`
   ```javascript
   this.planet = new Planet(this.scene);  // 共享同一场景
   this.rings = new Rings(this.scene);    // 共享同一场景
   ```

3. **间接交互**:
   - 通过共享的 `THREE.Scene` 进行渲染层级的组合
   - 通过 `App.animate()` 中的 `update()` 调用同步动画
   - 都响应相机位置变化（通过渲染系统）

**耦合类型**:
- ✅ **数据耦合**: 通过 scene 共享渲染上下文
- ❌ **控制耦合**: 没有直接控制流
- ❌ **公共耦合**: 没有全局变量共享
- ❌ **内容耦合**: 没有直接访问内部状态

### 3.4 设计评价

**优点**:
1. **单一职责**: 每个模块只负责一种视觉元素
2. **可替换性**: 可以独立替换 Planet 或 Rings 而不影响对方
3. **可测试性**: 可以单独实例化和测试
4. **并行开发**: 两个模块可以由不同开发者并行开发

**潜在改进点**:
1. **代码重复**: 纹理创建函数 `createParticleTexture()` 在两个文件中重复实现
   - 建议提取到 `utils/ParticleUtils.js`
   
2. **配置分散**: 粒子系统配置分散在各自文件中
   - 建议统一配置结构或创建基类

3. **缺少抽象**: 没有共同的基类或接口定义
   - 建议创建 `ParticleSystem` 基类，Planet 和 Rings 继承

---

## 四、整体架构总结

### 4.1 架构图

```
┌─────────────────────────────────────────────────────────┐
│                     主线程 (Main)                        │
│  ┌──────────┐     ┌─────────────┐     ┌──────────────┐  │
│  │   App    │────▶│  Renderer   │────▶│  Three.js    │  │
│  └──────────┘     └─────────────┘     │   Scene      │  │
│       │                               └──────────────┘  │
│       ▼                                                   │
│  ┌──────────────┐     ┌────────────┐     ┌──────────┐   │
│  │ CameraContr. │────▶│   Planet   │     │  Rings   │   │
│  └──────────────┘     └────────────┘     └──────────┘   │
│         ▲                                               │
└─────────┼───────────────────────────────────────────────┘
          │
┌─────────┼───────────────────────────────────────────────┐
│         ▼                    MediaPipe 线程              │
│  ┌─────────────────┐                                     │
│  │ GestureManager  │                                     │
│  └─────────────────┘                                     │
│         │                                               │
│  ┌─────────────────┐                                     │
│  │   MediaPipe     │                                     │
│  │     Hands       │                                     │
│  └─────────────────┘                                     │
└─────────────────────────────────────────────────────────┘
```

### 4.2 核心设计模式

1. **模块化设计**: 功能分离到独立类（SRP 原则）
2. **依赖注入**: GestureManager 接收 CameraController 和 UIManager
3. **观察者模式**: MediaPipe 通过 `onResults` 回调推送数据
4. **动画循环**: 经典的 update-render 分离模式
5. **配置驱动**: 所有参数集中在 CONFIG 对象中

### 4.3 数据流总结

```
摄像头输入
    ↓
MediaPipe Hands 模型
    ↓
手部关键点 landmarks
    ↓
GestureManager.onResults()
    ├─→ 旋转角度计算
    ├─→ 握拳/张手检测
    └─→ CameraController 方法调用
    ↓
targetSpherical 状态更新
    ↓
App.animate() 主循环
    ├─→ CameraController.update()
    │   └─→ 相机位置平滑插值
    ├─→ Planet.update()
    ├─→ Rings.update()
    └─→ Renderer.render()
    ↓
屏幕渲染输出
```

---

*分析日期: 2026-04-16*
*基于代码版本: label-00858-GSB-0415*
