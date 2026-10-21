import { listarProdutos } from "./firebase-service.js";

const EMPRESA_ID = "perowba-sports";

document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("featured-products");

  if (!grid) return;

  try {
    const produtos = await listarProdutos(EMPRESA_ID);

    const ativos = produtos.filter(
      produto => produto.ativo !== false
    );

    const destaques = ativos
      .filter(produto => produto.destaque === true)
      .slice(0, 4);

    if (!destaques.length) {
      grid.innerHTML = `
        <p class="empty" style="grid-column:1/-1">
          Ainda não há produtos em destaque. Acesse o painel administrativo,
          edite um produto e marque a opção “Produto em destaque”.
        </p>`;
      return;
    }

    if (typeof window.productCard !== "function") {
      throw new Error(
        "A função productCard não foi carregada corretamente."
      );
    }

    grid.innerHTML = destaques
      .map(produto => window.productCard(produto))
      .join("");

    // Abre os detalhes ao clicar no cartão ou na imagem do produto.
    grid.addEventListener("click", evento => {
      const elemento = evento.target.closest(
        'a[href*="produto.html?id="], .product-open-details'
      );

      if (!elemento) return;

      const url = new URL(elemento.href || window.location.href);
      const idURL = url.searchParams.get("id");

      const idProduto =
        idURL || elemento.dataset.productId;

      if (!idProduto) return;

      const produto = destaques.find(
        item => String(item.id) === String(idProduto)
      );

      if (!produto) return;

      evento.preventDefault();

      // Reutiliza a função de abertura, se o catálogo a disponibilizar.
      if (typeof window.abrirDetalhesProduto === "function") {
        window.abrirDetalhesProduto(produto);
        return;
      }

      // Alternativa: abre a página de detalhes do produto.
      window.location.href =
        `produto.html?id=${encodeURIComponent(produto.id)}`;
    });

  } catch (erro) {
    console.error(
      "Erro ao carregar produtos em destaque:",
      erro
    );

    grid.innerHTML = `
      <div class="empty" style="grid-column:1/-1">
        <p>Não foi possível carregar os produtos em destaque.</p>
        <p>Verifique a configuração do Firebase e o console do navegador.</p>
        <button
          type="button"
          class="btn btn-primary"
          id="tentar-carregar-destaques"
        >
          Tentar novamente
        </button>
      </div>`;

    document
      .getElementById("tentar-carregar-destaques")
      ?.addEventListener("click", () => window.location.reload());
  }
});