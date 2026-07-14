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

function ucretHesapla(dakika, ayar) {
    if (dakika <= 30) return 0;
    if (dakika <= 60) return Number(ayar.Tarife0_1Saat);
    if (dakika <= 120) return Number(ayar.Tarife1_2Saat);
    if (dakika <= 240) return Number(ayar.Tarife2_4Saat);
    if (dakika <= 480) return Number(ayar.Tarife4_8Saat);
    if (dakika <= 720) return Number(ayar.Tarife8_12Saat);
    if (dakika <= 1440) return Number(ayar.Tarife12_24Saat);

    // 24 saati aşan her tam gün için ek ücret
    const asanDakika = dakika - 1440;
    const ekGun = Math.ceil(asanDakika / 1440);
    return Number(ayar.Tarife12_24Saat) + (ekGun * Number(ayar.Tarife24SaatSonrasiGunluk));
}

async function fiyatlandirmaGetir(pool) {
    const sonuc = await pool.request().query('SELECT TOP 1 * FROM FiyatlandirmaAyarlari WHERE ID = 1');
    return sonuc.recordset[0];
}

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

        const ayar = await fiyatlandirmaGetir(pool);
        const toplamUcret = ucretHesapla(farkDakika, ayar);

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

// ==========================================================
// ============  RAPORLAMA (FİNANSAL ANALİZ) API'LERİ  ======
// ==========================================================

// --- 1) ÖZET KPI'LAR: bugün/dün, son7/önceki7, son30/önceki30, ortalamalar ---
app.get('/api/raporlar/ozet', async (req, res) => {
    try {
        const pool = await poolPromise;
        const sorgu = await pool.request().query(`
            DECLARE @Bugun DECIMAL(10,2), @Dun DECIMAL(10,2);
            DECLARE @Son7Gun DECIMAL(10,2), @Onceki7Gun DECIMAL(10,2);
            DECLARE @Son30Gun DECIMAL(10,2), @Onceki30Gun DECIMAL(10,2);
            DECLARE @OrtalamaUcret DECIMAL(10,2), @OrtalamaSureDakika DECIMAL(10,2);
            DECLARE @ToplamIslem30 INT;

            SELECT @Bugun = ISNULL(SUM(ToplamUcret),0) FROM GirisCikisKayitlari
                WHERE CAST(CikisSaati AS DATE) = CAST(GETDATE() AS DATE);

            SELECT @Dun = ISNULL(SUM(ToplamUcret),0) FROM GirisCikisKayitlari
                WHERE CAST(CikisSaati AS DATE) = CAST(DATEADD(day,-1,GETDATE()) AS DATE);

            SELECT @Son7Gun = ISNULL(SUM(ToplamUcret),0) FROM GirisCikisKayitlari
                WHERE CikisSaati >= DATEADD(day,-7,CAST(GETDATE() AS DATE));

            SELECT @Onceki7Gun = ISNULL(SUM(ToplamUcret),0) FROM GirisCikisKayitlari
                WHERE CikisSaati >= DATEADD(day,-14,CAST(GETDATE() AS DATE))
                  AND CikisSaati < DATEADD(day,-7,CAST(GETDATE() AS DATE));

            SELECT @Son30Gun = ISNULL(SUM(ToplamUcret),0) FROM GirisCikisKayitlari
                WHERE CikisSaati >= DATEADD(day,-30,CAST(GETDATE() AS DATE));

            SELECT @Onceki30Gun = ISNULL(SUM(ToplamUcret),0) FROM GirisCikisKayitlari
                WHERE CikisSaati >= DATEADD(day,-60,CAST(GETDATE() AS DATE))
                  AND CikisSaati < DATEADD(day,-30,CAST(GETDATE() AS DATE));

            SELECT
                @OrtalamaUcret = ISNULL(AVG(ToplamUcret),0),
                @OrtalamaSureDakika = ISNULL(AVG(CAST(DATEDIFF(minute, GirisSaati, CikisSaati) AS DECIMAL(10,2))),0),
                @ToplamIslem30 = COUNT(*)
            FROM GirisCikisKayitlari
            WHERE CikisSaati >= DATEADD(day,-30,CAST(GETDATE() AS DATE));

            SELECT
                @Bugun AS Bugun, @Dun AS Dun,
                @Son7Gun AS Son7Gun, @Onceki7Gun AS Onceki7Gun,
                @Son30Gun AS Son30Gun, @Onceki30Gun AS Onceki30Gun,
                @OrtalamaUcret AS OrtalamaUcret, @OrtalamaSureDakika AS OrtalamaSureDakika,
                @ToplamIslem30 AS ToplamIslem30;
        `);
        res.json(sorgu.recordset[0]);
    } catch (err) {
        res.status(500).json({ durum: 'HATA', mesaj: 'Özet getirilemedi', detay: err.message });
    }
});

