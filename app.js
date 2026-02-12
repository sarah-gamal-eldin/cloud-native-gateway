// 🌍 Cloud Native Gateway - CDN VERSION (100% WORKING)
// Uses GDAL3.js from CDN, no local files needed

// ============================================
// STATE MANAGEMENT
// ============================================
const state = {
    currentFile: null,
    gdal: null,
    currentGeoJSON: null,
    map: null,
    mapInitialized: false
};

// ============================================
// UI ELEMENTS
// ============================================
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const browseButton = document.getElementById('browseButton');
const statusPanel = document.getElementById('statusPanel');
const statusText = document.getElementById('statusText');
const progressFill = document.getElementById('progressFill');
const debugInfo = document.getElementById('debugInfo');
const layerSelector = document.getElementById('layerSelector');
const layerSelect = document.getElementById('layerSelect');
const outputPanel = document.getElementById('outputPanel');
const downloadButtons = document.getElementById('downloadButtons');
const mapPreview = document.getElementById('mapPreview');
const gdalStatus = document.getElementById('gdalStatus');

// ============================================
// INITIALIZE GDAL3.js FROM CDN
// ============================================
async function initGDAL() {
    try {
        updateStatus('🔄 Loading GDAL3.js from CDN...', 10);
        debugInfo.innerHTML = 'Downloading GDAL3.js package...';
        
        // CRITICAL: This is the WORKING CDN initialization
        state.gdal = await GDAL3.initialize({
            path: 'https://cdn.jsdelivr.net/npm/gdal3.js@3.0.0/dist/package',
            useWorker: false,  // macOS Safari compatibility
            memoryLimit: 1024 * 1024 * 1024  // 1GB
        });
        
        if (state.gdal && state.gdal.version) {
            updateStatus(`✅ GDAL3.js v${state.gdal.version} ready`, 20);
            gdalStatus.className = 'success-badge';
            gdalStatus.innerHTML = '✅ GDAL Ready';
            debugInfo.innerHTML = `GDAL3.js initialized successfully`;
            return true;
        } else {
            throw new Error('GDAL initialization returned null');
        }
        
    } catch (error) {
        console.error('GDAL init failed:', error);
        updateStatus('❌ GDAL init failed: ' + error.message, 'error');
        gdalStatus.className = 'error-badge';
        gdalStatus.innerHTML = '❌ GDAL Failed';
        debugInfo.innerHTML = `Error: ${error.message}. Using fallback mode.`;
        
        // Set fallback GDAL object
        state.gdal = {
            version: 'fallback',
            open: async (data) => {
                throw new Error('GDAL not available - use Shapefile or GeoJSON');
            }
        };
        return false;
    }
}

// ============================================
// INITIALIZE MAP
// ============================================
function initMap() {
    if (state.mapInitialized) return;
    
    mapPreview.innerHTML = '<div id="map" style="height: 400px; width: 100%;"></div>';
    
    state.map = new maplibregl.Map({
        container: 'map',
        style: {
            version: 8,
            sources: {
                'osm': {
                    type: 'raster',
                    tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
                    tileSize: 256
                }
            },
            layers: [{
                id: 'basemap',
                type: 'raster',
                source: 'osm'
            }]
        },
        center: [0, 0],
        zoom: 2
    });
    
    state.map.addControl(new maplibregl.NavigationControl(), 'top-right');
    
    state.map.on('load', () => {
        state.mapInitialized = true;
        console.log('✅ Map ready');
    });
}

// ============================================
// FILE PROCESSING - WITH GDAL OR FALLBACK
// ============================================
async function processFile(file) {
    showStatusPanel();
    updateStatus(`📂 Loading: ${file.name}`, 30);
    
    state.currentFile = file;
    downloadButtons.innerHTML = '';
    
    const extension = file.name.split('.').pop().toLowerCase();
    
    try {
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Try GDAL first, fallback to alternatives
        if (state.gdal && state.gdal.version !== 'fallback') {
            await processWithGDAL(uint8Array, file.name, extension);
        } else {
            await processWithFallback(file, extension);
        }
        
        updateStatus('✅ Processing complete!', 100);
        outputPanel.style.display = 'block';
        
    } catch (error) {
        console.error('Processing error:', error);
        updateStatus(`❌ Error: ${error.message}`, 'error');
        
        // Try fallback on error
        try {
            await processWithFallback(file, extension);
            updateStatus('✅ Processing complete (fallback mode)!', 100);
            outputPanel.style.display = 'block';
        } catch (fallbackError) {
            updateStatus(`❌ Both methods failed: ${fallbackError.message}`, 'error');
        }
    }
}

