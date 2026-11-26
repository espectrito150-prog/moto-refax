import fs from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";

const catalogPath = "catalog.json.gz";
const products = JSON.parse(gunzipSync(fs.readFileSync(catalogPath)).toString("utf8"));
const families = {
  Frenos: /freno|balata|zapata|caliper|pastilla|disco de fricci|bomba de freno/,
  "Sistema eléctrico": /electri|bater[ií]a|bobina|faro|farola|direccional|arn[eé]s|cdi|estator|stator|switch|encendido|luz led|foco|claxon|sensor|buj[ií]a/,
  "Llantas y ruedas": /llanta|c[aá]mara|rin de|rines|rueda|rayos|neum[aá]tic|cubiertas/,
  Suspensión: /suspensi[oó]n|amortiguador|monoshock|horquilla|telescopio|resorte/,
  "Motor y transmisión": /motor|embrague|clutch|transmisi[oó]n|cigue[nñ]al|cig[uü]e[nñ]al|pist[oó]n|cilindro|v[aá]lvula|carburador|cadena|sprocket|engran|eje primario|eje secundario|biela|escape|arranque|filtro de aceite/,
  "Lubricantes y filtros": /lubricante|aceite|filtro|limpiador|anticongelante/,
  "Chasis y carrocería": /chasis|carenaje|pl[aá]stic|salpicadera|guardacadena|manubrio|asiento|espejo|manija|parador|pedal|posapie|direcci[oó]n|defensa|cubrepiernas/,
  "Accesorios y equipo": /accesorio|casco|maletero|ba[uú]l|candado|portacelular|cargador usb|parabrisas|protector|redes|portaplaca/,
};

for (const product of products) {
  const text = `${product.category || ""} ${product.name || ""} ${product.detail || ""}`.toLocaleLowerCase("es-MX");
  product.category = Object.entries(families).find(([, pattern]) => pattern.test(text))?.[0] || "Refacciones generales";
}

fs.writeFileSync(catalogPath, gzipSync(Buffer.from(JSON.stringify(products)), { level: 9 }));
console.log(`Catálogo actualizado: ${products.length} productos, ${fs.statSync(catalogPath).size} bytes.`);
