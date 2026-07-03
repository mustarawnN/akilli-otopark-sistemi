import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeftIcon,
  ClockIcon,
  ClipboardDocumentListIcon,
  ArrowTrendingUpIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/solid';

const API_BASE = 'http://127.0.0.1:8080';
const BLOK_RENKLERI = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2'];

// ============================================================================
// --- HARİCİ KÜTÜPHANESİZ (NATIVE) GRAFİK BİLEŞENLERİ ---
// ============================================================================

// 1. Bar Chart (Saatlik Yoğunluk İçin) - Saf HTML/CSS ile yapıldı
function SaatlikGrafik({ veri }) {
  const maxCiro = Math.max(...veri.map(d => d.Ciro), 1);
  return (
    <div className="flex items-end h-52 gap-1 mt-4 border-b border-slate-200 pb-2">
      {veri.map((d, i) => {
        const h = (d.Ciro / maxCiro) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
            {/* Tooltip (Üzerine gelince çıkar) */}
            <div className="hidden group-hover:block absolute -top-8 bg-slate-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-10 shadow-lg">
              {d.Saat} - {d.Ciro} TL
            </div>
            <div 
              className="w-full bg-blue-600 rounded-t-sm transition-all duration-500 hover:bg-blue-400" 
              style={{ height: `${h}%` }}>
            </div>
            <span className="text-[9px] text-slate-400 mt-2 font-medium">
              {i % 2 === 0 ? d.Saat : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// 2. Donut Chart (Blok Bazlı Ciro İçin) - CSS conic-gradient ile yapıldı
function BlokGrafigi({ veri }) {
  if (!veri || veri.length === 0) return <div className="h-52 flex items-center justify-center text-slate-400">Veri yok</div>;

  const totalCiro = veri.reduce((sum, b) => sum + Number(b.Ciro), 0) || 1;
  let startAngle = 0;
  
  const dilimler = veri.map((b, i) => {
    const angle = (Number(b.Ciro) / totalCiro) * 360;
    const slice = { ...b, startAngle, angle, color: BLOK_RENKLERI[i % BLOK_RENKLERI.length] };
    startAngle += angle;
    return slice;
  });

  // CSS açılı gradient metni oluşturma
  const gradientStr = dilimler.map(s => `${s.color} ${s.startAngle}deg ${s.startAngle + s.angle}deg`).join(', ');

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-8 mt-4 h-52">
      <div 
        className="w-40 h-40 rounded-full shadow-sm relative shrink-0" 
        style={{ background: `conic-gradient(${gradientStr})` }}
      >
        {/* Ortadaki beyaz daire ile Donut (Halka) görünümü veriyoruz */}
        <div className="absolute inset-4 bg-white rounded-full shadow-inner flex items-center justify-center">
          <span className="text-xs font-bold text-slate-400">Ciro</span>
        </div>
      </div>
      <div className="flex flex-col gap-2 w-full sm:w-auto">
        {dilimler.map((d, i) => (
          <div key={i} className="flex items-center gap-3 text-sm text-slate-600">
            <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: d.color }}></span>
            <span className="font-bold w-6">{d.Blok}</span>
            <span className="font-medium text-slate-500">{Number(d.Ciro).toFixed(0)} TL</span>
            <span className="text-xs text-slate-400 ml-auto">({((d.angle / 360) * 100).toFixed(1)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 3. Line/Area Chart (Trend Grafiği İçin) - Saf SVG ile yapıldı
function TrendGrafigi({ veri }) {
  if (!veri || veri.length === 0) return <div className="h-64 flex items-center justify-center text-slate-400">Veri yok</div>;

  const maxDeger = Math.max(...veri.map(d => Math.max(d.Ciro || 0, d.Tahmin || 0)), 1);
  const width = 800;
  const height = 240;
  const xStep = width / (veri.length - 1 || 1);

  // SVG Polygon ve Polyline noktalarını hesaplama
  const ciroNoktalari = veri.map((d, i) => d.Ciro !== null ? `${i * xStep},${height - (d.Ciro / maxDeger) * height}` : null).filter(Boolean).join(' ');
  const ciroAlanNoktalari = ciroNoktalari ? `0,${height} ${ciroNoktalari} ${(veri.filter(d => d.Ciro !== null).length - 1) * xStep},${height}` : '';
  const tahminNoktalari = veri.map((d, i) => d.Tahmin !== null ? `${i * xStep},${height - (d.Tahmin / maxDeger) * height}` : null).filter(Boolean).join(' ');

  return (
    <div className="w-full h-72 relative flex flex-col">
      <div className="flex justify-between text-xs text-slate-400 mb-2 px-2">
        <span>{maxDeger.toFixed(0)} TL</span>
      </div>
      <div className="flex-1 relative w-full overflow-hidden border-b border-l border-slate-200">
        <svg viewBox={`0 -10 ${width} ${height + 20}`} className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
          {/* Yatay Izgara Çizgileri */}
          {[0, 0.25, 0.5, 0.75].map(oran => (
            <line key={oran} x1="0" y1={height * oran} x2={width} y2={height * oran} stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="2" />
          ))}
          
          {/* Gerçekleşen Ciro Alanı (Mavi) */}
          {ciroAlanNoktalari && <polygon points={ciroAlanNoktalari} fill="#2563eb" fillOpacity="0.1" />}
          {/* Gerçekleşen Ciro Çizgisi (Kalın Mavi) */}
          {ciroNoktalari && <polyline points={ciroNoktalari} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />}
          
          {/* Projeksiyon/Tahmin Çizgisi (Kesikli Turuncu) */}
          {tahminNoktalari && <polyline points={tahminNoktalari} fill="none" stroke="#d97706" strokeWidth="3" strokeDasharray="8 8" strokeLinejoin="round" strokeLinecap="round" />}
        </svg>
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-slate-400 px-1">
        {veri.filter((_, i) => i % Math.ceil(veri.length / 8) === 0).map((d, i) => <span key={i}>{d.Etiket}</span>)}
        <span>{veri[veri.length - 1].Etiket}</span>
      </div>
    </div>
  );
}

// ============================================================================
// --- YARDIMCI FONKSİYONLAR ---
// ============================================================================

// Regresyon hesaplama fonksiyonu (Tahmin)
function projeksiyonHesapla(trendVerisi, ileriGunSayisi = 7) {
  const n = trendVerisi.length;
  if (n < 3) return [];

  const xs = trendVerisi.map((_, i) => i);
  const ys = trendVerisi.map((d) => d.Ciro);
  const xOrt = xs.reduce((a, b) => a + b, 0) / n;
  const yOrt = ys.reduce((a, b) => a + b, 0) / n;

  let pay = 0, payda = 0;
  for (let i = 0; i < n; i++) {
    pay += (xs[i] - xOrt) * (ys[i] - yOrt);
    payda += (xs[i] - xOrt) ** 2;
  }
  const egim = payda === 0 ? 0 : pay / payda;
  const kesisim = yOrt - egim * xOrt;

  const sonTarih = new Date(trendVerisi[n - 1].Tarih);
  const sonuc = [];
  for (let i = 1; i <= ileriGunSayisi; i++) {
    const tarih = new Date(sonTarih);
    tarih.setDate(tarih.getDate() + i);
    const tahminDeger = Math.max(0, Math.round(egim * (n - 1 + i) + kesisim));
    sonuc.push({ Tarih: tarih.toISOString().slice(0, 10), Tahmin: tahminDeger });
  }
  return sonuc;
}

// Veri hazırlama fonksiyonu
function grafikVerisiHazirla(trendVerisi, gunSayisi) {
  const bugun = new Date();
  const gunlukMap = new Map(trendVerisi.map((d) => [d.Tarih, d]));
  const tamListe = [];
  for (let i = gunSayisi - 1; i >= 0; i--) {
    const tarih = new Date(bugun);
    tarih.setDate(tarih.getDate() - i);
    const anahtar = tarih.toISOString().slice(0, 10);
    const kayit = gunlukMap.get(anahtar);
    tamListe.push({
      Tarih: anahtar,
      Etiket: tarih.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }),
      Ciro: kayit ? Number(kayit.Ciro) : 0,
      Tahmin: null,
    });
  }
  const projeksiyon = projeksiyonHesapla(tamListe, 7).map((p) => ({
    Tarih: p.Tarih,
    Etiket: new Date(p.Tarih).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }),
    Ciro: null,
    Tahmin: p.Tahmin,
  }));

  if (tamListe.length && projeksiyon.length) {
    projeksiyon[0] = { ...projeksiyon[0] };
    tamListe[tamListe.length - 1] = {
      ...tamListe[tamListe.length - 1],
      Tahmin: tamListe[tamListe.length - 1].Ciro,
    };
  }
  return [...tamListe, ...projeksiyon];
}

function buyumeYuzdesi(guncel, onceki) {
  if (!onceki || onceki === 0) return guncel > 0 ? 100 : 0;
  return ((guncel - onceki) / onceki) * 100;
}

function BuyumeRozeti({ yuzde }) {
  const pozitif = yuzde >= 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${pozitif ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
      {pozitif ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />}
      {Math.abs(yuzde).toFixed(1)}%
    </span>
  );
}

// ============================================================================
// --- ANA RAPOR BİLEŞENİ ---
// ============================================================================
export default function ReportsPage({ geriDon }) {
  const [ozet, setOzet] = useState(null);
  const [trend, setTrend] = useState([]);
  const [saatlik, setSaatlik] = useState([]);
  const [blok, setBlok] = useState([]);
  const [enKarli, setEnKarli] = useState([]);
  const [gunAraligi, setGunAraligi] = useState(30);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState('');

  const verileriGetir = useCallback(async () => {
    setYukleniyor(true);
    setHata('');
    try {
      const zamanDamgasi = new Date().getTime();
      const [ozetRes, trendRes, saatlikRes, blokRes, karliRes] = await Promise.all([
        fetch(`${API_BASE}/api/raporlar/ozet?t=${zamanDamgasi}`),
        fetch(`${API_BASE}/api/raporlar/trend?gun=${gunAraligi}&t=${zamanDamgasi}`),
        fetch(`${API_BASE}/api/raporlar/saatlik?t=${zamanDamgasi}`),
        fetch(`${API_BASE}/api/raporlar/blok?t=${zamanDamgasi}`),
        fetch(`${API_BASE}/api/raporlar/en-karli-islemler?t=${zamanDamgasi}`),
      ]);
      setOzet(await ozetRes.json());
      setTrend(await trendRes.json());
      setSaatlik(await saatlikRes.json());
      setBlok(await blokRes.json());
      setEnKarli(await karliRes.json());
    } catch (err) {
      setHata('Rapor verileri alınamadı. Lütfen sunucunun çalıştığından emin olun.');
    } finally {
      setYukleniyor(false);
    }
  }, [gunAraligi]);

  useEffect(() => { verileriGetir(); }, [verileriGetir]);

  const grafikVerisi = trend.length ? grafikVerisiHazirla(trend, gunAraligi) : [];
  const saatlikTam = Array.from({ length: 24 }, (_, saat) => {
    const kayit = saatlik.find((s) => s.Saat === saat);
    return { Saat: `${String(saat).padStart(2, '0')}:00`, Ciro: kayit ? Number(kayit.Ciro) : 0 };
  });

  return (
    <div className="min-h-screen bg-slate-100 p-8 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto">
        
        {/* Üst Bar */}
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm mb-8 border-t-4 border-blue-600">
          <div className="flex items-center gap-4">
            <button onClick={geriDon} className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2.5 rounded-lg transition-colors">
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold text-blue-900 tracking-tight flex items-center gap-2">
                <ArrowTrendingUpIcon className="w-7 h-7 text-blue-700" />
                Finansal Raporlar
              </h1>
              <p className="text-sm text-slate-500 font-medium">Ciro analizi, yoğunluklar</p>
            </div>
          </div>
          <div className="flex gap-2">
            {[7, 30, 90].map((g) => (
              <button
                key={g}
                onClick={() => setGunAraligi(g)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${gunAraligi === g ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {g} Gün
              </button>
            ))}
          </div>
        </div>

        {hata && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 font-semibold border border-red-200 flex items-center gap-2">
            <span>⚠️</span> {hata}
          </div>
        )}

        {yukleniyor && !ozet ? (
          <div className="text-center py-32 text-slate-400 font-semibold animate-pulse">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p>Raporlar hesaplanıyor...</p>
          </div>
        ) : ozet && (
          <div className="animate-fade-in-up">
            {/* KPI KARTLARI */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-2xl shadow-sm p-6 border-l-4 border-emerald-500 hover:-translate-y-1 transition-transform">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Bugünkü Ciro</p>
                <p className="text-2xl font-black text-slate-800 mb-2">{Number(ozet.Bugun).toFixed(0)} <span className="text-sm text-slate-500 font-medium">TL</span></p>
                <BuyumeRozeti yuzde={buyumeYuzdesi(Number(ozet.Bugun), Number(ozet.Dun))} />
                <span className="text-xs text-slate-400 ml-2">dünden</span>
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-6 border-l-4 border-blue-500 hover:-translate-y-1 transition-transform">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Son 7 Gün</p>
                <p className="text-2xl font-black text-slate-800 mb-2">{Number(ozet.Son7Gun).toFixed(0)} <span className="text-sm text-slate-500 font-medium">TL</span></p>
                <BuyumeRozeti yuzde={buyumeYuzdesi(Number(ozet.Son7Gun), Number(ozet.Onceki7Gun))} />
                <span className="text-xs text-slate-400 ml-2">önceki 7 güne</span>
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-6 border-l-4 border-purple-500 hover:-translate-y-1 transition-transform">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Son 30 Gün</p>
                <p className="text-2xl font-black text-slate-800 mb-2">{Number(ozet.Son30Gun).toFixed(0)} <span className="text-sm text-slate-500 font-medium">TL</span></p>
                <BuyumeRozeti yuzde={buyumeYuzdesi(Number(ozet.Son30Gun), Number(ozet.Onceki30Gun))} />
                <span className="text-xs text-slate-400 ml-2">önceki 30 güne</span>
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-6 border-l-4 border-orange-500 hover:-translate-y-1 transition-transform">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Ort. İşlem Ücreti</p>
                <p className="text-2xl font-black text-slate-800 mb-2">{Number(ozet.OrtalamaUcret).toFixed(0)} <span className="text-sm text-slate-500 font-medium">TL</span></p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                  <ClockIcon className="w-3.5 h-3.5" />
                  Ort. {Number(ozet.OrtalamaSureDakika).toFixed(0)} dk park
                </span>
              </div>
            </div>

            {/* NATIVE GELİR TRENDİ (SVG) */}
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-800">Günlük Gelir Trendi & 7 Günlük Projeksiyon</h2>
                <div className="flex gap-4 text-xs font-bold">
                  <span className="flex items-center gap-1"><span className="w-3 h-1 bg-blue-600 inline-block"></span> Gerçekleşen</span>
                  <span className="flex items-center gap-1 text-slate-500"><span className="w-3 h-1 border-t-2 border-dashed border-orange-500 inline-block"></span> Tahmin</span>
                </div>
              </div>
              <TrendGrafigi veri={grafikVerisi} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* NATIVE SAATLİK YOĞUNLUK (HTML BAR) */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-2">Saatlik Ciro Dağılımı</h2>
                <p className="text-xs text-slate-400 mb-4">Son 30 gün verisine göre 24 saatlik yoğunluk haritası.</p>
                <SaatlikGrafik veri={saatlikTam} />
              </div>

              {/* NATIVE BLOK BAZLI CİRO (CSS PIE) */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-2">Blok Bazlı Ciro Dağılımı</h2>
                <p className="text-xs text-slate-400 mb-4">Otopark bloklarının toplam ciroya katkısı.</p>
                <BlokGrafigi veri={blok} />
              </div>
            </div>

            {/* EN KARLI İŞLEMLER */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <ClipboardDocumentListIcon className="w-5 h-5 text-slate-500" />
                En Yüksek Ücretli 10 İşlem
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="py-3 text-slate-600 font-bold text-sm">Plaka</th>
                      <th className="py-3 text-slate-600 font-bold text-sm">Park Yeri</th>
                      <th className="py-3 text-slate-600 font-bold text-sm">Giriş</th>
                      <th className="py-3 text-slate-600 font-bold text-sm">Çıkış</th>
                      <th className="py-3 text-slate-600 font-bold text-sm">Süre</th>
                      <th className="py-3 text-slate-600 font-bold text-sm text-right">Ücret</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enKarli.length === 0 ? (
                      <tr><td colSpan="6" className="text-center py-8 text-slate-500 font-medium">Henüz tamamlanmış işlem yok.</td></tr>
                    ) : (
                      enKarli.map((islem, i) => (
                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="py-3 font-bold text-slate-800 tracking-wider">
                            <span className="bg-slate-100 px-2 py-1 rounded text-xs border border-slate-200">{islem.Plaka}</span>
                          </td>
                          <td className="py-3 text-slate-600 font-bold">{islem.ParkYeriAdi}</td>
                          <td className="py-3 text-slate-500 text-xs">{islem.GirisSaati?.replace('T', ' ')}</td>
                          <td className="py-3 text-slate-500 text-xs">{islem.CikisSaati?.replace('T', ' ')}</td>
                          <td className="py-3 text-slate-600 font-medium text-sm">{islem.SureDakika} dk</td>
                          <td className="py-3 text-right font-black text-emerald-600">{Number(islem.ToplamUcret).toFixed(0)} TL</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}