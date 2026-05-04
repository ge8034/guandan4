# Impeccable Frontend Design

专为 Claude Code 优化的前端设计技能，基于 [pbakaus/impeccable](https://github.com/pbakaus/impeccable)。

## 适用场景

当以下任务时，参考此技能：
- 设计或审查 UI 组件
- 优化页面布局和视觉层次
- 实现动画和过渡效果
- 选择字体、颜色和间距
- 改进可访问性

## 设计原则速查

### 排版
- **垂直节奏**: 行高作为所有垂直间距的基础单位
- **模块化比例**: 使用 5 级字体系统 (xs/sm/base/lg/xl+)，1.25-1.5 比例
- **行长限制**: 使用 `max-width: 65ch` 限制正文宽度
- **避免默认字体**: 避免使用 Inter、Roboto、Open Sans

### 空间设计
- **4pt 基数系统**: 4, 8, 12, 16, 24, 32, 48, 64, 96px
- **语义化命名**: 使用 `--space-sm` 而非 `--spacing-8`
- **gap 优于 margin**: 使用 `gap` 处理同级间距
- **多维度层次**: 结合大小、权重、颜色、位置、空间

### 动效设计
- **100/300/500 规则**: 微交互(100-150ms)、状态变化(200-300ms)、布局变化(300-500ms)
- **ease-out 优先**: 使用 `cubic-bezier(0.16, 1, 0.3, 1)`
- **仅动画 transform/opacity**: 避免动画其他属性
- **reduced-motion 支持**: 响应 `prefers-reduced-motion`

### 交互设计
- **8 种状态**: Default, Hover, Focus, Active, Disabled, Loading, Error, Success
- **焦点环**: 使用 `:focus-visible`，2-3px 厚度，高对比度
- **触摸目标**: 最小 44×44px
- **骨架屏 > spinner**: 优先使用骨架屏

### 颜色与对比
- **使用 OKLCH**: 替代 HSL，感知均匀
- **染色中性色**: 添加品牌色微量到中性色
- **60-30-10 规则**: 60% 中性背景，30% 次要色，10% 强调色

## 反模式 (Avoid)

### 字体
- ❌ 使用 Inter、Roboto、Open Sans 作为主要字体
- ❌ 使用太多接近的字体大小
- ❌ 使用深色背景上的浅色文本时不增加行高

### 空间
- ❌ 使用 8pt 间距系统（太粗糙）
- ❌ 使用任意间距值（如 20px, 28px）
- ❌ 卡片嵌套卡片
- ❌ 仅用大小创建层次

### 动效
- ❌ 使用 `ease` 缓动函数
- ❌ 使用 bounce/elastic 曲线（显得业余）
- ❌ 动画除 transform/opacity 之外的属性
- ❌ 忽略 `prefers-reduced-motion`
- ❌ 动画时长 >500ms 用于 UI 反馈

### 颜色
- ❌ 使用纯灰色 (`oklch(... 0 0)`)
- ❌ 过度使用强调色
- ❌ 在极端亮度使用高饱和度

## 参考文档

详细设计指南见 `/reference/` 目录:
- `typography.md` - 字体系统与排版
- `color-and-contrast.md` - 颜色空间与对比度
- `spatial-design.md` - 间距系统与布局
- `motion-design.md` - 动画与过渡
- `interaction-design.md` - 交互状态与表单
- `responsive-design.md` - 响应式设计
- `ux-writing.md` - UX 文案写作
