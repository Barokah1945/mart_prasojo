const SHEET_ID = "15g0UFq0fLNbyORzKiITkLzlRduUSvi6TEFhVqoQOedM";
const WA_PHONE = "6289697736784";
const CURRENCY_PREFIX = "Rp";
const THOUSANDS = ".";

// Variabel global
let rawProducts = [];
let filteredProducts = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Format mata uang Rupiah
function formatRupiah(num) {
  const intVal = parseInt(num, 10);
  if (isNaN(intVal)) return num;
  return CURRENCY_PREFIX + " " + intVal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS);
}

// Ambil data dari Google Sheet berdasarkan nama sheet
async function fetchSheetData(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
  try {
    const res = await fetch(url);
    const text = await res.text();
    const jsonStr = text.substring(text.indexOf("(") + 1, text.lastIndexOf(")"));
    const dataObj = JSON.parse(jsonStr);
    return gvizToObjects(dataObj.table);
  } catch (error) {
    console.error("Error fetching sheet data:", error);
    return [];
  }
}

// Konversi data Google Visualization ke object
function gvizToObjects(table) {
  const cols = table.cols.map(c => c.label || c.id);
  return table.rows.map(r => {
    const obj = {};
    cols.forEach((col, i) => obj[col] = r.c[i] ? r.c[i].v : "");
    return obj;
  });
}

// Normalisasi data produk untuk halaman utama (index.html)
function normalizeIndexProducts(p) {
  return {
    Nama: p["Nama"],
    Kategori: p["Kategori"],
    Harga: parseInt(p["Harga"]) || 0,
    Stok: p["Stok"],
    Deskripsi: p["Deskripsi"] || "",
    FotoURL: p["FotoURL"] || "placeholder.jpg",
    Aktif: p["Aktif"] || "TRUE"
  };
}

// Normalisasi data produk untuk halaman preorder (preorder.html)
function normalizePreorderProducts(p) {
  return {
    Nama: p["Nama"],
    Kategori: p["Kategori"],
    Harga: parseInt(p["Harga"]) || 0,
    HariKirim: p["HariKirim"] || "Setiap Hari",
    Deskripsi: p["Deskripsi"] || "",
    FotoURL: p["FotoURL"] || "placeholder.jpg",
    Aktif: p["Aktif"] || "TRUE",
    Preorder: p["Preorder"] || "FALSE"
  };
}

// Filter produk untuk halaman utama
function applyIndexFilters() {
  const searchQuery = document.getElementById('search-input')?.value.trim().toLowerCase() || '';
  const category = document.getElementById('category-filter')?.value || '';

  filteredProducts = rawProducts.filter(p => {
    if (String(p.Aktif).toLowerCase() === 'false') return false;
    
    const searchText = `${p.Nama} ${p.Deskripsi} ${p.Kategori}`.toLowerCase();
    if (searchQuery && !searchText.includes(searchQuery)) return false;
    
    if (category && p.Kategori !== category) return false;
    
    return true;
  });

  renderProducts();
}

// Filter produk untuk halaman preorder
function applyPreorderFilters() {
  const searchQuery = document.getElementById('search-input')?.value.trim().toLowerCase() || '';
  const category = document.getElementById('category-filter')?.value || '';
  const day = document.getElementById('day-filter')?.value || '';

  filteredProducts = rawProducts.filter(p => {
    if (String(p.Aktif).toLowerCase() === 'false') return false;
    if (String(p.Preorder).toLowerCase() !== 'true') return false;
    
    const searchText = `${p.Nama} ${p.Deskripsi} ${p.Kategori}`.toLowerCase();
    if (searchQuery && !searchText.includes(searchQuery)) return false;
    
    if (category && p.Kategori !== category) return false;
    
    if (day && !p.HariKirim.includes(day)) return false;
    
    return true;
  });

  renderProducts();
}

