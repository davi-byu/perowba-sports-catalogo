
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
  const estoque = Array.isArray(p.variacoes) && p.variacoes.length
    ? p.variacoes.reduce((total, v) => total + Number(v.estoque || 0), 0)
    : Number(p.estoque || 0);
  const mensagem = `Olá! Tenho interesse neste produto da Perowba Sports:\n\nProduto: ${p.nome || ""}\nMarca: ${p.marca || ""}\nPreço: ${money(p.preco)}\n\nGostaria de confirmar a disponibilidade e as condições de entrega.`;
  const produtoSeguro = JSON.stringify(p).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/'/g, "&#39;");
  return `<article class="product-card">
    ${p.destaque ? '<span class="badge">DESTAQUE</span>' : ''}
    <button class="product-img product-open-details" type="button" data-product-id="${escapeAttribute(p.id)}" aria-label="Ver detalhes de ${escapeHTML(p.nome)}">
      <img src="${escapeAttribute(imagemPrincipal)}" alt="${escapeAttribute(p.nome || 'Produto')}" loading="lazy" onerror="this.onerror=null;this.src='imagens/produto-1.svg'">
    </button>
    <div class="product-info">
      <span class="product-brand">${escapeHTML(p.marca || 'Perowba Sports')}</span>
      <button class="product-name product-open-details" type="button" data-product-id="${escapeAttribute(p.id)}">${escapeHTML(p.nome || 'Produto')}</button>
      <div><span class="price">${money(p.preco)}</span>${p.precoAntigo ? `<span class="old-price">${money(p.precoAntigo)}</span>` : ''}</div>
      <span class="stock">${formatStock(estoque)}</span>
      <div class="card-actions">
        <button class="btn btn-primary product-open-details" type="button" data-product-id="${escapeAttribute(p.id)}">Ver produto</button>
        <button class="icon-btn product-add-cart" type="button" data-product="${encodeURIComponent(produtoSeguro)}" aria-label="Adicionar ao carrinho">🛒</button>
      </div>
      <a class="btn btn-whatsapp" href="${whatsappUrl(mensagem)}" target="_blank" rel="noopener noreferrer">WhatsApp — consultar produto</a>
    </div>
  </article>`;
}

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
