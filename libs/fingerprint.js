const crypto = require('crypto');
const { machineIdSync } = require('node-machine-id');

/**
 * Huella estable de la máquina donde corre este proceso, usada para atar
 * (node-lock) una licencia a una instalación concreta.
 *
 * En Windows (.exe vía pkg) usa el GUID de la máquina del registro: estable
 * mientras no se reinstale el SO. En Docker/Linux usa /etc/machine-id: si el
 * backend se despliega en contenedor, ese fichero debe montarse desde el host
 * (volumen) para que la huella sobreviva a que el contenedor se recree —
 * si no, cada `docker compose up` generaría una huella nueva y la licencia
 * dejaría de coincidir. Ver docker-compose.yml.
 */
function getMachineFingerprint() {
  const rawId = machineIdSync({ original: true });
  return crypto.createHash('sha256').update(rawId).digest('hex');
}

module.exports = { getMachineFingerprint };
