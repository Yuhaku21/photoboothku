# Photoboothku

Photobooth online untuk membuat photo strip langsung dari browser.

Efek kamera menyediakan pilihan latar mengikuti tema, latar blur, atau warna solid, serta pemulusan wajah natural. Efek latar dan wajah diproses di browser saat foto diambil; model MediaPipe dimuat dari jsDelivr dan tidak digunakan untuk mengenali identitas.

Pilihan tema juga mencakup 12 desain frame scrapbook berdasarkan referensi `design frame.jpeg`. Kartu tema memakai emoji stiker, sementara desain frame disajikan dari `public/design-frames.jpeg` dan dipadukan dengan foto di browser. Layout 3 foto, strip 4 foto, grid 2×2, dan grid 2×3 dapat dipilih saat menggunakan frame scrapbook.

## Menjalankan photobooth

Photobooth berjalan langsung di browser dan tidak memerlukan Cordova, Android Studio, atau JDK. Pastikan Node.js 18 atau lebih baru sudah terpasang, lalu jalankan:

```sh
npm start
```

Buka `http://localhost:3000` di browser dan izinkan akses kamera saat diminta. Untuk mengaksesnya dari perangkat lain, gunakan hosting dengan HTTPS karena browser mensyaratkan koneksi aman untuk kamera. Mode berdua online, Google Fonts, PeerJS, dan model MediaPipe memerlukan koneksi internet.

Mode berdua online, Google Fonts, PeerJS, dan model MediaPipe memerlukan koneksi internet. Untuk build iOS, tambahkan platform dari Mac meskipun proyeknya dikembangkan di Windows.
