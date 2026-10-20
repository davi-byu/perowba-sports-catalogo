
import { listarProdutos } from "./firebase-service.js";

const EMPRESA_ID = "perowba-sports";

let products = [];

const state = {
  search: "",
  categoria: "",
  marca: "",
  ordem: "destaques"
};

function render() {
  const grid = document.getElementById("products-grid");
  const count = document.getElementById("result-count");

  let list = products.filter(product => {
    const search = state.search.toLowerCase();

    const matchesSearch = !search ||
      `${product.nome || ""} ${product.marca || ""} ${product.categoria || ""}`
        .toLowerCase()
        .includes(search);

    const matchesCategory =
      !state.categoria || product.categoria === state.categoria;

    const matchesBrand =
      !state.marca || product.marca === state.marca;

    return matchesSearch && matchesCategory && matchesBrand;
  });

  if (state.ordem === "menor") {
    list.sort((a, b) => Number(a.preco || 0) - Number(b.preco || 0));
  }

  if (state.ordem === "maior") {
    list.sort((a, b) => Number(b.preco || 0) - Number(a.preco || 0));
  }

  if (state.ordem === "nome") {
    list.sort((a, b) =>
      String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR")
    );
  }

  if (state.ordem === "destaques") {
    list.sort((a, b) => Number(Boolean(b.destaque)) - Number(Boolean(a.destaque)));
  }

  if (list.length && typeof window.productCard === "function") {
    grid.innerHTML = list.map(product => window.productCard(product)).join("");
  } else if (list.length) {
    grid.innerHTML = `
      <p class="empty" style="grid-column:1/-1">
        Não foi possível montar os cartões dos produtos.
      </p>`;
  } else {
    grid.innerHTML = `
      <p class="empty" style="grid-column:1/-1">
        Nenhum produto encontrado no Firestore.
      </p>`;
  }

  count.textContent = `${list.length} produto(s)`;
}

function preencherFiltro(elemento, valores) {
  const valorAtual = elemento.value;

  elemento.querySelectorAll("option:not(:first-child)").forEach(option => {
    option.remove();
  });

  [...new Set(valores.filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b), "pt-BR"))
    .forEach(valor => {
      const option = document.createElement("option");
      option.value = valor;
      option.textContent = valor;
      elemento.appendChild(option);
    });

  if ([...elemento.options].some(option => option.value === valorAtual)) {
    elemento.value = valorAtual;
  }
}

async function carregarCatalogo() {
  const grid = document.getElementById("products-grid");
  const count = document.getElementById("result-count");

  count.textContent = "Carregando produtos do banco de dados...";

  try {
    const dados = await listarProdutos(EMPRESA_ID);

    products = dados.filter(product => product.ativo !== false);

    preencherFiltro(
      document.getElementById("categoria"),
      products.map(product => product.categoria)
    );

    preencherFiltro(
      document.getElementById("marca"),
      products.map(product => product.marca)
    );

    render();

    if (!products.length) {
      grid.innerHTML = `
        <p class="empty" style="grid-column:1/-1">
          O Firestore não possui produtos ativos cadastrados.
        </p>`;
    }
  } catch (error) {
    console.error("Erro ao carregar produtos do Firestore:", error);

    products = [];

    count.textContent = "Erro ao carregar produtos";
    grid.innerHTML = `
      <div class="empty" style="grid-column:1/-1">
        <p>Não foi possível carregar os produtos do banco de dados.</p>
        <p>Verifique sua conexão, as regras do Firestore e o console do navegador.</p>
        <button type="button" class="btn btn-primary" id="tentar-novamente">
          Tentar novamente
        </button>
      </div>`;

    document.getElementById("tentar-novamente")
      .addEventListener("click", carregarCatalogo);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("search").addEventListener("input", event => {
    state.search = event.target.value;
    render();
  });

  document.getElementById("categoria").addEventListener("change", event => {
    state.categoria = event.target.value;
    render();
  });

  document.getElementById("marca").addEventListener("change", event => {
    state.marca = event.target.value;
    render();
  });

  document.getElementById("ordem").addEventListener("change", event => {
    state.ordem = event.target.value;
    render();
  });

  carregarCatalogo();
});