// --- 2) GÜNLÜK GELİR TRENDİ (son N gün) ---
app.get('/api/raporlar/trend', async (req, res) => {
    const gun = Math.min(Math.max(parseInt(req.query.gun) || 30, 1), 365);
    try {
        const pool = await poolPromise;
        const sonuc = await pool.request()
            .input('gun', sql.Int, gun)
            .query(`
                SELECT
                    CONVERT(varchar(10), CAST(CikisSaati AS DATE), 23) AS Tarih,
                    SUM(ToplamUcret) AS Ciro,
                    COUNT(*) AS IslemSayisi
                FROM GirisCikisKayitlari
                WHERE CikisSaati IS NOT NULL
                  AND CikisSaati >= DATEADD(day, -@gun, CAST(GETDATE() AS DATE))
                GROUP BY CAST(CikisSaati AS DATE)
                ORDER BY Tarih ASC
            `);
        res.json(sonuc.recordset);
    } catch (err) {
        res.status(500).json({ durum: 'HATA', mesaj: 'Trend verisi getirilemedi', detay: err.message });
    }
});

// --- 3) SAATLİK YOĞUNLUK / GELİR (son 30 gün, saat kırılımı) ---
app.get('/api/raporlar/saatlik', async (req, res) => {
    try {
        const pool = await poolPromise;
        const sonuc = await pool.request().query(`
            SELECT DATEPART(hour, CikisSaati) AS Saat,
                   SUM(ToplamUcret) AS Ciro,
                   COUNT(*) AS IslemSayisi
            FROM GirisCikisKayitlari
            WHERE CikisSaati IS NOT NULL
              AND CikisSaati >= DATEADD(day,-30,CAST(GETDATE() AS DATE))
            GROUP BY DATEPART(hour, CikisSaati)
            ORDER BY Saat ASC
        `);
        res.json(sonuc.recordset);
    } catch (err) {
        res.status(500).json({ durum: 'HATA', mesaj: 'Saatlik veri getirilemedi', detay: err.message });
    }
});

// --- 4) BLOK BAZLI CİRO (ParkYeriAdi'nin ilk harfi = blok, örn. "A1" -> "A") ---
app.get('/api/raporlar/blok', async (req, res) => {
    try {
        const pool = await poolPromise;
        const sonuc = await pool.request().query(`
            SELECT LEFT(p.ParkYeriAdi, 1) AS Blok,
                   SUM(g.ToplamUcret) AS Ciro,
                   COUNT(*) AS IslemSayisi
            FROM GirisCikisKayitlari g
            JOIN ParkYerleri p ON p.ParkYeriID = g.ParkYeriID
            WHERE g.CikisSaati IS NOT NULL
              AND g.CikisSaati >= DATEADD(day,-30,CAST(GETDATE() AS DATE))
            GROUP BY LEFT(p.ParkYeriAdi, 1)
            ORDER BY Blok ASC
        `);
        res.json(sonuc.recordset);
    } catch (err) {
        res.status(500).json({ durum: 'HATA', mesaj: 'Blok verisi getirilemedi', detay: err.message });
    }
});

