import { listarProdutos } from "./firebase-service.js";

const EMPRESA_ID = "perowba-sports";

let products = [];
let produtoModalAtual = null;
let variacaoModalAtual = 0;

const normalizar = valor =>
  String(valor ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");

function chaveCategoria(valor) {
  let chave = normalizar(valor).replace(/[^a-z0-9]/g, "");

  if (chave.length > 4 && chave.endsWith("s")) {
    chave = chave.slice(0, -1);
  }

  return chave;
}

const parametrosURL = new URLSearchParams(window.location.search);

const state = {
  search: "",
  categoria: parametrosURL.get("categoria") || "",
  marca: "",
  ordem: "destaques"
};

function escapar(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[caractere]);
}

function formatarPreco(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function obterFotos(produto) {
  const imagens = Array.isArray(produto.imagens)
    ? produto.imagens
        .map(imagem =>
          typeof imagem === "string"
            ? imagem
            : imagem?.url || imagem?.src || ""
        )
        .filter(Boolean)
    : [];

  const principal = Array.isArray(produto.imagens)
    ? produto.imagens.find(
        imagem =>
          imagem &&
          typeof imagem === "object" &&
          imagem.principal &&
          imagem.url
      )?.url || ""
    : "";

  return [...new Set([
    principal,
    produto.imagem,
    produto.imagemUrl,
    ...imagens
  ].filter(imagem =>
    typeof imagem === "string" && imagem.trim()
  ))];
}

function render() {
  const grid = document.getElementById("products-grid");
  const count = document.getElementById("result-count");

  if (!grid || !count) return;

  const lista = products.filter(produto => {
    const busca = normalizar(state.search);

    const textoProduto = normalizar(
      `${produto.nome || ""} ${produto.marca || ""} ${produto.categoria || ""}`
    );

    const correspondeBusca =
      !busca || textoProduto.includes(busca);

    const correspondeCategoria =
      !state.categoria ||
      chaveCategoria(produto.categoria) ===
        chaveCategoria(state.categoria);

    const correspondeMarca =
      !state.marca ||
      normalizar(produto.marca) === normalizar(state.marca);

    return (
      correspondeBusca &&
      correspondeCategoria &&
      correspondeMarca
    );
  });

  if (state.ordem === "menor") {
    lista.sort(
      (a, b) => Number(a.preco || 0) - Number(b.preco || 0)
    );
  }

  if (state.ordem === "maior") {
    lista.sort(
      (a, b) => Number(b.preco || 0) - Number(a.preco || 0)
    );
  }

  if (state.ordem === "nome") {
    lista.sort((a, b) =>
      String(a.nome || "").localeCompare(
        String(b.nome || ""),
        "pt-BR"
      )
    );
  }

  if (state.ordem === "destaques") {
    lista.sort(
      (a, b) =>
        Number(Boolean(b.destaque)) -
        Number(Boolean(a.destaque))
    );
  }

  if (typeof window.pararCarrosseis === "function") {
    window.pararCarrosseis(grid);
  }

  if (lista.length && typeof window.productCard === "function") {
    grid.innerHTML = lista
      .map(produto => window.productCard(produto))
      .join("");
  } else if (lista.length) {
    grid.innerHTML = `
      <p class="empty" style="grid-column:1/-1">
        Não foi possível montar os cartões dos produtos.
      </p>`;
  } else {
    grid.innerHTML = `
      <p class="empty" style="grid-column:1/-1">
        Nenhum produto encontrado nesta categoria.
      </p>`;
  }

  count.textContent = `${lista.length} produto(s)`;

  if (typeof window.iniciarCarrosseis === "function") {
    window.iniciarCarrosseis(grid);
  }
}

function preencherFiltro(elemento, valores) {
  if (!elemento) return;

  const valorAtual = elemento.value;

  elemento
    .querySelectorAll("option:not(:first-child)")
    .forEach(opcao => opcao.remove());

  const valoresUnicos = [
    ...new Map(
      valores
        .filter(valor => String(valor || "").trim())
        .map(valor => [
          normalizar(valor),
          String(valor).trim()
        ])
    ).values()
  ];

  valoresUnicos
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .forEach(valor => {
      const opcao = document.createElement("option");
      opcao.value = valor;
      opcao.textContent = valor;
      elemento.appendChild(opcao);
    });

  const opcaoAtual = [...elemento.options].find(
    opcao => normalizar(opcao.value) === normalizar(valorAtual)
  );

  if (opcaoAtual) {
    elemento.value = opcaoAtual.value;
  }
}

function aplicarCategoriaDaURL() {
  const campo = document.getElementById("categoria");

  if (!campo || !state.categoria) return;

  const categoriaSolicitada = state.categoria;

  const opcao = [...campo.options].find(
    item =>
      chaveCategoria(item.value) ===
      chaveCategoria(categoriaSolicitada)
  );

  if (opcao) {
    state.categoria = opcao.value;
    campo.value = opcao.value;
    return;
  }

  console.warn(
    "Categoria da URL não encontrada nas categorias cadastradas:",
    categoriaSolicitada
  );

  // Mantém a categoria solicitada em vez de apagar o filtro.
  // Se não houver correspondência, o catálogo não deve exibir
  // todos os produtos silenciosamente.
  campo.value = "";
}

function prepararModal() {
  if (document.getElementById("product-modal")) return;

  const modal = document.createElement("div");
  modal.id = "product-modal";
  modal.className = "product-modal";
  modal.hidden = true;

  modal.innerHTML = `
    <div class="product-modal-backdrop" data-close-modal></div>

    <section
      class="product-modal-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-product-name"
    >
      <button
        type="button"
        class="product-modal-close"
        aria-label="Fechar detalhes"
        data-close-modal
      >×</button>

      <div id="modal-product-content"></div>
    </section>
  `;

  document.body.appendChild(modal);

  modal.addEventListener("click", evento => {
    if (evento.target.closest("[data-close-modal]")) {
      fecharModal();
      return;
    }

    const miniatura = evento.target.closest("[data-modal-photo]");

    if (miniatura) {
      const imagemPrincipal =
        modal.querySelector("#modal-main-image");

      if (imagemPrincipal) {
        imagemPrincipal.src = miniatura.dataset.modalPhoto;
      }

      modal.querySelectorAll(".product-thumbnail").forEach(botao => {
        botao.classList.toggle("selected", botao === miniatura);
      });

      return;
    }

    const botaoVariacao =
      evento.target.closest("[data-variation-index]");

    if (botaoVariacao) {
      selecionarVariacao(
        Number(botaoVariacao.dataset.variationIndex)
      );
      return;
    }

    if (evento.target.closest("#modal-qty-minus")) {
      const quantidade = modal.querySelector("#modal-qty");

      quantidade.textContent = Math.max(
        1,
        Number(quantidade.textContent) - 1
      );

      return;
    }

    if (evento.target.closest("#modal-qty-plus")) {
      const quantidade = modal.querySelector("#modal-qty");
      const estoque = estoqueDaVariacao();

      if (estoque > 0) {
        quantidade.textContent = Math.min(
          estoque,
          Number(quantidade.textContent) + 1
        );
      }

      return;
    }

    if (evento.target.closest("#modal-add-cart")) {
      adicionarProdutoModal();
    }
  });

  document.addEventListener("keydown", evento => {
    if (evento.key === "Escape") fecharModal();
  });
}

function abrirModal(produto) {
  prepararModal();

  produtoModalAtual = produto;
  variacaoModalAtual = 0;

  const modal = document.getElementById("product-modal");
  const conteudo = modal.querySelector("#modal-product-content");
  const fotos = obterFotos(produto);

  const variacoes = Array.isArray(produto.variacoes)
    ? produto.variacoes
    : [];

  const estoqueTotal = variacoes.length
    ? variacoes.reduce(
        (total, variacao) =>
          total + Number(variacao.estoque || 0),
        0
      )
    : Number(produto.estoque || 0);

  const primeiraFoto = fotos[0] || "";

  conteudo.innerHTML = `
    <div class="product-modal-layout">
      <div class="product-gallery">
        <div class="product-large">
          ${
            primeiraFoto
              ? `
                <img
                  id="modal-main-image"
                  src="${escapar(primeiraFoto)}"
                  alt="${escapar(produto.nome)}"
                >
              `
              : `
                <div class="empty">
                  Imagem não disponível
                </div>
              `
          }
        </div>

        <div class="product-thumbnails">
          ${fotos.map((foto, indice) => `
            <button
              type="button"
              class="product-thumbnail ${
                indice === 0 ? "selected" : ""
              }"
              data-modal-photo="${escapar(foto)}"
              aria-label="Ver imagem ${indice + 1}"
            >
              <img
                src="${escapar(foto)}"
                alt=""
                loading="lazy"
              >
            </button>
          `).join("")}
        </div>
      </div>

      <div class="product-modal-details">
        <span class="product-brand">
          ${escapar(produto.marca || "Perowba Sports")}
          ${
            produto.categoria
              ? " · " + escapar(produto.categoria)
              : ""
          }
        </span>

        <h2 id="modal-product-name">
          ${escapar(produto.nome || "Produto")}
        </h2>

        <p class="product-modal-price" id="modal-price">
          ${formatarPreco(produto.preco)}
        </p>

        <p class="product-description">
          ${escapar(
            produto.descricao ||
            "Consulte nossa equipe para mais informações sobre este produto."
          )}
        </p>

        ${
          variacoes.length
            ? `
              <h3 class="option-title">Escolha tamanho e cor</h3>

              <div class="modal-variations">
                ${variacoes.map((variacao, indice) => `
                  <button
                    type="button"
                    class="option ${
                      indice === 0 ? "selected" : ""
                    }"
                    data-variation-index="${indice}"
                    ${
                      Number(variacao.estoque || 0) <= 0
                        ? "disabled"
                        : ""
                    }
                  >
                    ${escapar(variacao.tamanho || "Único")}
                    · ${escapar(variacao.cor || "Padrão")}
                    — ${formatarPreco(
                      variacao.preco ?? produto.preco
                    )}
                    (${Number(variacao.estoque || 0)} un.)
                  </button>
                `).join("")}
              </div>
            `
            : ""
        }

        <div class="quantity">
          <button
            type="button"
            id="modal-qty-minus"
            aria-label="Diminuir quantidade"
          >−</button>

          <span id="modal-qty">1</span>

          <button
            type="button"
            id="modal-qty-plus"
            aria-label="Aumentar quantidade"
          >+</button>
        </div>

        <p id="modal-stock" class="stock">
          ${
            estoqueTotal > 0
              ? `${estoqueTotal} unidade(s) em estoque`
              : "Produto indisponível"
          }
        </p>

        <button
          type="button"
          class="btn btn-primary full"
          id="modal-add-cart"
          ${estoqueTotal <= 0 ? "disabled" : ""}
        >
          Adicionar ao carrinho
        </button>
      </div>
    </div>
  `;

  modal.hidden = false;
  document.body.classList.add("modal-open");

  modal.querySelector(".product-modal-close")?.focus();

  if (variacoes.length) {
    selecionarVariacao(0);
  }
}

