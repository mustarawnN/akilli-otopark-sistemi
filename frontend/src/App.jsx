import React, { useState, useEffect } from 'react';

export default function App() {
  const [parkYerleri, setParkYerleri] = useState([]);
  const [mesaj, setMesaj] = useState('');

  // 1. Backend'den otoparkın anlık durumunu çeken fonksiyon
  const durumuGetir = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8080/api/durum');
      if (!res.ok) throw new Error('Sunucu hatası');
      const data = await res.json();
      setParkYerleri(data);
    } catch (error) {
      setMesaj('❌ Sunucuya bağlanılamadı. Node.js (backend) açık mı?');
    }
  };

  // 2. Sayfa ilk açıldığında ve her 3 saniyede bir verileri yenile (Canlı Akış)
  useEffect(() => {
    // --- TAILWIND CSS CDN EKLENTİSİ (Görselliği Anında Düzeltmek İçin) ---
    // Eğer projede Tailwind kurulu değilse, internet üzerinden anında çeker.
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
    // -------------------------------------------------------------------

    durumuGetir();
    const interval = setInterval(durumuGetir, 3000);
    return () => clearInterval(interval);
  }, []);

  // 3. Giriş API'sini tetikleyen fonksiyon
  const araciIceriAl = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8080/api/test-giris');
      const data = await res.json();
      if (data.durum === 'BASARILI') {
        setMesaj(`✅ Araç Girdi: ${data.parkEdilenYer} (Bilet: ${data.kesilenBilet})`);
        durumuGetir(); // Ekranı hemen güncelle
      } else {
        setMesaj(`❌ Hata: ${data.mesaj}`);
      }
    } catch (error) {
      setMesaj('❌ Giriş işlemi başarısız!');
    }
  };

  // 4. Çıkış API'sini tetikleyen fonksiyon
  const araciCikar = async (biletNo) => {
    try {
      const res = await fetch('http://127.0.0.1:8080/api/cikis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ biletNo })
      });
      const data = await res.json();
      if (data.durum === 'BAŞARILI') {
        setMesaj(`💸 Çıkış Başarılı! Tahsil edilen ücret: ${data.toplamUcret}`);
        durumuGetir(); // Ekranı hemen güncelle
      } else {
        setMesaj(`❌ Hata: ${data.mesaj}`);
      }
    } catch (error) {
      setMesaj('❌ Çıkış işlemi başarısız!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-8 font-sans text-slate-800">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-extrabold text-center text-blue-900 mb-8 tracking-tight">
          🚗 Akıllı Otopark Yönetim Paneli
        </h1>

        {/* Bilgi / Fatura Mesaj Kutusu */}
        {mesaj && (
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500 mb-8 text-center text-lg font-medium text-slate-700">
            {mesaj}
          </div>
        )}

        {/* Ana Kontrol Butonu */}
        <div className="flex justify-center mb-10">
          <button
            onClick={araciIceriAl}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform transform hover:scale-105"
          >
            📥 Yeni Araç Al (Bariyeri Aç)
          </button>
        </div>

        {/* Otopark Izgarası (Grid) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
          {parkYerleri.map((yer) => (
            <div
              key={yer.ParkYeriID}
              className={`p-6 rounded-2xl shadow-md flex flex-col items-center justify-center transition-all border-2 ${
                yer.DoluMu 
                  ? 'bg-red-50 border-red-300 hover:shadow-red-200' 
                  : 'bg-green-50 border-green-300 hover:shadow-green-200'
              }`}
            >
              <span className="text-3xl font-black text-slate-800 mb-2">{yer.ParkYeriAdi}</span>
              
              {yer.DoluMu ? (
                <>
                  <span className="text-red-600 font-bold text-sm mb-4 bg-red-100 px-2 py-1 rounded">{yer.MevcutBiletNo}</span>
                  <button
                    onClick={() => araciCikar(yer.MevcutBiletNo)}
                    className="bg-red-500 hover:bg-red-600 text-white text-sm font-bold py-2 px-4 rounded-lg w-full transition-colors"
                  >
                    Çıkış Yap
                  </button>
                </>
              ) : (
                <span className="text-green-600 font-bold mt-4 bg-green-100 px-4 py-1 rounded-full">BOŞ</span>
              )}
            </div>
          ))}
        </div>
        
        {/* Yükleniyor Uyarısı */}
        {parkYerleri.length === 0 && !mesaj.includes('❌') && (
          <p className="text-center text-slate-500 mt-10 animate-pulse">Veritabanından otopark durumu çekiliyor...</p>
        )}
      </div>
    </div>
  );
}