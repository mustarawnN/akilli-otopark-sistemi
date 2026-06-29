const express = require('express');
const sql = require('mssql');
const cors = require('cors');
require('dotenv').config(); 

const app = express();
app.use(cors());
app.use(express.json());

const dbConfig = {
    server: '127.0.0.1',
    port: 1433,
    database: 'AkilliOtoparkDB',
    user: 'sa',
    password: process.env.DB_PASSWORD, 
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

// --- TEK BİR SAĞLAM BAĞLANTI (POOL) ---
const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log('✅ SQL Veritabanına başarıyla bağlanıldı!');
        return pool;
    })
    .catch(err => {
        console.error('❌ SQL BAĞLANTI HATASI!:', err.message);
        process.exit(1); 
    });

// --- YENİ: İSTATİSTİK (DASHBOARD) API'Sİ ---
app.get('/api/istatistik', async (req, res) => {
    try {
        const pool = await poolPromise;
        const sorgu = await pool.request().query(`
            DECLARE @GunlukCiro DECIMAL(10,2);
            DECLARE @DoluAracSayisi INT;
            DECLARE @ToplamKapasite INT;
            DECLARE @BugunGirenArac INT;

            -- Bugünkü toplam kazancı hesapla
            SELECT @GunlukCiro = ISNULL(SUM(ToplamUcret), 0) 
            FROM GirisCikisKayitlari 
            WHERE CAST(CikisSaati AS DATE) = CAST(GETDATE() AS DATE);

            -- Dolu yerleri say
            SELECT @DoluAracSayisi = COUNT(*) FROM ParkYerleri WHERE DoluMu = 1;
            
            -- Otoparkın toplam kapasitesini al
            SELECT @ToplamKapasite = COUNT(*) FROM ParkYerleri;
            
            -- Bugün içeri giren toplam araç sayısını bul
            SELECT @BugunGirenArac = COUNT(*) 
            FROM GirisCikisKayitlari 
            WHERE CAST(GirisSaati AS DATE) = CAST(GETDATE() AS DATE);

            -- Hepsini tek bir paket yapıp React'a gönder
            SELECT 
                @GunlukCiro AS GunlukCiro, 
                @DoluAracSayisi AS DoluAracSayisi, 
                @ToplamKapasite AS ToplamKapasite,
                @BugunGirenArac AS BugunGirenArac;
        `);
        res.json(sorgu.recordset[0]);
    } catch (err) {
        console.error('İstatistik Çekme Hatası:', err);
        res.status(500).json({ mesaj: 'İstatistikler getirilemedi', detay: err.message });
    }
});

// --- GİRİŞ API'Sİ ---
app.get('/api/test-giris', async (req, res) => {
    try {
        const pool = await poolPromise; 
        const bosYer = await pool.request().query('SELECT TOP 1 * FROM ParkYerleri WHERE DoluMu = 0');

        if (bosYer.recordset.length === 0) {
            return res.status(400).json({ mesaj: 'Otopark dolu!' });
        }

        const yer = bosYer.recordset[0];
        const biletNo = 'BLT-' + Math.floor(1000 + Math.random() * 9000);

        await pool.request().query(`UPDATE ParkYerleri SET DoluMu = 1, MevcutBiletNo = '${biletNo}', SonGuncelleme = GETDATE() WHERE ParkYeriID = ${yer.ParkYeriID}`);
        await pool.request().query(`INSERT INTO GirisCikisKayitlari (ParkYeriID, BiletNo, GirisSaati) VALUES (${yer.ParkYeriID}, '${biletNo}', GETDATE())`);

        res.json({ durum: 'BASARILI', parkEdilenYer: yer.ParkYeriAdi, kesilenBilet: biletNo });
    } catch (err) {
        res.status(500).json({ mesaj: 'İşlem sırasında hata oluştu', detay: err.message });
    }
});

// --- ÇIKIŞ API'Sİ ---
app.post('/api/cikis', async (req, res) => {
    const { biletNo } = req.body;
    if (!biletNo) return res.status(400).json({ mesaj: "Lütfen bir bilet numarası girin!" });

    try {
        const pool = await poolPromise; 
        const kayitSorgusu = await pool.request().query(`
            SELECT KayitID, CONVERT(varchar(19), GirisSaati, 126) + '+03:00' as GirisSaati
            FROM GirisCikisKayitlari WHERE BiletNo = '${biletNo}' AND CikisSaati IS NULL
        `);

        if (kayitSorgusu.recordset.length === 0) {
            return res.status(404).json({ mesaj: "❌ İçeride bu bilete ait araç bulunamadı." });
        }

        const kayit = kayitSorgusu.recordset[0];
        const girisSaati = new Date(kayit.GirisSaati); 
        const cikisSaati = new Date(); 
        
        const farkMilisaniye = cikisSaati - girisSaati;
        const farkDakika = Math.ceil(farkMilisaniye / (1000 * 60)); 
        
        let toplamUcret = 50; 
        if (farkDakika > 60) toplamUcret += (farkDakika - 60) * 1;

        await pool.request().query(`UPDATE GirisCikisKayitlari SET CikisSaati = GETDATE(), ToplamUcret = ${toplamUcret} WHERE KayitID = ${kayit.KayitID}`);
        await pool.request().query(`UPDATE ParkYerleri SET DoluMu = 0, MevcutBiletNo = NULL, SonGuncelleme = GETDATE() WHERE MevcutBiletNo = '${biletNo}'`);

        res.json({ durum: "BAŞARILI", mesaj: "✅ Araç çıkışı yapıldı!", biletNo, icerideKalinanSure: `${farkDakika} dakika`, toplamUcret: `${toplamUcret} TL` });
    } catch (err) {
        res.status(500).json({ mesaj: 'Sunucu hatası', detay: err.message });
    }
});

// --- OTOPARK ANLIK DURUM API'Sİ ---
app.get('/api/durum', async (req, res) => {
    try {
        const pool = await poolPromise;
        const sonuc = await pool.request().query(`SELECT ParkYeriID, ParkYeriAdi, DoluMu, MevcutBiletNo, CONVERT(varchar(19), SonGuncelleme, 126) + '+03:00' as SonGuncelleme FROM ParkYerleri ORDER BY ParkYeriAdi`);
        res.json(sonuc.recordset);
    } catch (err) {
        res.status(500).json({ mesaj: 'Park yerleri getirilemedi' });
    }
});

// --- KULLANICI GİRİŞ (LOGIN) API'Sİ ---
app.post('/api/login', async (req, res) => {
    const { kullaniciAdi, sifre } = req.body;
    try {
        const pool = await poolPromise;
        const sorgu = await pool.request().query(`SELECT * FROM Kullanicilar WHERE KullaniciAdi = '${kullaniciAdi}' AND SifreHash = '${sifre}'`);

        if (sorgu.recordset.length > 0) {
            res.json({ durum: 'BASARILI', kullanici: sorgu.recordset[0].KullaniciAdi });
        } else {
            res.status(401).json({ mesaj: '❌ Kullanıcı adı veya şifre hatalı!' });
        }
    } catch (err) {
        res.status(500).json({ mesaj: 'Sunucu hatası' });
    }
});

app.listen(8080, () => console.log('🚀 Sunucu 8080 portunda calisiyor!'));