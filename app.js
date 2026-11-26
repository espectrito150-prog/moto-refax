const PAGE_SIZE = 36;
const ASSETS = {
  "Motor y transmisión": "/assets/motor.jpg", Frenos: "/assets/mecanica.png",
  "Sistema eléctrico": "/assets/electricidad.png", "Llantas y ruedas": "/assets/llantas.png",
  Suspensión: "/assets/suspension.jpg", "Lubricantes y filtros": "/assets/lubricantes.png",
  "Chasis y carrocería": "/assets/mecanica.png", "Accesorios y equipo": "/assets/accesorios.png",
  "Refacciones generales": "/assets/mecanica.png",
};
const DEFAULT_IMAGE = "/assets/mecanica.png";
const state = { products: [], filtered: [], page: 1, category: "", query: "", timer: 0 };
const el = Object.fromEntries(["search-input", "category-select", "category-chips", "result-count", "product-grid", "empty-state", "pagination", "prev-page", "next-page", "page-count", "product-dialog", "detail-image", "detail-fallback", "detail-brand", "detail-name", "detail-copy", "detail-category", "detail-sku-row", "detail-sku", "detail-quote", "toast", "primary-nav", "menu-toggle"].map(id => [id, document.getElementById(id)]));

function cleanText(value) {
  return String(value ?? "").replace(/[\u0000-\u001f]/g, " ").replace(/\s{2,}/g, " ").trim();
}

async function loadCatalog() {
  try {
    const response = await fetch("/catalog.json.gz?v=__CATALOG_HASH__");
    if (!response.ok) throw new Error("No se pudo abrir el catálogo");
    if (!window.DecompressionStream) throw new Error("Este navegador no puede abrir el catálogo comprimido.");
    const compressed = await response.arrayBuffer();
    const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("gzip"));
    state.products = await new Response(stream).json();
    state.filtered = state.products;
    populateCategories();
    render();
  } catch (error) {
    el["result-count"].textContent = "El catálogo no está disponible en este momento.";
    el["product-grid"].innerHTML = `<p class="load-error">${cleanText(error.message)} Recarga la página o escríbenos por WhatsApp.</p>`;
  }
}

function populateCategories() {
  const counts = new Map();
  for (const product of state.products) {
    const category = cleanText(product.category) || "Refacciones";
    counts.set(category, (counts.get(category) || 0) + 1);
  }
  const ordered = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es-MX"));
  for (const [name, count] of ordered) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = `${name} · ${count.toLocaleString("es-MX")}`;
    el["category-select"].append(option);
  }
  const chips = document.createDocumentFragment();
  const allChip = makeChip("Todas", "");
  chips.append(allChip);
  ordered.slice(0, 7).forEach(([name]) => chips.append(makeChip(name, name)));
  el["category-chips"].replaceChildren(chips);
}

function makeChip(label, value) {
  const button = document.createElement("button");
  button.className = `chip${state.category === value ? " is-active" : ""}`;
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", () => {
    state.category = value;
    state.page = 1;
    el["category-select"].value = value;
    updateChipState();
    filterProducts();
  });
  return button;
}

function updateChipState() {
  for (const chip of el["category-chips"].querySelectorAll(".chip")) {
    chip.classList.toggle("is-active", (chip.textContent === "Todas" && !state.category) || chip.textContent === state.category);
  }
}

function filterProducts() {
  const query = state.query.toLocaleLowerCase("es-MX");
  state.filtered = state.products.filter(product => {
    const matchesCategory = !state.category || product.category === state.category;
    if (!matchesCategory) return false;
    if (!query) return true;
    const searchable = [product.name, product.brand, product.category, product.sku, product.detail].map(cleanText).join(" ").toLocaleLowerCase("es-MX");
    return searchable.includes(query);
  });
  const maxPage = Math.max(1, Math.ceil(state.filtered.length / PAGE_SIZE));
  state.page = Math.min(state.page, maxPage);
  render();
}

function makeImage(src, alt, fallback, className) {
  const image = document.createElement("img");
  image.className = className;
  image.loading = "lazy";
  image.alt = alt;
  image.src = src || fallback || DEFAULT_IMAGE;
  image.addEventListener("error", () => {
    if (image.dataset.fallbackUsed) return;
    image.dataset.fallbackUsed = "true";
    image.src = fallback || DEFAULT_IMAGE;
  });
  return image;
}

