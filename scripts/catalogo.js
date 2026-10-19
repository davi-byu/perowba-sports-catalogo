
let products=[];
const state={search:"",categoria:"",marca:"",ordem:"destaques"};

function render(){
  const grid=document.getElementById("products-grid");
  let list=products.filter(p=>{
    const q=state.search.toLowerCase();
    return (!q || `${p.nome} ${p.marca} ${p.categoria}`.toLowerCase().includes(q))
      &&(!state.categoria || p.categoria===state.categoria)
      &&(!state.marca || p.marca===state.marca);
  });
  if(state.ordem==="menor")list.sort((a,b)=>a.preco-b.preco);
  if(state.ordem==="maior")list.sort((a,b)=>b.preco-a.preco);
  if(state.ordem==="nome")list.sort((a,b)=>a.nome.localeCompare(b.nome));
  grid.innerHTML=list.length?list.map(productCard).join(""):`<div class="empty" style="grid-column:1/-1">Nenhum produto encontrado.</div>`;
  document.getElementById("result-count").textContent=`${list.length} produto(s)`;
}
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const savedProducts = localStorage.getItem("perowba_admin_products");

    products = savedProducts
      ? JSON.parse(savedProducts)
      : await loadProducts();
  } catch (error) {
    console.error("Erro ao carregar produtos:", error);
    products = await loadProducts();
  }
  const cat=document.getElementById("categoria"), marca=document.getElementById("marca");
  [...new Set(products.map(p=>p.categoria))].sort().forEach(v=>cat.insertAdjacentHTML("beforeend",`<option>${v}</option>`));
  [...new Set(products.map(p=>p.marca))].sort().forEach(v=>marca.insertAdjacentHTML("beforeend",`<option>${v}</option>`));
  document.getElementById("search").addEventListener("input",e=>{state.search=e.target.value;render()});
  cat.addEventListener("change",e=>{state.categoria=e.target.value;render()});
  marca.addEventListener("change",e=>{state.marca=e.target.value;render()});
  document.getElementById("ordem").addEventListener("change",e=>{state.ordem=e.target.value;render()});
  render();
});