// Render daftar produk
function renderProducts() {
  const productList = document.getElementById('product-list');
  if (!productList) return;
  
  productList.innerHTML = '';
  
  if (!filteredProducts.length) {
    productList.innerHTML = '<div class="empty-state">Tidak ada produk yang sesuai</div>';
    return;
  }

  filteredProducts.forEach(p => {
    const productCard = document.createElement('div');
    productCard.className = 'product-card';
    
    // Tampilan berbeda untuk preorder
    const isPreorderPage = document.getElementById('day-filter') !== null;
    const deliveryInfo = isPreorderPage ? `<p class="delivery-day">Hari Kirim: ${p.HariKirim}</p>` : `<p class="stock">Stok: ${p.Stok}</p>`;
    
    productCard.innerHTML = `
      <img src="${p.FotoURL}" alt="${p.Nama}" loading="lazy">
      <div class="product-info">
        <h3>${p.Nama}</h3>
        <p class="price">${formatRupiah(p.Harga)}</p>
        ${deliveryInfo}
        <p class="description">${p.Deskripsi}</p>
        <button class="add-to-cart" data-name="${p.Nama}">Tambah ke Keranjang</button>
      </div>
    `;
    productList.appendChild(productCard);
  });

  // Tambahkan event listener untuk tombol keranjang
  document.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', e => {
      const productName = e.target.dataset.name;
      const product = rawProducts.find(p => p.Nama === productName);
      if (product) addToCart(product);
    });
  });
}

// [Fungsi-fungsi keranjang belanja dan checkout tetap sama seperti sebelumnya...]
// ... (renderCart, addToCart, updateQuantity, removeFromCart, saveCart, checkoutWA)

// Inisialisasi berdasarkan halaman
async function init() {
  // Tentukan sheet mana yang akan diambil berdasarkan halaman
  const isPreorderPage = window.location.pathname.includes('preorder.html');
  const sheetName = isPreorderPage ? "Sheet2" : "Sheet1";
  
  // Ambil data dari sheet yang sesuai
  const rawData = await fetchSheetData(sheetName);
  
  // Normalisasi data berdasarkan halaman
  rawProducts = isPreorderPage 
    ? rawData.map(normalizePreorderProducts)
    : rawData.map(normalizeIndexProducts);
  
  filteredProducts = [...rawProducts];
  
  // Setup filter berdasarkan halaman
  if (isPreorderPage) {
    setupPreorderFilters();
    applyPreorderFilters();
  } else {
    setupIndexFilters();
    applyIndexFilters();
  }
  
  renderCart();
}

// Setup filter untuk halaman utama
function setupIndexFilters() {
  const categories = [...new Set(rawProducts.map(p => p.Kategori))];
  const categoryFilter = document.getElementById('category-filter');
  
  if (categoryFilter) {
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      categoryFilter.appendChild(option);
    });
    
    categoryFilter.addEventListener('change', applyIndexFilters);
  }
  
  document.getElementById('search-input')?.addEventListener('input', applyIndexFilters);
}

// Setup filter untuk halaman preorder
function setupPreorderFilters() {
  const categories = [...new Set(rawProducts.map(p => p.Kategori))];
  const days = [...new Set(rawProducts.flatMap(p => p.HariKirim.split(/,\s*/)))];
  
  const categoryFilter = document.getElementById('category-filter');
  const dayFilter = document.getElementById('day-filter');
  
  if (categoryFilter) {
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      categoryFilter.appendChild(option);
    });
    
    categoryFilter.addEventListener('change', applyPreorderFilters);
  }
  
  if (dayFilter) {
    days.forEach(day => {
      const option = document.createElement('option');
      option.value = day;
      option.textContent = day;
      dayFilter.appendChild(option);
    });
    
    dayFilter.addEventListener('change', applyPreorderFilters);
  }
  
  document.getElementById('search-input')?.addEventListener('input', applyPreorderFilters);
}

// Panggil fungsi inisialisasi ketika DOM siap
document.addEventListener('DOMContentLoaded', init);

// Fungsi global untuk diakses dari HTML
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
window.checkoutWA = checkoutWA;
