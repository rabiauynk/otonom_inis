/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Activity,
  AlertTriangle,
  Bell,
  Car,
  History,
  Layers,
  Navigation,
  Play,
  Settings,
  ShieldAlert,
  Trash2,
  User,
  Wind
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, DETECTION_CLASSES, GROUND_TYPES } from './constants';
import { cn } from './lib/utils';
import { Alert, Detection, SystemStats } from './types';

export default function App() {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<SystemStats>({
    humanCount: 0,
    vehicleCount: 0,
    groundType: GROUND_TYPES.ASPHALT,
    battery: 85,
    altitude: 118,
    speed: 42,
  });
  const [history, setHistory] = useState<Detection[]>([]);
  const [sensitivity, setSensitivity] = useState(75);
  const [isLive, setIsLive] = useState(true);
  const [activeTab, setActiveTab] = useState<'live' | 'history' | 'settings'>('live');
  const [isBackendConnected, setIsBackendConnected] = useState(true);
  const [isDetecting, setIsDetecting] = useState(false);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const imageWrapperRef = useRef<HTMLDivElement | null>(null);

  const [imageSize, setImageSize] = useState({
    naturalWidth: 1,
    naturalHeight: 1,
    clientWidth: 1,
    clientHeight: 1,
  });

  const IMAGE_SRC = 'DENEME.jpeg';

  const updateImageMetrics = useCallback(() => {
    const img = imageRef.current;
    const wrapper = imageWrapperRef.current;

    if (!img || !wrapper) return;

    setImageSize({
      naturalWidth: img.naturalWidth || 1,
      naturalHeight: img.naturalHeight || 1,
      clientWidth: wrapper.clientWidth || 1,
      clientHeight: wrapper.clientHeight || 1,
    });
  }, []);

  useEffect(() => {
    updateImageMetrics();

    const handleResize = () => {
      updateImageMetrics();
    };

    window.addEventListener('resize', handleResize);

    let wrapperObserver: ResizeObserver | null = null;
    if (imageWrapperRef.current && 'ResizeObserver' in window) {
      wrapperObserver = new ResizeObserver(() => {
        updateImageMetrics();
      });
      wrapperObserver.observe(imageWrapperRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (wrapperObserver) wrapperObserver.disconnect();
    };
  }, [updateImageMetrics]);

  const runDetection = async () => {
    try {
      setIsDetecting(true);

      const imageResponse = await fetch(IMAGE_SRC);
      const blob = await imageResponse.blob();
      const file = new File(
        [blob],
        'DENEME.jpeg',
        { type: blob.type || 'image/jpeg' }
      );

      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/detect', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(data);
        setAlerts(prev => [
          {
            id: Date.now().toString(),
            message: `YOLO hata: ${data?.error || 'Bilinmeyen hata'}`,
            severity: 'high',
            timestamp: Date.now(),
          },
          ...prev,
        ].slice(0, 10));
        return;
      }

      const converted: Detection[] = (data.detections || []).map((d: any, i: number) => {
        const type =
          d.type?.toLowerCase() === 'person' || d.type === 'İnsan'
            ? DETECTION_CLASSES.HUMAN
            : DETECTION_CLASSES.VEHICLE;

        return {
          id: `${Date.now()}-${i}`,
          type,
          confidence: d.confidence,
          timestamp: Date.now(),
          x: d.x,
          y: d.y,
          width: d.width,
          height: d.height,
        };
      });

      setDetections(converted);
      setHistory(prev => [...converted, ...prev].slice(0, 50));

      const humanCount = converted.filter(d => d.type === DETECTION_CLASSES.HUMAN).length;
      const vehicleCount = converted.filter(d => d.type === DETECTION_CLASSES.VEHICLE).length;

      setStats(prev => ({
        ...prev,
        humanCount,
        vehicleCount,
      }));

      if (converted.length > 0) {
        setAlerts(prev => [
          {
            id: Date.now().toString(),
            message: `${converted.length} nesne tespit edildi`,
            severity: 'high',
            timestamp: Date.now(),
          },
          ...prev,
        ].slice(0, 10));
      }
    } catch (error) {
      console.error(error);
      setAlerts(prev => [
        {
          id: Date.now().toString(),
          message: 'YOLO çalıştırılırken hata oluştu',
          severity: 'high',
          timestamp: Date.now(),
        },
        ...prev,
      ].slice(0, 10));
    } finally {
      setIsDetecting(false);
    }
  };

  const clearDetections = () => {
    setDetections([]);
    setStats(prev => ({
      ...prev,
      humanCount: 0,
      vehicleCount: 0,
    }));
    setAlerts(prev => [
      {
        id: Date.now().toString(),
        message: 'Tespitler temizlendi',
        severity: 'high',
        timestamp: Date.now(),
      },
      ...prev,
    ].slice(0, 10));
  };

  const scale = Math.min(
    imageSize.clientWidth / imageSize.naturalWidth,
    imageSize.clientHeight / imageSize.naturalHeight
  );

  const renderedWidth = imageSize.naturalWidth * scale;
  const renderedHeight = imageSize.naturalHeight * scale;

  const offsetX = (imageSize.clientWidth - renderedWidth) / 2;
  const offsetY = (imageSize.clientHeight - renderedHeight) / 2;

  return (
    <div className="h-screen w-screen bg-[#0A0A0B] text-[#E4E4E7] font-mono selection:bg-[#F27D26] selection:text-white overflow-hidden flex flex-col">
      <header className="h-14 border-b border-[#1F1F23] flex items-center justify-between px-6 bg-[#0F0F12]/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#F27D26] rounded flex items-center justify-center shadow-[0_0_20px_rgba(242,125,38,0.3)]">
            <Navigation className="text-white w-6 h-6" />
          </div>

          <div>
            <h1 className="text-lg font-bold tracking-tighter uppercase">Otonom İnİŞ Sİstemİ</h1>
          </div>
        </div>

        <nav className="flex items-center gap-1 bg-[#17171C] p-1 rounded-xl border border-[#23232A]">
          <button
            onClick={() => setActiveTab('live')}
            className={cn(
              'px-5 py-2 rounded-lg text-xs transition-all flex items-center gap-2 font-bold',
              activeTab === 'live' ? 'bg-[#F27D26] text-white' : 'hover:bg-[#24242C] text-[#A1A1AA]'
            )}
          >
            <Activity size={14} /> KONTROL MERKEZİ
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              'px-5 py-2 rounded-lg text-xs transition-all flex items-center gap-2 font-bold',
              activeTab === 'history' ? 'bg-[#F27D26] text-white' : 'hover:bg-[#24242C] text-[#A1A1AA]'
            )}
          >
            <History size={14} /> VERİ KAYITLARI
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              'px-5 py-2 rounded-lg text-xs transition-all flex items-center gap-2 font-bold',
              activeTab === 'settings' ? 'bg-[#F27D26] text-white' : 'hover:bg-[#24242C] text-[#A1A1AA]'
            )}
          >
            <Settings size={14} /> AYARLAR
          </button>
        </nav>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-[#71717A]">BATARYA</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-[#1F1F23] rounded-full overflow-hidden">
                <div
                  className={cn('h-full transition-all', stats.battery > 20 ? 'bg-green-500' : 'bg-red-500')}
                  style={{ width: `${stats.battery}%` }}
                />
              </div>
              <span className="text-xs font-bold">%{Math.round(stats.battery)}</span>
            </div>
          </div>
          <button className="relative p-2 hover:bg-[#1F1F23] rounded-full transition-colors">
            <Bell size={20} className="text-[#A1A1AA]" />
            {alerts.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0A0A0B]" />
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden p-4 gap-4">
        {activeTab === 'live' && (
          <>
            <div className="w-80 flex flex-col gap-4 overflow-y-auto no-scrollbar">
              <div className="bg-[#0B0B0E] border border-[#1B1B21] rounded-2xl p-5">
                <h3 className="text-[11px] text-[#71717A] uppercase mb-5 flex items-center gap-2">
                  <Activity size={12} /> Sistem Durumu
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#121218] p-4 rounded-xl border border-[#1F1F23]">
                    <span className="text-[10px] text-[#71717A] block mb-2">İRTİFA</span>
                    <span className="text-3xl font-extrabold text-[#F27D26]">{Math.round(stats.altitude)}m</span>
                  </div>
                  <div className="bg-[#121218] p-4 rounded-xl border border-[#1F1F23]">
                    <span className="text-[10px] text-[#71717A] block mb-2">HIZ</span>
                    <span className="text-3xl font-extrabold text-[#F27D26]">{Math.round(stats.speed)}km/h</span>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-[#121218] rounded-xl border border-[#1F1F23] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers size={16} className="text-[#F27D26]" />
                    <span className="text-[10px] text-[#71717A]">ZEMİN TİPİ</span>
                  </div>
                  <span className="text-sm font-bold uppercase">{stats.groundType}</span>
                </div>
              </div>

              <div className="bg-[#0B0B0E] border border-[#1B1B21] rounded-2xl p-5">
                <h3 className="text-[11px] text-[#71717A] uppercase mb-4">Tespit Özeti</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[#121218] rounded-xl border-l-4 border-blue-500">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-blue-500" />
                      <span className="text-sm">{DETECTION_CLASSES.HUMAN}</span>
                    </div>
                    <span className="text-2xl font-extrabold">{stats.humanCount}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#121218] rounded-xl border-l-4 border-orange-500">
                    <div className="flex items-center gap-2">
                      <Car size={16} className="text-orange-500" />
                      <span className="text-sm">{DETECTION_CLASSES.VEHICLE}</span>
                    </div>
                    <span className="text-2xl font-extrabold">{stats.vehicleCount}</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#0B0B0E] border border-[#1B1B21] rounded-2xl p-5">
                <h3 className="text-[11px] text-[#71717A] uppercase mb-4 flex items-center justify-between">
                  <span>Algılama Hassasiyeti</span>
                  <span className="text-[#F27D26] font-bold">%{sensitivity}</span>
                </h3>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sensitivity}
                  onChange={(e) => setSensitivity(parseInt(e.target.value))}
                  className="w-full h-1 bg-[#1F1F23] rounded-lg appearance-none cursor-pointer accent-[#F27D26]"
                />
                <div className="flex justify-between mt-2 text-[9px] text-[#71717A]">
                  <span>DÜŞÜK</span>
                  <span>ORTA</span>
                  <span>YÜKSEK</span>
                </div>
              </div>

              <div className="bg-[#0B0B0E] border border-[#1B1B21] rounded-2xl p-5">
                <div className="space-y-3">
                  <button
                    onClick={runDetection}
                    disabled={isDetecting}
                    className="w-full h-11 rounded-xl text-sm font-bold bg-[#F27D26] text-white hover:bg-[#df7220] disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    <Play size={16} />
                    {isDetecting ? 'Model Çalışıyor...' : 'Modeli Çalıştır'}
                  </button>

                  <button
                    onClick={clearDetections}
                    className="w-full h-11 rounded-xl text-sm font-bold bg-[#13131A] text-[#C9C9D1] border border-[#1F1F23] hover:bg-[#1A1A22] flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    Tespitleri Temizle
                  </button>
                </div>

                <div className="mt-4 text-[11px] text-[#8A8A94]">
                  {isDetecting ? 'Model çalıştırılıyor...' : 'Model çalıştırılmaya hazır.'}
                </div>
              </div>
            </div>

            <div className="flex-1 bg-[#0B0B0E] border border-[#1B1B21] rounded-2xl relative overflow-hidden shadow-[inset_0_0_50px_rgba(0,0,0,0.55)]">
              <div ref={imageWrapperRef} className="absolute inset-0 bg-[#050505]">
                <motion.img
                  ref={imageRef}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.88 }}
                  transition={{ duration: 0.6 }}
                  src={IMAGE_SRC}
                  alt="Drone Feed"
                  className="w-full h-full object-contain"
                  onLoad={() => {
                    updateImageMetrics();
                  }}
                />
              </div>

              <div
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage:
                    'linear-gradient(#1F1F23 1px, transparent 1px), linear-gradient(90deg, #1F1F23 1px, transparent 1px)',
                  backgroundSize: '48px 48px'
                }}
              />

              <AnimatePresence>
                {detections.map((det) => {
                  const left = offsetX + (det.x / 100) * renderedWidth;
                  const top = offsetY + (det.y / 100) * renderedHeight;
                  const width = (det.width / 100) * renderedWidth;
                  const height = (det.height / 100) * renderedHeight;

                  return (
                    <motion.div
                      key={det.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute border-2 pointer-events-none"
                      style={{
                        left,
                        top,
                        width,
                        height,
                        borderColor: det.type === DETECTION_CLASSES.HUMAN ? COLORS.HUMAN : COLORS.VEHICLE,
                        boxShadow: `0 0 15px ${
                          det.type === DETECTION_CLASSES.HUMAN
                            ? 'rgba(59,130,246,0.3)'
                            : 'rgba(249,115,22,0.3)'
                        }`,
                        zIndex: 20
                      }}
                    >
                      <div
                        className={cn(
                          'absolute -top-6 left-0 px-2 py-0.5 text-[10px] font-bold text-white whitespace-nowrap rounded-sm',
                          det.type === DETECTION_CLASSES.HUMAN ? 'bg-blue-500' : 'bg-orange-500'
                        )}
                      >
                        {det.type.toUpperCase()} | %{(det.confidence * 100).toFixed(0)}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
                <div className="bg-black/55 backdrop-blur-sm border border-white/10 px-3 py-2 rounded-lg text-[10px] leading-5">
                  LAT: 39.9334° N
                  <br />
                  LNG: 32.8597° E
                </div>
              </div>

             
              <div className="absolute top-0 left-0 w-full h-1 bg-[#F27D26]/30 animate-scan pointer-events-none" />
            </div>

            <div className="w-80 flex flex-col gap-4">
              <div className="bg-[#0B0B0E] border border-[#1B1B21] rounded-2xl p-4 flex flex-col h-1/2">
                <h3 className="text-[11px] text-[#71717A] uppercase mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertTriangle size={12} className="text-red-500" /> Bildirimler
                  </span>
                  <span className="bg-red-500/10 text-red-500 px-1.5 rounded text-[9px]">{alerts.length}</span>
                </h3>
                <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  <AnimatePresence initial={false}>
                    {alerts.map((alert) => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="p-3 bg-[#121218] border border-[#1F1F23] rounded-xl border-l-2 border-l-red-500"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[10px] font-bold text-red-500 uppercase">KRİTİK UYARI</span>
                          <span className="text-[9px] text-[#71717A]">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-[11px] text-[#E4E4E7] leading-tight">{alert.message}</p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {alerts.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-[#3F3F46] gap-2">
                      <ShieldAlert size={40} />
                      <span className="text-[10px]">AKTİF RİSK BULUNMAMAKTADIR</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-[#0B0B0E] border border-[#1B1B21] rounded-2xl p-4 flex flex-col h-1/2">
                <h3 className="text-[11px] text-[#71717A] uppercase mb-4">Son Tespitler</h3>
                <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {history.slice(0, 10).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-[#121218] rounded-lg text-[10px] border border-[#1F1F23]">
                      <div className="flex items-center gap-2">
                        {item.type === DETECTION_CLASSES.HUMAN ? (
                          <User size={12} className="text-blue-500" />
                        ) : (
                          <Car size={12} className="text-orange-500" />
                        )}
                        <span>{item.type}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[#71717A]">%{(item.confidence * 100).toFixed(0)}</span>
                        <span className="text-[#3F3F46]">
                          {new Date(item.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                  {history.length === 0 && (
                    <div className="h-full flex items-center justify-center text-[#3F3F46] text-[11px]">
                      Henüz kayıt yok
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'history' && (
          <div className="flex-1 bg-[#0B0B0E] border border-[#1B1B21] rounded-2xl p-6 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold tracking-tight uppercase">Geçmiş Veri Analizi</h2>
            </div>

            <div className="flex-1 overflow-y-auto border border-[#1F1F23] rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#121218] sticky top-0 border-b border-[#1F1F23]">
                  <tr>
                    <th className="p-4 font-medium text-[#71717A]">ID</th>
                    <th className="p-4 font-medium text-[#71717A]">TİP</th>
                    <th className="p-4 font-medium text-[#71717A]">GÜVEN ORANI</th>
                    <th className="p-4 font-medium text-[#71717A]">ZAMAN DAMGASI</th>
                    <th className="p-4 font-medium text-[#71717A]">KOORDİNATLAR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F1F23]">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-[#121218] transition-colors">
                      <td className="p-4 text-[#71717A]">{item.id}</td>
                      <td className="p-4">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-[9px] font-bold',
                            item.type === DETECTION_CLASSES.HUMAN
                              ? 'bg-blue-500/10 text-blue-500'
                              : 'bg-orange-500/10 text-orange-500'
                          )}
                        >
                          {item.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-[#F27D26]">%{(item.confidence * 100).toFixed(2)}</td>
                      <td className="p-4 text-[#A1A1AA]">{new Date(item.timestamp).toLocaleString()}</td>
                      <td className="p-4 text-[#71717A] font-sans">
                        {item.x.toFixed(2)}, {item.y.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="flex-1 bg-[#0B0B0E] border border-[#1B1B21] rounded-2xl p-8 max-w-2xl mx-auto">
            <h2 className="text-xl font-bold tracking-tight uppercase mb-8">Sistem Yapılandırması</h2>

            <div className="space-y-8">
              <section>
                <h3 className="text-xs font-bold text-[#71717A] uppercase mb-4 border-b border-[#1F1F23] pb-2">
                  Algılama Parametreleri
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm">Minimum Güven Eşiği</p>
                      <p className="text-[10px] text-[#71717A]">Düşük değerler daha fazla tespit, ancak daha fazla hata üretir.</p>
                    </div>
                    <input type="number" defaultValue={85} className="w-16 bg-[#121218] border border-[#1F1F23] rounded p-1 text-center text-xs" />
                  </div>
                </div>
              </section>

              <button className="w-full bg-[#F27D26] text-white py-3 rounded-lg font-bold hover:shadow-[0_0_20px_rgba(242,125,38,0.3)] transition-all">
                AYARLARI KAYDET VE UYGULA
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="h-8 border-t border-[#1F1F23] bg-[#0B0B0E] flex items-center justify-between px-6 text-[9px] text-[#71717A]">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1"><Activity size={10} /> SİSTEM: AKTİF</span>
          <span className="flex items-center gap-1"><Wind size={10} /> RÜZGAR: 12 km/h</span>
          <span className="flex items-center gap-1"><Navigation size={10} /> GPS: KİLİTLENDİ (12 UYDU)</span>
        </div>
        <div className="flex items-center gap-4">
          <span>CPU: %24</span>
          <span>MEM: 1.2GB</span>
          <span className="text-[#F27D26] font-bold">V1.4.0-YOLO</span>
        </div>
      </footer>

      <style>{`
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
        .animate-scan {
          animation: scan 3s linear infinite;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1F1F23;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #2D2D33;
        }
      `}</style>
    </div>
  );
}