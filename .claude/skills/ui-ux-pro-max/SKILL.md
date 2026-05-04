---
name: ui-ux-pro-max
描述：“UI/UX设计智能。67种风格、96种调色板、57种字体搭配、25种图表、13种技术栈（React、Next.js、Vue、Svelte、SwiftUI、React Native、Flutter、Tailwind、shadcn/ui）。可执行操作：规划、构建、创建、设计、实施、审查、修复、改进、优化、增强、重构、检查UI/UX代码。项目类型：网站、着陆页、仪表盘、管理面板、电子商务、SaaS、作品集、博客、移动应用、.html、.tsx、.vue、.svelte。元素：按钮、模态框、导航栏、侧边栏、卡片、表格、表单、图表。风格：玻璃态、黏土态、极简主义、粗野主义、新拟态、便当网格、暗黑模式、响应式、拟物化、扁平化设计。主题：调色板、无障碍性、动画、布局、排版、字体搭配、间距、悬停效果、阴影、渐变。集成：用于组件搜索和示例的shadcn/ui MCP。”
---
# UI/UX专业增强版 - 设计智能

适用于网页和移动应用的综合设计指南。包含13个技术栈中的67种样式、96个调色板、57种字体搭配、99条用户体验指南和25种图表类型。具有基于优先级推荐的可搜索数据库。

## 何时申请

参考这些指导方针时:
- 设计新的用户界面组件或页面
- 选择调色板和排版
- 审查代码以发现用户体验问题
- 构建登录页或仪表板
- 实施无障碍要求

## 按优先级划分的规则类别

| 优先级 | 类别 | 影响程度 | 领域 |
|----------|----------|----------|--------|
| 1 | 可访问性 | 严重 | `ux` |
| 2 | 触摸与交互 | 严重 | `ux` |
| 3 | 性能 | 高 | `ux` |
| 4 | 布局与响应式 | 高 | `ux` |
| 5 | 排版与颜色 | 中 | `typography`, `color` |
| 6 | 动画 | 中 | `ux` |
| 7 | 样式选择 | 中 | `style`, `product` |
| 8 | 图表与数据 | 低 | `chart` |

## 快速参考

### 1. 可访问性（至关重要）

- `color-contrast` - 正常文本的最小比例为4.5:1
- `focus-states` - 交互元素上可见的焦点环
- `alt-text` - 有意义图片的描述性替代文本
- `aria-labels` - 仅含图标的按钮的aria-label
- `keyboard-nav` - 制表符顺序与视觉顺序匹配
- `form-labels` - 使用带有for属性的标签

### 2. 触摸与交互 (CRITICAL)

- `touch-target-size` - 最小44x44像素的触摸目标
- `hover-vs-tap` - 主要交互使用点击/轻触
- `loading-buttons` - 异步操作期间禁用按钮
- `error-feedback` - 在问题附近显示清晰的错误消息
- `cursor-pointer` - 为可点击元素添加指针光标

### 3. Performance (HIGH)

- `image-optimization` - 使用WebP、srcset、延迟加载
- `reduced-motion` - 检查prefers-reduced-motion
- `content-jumping` - 为异步内容预留空间

### 4. Layout & Responsive (HIGH)

-`viewport-meta` - width=device-width initial-scale=1
- `readable-font-size` - 移动设备上正文文本最小为16px
- `horizontal-scroll` - 确保内容适配视口宽度
- `z-index-management` - 定义z-index层级（10、20、30、50）

### 5. Typography & Color (MEDIUM)

- `line-height` - 正文文本使用1.5-1.75
- `line-length` - 每行限制在65-75个字符
- `font-pairing` - 使标题/正文字体风格相匹配

### 6. Animation (MEDIUM)

- `duration-timing` - 微交互使用150-300毫秒
- `transform-performance` - 使用transform/opacity，而非width/height
- `loading-states` - 骨架屏或加载 spinner

### 7. Style Selection (MEDIUM)

