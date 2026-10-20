
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

function escapar(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function fotosDoProduto(produto) {
  const fotos = Array.isArray(produto.imagens) ? produto.imagens.map(f => typeof f === 'string' ? f : (f?.url || f?.src || '')).filter(Boolean) : [];
  const principal = Array.isArray(produto.imagens) ? produto.imagens.find(f => f && typeof f === 'object' && f.principal && f.url)?.url : '';
  return [...new Set([principal, produto.imagem, produto.imagemUrl, ...fotos].filter(v => typeof v === 'string' && v.trim()))];
}
function prepararModal() {
  if (document.getElementById('product-modal')) return;
  const modal = document.createElement('div');
  modal.id = 'product-modal';
  modal.className = 'product-modal';
  modal.hidden = true;
  modal.innerHTML = `<div class="product-modal-backdrop" data-close-modal></div><section class="product-modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-product-name"><button type="button" class="product-modal-close" aria-label="Fechar detalhes" data-close-modal>×</button><div id="modal-product-content"><p class="empty">Carregando produto...</p></div></section>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => {
    if (e.target.closest('[data-close-modal]')) fecharModal();
    const thumb = e.target.closest('[data-modal-photo]');
    if (thumb) {
      const main = modal.querySelector('#modal-main-image');
      if (main) main.src = thumb.dataset.modalPhoto;
      modal.querySelectorAll('.product-thumbnail').forEach(b => b.classList.toggle('selected', b === thumb));
    }
    const option = e.target.closest('[data-variation-index]');
    if (option) selecionarVariacao(Number(option.dataset.variationIndex));
    const add = e.target.closest('#modal-add-cart');
    if (add) adicionarProdutoModal();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharModal(); });
}
let produtoModalAtual = null;
let variacaoModalAtual = 0;
function fecharModal() {
  const modal = document.getElementById('product-modal');
  if (modal) { modal.hidden = true; document.body.classList.remove('modal-open'); }
}
function abrirModal(produto) {
  prepararModal();
  produtoModalAtual = produto;
  variacaoModalAtual = 0;
  const modal = document.getElementById('product-modal');
  const fotos = fotosDoProduto(produto);
  const variacoes = Array.isArray(produto.variacoes) ? produto.variacoes : [];
  const estoqueTotal = variacoes.length ? variacoes.reduce((s,v)=>s+Number(v.estoque||0),0) : Number(produto.estoque||0);
  modal.querySelector('#modal-product-content').innerHTML = `<div class="product-modal-layout"><div class="product-gallery"><div class="product-large"><img id="modal-main-image" src="${escapar(fotos[0] || 'imagens/produto-1.svg')}" alt="${escapar(produto.nome)}" onerror="this.onerror=null;this.src='imagens/produto-1.svg'"></div><div class="product-thumbnails">${fotos.map((foto,i)=>`<button type="button" class="product-thumbnail ${i===0?'selected':''}" data-modal-photo="${escapar(foto)}" aria-label="Ver foto ${i+1}"><img src="${escapar(foto)}" alt="Foto ${i+1}" loading="lazy" onerror="this.style.display='none'"></button>`).join('')}</div></div><div class="product-modal-details"><span class="product-brand">${escapar(produto.marca || 'Perowba Sports')} ${produto.categoria ? ' • '+escapar(produto.categoria) : ''}</span><h2 id="modal-product-name">${escapar(produto.nome)}</h2><p class="product-modal-price" id="modal-price">${window.money ? window.money(produto.preco) : Number(produto.preco||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p><p class="product-description">${escapar(produto.descricao || 'Consulte nossa equipe para mais informações sobre este produto.')}</p>${variacoes.length ? `<h3 class="option-title">Escolha tamanho e cor</h3><div class="modal-variations">${variacoes.map((v,i)=>`<button type="button" class="option ${i===0?'selected':''}" data-variation-index="${i}" ${Number(v.estoque||0)<=0?'disabled':''}>${escapar(v.tamanho||'Único')} · ${escapar(v.cor||'Padrão')} — ${window.money?window.money(v.preco ?? produto.preco):Number(v.preco??produto.preco??0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} (${Number(v.estoque||0)} un.)</button>`).join('')}</div>` : `<p class="stock">${estoqueTotal > 0 ? `${estoqueTotal} unidade(s) em estoque` : 'Consulte a disponibilidade'}</p>`}<div class="quantity"><button type="button" id="modal-qty-minus" aria-label="Diminuir quantidade">−</button><span id="modal-qty">1</span><button type="button" id="modal-qty-plus" aria-label="Aumentar quantidade">+</button></div><p id="modal-stock" class="stock">${estoqueTotal>0?`${estoqueTotal} unidade(s) em estoque`:'Produto indisponível'}</p><button type="button" class="btn btn-primary full" id="modal-add-cart" ${estoqueTotal<=0?'disabled':''}>Adicionar ao carrinho</button></div></div>`;
  modal.hidden = false;
  document.body.classList.add('modal-open');
  const close = modal.querySelector('.product-modal-close'); if (close) close.focus();
  const minus=modal.querySelector('#modal-qty-minus'), plus=modal.querySelector('#modal-qty-plus'), qty=modal.querySelector('#modal-qty');
  minus.addEventListener('click',()=>qty.textContent=Math.max(1,Number(qty.textContent)-1));
  plus.addEventListener('click',()=>{const max=estoqueDaVariacao(); qty.textContent=Math.min(max || 99,Number(qty.textContent)+1);});
  if (variacoes.length) selecionarVariacao(variacaoModalAtual);
}
function estoqueDaVariacao() {
  if (!produtoModalAtual) return 0;
  const vars = produtoModalAtual.variacoes;
  return Array.isArray(vars) && vars.length ? Number(vars[variacaoModalAtual]?.estoque||0) : Number(produtoModalAtual.estoque||0);
}
function selecionarVariacao(indice) {
  if (!produtoModalAtual) return;
  variacaoModalAtual = indice;
  const variacao = produtoModalAtual.variacoes?.[indice];
  const modal = document.getElementById('product-modal');
  modal.querySelectorAll('[data-variation-index]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.variationIndex)===indice));
  if (variacao) {
    modal.querySelector('#modal-price').textContent = window.money ? window.money(variacao.preco ?? produtoModalAtual.preco) : Number(variacao.preco ?? produtoModalAtual.preco ?? 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    modal.querySelector('#modal-stock').textContent = Number(variacao.estoque||0)>0 ? `${variacao.estoque} unidade(s) nesta variação` : 'Variação esgotada';
    modal.querySelector('#modal-add-cart').disabled = Number(variacao.estoque||0)<=0;
    modal.querySelector('#modal-qty').textContent='1';
  }
}
function adicionarProdutoModal() {
  if (!produtoModalAtual || typeof window.addToCart !== 'function') return;
  const modal=document.getElementById('product-modal');
  const qtd=Number(modal.querySelector('#modal-qty').textContent||1);
  const variacao=produtoModalAtual.variacoes?.[variacaoModalAtual];
  const estoque=estoqueDaVariacao();
  if (estoque<=0) { if(window.toast) window.toast('Esta opção está esgotada.'); return; }
  if (qtd>estoque) { if(window.toast) window.toast('A quantidade excede o estoque disponível.'); return; }
  const produto={...produtoModalAtual, preco:Number(variacao?.preco ?? produtoModalAtual.preco), estoque};
  window.addToCart(produto,qtd,String(variacao?.tamanho||''),String(variacao?.cor||''));
  fecharModal();
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

  document.getElementById("products-grid").addEventListener("click", event => {
    const detailButton = event.target.closest(".product-open-details");
    if (detailButton) {
      const product = products.find(item => item.id === detailButton.dataset.productId);
      if (product) abrirModal(product);
      return;
    }
    const cartButton = event.target.closest(".product-add-cart");
    if (cartButton) {
      try {
        const product = JSON.parse(decodeURIComponent(cartButton.dataset.product));
        if (typeof window.addToCart === "function") window.addToCart(product);
      } catch (error) { console.error("Não foi possível adicionar o produto ao carrinho:", error); }
    }
  });

  prepararModal();
  carregarCatalogo();
});
