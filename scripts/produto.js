
import { buscarProduto } from "./firebase-service.js";

const EMPRESA_ID = "perowba-sports";
const IMAGEM_PADRAO = "imagens/produto-1.svg";

document.addEventListener("DOMContentLoaded", async () => {
  const root = document.getElementById("product-root");
  if (!root) return;

  const produtoId = new URLSearchParams(window.location.search).get("id");

  if (!produtoId) {
    mostrarErro("Nenhum produto foi selecionado.");
    return;
  }

  try {
    const produto = await buscarProduto(EMPRESA_ID, produtoId);

    if (!produto || produto.ativo === false) {
      mostrarErro("Produto não encontrado ou indisponível.");
      return;
    }

    renderizarProduto(produto);
  } catch (erro) {
    console.error("Erro ao buscar produto no Firebase:", erro);
    mostrarErro("Não foi possível carregar este produto. Tente novamente.");
  }

  function mostrarErro(mensagem) {
    root.innerHTML = `
      <div class="empty">
        <p>${escaparHTML(mensagem)}</p>
        <a class="btn btn-primary" href="catalogo.html">
          Voltar ao catálogo
        </a>
      </div>
    `;
  }
});

function escaparHTML(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[caractere]);
}

function obterFotos(produto) {
  const fotosFirestore = Array.isArray(produto.imagens)
    ? produto.imagens
        .map(foto => {
          if (typeof foto === "string") return foto;
          return foto?.url || foto?.src || "";
        })
        .filter(Boolean)
    : [];

  const principalFirestore = produto.imagens?.find(
    foto => typeof foto === "object" && foto?.principal === true
  );

  const principal =
    (typeof principalFirestore === "object" && principalFirestore?.url) ||
    produto.imagem ||
    produto.imagemUrl ||
    fotosFirestore[0] ||
    IMAGEM_PADRAO;

  return [...new Set([principal, ...fotosFirestore])];
}

