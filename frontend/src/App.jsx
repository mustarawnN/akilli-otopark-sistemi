import React, { useState, useEffect } from 'react';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [kullaniciAdi, setKullaniciAdi] = useState('');
  const [sifre, setSifre] = useState('');
  const [loginHata, setLoginHata] = useState('');
  const [aktifKullanici, setAktifKullanici] = useState('');

  const [parkYerleri, setParkYerleri] = useState([]);
  const [mesaj, setMesaj] = useState('');
  const [biletModalAcik, setBiletModalAcik] = useState(false);
  
  // İstatistik State'i
  const [istatistikler, setIstatistikler] = useState({
    GunlukCiro: 0, DoluAracSayisi: 0, ToplamKapasite: 10, BugunGirenArac: 0
  });

  useEffect(() => {
    let interval;
    if (isLoggedIn) {
      durumuVeIstatistigiGetir(); // İlk açılışta hemen çek
      interval = setInterval(durumuVeIstatistigiGetir, 3000); // 3 saniyede bir güncelle
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isLoggedIn]);

  const girisYap = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://127.0.0.1:8080/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kullaniciAdi, sifre })
      });
      const data = await res.json();

      if (res.ok && data.durum === 'BASARILI') {
        setIsLoggedIn(true);
        setAktifKullanici(data.kullanici);
        setLoginHata('');
      } else {
        setLoginHata(data.mesaj);
      }
    } catch (error) {
      setLoginHata('❌ Sunucuya bağlanılamadı.');
    }
  };

  const sistemdenCikisYap = () => {
    setIsLoggedIn(false); setKullaniciAdi(''); setSifre(''); setParkYerleri([]); setMesaj(''); setBiletModalAcik(false);
  };

  // GÜNCELLENDİ: Önbellek (Cache) sorununu aşmak için Timestamp (Zaman Damgası) eklendi
  const durumuVeIstatistigiGetir = async () => {
    try {
      // Her istekte benzersiz bir sayı üreterek tarayıcının tembellik yapmasını (cache) engelliyoruz
      const zamanDamgasi = new Date().getTime();

      const resDurum = await fetch(`http://127.0.0.1:8080/api/durum?t=${zamanDamgasi}`, { cache: 'no-store' });
      if (resDurum.ok) setParkYerleri(await resDurum.json());

      const resStat = await fetch(`http://127.0.0.1:8080/api/istatistik?t=${zamanDamgasi}`, { cache: 'no-store' });
      if (resStat.ok) setIstatistikler(await resStat.json());
    } catch (error) {
      setMesaj('❌ Sunucu bağlantısı koptu!');
    }
  };

  // GÜNCELLENDİ: Cache-Busting eklendi
  const araciIceriAl = async () => {
    try {
      const zamanDamgasi = new Date().getTime();
      const res = await fetch(`http://127.0.0.1:8080/api/test-giris?t=${zamanDamgasi}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.durum === 'BASARILI') {
        setMesaj(`✅ Araç Girdi: ${data.parkEdilenYer} (Bilet: ${data.kesilenBilet})`);
        durumuVeIstatistigiGetir();
      } else {
        setMesaj(`❌ Hata: ${data.mesaj}`);
      }
    } catch (error) {
      setMesaj('❌ Giriş işlemi başarısız!');
    }
  };

  const araciCikar = async (biletNo) => {
    try {
      // POST istekleri zaten cachelenmez, o yüzden direkt istek atıyoruz.
      const res = await fetch('http://127.0.0.1:8080/api/cikis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ biletNo })
      });
      const data = await res.json();
      if (data.durum === 'BAŞARILI') {
        setMesaj(`💸 Çıkış Başarılı! Tahsil edilen ücret: ${data.toplamUcret}`);
        durumuVeIstatistigiGetir(); // Hemen güncel ciroyu çek
      } else {
        setMesaj(`❌ Hata: ${data.mesaj}`);
      }
    } catch (error) {
      setMesaj('❌ Çıkış işlemi başarısız!');
    }
  };

  const saatFormatla = (tarihString) => {
    if (!tarihString) return "Bilinmiyor";
    const tarih = new Date(tarihString);
    return tarih.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  // --- EKRAN 1: LOGIN ---
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-800 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-blue-900 mb-2">🚗 Akıllı Otopark</h1>
            <p className="text-slate-500">Sisteme erişmek için lütfen giriş yapın.</p>
          </div>
          <form onSubmit={girisYap} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Kullanıcı Adı</label>
              <input type="text" className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500" value={kullaniciAdi} onChange={(e) => setKullaniciAdi(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Şifre</label>
              <input type="password" className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500" value={sifre} onChange={(e) => setSifre(e.target.value)} required />
            </div>
            {loginHata && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-semibold text-center border">{loginHata}</div>}
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-md">Giriş Yap</button>
          </form>
        </div>
      </div>
    );
  }

  // Yüzdelik Doluluk Oranını Hesaplama
  const dolulukYuzdesi = (istatistikler.DoluAracSayisi / istatistikler.ToplamKapasite) * 100;

  // --- EKRAN 2: ANA YÖNETİM PANELİ ---
  return (
    <div className="min-h-screen bg-slate-100 p-8 font-sans text-slate-800 relative">
      <div className="max-w-6xl mx-auto">
        
        {/* Üst Bar */}
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm mb-8 border-t-4 border-blue-600">
          <div>
            <h1 className="text-2xl font-extrabold text-blue-900 tracking-tight">🚗 Otopark Yönetim Paneli</h1>
            <p className="text-sm text-slate-500 font-medium">Hoş geldin, <span className="text-blue-600 uppercase">{aktifKullanici}</span></p>
          </div>
          <button onClick={sistemdenCikisYap} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-6 rounded-lg transition-colors">Sistemden Çık</button>
        </div>

        {mesaj && <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500 mb-8 text-center text-lg font-medium">{mesaj}</div>}

        {/* ========================================== */}
        {/* İSTATİSTİK KARTLARI (DASHBOARD)            */}
        {/* ========================================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* 1. Kart: Günlük Ciro */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border-l-4 border-emerald-500 flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Günlük Toplam Ciro</p>
              <p className="text-3xl font-black text-slate-800">{istatistikler.GunlukCiro} <span className="text-lg text-slate-500 font-medium">TL</span></p>
            </div>
            <div className="bg-emerald-100 p-4 rounded-full text-2xl">💵</div>
          </div>

          {/* 2. Kart: Doluluk Oranı ve Progress Bar */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border-l-4 border-blue-500 flex flex-col justify-center hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Anlık Doluluk</p>
                <p className="text-3xl font-black text-slate-800">{istatistikler.DoluAracSayisi} <span className="text-lg text-slate-500 font-medium">/ {istatistikler.ToplamKapasite}</span></p>
              </div>
              <div className="bg-blue-100 p-4 rounded-full text-2xl">🚙</div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div 
                className={`h-2.5 rounded-full transition-all duration-1000 ${dolulukYuzdesi >= 90 ? 'bg-red-500' : 'bg-blue-500'}`} 
                style={{ width: `${dolulukYuzdesi}%` }}>
              </div>
            </div>
          </div>

          {/* 3. Kart: Toplam Giriş Yapan Araç */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border-l-4 border-purple-500 flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Bugün Giren Araç</p>
              <p className="text-3xl font-black text-slate-800">{istatistikler.BugunGirenArac}</p>
            </div>
            <div className="bg-purple-100 p-4 rounded-full text-2xl">📈</div>
          </div>
        </div>
        {/* ========================================== */}

        {/* --- BUTONLAR --- */}
        <div className="flex justify-center gap-4 mb-10">
          <button onClick={araciIceriAl} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform hover:scale-105 flex items-center gap-2">
            📥 Yeni Araç Al
          </button>
          <button onClick={() => setBiletModalAcik(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform hover:scale-105 flex items-center gap-2">
            🎫 Aktif Biletler
          </button>
        </div>

        {/* --- OTOPARK IZGARASI --- */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
          {parkYerleri.map((yer) => (
            <div key={yer.ParkYeriID} className={`p-6 rounded-2xl shadow-md flex flex-col items-center justify-center border-2 ${yer.DoluMu ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-300'}`}>
              <span className="text-3xl font-black text-slate-800 mb-2">{yer.ParkYeriAdi}</span>
              {yer.DoluMu ? (
                <>
                  <span className="text-red-600 font-bold text-sm mb-4 bg-red-100 px-2 py-1 rounded">{yer.MevcutBiletNo}</span>
                  <button onClick={() => araciCikar(yer.MevcutBiletNo)} className="bg-red-500 hover:bg-red-600 text-white text-sm font-bold py-2 px-4 rounded-lg w-full">Çıkış Yap</button>
                </>
              ) : (
                <span className="text-green-600 font-bold mt-4 bg-green-100 px-4 py-1 rounded-full">BOŞ</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* --- AKTİF BİLETLER MODALI --- */}
      {biletModalAcik && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up">
            <div className="bg-indigo-900 p-5 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">🎫 İçerideki Araçlar</h2>
              <button onClick={() => setBiletModalAcik(false)} className="text-white hover:text-red-400 font-bold text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="py-3 text-slate-600 font-bold">Park Yeri</th>
                    <th className="py-3 text-slate-600 font-bold">Bilet Numarası</th>
                    <th className="py-3 text-slate-600 font-bold">Giriş Saati</th>
                  </tr>
                </thead>
                <tbody>
                  {parkYerleri.filter(p => p.DoluMu).length === 0 ? (
                    <tr><td colSpan="3" className="text-center py-8 text-slate-500 font-medium">Şu an içeride araç bulunmuyor.</td></tr>
                  ) : (
                    parkYerleri.filter(p => p.DoluMu).map(yer => (
                      <tr key={yer.ParkYeriID} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="py-4 font-black text-slate-800 text-lg">{yer.ParkYeriAdi}</td>
                        <td className="py-4 text-red-600 font-bold">{yer.MevcutBiletNo}</td>
                        <td className="py-4 text-slate-600 font-medium">{saatFormatla(yer.SonGuncelleme)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="bg-slate-100 p-4 text-right border-t border-slate-200">
              <button onClick={() => setBiletModalAcik(false)} className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">Kapat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}