function productCard(product) {
  const button = document.createElement("button");
  button.className = "product-card";
  button.type = "button";
  button.setAttribute("aria-label", `Ver detalle de ${cleanText(product.name)}`);
  const imageBox = document.createElement("span");
  imageBox.className = "product-image";
  const fallback = ASSETS[product.category] || DEFAULT_IMAGE;
  imageBox.append(makeImage(product.image, cleanText(product.name), fallback, ""));
  if (product.imageFallback) {
    const imageLabel = document.createElement("span");
    imageLabel.className = "product-image-label";
    imageLabel.textContent = "Imagen ilustrativa";
    imageBox.append(imageLabel);
  }
  const copy = document.createElement("span");
  copy.className = "product-copy";
  const brand = document.createElement("small");
  brand.className = "product-brand";
  brand.textContent = cleanText(product.brand) || "MOTO REFAX";
  const name = document.createElement("strong");
  name.textContent = cleanText(product.name) || "Refacción para motocicleta";
  const category = document.createElement("span");
  category.className = "product-category";
  category.textContent = cleanText(product.category) || "Refacciones";
  const open = document.createElement("span");
  open.className = "product-open";
  open.innerHTML = "Ver detalle <b aria-hidden=\"true\">↗</b>";
  copy.append(brand, name, category, open);
  button.append(imageBox, copy);
  button.addEventListener("click", () => openDetail(product, fallback));
  return button;
}

function render() {
  const start = (state.page - 1) * PAGE_SIZE;
  const pageItems = state.filtered.slice(start, start + PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(state.filtered.length / PAGE_SIZE));
  el["result-count"].textContent = `${state.filtered.length.toLocaleString("es-MX")} productos`;
  el["product-grid"].replaceChildren(...pageItems.map(productCard));
  el["empty-state"].hidden = state.filtered.length > 0;
  el.pagination.hidden = state.filtered.length <= PAGE_SIZE;
  el["page-count"].textContent = `Página ${state.page} de ${pages}`;
  el["prev-page"].disabled = state.page <= 1;
  el["next-page"].disabled = state.page >= pages;
}

function openDetail(product, fallback) {
  const name = cleanText(product.name) || "Refacción para motocicleta";
  const image = product.image || fallback;
  el["detail-image"].src = image;
  el["detail-image"].alt = name;
  el["detail-image"].dataset.fallbackUsed = "";
  el["detail-image"].onerror = () => { el["detail-image"].src = fallback || DEFAULT_IMAGE; };
  el["detail-fallback"].hidden = !product.imageFallback;
  el["detail-brand"].textContent = cleanText(product.brand) || "MOTO REFAX";
  el["detail-name"].textContent = name;
  el["detail-copy"].textContent = cleanText(product.detail) || "Confirma la aplicación con la marca, modelo y año de tu motocicleta.";
  el["detail-category"].textContent = cleanText(product.category) || "Refacciones";
  el["detail-sku"].textContent = cleanText(product.sku);
  el["detail-sku-row"].hidden = !cleanText(product.sku);
  const message = `Hola, quiero cotizar esta refacción en MOTO REFAX:\n${name}\nMarca: ${cleanText(product.brand) || "Por confirmar"}\nCódigo: ${cleanText(product.sku) || "No disponible"}\n¿Me confirman precio, disponibilidad y compatibilidad?`;
  el["detail-quote"].href = `https://wa.me/525511780113?text=${encodeURIComponent(message)}`;
  el["product-dialog"].showModal();
}

function toast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("is-visible");
  window.clearTimeout(state.timer);
  state.timer = window.setTimeout(() => el.toast.classList.remove("is-visible"), 1900);
}

el["search-input"].addEventListener("input", event => {
  state.query = event.target.value.trim();
  state.page = 1;
  filterProducts();
});
el["category-select"].addEventListener("change", event => {
  state.category = event.target.value;
  state.page = 1;
  updateChipState();
  filterProducts();
});
el["prev-page"].addEventListener("click", () => { state.page -= 1; render(); document.getElementById("catalogo").scrollIntoView({ behavior: "smooth" }); });
el["next-page"].addEventListener("click", () => { state.page += 1; render(); document.getElementById("catalogo").scrollIntoView({ behavior: "smooth" }); });
document.querySelector(".dialog-close").addEventListener("click", () => el["product-dialog"].close());
el["product-dialog"].addEventListener("click", event => { if (event.target === el["product-dialog"]) el["product-dialog"].close(); });
el["menu-toggle"].addEventListener("click", () => {
  const expanded = el["menu-toggle"].getAttribute("aria-expanded") === "true";
  el["menu-toggle"].setAttribute("aria-expanded", String(!expanded));
  el["primary-nav"].classList.toggle("is-open", !expanded);
});
for (const link of el["primary-nav"].querySelectorAll("a")) link.addEventListener("click", () => {
  el["menu-toggle"].setAttribute("aria-expanded", "false");
  el["primary-nav"].classList.remove("is-open");
});
document.addEventListener("keydown", event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); el["search-input"].focus(); }
});
loadCatalog();
