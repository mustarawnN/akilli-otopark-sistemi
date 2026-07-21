import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  TruckIcon,
  MapPinIcon,
  BanknotesIcon,
  ChartBarIcon,
  TicketIcon,
  PlusCircleIcon,
  ArrowRightOnRectangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  PencilSquareIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ClockIcon,
  ClipboardDocumentListIcon,
  CheckBadgeIcon,
  MagnifyingGlassIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  PresentationChartLineIcon,
  MoonIcon,
  SunIcon
} from '@heroicons/react/24/solid';
import musparkLogo from './assets/musparklogo.png';

// ============================================================================
// --- YEREL (NATIVE) GRAFİK BİLEŞENLERİ ---
// ============================================================================
const BLOK_RENKLERI = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2'];

function BuyumeRozeti({ yuzde }) {
  const pozitif = yuzde >= 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${pozitif ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
      {pozitif ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />}
      {Math.abs(yuzde).toFixed(1)}%
    </span>
  );
}

function TarifeKrilimiGrafigi({ veri }) {
  if (!veri || veri.length === 0) return <div className="h-64 flex items-center justify-center text-slate-400 dark:text-slate-500 font-medium">Bu tarih aralığında yeterli veri yok</div>;

  const maxIslem = Math.max(...veri.map(d => d.IslemSayisi), 1);
  const toplamCiro = veri.reduce((sum, d) => sum + Number(d.ToplamCiro), 0);
  const toplamIslem = veri.reduce((sum, d) => sum + Number(d.IslemSayisi), 0);

  return (
    <div className="flex flex-col gap-5 mt-4">
      {veri.map((item, i) => {
        const yuzde = (item.IslemSayisi / maxIslem) * 100;
        const ciroKatkisi = toplamCiro > 0 ? ((Number(item.ToplamCiro) / toplamCiro) * 100).toFixed(1) : 0;
        const islemKatkisi = toplamIslem > 0 ? ((Number(item.IslemSayisi) / toplamIslem) * 100).toFixed(1) : 0;
        
        return (
          <div key={i} className="group flex flex-col gap-2 relative">
            <div className="flex justify-between items-center text-sm">
              <span className="font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <ClockIcon className="w-4 h-4 text-blue-500" />
                {item.Tarife}
              </span>
              <div className="flex items-center gap-6 text-right">
                <span className="text-slate-500 dark:text-slate-400 font-medium w-24 text-left">
                  <strong className="text-slate-800 dark:text-slate-100">{item.IslemSayisi}</strong> araç <span className="text-[10px] text-slate-400 dark:text-slate-500">({islemKatkisi}%)</span>
                </span>
                <span className="w-28 text-emerald-600 dark:text-emerald-400 font-black text-right">
                  {Number(item.ToplamCiro).toFixed(0)} ₺ <span className="text-[10px] text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-300 px-1 py-0.5 rounded ml-1">%{ciroKatkisi}</span>
                </span>
              </div>
            </div>
            
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden shadow-inner flex">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-1000 shadow-sm relative"
                style={{ width: `${yuzde}%` }}
              >
                <div className="absolute top-0 bottom-0 left-0 right-0 bg-white opacity-20"></div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SaatlikGrafik({ veri }) {
  if (!veri || veri.length === 0) return <div className="h-52 flex items-center justify-center text-slate-400 dark:text-slate-500">Veri yok</div>;
  const maxCiro = Math.max(...veri.map(d => d.Ciro), 1);
  return (
    <div className="flex items-end h-52 gap-1 mt-4 border-b border-slate-200 dark:border-slate-700 pb-2">
      {veri.map((d, i) => {
        const h = (d.Ciro / maxCiro) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
            <div className="hidden group-hover:block absolute bottom-full mb-2 bg-slate-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-10 shadow-lg">
              {d.Saat} - {d.Ciro} ₺
            </div>
            <div className="w-full bg-indigo-500 rounded-t-sm transition-all duration-500 hover:bg-indigo-400" style={{ height: `${h}%`, minHeight: h > 0 ? '2px' : '0' }}></div>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-2 font-medium">{i % 3 === 0 ? d.Saat : ''}</span>
          </div>
        );
      })}
    </div>
  );
}

function BlokGrafigi({ veri }) {
  if (!veri || veri.length === 0) return <div className="h-52 flex items-center justify-center text-slate-400 dark:text-slate-500">Veri yok</div>;
  const totalCiro = veri.reduce((sum, b) => sum + Number(b.Ciro), 0) || 1;
  let startAngle = 0;
  const dilimler = veri.map((b, i) => {
    const angle = (Number(b.Ciro) / totalCiro) * 360;
    const slice = { ...b, startAngle, angle, color: BLOK_RENKLERI[i % BLOK_RENKLERI.length] };
    startAngle += angle;
    return slice;
  });
  const gradientStr = dilimler.map(s => `${s.color} ${s.startAngle}deg ${s.startAngle + s.angle}deg`).join(', ');

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-8 mt-4 h-52">
      <div className="w-40 h-40 rounded-full shadow-sm relative shrink-0 transition-transform hover:scale-105" style={{ background: `conic-gradient(${gradientStr})` }}>
        <div className="absolute inset-4 bg-white dark:bg-slate-800 rounded-full shadow-inner flex items-center justify-center">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 text-center">Blok<br/>Ciro</span>
        </div>
      </div>
      <div className="flex flex-col gap-2 w-full sm:w-auto">
        {dilimler.map((d, i) => (
          <div key={i} className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
            <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: d.color }}></span>
            <span className="font-bold w-6">{d.Blok}</span>
            <span className="font-medium text-slate-500 dark:text-slate-400">{Number(d.Ciro).toFixed(0)} ₺</span>
            <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">({((d.angle / 360) * 100).toFixed(1)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// RAPORLAR BİLEŞENİ
// ==========================================
function ReportsPage({ geriDon }) {
  const [ozet, setOzet] = useState(null);
  const [tarifeDagilimi, setTarifeDagilimi] = useState([]);
  const [saatlik, setSaatlik] = useState([]);
  const [blok, setBlok] = useState([]);
  const [enKarli, setEnKarli] = useState([]);
  const [gunAraligi, setGunAraligi] = useState(30);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState('');

  const API_BASE = 'http://127.0.0.1:8080';

  const verileriGetir = useCallback(async () => {
    setYukleniyor(true); setHata('');
    try {
      const zamanDamgasi = new Date().getTime();
      const [ozetRes, tarifeRes, saatlikRes, blokRes, karliRes] = await Promise.all([
        fetch(`${API_BASE}/api/raporlar/ozet?t=${zamanDamgasi}`),
        fetch(`${API_BASE}/api/raporlar/tarife-dagilimi?t=${zamanDamgasi}`),
        fetch(`${API_BASE}/api/raporlar/saatlik?t=${zamanDamgasi}`),
        fetch(`${API_BASE}/api/raporlar/blok?t=${zamanDamgasi}`),
        fetch(`${API_BASE}/api/raporlar/en-karli-islemler?t=${zamanDamgasi}`),
      ]);
      setOzet(await ozetRes.json());
      setTarifeDagilimi(await tarifeRes.json());
      setSaatlik(await saatlikRes.json());
      setBlok(await blokRes.json());
      setEnKarli(await karliRes.json());
    } catch (err) {
      setHata('Rapor verileri sunucudan alınamadı.');
    } finally {
      setYukleniyor(false);
    }
  }, [gunAraligi]);

  useEffect(() => { verileriGetir(); }, [verileriGetir]);

  const buyumeYuzdesi = (guncel, onceki) => {
    if (!onceki || onceki === 0) return guncel > 0 ? 100 : 0;
    return ((guncel - onceki) / onceki) * 100;
  };

  const saatlikTam = Array.from({ length: 24 }, (_, saat) => {
    const kayit = saatlik.find((s) => s.Saat === saat);
    return { Saat: `${String(saat).padStart(2, '0')}:00`, Ciro: kayit ? Number(kayit.Ciro) : 0 };
  });

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 p-6 font-sans text-slate-800 dark:text-slate-100 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm mb-6 border-t-4 border-emerald-600">
          <div className="flex items-center gap-4">
            <button onClick={geriDon} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 p-2.5 rounded-lg transition-colors">
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <img src={musparkLogo} alt="MusPark" className="h-14 w-auto select-none hidden sm:block" draggable="false" />
            <div className="hidden sm:block h-10 w-px bg-slate-200 dark:bg-slate-700"></div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                <ArrowTrendingUpIcon className="w-6 h-6 text-emerald-600" /> Finansal Raporlar
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">İş zekası ve gelir analizi</p>
            </div>
          </div>
          <div className="flex gap-2">
            {[7, 30, 90].map((g) => (
              <button key={g} onClick={() => setGunAraligi(g)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${gunAraligi === g ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                {g} Gün
              </button>
            ))}
          </div>
        </div>

        {hata && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 font-semibold border border-red-200 dark:border-red-800">{hata}</div>}

        {yukleniyor && !ozet ? (
          <div className="text-center py-20 text-slate-400 dark:text-slate-500 font-semibold animate-pulse">Raporlar yükleniyor...</div>
        ) : ozet && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-5 border-l-4 border-emerald-500">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Bugünkü Ciro</p>
                <p className="text-xl font-black text-slate-800 dark:text-slate-100 mb-1">{Number(ozet.Bugun).toFixed(0)} <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">TL</span></p>
                <BuyumeRozeti yuzde={buyumeYuzdesi(Number(ozet.Bugun), Number(ozet.Dun))} />
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-5 border-l-4 border-blue-500">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Son 7 Gün</p>
                <p className="text-xl font-black text-slate-800 dark:text-slate-100 mb-1">{Number(ozet.Son7Gun).toFixed(0)} <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">TL</span></p>
                <BuyumeRozeti yuzde={buyumeYuzdesi(Number(ozet.Son7Gun), Number(ozet.Onceki7Gun))} />
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-5 border-l-4 border-purple-500">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Son 30 Gün</p>
                <p className="text-xl font-black text-slate-800 dark:text-slate-100 mb-1">{Number(ozet.Son30Gun).toFixed(0)} <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">TL</span></p>
                <BuyumeRozeti yuzde={buyumeYuzdesi(Number(ozet.Son30Gun), Number(ozet.Onceki30Gun))} />
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-5 border-l-4 border-orange-500">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Ort. İşlem Ücreti</p>
                <p className="text-xl font-black text-slate-800 dark:text-slate-100 mb-1">{Number(ozet.OrtalamaUcret).toFixed(0)} <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">TL</span></p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400"><ClockIcon className="w-3.5 h-3.5" /> {Number(ozet.OrtalamaSureDakika).toFixed(0)} dk park</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <PresentationChartLineIcon className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Kalış Süresi ve Tarife Dağılımı</h2>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium">Müşterilerin otoparkı hangi saat aralıklarında kullandığını ve gelirin hangi tarifeden elde edildiğini gösterir.</p>
              <TarifeKrilimiGrafigi veri={tarifeDagilimi} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-5">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Saatlik Ciro Dağılımı</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Son 30 gün verisine göre 24 saatlik yoğunluk.</p>
                <SaatlikGrafik veri={saatlikTam} />
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-5">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Blok Bazlı Ciro Dağılımı</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Otopark bloklarının toplam ciroya katkısı.</p>
                <BlokGrafigi veri={blok} />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-5">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <ClipboardDocumentListIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                En Yüksek Ücretli 10 İşlem
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                      <th className="py-3 text-slate-600 dark:text-slate-300 font-bold text-sm">Plaka</th>
                      <th className="py-3 text-slate-600 dark:text-slate-300 font-bold text-sm">Park Yeri</th>
                      <th className="py-3 text-slate-600 dark:text-slate-300 font-bold text-sm text-right">Ücret</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enKarli.map((islem, i) => (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="py-3 font-bold text-slate-800 dark:text-slate-100 tracking-wider">
                          <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-xs border border-slate-200 dark:border-slate-600">
                            <TruckIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /> {islem.Plaka}
                          </div>
                        </td>
                        <td className="py-3 text-slate-600 dark:text-slate-300 font-medium">{islem.ParkYeriAdi}</td>
                        <td className="py-3 text-right font-black text-emerald-600 dark:text-emerald-400">{Number(islem.ToplamUcret).toFixed(0)} ₺</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ==========================================
// MAKET GÖRÜNÜMÜ (U KROKİ) BİLEŞENİ
// ==========================================
function MaketKrokisi({ parkYerleri, seciliParkYeriAyarla }) {
  const yerGetir = (adi) => parkYerleri.find(y => y.ParkYeriAdi === adi);

  // Maketindeki fiziksel dizilime göre gruplandırma
  const SolGrup = ['A1', 'A2', 'A3'];
  const ArkaGrup = ['A4', 'A5', 'B1', 'B2'];
  const SagGrup = ['B3', 'B4', 'B5'];

  const KrokiKutusu = ({ spotAdi }) => {
    const spot = yerGetir(spotAdi);
    if (!spot) return <div className="w-20 h-28 md:w-24 md:h-32 bg-slate-200 dark:bg-slate-700 rounded-xl opacity-50 flex items-center justify-center font-bold text-slate-400">{spotAdi}</div>;

    return (
      <div 
        onClick={() => seciliParkYeriAyarla(spot)} 
        className={`cursor-pointer relative w-20 h-28 md:w-24 md:h-32 rounded-xl flex flex-col items-center justify-between p-2 md:p-3 border-4 transition-all shadow-md group overflow-hidden ${
          spot.DoluMu 
            ? 'bg-red-500/10 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' 
            : 'bg-emerald-500/10 border-emerald-400 border-dashed hover:bg-emerald-500/20'
        }`}
      >
        <span className={`text-lg md:text-xl font-black ${spot.DoluMu ? 'text-red-500' : 'text-emerald-500'}`}>{spot.ParkYeriAdi}</span>
        
        {spot.DoluMu ? (
          <div className="w-full bg-white dark:bg-slate-800 border-2 border-slate-300 rounded px-1 py-1.5 md:py-2 text-center z-10 transform group-hover:scale-105 transition-transform flex flex-col items-center">
            <div className="bg-blue-600 h-1.5 w-full rounded-t-sm mb-1"></div>
            <span className="text-[9px] md:text-[11px] font-bold text-slate-800 dark:text-slate-100 tracking-wider break-all">{spot.MevcutPlaka}</span>
          </div>
        ) : (
          <CheckBadgeIcon className="w-8 h-8 md:w-10 md:h-10 text-emerald-400 opacity-50 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-10 flex flex-col items-center relative overflow-hidden border border-slate-200 dark:border-slate-700 w-full shadow-sm">
      {/* Yol Çizgileri Animasyonu */}
      <div className="absolute inset-x-16 inset-y-16 md:inset-x-24 md:inset-y-20 border-[8px] md:border-[12px] border-dashed border-slate-200 dark:border-slate-600 rounded-t-[3rem] border-b-0 pointer-events-none"></div>

      {/* Arka Duvar (A4, A5, B1, B2) */}
      <div className="flex gap-4 md:gap-8 mb-10 md:mb-16 z-10">
        {ArkaGrup.map(adi => <KrokiKutusu key={adi} spotAdi={adi} />)}
      </div>

      <div className="flex justify-between w-full z-10 px-2 md:px-8">
        {/* Sol Duvar (A1, A2, A3) */}
        <div className="flex flex-col gap-4 md:gap-8">
          {SolGrup.map(adi => <KrokiKutusu key={adi} spotAdi={adi} />)}
        </div>

        {/* Orta Gişe / Kontrol Kulübesi */}
        <div className="flex-1 flex flex-col items-center justify-end pb-4 md:pb-8">
          <div className="w-28 h-28 md:w-40 md:h-40 bg-slate-100 dark:bg-slate-900 rounded-2xl flex flex-col items-center justify-center border-4 border-slate-300 dark:border-slate-700 shadow-inner relative">
            <div className="absolute -top-3 md:-top-4 bg-blue-600 px-3 md:px-5 py-1 rounded-full text-white font-bold text-[10px] md:text-xs tracking-widest shadow-md">GİŞE</div>
            <span className="text-blue-500 font-black text-5xl md:text-7xl">P</span>
            <span className="text-slate-400 dark:text-slate-500 text-[9px] md:text-xs mt-1 md:mt-2 font-bold tracking-widest">OTOPARK</span>
          </div>
        </div>

        {/* Sağ Duvar (B3, B4, B5) */}
        <div className="flex flex-col gap-4 md:gap-8">
          {SagGrup.map(adi => <KrokiKutusu key={adi} spotAdi={adi} />)}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// ANA UYGULAMA (APP) BİLEŞENİ
// ==========================================
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [kullaniciAdi, setKullaniciAdi] = useState('');
  const [sifre, setSifre] = useState('');
  const [loginHata, setLoginHata] = useState('');
  const [aktifKullanici, setAktifKullanici] = useState('');
  
  const [seciliParkYeri, setSeciliParkYeri] = useState(null);

  const [aracGirisModalAcik, setAracGirisModalAcik] = useState(false);
  const [girisPlakasi, setGirisPlakasi] = useState('');
  const [girisHata, setGirisHata] = useState('');
  const [parkYerleri, setParkYerleri] = useState([]);
  const [fiyatlandirmaModalAcik, setFiyatlandirmaModalAcik] = useState(false);
  const [fiyatlandirma, setFiyatlandirma] = useState(null);
  const [taslakFiyatlandirma, setTaslakFiyatlandirma] = useState(null);
  const [duzenlemeModu, setDuzenlemeModu] = useState(false);
  const [fiyatKaydediliyor, setFiyatKaydediliyor] = useState(false);
  
  const [aramaMetni, setAramaMetni] = useState('');
  const [suAn, setSuAn] = useState(new Date());
  const [gorunum, setGorunum] = useState('panel');

  // --- KARANLIK MOD ---
  const [karanlikMod, setKaranlikMod] = useState(() => {
    try {
      const kayitli = localStorage.getItem('musparkKaranlikMod');
      if (kayitli !== null) return kayitli === 'true';
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    const kok = document.documentElement;
    if (karanlikMod) {
      kok.classList.add('dark');
    } else {
      kok.classList.remove('dark');
    }
    try {
      localStorage.setItem('musparkKaranlikMod', karanlikMod);
    } catch (e) {}
  }, [karanlikMod]);

  const karanlikModuDegistir = () => setKaranlikMod(prev => !prev);

  const [simulasyonAktif, setSimulasyonAktif] = useState(false);
  const [simulasyonOnayAcik, setSimulasyonOnayAcik] = useState(false);
  const parkYerleriRef = useRef([]);

  const [toasts, setToasts] = useState([]);
  const toastTimers = useRef({});

  const [islemGecmisiModalAcik, setIslemGecmisiModalAcik] = useState(false);
  const [islemGecmisi, setIslemGecmisi] = useState([]);
  
  const [canliAkis, setCanliAkis] = useState([]);

  const toastKaldir = (id) => {
    if (toastTimers.current[id]) {
      clearTimeout(toastTimers.current[id].timeoutId);
      delete toastTimers.current[id];
    }
    setToasts(prev => prev.map(t => (t.id === id ? { ...t, kapaniyor: true } : t)));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 250);
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
    timer.kalanSure = Math.max(timer.sure - (Date.now() - timer.baslangic), 300);
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
    parkYerleriRef.current = parkYerleri;
  }, [parkYerleri]);

  useEffect(() => {
    let botInterval;
    if (simulasyonAktif && isLoggedIn && gorunum === 'panel') {
      botInterval = setInterval(async () => {
        const doluYerSayisi = parkYerleriRef.current.filter(y => y.DoluMu).length;
        const toplamYer = parkYerleriRef.current.length;
        
        if (toplamYer === 0) return; 

        let aksiyon = 'GIRIS';
        if (doluYerSayisi === 0) aksiyon = 'GIRIS';
        else if (doluYerSayisi === toplamYer) aksiyon = 'CIKIS';
        else aksiyon = Math.random() > 0.4 ? 'GIRIS' : 'CIKIS';

        if (aksiyon === 'GIRIS') {
          const harfler = 'ABCDEFGHIJKLMNOPRSTUVYZ';
          const ilKodu = String(Math.floor(1 + Math.random() * 81)).padStart(2, '0');
          const harfSayisi = Math.floor(Math.random() * 3) + 1;
          let harfBolumu = '';
          for (let i = 0; i < harfSayisi; i++) harfBolumu += harfler[Math.floor(Math.random() * harfler.length)];
          const rakamSayisi = harfSayisi === 1 ? 4 : (harfSayisi === 2 ? 3 : 2);
          let rakamBolumu = '';
          for (let i = 0; i < rakamSayisi; i++) rakamBolumu += Math.floor(Math.random() * 10);
          const plaka = `${ilKodu} ${harfBolumu} ${rakamBolumu}`;

          try {
            const res = await fetch('http://127.0.0.1:8080/api/giris', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ plaka })
            });
            const data = await res.json();
            if (data.durum === 'BASARILI') {
              toastEkle('basarili', `🤖 BOT: ${data.parkEdilenYer} alanına ${data.plaka} giriş yaptı.`, 2500);
              durumuVeIstatistigiGetir();
            }
          } catch(e) {}
        } else {
          const doluYerler = parkYerleriRef.current.filter(y => y.DoluMu);
          const rastgeleYer = doluYerler[Math.floor(Math.random() * doluYerler.length)];
          try {
            const res = await fetch('http://127.0.0.1:8080/api/cikis', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ plaka: rastgeleYer.MevcutPlaka })
            });
            const data = await res.json();
            if (data.durum === 'BASARILI') {
              toastEkle('basarili', `🤖 BOT: ${data.plaka} çıkış yaptı. Ödenen: ${data.toplamUcret}`, 2500);
              durumuVeIstatistigiGetir();
            }
          } catch(e) {}
        }
      }, 3500); 
    }
    return () => clearInterval(botInterval);
  }, [simulasyonAktif, isLoggedIn, gorunum]);

  useEffect(() => {
    const timer = setInterval(() => setSuAn(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let interval;
    if (isLoggedIn && gorunum === 'panel') {
      durumuVeIstatistigiGetir();
      fiyatlandirmayiGetir(); 
      interval = setInterval(durumuVeIstatistigiGetir, 3000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isLoggedIn, gorunum]);

  const fiyatlandirmayiGetir = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8080/api/fiyatlandirma');
      const data = await res.json();
      setFiyatlandirma(data);
      setTaslakFiyatlandirma(data);
    } catch (error) {
      console.error('Fiyatlandırma çekilemedi', error);
    }
  };

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

  const fiyatlandirmaModaliniAc = async () => {
    setFiyatlandirmaModalAcik(true);
    setDuzenlemeModu(false);
    try {
      const res = await fetch('http://127.0.0.1:8080/api/fiyatlandirma');
      const data = await res.json();
      setFiyatlandirma(data);
      setTaslakFiyatlandirma(data);
    } catch (error) {
      toastEkle('hata', 'Fiyatlandırma bilgisi alınamadı!');
    }
  };

  const fiyatAlaniniGuncelle = (alan, deger) => {
    setTaslakFiyatlandirma(prev => ({ ...prev, [alan]: deger }));
  };

  const fiyatlandirmayiKaydet = async () => {
    setFiyatKaydediliyor(true);
    try {
      const res = await fetch('http://127.0.0.1:8080/api/fiyatlandirma', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taslakFiyatlandirma)
      });
      const data = await res.json();
      if (data.durum === 'BASARILI') {
        setFiyatlandirma(data.ayar);
        setTaslakFiyatlandirma(data.ayar);
        setDuzenlemeModu(false);
        toastEkle('basarili', 'Fiyatlandırma başarıyla güncellendi.');
      } else {
        toastEkle('hata', data.mesaj || 'Güncelleme başarısız.');
      }
    } catch (error) {
      toastEkle('hata', 'Sunucuya bağlanılamadı!');
    } finally {
      setFiyatKaydediliyor(false);
    }
  };

  const sistemdenCikisYap = () => {
    setIsLoggedIn(false); setKullaniciAdi(''); setSifre(''); setParkYerleri([]);
    tumToastlariTemizle(); setBiletModalAcik(false); setCikisOnayAcik(false); setGorunum('panel');
  };

  const cikisOnayiIste = () => setCikisOnayAcik(true);

  const durumuVeIstatistigiGetir = async () => {
    try {
      const zamanDamgasi = new Date().getTime();
      const resDurum = await fetch(`http://127.0.0.1:8080/api/durum?t=${zamanDamgasi}`, { cache: 'no-store' });
      let yerler = [];
      if (resDurum.ok) {
        yerler = await resDurum.json();
        setParkYerleri(yerler);
      }

      const resStat = await fetch(`http://127.0.0.1:8080/api/istatistik?t=${zamanDamgasi}`, { cache: 'no-store' });
      if (resStat.ok) setIstatistikler(await resStat.json());

      const resGecmis = await fetch(`http://127.0.0.1:8080/api/islem-gecmisi?t=${zamanDamgasi}`, { cache: 'no-store' });
      let gecmis = [];
      if (resGecmis.ok) gecmis = await resGecmis.json();

      const girisler = yerler.filter(y => y.DoluMu).map(y => ({
        id: `g_${y.ParkYeriID}_${y.SonGuncelleme}`,
        tip: 'GIRIS',
        plaka: y.MevcutPlaka,
        yer: y.ParkYeriAdi,
        zaman: new Date(y.SonGuncelleme)
      }));

      const cikislar = gecmis.slice(0, 10).map(c => ({
        id: `c_${c.KayitID}`,
        tip: 'CIKIS',
        plaka: c.Plaka,
        yer: c.ParkYeriAdi,
        ucret: c.ToplamUcret,
        zaman: new Date(c.CikisSaati)
      }));
      
      const birlesik = [...girisler, ...cikislar].sort((a, b) => b.zaman - a.zaman).slice(0, 6);
      setCanliAkis(birlesik);

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
    const rakamSayisi = harfSayisi === 1 ? 4 : (harfSayisi === 2 ? 3 : 2);
    let rakamBolumu = '';
    for (let i = 0; i < rakamSayisi; i++) rakamBolumu += Math.floor(Math.random() * 10);
    setGirisPlakasi(`${ilKodu} ${harfBolumu} ${rakamBolumu}`);
    setGirisHata('');
  };

  const aracGirisModaliAc = () => {
    setGirisPlakasi(''); setGirisHata(''); setAracGirisModalAcik(true);
  };

  const plakaOnaylaVeGirisYap = async () => {
    const temizPlaka = girisPlakasi.trim().toUpperCase();
    const plakaRegex = /^\d{2}\s?[A-PRSTUVYZ]{1,3}\s?\d{2,4}$/;

    if (!plakaRegex.test(temizPlaka)) {
      setGirisHata('Geçersiz plaka formatı! Örn: 34 ABC 1234'); return;
    }

    try {
      const res = await fetch('http://127.0.0.1:8080/api/giris', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plaka: temizPlaka })
      });
      const data = await res.json();
      if (data.durum === 'BASARILI') {
        toastEkle('basarili', `Araç Girdi: ${data.parkEdilenYer} (Plaka: ${data.plaka})`);
        setAracGirisModalAcik(false); durumuVeIstatistigiGetir();
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plaka })
      });
      const data = await res.json();
      if (data.durum === 'BASARILI') {
        toastEkle('basarili', `Çıkış Başarılı! Tahsil edilen ücret: ${data.toplamUcret} ₺`);
        durumuVeIstatistigiGetir();
      } else {
        toastEkle('hata', `Hata: ${data.mesaj}`);
      }
    } catch (error) {
      toastEkle('hata', 'Çıkış işlemi başarısız!');
    }
  };

  const islemGecmisiniGetir = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8080/api/islem-gecmisi');
      const data = await res.json();
      setIslemGecmisi(data);
      setIslemGecmisiModalAcik(true);
    } catch (error) {
      toastEkle('hata', 'İşlem geçmişi alınamadı!');
    }
  };

  const saatFormatla = (tarihString) => {
    if (!tarihString) return "Bilinmiyor";
    const tarih = new Date(tarihString);
    return tarih.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  const saatFormatlaFeed = (dateObj) => {
    const farkMs = new Date() - dateObj;
    const farkDk = Math.floor(farkMs / 60000);
    if (farkDk === 0) return 'Az önce';
    if (farkDk < 60) return `${farkDk} dk önce`;
    return `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
  };

  const sureHesapla = (girisSaatiStr) => {
    if (!girisSaatiStr) return { dakika: 0, metin: '' };
    const giris = new Date(girisSaatiStr);
    const farkMs = suAn - giris;
    const toplamDakika = Math.max(0, Math.floor(farkMs / 60000));
    
    const gun = Math.floor(toplamDakika / 1440);
    const kalanDakikaGunSonrasi = toplamDakika % 1440;
    
    const saat = Math.floor(kalanDakikaGunSonrasi / 60);
    const kalanDakika = kalanDakikaGunSonrasi % 60;
    
    let metin = '';
    if (gun > 0) metin += `${gun} Gün `;
    if (saat > 0) metin += `${saat} Sa `;
    metin += `${kalanDakika} Dk`;
    
    return { dakika: toplamDakika, metin: metin || '1 Dk' };
  };

  const anlikUcretHesapla = (dakika) => {
    if (!fiyatlandirma) return 0;
    if (dakika <= 30) return 0;
    if (dakika <= 60) return Number(fiyatlandirma.Tarife0_1Saat);
    if (dakika <= 120) return Number(fiyatlandirma.Tarife1_2Saat);
    if (dakika <= 240) return Number(fiyatlandirma.Tarife2_4Saat);
    if (dakika <= 480) return Number(fiyatlandirma.Tarife4_8Saat);
    if (dakika <= 720) return Number(fiyatlandirma.Tarife8_12Saat);
    if (dakika <= 1440) return Number(fiyatlandirma.Tarife12_24Saat);

    const asanDakika = dakika - 1440;
    const ekGun = Math.ceil(asanDakika / 1440);
    return Number(fiyatlandirma.Tarife12_24Saat) + (ekGun * Number(fiyatlandirma.Tarife24SaatSonrasiGunluk));
  };

  const filtrelenmisParkYerleri = parkYerleri.filter(yer => {
    if (aramaMetni.trim() === '') return true;
    const arama = aramaMetni.toLowerCase();
    return (
      (yer.MevcutPlaka && yer.MevcutPlaka.toLowerCase().includes(arama)) ||
      (yer.ParkYeriAdi.toLowerCase().includes(arama))
    );
  });

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4 transition-colors duration-300">
        <button
          onClick={karanlikModuDegistir}
          className="fixed top-5 right-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-2.5 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          title={karanlikMod ? 'Aydınlık moda geç' : 'Karanlık moda geç'}
        >
          {karanlikMod ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
        </button>
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md">
          <div className="text-center mb-8">
            <img src={musparkLogo} alt="MusPark" className="h-24 w-auto mx-auto mb-4 select-none" draggable="false" />
            <p className="text-slate-500 dark:text-slate-400">Sisteme erişmek için lütfen giriş yapın.</p>
          </div>
          <form onSubmit={girisYap} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Kullanıcı Adı</label>
              <input type="text" className="w-full px-4 py-3 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-blue-500" value={kullaniciAdi} onChange={(e) => setKullaniciAdi(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Şifre</label>
              <input type="password" className="w-full px-4 py-3 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-blue-500" value={sifre} onChange={(e) => setSifre(e.target.value)} required />
            </div>
            {loginHata && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm font-semibold text-center border dark:border-red-800 flex items-center justify-center gap-2">
                <XCircleIcon className="w-5 h-5" /> {loginHata}
              </div>
            )}
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-md transition-colors">Giriş Yap</button>
          </form>
        </div>
      </div>
    );
  }

  if (gorunum === 'raporlar') {
    return <ReportsPage geriDon={() => setGorunum('panel')} />;
  }

  const dolulukYuzdesi = istatistikler.ToplamKapasite > 0 ? (istatistikler.DoluAracSayisi / istatistikler.ToplamKapasite) * 100 : 0;
  const renkSinifiDonut = dolulukYuzdesi >= 80 ? 'text-red-500' : dolulukYuzdesi >= 50 ? 'text-orange-500' : 'text-blue-500';

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 p-6 font-sans text-slate-800 dark:text-slate-100 relative overflow-x-hidden transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        
        {/* Üst Bar */}
        <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm mb-6 border-t-4 border-blue-600 relative z-40">
          <div className="flex items-center gap-4">
            <img src={musparkLogo} alt="MusPark" className="h-16 w-auto select-none" draggable="false" />
            <div className="hidden sm:block h-11 w-px bg-slate-200 dark:bg-slate-700"></div>
            <div>
              <h1 className="text-xl font-extrabold text-blue-900 dark:text-blue-300 tracking-tight">Yönetim Paneli</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Hoş geldin, <span className="text-blue-600 dark:text-blue-400 uppercase">{aktifKullanici}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={karanlikModuDegistir}
              className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-bold p-2.5 rounded-lg transition-colors shadow-sm border-2 border-slate-200 dark:border-slate-600"
              title={karanlikMod ? 'Aydınlık moda geç' : 'Karanlık moda geç'}
            >
              {karanlikMod ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => {
                if (simulasyonAktif) setSimulasyonAktif(false);
                else setSimulasyonOnayAcik(true);
              }} 
              className={`font-bold py-2 px-4 rounded-lg transition-all flex items-center gap-2 shadow-sm border-2 ${
                simulasyonAktif 
                  ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 hover:bg-purple-200 dark:hover:bg-purple-900/60' 
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              <CpuChipIcon className={`w-5 h-5 ${simulasyonAktif ? 'animate-pulse text-purple-600 dark:text-purple-400' : 'text-slate-400 dark:text-slate-500'}`} />
              <span className="hidden md:inline">{simulasyonAktif ? '🤖 Simülasyon: AÇIK' : '🤖 Simülasyon'}</span>
            </button>
            <button onClick={cikisOnayiIste} className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold py-2 px-5 rounded-lg transition-colors flex items-center gap-2">
              <ArrowRightOnRectangleIcon className="w-5 h-5" /> <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 mb-6 items-start">
          
          <div className="flex-1 flex flex-col gap-6 w-full">
            
            {/* İSTATİSTİK KARTLARI */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-5 border-l-4 border-emerald-500 flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Günlük Toplam Ciro</p>
                  <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{istatistikler.GunlukCiro} <span className="text-lg text-slate-500 dark:text-slate-400 font-medium">₺</span></p>
                </div>
                <div className="bg-emerald-100 dark:bg-emerald-900/40 p-3 rounded-full"><BanknotesIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /></div>
              </div>
              
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-5 border-l-4 border-blue-500 flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Anlık Doluluk</p>
                  <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{istatistikler.DoluAracSayisi} <span className="text-lg text-slate-500 dark:text-slate-400 font-medium">/ {istatistikler.ToplamKapasite}</span></p>
                </div>
                <div className="relative w-14 h-14 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-100 dark:text-slate-700"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className={`${renkSinifiDonut} transition-all duration-1000`}
                      strokeDasharray={`${dolulukYuzdesi}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex items-center justify-center">
                    <TruckIcon className={`w-5 h-5 ${renkSinifiDonut}`} />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-5 border-l-4 border-purple-500 flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Bugün Giren Araç</p>
                  <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{istatistikler.BugunGirenArac}</p>
                </div>
                <div className="bg-purple-100 dark:bg-purple-900/40 p-3 rounded-full"><ChartBarIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" /></div>
              </div>
            </div>

            <div className="flex flex-col 2xl:flex-row justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 gap-4">
              
              <div className="flex flex-wrap gap-2.5 w-full 2xl:w-auto items-center">
                
                <button onClick={aracGirisModaliAc} className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-lg shadow-sm transition-transform hover:-translate-y-0.5 flex items-center justify-center gap-2">
                  <PlusCircleIcon className="w-5 h-5" /> Yeni Araç
                </button>
                
                <button onClick={() => setBiletModalAcik(true)} className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-lg shadow-sm transition-transform hover:-translate-y-0.5 flex items-center justify-center gap-2">
                  <TicketIcon className="w-5 h-5" /> İçeridekiler
                </button>

                <div className="hidden sm:block h-8 w-px bg-slate-200 dark:bg-slate-600 mx-1"></div>

                <button onClick={islemGecmisiniGetir} className="flex-1 sm:flex-none bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm transition-transform hover:-translate-y-0.5 flex items-center justify-center gap-2">
                  <ClipboardDocumentListIcon className="w-5 h-5" /> Geçmiş
                </button>
                <button onClick={() => setGorunum('raporlar')} className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm transition-transform hover:-translate-y-0.5 flex items-center justify-center gap-2">
                  <ArrowTrendingUpIcon className="w-5 h-5" /> Raporlar
                </button>
                <button onClick={fiyatlandirmaModaliniAc} className="flex-1 sm:flex-none bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm transition-transform hover:-translate-y-0.5 flex items-center justify-center gap-2">
                  <CurrencyDollarIcon className="w-5 h-5" /> Tarife
                </button>
                
              </div>

              <div className="relative w-full 2xl:w-64 shrink-0">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Plaka veya Park Yeri Ara..."
                  value={aramaMetni}
                  onChange={(e) => setAramaMetni(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border-2 border-slate-100 dark:border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 outline-none transition-all font-semibold text-slate-700 dark:text-slate-100 bg-slate-50 dark:bg-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* OTOPARK U-KROKİ TASARIMI */}
            <div className="w-full mt-4">
              <MaketKrokisi 
                parkYerleri={filtrelenmisParkYerleri} 
                seciliParkYeriAyarla={setSeciliParkYeri} 
              />
            </div>
            
          </div>

          <div className="w-full lg:w-80 xl:w-96 flex-shrink-0">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 h-full min-h-[400px]">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
                <ClockIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Canlı Akış
              </h3>
              <div className="flex flex-col gap-5">
                {canliAkis.map((islem) => (
                  <div key={islem.id} className="flex gap-3 items-start animate-[slideInRight_0.3s_ease-out]">
                    <div className={`mt-0.5 rounded-full p-2 shrink-0 ${islem.tip === 'GIRIS' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'}`}>
                      <ArrowRightOnRectangleIcon className={`w-4 h-4 ${islem.tip === 'GIRIS' ? 'transform rotate-180' : ''}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-slate-700 dark:text-slate-200 tracking-wide text-sm">{islem.plaka}</span>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-700 px-1.5 py-0.5 rounded">{saatFormatlaFeed(islem.zaman)}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        {islem.tip === 'GIRIS' ? (
                          <><strong className="text-blue-600 dark:text-blue-400">{islem.yer}</strong> alanına <span className="font-semibold">girdi</span>.</>
                        ) : (
                          <><strong className="text-emerald-600 dark:text-emerald-400">{islem.yer}</strong> alanından çıktı. <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-1">+{islem.ucret}₺</span></>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
                {canliAkis.length === 0 && (
                  <div className="text-center py-10 opacity-60">
                    <ClockIcon className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Henüz bir hareket yok.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {seciliParkYeri && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-slate-900 bg-opacity-40 transition-opacity" onClick={() => setSeciliParkYeri(null)}></div>
          
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-800 h-full shadow-2xl flex flex-col animate-[slideInRight_0.3s_ease-out]">
            <div className={`p-5 text-white flex justify-between items-center ${seciliParkYeri.DoluMu ? 'bg-red-600' : 'bg-emerald-600'}`}>
              <h2 className="text-xl font-bold flex items-center gap-2">
                {seciliParkYeri.DoluMu ? <TruckIcon className="w-6 h-6"/> : <CheckBadgeIcon className="w-6 h-6"/>}
                {seciliParkYeri.ParkYeriAdi} Detayları
              </h2>
              <button onClick={() => setSeciliParkYeri(null)} className="text-white hover:text-slate-200 font-bold text-3xl leading-none">&times;</button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              {seciliParkYeri.DoluMu ? (
                <div className="space-y-6">
                  <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-600 text-center shadow-sm">
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mb-3">Araç Plakası</p>
                    <div className="flex items-center w-full max-w-[200px] h-12 bg-white rounded border-2 border-slate-300 shadow-sm overflow-hidden mx-auto">
                      <div className="bg-blue-600 h-full w-8 flex flex-col items-center justify-end pb-1 shrink-0">
                        <span className="text-white text-[10px] font-bold leading-none">TR</span>
                      </div>
                      <div className="flex-1 text-center font-black text-slate-800 text-xl tracking-widest px-1">
                        {seciliParkYeri.MevcutPlaka}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
                      <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5"><ClockIcon className="w-4 h-4"/> Giriş Saati</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">{saatFormatla(seciliParkYeri.SonGuncelleme)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
                      <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        İçerideki Süre
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">{sureHesapla(seciliParkYeri.SonGuncelleme).metin}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1.5"><BanknotesIcon className="w-5 h-5 text-emerald-500"/> Güncel Ücret</span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400 text-2xl">{anlikUcretHesapla(sureHesapla(seciliParkYeri.SonGuncelleme).dakika)} ₺</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-80">
                  <div className="bg-emerald-100 dark:bg-emerald-900/40 p-4 rounded-full mb-4">
                    <CheckBadgeIcon className="w-16 h-16 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">Bu Alan Boş</h3>
                  <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Bu park yerine yeni bir araç girişi yapabilirsiniz.</p>
                </div>
              )}
            </div>

            <div className="p-5 bg-slate-50 dark:bg-slate-700/50 border-t border-slate-200 dark:border-slate-700 flex gap-3">
              <button onClick={() => setSeciliParkYeri(null)} className="flex-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold py-3 rounded-lg transition-colors shadow-sm">Kapat</button>
              {seciliParkYeri.DoluMu ? (
                <button onClick={() => { araciCikar(seciliParkYeri.MevcutPlaka); setSeciliParkYeri(null); }} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md">Çıkış Yap</button>
              ) : (
                <button onClick={() => { setSeciliParkYeri(null); aracGirisModaliAc(); }} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md">Yeni Araç Al</button>
              )}
            </div>
          </div>
        </div>
      )}

      {aracGirisModalAcik && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-blue-900 p-5 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2"><TruckIcon className="w-6 h-6" /> Araç Girişi</h2>
              <button onClick={() => setAracGirisModalAcik(false)} className="text-white hover:text-red-400 font-bold text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Plaka Numarası</label>
              <input type="text" value={girisPlakasi} onChange={(e) => { setGirisPlakasi(e.target.value.toUpperCase()); setGirisHata(''); }} placeholder="34 ABC 1234" className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-bold tracking-wider text-center uppercase outline-none" autoFocus />
              {girisHata && <div className="mt-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm font-semibold text-center border dark:border-red-800 flex items-center justify-center gap-2"><XCircleIcon className="w-5 h-5 shrink-0" />{girisHata}</div>}
              <button onClick={rastgelePlakaUret} className="w-full mt-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 transition-colors">🎲 Rastgele Plaka Üret</button>
            </div>
            <div className="bg-slate-100 dark:bg-slate-700 p-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-600">
              <button onClick={() => setAracGirisModalAcik(false)} className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold py-2 px-5 rounded-lg transition-colors">İptal</button>
              <button onClick={plakaOnaylaVeGirisYap} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-lg transition-colors">Girişi Onayla</button>
            </div>
          </div>
        </div>
      )}

      {biletModalAcik && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="bg-indigo-900 p-5 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2"><TicketIcon className="w-6 h-6" /> İçerideki Araçlar</h2>
              <button onClick={() => setBiletModalAcik(false)} className="text-white hover:text-red-400 font-bold text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                    <th className="py-3 text-slate-600 dark:text-slate-300 font-bold">Park Yeri</th>
                    <th className="py-3 text-slate-600 dark:text-slate-300 font-bold">Plaka</th>
                    <th className="py-3 text-slate-600 dark:text-slate-300 font-bold">Giriş Saati</th>
                  </tr>
                </thead>
                <tbody>
                  {parkYerleri.filter(p => p.DoluMu).length === 0 ? (
                    <tr><td colSpan="3" className="text-center py-8 text-slate-500 dark:text-slate-400 font-medium">Şu an içeride araç bulunmuyor.</td></tr>
                  ) : (
                    parkYerleri.filter(p => p.DoluMu).map(yer => (
                      <tr key={yer.ParkYeriID} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="py-4 font-black text-slate-800 dark:text-slate-100 text-lg">{yer.ParkYeriAdi}</td>
                        <td className="py-4 text-red-600 dark:text-red-400 font-bold tracking-wider">{yer.MevcutPlaka}</td>
                        <td className="py-4 text-slate-600 dark:text-slate-300 font-medium">{saatFormatla(yer.SonGuncelleme)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="bg-slate-100 dark:bg-slate-700 p-4 text-right border-t border-slate-200 dark:border-slate-600">
              <button onClick={() => setBiletModalAcik(false)} className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">Kapat</button>
            </div>
          </div>
        </div>
      )}

      {cikisOnayAcik && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-red-600 p-5 text-white flex items-center gap-2"><ArrowRightOnRectangleIcon className="w-6 h-6" /><h2 className="text-lg font-bold">Çıkış Onayı</h2></div>
            <div className="p-6 text-center">
              <p className="text-slate-700 dark:text-slate-200 font-medium text-base">Sistemden çıkış yapmak istediğine emin misin?</p>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">Oturumun sonlandırılacak, tekrar giriş yapman gerekecek.</p>
            </div>
            <div className="bg-slate-100 dark:bg-slate-700 p-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-600">
              <button onClick={() => setCikisOnayAcik(false)} className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold py-2 px-5 rounded-lg transition-colors">İptal</button>
              <button onClick={sistemdenCikisYap} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-5 rounded-lg transition-colors">Evet, Çıkış Yap</button>
            </div>
          </div>
        </div>
      )}

      {simulasyonOnayAcik && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-orange-500 p-5 text-white flex items-center gap-2">
              <ExclamationTriangleIcon className="w-6 h-6" />
              <h2 className="text-lg font-bold">Simülasyon Uyarısı</h2>
            </div>
            <div className="p-6 text-center">
              <p className="text-slate-700 dark:text-slate-200 font-medium text-base">Oto-Simülasyon modunu başlatmak istediğinize emin misiniz?</p>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">Bu mod, sistemi test etmek için sahte giriş-çıkışlar oluşturur. İçeride gerçek müşteri araçları varken kullanılması verileri karıştırabilir.</p>
            </div>
            <div className="bg-slate-100 dark:bg-slate-700 p-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-600">
              <button onClick={() => setSimulasyonOnayAcik(false)} className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold py-2 px-5 rounded-lg transition-colors">İptal</button>
              <button onClick={() => { setSimulasyonAktif(true); setSimulasyonOnayAcik(false); }} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-5 rounded-lg transition-colors">Evet, Başlat</button>
            </div>
          </div>
        </div>
      )}

      {fiyatlandirmaModalAcik && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
            <div className="bg-amber-500 p-5 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2"><CurrencyDollarIcon className="w-6 h-6" /> Fiyatlandırma Tarifesi</h2>
              <button onClick={() => { setFiyatlandirmaModalAcik(false); setDuzenlemeModu(false); }} className="text-white hover:text-red-200 font-bold text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 max-h-[65vh] overflow-y-auto">
              {!fiyatlandirma ? (
                <p className="text-center text-slate-500 dark:text-slate-400 py-8 font-medium">Yükleniyor...</p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                      <th className="py-3 text-slate-600 dark:text-slate-300 font-bold">Kalış Süresi</th>
                      <th className="py-3 text-slate-600 dark:text-slate-300 font-bold text-right">Ücret (₺)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100 dark:border-slate-700">
                      <td className="py-3 font-medium text-slate-700 dark:text-slate-200">İlk 30 dakika</td>
                      <td className="py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">Ücretsiz</td>
                    </tr>
                    {[
                      { alan: 'Tarife0_1Saat', etiket: '0 - 1 Saat' },
                      { alan: 'Tarife1_2Saat', etiket: '1 - 2 Saat' },
                      { alan: 'Tarife2_4Saat', etiket: '2 - 4 Saat' },
                      { alan: 'Tarife4_8Saat', etiket: '4 - 8 Saat' },
                      { alan: 'Tarife8_12Saat', etiket: '8 - 12 Saat' },
                      { alan: 'Tarife12_24Saat', etiket: '12 - 24 Saat' },
                    ].map(satir => (
                      <tr key={satir.alan} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="py-3 font-medium text-slate-700 dark:text-slate-200">{satir.etiket}</td>
                        <td className="py-3 text-right">
                          {duzenlemeModu ? (
                            <input type="number" min="0" step="0.01" value={taslakFiyatlandirma[satir.alan]} onChange={(e) => fiyatAlaniniGuncelle(satir.alan, e.target.value)} className="w-24 text-right px-2 py-1 rounded-lg border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none font-bold" />
                          ) : (
                            <span className="font-bold text-slate-800 dark:text-slate-100">{Number(fiyatlandirma[satir.alan]).toFixed(0)} ₺</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td className="py-3 font-medium text-slate-700 dark:text-slate-200">24 saati aşan her gün</td>
                      <td className="py-3 text-right">
                        {duzenlemeModu ? (
                          <input type="number" min="0" step="0.01" value={taslakFiyatlandirma.Tarife24SaatSonrasiGunluk} onChange={(e) => fiyatAlaniniGuncelle('Tarife24SaatSonrasiGunluk', e.target.value)} className="w-24 text-right px-2 py-1 rounded-lg border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none font-bold" />
                        ) : (
                          <span className="font-bold text-slate-800 dark:text-slate-100">+{Number(fiyatlandirma.Tarife24SaatSonrasiGunluk).toFixed(0)} ₺</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
            <div className="bg-slate-100 dark:bg-slate-700 p-4 flex justify-between items-center border-t border-slate-200 dark:border-slate-600">
              {duzenlemeModu ? (
                <>
                  <button onClick={() => { setTaslakFiyatlandirma(fiyatlandirma); setDuzenlemeModu(false); }} className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold py-2 px-5 rounded-lg transition-colors">İptal</button>
                  <button onClick={fiyatlandirmayiKaydet} disabled={fiyatKaydediliyor} className="bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-bold py-2 px-5 rounded-lg transition-colors">{fiyatKaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}</button>
                </>
              ) : (
                <>
                  <button onClick={() => setFiyatlandirmaModalAcik(false)} className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">Kapat</button>
                  <button onClick={() => setDuzenlemeModu(true)} className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-5 rounded-lg transition-colors flex items-center gap-2"><PencilSquareIcon className="w-5 h-5" /> Düzenle</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {islemGecmisiModalAcik && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-[toastGiris_0.3s_ease-out]">
            <div className="bg-teal-700 p-5 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ClipboardDocumentListIcon className="w-6 h-6" /> Son İşlemler (Geçmiş)
              </h2>
              <button onClick={() => setIslemGecmisiModalAcik(false)} className="text-white hover:text-teal-200 font-bold text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                    <th className="py-3 text-slate-600 dark:text-slate-300 font-bold">Plaka</th>
                    <th className="py-3 text-slate-600 dark:text-slate-300 font-bold">Park Yeri</th>
                    <th className="py-3 text-slate-600 dark:text-slate-300 font-bold">Giriş / Çıkış</th>
                    <th className="py-3 text-slate-600 dark:text-slate-300 font-bold text-right">Süre</th>
                    <th className="py-3 text-slate-600 dark:text-slate-300 font-bold text-right">Ücret</th>
                  </tr>
                </thead>
                <tbody>
                  {islemGecmisi.length === 0 ? (
                    <tr><td colSpan="5" className="text-center py-8 text-slate-500 dark:text-slate-400 font-medium">Henüz tamamlanmış bir çıkış işlemi bulunmuyor.</td></tr>
                  ) : (
                    islemGecmisi.map((islem) => (
                      <tr key={islem.KayitID} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="py-3 font-bold text-slate-800 dark:text-slate-100">
                          <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-xs border border-slate-200 dark:border-slate-600">
                            <TruckIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /> {islem.Plaka}
                          </div>
                        </td>
                        <td className="py-3 text-slate-600 dark:text-slate-300 font-medium">{islem.ParkYeriAdi}</td>
                        <td className="py-3 text-slate-500 dark:text-slate-400 text-sm">
                          <div><span className="text-emerald-600 dark:text-emerald-400 font-semibold">G:</span> {islem.GirisSaati}</div>
                          <div><span className="text-red-600 dark:text-red-400 font-semibold">Ç:</span> {islem.CikisSaati}</div>
                        </td>
                        <td className="py-3 text-slate-600 dark:text-slate-300 text-right font-medium">{islem.SureDakika} Dk</td>
                        <td className="py-3 text-emerald-600 dark:text-emerald-400 font-black text-right">{Number(islem.ToplamUcret).toFixed(0)} ₺</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="bg-slate-100 dark:bg-slate-700 p-4 flex justify-end border-t border-slate-200 dark:border-slate-600">
              <button onClick={() => setIslemGecmisiModalAcik(false)} className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes toastGiris { from { transform: translateX(110%) scale(0.95); opacity: 0; } to { transform: translateX(0) scale(1); opacity: 1; } }
        @keyframes toastCikis { from { transform: translateX(0) scale(1); opacity: 1; max-height: 220px; margin-bottom: 14px; } to { transform: translateX(110%) scale(0.95); opacity: 0; max-height: 0; margin-bottom: 0; } }
        @keyframes toastIlerleme { from { width: 100%; } to { width: 0%; } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        
        .toast-giris { animation: toastGiris 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .toast-cikis { animation: toastCikis 0.25s ease-in forwards; }
        .toast-ilerleme-cubugu { animation-name: toastIlerleme; animation-timing-function: linear; animation-fill-mode: forwards; }
        .toast-karti:hover .toast-ilerleme-cubugu { animation-play-state: paused; }
      `}</style>

      <div className="fixed top-6 right-6 z-[100] flex flex-col-reverse items-end gap-3.5 w-full max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onMouseEnter={() => toastDuraklat(toast.id)}
            onMouseLeave={() => toastDevamEttir(toast.id)}
            className={`toast-karti pointer-events-auto overflow-hidden bg-white dark:bg-slate-800 w-full rounded-xl shadow-xl border-l-[6px] ${
              toast.tip === 'hata' ? 'border-red-500' : 'border-emerald-500'
            } ${toast.kapaniyor ? 'toast-cikis' : 'toast-giris'}`}
          >
            <div className="flex items-start gap-3 p-4 pr-3">
              <div className={`shrink-0 rounded-full p-1.5 ${toast.tip === 'hata' ? 'bg-red-100 dark:bg-red-900/40 text-red-500 dark:text-red-400' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-500 dark:text-emerald-400'}`}>
                {toast.tip === 'hata' ? <XCircleIcon className="w-6 h-6" /> : <CheckCircleIcon className="w-6 h-6" />}
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex-1 leading-snug pt-1">{toast.metin}</p>
              <button onClick={() => toastKaldir(toast.id)} className="shrink-0 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-bold text-xl leading-none px-1 transition-colors">&times;</button>
            </div>
            <div className="h-1 bg-slate-100 dark:bg-slate-700 w-full">
              <div className={`h-full toast-ilerleme-cubugu ${toast.tip === 'hata' ? 'bg-red-400' : 'bg-emerald-400'}`} style={{ animationDuration: `${toast.sure}ms` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}