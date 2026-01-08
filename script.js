/***********************
 * PRODUCTS
 ***********************/
const products = [
  { id: 1, name: "Pure Ganga Jal", price: 399, img: "images/ganga-jal.jpg" },
  { id: 2, name: "Puja Thali Set", price: 699, img: "images/puja-Thali.jpg" },
  { id: 3, name: "Incense Sticks", price: 149, img: "images/incense-stick.jpg" },
  { id: 4, name: "Brass Diya", price: 299, img: "images/Diya-brass.jpg" },
  { id: 5, name: "Rudraksha Mala", price: 499, img: "images/Rudra.jpg" }
];

/***********************
 * CART STATE
 ***********************/
let cart = JSON.parse(localStorage.getItem("cart")) || [];

/***********************
 * PRODUCT RENDER
 ***********************/
function renderProducts(productList) {
  const grid = document.getElementById("productGrid");
  grid.innerHTML = "";

  productList.forEach(p => {
    grid.innerHTML += `
      <div class="product-card">
        <div class="product-image">
          <img src="${p.img}" alt="${p.name}" loading="lazy" />
        </div>
        <h4>${p.name}</h4>
        <p class="price">₹${p.price}</p>
        <div class="cart-action" data-id="${p.id}">
          ${getCartButton(p.id)}
        </div>
      </div>
    `;
  });
}

/***********************
 * CART LOGIC
 ***********************/
function addToCart(id) {
  const product = products.find(p => p.id === id);
  const existing = cart.find(i => i.id === id);

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }

  saveCart();
}

function changeQty(id, delta) {
  const item = cart.find(p => p.id === id);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter(p => p.id !== id);
  }

  saveCart();
}

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCart();
  renderCart();
  renderProducts(products); // 🔥 THIS IS IMPORTANT
}

function animateAddToCart(btn) {
  btn.classList.add("added");

  setTimeout(() => {
    btn.classList.remove("added");
  }, 600);
}


function updateCart() {
  const count = cart.reduce((sum, i) => sum + i.qty, 0);
  document.getElementById("cartCount").innerText = count;
}

function renderCart() {
  const items = document.getElementById("cartItems");
  let total = 0;
  items.innerHTML = "";

  cart.forEach(item => {
    total += item.price * item.qty;

    items.innerHTML += `
      <div class="cart-item">
        <span>${item.name}</span>

        <div class="qty-controls">
          <button onclick="event.stopPropagation(); changeQty(${item.id}, -1)">−</button>
          <span>${item.qty}</span>
          <button onclick="event.stopPropagation(); changeQty(${item.id}, 1)">+</button>
        </div>

        <span>₹${item.price * item.qty}</span>
      </div>
    `;
  });

  document.getElementById("totalPrice").innerText = total;
}

function openCart() {
  document.getElementById("cartModal").style.display = "block";
  renderCart();
}

function closeCart() {
  document.getElementById("cartModal").style.display = "none";
}

document.getElementById("cartModal").addEventListener("click", function (e) {
  e.stopPropagation();
});


/***********************
 * CART EVENTS
 ***********************/
document.getElementById("cartIcon").addEventListener("click", e => {
  e.stopPropagation();
  openCart();
});

document.addEventListener("click", e => {
  const cartModal = document.getElementById("cartModal");
  const cartIcon = document.getElementById("cartIcon");

  if (
    cartModal.style.display === "block" &&
    !cartModal.contains(e.target) &&
    !cartIcon.contains(e.target)
  ) {
    closeCart();
  }
});

/***********************
 * SEARCH
 ***********************/
document.getElementById("search").addEventListener("input", function () {
  const q = this.value.toLowerCase();
  renderProducts(products.filter(p => p.name.toLowerCase().includes(q)));
});

/***********************
 * HERO SLIDER
 ***********************/
let currentSlide = 0;
const slides = document.querySelectorAll(".slide");

setInterval(() => {
  slides[currentSlide].classList.remove("active");
  currentSlide = (currentSlide + 1) % slides.length;
  slides[currentSlide].classList.add("active");
}, 5000);


/***********************
 * INIT
 ***********************/
renderProducts(products);
updateCart();

function getCartButton(id) {
  const item = cart.find(p => p.id === id);

  // If product NOT in cart → normal button
  if (!item) {
    return `
      <button class="btn primary add-cart-btn"
              onclick="addToCart(${id})">
        Add to Cart
      </button>
    `;
  }

  // If product IS in cart → same size, hover qty
  return `
    <button class="btn primary add-cart-btn has-qty"
            onmouseenter="showQty(${id}, this)"
            onmouseleave="hideQty(this)"
            onclick="addToCart(${id})">

      <span class="add-text">Add to Cart</span>

      <span class="qty-box">
        <span onclick="event.stopPropagation(); changeQty(${id}, -1)">−</span>
        <span class="qty-count" id="qty-${id}">${item.qty}</span>
        <span onclick="event.stopPropagation(); changeQty(${id}, 1)">+</span>
      </span>

    </button>
  `;
}

function showQty(id, btn) {
  const item = cart.find(p => p.id === id);
  if (!item) return;

  btn.classList.add("has-qty");
  const qtyEl = btn.querySelector(".qty-count");
  if (qtyEl) qtyEl.innerText = item.qty;
}

function hideQty(btn) {
  btn.classList.remove("has-qty");
}




