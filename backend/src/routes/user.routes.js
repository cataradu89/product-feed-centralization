const express = require('express');
const { authMiddleware, adminMiddleware } = require('../middleware/auth.middleware');

const router = express.Router();

// Rută de bază pentru utilizatori
// Momentan returnează doar un mesaj simplu
router.get('/', authMiddleware, (req, res) => {
  res.json({ message: 'User routes are working', user: req.user });
});

// Rută pentru profilul utilizatorului curent
router.get('/profile', authMiddleware, (req, res) => {
  res.json({ 
    message: 'User profile', 
    user: {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role
    } 
  });
});

// Exportă router-ul pentru a fi utilizat în index.js
module.exports = router;
