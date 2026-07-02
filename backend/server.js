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
        console.log('SQL Veritabanına başarıyla bağlanıldı.');
        return pool;
    })
    .catch(err => {
        console.error('SQL BAĞLANTI HATASI:', err.message);
        process.exit(1);
    });

// --- İSTATİSTİK (DASHBOARD) API'Sİ ---
app.get('/api/istatistik', async (req, res) => {
    try {
        const pool = await poolPromise;
        const sorgu = await pool.request().query(`
            DECLARE @GunlukCiro DECIMAL(10,2);
            DECLARE @DoluAracSayisi INT;
            DECLARE @ToplamKapasite INT;
            DECLARE @BugunGirenArac INT;

            SELECT @GunlukCiro = ISNULL(SUM(ToplamUcret), 0)
            FROM GirisCikisKayitlari
            WHERE CAST(CikisSaati AS DATE) = CAST(GETDATE() AS DATE);

            SELECT @DoluAracSayisi = COUNT(*) FROM ParkYerleri WHERE DoluMu = 1;
            SELECT @ToplamKapasite = COUNT(*) FROM ParkYerleri;

            SELECT @BugunGirenArac = COUNT(*)
            FROM GirisCikisKayitlari
            WHERE CAST(GirisSaati AS DATE) = CAST(GETDATE() AS DATE);

            SELECT
                @GunlukCiro AS GunlukCiro,
                @DoluAracSayisi AS DoluAracSayisi,
                @ToplamKapasite AS ToplamKapasite,
                @BugunGirenArac AS BugunGirenArac;
        `);
        res.json(sorgu.recordset[0]);
    } catch (err) {
        console.error('İstatistik Çekme Hatası:', err);
        res.status(500).json({ durum: 'HATA', mesaj: 'İstatistikler getirilemedi', detay: err.message });
    }
});

// --- ARAÇ GİRİŞ API'Sİ (PLAKA BAZLI) ---
app.post('/api/giris', async (req, res) => {
    const { plaka } = req.body;
    if (!plaka || !plaka.trim()) {
        return res.status(400).json({ durum: 'HATA', mesaj: 'Plaka bilgisi zorunludur!' });
    }

    const temizPlaka = plaka.trim().toUpperCase().replace(/\s+/g, ' ');
    const plakaRegex = /^\d{2}\s?[A-PRSTUVYZ]{1,3}\s?\d{2,4}$/;
    if (!plakaRegex.test(temizPlaka)) {
        return res.status(400).json({ durum: 'HATA', mesaj: 'Geçersiz plaka formatı! Örn: 34 ABC 1234' });
    }

    try {
        const pool = await poolPromise;

        // Aynı plaka zaten içeride mi?
        const mevcutKontrol = await pool.request()
            .input('plaka', sql.NVarChar, temizPlaka)
            .query('SELECT TOP 1 * FROM ParkYerleri WHERE MevcutPlaka = @plaka AND DoluMu = 1');

        if (mevcutKontrol.recordset.length > 0) {
            return res.status(400).json({ durum: 'HATA', mesaj: 'Bu plakaya ait araç zaten içeride!' });
        }

        const bosYer = await pool.request().query('SELECT TOP 1 * FROM ParkYerleri WHERE DoluMu = 0');
        if (bosYer.recordset.length === 0) {
            return res.status(400).json({ durum: 'HATA', mesaj: 'Otopark dolu!' });
        }

        const yer = bosYer.recordset[0];

        await pool.request()
            .input('plaka', sql.NVarChar, temizPlaka)
            .input('parkYeriId', sql.Int, yer.ParkYeriID)
            .query(`UPDATE ParkYerleri SET DoluMu = 1, MevcutPlaka = @plaka, SonGuncelleme = GETDATE() WHERE ParkYeriID = @parkYeriId`);

        await pool.request()
            .input('parkYeriId', sql.Int, yer.ParkYeriID)
            .input('plaka', sql.NVarChar, temizPlaka)
            .query(`INSERT INTO GirisCikisKayitlari (ParkYeriID, Plaka, GirisSaati) VALUES (@parkYeriId, @plaka, GETDATE())`);

        res.json({
            durum: 'BASARILI',
            mesaj: 'Araç girişi kaydedildi.',
            parkEdilenYer: yer.ParkYeriAdi,
            plaka: temizPlaka
        });
    } catch (err) {
        res.status(500).json({ durum: 'HATA', mesaj: 'İşlem sırasında hata oluştu', detay: err.message });
    }
});

