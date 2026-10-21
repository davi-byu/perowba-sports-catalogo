
const CONFIG = window.PEROWBA_CONFIG || {};
const money = value => Number(value || 0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

function getCart(){ return JSON.parse(localStorage.getItem("perowba_cart") || "[]"); }
function saveCart(cart){ localStorage.setItem("perowba_cart", JSON.stringify(cart)); updateCartCount(); }
function updateCartCount(){
  const count = getCart().reduce((s,i)=>s+i.quantidade,0);
  document.querySelectorAll("[data-cart-count]").forEach(el=>el.textContent=count);
}
function addToCart(product, quantidade=1, tamanho="", cor=""){
  const cart=getCart();
  const key=`${product.id}-${tamanho}-${cor}`;
  const found=cart.find(i=>i.key===key);
  if(found) found.quantidade += quantidade;
  else cart.push({...product,key,quantidade,tamanho,cor});
  saveCart(cart);
  toast("Produto adicionado ao carrinho.");
}
function removeFromCart(key){ saveCart(getCart().filter(i=>i.key!==key)); renderCart(); }
function changeQty(key, delta){
  const cart=getCart();
  const item=cart.find(i=>i.key===key);
  if(!item)return;
  item.quantidade += delta;
  if(item.quantidade<=0) return removeFromCart(key);
  saveCart(cart); renderCart();
}
function toast(message){
  const el=document.getElementById("toast");
  if(!el)return;
  el.textContent=message; el.classList.add("show");
  setTimeout(()=>el.classList.remove("show"),2200);
}
function whatsappUrl(message){
  const number=CONFIG.WHATSAPP_NUMBER || "";
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
function buildOrderMessage(){
  const cart=getCart();
  if(!cart.length)return "";
  let total=0;
  let msg=`Olá! Gostaria de fazer um pedido na ${CONFIG.LOJA_NOME || "Perowba Sports"}:%0A`;
  msg = `Olá! Gostaria de fazer um pedido na ${CONFIG.LOJA_NOME || "Perowba Sports"}:\n\n`;
  cart.forEach(i=>{
    const subtotal=i.preco*i.quantidade; total+=subtotal;
    msg += `• ${i.quantidade}x ${i.nome}`;
    if(i.tamanho) msg += ` | Tam.: ${i.tamanho}`;
    if(i.cor) msg += ` | Cor: ${i.cor}`;
    msg += ` — ${money(subtotal)}\n`;
  });
  msg += `\nTotal: ${money(total)}\n\nNome: \nForma de entrega: `;
  return msg;
}
function formatStock(n){
  if(n<=0)return `<span style="color:#dc2626">Esgotado</span>`;
  if(n<=3)return `<span style="color:#d97706">Últimas unidades</span>`;
  return `<span style="color:#16a34a">Em estoque</span>`;
}
function productCard(p){
  const imagens = obterImagensProduto(p);
  const imagemPrincipal = imagens[0] || "imagens/produto-1.svg";
  const imagensSeguras = JSON.stringify(imagens.length ? imagens : [imagemPrincipal]);
  const estoque = Array.isArray(p.variacoes) && p.variacoes.length
    ? p.variacoes.reduce((total, v) => total + Number(v.estoque || 0), 0)
    : Number(p.estoque || 0);
  const mensagem = `Olá! Tenho interesse neste produto da Perowba Sports:\n\nProduto: ${p.nome || ""}\nMarca: ${p.marca || ""}\nPreço: ${money(p.preco)}\n\nGostaria de confirmar a disponibilidade e as condições de entrega.`;
  const produtoSeguro = JSON.stringify(p).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/'/g, "&#39;");
  const temVariasFotos = imagens.length > 1;
  return `<article class="product-card">
    ${p.destaque ? '<span class="badge">DESTAQUE</span>' : ''}
    <div class="product-img product-carousel" data-carousel-images="${escapeAttribute(encodeURIComponent(imagensSeguras))}" data-carousel-index="0">
      <button class="product-carousel-open product-open-details" type="button" data-product-id="${escapeAttribute(p.id)}" aria-label="Ver detalhes de ${escapeHTML(p.nome)}">
        <img src="${escapeAttribute(imagemPrincipal)}" alt="${escapeAttribute(p.nome || 'Produto')}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='imagens/produto-1.svg'">
      </button>
      ${temVariasFotos ? `
        <button class="product-carousel-arrow product-carousel-prev" type="button" aria-label="Foto anterior de ${escapeAttribute(p.nome || 'produto')}" data-carousel-step="-1">‹</button>
        <button class="product-carousel-arrow product-carousel-next" type="button" aria-label="Próxima foto de ${escapeAttribute(p.nome || 'produto')}" data-carousel-step="1">›</button>
        <div class="product-carousel-dots" aria-label="Fotos do produto">
          ${imagens.map((_, i) => `<button type="button" class="product-carousel-dot ${i === 0 ? 'is-active' : ''}" data-carousel-go="${i}" aria-label="Mostrar foto ${i + 1}"></button>`).join('')}
        </div>
      ` : ''}
    </div>
    <div class="product-info">
      <span class="product-brand">${escapeHTML(p.marca || 'Perowba Sports')}</span>
      <button class="product-name product-open-details" type="button" data-product-id="${escapeAttribute(p.id)}">${escapeHTML(p.nome || 'Produto')}</button>
      <div><span class="price">${money(p.preco)}</span>${p.precoAntigo ? `<span class="old-price">${money(p.precoAntigo)}</span>` : ''}</div>
      <span class="stock">${formatStock(estoque)}</span>
      <div class="card-actions">
        <button class="btn btn-primary product-open-details" type="button" data-product-id="${escapeAttribute(p.id)}">Ver produto</button>
        <button class="icon-btn product-add-cart" type="button" data-product="${encodeURIComponent(produtoSeguro)}" aria-label="Adicionar ao carrinho">🛒</button>
      </div>
      <a class="btn btn-whatsapp" href="${whatsappUrl(mensagem)}" target="_blank" rel="noopener noreferrer">Pedir no — WhatsApp</a>
    </div>
  </article>`;
}

const productCarouselTimers = new WeakMap();
const productCarouselHandlers = new WeakMap();

function atualizarCarrossel(card, indice) {
  const img = card.querySelector(".product-carousel-open img");
  const dots = [...card.querySelectorAll(".product-carousel-dot")];
  let imagens;
  try {
    imagens = JSON.parse(decodeURIComponent(card.dataset.carouselImages || "%5B%5D"));
  } catch {
    imagens = [];
  }
  if (!img || !imagens.length) return;
  const novoIndice = (indice + imagens.length) % imagens.length;
  card.dataset.carouselIndex = String(novoIndice);
  if (img.getAttribute("src") !== imagens[novoIndice]) img.src = imagens[novoIndice];
  dots.forEach((dot, i) => {
    dot.classList.toggle("is-active", i === novoIndice);
    dot.setAttribute("aria-current", i === novoIndice ? "true" : "false");
  });
}

function pararCarrosseis(root) {
  if (!root) return;
  root.querySelectorAll(".product-carousel").forEach(card => {
    const timer = productCarouselTimers.get(card);
    if (timer) clearInterval(timer);
    productCarouselTimers.delete(card);
    const handlers = productCarouselHandlers.get(card);
    if (handlers) {
      card.removeEventListener("click", handlers.click);
      card.removeEventListener("pointerdown", handlers.pointerdown);
      card.removeEventListener("pointerup", handlers.pointerup);
      card.removeEventListener("pointercancel", handlers.pointercancel);
      card.removeEventListener("mouseenter", handlers.mouseenter);
      card.removeEventListener("mouseleave", handlers.mouseleave);
      card.removeEventListener("focusin", handlers.focusin);
      card.removeEventListener("focusout", handlers.focusout);
    }
    productCarouselHandlers.delete(card);
  });
}

function iniciarCarrosseis(root = document) {
  root.querySelectorAll(".product-carousel").forEach(card => {
    if (productCarouselHandlers.has(card)) return;
    let imagens;
    try {
      imagens = JSON.parse(decodeURIComponent(card.dataset.carouselImages || "%5B%5D"));
    } catch {
      imagens = [];
    }
    if (imagens.length < 2) return;

    let startX = 0;
    let startY = 0;
    let pausado = false;
    let ignorarProximoClique = false;
    const trocar = delta => atualizarCarrossel(card, Number(card.dataset.carouselIndex || 0) + delta);
    const reiniciarTimer = () => {
      const antigo = productCarouselTimers.get(card);
      if (antigo) clearInterval(antigo);
      if (pausado || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      productCarouselTimers.set(card, setInterval(() => trocar(1), 4500));
    };
    const click = evento => {
      if (ignorarProximoClique) {
        ignorarProximoClique = false;
        evento.preventDefault();
        evento.stopPropagation();
        return;
      }
      const passo = evento.target.closest("[data-carousel-step]");
      const ponto = evento.target.closest("[data-carousel-go]");
      if (!passo && !ponto) return;
      evento.preventDefault();
      evento.stopPropagation();
      if (passo) trocar(Number(passo.dataset.carouselStep));
      else atualizarCarrossel(card, Number(ponto.dataset.carouselGo));
      reiniciarTimer();
    };
    const pointerdown = evento => {
      if (evento.pointerType === "mouse" && evento.button !== 0) return;
      startX = evento.clientX;
      startY = evento.clientY;
    };
    const pointerup = evento => {
      const dx = evento.clientX - startX;
      const dy = evento.clientY - startY;
      if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        ignorarProximoClique = true;
        trocar(dx < 0 ? 1 : -1);
        reiniciarTimer();
      }
    };
    const pointercancel = () => { startX = 0; startY = 0; };
    const mouseenter = () => { pausado = true; reiniciarTimer(); };
    const mouseleave = () => { pausado = false; reiniciarTimer(); };
    const focusin = () => { pausado = true; reiniciarTimer(); };
    const focusout = evento => {
      if (!card.contains(evento.relatedTarget)) { pausado = false; reiniciarTimer(); }
    };
    const handlers = { click, pointerdown, pointerup, pointercancel, mouseenter, mouseleave, focusin, focusout };
    Object.entries(handlers).forEach(([name, handler]) => card.addEventListener(name, handler));
    productCarouselHandlers.set(card, handlers);
    reiniciarTimer();
  });
}

window.iniciarCarrosseis = iniciarCarrosseis;
window.pararCarrosseis = pararCarrosseis;

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function escapeAttribute(value) { return escapeHTML(value); }
function obterImagensProduto(p) {
  const lista = Array.isArray(p.imagens) ? p.imagens.map(item => typeof item === 'string' ? item : (item?.url || item?.src || '')).filter(Boolean) : [];
  const principalMarcada = Array.isArray(p.imagens) ? p.imagens.find(item => item && typeof item === 'object' && item.principal && item.url)?.url : '';
  return [...new Set([principalMarcada, p.imagem, p.imagemUrl, ...lista].filter(url => typeof url === 'string' && url.trim()))];
}

function setupMenu(){
  const btn=document.querySelector(".menu-btn"), links=document.querySelector(".nav-links");
  if(btn&&links)btn.addEventListener("click",()=>links.classList.toggle("open"));
}
document.addEventListener("DOMContentLoaded",()=>{setupMenu();updateCartCount();});
