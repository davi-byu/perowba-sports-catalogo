
document.addEventListener("DOMContentLoaded", async ()=>{
  const grid=document.getElementById("featured-products");
  if(!grid)return;
  try{
    const products=await loadProducts();
    grid.innerHTML=products.filter(p=>p.destaque).slice(0,4).map(productCard).join("");
  }catch(e){grid.innerHTML="<p>Não foi possível carregar os produtos.</p>";}
});