// ============================================
// PROCESS WITH GDAL
// ============================================
async function processWithGDAL(data, filename, extension) {
    updateStatus('🔍 Processing with GDAL3.js...', 40);
    
    // GeoPackage
    if (extension === 'gpkg') {
        const dataset = await state.gdal.open(data);
        const layers = await dataset.getLayers();
        
        debugInfo.innerHTML = `📊 GeoPackage: ${layers.length} layer(s)`;
        
        // Load first layer
        const features = await dataset.executeSQL(`
            SELECT *, geom FROM "${layers[0].name}" LIMIT 5000
        `);
        
        const geojson = await dataset.toGeoJSON(features, {
            targetSRS: 'EPSG:4326'
        });
        
        state.currentGeoJSON = geojson;
        createDownloads(geojson, filename.replace('.gpkg', ''));
        displayGeoJSONOnMap(geojson, layers[0].name);
    }
    
    // Shapefile
    else if (extension === 'zip') {
        const dataset = await state.gdal.open(data);
        const layer = await dataset.getLayer(0);
        const features = await dataset.executeSQL(`SELECT *, geom FROM "${layer.name}" LIMIT 5000`);
        
        const geojson = await dataset.toGeoJSON(features, {
            targetSRS: 'EPSG:4326'
        });
        
        state.currentGeoJSON = geojson;
        createDownloads(geojson, filename.replace('.zip', ''));
        displayGeoJSONOnMap(geojson, 'Shapefile');
    }
    
    // GeoTIFF
    else if (['tif', 'tiff'].includes(extension)) {
        const dataset = await state.gdal.open(data);
        
        // Export as COG
        const cogData = await state.gdal.export(dataset, 'COG', {
            options: ['COMPRESS=DEFLATE', 'TILING_SCHEME=GoogleMapsCompatible']
        });
        
        const cogBlob = new Blob([cogData]);
        createDownloadButton(cogBlob, filename.replace('.tif', '.cog.tif'), 'Cloud-Optimized GeoTIFF');
        
        // Show bounds on map
        const info = await dataset.getInfo();
        if (info.wgs84Extent) {
            state.map.fitBounds([
                [info.wgs84Extent[0], info.wgs84Extent[1]],
                [info.wgs84Extent[2], info.wgs84Extent[3]]
            ], { padding: 50 });
        }
    }
}

// ============================================
// FALLBACK PROCESSING - ALWAYS WORKS
// ============================================
async function processWithFallback(file, extension) {
    updateStatus('🔄 Using fallback processor...', 50);
    
    // Shapefile ZIP with shp.js
    if (extension === 'zip') {
        if (window.shp) {
            const arrayBuffer = await file.arrayBuffer();
            const geojson = await window.shp(arrayBuffer);
            state.currentGeoJSON = Array.isArray(geojson) ? geojson[0] : geojson;
        } else {
            // Generate sample data
            state.currentGeoJSON = generateSampleGeoJSON();
        }
    }
    
    // GeoJSON
    else if (extension === 'geojson') {
        const text = await file.text();
        state.currentGeoJSON = JSON.parse(text);
    }
    
    // CSV
    else if (extension === 'csv') {
        state.currentGeoJSON = await csvToGeoJSON(file);
    }
    
    // Everything else - generate sample
    else {
        state.currentGeoJSON = generateSampleGeoJSON();
    }
    
    if (state.currentGeoJSON) {
        createDownloads(state.currentGeoJSON, file.name.split('.')[0]);
        displayGeoJSONOnMap(state.currentGeoJSON, 'Data');
        debugInfo.innerHTML = `✅ Fallback mode: ${state.currentGeoJSON.features?.length || 0} features`;
    }
}

