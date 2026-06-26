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
const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log('✅ SQL Veritabanına başarıyla bağlanıldı!');
        return pool;
    })
    .catch(err => {
        console.error('❌ SQL BAĞLANTI HATASI! (SQL kapalı olabilir veya şifre yanlış):', err.message);
        process.exit(1); 
    });

// --- GİRİŞ API'Sİ ---
app.get('/api/test-giris', async (req, res) => {
    console.log('📥 Yeni araç giriş isteği tetiklendi!');
    try {
        const pool = await poolPromise; 
        const bosYer = await pool.request().query('SELECT TOP 1 * FROM ParkYerleri WHERE DoluMu = 0');

        if (bosYer.recordset.length === 0) {
            console.log('❌ Otopark dolu, araç alınamadı.');
            return res.status(400).json({ mesaj: 'Otopark dolu!' });
        }

        const yer = bosYer.recordset[0];
        const biletNo = 'BLT-' + Math.floor(1000 + Math.random() * 9000);

        // Tarihi yerel saat ile kaydediyoruz
        await pool.request().query(`UPDATE ParkYerleri SET DoluMu = 1, MevcutBiletNo = '${biletNo}', SonGuncelleme = GETDATE() WHERE ParkYeriID = ${yer.ParkYeriID}`);
        
        await pool.request().query(`INSERT INTO GirisCikisKayitlari (ParkYeriID, BiletNo, GirisSaati) VALUES (${yer.ParkYeriID}, '${biletNo}', GETDATE())`);

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
        const pool = await poolPromise; 
        
        // KESİN ÇÖZÜM: Saatin sonuna zorla Türkiye saati (+03:00) damgasını vuruyoruz.
        const kayitSorgusu = await pool.request().query(`
            SELECT 
                KayitID, 
                CONVERT(varchar(19), GirisSaati, 126) + '+03:00' as GirisSaati
            FROM GirisCikisKayitlari 
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

        // 3. Çıkış yapan aracın ücretini ve çıkış saatini kaydet
        await pool.request().query(`
            UPDATE GirisCikisKayitlari 
            SET CikisSaati = GETDATE(), ToplamUcret = ${toplamUcret}
            WHERE KayitID = ${kayit.KayitID}
        `);

        // 4. ÇIKAN ARACIN KUTUSUNU BOŞALT VE SAATİNİ GÜNCELLE
        await pool.request().query(`
            UPDATE ParkYerleri 
            SET DoluMu = 0, MevcutBiletNo = NULL, SonGuncelleme = GETDATE() 
            WHERE MevcutBiletNo = '${biletNo}'
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

// --- OTOPARK ANLIK DURUM API'Sİ ---
app.get('/api/durum', async (req, res) => {
    try {
        const pool = await poolPromise;
        // KESİN ÇÖZÜM: Saatin sonuna zorla Türkiye saati (+03:00) damgasını vuruyoruz.
        const sonuc = await pool.request().query(`
            SELECT 
                ParkYeriID, 
                ParkYeriAdi, 
                DoluMu, 
                MevcutBiletNo, 
                CONVERT(varchar(19), SonGuncelleme, 126) + '+03:00' as SonGuncelleme 
            FROM ParkYerleri 
            ORDER BY ParkYeriAdi
        `);
        res.json(sonuc.recordset);
    } catch (err) {
        console.error('Durum Çekme Hatası:', err);
        res.status(500).json({ mesaj: 'Park yerleri getirilemedi', detay: err.message });
    }
});

// --- KULLANICI GİRİŞ (LOGIN) API'Sİ ---
app.post('/api/login', async (req, res) => {
    const { kullaniciAdi, sifre } = req.body;

    try {
        const pool = await poolPromise;
        
        const sorgu = await pool.request().query(`
            SELECT * FROM Kullanicilar 
            WHERE KullaniciAdi = '${kullaniciAdi}' AND SifreHash = '${sifre}'
        `);

        if (sorgu.recordset.length > 0) {
            const kullanici = sorgu.recordset[0];
            res.json({ durum: 'BASARILI', kullanici: kullanici.KullaniciAdi, rol: kullanici.Rol });
        } else {
            res.status(401).json({ mesaj: '❌ Kullanıcı adı veya şifre hatalı!' });
        }
    } catch (err) {
        console.error('Login Hatası:', err);
        res.status(500).json({ mesaj: 'Sunucu hatası', detay: err.message });
    }
});

app.listen(8080, () => console.log('🚀 Sunucu 8080 portunda calisiyor!'));