- `style-match` - 使风格与产品类型相匹配
- `consistency` - 在所有页面中使用相同的风格
- `no-emoji-icons` - 使用SVG图标，而非表情符号

### 8. Charts & Data (LOW)

- `chart-type` - 使图表类型与数据类型相匹配
- `color-guidance` - 使用易于理解的调色板
- `data-table` - 提供表格替代方案以满足无障碍需求

## 使用方法

使用下面的命令行工具搜索特定领域。
---


## 先决条件

检查Python是否已安装：
```bash
python3 --version || python --version
```

如果未安装Python，请根据用户的操作系统进行安装：

**macOS:**
```bash
brew install python3
```

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install python3
```

**Windows系统：**
```powershell
winget install Python.Python.3.12
```
```

---

## 如何使用此技能

当用户要求进行UI/UX相关工作（设计、构建、创建、实施、审查、修复、改进）时，请遵循以下工作流程：

### 步骤1：分析用户需求

从用户请求中提取关键信息：
- **产品类型**：SaaS、电子商务、作品集、仪表盘、落地页等。
- **风格关键词**：极简、活泼、专业、优雅、深色模式等。
- **行业**：医疗健康、金融科技、游戏、教育等。
- **技术栈**：React、Vue、Next.js，或默认使用`html-tailwind`。

###步骤2：生成设计系统（必填）

**始终以`--design-system`开头**，以获取包含推理过程的全面建议：

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<产品类型> <行业> <关键词>" --design-system [-p "项目名称"]
```

此命令：
1. 并行搜索5个领域（产品、风格、颜色、着陆页、排版）
2. 应用`ui-reasoning.csv`中的推理规则来选择最佳匹配
3. 返回完整的设计系统：模式、风格、颜色、排版、效果
4. 包含需要避免的反模式

**Example:**
```bash
python3 skills/ui-ux-pro-max/scripts/search.py "beauty spa wellness service" --design-system -p "Serenity Spa"
```

### Step 2b: 持久化设计系统（主版+覆盖模式）

要跨会话保存设计系统以进行分层检索，请添加 `--persist`：

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<查询内容>" --design-system --persist -p "项目名称"
`
```

这会创建：
- `design-system/MASTER.md` — 包含所有设计规则的全局真实来源
- `design-system/pages/` — 用于页面特定覆盖的文件夹

**带页面特定覆盖：**
```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<查询>" --design-system --persist -p "项目名称" --page "dashboard"
```
```

这还会创建：
- `design-system/pages/dashboard.md` — 与母版的页面特定偏差

**分层检索的工作原理：**
1. 构建特定页面（例如“结账”页面）时，首先检查`design-system/pages/checkout.md`
2. 如果该页面文件存在，其规则**覆盖**主文件
3. 如果不存在，则仅使用`design-system/MASTER.md`

### 步骤3：通过详细搜索进行补充（如需）

获取设计系统后，使用领域搜索获取更多细节：

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<关键词>" --domain <领域> [-n <最大结果数>
```]
```

**何时使用详细搜索：**

| 需求 | 领域 | 示例 |
|------|--------|---------|
| 更多风格选项 | `style` | `--domain style "glassmorphism dark"` |
| 图表推荐 | `chart` | `--domain chart "real-time dashboard"` |
| 用户体验最佳实践 | `ux` | `--domain ux "animation accessibility"` |
| 替代字体 | `typography` | `--domain typography "elegant luxury"` |
| 着陆页结构 | `landing` | `--domain landing "hero social-proof"` |


### S步骤4：技术栈指南（默认：html-tailwind）

