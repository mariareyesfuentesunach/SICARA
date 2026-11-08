const https = require('https');

// Cache en memoria para resolver CPs en 0 ms tras la primera consulta
const cpCache = new Map();

/**
 * Consulta las colonias, municipio y estado correspondientes a un código postal mexicano.
 * @param {string} cp - Código postal de 5 dígitos numéricos
 * @returns {Promise<{cp: string, colonias: string[], municipio: string, estado: string, encontrado: boolean}>}
 */
async function consultarCodigoPostal(cp) {
  const cleanCP = String(cp || '').trim();
  if (!/^\d{5}$/.test(cleanCP)) {
    throw new Error('El código postal debe contener exactamente 5 dígitos numéricos.');
  }

  if (cpCache.has(cleanCP)) {
    return cpCache.get(cleanCP);
  }

  return new Promise((resolve, reject) => {
    const url = `https://sepomex.kurenn.dev/api/v1/zip_codes?zip_code=${cleanCP}`;
    const req = https.get(
      url,
      { headers: { 'User-Agent': 'SICARA-School-System/1.0' } },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(rawData);
            const items = Array.isArray(parsed?.zip_codes) ? parsed.zip_codes : [];

            if (items.length === 0) {
              const notFoundResult = {
                cp: cleanCP,
                colonias: [],
                municipio: '',
                estado: '',
                encontrado: false,
              };
              cpCache.set(cleanCP, notFoundResult);
              return resolve(notFoundResult);
            }

            const coloniasSet = new Set();
            let municipio = '';
            let estado = '';

            for (const item of items) {
              if (item.d_asenta) {
                coloniasSet.add(item.d_asenta.trim());
              }
              if (!municipio && item.d_mnpio) {
                municipio = item.d_mnpio.trim();
              }
              if (!estado && item.d_estado) {
                estado = item.d_estado.trim();
              }
            }

            const colonias = Array.from(coloniasSet).sort((a, b) =>
              a.localeCompare(b, 'es', { sensitivity: 'base' })
            );

            const result = {
              cp: cleanCP,
              colonias,
              municipio,
              estado,
              encontrado: true,
            };

            cpCache.set(cleanCP, result);
            resolve(result);
          } catch (err) {
            reject(new Error('Error al procesar la respuesta del catálogo postal.'));
          }
        });
      }
    );

    req.setTimeout(8000, () => {
      req.destroy();
      reject(new Error('Tiempo de espera agotado al consultar el catálogo postal.'));
    });

    req.on('error', (err) => {
      reject(new Error(`Error de conexión con el catálogo postal: ${err.message}`));
    });
  });
}

/**
 * Valida si una colonia dada pertenece al código postal indicado.
 * @param {string} cp 
 * @param {string} colonia 
 * @returns {Promise<boolean>}
 */
async function validarColoniaParaCP(cp, colonia) {
  if (!cp || !colonia) return false;
  try {
    const data = await consultarCodigoPostal(cp);
    if (!data.encontrado || data.colonias.length === 0) return false;

    const norm = (str) =>
      str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

    const targetNorm = norm(colonia);
    return data.colonias.some((c) => norm(c) === targetNorm);
  } catch {
    return false;
  }
}

module.exports = {
  consultarCodigoPostal,
  validarColoniaParaCP,
};
