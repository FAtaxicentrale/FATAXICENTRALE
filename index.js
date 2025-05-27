/**
 * FA Taxi Boeking - Hoofdingangspunt
 * Dit bestand dient als het startpunt van de Node.js applicatie
 */

const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Basis middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Statische bestanden serveren
app.use(express.static(path.join(__dirname, 'public')));
app.use('/static', express.static(path.join(__dirname, 'static')));

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Alle andere GET-verzoeken sturen we naar de frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start de server
app.listen(PORT, () => {
  console.log(`FA Taxi Boeking draait op http://localhost:${PORT}`);
});

module.exports = app;