// --- 5) EN KARLI 10 İŞLEM (tüm zamanlar, en yüksek ücretli çıkışlar) ---
app.get('/api/raporlar/en-karli-islemler', async (req, res) => {
    try {
        const pool = await poolPromise;
        const sonuc = await pool.request().query(`
            SELECT TOP 10
                g.Plaka, p.ParkYeriAdi,
                CONVERT(varchar(16), g.GirisSaati, 120) AS GirisSaati,
                CONVERT(varchar(16), g.CikisSaati, 120) AS CikisSaati,
                DATEDIFF(minute, g.GirisSaati, g.CikisSaati) AS SureDakika,
                g.ToplamUcret
            FROM GirisCikisKayitlari g
            JOIN ParkYerleri p ON p.ParkYeriID = g.ParkYeriID
            WHERE g.CikisSaati IS NOT NULL
            ORDER BY g.ToplamUcret DESC
        `);
        res.json(sonuc.recordset);
    } catch (err) {
        res.status(500).json({ durum: 'HATA', mesaj: 'İşlemler getirilemedi', detay: err.message });
    }
});

// --- FİYATLANDIRMA: MEVCUT TARİFEYİ GETİR ---
app.get('/api/fiyatlandirma', async (req, res) => {
    try {
        const pool = await poolPromise;
        const ayar = await fiyatlandirmaGetir(pool);
        res.json(ayar);
    } catch (err) {
        res.status(500).json({ durum: 'HATA', mesaj: 'Fiyatlandırma getirilemedi', detay: err.message });
    }
});

// --- FİYATLANDIRMA: TARİFEYİ GÜNCELLE ---
app.put('/api/fiyatlandirma', async (req, res) => {
    const {
        Tarife0_1Saat, Tarife1_2Saat, Tarife2_4Saat,
        Tarife4_8Saat, Tarife8_12Saat, Tarife12_24Saat,
        Tarife24SaatSonrasiGunluk
    } = req.body;

    const alanlar = { Tarife0_1Saat, Tarife1_2Saat, Tarife2_4Saat, Tarife4_8Saat, Tarife8_12Saat, Tarife12_24Saat, Tarife24SaatSonrasiGunluk };
    for (const [ad, deger] of Object.entries(alanlar)) {
        if (deger === undefined || deger === null || isNaN(deger) || Number(deger) < 0) {
            return res.status(400).json({ durum: 'HATA', mesaj: `Geçersiz değer: ${ad}` });
        }
    }

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('t1', sql.Decimal(10, 2), Tarife0_1Saat)
            .input('t2', sql.Decimal(10, 2), Tarife1_2Saat)
            .input('t3', sql.Decimal(10, 2), Tarife2_4Saat)
            .input('t4', sql.Decimal(10, 2), Tarife4_8Saat)
            .input('t5', sql.Decimal(10, 2), Tarife8_12Saat)
            .input('t6', sql.Decimal(10, 2), Tarife12_24Saat)
            .input('t7', sql.Decimal(10, 2), Tarife24SaatSonrasiGunluk)
            .query(`
                UPDATE FiyatlandirmaAyarlari SET
                    Tarife0_1Saat = @t1, Tarife1_2Saat = @t2, Tarife2_4Saat = @t3,
                    Tarife4_8Saat = @t4, Tarife8_12Saat = @t5, Tarife12_24Saat = @t6,
                    Tarife24SaatSonrasiGunluk = @t7, GuncellemeTarihi = GETDATE()
                WHERE ID = 1
            `);
        const pool2 = await poolPromise;
        const guncel = await fiyatlandirmaGetir(pool2);
        res.json({ durum: 'BASARILI', mesaj: 'Fiyatlandırma güncellendi', ayar: guncel });
    } catch (err) {
        res.status(500).json({ durum: 'HATA', mesaj: 'Fiyatlandırma güncellenemedi', detay: err.message });
    }
});



