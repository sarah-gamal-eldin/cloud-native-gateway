// server.js - macOS optimized server with HTTPS
const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();

// Critical headers for GDAL3.js
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
});

app.use(cors());
app.use(express.static(__dirname));

// Generate self-signed cert on the fly
const selfsigned = require('selfsigned');
const attrs = [{ name: 'commonName', value: 'localhost' }];
const pems = selfsigned.generate(attrs, { days: 1 });

const options = {
    key: pems.private,
    cert: pems.cert
};

https.createServer(options, app).listen(3443, () => {
    console.log('🚀 HTTPS Server running on:');
    console.log('   https://localhost:3443');
    console.log('✅ COOP/COEP headers enabled');
    console.log('✅ GDAL3.js should now load');
});