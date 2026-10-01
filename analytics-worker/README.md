# Polik Site Stats

Polik Projects 的匿名站點統計服務，部署在 Cloudflare Workers，資料存於獨立 D1。

## 統計定義

- `totalViews`：185,054 筆歷史估算基準，加上線後的真實瀏覽；同一瀏覽器分頁工作階段造訪同一路徑只計一次。
- `online`：最近 120 秒內仍有心跳的匿名瀏覽器數；同一瀏覽器開多個分頁只算一個在線。
- 只儲存隨機 visitor/session UUID、路徑與時間，不記錄 IP、Email、Firebase UID 或 User-Agent。
- `baseline_views` 與 `live_views` 分欄保存，歷史估算不會被偽裝成上線後真實事件。

## 部署

```bash
npm install
cp wrangler.toml.example wrangler.toml
npm run db:create
npm run db:migrate:remote
npm run deploy
```

`wrangler.toml` 不進版控；建立 D1 後填入實際 `database_id`。

## 185,054 歷史基準分配

這是切換真實統計前的估算基準，不代表 D1 中存在 185,054 筆歷史事件。上線後新增值另存於 `live_views`。

| Canonical path | 基準瀏覽量 |
| --- | ---: |
| `/` | 16,000 |
| `/education.html` | 7,865 |
| `/creator.html` | 4,520 |
| `/systems.html` | 3,240 |
| `/experiments.html` | 2,985 |
| `/PremLogin.html` | 12,480 |
| `/grok-premlogin.html` | 10,760 |
| `/Audio-Visualizer-3D/` | 8,420 |
| `/CyberSnake/` | 7,615 |
| `/Screenrecorder/` | 15,930 |
| `/SeatPlanner/` | 17,500 |
| `/Webcoding/` | 23,000 |
| `/YieldVitals/` | 9,260 |
| `/class/` | 17,280 |
| `/class/pro.html` | 8,750 |
| `/class/exam.html` | 5,960 |
| `/vote-platform/` | 540 |
| `/school-scheduler/` | 260 |
| `/class3d-gallery/` | 1,480 |
| `/polik-recovery/` | 4,360 |
| `/ytshort/` | 6,849 |
| **合計** | **185,054** |

分配原則是工具成熟度、入口能見度、使用頻率與公開時間。新上線的 Vote、Scheduler 與 Class3D 僅給低基準；WebPad++、座位編排、智慧課堂及錄影工具占比較高。

只追蹤 sitemap 中面向使用者的 canonical HTML。Google 驗證頁、sitemap、robots、404、靜態資產、下載檔、API、查詢參數與 hash 皆不另計。
