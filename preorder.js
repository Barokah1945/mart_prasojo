
// Ganti gid sesuai dengan sheet produk preorder Anda
const sheetId = "15g0UFq0fLNbyORzKiITkLzlRduUSvi6TEFhVqoQOedM";
const gid = "0"; // <- Ganti ke GID sheet preorder
const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}`;

fetch(sheetUrl)
  .then(res => res.text())
  .then(data => {
    const json = JSON.parse(data.substr(47).slice(0, -2));
    const products = json.table.rows.map(row => ({
      nama: row.c[0]?.v,
      harga: row.c[1]?.v,
      deskripsi: row.c[2]?.v,
      gambar: row.c[3]?.v,
      hariKirim: row.c[4]?.v,
    }));

    const list = document.getElementById("preorder-list");
    list.innerHTML = products.map(p => `
      <div style="border:1px solid #ccc;padding:10px;margin-bottom:10px;">
        <img src="${p.gambar}" alt="${p.nama}" style="max-width:100px"><br>
        <strong>${p.nama}</strong><br>
        Rp ${p.harga}<br>
        <small>${p.deskripsi}</small><br>
        <div><b>Dikirim:</b> ${p.hariKirim}</div><br>
        <a href="https://wa.me/?text=Halo%20saya%20ingin%20preorder%20${encodeURIComponent(p.nama)}" target="_blank">
          <button>Konfirmasi WA</button>
        </a>
      </div>
    `).join("");
  });