function fecharModal() {
  const modal = document.getElementById("product-modal");

  if (modal) {
    modal.hidden = true;
    document.body.classList.remove("modal-open");
  }
}

function estoqueDaVariacao() {
  if (!produtoModalAtual) return 0;

  const variacoes = produtoModalAtual.variacoes;

  if (Array.isArray(variacoes) && variacoes.length) {
    return Number(
      variacoes[variacaoModalAtual]?.estoque || 0
    );
  }

  return Number(produtoModalAtual.estoque || 0);
}

function selecionarVariacao(indice) {
  if (!produtoModalAtual) return;

  const variacoes = Array.isArray(produtoModalAtual.variacoes)
    ? produtoModalAtual.variacoes
    : [];

  if (!variacoes[indice]) return;

  variacaoModalAtual = indice;

  const variacao = variacoes[indice];
  const modal = document.getElementById("product-modal");

  modal.querySelectorAll("[data-variation-index]").forEach(botao => {
    botao.classList.toggle(
      "selected",
      Number(botao.dataset.variationIndex) === indice
    );
  });

  modal.querySelector("#modal-price").textContent =
    formatarPreco(variacao.preco ?? produtoModalAtual.preco);

  const estoque = Number(variacao.estoque || 0);

  modal.querySelector("#modal-stock").textContent =
    estoque > 0
      ? `${estoque} unidade(s) nesta variação`
      : "Variação esgotada";

  modal.querySelector("#modal-add-cart").disabled = estoque <= 0;
  modal.querySelector("#modal-qty").textContent = "1";
}