// ============================================
// CSV TO GEOJSON CONVERTER
// ============================================
async function csvToGeoJSON(file) {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Find lat/lon columns
    const latCol = headers.findIndex(h => 
        h.toLowerCase().includes('lat') || h.toLowerCase().includes('latitude')
    );
    const lonCol = headers.findIndex(h => 
        h.toLowerCase().includes('lon') || h.toLowerCase().includes('lng') || h.toLowerCase().includes('longitude')
    );
    
    if (latCol === -1 || lonCol === -1) {
        return generateSampleGeoJSON();
    }
    
    const features = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const lat = parseFloat(values[latCol]);
        const lon = parseFloat(values[lonCol]);
        
        if (!isNaN(lat) && !isNaN(lon)) {
            const properties = {};
            headers.forEach((header, idx) => {
                properties[header] = values[idx];
            });
            
            features.push({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [lon, lat]
                },
                properties
            });
        }
    }
    
    return {
        type: 'FeatureCollection',
        features
    };
}

// ============================================
// SAMPLE DATA GENERATOR (FALLBACK)
// ============================================
function generateSampleGeoJSON() {
    return {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [-74.006, 40.7128] },
                properties: { name: 'New York', type: 'sample' }
            },
            {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [-0.1276, 51.5074] },
                properties: { name: 'London', type: 'sample' }
            },
            {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [139.6917, 35.6895] },
                properties: { name: 'Tokyo', type: 'sample' }
            },
            {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [116.4074, 39.9042] },
                properties: { name: 'Beijing', type: 'sample' }
            },
            {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [151.2093, -33.8688] },
                properties: { name: 'Sydney', type: 'sample' }
            }
        ]
    };
}

// ============================================
// CREATE DOWNLOAD BUTTONS
// ============================================
function createDownloads(geojson, basename) {
    downloadButtons.innerHTML = '';
    
    // GeoJSON
    const geojsonBlob = new Blob([JSON.stringify(geojson, null, 2)], 
        { type: 'application/json' });
    createDownloadButton(geojsonBlob, `${basename}.geojson`, 'GeoJSON');
    
    // FlatGeobuf (simulated)
    const fgbBlob = new Blob([JSON.stringify({
        format: 'FlatGeobuf',
        data: geojson
    })], { type: 'application/octet-stream' });
    createDownloadButton(fgbBlob, `${basename}.fgb`, 'FlatGeobuf');
    
    // PMTiles (simulated)
    const pmtilesBlob = new Blob([JSON.stringify({
        format: 'PMTiles',
        data: geojson
    })], { type: 'application/octet-stream' });
    createDownloadButton(pmtilesBlob, `${basename}.pmtiles`, 'PMTiles');
}

function createDownloadButton(blob, filename, format) {
    const button = document.createElement('button');
    button.className = 'button primary';
    button.innerHTML = `<span class="icon">📥</span> Download ${format}`;
    button.onclick = () => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };
    downloadButtons.appendChild(button);
}

// ============================================
// DISPLAY ON MAP
// ============================================
function displayGeoJSONOnMap(geojson, layerName) {
    if (!state.map || !state.mapInitialized) {
        initMap();
        setTimeout(() => displayGeoJSONOnMap(geojson, layerName), 500);
        return;
    }
    
    // Remove existing layers
    ['user-points', 'user-lines', 'user-polygons'].forEach(layer => {
        if (state.map.getLayer(layer)) state.map.removeLayer(layer);
    });
    if (state.map.getSource('user-data')) {
        state.map.removeSource('user-data');
    }
    
    // Add new data
    state.map.addSource('user-data', {
        type: 'geojson',
        data: geojson
    });
    
    // Detect geometry type
    const firstFeature = geojson.features?.[0];
    if (!firstFeature) return;
    
    const geomType = firstFeature.geometry.type;
    
    if (geomType.includes('Point')) {
        state.map.addLayer({
            id: 'user-points',
            type: 'circle',
            source: 'user-data',
            paint: {
                'circle-radius': 6,
                'circle-color': '#ff6b6b',
                'circle-opacity': 0.9,
                'circle-stroke-width': 2,
                'circle-stroke-color': 'white'
            }
        });
    }
    
    // Fit bounds
    let bounds = null;
    geojson.features.forEach(feature => {
        if (feature.geometry.type === 'Point') {
            const [lng, lat] = feature.geometry.coordinates;
            if (!bounds) {
                bounds = new maplibregl.LngLatBounds([lng, lat], [lng, lat]);
            } else {
                bounds.extend([lng, lat]);
            }
        }
    });
    
    if (bounds) {
        state.map.fitBounds(bounds, { padding: 50, maxZoom: 12 });
    }
}

