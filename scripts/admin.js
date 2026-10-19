
let products = [];

const STORAGE = "perowba_admin_products";
let selectedPhotos = [];
let temporaryPhotoUrls = [];

async function loadAdmin() {
  try {
    const saved = localStorage.getItem(STORAGE);
    products = saved ? JSON.parse(saved) : await loadProducts();

    renderAdmin();

    if (!document.querySelector(".variation-row")) {
      addVariation();
    }
  } catch (error) {
    console.error(error);
    toast("Não foi possível carregar os produtos.");
  }
}

function saveAdmin() {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(products));
    renderAdmin();
    return true;
  } catch (error) {
    console.error(error);
    toast("Armazenamento cheio. Reduza o tamanho das fotos.");
    return false;
  }
}

function getStock(product) {
  if (Array.isArray(product.variacoes) && product.variacoes.length) {
    return product.variacoes.reduce(
      (total, variation) => total + Number(variation.estoque || 0),
      0
    );
  }

  return Number(product.estoque || 0);
}

function renderAdmin() {
  const table = document.getElementById("admin-table");

  table.innerHTML = products.map((p, i) => `
    <tr>
      <td>${escapeHTML(p.nome)}</td>
      <td>${escapeHTML(p.categoria)}</td>
      <td>${money(p.preco)}</td>
      <td>${getStock(p)}</td>
      <td>
        <button type="button" class="icon-btn" onclick="editProduct(${i})">
          Editar
        </button>
        <button type="button" class="icon-btn" onclick="deleteProduct(${i})">
          Excluir
        </button>
      </td>
    </tr>
  `).join("");
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function addVariation(data = {}) {
  const list = document.getElementById("variations-list");
  const row = document.createElement("div");

  row.className = "variation-row";
  row.style.cssText =
    "display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;margin:12px 0;padding:12px;border:1px solid #ddd;border-radius:8px;";

  row.innerHTML = `
    <div class="field">
      <label>Tamanho</label>
      <input class="v-tamanho" placeholder="Ex.: 40 ou Único"
        value="${escapeHTML(data.tamanho || "")}" required>
    </div>
    <div class="field">
      <label>Cor</label>
      <input class="v-cor" placeholder="Ex.: Preto"
        value="${escapeHTML(data.cor || "")}" required>
    </div>
    <div class="field">
      <label>Preço (R$)</label>
      <input class="v-preco" type="number" min="0" step="0.01"
        value="${data.preco ?? document.getElementById("p-preco").value ?? ""}"
        required>
    </div>
    <div class="field">
      <label>Estoque</label>
      <input class="v-estoque" type="number" min="0" step="1"
        value="${data.estoque ?? 0}" required>
    </div>
    <button type="button" class="btn remove-variation">
      Remover
    </button>
  `;

  row.querySelector(".remove-variation").addEventListener("click", () => {
    row.remove();
  });

  list.appendChild(row);
}

function getVariations() {
  return [...document.querySelectorAll(".variation-row")].map(row => ({
    tamanho: row.querySelector(".v-tamanho").value.trim(),
    cor: row.querySelector(".v-cor").value.trim(),
    preco: Number(row.querySelector(".v-preco").value),
    estoque: Number(row.querySelector(".v-estoque").value)
  }));
}

function renderPhotoPreview() {
  const preview = document.getElementById("photo-preview");

  temporaryPhotoUrls.forEach(url => URL.revokeObjectURL(url));
  temporaryPhotoUrls = [];

  preview.innerHTML = "";

  selectedPhotos.forEach((photo, index) => {
    const card = document.createElement("div");
    card.style.cssText =
      "display:inline-flex;flex-direction:column;gap:6px;width:120px;margin:8px;vertical-align:top;";

    const img = document.createElement("img");
    img.src = photo.src;
    img.alt = photo.name || `Foto ${index + 1}`;
    img.style.cssText =
      "width:120px;height:100px;object-fit:contain;background:#f5f5f5;border-radius:6px;";

    const label = document.createElement("label");
    label.style.cssText = "font-size:12px;";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "foto-principal";
    radio.checked = index === getMainPhotoIndex();

    radio.addEventListener("change", () => {
      selectedPhotos.forEach(photoItem => {
        photoItem.principal = false;
      });

      photo.principal = true;
      renderPhotoPreview();
    });

    label.append(radio, document.createTextNode(" Imagem principal"));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "btn";
    remove.textContent = "Remover foto";

    remove.addEventListener("click", () => {
      selectedPhotos.splice(index, 1);

      if (selectedPhotos.length && !selectedPhotos.some(p => p.principal)) {
        selectedPhotos[0].principal = true;
      }

      renderPhotoPreview();
    });

    card.append(img, label, remove);
    preview.appendChild(card);
  });
}

function getMainPhotoIndex() {
  const index = selectedPhotos.findIndex(photo => photo.principal);
  return index < 0 ? 0 : index;
}

async function readPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve({
      src: reader.result,
      name: file.name,
      principal: false
    });

    reader.onerror = () => reject(new Error("Falha ao ler uma foto."));
    reader.readAsDataURL(file);
  });
}