function adicionarProdutoModal() {
  if (!produtoModalAtual) return;

  if (typeof window.addToCart !== "function") {
    console.error("A função addToCart não está disponível.");
    alert("Não foi possível acessar o carrinho. Tente novamente.");
    return;
  }

  const modal = document.getElementById("product-modal");

  const quantidade = Number(
    modal.querySelector("#modal-qty").textContent || 1
  );

  const variacoes = Array.isArray(produtoModalAtual.variacoes)
    ? produtoModalAtual.variacoes
    : [];

  const variacao = variacoes[variacaoModalAtual];
  const estoque = estoqueDaVariacao();

  if (estoque <= 0 || quantidade > estoque) {
    alert("A quantidade selecionada não está disponível em estoque.");
    return;
  }

  const produtoParaCarrinho = {
    ...produtoModalAtual,
    preco: Number(variacao?.preco ?? produtoModalAtual.preco),
    estoque
  };

  window.addToCart(
    produtoParaCarrinho,
    quantidade,
    String(variacao?.tamanho || ""),
    String(variacao?.cor || "")
  );

  fecharModal();
}

async function carregarCatalogo() {
  const grid = document.getElementById("products-grid");
  const count = document.getElementById("result-count");

  if (!grid || !count) return;

  count.textContent = "Carregando produtos do banco de dados...";

  try {
    const dados = await listarProdutos(EMPRESA_ID);

    products = (Array.isArray(dados) ? dados : [])
      .filter(produto => produto.ativo !== false);

    preencherFiltro(
      document.getElementById("categoria"),
      products.map(produto => produto.categoria)
    );

    preencherFiltro(
      document.getElementById("marca"),
      products.map(produto => produto.marca)
    );

    aplicarCategoriaDaURL();
    render();

    if (!products.length) {
      grid.innerHTML = `
        <p class="empty" style="grid-column:1/-1">
          O Firestore não possui produtos ativos cadastrados.
        </p>`;
    }
  } catch (erro) {
    console.error("Erro ao carregar produtos do Firestore:", erro);

    products = [];
    count.textContent = "Erro ao carregar produtos";

    grid.innerHTML = `
      <div class="empty" style="grid-column:1/-1">
        <p>Não foi possível carregar os produtos.</p>
        <p>
          Verifique a conexão, as regras do Firestore
          e o console do navegador.
        </p>

        <button
          type="button"
          class="btn btn-primary"
          id="tentar-novamente"
        >
          Tentar novamente
        </button>
      </div>`;

    document
      .getElementById("tentar-novamente")
      ?.addEventListener("click", carregarCatalogo);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("search")?.addEventListener(
    "input",
    evento => {
      state.search = evento.target.value;
      render();
    }
  );

  document.getElementById("categoria")?.addEventListener(
    "change",
    evento => {
      state.categoria = evento.target.value;
      render();
    }
  );

  document.getElementById("marca")?.addEventListener(
    "change",
    evento => {
      state.marca = evento.target.value;
      render();
    }
  );

  document.getElementById("ordem")?.addEventListener(
    "change",
    evento => {
      state.ordem = evento.target.value;
      render();
    }
  );

  const grid = document.getElementById("products-grid");

  grid?.addEventListener("click", evento => {
    const linkProduto = evento.target.closest(
      'a[href*="produto.html?id="]'
    );

    if (linkProduto) {
      evento.preventDefault();

      const url = new URL(
        linkProduto.href,
        window.location.href
      );

      const id = url.searchParams.get("id");

      const produto = products.find(
        item => String(item.id) === String(id)
      );

      if (produto) {
        abrirModal(produto);
      } else {
        console.error("Produto não encontrado:", id);
      }

      return;
    }

    const botaoDetalhes = evento.target.closest(
      ".product-open-details"
    );

    if (botaoDetalhes) {
      const produto = products.find(
        item =>
          String(item.id) ===
          String(botaoDetalhes.dataset.productId)
      );

      if (produto) abrirModal(produto);
      return;
    }

    const botaoCarrinho = evento.target.closest(
      ".product-add-cart"
    );

    if (botaoCarrinho) {
      try {
        const produto = JSON.parse(
          decodeURIComponent(botaoCarrinho.dataset.product)
        );

        if (typeof window.addToCart === "function") {
          window.addToCart(produto);
        } else {
          alert("O carrinho não está disponível no momento.");
        }
      } catch (erro) {
        console.error(
          "Erro ao adicionar produto ao carrinho:",
          erro
        );
      }
    }
  });

  prepararModal();
  carregarCatalogo();
});