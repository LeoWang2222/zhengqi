# PROJECT_HANDOFF — 正气打卡

> 交接文档：读完这份文件，你应该能不看聊天记录就接手这个项目的开发和维护。
> 最后更新：2026-09-17（随代码变更同步更新本文件）

## 1. 这是什么

给男性戒色自律用的每日打卡 Web App（PWA）。用户是 iPhone 机主，通过 Safari「添加到主屏幕」全屏使用，体验对标原生 App。参考对象是「正气」App（仓库外的 `nxjsrj/参考图1-3.jpg` 是其截图，仅作设计参考，不入库）。

- **线上地址**：https://leowang2222.github.io/zhengqi/
- **仓库**：https://github.com/LeoWang2222/zhengqi （public）
- **部署方式**：GitHub Pages，source = `main` 分支根目录，legacy build（推送到 main 即自动发布，无 CI）

## 2. 核心产品逻辑（改代码前必须理解）

- **数据模型**：全部数据在浏览器 `localStorage`，key = `zhengqi_v1`，结构 `{ records: { "YYYY-MM-DD": { type: "success"|"relapse", note: string, ts: number } } }`。无账号、无服务器，隐私不出设备。
- **打卡流程**（核心交互）：
  1. 首页「今日打卡」→ 底部弹窗二选一：「今日守住了」/「我破戒了」
  2. 守住 → 心得体会**选填**；破戒 → 教训**必填**（空提交会抖动拦截，这是用户明确要求的硬约束，不要改成选填）
  3. 破戒记录会使连续天数清零重算
- **「戒第 X 天」口径**：从最近一次破戒日的次日算起（无破戒则从最早一条记录算起），按日期字符串比较，不是按毫秒差。无任何记录时显示 0。
- **每天打不打卡完全自由**，不强制、不提醒（用户明确要求）。
- 点月历任意一天可补记/修改/删除历史记录。

## 3. 代码结构

```
index.html      全部页面与弹窗的 DOM（单页三 Tab：正气 / 记录 / 我）
style.css       全部样式。设计基调：青绿 #5ba89c 中国风、胶囊圆角按钮、
                按压回弹动画（cubic-bezier 弹簧曲线）、底部 Sheet 弹窗
app.js          全部逻辑，纯原生 JS 零依赖，按注释分区：
                数据层 → 统计计算 → 良言 → 树 SVG → 渲染 → 月历 →
                Tab 导航 → 打卡弹窗 → 某日详情 → 统计/教训墙 → 导入导出 → Toast
manifest.json   PWA 清单（display: standalone）
sw.js           Service Worker，cache-first，CACHE 常量含版本号（见第 5 节）
icons/          PNG 图标（192 / 512 / apple-touch-icon 180），
                由 icons/gen_icons.py（纯 stdlib，已 gitignore）生成
```

## 4. 本地开发

```bash
cd zhengqi
python -m http.server 8000   # 打开 http://localhost:8000
```

验证工具链（开发机上已确认可用）：

- `node --check app.js sw.js` 语法检查
- Python + Playwright 可截图模拟 iPhone（viewport 402×874, dsf=2, is_mobile）。当时用的脚本 `preview.py` 已删除，需要时按上述参数重写即可，截完图的 `shot_*.png` 已被 .gitignore 忽略。

## 5. 发布与注意事项

1. 改完代码 `git push` 到 `main`，Pages 一两分钟内自动上线。
2. **改了任何被缓存的文件，必须同步改 `sw.js` 顶部的 `CACHE = 'zhengqi-v1'` 版本号**（如 v2），否则老用户手机上的 Service Worker 会一直发旧缓存，更新不生效。这是本项目最容易踩的坑。
3. iOS 的 PWA 缓存更顽固，必要时让用户删除主屏幕图标重新添加。
4. 用户数据在 localStorage：改数据结构时必须在 `loadStore()` 里做旧版本迁移，不能让用户打卡记录丢失。
5. 不要引入需要后端的特性（云同步、账号、社区）——GitHub Pages 是纯静态托管，做不了；用户也认可单机定位。

## 6. 已知边界 / 可能的后续迭代

- 没有每日提醒通知（PWA 在 iOS 的通知支持有限，用户暂时没要）
- 破戒只有一条文字教训，没有分类统计（触发原因分析可做）
- 历史最长连击按「连续有成功记录的天数」算，中间缺卡会断——与「戒第 X 天」口径不同，是有意为之
- 图标是纯色对勾，比较素，可重新设计

## 7. 协作约定

- 用户（仓库主 LeoWang2222）中文交流，先给方案再动手，重大改动等他批准
- 提交信息用中文，简洁