// --- 6) TARİFE (KALIŞ SÜRESİ) DAĞILIMI (Son 30 Gün) ---
app.get('/api/raporlar/tarife-dagilimi', async (req, res) => {
    try {
        const pool = await poolPromise;
        const sonuc = await pool.request().query(`
            SELECT
                CASE
                    WHEN DATEDIFF(minute, GirisSaati, CikisSaati) <= 30 THEN '0-30 Dk (Ücretsiz)'
                    WHEN DATEDIFF(minute, GirisSaati, CikisSaati) <= 60 THEN '0 - 1 Saat'
                    WHEN DATEDIFF(minute, GirisSaati, CikisSaati) <= 120 THEN '1 - 2 Saat'
                    WHEN DATEDIFF(minute, GirisSaati, CikisSaati) <= 240 THEN '2 - 4 Saat'
                    WHEN DATEDIFF(minute, GirisSaati, CikisSaati) <= 480 THEN '4 - 8 Saat'
                    WHEN DATEDIFF(minute, GirisSaati, CikisSaati) <= 720 THEN '8 - 12 Saat'
                    WHEN DATEDIFF(minute, GirisSaati, CikisSaati) <= 1440 THEN '12 - 24 Saat'
                    ELSE '24 Saati Aşanlar'
                END AS Tarife,
                COUNT(*) AS IslemSayisi,
                ISNULL(SUM(ToplamUcret), 0) AS ToplamCiro,
                MIN(DATEDIFF(minute, GirisSaati, CikisSaati)) AS Siralama
            FROM GirisCikisKayitlari
            WHERE CikisSaati IS NOT NULL
              AND CikisSaati >= DATEADD(day, -30, CAST(GETDATE() AS DATE))
            GROUP BY
                CASE
                    WHEN DATEDIFF(minute, GirisSaati, CikisSaati) <= 30 THEN '0-30 Dk (Ücretsiz)'
                    WHEN DATEDIFF(minute, GirisSaati, CikisSaati) <= 60 THEN '0 - 1 Saat'
                    WHEN DATEDIFF(minute, GirisSaati, CikisSaati) <= 120 THEN '1 - 2 Saat'
                    WHEN DATEDIFF(minute, GirisSaati, CikisSaati) <= 240 THEN '2 - 4 Saat'
                    WHEN DATEDIFF(minute, GirisSaati, CikisSaati) <= 480 THEN '4 - 8 Saat'
                    WHEN DATEDIFF(minute, GirisSaati, CikisSaati) <= 720 THEN '8 - 12 Saat'
                    WHEN DATEDIFF(minute, GirisSaati, CikisSaati) <= 1440 THEN '12 - 24 Saat'
                    ELSE '24 Saati Aşanlar'
                END
            ORDER BY Siralama ASC
        `);
        res.json(sonuc.recordset);
    } catch (err) {
        res.status(500).json({ durum: 'HATA', mesaj: 'Tarife verisi getirilemedi', detay: err.message });
    }
});

// --- YENİ: İŞLEM GEÇMİŞİ API'Sİ (Son 50 Kayıt) ---
app.get('/api/islem-gecmisi', async (req, res) => {
    try {
        const pool = await poolPromise;
        const sonuc = await pool.request().query(`
            SELECT TOP 50
                g.KayitID,
                g.Plaka,
                p.ParkYeriAdi,
                CONVERT(varchar(16), g.GirisSaati, 120) AS GirisSaati,
                CONVERT(varchar(16), g.CikisSaati, 120) AS CikisSaati,
                DATEDIFF(minute, g.GirisSaati, g.CikisSaati) AS SureDakika,
                g.ToplamUcret
            FROM GirisCikisKayitlari g
            JOIN ParkYerleri p ON p.ParkYeriID = g.ParkYeriID
            WHERE g.CikisSaati IS NOT NULL
            ORDER BY g.CikisSaati DESC
        `);
        res.json(sonuc.recordset);
    } catch (err) {
        res.status(500).json({ durum: 'HATA', mesaj: 'İşlem geçmişi getirilemedi', detay: err.message });
    }
});

app.listen(8080, () => console.log('Sunucu 8080 portunda çalışıyor.'));