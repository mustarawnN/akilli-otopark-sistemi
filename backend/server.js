const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const dbConfig = {
    server: '127.0.0.1',
    port: 1433,
    database: 'AkilliOtoparkDB',
    user: 'sa',
    password: '123451',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

app.get('/api/test-giris', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        const bosYer = await pool.request().query('SELECT TOP 1 * FROM ParkYerleri WHERE DoluMu = 0');

        if (bosYer.recordset.length === 0) {
            return res.status(400).json({ mesaj: 'Otopark dolu!' });
        }

        const yer = bosYer.recordset[0];
        const biletNo = 'BLT-' + Math.floor(1000 + Math.random() * 9000);

        await pool.request().query(`UPDATE ParkYerleri SET DoluMu = 1, MevcutBiletNo = '${biletNo}' WHERE ParkYeriID = ${yer.ParkYeriID}`);
        await pool.request().query(`INSERT INTO GirisCikisKayitlari (ParkYeriID, BiletNo) VALUES (${yer.ParkYeriID}, '${biletNo}')`);

        res.json({ durum: 'BASARILI', parkEdilenYer: yer.ParkYeriAdi, kesilenBilet: biletNo });

    } catch (err) {
        console.error('Hata:', err);
        res.status(500).json({ mesaj: 'Baglanti kurulamadi', detay: err.message });
    }
});

app.listen(5000, () => console.log('Sunucu 5000 portunda calisiyor!'));