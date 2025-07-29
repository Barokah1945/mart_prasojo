// Konfigurasi
const SHEET_ID = "15g0UFq0fLNbyORzKiITkLzlRduUSvi6TEFhVqoQOedM";
const SHEET_READY = "Sheet1"; // Untuk produk ready
const SHEET_PREORDER = "Sheet2"; // Untuk produk preorder
const WA_PHONE = "6289697736784";
const CURRENCY_PREFIX = "Rp";
const THOUSANDS = ".";

// Variabel global
let products = [];
let filteredProducts = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Format mata uang Rupiah
function formatRupiah(num) {
  const intVal = parseInt(num) || 0;
  return CURRENCY_PREFIX + " " + intVal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS);
}

// Ambil data dari Google Sheet
async function fetchProducts() {
  const isPreorderPage = window.location.pathname.includes('preorder.html');
  const sheetName = isPreorderPage ? SHEET_PREORDER : SHEET_READY;
  
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
  
  try {
    const res = await fetch(url);
    const text = await res.text();
    const jsonStr = text.substring(text.indexOf("(") + 1, text.lastIndexOf(")"));
    const data = JSON.parse(jsonStr);
    
    const cols = data.table.cols.map(c => c.label || c.id);
    products = data.table.rows.map(row => {
      let obj = {};
      cols.forEach((header, i) => {
        obj[header.toLowerCase()] = row.c[i] ? row.c[i].v : "";
      });
      return obj;
    });
    
    // Filter khusus preorder
    if (isPreorderPage) {
      products = products.filter(p => p.preorder && p.preorder.toString().toUpperCase() === "TRUE");
    }
    
    return products;
  } catch (error) {
    console.error("Error loading products:", error);
    return [];
  }
}

// Render produk
function renderProducts() {
  const productContainer = document.getElementById('product-container');
  if (!productContainer) return;
  
  productContainer.innerHTML = '';
  
  if (filteredProducts.length === 0) {
    productContainer.innerHTML = `
      <div class="empty-product">
        <i class="fas fa-box-open"></i>
        <p>Tidak ada produk yang ditemukan</p>
      </div>
    `;
    return;
  }
  
  filteredProducts.forEach(product => {
    const productCard = document.createElement('div');
    productCard.className = 'product-card';
    
    const isPreorder = window.location.pathname.includes('preorder.html');
    const stockInfo = isPreorder 
      ? `<div class="product-day"><i class="fas fa-calendar-day"></i> ${product.harikirim || 'Setiap Hari'}</div>`
      : `<div class="product-stock"><i class="fas fa-cubes"></i> ${product.stok || '0'}</div>`;
    
    productCard.innerHTML = `
      <div class="product-img">
        <img src="${product.fotourl || 'img/no-image.jpg'}" alt="${product.nama}" loading="lazy">
      </div>
      <div class="product-info">
        <h3 class="product-name">${product.nama}</h3>
        <p class="product-desc">${product.deskripsi || ''}</p>
        <div class="product-meta">
          ${stockInfo}
          <div class="product-price">${formatRupiah(product.harga)}</div>
        </div>
        <button class="add-cart" data-id="${product.nama}">
          <i class="fas fa-cart-plus"></i> Tambah
        </button>
      </div>
    `;
    
    productContainer.appendChild(productCard);
  });
  
  // Tambahkan event listener untuk tombol keranjang
  document.querySelectorAll('.add-cart').forEach(btn => {
    btn.addEventListener('click', function() {
      const productName = this.getAttribute('data-id');
      addToCart(productName);
    });
  });
}

// Filter produk
function filterProducts() {
  const searchValue = document.getElementById('search-input')?.value.toLowerCase() || '';
  const categoryValue = document.getElementById('category-filter')?.value || '';
  const dayValue = document.getElementById('day-filter')?.value || '';
  
  filteredProducts = products.filter(product => {
    // Filter pencarian
    const searchMatch = product.nama.toLowerCase().includes(searchValue) || 
                       product.deskripsi.toLowerCase().includes(searchValue);
    
    // Filter kategori
    const categoryMatch = !categoryValue || product.kategori === categoryValue;
    
    // Filter hari (khusus preorder)
    const dayMatch = !dayValue || 
                    (product.harikirim && product.harikirim.toLowerCase().includes(dayValue.toLowerCase()));
    
    return searchMatch && categoryMatch && (window.location.pathname.includes('preorder.html') ? dayMatch : true);
  });
  
  renderProducts();
}

// Fungsi keranjang belanja
function addToCart(productName) {
  const product = products.find(p => p.nama === productName);
  if (!product) return;
  
  const existingItem = cart.find(item => item.name === productName);
  
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      name: product.nama,
      price: product.harga,
      quantity: 1,
      image: product.fotourl || 'img/no-image.jpg',
      day: product.harikirim || ''
    });
  }
  
  saveCart();
  renderCart();
}

