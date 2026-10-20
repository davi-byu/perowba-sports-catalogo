
import {
  listarProdutos,
  salvarProduto,
  excluirProduto,
  enviarImagemProduto,
  excluirImagemProduto,
  entrarAdmin,
  sairAdmin,
  observarAutenticacao
} from "./firebase-service.js";

const EMPRESA_ID = "perowba-sports";
const ADMIN_UID = "bSJntb0JQhSTFluXm46sI9SMrhT2";
const TAMANHO_MAXIMO_IMAGEM = 5 * 1024 * 1024;

let produtos = [];
let fotosSelecionadas = [];
let produtoEmEdicao = null;
let salvando = false;
let usuarioAutenticado = null;
let observadorIniciado = false;

const $ = id => document.getElementById(id);

function mostrarMensagem(mensagem) {
  const elemento = $("toast");

  if (!elemento) {
    alert(mensagem);
    return;
  }

  elemento.textContent = mensagem;
  elemento.classList.add("show");

  clearTimeout(mostrarMensagem.timer);

  mostrarMensagem.timer = setTimeout(() => {
    elemento.classList.remove("show");
  }, 3500);
}

function escaparHTML(valor) {
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

function obterEstoque(produto) {
  if (Array.isArray(produto.variacoes)) {
    return produto.variacoes.reduce(
      (total, variacao) => total + Number(variacao.estoque || 0),
      0
    );
  }

  return Number(produto.estoque || 0);
}

function mostrarLogin() {
  document.body.classList.add("login-page");

  $("login-admin").hidden = false;
  $("conteudo-admin").hidden = true;
  $("painel-admin").hidden = true;
}

function mostrarPainel() {
  document.body.classList.remove("login-page");

  $("login-admin").hidden = true;
  $("conteudo-admin").hidden = false;
  $("painel-admin").hidden = false;
}

function mostrarErroLogin(mensagem) {
  $("login-erro").textContent = mensagem;
}

async function carregarProdutos() {
  const tabela = $("admin-table");

  tabela.innerHTML = `
    <tr>
      <td colspan="5">Carregando produtos...</td>
    </tr>
  `;

  try {
    produtos = await listarProdutos(EMPRESA_ID);
    renderizarProdutos();
  } catch (erro) {
    console.error("Erro ao carregar produtos:", erro);

    tabela.innerHTML = `
      <tr>
        <td colspan="5">
          Não foi possível carregar os produtos.
        </td>
      </tr>
    `;

    mostrarMensagem("Erro ao carregar os produtos do Firebase.");
  }
}

function renderizarProdutos() {
  const tabela = $("admin-table");

  if (!produtos.length) {
    tabela.innerHTML = `
      <tr>
        <td colspan="5">Nenhum produto cadastrado.</td>
      </tr>
    `;
    return;
  }

  tabela.innerHTML = produtos.map(produto => `
    <tr>
      <td>${escaparHTML(produto.nome)}</td>
      <td>${escaparHTML(produto.categoria)}</td>
      <td>${formatarPreco(produto.preco)}</td>
      <td>${obterEstoque(produto)}</td>
      <td>
        <button
          type="button"
          class="btn"
          data-action="edit"
          data-id="${escaparHTML(produto.id)}">
          Editar
        </button>

        <button
          type="button"
          class="btn"
          data-action="delete"
          data-id="${escaparHTML(produto.id)}">
          Excluir
        </button>
      </td>
    </tr>
  `).join("");
}

function adicionarVariacao(dados = {}) {
  const lista = $("variations-list");
  const linha = document.createElement("div");

  linha.className = "variation-row";
  linha.style.cssText = [
    "display:grid",
    "grid-template-columns:repeat(auto-fit,minmax(110px,1fr))",
    "gap:10px",
    "margin:12px 0",
    "padding:12px",
    "border:1px solid #ddd",
    "border-radius:8px"
  ].join(";");

  linha.innerHTML = `
    <div class="field">
      <label>Tamanho</label>
      <input
        class="v-tamanho"
        value="${escaparHTML(dados.tamanho || "")}"
        placeholder="Ex.: 40"
        required>
    </div>

    <div class="field">
      <label>Cor</label>
      <input
        class="v-cor"
        value="${escaparHTML(dados.cor || "")}"
        placeholder="Ex.: Preto"
        required>
    </div>

    <div class="field">
      <label>Preço (R$)</label>
      <input
        class="v-preco"
        type="number"
        min="0"
        step="0.01"
        value="${dados.preco ?? $("p-preco").value ?? ""}"
        required>
    </div>

    <div class="field">
      <label>Estoque</label>
      <input
        class="v-estoque"
        type="number"
        min="0"
        step="1"
        value="${Number(dados.estoque ?? 0)}"
        required>
    </div>

    <button type="button" class="btn remove-variation">
      Remover
    </button>
  `;

  linha.querySelector(".remove-variation").addEventListener("click", () => {
    linha.remove();
  });

  lista.appendChild(linha);
}

function lerVariacoes() {
  return [...document.querySelectorAll(".variation-row")].map(linha => ({
    tamanho: linha.querySelector(".v-tamanho").value.trim(),
    cor: linha.querySelector(".v-cor").value.trim(),
    preco: Number(linha.querySelector(".v-preco").value),
    estoque: Number(linha.querySelector(".v-estoque").value)
  }));
}

function liberarFotosTemporarias() {
  fotosSelecionadas.forEach(foto => {
    if (foto.file && foto.src?.startsWith("blob:")) {
      URL.revokeObjectURL(foto.src);
    }
  });
}

function renderizarFotos() {
  const area = $("photo-preview");
  area.replaceChildren();

  fotosSelecionadas.forEach((foto, indice) => {
    const cartao = document.createElement("div");

    cartao.style.cssText =
      "display:inline-flex;flex-direction:column;gap:6px;width:120px;margin:8px;vertical-align:top;";

    const imagem = document.createElement("img");
    imagem.src = foto.src;
    imagem.alt = foto.name || `Foto ${indice + 1}`;
    imagem.style.cssText =
      "width:120px;height:100px;object-fit:contain;background:#f5f5f5;border-radius:6px;";

    const label = document.createElement("label");
    label.style.cssText = "font-size:12px;";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "foto-principal";
    radio.checked = Boolean(foto.principal);

    radio.addEventListener("change", () => {
      fotosSelecionadas.forEach(item => {
        item.principal = false;
      });

      foto.principal = true;
      renderizarFotos();
    });

    label.append(radio, document.createTextNode(" Imagem principal"));

    const remover = document.createElement("button");
    remover.type = "button";
    remover.className = "btn";
    remover.textContent = "Remover foto";

    remover.addEventListener("click", () => {
      if (foto.file && foto.src?.startsWith("blob:")) {
        URL.revokeObjectURL(foto.src);
      }

      fotosSelecionadas.splice(indice, 1);

      if (
        fotosSelecionadas.length &&
        !fotosSelecionadas.some(item => item.principal)
      ) {
        fotosSelecionadas[0].principal = true;
      }

      renderizarFotos();
    });

    cartao.append(imagem, label, remover);
    area.appendChild(cartao);
  });
}

function selecionarFotos(evento) {
  const arquivos = [...evento.target.files];
  const validos = arquivos.filter(arquivo =>
    arquivo.type.startsWith("image/") &&
    arquivo.size > 0 &&
    arquivo.size <= TAMANHO_MAXIMO_IMAGEM
  );

  if (validos.length !== arquivos.length) {
    mostrarMensagem("Cada imagem deve ser válida e ter até 5 MB.");
  }

  validos.forEach(arquivo => {
    fotosSelecionadas.push({
      src: URL.createObjectURL(arquivo),
      name: arquivo.name,
      file: arquivo,
      url: null,
      caminho: null,
      principal: fotosSelecionadas.length === 0
    });
  });

  renderizarFotos();
  evento.target.value = "";
}

function obterFotosSalvas(produto) {
  const imagens = Array.isArray(produto.imagens)
    ? produto.imagens
    : [];

  if (imagens.length) {
    return imagens.map((imagem, indice) => {
      if (typeof imagem === "string") {
        return {
          src: imagem,
          url: imagem,
          caminho: null,
          name: "",
          principal: indice === 0,
          file: null
        };
      }

      return {
        src: imagem.url || imagem.src || "",
        url: imagem.url || imagem.src || "",
        caminho: imagem.caminho || null,
        name: imagem.name || "",
        principal: Boolean(imagem.principal),
        file: null
      };
    });
  }

  if (produto.imagem) {
    return [{
      src: produto.imagem,
      url: produto.imagem,
      caminho: produto.imagemCaminho || null,
      name: "",
      principal: true,
      file: null
    }];
  }

  return [];
}

function editarProduto(id) {
  const produto = produtos.find(item => item.id === id);

  if (!produto) {
    mostrarMensagem("Produto não encontrado.");
    return;
  }

  produtoEmEdicao = produto.id;

  $("edit-index").value = produto.id;
  $("p-nome").value = produto.nome || "";
  $("p-categoria").value = produto.categoria || "";
  $("p-marca").value = produto.marca || "";
  $("p-condicao").value = produto.condicao || "novo";
  $("p-descricao").value = produto.descricao || "";
  $("p-preco").value = produto.preco ?? "";
  $("p-destaque").checked = Boolean(produto.destaque);

  liberarFotosTemporarias();
  fotosSelecionadas = obterFotosSalvas(produto);

  if (
    fotosSelecionadas.length &&
    !fotosSelecionadas.some(foto => foto.principal)
  ) {
    fotosSelecionadas[0].principal = true;
  }

  renderizarFotos();

  $("variations-list").replaceChildren();

  if (Array.isArray(produto.variacoes) && produto.variacoes.length) {
    produto.variacoes.forEach(adicionarVariacao);
  } else {
    adicionarVariacao({
      tamanho: produto.tamanhos?.[0] || "Único",
      cor: produto.cores?.[0] || "Preto",
      preco: produto.preco,
      estoque: produto.estoque || 0
    });
  }

  $("product-form").querySelector('[type="submit"]').textContent =
    "Salvar alterações";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function cancelarEdicao() {
  $("product-form").reset();

  produtoEmEdicao = null;
  $("edit-index").value = "-1";

  liberarFotosTemporarias();
  fotosSelecionadas = [];
  renderizarFotos();

  $("variations-list").replaceChildren();
  adicionarVariacao();

  $("product-form").querySelector('[type="submit"]').textContent =
    "Salvar produto";
}

async function prepararFotos() {
  const imagens = [];

  for (const foto of fotosSelecionadas) {
    if (foto.file) {
      const resultado = await enviarImagemProduto(
        foto.file,
        EMPRESA_ID
      );

      if (!resultado?.url) {
        throw new Error("O Firebase não retornou a URL da imagem enviada.");
      }

      imagens.push({
        url: resultado.url,
        caminho: resultado.caminho || null,
        name: foto.name,
        principal: Boolean(foto.principal)
      });

      continue;
    }

    if (foto.url || foto.src) {
      imagens.push({
        url: foto.url || foto.src,
        caminho: foto.caminho || null,
        name: foto.name || "",
        principal: Boolean(foto.principal)
      });
    }
  }

  if (imagens.length && !imagens.some(imagem => imagem.principal)) {
    imagens[0].principal = true;
  }

  return imagens;
}

async function handleSubmit(evento) {
  evento.preventDefault();

  if (salvando) return;

  if (!usuarioAutenticado || usuarioAutenticado.uid !== ADMIN_UID) {
    mostrarMensagem("Entre com a conta administrativa para salvar produtos.");
    mostrarLogin();
    return;
  }

  const formulario = $("product-form");

  if (!formulario.reportValidity()) return;

  const variacoes = lerVariacoes();

  if (!variacoes.length) {
    mostrarMensagem("Adicione pelo menos uma variação.");
    return;
  }

  const variacaoInvalida = variacoes.some(variacao =>
    !variacao.tamanho ||
    !variacao.cor ||
    !Number.isFinite(variacao.preco) ||
    variacao.preco < 0 ||
    !Number.isInteger(variacao.estoque) ||
    variacao.estoque < 0
  );

  if (variacaoInvalida) {
    mostrarMensagem("Confira os tamanhos, cores, preços e estoques.");
    return;
  }

  const precoBase = Number($("p-preco").value);

  if (!Number.isFinite(precoBase) || precoBase < 0) {
    mostrarMensagem("Informe um preço base válido.");
    return;
  }

  salvando = true;

  const botaoSalvar = formulario.querySelector('[type="submit"]');
  const textoOriginal = botaoSalvar.textContent;

  botaoSalvar.disabled = true;
  botaoSalvar.textContent = "Salvando...";

  try {
    const imagens = await prepararFotos();
    const imagemPrincipal =
      imagens.find(imagem => imagem.principal) || imagens[0] || null;

    const produto = {
      nome: $("p-nome").value.trim(),
      categoria: $("p-categoria").value.trim(),
      marca: $("p-marca").value.trim(),
      condicao: $("p-condicao").value,
      descricao: $("p-descricao").value.trim(),
      preco: precoBase,
      variacoes,
      tamanhos: [...new Set(variacoes.map(item => item.tamanho))],
      cores: [...new Set(variacoes.map(item => item.cor))],
      estoque: variacoes.reduce((total, item) => total + item.estoque, 0),
      destaque: $("p-destaque").checked,
      ativo: true,
      imagem: imagemPrincipal?.url || "",
      imagemCaminho: imagemPrincipal?.caminho || null,
      imagens
    };

    if (produtoEmEdicao) {
      await salvarProduto(EMPRESA_ID, produto, produtoEmEdicao);
    } else {
      await salvarProduto(EMPRESA_ID, produto);
    }

    cancelarEdicao();
    await carregarProdutos();

    mostrarMensagem("Produto salvo no Firebase com sucesso.");
  } catch (erro) {
    console.error("Erro ao salvar produto:", erro);

    mostrarMensagem(
      `Não foi possível salvar o produto: ${erro.message || "erro desconhecido."}`
    );
  } finally {
    salvando = false;
    botaoSalvar.disabled = false;
    botaoSalvar.textContent = textoOriginal;
  }
}

async function apagarProduto(id) {
  const produto = produtos.find(item => item.id === id);

  if (!produto) {
    mostrarMensagem("Produto não encontrado.");
    return;
  }

  if (!confirm(`Deseja realmente excluir "${produto.nome}"?`)) {
    return;
  }

  if (!usuarioAutenticado || usuarioAutenticado.uid !== ADMIN_UID) {
    mostrarMensagem("Você não tem autorização para excluir produtos.");
    mostrarLogin();
    return;
  }

  try {
    await excluirProduto(EMPRESA_ID, id);

    const imagens = Array.isArray(produto.imagens)
      ? produto.imagens
      : [];

    const caminhos = new Set(
      imagens
        .filter(imagem => imagem && typeof imagem === "object")
        .map(imagem => imagem.caminho)
        .filter(Boolean)
    );

    if (produto.imagemCaminho) {
      caminhos.add(produto.imagemCaminho);
    }

    for (const caminho of caminhos) {
      try {
        await excluirImagemProduto(caminho);
      } catch (erro) {
        console.warn("Não foi possível remover a imagem:", caminho, erro);
      }
    }

    await carregarProdutos();
    mostrarMensagem("Produto excluído do Firestore.");
  } catch (erro) {
    console.error("Erro ao excluir produto:", erro);
    mostrarMensagem("Não foi possível excluir o produto.");
  }
}

async function processarAcaoTabela(evento) {
  const botao = evento.target.closest("button[data-action]");

  if (!botao) return;

  const { action, id } = botao.dataset;

  if (action === "edit") {
    editarProduto(id);
  } else if (action === "delete") {
    await apagarProduto(id);
  }
}

async function processarLogin(evento) {
  evento.preventDefault();

  const botao = $("login-submit");
  const textoOriginal = botao.textContent;

  mostrarErroLogin("");

  botao.disabled = true;
  botao.textContent = "Entrando...";

  try {
    await entrarAdmin(
      $("login-email").value.trim(),
      $("login-senha").value
    );
  } catch (erro) {
    console.error("Erro no login:", erro);

    mostrarErroLogin(
      "Não foi possível entrar. Confira seu e-mail e sua senha."
    );
  } finally {
    botao.disabled = false;
    botao.textContent = textoOriginal;
  }
}

async function processarSaida() {
  try {
    await sairAdmin();
  } catch (erro) {
    console.error("Erro ao sair:", erro);
    mostrarMensagem("Não foi possível encerrar a sessão.");
  }
}

function acompanharAutenticacao() {
  if (observadorIniciado) return;

  observadorIniciado = true;

  observarAutenticacao(async usuario => {
    usuarioAutenticado = usuario || null;

    if (!usuario) {
      mostrarLogin();
      mostrarErroLogin("");
      return;
    }

    if (usuario.uid !== ADMIN_UID) {
      mostrarLogin();

      mostrarErroLogin(
        "Esta conta não tem autorização para acessar o painel administrativo."
      );

      try {
        await sairAdmin();
      } catch (erro) {
        console.error("Erro ao encerrar sessão não autorizada:", erro);
      }

      return;
    }

    mostrarPainel();
    await carregarProdutos();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  mostrarLogin();

  $("login-form").addEventListener("submit", processarLogin);
  $("logout-admin").addEventListener("click", processarSaida);

  $("add-variation").addEventListener("click", () => {
    adicionarVariacao();
  });

  $("p-fotos").addEventListener("change", selecionarFotos);
  $("cancel-edit").addEventListener("click", cancelarEdicao);
  $("product-form").addEventListener("submit", handleSubmit);

  $("admin-table").addEventListener("click", processarAcaoTabela);

  $("reset-admin").addEventListener("click", () => {
    mostrarMensagem(
      "Os produtos de demonstração não são restaurados. Os produtos são gerenciados pelo Firebase."
    );
  });

  acompanharAutenticacao();
});
