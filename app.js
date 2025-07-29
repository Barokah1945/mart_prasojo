// Konfigurasi
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
  const intVal = parseInt(num) || 0;
  return CURRENCY_PREFIX + " " + intVal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS);
}

// Ambil data dari Google Sheet
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

function gvizToObjects(table) {
  const cols = table.cols.map(c => c.label || c.id);
  return table.rows.map(r => {
    const obj = {};
    cols.forEach((col, i) => obj[col] = r.c[i] ? r.c[i].v : "");
    return obj;
  });
}

// Filter khusus preorder
function applyPreorderFilters() {
  const category = document.getElementById('category-filter')?.value || '';
  const day = document.getElementById('day-filter')?.value || '';
  
  filteredProducts = rawProducts.filter(p => {
    // Hanya tampilkan produk dengan Preorder = TRUE
    if (String(p.Preorder).toUpperCase() !== 'TRUE') return false;
    
    // Filter kategori
    if (category && p.Kategori !== category) return false;
    
    // Filter hari kirim
    if (day && !p.HariKirim.includes(day)) return false;
    
    return true;
  });
  
  renderProducts();
}

// Render produk preorder
function renderProducts() {
  const productList = document.getElementById('product-list');
  if (!productList) return;
  
  productList.innerHTML = '';
  
  if (filteredProducts.length === 0) {
    productList.innerHTML = '<div class="empty-message">Tidak ada produk preorder yang tersedia</div>';
    return;
  }

  filteredProducts.forEach(p => {
    const productCard = document.createElement('div');
    productCard.className = 'preorder-product-card';
    productCard.innerHTML = `
      <div class="product-image-container">
        <img src="${p.FotoURL || 'img/placeholder.jpg'}" alt="${p.Nama}" class="product-image">
      </div>
      <div class="product-details">
        <h3 class="product-name">${p.Nama}</h3>
        <p class="product-price">${formatRupiah(p.Harga)}</p>
        <p class="delivery-days"><strong>Hari Kirim:</strong> ${p.HariKirim}</p>
        <p class="product-description">${p.Deskripsi || ''}</p>
        <button class="add-to-cart-btn" data-name="${p.Nama}">+ Tambah ke Keranjang</button>
      </div>
    `;
    productList.appendChild(productCard);
  });

  // Event listeners untuk tombol keranjang
  document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const productName = e.target.dataset.name;
      const product = rawProducts.find(p => p.Nama === productName);
      if (product) addToCart(product);
    });
  });
}

// Fungsi keranjang belanja (tetap sama seperti sebelumnya)
// ... [fungsi addToCart, removeFromCart, updateQuantity, renderCart, dll]

// Inisialisasi khusus preorder
async function initPreorderPage() {
  // Ambil data dari Sheet2 khusus preorder
  rawProducts = (await fetchSheetData("Sheet2")).map(p => ({
    Nama: p["Nama"],
    Kategori: p["Kategori"],
    Harga: parseInt(p["Harga"]) || 0,
    HariKirim: p["Hari Kirim"] || p["HariKirim"] || "Setiap Hari",
    Deskripsi: p["Deskripsi"] || "",
    FotoURL: p["FotoURL"] || "img/placeholder.jpg",
    Preorder: p["Preorder"] || "FALSE"
  }));
  
  // Setup filter dropdown
  const categories = [...new Set(rawProducts.filter(p => p.Preorder === "TRUE").map(p => p.Kategori))];
  const days = [...new Set(rawProducts.flatMap(p => (p.HariKirim || "").split(/,\s*/)).filter(Boolean))];
  
  populateDropdown('category-filter', categories);
  populateDropdown('day-filter', days);
  
  // Event listeners untuk filter
  document.getElementById('category-filter')?.addEventListener('change', applyPreorderFilters);
  document.getElementById('day-filter')?.addEventListener('change', applyPreorderFilters);
  
  // Render awal
  applyPreorderFilters();
  renderCart();
}

function populateDropdown(id, options) {
  const dropdown = document.getElementById(id);
  if (!dropdown) return;
  
  dropdown.innerHTML = '<option value="">Semua</option>';
  options.forEach(option => {
    const optElement = document.createElement('option');
    optElement.value = option;
    optElement.textContent = option;
    dropdown.appendChild(optElement);
  });
}

// Deteksi halaman dan inisialisasi
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('preorder.html')) {
    initPreorderPage();
  }
});
