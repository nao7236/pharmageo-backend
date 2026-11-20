const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

// Inscription
router.post('/register', async (req, res) => {
    try {
        const { nom, prenom, email, telephone, mot_de_passe, role } = req.body;
        const hash = await bcrypt.hash(mot_de_passe, 10);

        const [result] = await db.execute(
            'INSERT INTO utilisateurs (nom, prenom, email, telephone, mot_de_passe_hash, role) VALUES (?, ?, ?, ?, ?, ?)',
            [nom, prenom, email, telephone, hash, role || 'PATIENT']
        );

        res.status(201).json({ message: 'Utilisateur créé avec succès', userId: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Connexion
router.post('/login', async (req, res) => {
    try {
        const { email, mot_de_passe } = req.body;
        const [rows] = await db.execute('SELECT * FROM utilisateurs WHERE email = ?', [email]);

        if (rows.length === 0) return res.status(404).json({ error: 'Utilisateur non trouvé' });

        const user = rows[0];
        const valid = await bcrypt.compare(mot_de_passe, user.mot_de_passe_hash);

        if (!valid) return res.status(401).json({ error: 'Mot de passe incorrect' });

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.json({ token, user: { id: user.id, nom: user.nom, prenom: user.prenom, role: user.role } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
