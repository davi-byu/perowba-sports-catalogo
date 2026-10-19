
document.addEventListener("DOMContentLoaded", async () => {
  const id = new URLSearchParams(location.search).get("id");
  const root = document.getElementById("product-root");

  if (!root) return;

  let products = [];

  try {
    const savedProducts = localStorage.getItem("perowba_admin_products");
    products = savedProducts
      ? JSON.parse(savedProducts)
      : await loadProducts();
  } catch (error) {
    console.error("Erro ao carregar produtos:", error);
    root.innerHTML = '<div class="empty">Erro ao carregar os produtos.</div>';
    return;
  }

  const p = products.find(product => String(product.id) === String(id));

  if (!p) {
    root.innerHTML = '<div class="empty">Produto não encontrado.</div>';
    return;
  }

  const variations = Array.isArray(p.variacoes) && p.variacoes.length
    ? p.variacoes.map(v => ({
        tamanho: String(v.tamanho ?? ""),
        cor: String(v.cor ?? ""),
        preco: Number(v.preco ?? p.preco ?? 0),
        estoque: Math.max(0, Number(v.estoque ?? 0))
      }))
    : [];

  const sizes = variations.length
    ? [...new Set(variations.map(v => v.tamanho))]
    : (p.tamanhos || ["Único"]).map(String);

  const colors = variations.length
    ? [...new Set(variations.map(v => v.cor))]
    : (p.cores || ["Preto"]).map(String);

  let tamanho = variations[0]?.tamanho || sizes[0] || "";
  let cor = variations[0]?.cor || colors[0] || "";
  let qty = 1;
  let currentVariation = null;

  const fotosOriginais =
    Array.isArray(p.imagens) && p.imagens.length
      ? p.imagens.map(foto =>
          typeof foto === "string" ? foto : foto.src
        ).filter(Boolean)
      : [p.imagem].filter(Boolean);

  const fotos = [...new Set(fotosOriginais)];
  const imagemPrincipal = p.imagem || fotos[0] || "imagens/produto-1.svg";

  if (!fotos.includes(imagemPrincipal)) {
    fotos.unshift(imagemPrincipal);
  }

  root.innerHTML = `
    <div class="product-layout">
      <div class="product-gallery">
        <div class="product-large">
          <img
            id="main-product-image"
            src="${imagemPrincipal}"
            alt="${p.nome}"
          >
        </div>

        <div class="product-thumbnails" id="product-thumbnails">
          ${fotos.map((foto, index) => `
            <button
              type="button"
              class="product-thumbnail ${foto === imagemPrincipal ? "selected" : ""}"
              data-index="${index}"
              aria-label="Ver foto ${index + 1}"
              aria-pressed="${foto === imagemPrincipal}"
            >
              <img
                src="${foto}"
                alt="${p.nome} - foto ${index + 1}"
                loading="lazy"
              >
            </button>
          `).join("")}
        </div>
      </div>

      <div class="product-detail">
        <span class="product-brand">
          ${p.marca || ""} • ${p.categoria || ""}
        </span>

        <h1>${p.nome}</h1>

        <div>
          <span class="price" id="variation-price">${money(p.preco)}</span>
          <span class="old-price" id="old-price">
            ${Number(p.precoAntigo) > 0 ? money(p.precoAntigo) : ""}
          </span>
        </div>

        <p class="product-description">
          ${p.descricao || "Consulte mais informações pelo WhatsApp."}
        </p>

        <div class="option-title">Tamanho</div>
        <div class="options" id="sizes">
          ${sizes.map(v => `
            <button
              type="button"
              class="option ${v === tamanho ? "selected" : ""}"
              data-v="${v}"
            >${v}</button>
          `).join("")}
        </div>

        <div class="option-title">Cor</div>
        <div class="options" id="colors">
          ${colors.map(v => `
            <button
              type="button"
              class="option ${v === cor ? "selected" : ""}"
              data-v="${v}"
            >${v}</button>
          `).join("")}
        </div>

        <div class="quantity">
          <button type="button" id="minus" aria-label="Diminuir quantidade">−</button>
          <span id="qty">1</span>
          <button type="button" id="plus" aria-label="Aumentar quantidade">+</button>
          <span id="stock-status"></span>
        </div>

        <div id="variation-message" role="status" aria-live="polite"></div>

        <div class="hero-actions">
          <button type="button" class="btn btn-primary" id="add">
            Adicionar ao carrinho
          </button>

          <a
            class="btn"
            style="background:#25d366;color:#fff"
            id="buy"
            href="#"
          >WhatsApp</a>
        </div>
      </div>
    </div>
  `;

  // Galeria de fotos
  const mainImage = document.getElementById("main-product-image");
  const thumbnailButtons = root.querySelectorAll(".product-thumbnail");

  thumbnailButtons.forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.index);
      if (!fotos[index]) return;

      mainImage.src = fotos[index];

      thumbnailButtons.forEach(item => {
        item.classList.remove("selected");
        item.setAttribute("aria-pressed", "false");
      });

      button.classList.add("selected");
      button.setAttribute("aria-pressed", "true");
    });
  });

  const priceElement = document.getElementById("variation-price");
  const oldPriceElement = document.getElementById("old-price");
  const stockElement = document.getElementById("stock-status");
  const messageElement = document.getElementById("variation-message");
  const qtyElement = document.getElementById("qty");
  const addButton = document.getElementById("add");
  const buyButton = document.getElementById("buy");

  function findVariation() {
    if (!variations.length) return null;

    return variations.find(v =>
      v.tamanho === tamanho && v.cor === cor
    ) || null;
  }

  function updateVariation() {
    currentVariation = findVariation();

    const price = currentVariation
      ? currentVariation.preco
      : Number(p.preco || 0);

    const stock = currentVariation
      ? currentVariation.estoque
      : variations.length
        ? 0
        : Math.max(0, Number(p.estoque || 0));

    qty = stock > 0 ? Math.min(qty, stock) : 1;
    qtyElement.textContent = qty;
    priceElement.textContent = money(price);

    oldPriceElement.textContent =
      !variations.length && Number(p.precoAntigo) > price
        ? money(p.precoAntigo)
        : "";

    stockElement.innerHTML = formatStock(stock);

    const unavailable = stock <= 0;

    addButton.disabled = unavailable;
    buyButton.style.opacity = unavailable ? "0.6" : "1";

    if (variations.length && !currentVariation) {
      messageElement.textContent =
        "Esta combinação de tamanho e cor não está cadastrada.";
    } else if (unavailable) {
      messageElement.textContent = "Esta variação está esgotada.";
    } else {
      messageElement.textContent = "";
    }

    root.querySelectorAll("#sizes .option").forEach(button => {
      const available = !variations.length || variations.some(v =>
        v.tamanho === button.dataset.v && v.cor === cor && v.estoque > 0
      );

      button.disabled = variations.length > 0 && !available;
      button.classList.toggle("selected", button.dataset.v === tamanho);
    });

    root.querySelectorAll("#colors .option").forEach(button => {
      const available = !variations.length || variations.some(v =>
        v.cor === button.dataset.v && v.tamanho === tamanho && v.estoque > 0
      );

      button.disabled = variations.length > 0 && !available;
      button.classList.toggle("selected", button.dataset.v === cor);
    });
  }

  // Seleção de tamanho e cor
  root.querySelectorAll("#sizes .option").forEach(button => {
    button.addEventListener("click", () => {
      if (button.disabled) return;

      tamanho = button.dataset.v;
      qty = 1;
      updateVariation();
    });
  });

  root.querySelectorAll("#colors .option").forEach(button => {
    button.addEventListener("click", () => {
      if (button.disabled) return;

      cor = button.dataset.v;
      qty = 1;
      updateVariation();
    });
  });

  // Quantidade
  document.getElementById("minus").addEventListener("click", () => {
    qty = Math.max(1, qty - 1);
    qtyElement.textContent = qty;
  });

  document.getElementById("plus").addEventListener("click", () => {
    const stock = currentVariation
      ? currentVariation.estoque
      : variations.length
        ? 0
        : Math.max(0, Number(p.estoque || 0));

    if (stock <= 0) {
      toast("Esta variação está sem estoque.");
      return;
    }

    if (qty >= stock) {
      toast("Você atingiu o limite do estoque disponível.");
      return;
    }

    qty++;
    qtyElement.textContent = qty;
  });

  // Adicionar ao carrinho
  addButton.addEventListener("click", () => {
    const stock = currentVariation
      ? currentVariation.estoque
      : variations.length
        ? 0
        : Math.max(0, Number(p.estoque || 0));

    if (stock <= 0) {
      toast("Esta variação está sem estoque.");
      return;
    }

    if (qty > stock) {
      toast("Quantidade maior que o estoque disponível.");
      return;
    }

    const selectedProduct = {
      ...p,
      preco: currentVariation
        ? currentVariation.preco
        : Number(p.preco || 0),
      estoque: stock
    };

    addToCart(selectedProduct, qty, tamanho, cor);
  });

  // Pedido pelo WhatsApp
  buyButton.addEventListener("click", event => {
    event.preventDefault();

    const stock = currentVariation
      ? currentVariation.estoque
      : variations.length
        ? 0
        : Math.max(0, Number(p.estoque || 0));

    if (stock <= 0) {
      toast("Esta variação está sem estoque.");
      return;
    }

    if (qty > stock) {
      toast("Quantidade maior que o estoque disponível.");
      return;
    }

    const price = currentVariation
      ? currentVariation.preco
      : Number(p.preco || 0);

    const message =
      `Olá! Tenho interesse no produto:\n\n` +
      `Produto: ${p.nome}\n` +
      `Marca: ${p.marca || ""}\n` +
      `Tamanho: ${tamanho || "Não especificado"}\n` +
      `Cor: ${cor || "Não especificada"}\n` +
      `Quantidade: ${qty}\n` +
      `Preço unitário: ${money(price)}\n` +
      `Valor total: ${money(price * qty)}\n\n` +
      `Gostaria de confirmar a disponibilidade e a entrega.`;

    window.open(whatsappUrl(message), "_blank", "noopener,noreferrer");
  });

  updateVariation();
});