获取特定于实现的最佳实践。如果用户未指定技术栈，**默认使用`html-tailwind`**。

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<关键词>" --stack html-tailwind
```

可用技术栈：`html-tailwind`、`react`、`nextjs`、`vue`、`svelte`、`swiftui`、`react-native`、`flutter`、`shadcn`、`jetpack-compose`

---

## 搜索参考

### 可用领域

| 领域 | 用途 | 示例关键词 |
|--------|---------|------------------|
| `product` | 产品类型推荐 | SaaS、电子商务、作品集、医疗健康、美容、服务 |
| `style` | 用户界面风格、颜色、效果 | 玻璃态、极简主义、暗黑模式、粗野主义 |
| `typography` | 字体搭配、谷歌字体 | 优雅的、活泼的、专业的、现代的 |
| `color` | 按产品类型分类的调色板 | 软件即服务、电子商务、医疗健康、美容、金融科技、服务 |
| `landing` | 页面结构、号召性用语策略 | 主视觉、以主视觉为中心、客户评价、定价、社交证明 |
| `chart` | 图表类型、库推荐 | 趋势、对比、时间线、漏斗图、饼图 |
| `ux` | 最佳实践、反模式 | 动画、可访问性、z轴索引、加载 |
| `react` | React/Next.js 性能 | 瀑布流、打包、悬念、记忆、重新渲染、缓存 |
| `web` | 网页界面指南 | 无障碍富互联网应用、焦点、键盘、语义化、虚拟化 |
| `prompt` | 人工智能提示词、层叠样式表关键词 | （风格名称） |

### 可用的技术栈

| 技术栈 | 重点 |
|-------|-------|
| `html-tailwind` | Tailwind 工具类、响应式、无障碍（默认） |
| `react` | 状态、钩子、性能、模式 |
| `nextjs` | 服务端渲染、路由、图像、API 路由 |
| `vue` | 组合式 API、Pinia、Vue 路由 |
| `svelte` | Runes、存储、SvelteKit |
| `swiftui` | 视图、状态、导航、动画 |
| `react-native` | 组件、导航、列表 |
| `flutter` | 组件、状态、布局、主题 |
| `shadcn` | shadcn/ui 组件、主题、表单、模式 |
| `jetpack-compose` | 可组合项、修饰符、状态提升、重组 |

---

## 示例工作流程

**用户请求**：“为专业皮肤护理服务制作着陆页”

### 步骤1：分析需求
- 产品类型：美容/水疗服务
- 风格关键词：优雅、专业、柔和
- 行业：美容/健康
- 技术栈：html-tailwind（默认）

### 步骤2：生成设计系统（必填）

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "美容水疗健康服务优雅" --design-system -p "宁静水疗中心"
```

**输出：** 包含模式、风格、颜色、排版、效果和反模式的完整设计系统。

### 步骤3：通过详细搜索进行补充（必要时）

```bash
# 获取有关动画和无障碍性的用户体验指南
python3 skills/ui-ux-pro-max/scripts/search.py "animation accessibility" --domain ux

# 如有需要，获取替代的排版选项
python3 skills/ui-ux-pro-max/scripts/search.py "elegant luxury serif" --domain typography
```

### 步骤4：技术栈指南

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "layout responsive form" --stack html-tailwind
```

**然后：** 综合设计系统 + 详细搜索结果并实施设计。
---

## 输出格式

`--design-system` 标志支持两种输出格式：

```bash
# ASCII 方框（默认）—— 最适合终端显示
python3 skills/ui-ux-pro-max/scripts/search.py "fintech crypto" --design-system

# Markdown —— 最适合文档
python3 skills/ui-ux-pro-max/scripts/search.py "fintech crypto" --design-system -f markdown

```
```

---

## 获得更佳结果的技巧

1. **明确关键词**——“医疗保健SaaS仪表盘”比“应用程序”更好
2. **多次搜索**——不同的关键词会带来不同的见解
3. **结合多个领域**——风格+排版+色彩=完整的设计系统
4. **始终检查用户体验**——搜索“动画”“z轴索引”“可访问性”以解决常见问题
5. **使用堆栈标记**——获取特定于实施的最佳实践
6. **反复尝试**——如果第一次搜索不匹配，尝试不同的关键词

