import React, { useState, useEffect, useRef } from 'react';
import {
  TruckIcon,
  BanknotesIcon,
  ChartBarIcon,
  TicketIcon,
  PlusCircleIcon,
  ArrowRightOnRectangleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/solid';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [kullaniciAdi, setKullaniciAdi] = useState('');
  const [sifre, setSifre] = useState('');
  const [loginHata, setLoginHata] = useState('');
  const [aktifKullanici, setAktifKullanici] = useState('');
  const [aracGirisModalAcik, setAracGirisModalAcik] = useState(false);
  const [girisPlakasi, setGirisPlakasi] = useState('');
  const [girisHata, setGirisHata] = useState('');
  const [parkYerleri, setParkYerleri] = useState([]);

  // --- TOAST BİLDİRİM SİSTEMİ ---
  // Her toast: { id, tip: 'basarili' | 'hata', metin, sure, kapaniyor }
  const [toasts, setToasts] = useState([]);
  const toastTimers = useRef({});

  const toastKaldir = (id) => {
    if (toastTimers.current[id]) {
      clearTimeout(toastTimers.current[id].timeoutId);
      delete toastTimers.current[id];
    }
    // Önce "kapanıyor" işaretle (çıkış animasyonu oynasın), sonra listeden düşür
    setToasts(prev => prev.map(t => (t.id === id ? { ...t, kapaniyor: true } : t)));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 250);
  };

  const toastEkle = (tip, metin, sure = 4500) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts(prev => [...prev, { id, tip, metin, sure, kapaniyor: false }]);
    const timeoutId = setTimeout(() => toastKaldir(id), sure);
    toastTimers.current[id] = { timeoutId, sure, baslangic: Date.now() };
  };

  const toastDuraklat = (id) => {
    const timer = toastTimers.current[id];
    if (!timer) return;
    clearTimeout(timer.timeoutId);
    const gecenSure = Date.now() - timer.baslangic;
    timer.kalanSure = Math.max(timer.sure - gecenSure, 300);
  };

  const toastDevamEttir = (id) => {
    const timer = toastTimers.current[id];
    if (!timer) return;
    const kalan = timer.kalanSure ?? timer.sure;
    timer.baslangic = Date.now();
    timer.sure = kalan;
    timer.timeoutId = setTimeout(() => toastKaldir(id), kalan);
  };

  const tumToastlariTemizle = () => {
    Object.values(toastTimers.current).forEach(t => clearTimeout(t.timeoutId));
    toastTimers.current = {};
    setToasts([]);
  };

  const [biletModalAcik, setBiletModalAcik] = useState(false);
  const [cikisOnayAcik, setCikisOnayAcik] = useState(false);

  const [istatistikler, setIstatistikler] = useState({
    GunlukCiro: 0, DoluAracSayisi: 0, ToplamKapasite: 10, BugunGirenArac: 0
  });

  useEffect(() => {
    let interval;
    if (isLoggedIn) {
      durumuVeIstatistigiGetir();
      interval = setInterval(durumuVeIstatistigiGetir, 3000);
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
      setLoginHata('Sunucuya bağlanılamadı.');
    }
  };

  const sistemdenCikisYap = () => {
    setIsLoggedIn(false);
    setKullaniciAdi('');
    setSifre('');
    setParkYerleri([]);
    tumToastlariTemizle();
    setBiletModalAcik(false);
    setCikisOnayAcik(false);
  };

  const cikisOnayiIste = () => {
    setCikisOnayAcik(true);
  };

  const durumuVeIstatistigiGetir = async () => {
    try {
      const zamanDamgasi = new Date().getTime();

      const resDurum = await fetch(`http://127.0.0.1:8080/api/durum?t=${zamanDamgasi}`, { cache: 'no-store' });
      if (resDurum.ok) setParkYerleri(await resDurum.json());

      const resStat = await fetch(`http://127.0.0.1:8080/api/istatistik?t=${zamanDamgasi}`, { cache: 'no-store' });
      if (resStat.ok) setIstatistikler(await resStat.json());
    } catch (error) {
      toastEkle('hata', 'Sunucu bağlantısı koptu!');
    }
  };

  const rastgelePlakaUret = () => {
    const harfler = 'ABCDEFGHIJKLMNOPRSTUVYZ';
    const ilKodu = String(Math.floor(1 + Math.random() * 81)).padStart(2, '0');
    const harfSayisi = Math.floor(Math.random() * 3) + 1;
    let harfBolumu = '';
    for (let i = 0; i < harfSayisi; i++) harfBolumu += harfler[Math.floor(Math.random() * harfler.length)];
    const rakamSayisi = harfSayisi === 1 ? 4 : harfSayisi === 2 ? 3 : 2;
    let rakamBolumu = '';
    for (let i = 0; i < rakamSayisi; i++) rakamBolumu += Math.floor(Math.random() * 10);
    setGirisPlakasi(`${ilKodu} ${harfBolumu} ${rakamBolumu}`);
    setGirisHata('');
  };

  const aracGirisModaliAc = () => {
    setGirisPlakasi('');
    setGirisHata('');
    setAracGirisModalAcik(true);
  };

  const plakaOnaylaVeGirisYap = async () => {
    const temizPlaka = girisPlakasi.trim().toUpperCase();
    const plakaRegex = /^\d{2}\s?[A-PRSTUVYZ]{1,3}\s?\d{2,4}$/;

    if (!plakaRegex.test(temizPlaka)) {
      setGirisHata('Geçersiz plaka formatı! Örn: 34 ABC 1234');
      return;
    }

    try {
      const res = await fetch('http://127.0.0.1:8080/api/giris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plaka: temizPlaka })
      });
      const data = await res.json();
      if (data.durum === 'BASARILI') {
        toastEkle('basarili', `Araç Girdi: ${data.parkEdilenYer} (Plaka: ${data.plaka})`);
        setAracGirisModalAcik(false);
        durumuVeIstatistigiGetir();
      } else {
        setGirisHata(data.mesaj);
      }
    } catch (error) {
      setGirisHata('Sunucuya bağlanılamadı.');
    }
  };

  const araciCikar = async (plaka) => {
    try {
      const res = await fetch('http://127.0.0.1:8080/api/cikis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plaka })
      });
      const data = await res.json();
      if (data.durum === 'BASARILI') {
        toastEkle('basarili', `Çıkış Başarılı! Tahsil edilen ücret: ${data.toplamUcret}`);
        durumuVeIstatistigiGetir();
      } else {
        toastEkle('hata', `Hata: ${data.mesaj}`);
      }
    } catch (error) {
      toastEkle('hata', 'Çıkış işlemi başarısız!');
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
      <div className="min-h-screen bg-gray-100  flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-blue-900 mb-2 flex items-center justify-center gap-2">
              <TruckIcon className="w-8 h-8 text-blue-700" />
              Akıllı Otopark
            </h1>
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
            {loginHata && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-semibold text-center border flex items-center justify-center gap-2">
                <XCircleIcon className="w-5 h-5" />
                {loginHata}
              </div>
            )}
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-md">Giriş Yap</button>
          </form>
        </div>
      </div>
    );
  }

  const dolulukYuzdesi = (istatistikler.DoluAracSayisi / istatistikler.ToplamKapasite) * 100;

  // Doluluk yüzdesine göre renk belirleyen fonksiyonumuz
  const progressBarRenginiGetir = (yuzde) => {
    if (yuzde >= 80) return 'bg-red-500';
    if (yuzde >= 50) return 'bg-orange-500';
    return 'bg-emerald-500'; // Düşük dolulukta yeşil ton
  };

  // --- EKRAN 2: ANA YÖNETİM PANELİ ---
  return (
    <div className="min-h-screen bg-slate-100 p-8 font-sans text-slate-800 relative">
      <div className="max-w-6xl mx-auto">

        {/* Üst Bar */}
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm mb-8 border-t-4 border-blue-600">
          <div>
            <h1 className="text-2xl font-extrabold text-blue-900 tracking-tight flex items-center gap-2">
              <TruckIcon className="w-7 h-7 text-blue-700" />
              Otopark Yönetim Paneli
            </h1>
            <p className="text-sm text-slate-500 font-medium">Hoş geldin, <span className="text-blue-600 uppercase">{aktifKullanici}</span></p>
          </div>
          <button onClick={cikisOnayiIste} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-6 rounded-lg transition-colors flex items-center gap-2">
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            Sistemden Çık
          </button>
        </div>

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
            <div className="bg-emerald-100 p-4 rounded-full">
              <BanknotesIcon className="w-7 h-7 text-emerald-600" />
            </div>
          </div>

          {/* 2. Kart: Doluluk Oranı ve Progress Bar */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border-l-4 border-blue-500 flex flex-col justify-center hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Anlık Doluluk</p>
                <p className="text-3xl font-black text-slate-800">{istatistikler.DoluAracSayisi} <span className="text-lg text-slate-500 font-medium">/ {istatistikler.ToplamKapasite}</span></p>
              </div>
              <div className="bg-blue-100 p-4 rounded-full">
                <TruckIcon className="w-7 h-7 text-blue-600" />
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-1000 ${progressBarRenginiGetir(dolulukYuzdesi)}`}
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
            <div className="bg-purple-100 p-4 rounded-full">
              <ChartBarIcon className="w-7 h-7 text-purple-600" />
            </div>
          </div>
        </div>
        {/* ========================================== */}

        {/* --- BUTONLAR --- */}
        <div className="flex justify-center gap-4 mb-10">
          <button onClick={aracGirisModaliAc} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform hover:scale-105 flex items-center gap-2">
            <PlusCircleIcon className="w-5 h-5" />
            Yeni Araç Al
          </button>
          <button onClick={() => setBiletModalAcik(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform hover:scale-105 flex items-center gap-2">
            <TruckIcon className="w-5 h-5" />
            İçerideki Araçlar
          </button>
        </div>

        {/* --- OTOPARK IZGARASI --- */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
          {parkYerleri.map((yer) => (
            <div key={yer.ParkYeriID} className={`p-6 rounded-2xl shadow-md flex flex-col items-center justify-center border-2 ${yer.DoluMu ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-300'}`}>
              <span className="text-3xl font-black text-slate-800 mb-2">{yer.ParkYeriAdi}</span>
              {yer.DoluMu ? (
                <>
                  <span className="text-red-600 font-bold text-sm mb-4 bg-red-100 px-2 py-1 rounded">{yer.MevcutPlaka}</span>
                  <button onClick={() => araciCikar(yer.MevcutPlaka)} className="bg-red-500 hover:bg-red-600 text-white text-sm font-bold py-2 px-4 rounded-lg w-full">Çıkış Yap</button>
                </>
              ) : (
                <span className="text-green-600 font-bold mt-4 bg-green-100 px-4 py-1 rounded-full">BOŞ</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* --- ARAÇ GİRİŞİ MODALI (PLAKA OKUMA) --- */}
      {aracGirisModalAcik && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="bg-blue-900 p-5 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <TruckIcon className="w-6 h-6" />
                Araç Girişi — Plaka Okuma
              </h2>
              <button onClick={() => setAracGirisModalAcik(false)} className="text-white hover:text-red-400 font-bold text-2xl leading-none">&times;</button>
            </div>

            <div className="p-6">
              <label className="block text-sm font-bold text-slate-700 mb-2">Plaka Numarası</label>
              <input
                type="text"
                value={girisPlakasi}
                onChange={(e) => { setGirisPlakasi(e.target.value.toUpperCase()); setGirisHata(''); }}
                placeholder="34 ABC 1234"
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-bold tracking-wider text-center uppercase"
                autoFocus
              />

              {girisHata && (
                <div className="mt-3 bg-red-50 text-red-600 p-3 rounded-lg text-sm font-semibold text-center border flex items-center justify-center gap-2">
                  <XCircleIcon className="w-5 h-5" />
                  {girisHata}
                </div>
              )}

              <button
                onClick={rastgelePlakaUret}
                className="w-full mt-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-lg border border-slate-300 transition-colors"
              >
                🎲 Rastgele Plaka Üret
              </button>
            </div>

            <div className="bg-slate-100 p-4 flex justify-end gap-3 border-t border-slate-200">
              <button
                onClick={() => setAracGirisModalAcik(false)}
                className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-2 px-5 rounded-lg transition-colors"
              >
                İptal
              </button>
              <button
                onClick={plakaOnaylaVeGirisYap}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-lg transition-colors"
              >
                Girişi Onayla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- İÇERİDEKİ ARAÇLAR MODALI --- */}
      {biletModalAcik && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up">
            <div className="bg-indigo-900 p-5 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <TruckIcon className="w-6 h-6" />
                İçerideki Araçlar
              </h2>
              <button onClick={() => setBiletModalAcik(false)} className="text-white hover:text-red-400 font-bold text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="py-3 text-slate-600 font-bold">Park Yeri</th>
                    <th className="py-3 text-slate-600 font-bold">Plaka</th>
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
                        <td className="py-4 text-red-600 font-bold tracking-wider">{yer.MevcutPlaka}</td>
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

      {/* --- SİSTEMDEN ÇIKIŞ ONAY MODALI --- */}
      {cikisOnayAcik && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in-up">
            <div className="bg-red-600 p-5 text-white flex items-center gap-2">
              <ArrowRightOnRectangleIcon className="w-6 h-6" />
              <h2 className="text-lg font-bold">Çıkış Onayı</h2>
            </div>
            <div className="p-6 text-center">
              <p className="text-slate-700 font-medium text-base">
                Sistemden çıkış yapmak istediğine emin misin?
              </p>
              <p className="text-slate-400 text-sm mt-2">
                Oturumun sonlandırılacak, tekrar giriş yapman gerekecek.
              </p>
            </div>
            <div className="bg-slate-100 p-4 flex justify-end gap-3 border-t border-slate-200">
              <button
                onClick={() => setCikisOnayAcik(false)}
                className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-2 px-5 rounded-lg transition-colors"
              >
                İptal
              </button>
              <button
                onClick={sistemdenCikisYap}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-5 rounded-lg transition-colors"
              >
                Evet, Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- TOAST BİLDİRİM ANİMASYONLARI --- */}
      <style>{`
        @keyframes toastGiris {
          from { transform: translateX(110%) scale(0.95); opacity: 0; }
          to { transform: translateX(0) scale(1); opacity: 1; }
        }
        @keyframes toastCikis {
          from { transform: translateX(0) scale(1); opacity: 1; max-height: 220px; margin-bottom: 14px; }
          to { transform: translateX(110%) scale(0.95); opacity: 0; max-height: 0; margin-bottom: 0; }
        }
        @keyframes toastIlerleme {
          from { width: 100%; }
          to { width: 0%; }
        }
        .toast-giris { animation: toastGiris 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .toast-cikis { animation: toastCikis 0.25s ease-in forwards; }
        .toast-ilerleme-cubugu { animation-name: toastIlerleme; animation-timing-function: linear; animation-fill-mode: forwards; }
        .toast-karti:hover .toast-ilerleme-cubugu { animation-play-state: paused; }
      `}</style>

      {/* --- TOAST BİLDİRİM KONTEYNIRI (SAĞ ÜST) --- */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col-reverse items-stretch gap-3.5 w-full max-w-md pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onMouseEnter={() => toastDuraklat(toast.id)}
            onMouseLeave={() => toastDevamEttir(toast.id)}
            className={`toast-karti pointer-events-auto overflow-hidden bg-white rounded-2xl shadow-2xl border-l-[6px] ${
              toast.tip === 'hata' ? 'border-red-500' : 'border-emerald-500'
            } ${toast.kapaniyor ? 'toast-cikis' : 'toast-giris'}`}
          >
            <div className="flex items-start gap-4 p-5 pr-4">
              <div className={`shrink-0 rounded-full p-2 mt-0.5 ${toast.tip === 'hata' ? 'bg-red-100' : 'bg-emerald-100'}`}>
                {toast.tip === 'hata' ? (
                  <XCircleIcon className="w-7 h-7 text-red-500" />
                ) : (
                  <CheckCircleIcon className="w-7 h-7 text-emerald-500" />
                )}
              </div>
              <p className="text-base font-semibold text-slate-700 flex-1 leading-snug pt-1.5">
                {toast.metin}
              </p>
              <button
                onClick={() => toastKaldir(toast.id)}
                className="shrink-0 text-slate-300 hover:text-slate-500 font-bold text-2xl leading-none px-1 transition-colors"
                aria-label="Bildirimi kapat"
              >
                &times;
              </button>
            </div>
            <div className="h-1.5 bg-slate-100 w-full">
              <div
                className={`h-full toast-ilerleme-cubugu ${toast.tip === 'hata' ? 'bg-red-400' : 'bg-emerald-400'}`}
                style={{ animationDuration: `${toast.sure}ms` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}