function renderCart() {
  const cartItemsEl = document.getElementById('cart-items');
  const cartTotalEl = document.getElementById('cart-total');
  const cartCountEl = document.getElementById('cart-count');
  
  if (!cartItemsEl) return;
  
  cartItemsEl.innerHTML = '';
  let total = 0;
  
  if (cart.length === 0) {
    cartItemsEl.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart"></i> Keranjang kosong</div>';
    cartTotalEl.textContent = formatRupiah(0);
    if (cartCountEl) cartCountEl.textContent = '0';
    return;
  }
  
  cart.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;
    
    const cartItem = document.createElement('div');
    cartItem.className = 'cart-item';
    cartItem.innerHTML = `
      <div class="cart-item-img">
        <img src="${item.image}" alt="${item.name}">
      </div>
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <p>${formatRupiah(item.price)} x ${item.quantity}</p>
        ${item.day ? `<p><small>Kirim: ${item.day}</small></p>` : ''}
      </div>
      <div class="cart-item-actions">
        <button class="cart-item-decrease" data-index="${index}">-</button>
        <span>${item.quantity}</span>
        <button class="cart-item-increase" data-index="${index}">+</button>
        <button class="cart-item-remove" data-index="${index}"><i class="fas fa-trash"></i></button>
      </div>
    `;
    
    cartItemsEl.appendChild(cartItem);
  });
  
  // Update total dan count
  cartTotalEl.textContent = formatRupiah(total);
  if (cartCountEl) cartCountEl.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
  
  // Tambahkan event listeners
  document.querySelectorAll('.cart-item-increase').forEach(btn => {
    btn.addEventListener('click', function() {
      const index = parseInt(this.getAttribute('data-index'));
      updateQuantity(index, cart[index].quantity + 1);
    });
  });
  
  document.querySelectorAll('.cart-item-decrease').forEach(btn => {
    btn.addEventListener('click', function() {
      const index = parseInt(this.getAttribute('data-index'));
      updateQuantity(index, cart[index].quantity - 1);
    });
  });
  
  document.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', function() {
      const index = parseInt(this.getAttribute('data-index'));
      removeFromCart(index);
    });
  });
}

function updateQuantity(index, newQuantity) {
  if (newQuantity < 1) {
    removeFromCart(index);
    return;
  }
  
  cart[index].quantity = newQuantity;
  saveCart();
  renderCart();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  saveCart();
  renderCart();
}

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

// Checkout via WhatsApp
function checkout() {
  if (cart.length === 0) {
    alert('Keranjang belanja kosong!');
    return;
  }
  
  const isPreorder = window.location.pathname.includes('preorder.html');
  const orderType = isPreorder ? 'PREORDER' : 'READY STOCK';
  
  let message = `Halo Warung Prasojo, saya ingin memesan (${orderType}):\n\n`;
  
  cart.forEach(item => {
    message += `➡️ ${item.name}\n`;
    message += `   ${item.quantity} x ${formatRupiah(item.price)}\n`;
    if (item.day) message += `   Hari Kirim: ${item.day}\n`;
    message += `   Subtotal: ${formatRupiah(item.price * item.quantity)}\n\n`;
  });
  
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  message += `TOTAL: ${formatRupiah(total)}\n\n`;
  message += `Nama: \nAlamat: \nNo. HP: \n\n`;
  message += `Terima kasih.`;
  
  const encodedMessage = encodeURIComponent(message);
  window.open(`https://wa.me/${WA_PHONE}?text=${encodedMessage}`, '_blank');
}

// Inisialisasi filter dropdown
async function initFilters() {
  const isPreorder = window.location.pathname.includes('preorder.html');
  await fetchProducts();
  
  // Filter kategori
  const categories = [...new Set(products.map(p => p.kategori))];
  const categoryFilter = document.getElementById('category-filter');
  
  if (categoryFilter) {
    categoryFilter.innerHTML = '<option value="">Semua Kategori</option>';
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      categoryFilter.appendChild(option);
    });
    
    categoryFilter.addEventListener('change', filterProducts);
  }
  
  // Filter hari (khusus preorder)
  if (isPreorder) {
    const days = [...new Set(products.flatMap(p => p.harikirim ? p.harikirim.split(/,\s*/) : []))];
    const dayFilter = document.getElementById('day-filter');
    
    if (dayFilter) {
      dayFilter.innerHTML = '<option value="">Semua Hari</option>';
      days.forEach(day => {
        const option = document.createElement('option');
        option.value = day.trim();
        option.textContent = day.trim();
        dayFilter.appendChild(option);
      });
      
      dayFilter.addEventListener('change', filterProducts);
    }
  }
  
  // Search input
  document.getElementById('search-input')?.addEventListener('input', filterProducts);
  
  // Checkout button
  document.getElementById('checkout-btn')?.addEventListener('click', checkout);
  
  // QRIS button
  document.getElementById('qris-btn')?.addEventListener('click', () => {
    localStorage.setItem('checkoutData', JSON.stringify({
      items: cart,
      total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    }));
    window.location.href = 'qris.html';
  });
  
  // Render awal
  filteredProducts = [...products];
  renderProducts();
  renderCart();
}

// Jalankan saat DOM siap
document.addEventListener('DOMContentLoaded', initFilters);
