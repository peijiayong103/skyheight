# 光遇身高查询站 · 部署手册

> 全自动方案：数据每天自动更新，你什么都不用管。
> 全程免费。

---

## 一、这套系统怎么工作

```
GitHub 仓库（存放网站 + 数据 + 脚本）
      │
      │ ① 每天凌晨 2:00 自动触发
      ▼
GitHub Actions（免费的云服务器）
      │
      │ ② 运行 sync.py 去上游拉数据
      ▼
skycsg.asia（每天只被访问 1 次）
      │
      │ ③ 生成新的 data.js
      ▼
自动提交回 GitHub
      │
      │ ④ Cloudflare Pages 检测到仓库更新
      ▼
自动重新部署 → 网站数据更新 ✅
```

**你每天要做的：无。**

---

## 二、需要准备的东西

| 项目 | 说明 | 费用 |
|---|---|---|
| GitHub 账号 | 免费注册 | 0 |
| Cloudflare 账号 | 免费注册 | 0 |
| 卡密 | 已内置在 sync.py | — |

**都不需要信用卡。**

---

## 三、部署步骤（约 15 分钟）

### 步骤 1：创建 GitHub 仓库

1. 打开 https://github.com/new
2. Repository name 填 `skyheight`（或任意名）
3. 选 **Public**（Cloudflare 免费版部署公共仓库最省事）
4. 点 **Create repository**

### 步骤 2：上传文件

在新建的仓库页面，点 **uploading an existing file**，把下面这些文件/目录拖进去：

```
index.html
style.css
app.js
data.js
sync.py
data/master.json      ← 需要先建 data/ 目录
.github/workflows/sync.yml
```

> **便捷方法**：我这边已经把所有文件打包好了，直接解压后整个拖进仓库即可。

### 步骤 3：配置卡密（Secret）

1. 仓库 → **Settings** → 左侧 **Secrets and variables** → **Actions**
2. 点 **New repository secret**
3. Name 填 `SKY_KAMI`
4. Secret 填你的卡密（如 `sjmyP3CODLBFLV`）
5. 点 **Add secret**

> ⚠️ 卡密不要写进代码里，放 Secret 里最安全。

### 步骤 4：开启 Actions 写权限

1. 仓库 → **Settings** → **Actions** → **General**
2. 拉到最下面 **Workflow permissions**
3. 选 **Read and write permissions**
4. 点 **Save**

> 这步不做，脚本拉完数据推不回去。

### 步骤 5：测试一次

1. 仓库 → **Actions** 标签页
2. 左侧点 **光遇身高数据自动同步**
3. 右侧点 **Run workflow** → **Run workflow**
4. 等 1~2 分钟，看到 ✅ 就成功了

### 步骤 6：连接 Cloudflare Pages

1. 打开 https://dash.cloudflare.com/ → 注册/登录
2. 左侧 **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. 授权 GitHub，选你刚建的 `skyheight` 仓库
4. 配置：
   - **Framework preset**: `None`
   - **Build command**: 留空
   - **Build output directory**: `/`（填一个斜杠）
5. 点 **Save and Deploy**

等 1~2 分钟，你会拿到一个网址：

```
https://skyheight.pages.dev
```

**完成！网站上线了。**

---

## 四、日常维护

### 数据更新

**自动**：每天凌晨 2:00 自动跑，你什么都不用做。
**手动**：Actions 页面 → Run workflow。

### 查看同步状态

仓库 → **Actions** → 看每次运行的颜色：
- ✅ 绿色 = 成功
- ❌ 红色 = 失败（点进去看日志）

### 常见失败原因

| 现象 | 原因 | 解决 |
|---|---|---|
| `拉取失败: HTTP 403` | 卡密被封/失效 | 换卡密，更新 Secret |
| `拉取失败: timeout` | 上游挂了 | 等下次自动跑 |
| `git push` 失败 | 没开写权限 | 重做步骤 4 |
| 数据没变 | 上游无新数据 | 正常，脚本会跳过 |

---

## 五、成本

| 项目 | 免费额度 | 你的用量 |
|---|---|---|
| GitHub Actions | 公共仓库无限 | 每天 1 次 × 1 分钟 |
| Cloudflare Pages | 无限带宽、500次构建/月 | 每天 1 次 |
| 域名 | 用 .pages.dev 免费 | 0 |

**合计：0 元/月。**

---

## 六、进阶（可选）

### 自定义域名

1. Cloudflare Pages → 你的项目 → **Custom domains**
2. 添加你的域名，按提示改 DNS
3. 域名费用：约 ¥60/年（如果要买）

### 改同步时间

编辑 `.github/workflows/sync.yml`：

```yaml
on:
  schedule:
    - cron: '0 18 * * *'   # UTC 时间，比北京晚 8 小时
```

| 想要北京时间 | 填 cron |
|---|---|
| 02:00 | `0 18 * * *` |
| 04:00 | `0 20 * * *` |
| 每 6 小时 | `0 */6 * * *` |

---

## 七、安全提醒

1. **卡密放 Secret**，不要提交到代码里
2. **联系邮箱留空**，或用一个专门的匿名邮箱
3. **不要加实时查询功能**（会让上游看到你的用户量）
4. **数据每天只拉 1 次**，伪装成正常网站访问
