require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Middlewares globaux
app.use(cors());
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