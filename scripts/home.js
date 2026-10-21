import { listarProdutos } from "./firebase-service.js";

const EMPRESA_ID = "perowba-sports";

document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("featured-products");
  if (!grid) return;

  try {
    const produtos = await listarProdutos(EMPRESA_ID);
    const ativos = produtos.filter(produto => produto.ativo !== false);
    const destaques = ativos.filter(produto => produto.destaque === true).slice(0, 4);

    if (!destaques.length) {
      grid.innerHTML = `
        <p class="empty" style="grid-column:1/-1">
          Ainda não há produtos em destaque. Acesse o painel administrativo,
          edite um produto e marque a opção “Produto em destaque”.
        </p>`;
      return;
    }

    grid.innerHTML = destaques.map(produto => window.productCard(produto)).join("");
  } catch (erro) {
    console.error("Erro ao carregar produtos em destaque do Firestore:", erro);
    grid.innerHTML = `
      <div class="empty" style="grid-column:1/-1">
        <p>Não foi possível carregar os produtos em destaque.</p>
        <p>Verifique a configuração do Firebase, as regras do Firestore e o console do navegador.</p>
        <button type="button" class="btn btn-primary" id="tentar-carregar-destaques">
          Tentar novamente
        </button>
      </div>`;
    document.getElementById("tentar-carregar-destaques")
      ?.addEventListener("click", () => window.location.reload());
  }
});