function renderizarProduto(produto) {
  const root = document.getElementById("product-root");

  const variacoes = Array.isArray(produto.variacoes)
    ? produto.variacoes.map(variacao => ({
        tamanho: String(variacao.tamanho ?? "Único"),
        cor: String(variacao.cor ?? "Padrão"),
        preco: Number(variacao.preco ?? produto.preco ?? 0),
        estoque: Math.max(0, Number(variacao.estoque ?? 0))
      }))
    : [];

  const tamanhos = variacoes.length
    ? [...new Set(variacoes.map(v => v.tamanho))]
    : (Array.isArray(produto.tamanhos) && produto.tamanhos.length
        ? produto.tamanhos
        : ["Único"]).map(String);

  const cores = variacoes.length
    ? [...new Set(variacoes.map(v => v.cor))]
    : (Array.isArray(produto.cores) && produto.cores.length
        ? produto.cores
        : ["Padrão"]).map(String);

  const fotos = obterFotos(produto);

  let tamanho = tamanhos[0] || "Único";
  let cor = cores[0] || "Padrão";
  let quantidade = 1;
  let variacaoAtual = null;

  const precoBase = Number(produto.preco || 0);
  const estoqueBase = Math.max(0, Number(produto.estoque || 0));

  const dinheiro = valor => {
    if (typeof window.money === "function") {
      return window.money(valor);
    }

    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  };

  root.innerHTML = `
    <div class="product-layout">
      <section class="product-gallery" aria-label="Fotos do produto">
        <div class="product-large">
          <img
            id="main-product-image"
            src="${escaparHTML(fotos[0])}"
            alt="${escaparHTML(produto.nome)}"
            fetchpriority="high"
          >
        </div>

        <div class="product-thumbnails" id="product-thumbnails">
          ${fotos.map((foto, indice) => `
            <button
              type="button"
              class="product-thumbnail ${indice === 0 ? "selected" : ""}"
              data-index="${indice}"
              aria-label="Ver foto ${indice + 1}"
              aria-pressed="${indice === 0}"
            >
              <img
                src="${escaparHTML(foto)}"
                alt="${escaparHTML(produto.nome)} - foto ${indice + 1}"
                loading="lazy"
              >
            </button>
          `).join("")}
        </div>
      </section>

      <section class="product-detail">
        <span class="product-brand">
          ${escaparHTML(produto.marca || "Perowba Sports")}
          ${produto.categoria ? ` • ${escaparHTML(produto.categoria)}` : ""}
        </span>

        <h1>${escaparHTML(produto.nome)}</h1>

        <div>
          <span class="price" id="variation-price">
            ${dinheiro(precoBase)}
          </span>
          <span class="old-price" id="old-price">
            ${Number(produto.precoAntigo) > precoBase
              ? dinheiro(produto.precoAntigo)
              : ""}
          </span>
        </div>

        <p class="product-description">
          ${escaparHTML(produto.descricao || "Consulte mais informações pelo WhatsApp.")}
        </p>

        <div class="option-title">Tamanho</div>
        <div class="options" id="sizes">
          ${tamanhos.map(valor => `
            <button
              type="button"
              class="option ${valor === tamanho ? "selected" : ""}"
              data-v="${escaparHTML(valor)}"
            >${escaparHTML(valor)}</button>
          `).join("")}
        </div>

        <div class="option-title">Cor</div>
        <div class="options" id="colors">
          ${cores.map(valor => `
            <button
              type="button"
              class="option ${valor === cor ? "selected" : ""}"
              data-v="${escaparHTML(valor)}"
            >${escaparHTML(valor)}</button>
          `).join("")}
        </div>

        <div class="quantity">
          <button type="button" id="minus" aria-label="Diminuir quantidade">−</button>
          <span id="qty" aria-live="polite">1</span>
          <button type="button" id="plus" aria-label="Aumentar quantidade">+</button>
          <span id="stock-status"></span>
        </div>

        <p id="variation-message" role="status" aria-live="polite"></p>

        <div class="hero-actions">
          <button type="button" class="btn btn-primary" id="add">
            Adicionar ao carrinho
          </button>
          <a
            class="btn"
            id="buy"
            href="#"
            style="background:#25d366;color:#fff"
          >Pedir pelo WhatsApp</a>
        </div>
      </section>
    </div>
  `;

  const imagemPrincipal = document.getElementById("main-product-image");
  const miniaturas = root.querySelectorAll(".product-thumbnail");
  const precoElemento = document.getElementById("variation-price");
  const precoAntigoElemento = document.getElementById("old-price");
  const estoqueElemento = document.getElementById("stock-status");
  const mensagemElemento = document.getElementById("variation-message");
  const quantidadeElemento = document.getElementById("qty");
  const botaoAdicionar = document.getElementById("add");
  const botaoWhatsApp = document.getElementById("buy");

  function atualizarImagem(foto, botaoSelecionado) {
    imagemPrincipal.src = foto;

    miniaturas.forEach(botao => {
      const selecionado = botao === botaoSelecionado;
      botao.classList.toggle("selected", selecionado);
      botao.setAttribute("aria-pressed", String(selecionado));
    });
  }

  miniaturas.forEach(botao => {
    botao.addEventListener("click", () => {
      const foto = fotos[Number(botao.dataset.index)];
      if (foto) atualizarImagem(foto, botao);
    });
  });

  imagemPrincipal.addEventListener("error", () => {
    if (!imagemPrincipal.dataset.fallback) {
      imagemPrincipal.dataset.fallback = "true";
      imagemPrincipal.src = IMAGEM_PADRAO;
    }
  });

  function encontrarVariacao() {
    if (!variacoes.length) return null;

    return variacoes.find(v =>
      v.tamanho === tamanho && v.cor === cor
    ) || null;
  }

  function obterEstoqueAtual() {
    if (variacoes.length) {
      return variacaoAtual ? variacaoAtual.estoque : 0;
    }

    return estoqueBase;
  }

  function atualizarVariacao() {
    variacaoAtual = encontrarVariacao();

    const preco = variacaoAtual
      ? variacaoAtual.preco
      : precoBase;

    const estoque = obterEstoqueAtual();

    quantidade = estoque > 0
      ? Math.min(Math.max(1, quantidade), estoque)
      : 1;

    quantidadeElemento.textContent = quantidade;
    precoElemento.textContent = dinheiro(preco);

    precoAntigoElemento.textContent =
      !variacoes.length && Number(produto.precoAntigo) > preco
        ? dinheiro(produto.precoAntigo)
        : "";

    if (estoque <= 0) {
      estoqueElemento.textContent = "Esgotado";
      estoqueElemento.style.color = "#dc2626";
    } else if (estoque <= 3) {
      estoqueElemento.textContent = `Últimas ${estoque} unidade(s)`;
      estoqueElemento.style.color = "#d97706";
    } else {
      estoqueElemento.textContent = "Em estoque";
      estoqueElemento.style.color = "#16a34a";
    }

    const combinacaoInvalida = variacoes.length > 0 && !variacaoAtual;
    botaoAdicionar.disabled = estoque <= 0;
    botaoWhatsApp.setAttribute("aria-disabled", String(estoque <= 0));

    if (combinacaoInvalida) {
      mensagemElemento.textContent =
        "Esta combinação de tamanho e cor não está cadastrada.";
    } else if (estoque <= 0) {
      mensagemElemento.textContent = "Esta variação está esgotada.";
    } else {
      mensagemElemento.textContent = "";
    }

    root.querySelectorAll("#sizes .option").forEach(botao => {
      const disponivel = !variacoes.length || variacoes.some(v =>
        v.tamanho === botao.dataset.v &&
        v.cor === cor &&
        v.estoque > 0
      );

      botao.disabled = variacoes.length > 0 && !disponivel;
      botao.classList.toggle("selected", botao.dataset.v === tamanho);
    });

    root.querySelectorAll("#colors .option").forEach(botao => {
      const disponivel = !variacoes.length || variacoes.some(v =>
        v.cor === botao.dataset.v &&
        v.tamanho === tamanho &&
        v.estoque > 0
      );

      botao.disabled = variacoes.length > 0 && !disponivel;
      botao.classList.toggle("selected", botao.dataset.v === cor);
    });
  }

  root.querySelectorAll("#sizes .option").forEach(botao => {
    botao.addEventListener("click", () => {
      if (botao.disabled) return;
      tamanho = botao.dataset.v;
      quantidade = 1;
      atualizarVariacao();
    });
  });

  root.querySelectorAll("#colors .option").forEach(botao => {
    botao.addEventListener("click", () => {
      if (botao.disabled) return;
      cor = botao.dataset.v;
      quantidade = 1;
      atualizarVariacao();
    });
  });

  document.getElementById("minus").addEventListener("click", () => {
    quantidade = Math.max(1, quantidade - 1);
    quantidadeElemento.textContent = quantidade;
  });

  document.getElementById("plus").addEventListener("click", () => {
    const estoque = obterEstoqueAtual();

    if (estoque <= 0) {
      notificar("Esta variação está sem estoque.");
      return;
    }

    if (quantidade >= estoque) {
      notificar("Você atingiu o limite do estoque disponível.");
      return;
    }

    quantidade++;
    quantidadeElemento.textContent = quantidade;
  });

  botaoAdicionar.addEventListener("click", () => {
    const estoque = obterEstoqueAtual();

    if (estoque <= 0 || quantidade > estoque) {
      notificar("Não há estoque suficiente para essa variação.");
      return;
    }

    if (typeof window.addToCart !== "function") {
      notificar("A função do carrinho não foi carregada.");
      return;
    }

    const produtoCarrinho = {
      ...produto,
      preco: variacaoAtual ? variacaoAtual.preco : precoBase,
      estoque
    };

    window.addToCart(produtoCarrinho, quantidade, tamanho, cor);
  });

  botaoWhatsApp.addEventListener("click", evento => {
    evento.preventDefault();

    const estoque = obterEstoqueAtual();

    if (estoque <= 0 || quantidade > estoque) {
      notificar("Não há estoque suficiente para essa variação.");
      return;
    }

    const preco = variacaoAtual ? variacaoAtual.preco : precoBase;
    const mensagem =
      "Olá! Tenho interesse neste produto da Perowba Sports:\n\n" +
      `Produto: ${produto.nome}\n` +
      `Marca: ${produto.marca || ""}\n` +
      `Tamanho: ${tamanho}\n` +
      `Cor: ${cor}\n` +
      `Quantidade: ${quantidade}\n` +
      `Preço unitário: ${dinheiro(preco)}\n` +
      `Total: ${dinheiro(preco * quantidade)}\n\n` +
      "Gostaria de confirmar a disponibilidade e a entrega.";

    if (typeof window.whatsappUrl !== "function") {
      notificar("A configuração do WhatsApp não foi carregada.");
      return;
    }

    window.open(
      window.whatsappUrl(mensagem),
      "_blank",
      "noopener,noreferrer"
    );
  });

  function notificar(mensagem) {
    if (typeof window.toast === "function") {
      window.toast(mensagem);
    } else {
      mensagemElemento.textContent = mensagem;
    }
  }

  atualizarVariacao();
}