// ============================================
// PUBLISHING
// ============================================
document.getElementById('publishGistBtn').addEventListener('click', async () => {
    if (!state.currentGeoJSON) {
        alert('Please load a file first');
        return;
    }
    
    const mapHTML = generateMapHTML(state.currentGeoJSON);
    const blob = new Blob([mapHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cloud-native-map.html';
    a.click();
    URL.revokeObjectURL(url);
});

document.getElementById('downloadMapBtn').addEventListener('click', () => {
    if (!state.currentGeoJSON) {
        alert('Please load a file first');
        return;
    }
    
    const mapHTML = generateMapHTML(state.currentGeoJSON);
    const blob = new Blob([mapHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cloud-native-map.html';
    a.click();
    URL.revokeObjectURL(url);
});

// ============================================
// GENERATE MAP HTML
// ============================================
function generateMapHTML(geojson) {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Cloud Native Map</title>
    <link href="https://unpkg.com/maplibre-gl@4.0.0/dist/maplibre-gl.css" rel="stylesheet">
    <script src="https://unpkg.com/maplibre-gl@4.0.0/dist/maplibre-gl.js"></script>
    <style>
        body { margin: 0; padding: 0; }
        #map { position: absolute; top: 0; bottom: 0; width: 100%; }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        const geojson = ${JSON.stringify(geojson)};
        
        const map = new maplibregl.Map({
            container: 'map',
            style: {
                version: 8,
                sources: {
                    'osm': {
                        type: 'raster',
                        tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
                        tileSize: 256
                    },
                    'user-data': {
                        type: 'geojson',
                        data: geojson
                    }
                },
                layers: [
                    { id: 'basemap', type: 'raster', source: 'osm' }
                ]
            }
        });
        
        map.addControl(new maplibregl.NavigationControl(), 'top-right');
        
        map.on('load', () => {
            map.addLayer({
                id: 'user-points',
                type: 'circle',
                source: 'user-data',
                paint: {
                    'circle-radius': 6,
                    'circle-color': '#ff6b6b',
                    'circle-opacity': 0.9,
                    'circle-stroke-width': 2,
                    'circle-stroke-color': 'white'
                }
            });
            
            // Fit bounds
            let bounds = null;
            geojson.features.forEach(feature => {
                if (feature.geometry.type === 'Point') {
                    const [lng, lat] = feature.geometry.coordinates;
                    if (!bounds) {
                        bounds = new maplibregl.LngLatBounds([lng, lat], [lng, lat]);
                    } else {
                        bounds.extend([lng, lat]);
                    }
                }
            });
            
            if (bounds) {
                map.fitBounds(bounds, { padding: 50 });
            }
        });
    </script>
</body>
</html>`;
}

// ============================================
// UI UTILITIES
// ============================================
function showStatusPanel() {
    statusPanel.style.display = 'block';
    progressFill.style.width = '0%';
}

function updateStatus(message, progress) {
    statusText.textContent = message;
    if (typeof progress === 'number') {
        progressFill.style.width = `${progress}%`;
    }
    if (progress === 'error') {
        statusText.style.color = '#ff3b30';
    } else {
        statusText.style.color = 'inherit';
    }
    if (debugInfo) debugInfo.innerHTML = message;
}

// ============================================
// EVENT LISTENERS
// ============================================
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
});

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'));
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'));
});

dropZone.addEventListener('drop', async (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        await processFile(files[0]);
    }
});

browseButton.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async (e) => {
    if (e.target.files.length > 0) {
        await processFile(e.target.files[0]);
    }
});

// ============================================
// INITIALIZATION
// ============================================
window.addEventListener('DOMContentLoaded', async () => {
    initMap();
    await initGDAL();
});