// --- ARAÇ ÇIKIŞ API'Sİ (PLAKA BAZLI) ---
app.post('/api/cikis', async (req, res) => {
    const { plaka } = req.body;
    if (!plaka) return res.status(400).json({ durum: 'HATA', mesaj: 'Lütfen bir plaka girin!' });

    const temizPlaka = plaka.trim().toUpperCase();

    try {
        const pool = await poolPromise;
        const kayitSorgusu = await pool.request()
            .input('plaka', sql.NVarChar, temizPlaka)
            .query(`
                SELECT KayitID, CONVERT(varchar(19), GirisSaati, 126) + '+03:00' as GirisSaati
                FROM GirisCikisKayitlari WHERE Plaka = @plaka AND CikisSaati IS NULL
            `);

        if (kayitSorgusu.recordset.length === 0) {
            return res.status(404).json({ durum: 'HATA', mesaj: 'İçeride bu plakaya ait araç bulunamadı.' });
        }

        const kayit = kayitSorgusu.recordset[0];
        const girisSaati = new Date(kayit.GirisSaati);
        const cikisSaati = new Date();
        const farkMilisaniye = cikisSaati - girisSaati;
        const farkDakika = Math.ceil(farkMilisaniye / (1000 * 60));

        let toplamUcret = 50;
        if (farkDakika > 60) toplamUcret += (farkDakika - 60) * 1;

        await pool.request()
            .input('kayitId', sql.Int, kayit.KayitID)
            .input('ucret', sql.Decimal(10, 2), toplamUcret)
            .query(`UPDATE GirisCikisKayitlari SET CikisSaati = GETDATE(), ToplamUcret = @ucret WHERE KayitID = @kayitId`);

        await pool.request()
            .input('plaka', sql.NVarChar, temizPlaka)
            .query(`UPDATE ParkYerleri SET DoluMu = 0, MevcutPlaka = NULL, SonGuncelleme = GETDATE() WHERE MevcutPlaka = @plaka`);

        res.json({
            durum: 'BASARILI',
            mesaj: 'Araç çıkışı yapıldı.',
            plaka: temizPlaka,
            icerideKalinanSure: `${farkDakika} dakika`,
            toplamUcret: `${toplamUcret} TL`
        });
    } catch (err) {
        res.status(500).json({ durum: 'HATA', mesaj: 'Sunucu hatası', detay: err.message });
    }
});

// --- OTOPARK ANLIK DURUM API'Sİ ---
app.get('/api/durum', async (req, res) => {
    try {
        const pool = await poolPromise;
        const sonuc = await pool.request().query(`
            SELECT ParkYeriID, ParkYeriAdi, DoluMu, MevcutPlaka,
                   CONVERT(varchar(19), SonGuncelleme, 126) + '+03:00' as SonGuncelleme
            FROM ParkYerleri ORDER BY ParkYeriAdi
        `);
        res.json(sonuc.recordset);
    } catch (err) {
        res.status(500).json({ durum: 'HATA', mesaj: 'Park yerleri getirilemedi' });
    }
});

// --- KULLANICI GİRİŞ (LOGIN) API'Sİ ---
app.post('/api/login', async (req, res) => {
    const { kullaniciAdi, sifre } = req.body;
    try {
        const pool = await poolPromise;
        const sorgu = await pool.request()
            .input('kullaniciAdi', sql.NVarChar, kullaniciAdi)
            .input('sifre', sql.NVarChar, sifre)
            .query('SELECT * FROM Kullanicilar WHERE KullaniciAdi = @kullaniciAdi AND SifreHash = @sifre');

        if (sorgu.recordset.length > 0) {
            res.json({ durum: 'BASARILI', kullanici: sorgu.recordset[0].KullaniciAdi });
        } else {
            res.status(401).json({ durum: 'HATA', mesaj: 'Kullanıcı adı veya şifre hatalı!' });
        }
    } catch (err) {
        res.status(500).json({ durum: 'HATA', mesaj: 'Sunucu hatası' });
    }
});

app.listen(8080, () => console.log('Sunucu 8080 portunda çalışıyor.'));