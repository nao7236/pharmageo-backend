const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Adaptez le chemin vers votre connexion MySQL (ex: ../db ou ../config/database)

// 1. Lister tous les stocks (optionnel : filtrer par ?pharmacie_id= ou ?medicament_id=)
// GET /api/stocks
router.get('/', async (req, res) => {
  try {
    const { pharmacie_id, medicament_id } = req.query;

    let sql = `
      SELECT
        s.id,
        s.pharmacie_id,
        p.nom AS pharmacie_nom,
        s.medicament_id,
        m.nom_commercial,
        s.quantite_disponible,
        s.seuil_alerte
      FROM stocks_pharmacie s
      JOIN pharmacies p ON p.id = s.pharmacie_id
      JOIN medicaments m ON m.id = s.medicament_id
      WHERE 1 = 1
    `;
    const params = [];

    if (pharmacie_id) {
      sql += ' AND s.pharmacie_id = ?';
      params.push(pharmacie_id);
    }

    if (medicament_id) {
      sql += ' AND s.medicament_id = ?';
      params.push(medicament_id);
    }

    sql += ' ORDER BY m.nom_commercial ASC';

    const [rows] = await db.execute(sql, params);
    res.json(rows);
  } catch (error) {
    console.error('Erreur GET /api/stocks :', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Récupérer les stocks d'une pharmacie spécifique
// GET /api/stocks/pharmacie/:pharmacieId
router.get('/pharmacie/:pharmacieId', async (req, res) => {
  try {
    const { pharmacieId } = req.params;

    const [rows] = await db.execute(
      `
      SELECT
        s.id,
        s.pharmacie_id,
        s.medicament_id,
        m.nom_commercial,
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
    console.error('Erreur GET /api/stocks/pharmacie/:pharmacieId :', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Ajouter ou mettre à jour un stock (upsert)
// POST /api/stocks
router.post('/', async (req, res) => {
  try {
    const { pharmacie_id, medicament_id, quantite_disponible, seuil_alerte = 0 } = req.body;

    if (!pharmacie_id || !medicament_id || quantite_disponible === undefined) {
      return res.status(400).json({
        error: 'Les champs pharmacie_id, medicament_id et quantite_disponible sont requis.',
      });
    }

    await db.execute(
      `INSERT INTO stocks_pharmacie (pharmacie_id, medicament_id, quantite_disponible, seuil_alerte)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE quantite_disponible = ?, seuil_alerte = ?`,
      [
        pharmacie_id,
        medicament_id,
        quantite_disponible,
        seuil_alerte,
        quantite_disponible,
        seuil_alerte,
      ]
    );

    res.json({ message: 'Stock mis à jour' });
  } catch (error) {
    console.error('Erreur POST /api/stocks :', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Modifier la quantité ou le seuil d'une ligne de stock existante
// PUT /api/stocks/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantite_disponible, seuil_alerte } = req.body;

    if (quantite_disponible === undefined) {
      return res.status(400).json({ error: 'Le champ quantite_disponible est requis.' });
    }

    const [result] = await db.execute(
      `UPDATE stocks_pharmacie
       SET quantite_disponible = ?,
           seuil_alerte = COALESCE(?, seuil_alerte)
       WHERE id = ?`,
      [quantite_disponible, seuil_alerte, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Ligne de stock introuvable.' });
    }

    res.json({ message: 'Stock modifié avec succès' });
  } catch (error) {
    console.error('Erreur PUT /api/stocks/:id :', error);
    res.status(500).json({ error: error.message });
  }
});

// 5. Supprimer une ligne de stock
// DELETE /api/stocks/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.execute('DELETE FROM stocks_pharmacie WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Ligne de stock introuvable.' });
    }

    res.json({ message: 'Stock supprimé avec succès' });
  } catch (error) {
    console.error('Erreur DELETE /api/stocks/:id :', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;