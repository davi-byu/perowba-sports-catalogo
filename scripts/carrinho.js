
function renderCart(){
  const cart=getCart(), list=document.getElementById("cart-list"), summary=document.getElementById("summary");
  if(!cart.length){
    list.innerHTML='<div class="empty">Seu carrinho está vazio.<br><br><a class="btn btn-primary" href="catalogo.html">Ver catálogo</a></div>';
    summary.innerHTML="<h2>Resumo</h2><p>Nenhum item no pedido.</p>"; return;
  }
  let total=0;
  list.innerHTML=cart.map(i=>{
    const sub=i.preco*i.quantidade; total+=sub;
    return `<div class="cart-item">
      <img src="${i.imagem}" alt="${i.nome}">
      <div><h3>${i.nome}</h3><small>${i.tamanho?`Tamanho: ${i.tamanho} • `:""}${i.cor?`Cor: ${i.cor}`:""}</small>
        <div class="cart-controls"><button onclick="changeQty('${i.key}',-1)">−</button><b>${i.quantidade}</b><button onclick="changeQty('${i.key}',1)">+</button><button class="btn-danger" onclick="removeFromCart('${i.key}')">Remover</button></div>
      </div>
      <strong>${money(sub)}</strong>
    </div>`;
  }).join("");
  summary.innerHTML=`<h2>Resumo do pedido</h2>
    <div class="total-line"><span>Itens</span><strong>${cart.reduce((s,i)=>s+i.quantidade,0)}</strong></div>
    <div class="total-line total"><span>Total</span><strong>${money(total)}</strong></div>
    <p style="color:#777;font-size:.86rem">O pedido será enviado pelo WhatsApp para confirmação de disponibilidade, entrega e pagamento.</p>
    <a class="btn btn-primary full" href="${whatsappUrl(buildOrderMessage())}">📱 Finalizar pelo WhatsApp</a>`;
}
document.addEventListener("DOMContentLoaded",renderCart);
