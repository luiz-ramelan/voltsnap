/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Camera, 
  Plus, 
  Trash2, 
  Zap, 
  Home, 
  ChevronRight, 
  BarChart3, 
  Info, 
  CheckCircle2, 
  AlertCircle,
  X,
  ArrowRight,
  Leaf,
  Moon,
  Wind
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  Cell
} from 'recharts';
import { cn, formatCurrency, calculateMonthlyKwh } from './lib/utils';
import { 
  PropertyType, 
  Appliance, 
  RetailerPlan, 
  RETAILER_PLANS, 
  DEFAULT_WATTAGE 
} from './types';
import { detectAppliances } from './services/visionService';

export default function App() {
  const [step, setStep] = useState(1);
  const [propertyType, setPropertyType] = useState<PropertyType>('HDB');
  const [numRooms, setNumRooms] = useState(3);
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeScenarios, setActiveScenarios] = useState<string[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Default appliances based on room count
  useEffect(() => {
    if (appliances.length === 0) {
      const initial: Appliance[] = [
        { id: '1', name: '2-door fridge', wattage: 120, count: 1, dailyUsageHours: 24, category: 'kitchen' },
        { id: '2', name: 'aircon 1.5HP', wattage: 1350, count: numRooms - 1, dailyUsageHours: 6, category: 'cooling' },
        { id: '3', name: 'water heater', wattage: 1800, count: 1, dailyUsageHours: 1, category: 'other' },
        { id: '4', name: 'LED bulb', wattage: 12, count: numRooms * 2, dailyUsageHours: 4, category: 'lighting' },
      ];
      setAppliances(initial);
    }
  }, [numRooms]);

  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const photo = canvasRef.current.toDataURL('image/jpeg');
        setCapturedPhotos(prev => [...prev, photo]);
      }
    }
  };

  const analyzePhotos = async () => {
    setIsAnalyzing(true);
    const allDetected: any[] = [];
    
    for (const photo of capturedPhotos) {
      const detected = await detectAppliances(photo);
      allDetected.push(...detected);
    }

    // Merge logic
    const merged = [...appliances];
    allDetected.forEach(item => {
      const existing = merged.find(a => a.name.toLowerCase() === item.name.toLowerCase());
      if (existing) {
        existing.count += item.count || 1;
      } else {
        merged.push({
          id: Math.random().toString(36).substr(2, 9),
          name: item.name,
          wattage: item.estimated_wattage || DEFAULT_WATTAGE[item.name] || 100,
          count: item.count || 1,
          dailyUsageHours: 4, // Default
          category: 'other'
        });
      }
    });

    setAppliances(merged);
    setIsAnalyzing(false);
    setCapturedPhotos([]);
    stopCamera();
  };

  const addAppliance = () => {
    const newApp: Appliance = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'New Device',
      wattage: 100,
      count: 1,
      dailyUsageHours: 2,
      category: 'other'
    };
    setAppliances([...appliances, newApp]);
  };

  const removeAppliance = (id: string) => {
    setAppliances(appliances.filter(a => a.id !== id));
  };

  const updateAppliance = (id: string, updates: Partial<Appliance>) => {
    setAppliances(appliances.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const processedAppliances = useMemo(() => {
    let list = [...appliances];
    if (activeScenarios.includes('ac-reduction')) {
      list = list.map(a => a.category === 'cooling' || a.name.includes('aircon') 
        ? { ...a, dailyUsageHours: a.dailyUsageHours * 0.8 } 
        : a
      );
    }
    if (activeScenarios.includes('led-upgrade')) {
      list = list.map(a => a.category === 'lighting' || a.name.includes('bulb')
        ? { ...a, wattage: Math.min(a.wattage, 10) }
        : a
      );
    }
    if (activeScenarios.includes('night-off')) {
      list = list.map(a => a.category === 'entertainment' || a.name.includes('monitor') || a.name.includes('PC')
        ? { ...a, dailyUsageHours: Math.max(0, a.dailyUsageHours - 8) }
        : a
      );
    }
    return list;
  }, [appliances, activeScenarios]);

  const baseKwh = calculateMonthlyKwh(processedAppliances);
  const kwhCool = baseKwh * 0.9;
  const kwhHot = baseKwh * 1.15;

  const chartData = useMemo(() => {
    return RETAILER_PLANS.map(plan => {
      const monthlyCool = (kwhCool * plan.rateCentsPerKwh / 100) + (plan.dailyCharge * 30);
      const monthlyHot = (kwhHot * plan.rateCentsPerKwh / 100) + (plan.dailyCharge * 30);
      const year1 = (monthlyCool * 6) + (monthlyHot * 6);
      const year2 = year1 * 1.02; // Small inflation assumption
      return {
        name: plan.providerName,
        year1: Math.round(year1),
        year2: Math.round(year2),
        total: Math.round(year1 + year2),
        plan: plan.planName,
        rate: plan.rateCentsPerKwh
      };
    }).sort((a, b) => a.total - b.total);
  }, [kwhCool, kwhHot]);

  const toggleScenario = (id: string) => {
    setActiveScenarios(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const renderStep1 = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-12 py-12"
    >
      <div className="space-y-4">
        <h1 className="text-6xl font-medium leading-none tracking-tighter">
          Energy <br /> Intelligence.
        </h1>
        <p className="text-xl text-on-surface/60 max-w-md">
          Get precise bill estimates by snapping a photo of your appliances. Compare providers with data-driven clarity.
        </p>
      </div>

      <div className="space-y-8">
        <div className="space-y-4">
          <label className="text-xs uppercase tracking-widest font-semibold text-on-surface/40">Property Profile</label>
          <div className="grid grid-cols-3 gap-4">
            {(['HDB', 'Condo', 'Landed'] as PropertyType[]).map(type => (
              <button
                key={type}
                onClick={() => setPropertyType(type)}
                className={cn(
                  "py-6 rounded-lg transition-all duration-300 text-sm font-medium",
                  propertyType === type 
                    ? "bg-primary text-on-primary ambient-shadow" 
                    : "bg-surface-container-high hover:bg-surface-container-highest"
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-xs uppercase tracking-widest font-semibold text-on-surface/40">Room Count</label>
          <div className="flex items-center gap-6 bg-surface-container-low p-2 rounded-full w-fit">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => setNumRooms(n)}
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                  numRooms === n ? "bg-surface-container-lowest ambient-shadow" : "hover:bg-surface-container"
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button 
        onClick={() => setStep(2)}
        className="group flex items-center gap-3 bg-primary text-on-primary px-8 py-4 rounded-full font-medium ambient-shadow hover:scale-105 transition-transform"
      >
        Continue to Inventory
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </button>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto py-12 space-y-12"
    >
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <h2 className="text-4xl font-medium">Snap, Compare, Save!</h2>
          <p className="text-on-surface/60">Use our AI to inventory your home. Snap photos of your rooms or add devices manually.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={startCamera}
            className="flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-full font-medium ambient-shadow"
          >
            <Camera className="w-4 h-4" />
            Snap Appliances
          </button>
          <button 
            onClick={addAppliance}
            className="flex items-center gap-2 bg-surface-container-high px-6 py-3 rounded-full font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Manually
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {appliances.map((app) => (
            <motion.div 
              key={app.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-surface-container-lowest p-6 rounded-xl ambient-shadow space-y-4"
            >
              <div className="flex justify-between items-start">
                <input 
                  value={app.name}
                  onChange={(e) => updateAppliance(app.id, { name: e.target.value })}
                  className="bg-transparent font-medium text-lg focus:outline-none w-full border-b border-transparent focus:border-primary/20"
                />
                <button onClick={() => removeAppliance(app.id)} className="text-on-surface/20 hover:text-error transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-on-surface/40">Wattage</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number"
                      value={app.wattage}
                      onChange={(e) => updateAppliance(app.id, { wattage: Number(e.target.value) })}
                      className="bg-surface-container p-2 rounded w-full focus:outline-none"
                    />
                    <span className="text-on-surface/40">W</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-on-surface/40">Quantity</label>
                  <input 
                    type="number"
                    value={app.count}
                    onChange={(e) => updateAppliance(app.id, { count: Number(e.target.value) })}
                    className="bg-surface-container p-2 rounded w-full focus:outline-none"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-on-surface/40">Daily Usage (Hours)</label>
                  <input 
                    type="range"
                    min="0"
                    max="24"
                    step="0.5"
                    value={app.dailyUsageHours}
                    onChange={(e) => updateAppliance(app.id, { dailyUsageHours: Number(e.target.value) })}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-[10px] text-on-surface/40">
                    <span>0h</span>
                    <span className="text-primary font-medium">{app.dailyUsageHours}h</span>
                    <span>24h</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex justify-between items-center pt-12 border-t border-outline-variant">
        <button onClick={() => setStep(1)} className="text-on-surface/60 font-medium hover:text-on-surface transition-colors">
          Back to Profile
        </button>
        <button 
          onClick={() => setStep(3)}
          className="bg-primary text-on-primary px-10 py-4 rounded-full font-medium ambient-shadow"
        >
          Generate Projection
        </button>
      </div>
    </motion.div>
  );

  const renderStep3 = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto py-12 space-y-12"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column: Summary & Scenarios */}
        <div className="space-y-8">
          <div className="bg-surface-container-low p-8 rounded-2xl space-y-6">
            <h3 className="text-xs uppercase tracking-widest font-semibold text-on-surface/40">Monthly Consumption</h3>
            <div className="space-y-8">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-on-surface/60">
                    <Wind className="w-4 h-4" />
                    <span className="text-sm">Cool Month (Dec-Feb)</span>
                  </div>
                  <div className="text-4xl font-medium">{Math.round(kwhCool)} <span className="text-lg text-on-surface/40 font-normal">kWh</span></div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-on-surface/40 mb-1">SP Regulated</div>
                  <div className="font-medium">{formatCurrency(kwhCool * 0.3127)}</div>
                </div>
              </div>
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-on-surface/60">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-sm">Hot Month (Apr-Aug)</span>
                  </div>
                  <div className="text-4xl font-medium">{Math.round(kwhHot)} <span className="text-lg text-on-surface/40 font-normal">kWh</span></div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-on-surface/40 mb-1">SP Regulated</div>
                  <div className="font-medium">{formatCurrency(kwhHot * 0.3127)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs uppercase tracking-widest font-semibold text-on-surface/40">Savings Scenarios</h3>
            <div className="space-y-3">
              {[
                { id: 'ac-reduction', name: 'Reduce AC by 20%', icon: Wind, color: 'text-primary' },
                { id: 'led-upgrade', name: 'LED Efficiency Upgrade', icon: Leaf, color: 'text-tertiary' },
                { id: 'night-off', name: 'Night-time Shutdown', icon: Moon, color: 'text-secondary' },
              ].map(scenario => (
                <button
                  key={scenario.id}
                  onClick={() => toggleScenario(scenario.id)}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-xl transition-all border",
                    activeScenarios.includes(scenario.id)
                      ? "bg-surface-container-lowest border-primary/20 ambient-shadow"
                      : "bg-surface-container-low border-transparent hover:bg-surface-container"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <scenario.icon className={cn("w-5 h-5", scenario.color)} />
                    <span className="font-medium text-sm">{scenario.name}</span>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                    activeScenarios.includes(scenario.id) ? "bg-primary border-primary" : "border-on-surface/10"
                  )}>
                    {activeScenarios.includes(scenario.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Middle/Right Column: Comparison & Chart */}
        <div className="lg:col-span-2 space-y-12">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xs uppercase tracking-widest font-semibold text-on-surface/40">2-Year Cashflow Projection</h3>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-primary rounded-sm" />
                  <span>Year 1</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-primary/40 rounded-sm" />
                  <span>Year 2</span>
                </div>
              </div>
            </div>
            
            <div className="h-[400px] w-full bg-surface-container-low rounded-2xl p-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 40 }}>
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false}
                    width={100}
                    tick={{ fontSize: 12, fontWeight: 500 }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-surface-container-lowest p-4 rounded-lg ambient-shadow border border-outline-variant">
                            <div className="font-bold text-primary mb-1">{data.name}</div>
                            <div className="text-xs text-on-surface/60 mb-2">{data.plan}</div>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between gap-8">
                                <span>Year 1:</span>
                                <span className="font-medium">{formatCurrency(data.year1)}</span>
                              </div>
                              <div className="flex justify-between gap-8">
                                <span>Year 2:</span>
                                <span className="font-medium">{formatCurrency(data.year2)}</span>
                              </div>
                              <div className="pt-2 border-t border-outline-variant flex justify-between gap-8 font-bold">
                                <span>Total:</span>
                                <span>{formatCurrency(data.total)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="year1" stackId="a" fill="#006293" radius={[0, 0, 0, 0]} barSize={24} />
                  <Bar dataKey="year2" stackId="a" fill="#00629366" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xs uppercase tracking-widest font-semibold text-on-surface/40">Plan Comparison</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {chartData.map((data, idx) => (
                <div 
                  key={data.name}
                  className={cn(
                    "p-6 rounded-2xl border transition-all",
                    idx === 0 ? "bg-surface-container-lowest border-primary ambient-shadow" : "bg-surface-container-low border-transparent"
                  )}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="font-bold text-lg">{data.name}</div>
                      <div className="text-xs text-on-surface/60">{data.plan}</div>
                    </div>
                    {idx === 0 && (
                      <div className="bg-primary text-on-primary text-[10px] px-2 py-1 rounded uppercase font-bold tracking-tighter">Best Value</div>
                    )}
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <div className="text-2xl font-medium">{data.rate} <span className="text-xs font-normal text-on-surface/40">¢/kWh</span></div>
                      <div className="text-[10px] text-on-surface/40 uppercase tracking-widest">Fixed Rate</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-primary">{formatCurrency(data.total)}</div>
                      <div className="text-[10px] text-on-surface/40 uppercase tracking-widest">2-Year Total</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center pt-12">
        <button 
          onClick={() => setStep(2)}
          className="text-on-surface/40 hover:text-on-surface transition-colors flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          Reset and Start Over
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen selection:bg-primary/10">
      <nav className="sticky top-0 z-50 glass px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold tracking-tight text-xl">VoltSnap.</span>
        </div>
        <div className="flex items-center gap-8 text-sm font-medium text-on-surface/60">
          <span className={cn(step === 1 && "text-primary")}>Profile</span>
          <ChevronRight className="w-4 h-4 text-on-surface/20" />
          <span className={cn(step === 2 && "text-primary")}>Inventory</span>
          <ChevronRight className="w-4 h-4 text-on-surface/20" />
          <span className={cn(step === 3 && "text-primary")}>Projection</span>
        </div>
      </nav>

      <main className="px-8">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </main>

      {/* Camera Modal */}
      <AnimatePresence>
        {isCameraOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex flex-col"
          >
            <div className="flex justify-between items-center p-6 text-white">
              <h3 className="text-xl font-medium">Snap Your Appliances</h3>
              <button onClick={stopCamera} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 relative overflow-hidden">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Scanning Overlay */}
              <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
                <div className="w-full h-full border-2 border-primary/50 rounded-2xl relative">
                  <motion.div 
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-0.5 bg-primary shadow-[0_0_15px_rgba(0,98,147,0.8)]"
                  />
                </div>
              </div>
            </div>

            <div className="p-8 space-y-6 bg-black">
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                {capturedPhotos.map((photo, i) => (
                  <div key={i} className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border border-white/20">
                    <img src={photo} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>

              <div className="flex justify-center items-center gap-12">
                <button 
                  onClick={capturePhoto}
                  className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1"
                >
                  <div className="w-full h-full bg-white rounded-full active:scale-90 transition-transform" />
                </button>
                
                {capturedPhotos.length > 0 && (
                  <button 
                    onClick={analyzePhotos}
                    disabled={isAnalyzing}
                    className="bg-primary text-on-primary px-8 py-4 rounded-full font-bold ambient-shadow disabled:opacity-50"
                  >
                    {isAnalyzing ? "Analyzing..." : `Identify ${capturedPhotos.length} Photos`}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
