const products = [
  {id:1, name:"Pure Ganga Jal", price:399, img: "images/ganga-jal.jpg"},
  {id:2, name:"Puja Thali Set", price:699, img:"images/puja-Thali.jpg"},
  {id:3, name:"Incense Sticks", price:149, img:"images/incense-stick.jpg"},
  {id:4, name:"Brass Diya", price:299, img:"images/Diya-brass.jpg"},
  {id:5, name:"Rudraksha Mala", price:499, img:"images/Rudra.jpg"}
];

let cart = JSON.parse(localStorage.getItem("cart")) || [];

const grid = document.getElementById("productGrid");

products.forEach(p => {
  grid.innerHTML += `
    <div class="product-card">
      <div class="product-image">
          <img src="${p.img}" alt="${p.name}" loading="lazy" />
      </div>

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





