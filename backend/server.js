const express = require('express');
const sql = require('mssql');
const cors = require('cors');
require('dotenv').config(); // Gizli şifreleri okumak için eklendi

const app = express();
app.use(cors());
app.use(express.json());

const dbConfig = {
    server: '127.0.0.1',
    port: 1433,
    database: 'AkilliOtoparkDB',
    user: 'sa',
    password: process.env.DB_PASSWORD, // Şifreyi .env dosyasından çekiyor
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

// --- TEK BİR SAĞLAM BAĞLANTI (POOL) OLUŞTURUYORUZ ---
// Bu sayede her istekte veritabanı yorulmayacak ve kilitlenmeyecek.
const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log('✅ SQL Veritabanına başarıyla bağlanıldı!');
        return pool;
    })
    .catch(err => {
        console.error('❌ SQL BAĞLANTI HATASI! (SQL kapalı olabilir veya şifre yanlış):', err.message);
        process.exit(1); // Veritabanı yoksa sunucuyu durdur, hatayı net görelim.
    });

// --- GİRİŞ API'Sİ ---
app.get('/api/test-giris', async (req, res) => {
    console.log('📥 Yeni araç giriş isteği tetiklendi!');
    try {
        const pool = await poolPromise; // Hazır olan bağlantıyı kullan
        const bosYer = await pool.request().query('SELECT TOP 1 * FROM ParkYerleri WHERE DoluMu = 0');

        if (bosYer.recordset.length === 0) {
            console.log('❌ Otopark dolu, araç alınamadı.');
            return res.status(400).json({ mesaj: 'Otopark dolu!' });
        }

        const yer = bosYer.recordset[0];
        const biletNo = 'BLT-' + Math.floor(1000 + Math.random() * 9000);

        await pool.request().query(`UPDATE ParkYerleri SET DoluMu = 1, MevcutBiletNo = '${biletNo}' WHERE ParkYeriID = ${yer.ParkYeriID}`);
        await pool.request().query(`INSERT INTO GirisCikisKayitlari (ParkYeriID, BiletNo) VALUES (${yer.ParkYeriID}, '${biletNo}')`);

        console.log(`✅ Araç başarıyla ${yer.ParkYeriAdi} alanına park edildi. Bilet No: ${biletNo}`);
        res.json({ durum: 'BASARILI', parkEdilenYer: yer.ParkYeriAdi, kesilenBilet: biletNo });

    } catch (err) {
        console.error('Giriş Hatası:', err);
        res.status(500).json({ mesaj: 'İşlem sırasında hata oluştu', detay: err.message });
    }
});

// --- ÇIKIŞ API'Sİ ---
app.post('/api/cikis', async (req, res) => {
    const { biletNo } = req.body;
    console.log(`📥 Çıkış isteği ulaştı! Gönderilen Bilet No: ${biletNo}`);

    if (!biletNo) {
        console.log('❌ İstekte bilet numarası eksik!');
        return res.status(400).json({ mesaj: "Lütfen bir bilet numarası girin!" });
    }

    try {
        const pool = await poolPromise; // Hazır olan bağlantıyı kullan
        
        // 1. İçeride bu bilet numarasına sahip, henüz çıkış YAPMAMIŞ bir araç var mı?
        const kayitSorgusu = await pool.request().query(`
            SELECT * FROM GirisCikisKayitlari 
            WHERE BiletNo = '${biletNo}' AND CikisSaati IS NULL
        `);

        if (kayitSorgusu.recordset.length === 0) {
            console.log(`❌ ${biletNo} numaralı bilet içeride bulunamadı.`);
            return res.status(404).json({ mesaj: "❌ İçeride bu bilete ait araç bulunamadı veya zaten çıkış yapmış." });
        }

        const kayit = kayitSorgusu.recordset[0];

        // 2. Çıkış saatini al ve Ücreti Hesapla
        const girisSaati = new Date(kayit.GirisSaati);
        const cikisSaati = new Date();
        
        const farkMilisaniye = cikisSaati - girisSaati;
        const farkDakika = Math.ceil(farkMilisaniye / (1000 * 60)); 
        
        let toplamUcret = 50; 
        if (farkDakika > 60) {
            toplamUcret += (farkDakika - 60) * 1;
        }

        // 3. Veri Tabanını Güncelle
        await pool.request().query(`
            UPDATE GirisCikisKayitlari 
            SET CikisSaati = GETDATE(), ToplamUcret = ${toplamUcret}
            WHERE KayitID = ${kayit.KayitID}
        `);

        await pool.request().query(`
            UPDATE ParkYerleri 
            SET DoluMu = 0, MevcutBiletNo = NULL 
            WHERE ParkYeriID = ${kayit.ParkYeriID}
        `);

        console.log(`✅ ${biletNo} numaralı aracın çıkışı yapıldı. Ücret: ${toplamUcret} TL`);
        res.json({
            durum: "BAŞARILI",
            mesaj: "✅ Araç çıkışı yapıldı!",
            biletNo: biletNo,
            icerideKalinanSure: `${farkDakika} dakika`,
            toplamUcret: `${toplamUcret} TL`
        });

    } catch (err) {
        console.error('Çıkış Hatası:', err);
        res.status(500).json({ mesaj: 'Sunucu hatası', detay: err.message });
    }
});

// --- YENİ: OTOPARK ANLIK DURUM API'Sİ ---
app.get('/api/durum', async (req, res) => {
    try {
        const pool = await poolPromise;
        // Tüm park yerlerini A'dan Z'ye sıralı şekilde veritabanından çekiyoruz
        const sonuc = await pool.request().query('SELECT * FROM ParkYerleri ORDER BY ParkYeriAdi');
        
        // React'a bu listeyi gönderiyoruz
        res.json(sonuc.recordset);
    } catch (err) {
        console.error('Durum Çekme Hatası:', err);
        res.status(500).json({ mesaj: 'Park yerleri getirilemedi', detay: err.message });
    }
});
// ---------------------------------------

// Portu 8080 olarak değiştirdik, 5000 portundaki Windows çakışmalarından kaçınıyoruz.
app.listen(8080, () => console.log('🚀 Sunucu 8080 portunda calisiyor!'));