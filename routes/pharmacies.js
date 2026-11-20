const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Adaptez le chemin vers votre connexion MySQL (ex: ../db ou ../config/database)

// 1. Recherche des pharmacies à proximité (appelée par App.jsx)
// GET /api/pharmacies/search?lat=...&lng=...
router.get('/search', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ error: 'Paramètres lat et lng invalides ou manquants.' });
    }

    // Formule de Haversine (distance en km) avec colonnes latitude / longitude
    const [rows] = await db.execute(
      `
      SELECT
        id,
        nom,
        adresse,
        latitude,
        longitude,
        (
          6371 * ACOS(
            LEAST(1, GREATEST(-1,
              COS(RADIANS(?)) * COS(RADIANS(latitude)) * COS(RADIANS(longitude) - RADIANS(?))
              + SIN(RADIANS(?)) * SIN(RADIANS(latitude))
            ))
          )
        ) AS distance
      FROM pharmacies
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      ORDER BY distance ASC
      LIMIT 20
      `,
      [lat, lng, lat]
    );

    res.json(rows);
  } catch (error) {
    console.error('Erreur /api/pharmacies/search :', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Liste des stocks d'une pharmacie (appelée par StockManager)
// GET /api/pharmacies/:id/stocks
router.get('/:id/stocks', async (req, res) => {
  try {
    const pharmacieId = req.params.id;

    const [rows] = await db.execute(
      `
      SELECT
        s.id,
        s.pharmacie_id,
        s.medicament_id,
        m.nom_commercial,
        m.prix_indicatif,
        s.quantite_disponible,
        s.seuil_alerte
      FROM stocks_pharmacie s
      JOIN medicaments m ON m.id = s.medicament_id
      WHERE s.pharmacie_id = ?
      ORDER BY m.nom_commercial ASC
      `,
      [pharmacieId]
    );

    res.json(rows);
  } catch (error) {
    console.error('Erreur GET /:id/stocks :', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Ajout ou mise à jour d'un stock dans une pharmacie
// POST /api/pharmacies/:id/stocks
router.post('/:id/stocks', async (req, res) => {
  try {
    const pharmacieId = req.params.id;
    const { medicament_id, quantite_disponible, seuil_alerte = 0 } = req.body;

    if (!medicament_id || quantite_disponible === undefined) {
      return res.status(400).json({
        error: 'Les champs medicament_id et quantite_disponible sont requis.',
      });
    }

    await db.execute(
      `INSERT INTO stocks_pharmacie (pharmacie_id, medicament_id, quantite_disponible, seuil_alerte)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE quantite_disponible = ?, seuil_alerte = ?`,
      [pharmacieId, medicament_id, quantite_disponible, seuil_alerte, quantite_disponible, seuil_alerte]
    );

    res.json({ message: 'Stock mis à jour' });
  } catch (error) {
    console.error('Erreur POST /:id/stocks :', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;