---

## 专业用户界面的通用规则

以下是一些常被忽视却会让用户界面显得不够专业的问题：

### 图标与视觉元素

| 规则 | 应该做 | 不应该做 |
|------|----|----- |
| **禁止使用表情图标** | 使用SVG图标（Heroicons、Lucide、Simple Icons） | 使用像🎨、🚀、⚙️这样的表情符号作为用户界面图标 |
| **稳定的悬停状态** | 在悬停时使用颜色/透明度过渡效果 | 使用会改变布局的缩放变换效果 |
| **正确的品牌标识** | 从Simple Icons查找官方SVG图标 | 凭猜测使用或采用不正确的标识路径 |
| **统一的图标尺寸** | 使用固定的视口（24x24）并配合w-6 h-6 | 随意混合使用不同尺寸的图标 |


###交互与光标

| 规则 | 要做 | 不要做 |
|------|------|--------|
| **光标指针** | 为所有可点击/可悬停卡片添加 `cursor-pointer` | 在交互元素上保留默认光标 |
| **悬停反馈** | 提供视觉反馈（颜色、阴影、边框） | 不显示元素可交互的迹象 |
| **平滑过渡** | 使用 `transition-colors duration-200` | 瞬间状态变化或过渡过慢（>500毫秒） |

### 明暗模式对比度

| 规则 | 应该做 | 不应该做 |
|------|----|----- |
| **玻璃卡片亮色模式** | 使用`bg-white/80`或更高不透明度 | 使用`bg-white/10`（透明度太高） |
| **亮色模式下的文本对比度** | 使用`#0F172A`（石板灰900）作为文本颜色 | 使用`#94A3B8`（石板灰400）作为正文文本颜色 |
| **亮色模式下的柔和文本** | 至少使用`#475569`（石板灰600） | 使用灰色400或更浅的颜色 |
| **边框可见性** | 在亮色模式下使用`border-gray-200` | 使用`border-white/10`（不可见） |

###布局与间距

| 规则 | 应该做 | 不应该做 |
|------|--------|----------|
| **悬浮导航栏** | 添加 `top-4 left-4 right-4` 间距 | 将导航栏固定在 `top-0 left-0 right-0` |
| **内容内边距** | 考虑固定导航栏的高度 | 让内容隐藏在固定元素后方 |
| **一致的最大宽度** | 使用相同的 `max-w-6xl` 或 `max-w-7xl` | 混合使用不同的容器宽度 |

---

## 交付前检查清单

交付用户界面代码前，请验证以下项目：

### 视觉质量
- [ ] 未使用表情符号作为图标（请改用SVG格式）
- [ ] 所有图标来自统一的图标集（Heroicons/Lucide）
- [ ] 品牌标志正确无误（已通过Simple Icons验证）
- [ ] 悬停状态不会导致布局偏移
- [ ] 直接使用主题颜色（如bg-primary），而非var()包装器

###交互
- [ ] 所有可点击元素都有`cursor-pointer`
- [ ] 悬停状态提供清晰的视觉反馈
- [ ] 过渡平滑（150-300毫秒）
- [ ] 键盘导航的焦点状态可见

### 明亮/暗黑模式
- [ ] 明亮模式下的文本有足够的对比度（最低4.5:1）
- [ ] 明亮模式下玻璃态/透明元素可见
- [ ] 两种模式下边框都可见
- [ ] 交付前测试两种模式

### 布局
- [ ] 浮动元素与边缘有适当间距
- [ ] 没有内容被固定导航栏遮挡
- [ ] 在375px、768px、1024px、1440px尺寸下响应式适配
- [ ] 移动设备上无水平滚动

### 可访问性
- [ ] 所有图片都有替代文本（alt text）
- [ ] 表单输入项有标签
- [ ] 颜色不是唯一的指示方式
- [ ] 遵循`prefers-reduced-motion`（减少动画偏好）设置
