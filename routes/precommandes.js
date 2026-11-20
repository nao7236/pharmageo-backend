const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Créer une précommande avec ses lignes de médicaments
// POST /api/precommandes
router.post('/', async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { patient_id = 1, pharmacie_id, url_ordonnance = null, articles } = req.body;

    if (!pharmacie_id || !Array.isArray(articles) || articles.length === 0) {
      return res.status(400).json({ error: 'Pharmacie et au moins un médicament sont requis.' });
    }

    await connection.beginTransaction();

    // Générer un code de retrait simple (ex: RET-5829)
    const codeRetrait = 'RET-' + Math.floor(1000 + Math.random() * 9000);

    const [precommandeRes] = await connection.execute(
      `INSERT INTO precommandes (patient_id, pharmacie_id, statut, url_ordonnance, code_retrait, date_expiration)
       VALUES (?, ?, 'EN_ATTENTE', ?, ?, DATE_ADD(NOW(), INTERVAL 48 HOUR))`,
      [patient_id, pharmacie_id, url_ordonnance, codeRetrait]
    );

    const precommandeId = precommandeRes.insertId;

    for (const item of articles) {
      await connection.execute(
        `INSERT INTO lignes_precommande (precommande_id, medicament_id, quantite)
         VALUES (?, ?, ?)`,
        [precommandeId, item.medicament_id, item.quantite]
      );
    }

    await connection.commit();

    res.status(201).json({
      message: 'Précommande enregistrée avec succès',
      precommande_id: precommandeId,
      code_retrait: codeRetrait,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Erreur POST /api/precommandes :', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;