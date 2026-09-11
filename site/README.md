# 静态风格画廊

白墙画廊，用来浏览 `styles.json` 里的每一条风格和对应示意图。

- 悬停图片：显示编号、风格名、参考作者、分组（不含提示词）
- 点击图片：复制该风格提示词（风格名称、参考作者，有「核心视觉特征」才附加），并给出提示；剪贴板不可用时会弹出可全选文本
- 顶部 pill：按 group 筛选（全部 / A–G）
- Explore：按编号、风格名、参考作者搜索
- Index：打开 001–261 编号目录

## 两个目录分别干什么

| 目录 | 角色 | 要不要手改 |
|------|------|------------|
| `site/` | 页面源码：HTML / CSS / JS / favicon | 要。改界面和交互只动这里 |
| `dist/` | 构建产物，也是**唯一部署目录** | 不要。每次构建都会整目录清空重写 |

`site/` 里没有 261 张风格图，也没有 `styles.json`。这些资源在构建时从仓库现有位置拷进 `dist/`，避免和 `images/`、`handdraw-style-prompter/references/` 再存一份。

## 数据从哪来

画廊不自己维护一份风格表，只消费仓库里已经生成好的索引和单图。

| 用途 | 源位置 |
|------|--------|
| 风格条目（编号、group、参考名、风格名、提示词） | `handdraw-style-prompter/references/styles.json` |
| 风格示意图 | `images/individual/001-200/{编号}.png`、`images/individual/201-400/{编号}.png` |
| 权威风格表（改内容从这里改） | 仓库根目录 `styles_200_reorganized.md` |
| 拼图原图（切单图用） | `images/A_001-016.png` 这类接触表 |

`styles.json` 是由 Markdown 生成的，不要当主数据源手改。

## 本地预览

构建完成后，在 `dist/` 里起一个静态服务（不要用 `file://` 直接打开，部分浏览器会拦本地脚本）：

```bash
python3 scripts/build_dist.py
python3 -m http.server 8765 --directory dist
```

浏览器打开 <http://127.0.0.1:8765/>。

部署时只上传 `dist/` 的全部内容。

## 数据更新后怎么重新生成

按你改了什么，从对应步骤开始往下跑。**改完源数据后，一定要再跑一次 `build_dist.py`**，否则线上画廊还是旧的。

### 1. 只改了风格文案（名称、参考、分组、提示词）

1. 编辑 `styles_200_reorganized.md`
2. 重新生成 Skill 索引（同时会更新旧的拼图画廊）：

```bash
python3 handdraw-style-prompter/scripts/build_library.py
```

3. 重新打包部署目录：

```bash
python3 scripts/build_dist.py
```

### 2. 新增或替换了某张风格示意图

画廊**只读现成单图**，不要对已有单图再跑切图。把 PNG 放到对应编号段目录即可：

- `001–200` → `images/individual/001-200/041.png`
- `201–400` → `images/individual/201-400/217.png`

`split_contact_sheets.py` 只在「只有拼图、还没有单图」时用；它会覆盖 `images/individual/`，有单图时不要跑。部分拼图不是标准 4×4（标题栏、一行五格、末行不满），均分会切错。已经修过的编号段、错因和还没重切的尾巴，见仓库根目录 [README.md](../README.md) 里的「单图错位：已经修过的几波」。

然后打包：

```bash
python3 scripts/build_dist.py
```

构建脚本会按 `styles.json` 的每一条去找同编号 PNG。缺图会直接失败并列出编号，不会默默跳过。

### 3. 只改了画廊页面（布局、文案、交互）

只动 `site/`，然后打包：

```bash
python3 scripts/build_dist.py
```

不要改 `dist/index.html` 或 `dist/css/`、`dist/js/`。下次构建会被覆盖。

### 4. 完整重做一遍（最稳）

风格表、单图、页面都动过，或不确定哪一步过期了，按顺序跑：

```bash
python3 handdraw-style-prompter/scripts/build_library.py
python3 scripts/build_dist.py
```

可选校验：

```bash
python3 handdraw-style-prompter/scripts/validate_library.py
```

## `build_dist.py` 实际做了什么

脚本会先删掉整个 `dist/`，再写入：

- `site/` 下的全部页面文件
- `data/styles.json`（从 Skill 索引拷贝）
- `data/catalog.js`（给页面用的目录，含图片路径和宽高）
- `images/{编号}.png`（按 `styles.json` 逐条拷贝示意图）
- `img/avatar.png`（当前用 `001.png`）

拷完后会检查：必要文件在不在、`dist/images` 张数是否等于 `styles.json` 条数。

## 和旧画廊的关系

`handdraw-style-prompter/gallery/index.html` 是 Skill 里原来的拼图 + 文字索引，由 `build_library.py` 生成。

`site/` → `dist/` 是后来的单图白墙画廊，才是给浏览、筛选、复制提示词用的部署站点。
