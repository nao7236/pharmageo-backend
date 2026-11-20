require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

const allowedOrigins = [
  'https://pharmaciegeo.netlify.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];

// Middlewares globaux
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origine non autorisée par CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.options('*', cors());
app.use(express.json());

// Route de test / santé de l'API
app.get('/', (req, res) => {
  res.json({ message: 'API PharmaGeo opérationnelle' });
});

// Routes métier
app.use('/api/stocks', require('./routes/stocks'));
app.use('/api/pharmacies', require('./routes/pharmacies'));
app.use('/api/precommandes', require('./routes/precommandes'));

// Gestion des routes non trouvées (404)
app.use((req, res) => {
  res.status(404).json({ error: 'Route introuvable' });
});

// Gestion centralisée des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});