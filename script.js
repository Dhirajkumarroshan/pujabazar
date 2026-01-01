const products = [
  {id:1, name:"Pure Ganga Jal", price:199, img:"https://images.unsplash.com/photo-1582719478185-2f5e4a5e1e44"},
  {id:2, name:"Puja Thali Set", price:899, img:"https://images.unsplash.com/photo-1606293926075-69a00dbfde1c"},
  {id:3, name:"Incense Sticks", price:149, img:"https://images.unsplash.com/photo-1609921141835-710b7fa2c8c1"},
  {id:4, name:"Brass Diya", price:299, img:"https://images.unsplash.com/photo-1618220179428-22790b461013"},
  {id:5, name:"Rudraksha Mala", price:499, img:"https://images.unsplash.com/photo-1612392061787-2d078b3f7c38"}
];

let cart = JSON.parse(localStorage.getItem("cart")) || [];

const grid = document.getElementById("productGrid");

products.forEach(p => {
  grid.innerHTML += `
    <div class="product-card">
      <img src="${p.img}" loading="lazy"/>
      <h4>${p.name}</h4>
      <p class="price">₹${p.price}</p>
      <button class="btn primary" onclick="addToCart(${p.id})">Add to Cart</button>
    </div>
  `;
});

function addToCart(id){
  cart.push(products.find(p=>p.id===id));
  localStorage.setItem("cart",JSON.stringify(cart));
  updateCart();
}

function updateCart(){
  document.getElementById("cartCount").innerText = cart.length;
}

function openCart(){
  document.getElementById("cartModal").style.display="block";
  renderCart();
}

function closeCart(){
  document.getElementById("cartModal").style.display="none";
}

function renderCart(){
  let total=0;
  const items=document.getElementById("cartItems");
  items.innerHTML="";
  cart.forEach(i=>{
    total+=i.price;
    items.innerHTML+=`<p>${i.name} - ₹${i.price}</p>`;
  });
  document.getElementById("totalPrice").innerText=total;
}

updateCart();