async function handlePhotoSelection(event) {
  const files = [...event.target.files];

  if (!files.length) return;

  const validFiles = files.filter(file => file.type.startsWith("image/"));

  if (validFiles.length !== files.length) {
    toast("Selecione somente arquivos de imagem.");
  }

  try {
    const photos = await Promise.all(validFiles.map(readPhoto));

    selectedPhotos.push(...photos);

    if (selectedPhotos.length && !selectedPhotos.some(p => p.principal)) {
      selectedPhotos[0].principal = true;
    }

    renderPhotoPreview();
  } catch (error) {
    console.error(error);
    toast("Não foi possível carregar uma das fotos.");
  }

  event.target.value = "";
}

function editProduct(index) {
  const p = products[index];

  if (!p) return;

  document.getElementById("edit-index").value = index;
  document.getElementById("p-nome").value = p.nome || "";
  document.getElementById("p-categoria").value = p.categoria || "";
  document.getElementById("p-marca").value = p.marca || "";
  document.getElementById("p-condicao").value = p.condicao || "novo";
  document.getElementById("p-descricao").value = p.descricao || "";
  document.getElementById("p-preco").value = p.preco ?? "";
  document.getElementById("p-destaque").checked = Boolean(p.destaque);

  selectedPhotos = Array.isArray(p.imagens) && p.imagens.length
    ? p.imagens.map(photo => typeof photo === "string"
        ? { src: photo, name: "", principal: photo === p.imagem }
        : { ...photo, principal: Boolean(photo.principal) })
    : p.imagem
      ? [{ src: p.imagem, name: "", principal: true }]
      : [];

  if (selectedPhotos.length && !selectedPhotos.some(photo => photo.principal)) {
    selectedPhotos[0].principal = true;
  }

  renderPhotoPreview();

  const list = document.getElementById("variations-list");
  list.innerHTML = "";

  if (Array.isArray(p.variacoes) && p.variacoes.length) {
    p.variacoes.forEach(variation => addVariation(variation));
  } else {
    const sizes = p.tamanhos || ["Único"];
    const colors = p.cores || ["Preto"];

    addVariation({
      tamanho: sizes[0] || "Único",
      cor: colors[0] || "Preto",
      preco: p.preco,
      estoque: p.estoque || 0
    });
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteProduct(index) {
  if (confirm("Deseja realmente excluir este produto?")) {
    products.splice(index, 1);
    if (saveAdmin()) toast("Produto excluído.");
  }
}

function cancelEdit() {
  document.getElementById("product-form").reset();
  document.getElementById("edit-index").value = -1;
  document.getElementById("variations-list").innerHTML = "";
  selectedPhotos = [];
  renderPhotoPreview();
  addVariation();
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("product-form");

  document.getElementById("add-variation").addEventListener("click", () => {
    addVariation();
  });

  document.getElementById("p-fotos").addEventListener(
    "change",
    handlePhotoSelection
  );

  document.getElementById("cancel-edit").addEventListener("click", cancelEdit);

  form.addEventListener("submit", event => {
    event.preventDefault();

    const index = Number(document.getElementById("edit-index").value);
    const variations = getVariations();

    if (!variations.length) {
      toast("Adicione pelo menos uma variação.");
      return;
    }

    const oldProduct = index >= 0 ? products[index] : null;
    const mainPhoto = selectedPhotos[getMainPhotoIndex()]?.src
      || oldProduct?.imagem
      || "imagens/produto-1.svg";

    const product = {
      id: oldProduct?.id ?? Date.now(),
      nome: document.getElementById("p-nome").value.trim(),
      categoria: document.getElementById("p-categoria").value.trim(),
      marca: document.getElementById("p-marca").value.trim(),
      condicao: document.getElementById("p-condicao").value,
      descricao: document.getElementById("p-descricao").value.trim(),
      preco: Number(document.getElementById("p-preco").value),
      precoAntigo: oldProduct?.precoAntigo || 0,
      variacoes: variations,
      tamanhos: [...new Set(variations.map(v => v.tamanho))],
      cores: [...new Set(variations.map(v => v.cor))],
      estoque: variations.reduce((sum, v) => sum + v.estoque, 0),
      destaque: document.getElementById("p-destaque").checked,
      imagem: mainPhoto,
      imagens: selectedPhotos,
    };

    if (index >= 0) {
      products[index] = product;
    } else {
      products.push(product);
    }

    if (saveAdmin()) {
      cancelEdit();
      toast("Produto salvo com sucesso.");
    }
  });

  document.getElementById("reset-admin").addEventListener("click", async () => {
    if (!confirm("Restaurar os produtos de demonstração? Isso substituirá os dados locais atuais.")) {
      return;
    }

    localStorage.removeItem(STORAGE);
    selectedPhotos = [];
    cancelEdit();
    await loadAdmin();
    toast("Produtos de demonstração restaurados.");
  });

  loadAdmin();
});
