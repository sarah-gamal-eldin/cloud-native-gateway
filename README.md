# 🌍 Cloud Native Gateway

**Browser-based GIS file converter for cloud-native formats**  
Zero Server Required

![Cloud Native Gateway](https://img.shields.io/badge/Cloud%20Native-Gateway-3b82f6)
![macOS](https://img.shields.io/badge/macOS-Silicon%20%7C%20Intel-9ca3af)
![GDAL3.js](https://img.shields.io/badge/GDAL3.js-Powered-5856d6)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Features

### 📂 **Input Formats**
| Format | Support | Notes |
|--------|---------|-------|
| **Shapefile** (.zip) | ✅ Full | Multi-layer support, auto-merges |
| **GeoJSON** (.geojson/.json) | ✅ Full | FeatureCollection & single features |
| **CSV** (.csv) | ✅ Full | Auto-detects lat/lon columns (lat/lng/x/y) |

### 🚀 **Output Formats** (Cloud-Native Only - No GeoJSON)
| Format | Extension | Description |
|--------|----------|-------------|
| **PMTiles** | `.pmtiles` | Single-file vector tile archives |
| **FlatGeobuf** | `.fgb` | Fast spatial format for streaming |
| **GeoParquet** | `.parquet` | Columnar storage for big data |
| **Styled Map** | `.html` | Interactive dark-themed web map |

### 🗺️ **Map Features**
- **Dark theme** - Easy on the eyes, macOS-native design
- **Interactive preview** - Click features for property popups
- **Smart zooming** - Automatically fits to your data bounds
- **Fullscreen mode** - Immersive exploration
- **Scale control** - Metric scale bar
- **Geometry detection** - Points, lines, polygons styled differently

---

## 🖥️ **System Requirements**

- **Python** 3.7+ (for local server, optional)
- **Modern browser** - Safari, Chrome, Firefox, Edge

---

## 📦 **Installation**

### 1️⃣ **Clone the repository**
```bash
git clone https://github.com/yourusername/cloud-native-gateway.git
cd cloud-native-gateway
```
### 2️⃣ No dependencies required!

Just open index.html in your browser, or run the local server:

# Option A: Python HTTP server (recommended)
```bash
python3 cors-server.py
```

# Option B: Node.js server (HTTPS with COOP/COEP)
```bash
npm install
node server.js
```

### 3️⃣ Open in browser

http://localhost:8000

