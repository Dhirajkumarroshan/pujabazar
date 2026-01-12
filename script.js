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

  items.innerHTML = ""; // reset first

  cart.forEach(item => {
    total += item.price * item.qty;

    items.innerHTML += `
      <div class="cart-row">
        <div class="cart-info">
          <div class="cart-name">${item.name}</div>

          <div class="cart-qty">
            <button onclick="changeQty(${item.id}, -1)">−</button>
            <span>${item.qty}</span>
            <button onclick="changeQty(${item.id}, 1)">+</button>
          </div>
        </div>

        <div class="cart-price">₹${item.price * item.qty}</div>
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

const API_BASE = 'http://localhost:3000';

function getCartButton(id) {
  const item = cart.find(p => p.id === id);

  // NOT in cart
  if (!item) {
    return `
      <button class="btn primary add-cart-btn"
              onclick="addToCart(${id}); animateAddToCart(this)">
        Add to Cart
      </button>
    `;
  }

  // IN cart (hover qty)
  return `
    <button class="btn primary add-cart-btn has-qty"
            onmouseenter="showQty(${id}, this)"
            onmouseleave="hideQty(this)"
            onclick="addToCart(${id}); animateAddToCart(this)">

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

/* Signup UI + API */
function openSignup() {
  const overlay = document.getElementById('signupOverlay');
  overlay.style.display = 'block';
  setTimeout(() => overlay.classList.add('active'), 50);
}

function closeSignup() {
  const overlay = document.getElementById('signupOverlay');
  overlay.classList.remove('active');
  setTimeout(() => overlay.style.display = 'none', 400);
}

async function submitSignup() {
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;

  if (!email || !password) {
    alert('Please enter email and password');
    return;
  }

  try {
    const res = await fetch('http://localhost:3000/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();
    if (res.ok) {
      alert('Signup successful — you can now sign in');
      closeSignup();
      openLogin();
    } else {
      alert(data.error || 'Signup failed');
    }
  } catch (err) {
    alert('Unable to reach signup server');
  }
}

/* WhatsApp OTP login (frontend) */
function openWhatsAppLogin() {
  const overlay = document.getElementById('whatsappModal');
  overlay.style.display = 'block';
  setTimeout(() => overlay.classList.add('active'), 50);
}

function closeWhatsAppLogin() {
  const overlay = document.getElementById('whatsappModal');
  overlay.classList.remove('active');
  setTimeout(() => overlay.style.display = 'none', 300);
}

async function requestWhatsAppOtp() {
  const phone = document.getElementById('whatsappPhone').value.trim();
  if (!phone) { alert('Please enter phone with country code'); return; }
  const btn = document.getElementById('requestOtpBtn');
  btn.disabled = true;
  btn.innerText = 'Sending...';
  try {
    const res = await fetch(API_BASE + '/api/login/whatsapp/request', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone })
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Failed to request OTP');
      btn.disabled = false; btn.innerText = 'Request OTP';
      return;
    }
    // show OTP input
    document.getElementById('otpArea').style.display = 'block';
    // if API returned otp (dev), show it to user
    if (data.otp) {
      alert('Dev OTP: ' + data.otp);
      document.getElementById('whatsappCode').value = data.otp;
    }
    btn.innerText = 'OTP Sent';
  } catch (err) {
    alert('Unable to reach server');
    btn.disabled = false; btn.innerText = 'Request OTP';
  }
}

async function verifyWhatsAppOtp() {
  const phone = document.getElementById('whatsappPhone').value.trim();
  const code = document.getElementById('whatsappCode').value.trim();
  if (!phone || !code) { alert('Please enter phone and code'); return; }
  try {
    const res = await fetch(API_BASE + '/api/login/whatsapp/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, code })
    });
    const data = await res.json();
    if (res.ok) {
      alert('Login successful');
      closeWhatsAppLogin();
      // TODO: set client-side session or update UI
    } else {
      alert(data.error || 'Invalid code');
    }
  } catch (err) {
    alert('Unable to reach server');
  }
}








