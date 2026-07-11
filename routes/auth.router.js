const express = require('express');
const passport = require('passport');
const { buildUserPermissionsConfig } = require('../services/permissions.service');

const router = express.Router();

router.get('/permissions-config',
  passport.authenticate('jwt', { session: false }),
  async (req, res, next) => {
    try {
      // req.user es el usuario que ya validó passport
      const config = await buildUserPermissionsConfig(req.user);
      res.json(config);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
