
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
async function loadProducts(){
  const response=await fetch("dados/produtos.json");
  if(!response.ok)throw new Error("Não foi possível carregar os produtos.");
  return response.json();
}

function productCard(p){
  const mensagem = `Olá! Tenho interesse neste produto da Perowba Sports:\n\nProduto: ${p.nome}\nMarca: ${p.marca}\nPreço: ${money(p.preco)}\n\nGostaria de confirmar a disponibilidade e as condições de entrega.`;

  return `<article class="product-card">
    ${p.destaque ? '<span class="badge">DESTAQUE</span>' : ''}
    <a class="product-img" href="produto.html?id=${p.id}">
      <img src="${p.imagem}" alt="${p.nome}" loading="lazy">
    </a>
    <div class="product-info">
      <span class="product-brand">${p.marca}</span>
      <a class="product-name" href="produto.html?id=${p.id}">${p.nome}</a>
      <div>
        <span class="price">${money(p.preco)}</span>
        ${p.precoAntigo ? `<span class="old-price">${money(p.precoAntigo)}</span>` : ''}
      </div>
      <span class="stock">${formatStock(p.estoque)}</span>
      <div class="card-actions">
        <a class="btn btn-primary" href="produto.html?id=${p.id}">Ver produto</a>
        <button class="icon-btn" onclick='addToCart(${JSON.stringify(p)})' aria-label="Adicionar ao carrinho">🛒</button>
      </div>
      
      <a class="btn btn-whatsapp" href="${whatsappUrl(mensagem)}" target="_blank" rel="noopener noreferrer">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
        <path d="M20.52 3.48A11.8 11.8 0 0 0 12.13 0C5.58 0 .24 5.33.24 11.9c0 2.1.55 4.15 1.6 5.95L0 24l6.3-1.65a11.9 11.9 0 0 0 5.82 1.5h.01c6.56 0 11.9-5.34 11.9-11.9 0-3.18-1.24-6.17-3.51-8.47ZM12.13 21.83a9.9 9.9 0 0 1-5.05-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.9 9.9 0 0 1-1.52-5.3c0-5.47 4.45-9.92 9.92-9.92a9.85 9.85 0 0 1 7.02 2.91 9.87 9.87 0 0 1 2.9 7.03c0 5.47-4.45 9.91-9.93 9.91Zm5.44-7.42c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.8-1.67-2.1-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.09 4.49.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z"/>
        </svg>
        Pedir pelo WhatsApp
      </a>

    </div>
  </article>`;
}

function setupMenu(){
  const btn=document.querySelector(".menu-btn"), links=document.querySelector(".nav-links");
  if(btn&&links)btn.addEventListener("click",()=>links.classList.toggle("open"));
}
document.addEventListener("DOMContentLoaded",()=>{setupMenu();updateCartCount();});
