const rateLimit = require('express-rate-limit');

const tooManyRequestsResponse = {
  success: false,
  statusCode: 429,
  message: 'Demasiadas solicitudes. Inténtalo de nuevo más tarde.'
};

// Limita intentos de login (email + password) por IP.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooManyRequestsResponse
});

// Limita verificación/reenvío de OTP por IP (el límite fino por reto ya lo
// aplica OtpService con `attempts` y `resendCount`; esto es una defensa extra).
const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooManyRequestsResponse
});

module.exports = { loginLimiter, otpLimiter };
