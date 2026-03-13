'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import Chat from '@/components/Chat';
import { useSession, signOut, signIn } from 'next-auth/react';

export default function Home() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('chat');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const [protein, setProtein] = useState(0);
  const [calories, setCalories] = useState(0);
  const [dayType, setDayType] = useState<'Rest' | 'Training' | 'Lite'>('Rest');
  const [foodLog, setFoodLog] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [measurements, setMeasurements] = useState<any>({
    weight: '', waist: '', chest: '', arms: '', thighs: '', hips: ''
  });
  const [latestMeasurement, setLatestMeasurement] = useState<any>(null);
  
  const [goals, setGoals] = useState({ proteinTarget: 100, kcalTarget: 2200 });

  const fetchLogs = async () => {
    if (!session) return;
    try {
      const [logsRes, measurementsRes, goalsRes] = await Promise.all([
        fetch('/api/logs'),
        fetch('/api/measurements'),
        fetch('/api/goals')
      ]);
      
      const logsData = await logsRes.json();
      const latestData = await measurementsRes.json();
      const goalsData = await goalsRes.json();
      
      if (logsData.food) {
        setFoodLog(logsData.food);
        const today = new Date().toDateString();
        const todaysFood = logsData.food.filter((f: any) => new Date(f.time).toDateString() === today);
        setProtein(todaysFood.reduce((sum: number, f: any) => sum + (f.protein || 0), 0));
        setCalories(todaysFood.reduce((sum: number, f: any) => sum + (f.kcal || 0), 0));
      }

      if (latestData && !latestData.error) {
        setLatestMeasurement(latestData);
        setMeasurements({
          weight: latestData.weight || '',
          waist: latestData.waist || '',
          chest: latestData.chest || '',
          arms: latestData.arms || '',
          thighs: latestData.thighs || '',
          hips: latestData.hips || '',
        });
      }

      if (goalsData?.proteinTarget) {
        setGoals(goalsData);
      }
      
      // Simple history mapping
      if (logsData.food || logsData.workouts || logsData.sleep) {
        setHistory([
          { day: 'Today', type: dayType, protein, target: goals.proteinTarget, status: protein >= goals.proteinTarget ? '✅' : '⏳', kcal: calories, workout: '—', sleep: '7.5' }
        ]);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  };

  const handleSaveMeasurements = async () => {
    try {
      const res = await fetch('/api/measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(measurements),
      });
      if (res.ok) {
        const data = await res.json();
        setLatestMeasurement(data);
        alert('Measurements saved! 📏');
      }
    } catch (err) {
      console.error('Failed to save measurements:', err);
    }
  };

  const handleSaveGoals = async () => {
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goals),
      });
      if (res.ok) {
        alert('Daily goals updated! 🎯');
        fetchLogs();
      }
    } catch (err) {
      console.error('Failed to save goals:', err);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [session]);

  const handleLogParsed = (category: string, data: any) => {
    if (category === 'food' || category === 'measurement') {
      fetchLogs();
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.dataset.theme = newTheme;
  };

  return (
    <main className="min-h-screen flex flex-col">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <div className="flex-1 max-w-[1180px] mx-auto w-full p-7 px-6">
        {/* CHAT PANEL */}
        <div className={`flex-col gap-5 ${activeTab === 'chat' ? 'flex' : 'hidden'}`}>
          <div className="flex gap-5 flex-1 min-h-0">
            <Chat onLogParsed={handleLogParsed} />
            <Sidebar
              protein={protein}
              proteinTarget={goals.proteinTarget}
              calories={calories}
              calorieTarget={goals.kcalTarget}
              weight={latestMeasurement?.weight || '—'}
              sleep={7.5}
              day={1}
              dayType={dayType}
              setDayType={setDayType}
            />
          </div>
        </div>

        {/* LOG PANEL */}
        <div className={`flex-col gap-5 ${activeTab === 'log' ? 'flex' : 'hidden'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card md:col-span-2">
              <div className="flex justify-between items-center mb-4.5">
                <div className="card-label mb-0">🍽️ Food Log</div>
                <span className="badge warn">{protein}g protein</span>
              </div>
              <div id="food-list">
                {foodLog.length > 0 ? (
                  foodLog.map((f) => (
                    <div key={f.id} className="log-row">
                      <div className="flex-1">
                        <div className="log-row-name">🍽️ {f.name}</div>
                        <div className="log-row-meta">
                          🕐 {new Date(f.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &nbsp;·&nbsp; 🔥{f.kcal ?? '?'}kcal &nbsp;·&nbsp; 🍞{f.carbs ?? '?'}g &nbsp;·&nbsp; 🧈{f.fats ?? '?'}g &nbsp;·&nbsp; 🌾{f.fiber ?? '?'}g
                        </div>
                      </div>
                      <div className="log-row-val whitespace-nowrap">🫘 {f.protein}g</div>
                    </div>
                  ))
                ) : (
                  <div className="empty text-center py-9 px-5 text-[var(--text-muted)] text-[12px] tracking-[0.04em]">
                    🍽️ No food logged yet — use the Chat tab.
                  </div>
                )}
              </div>
            </div>
            <div className="card">
                <div className="card-label">💪 Workout</div>
                <div className="empty text-center py-9 px-5 text-[var(--text-muted)] text-[12px]">🏋️ Nothing logged yet.</div>
            </div>
            <div className="card">
                <div className="card-label">😴 Sleep</div>
                <div className="log-row">
                    <div><div className="log-row-name">⏱️ Duration</div><div className="log-row-meta">Last night</div></div>
                    <div className="log-row-val">7.5 hrs</div>
                </div>
            </div>
          </div>
        </div>

        {/* HISTORY PANEL */}
        <div className={`flex-col gap-5 ${activeTab === 'history' ? 'flex' : 'hidden'}`}>
            <div className="card">
                <div className="card-label">📊 {history.length}-Day Log</div>
                <div className="overflow-x-auto">
                    <table className="history-table">
                        <thead>
                            <tr>
                                <th>📅 Day</th><th>🏷️ Type</th><th>😴 Sleep</th><th>🫘 Protein</th><th>🎯 Target</th><th>✅ Status</th><th>🔥 Kcal</th><th>💪 Workout</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.length > 0 ? history.map(h => (
                                <tr key={h.day}>
                                    <td>{h.day}</td><td>{h.type}</td><td>{h.sleep}h</td><td>{h.protein}g</td><td>{h.target}g</td><td>{h.status}</td><td>{h.kcal} kcal</td><td>{h.workout}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={8} className="empty text-center py-4">No history yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {/* BODY PANEL */}
        <div className={`flex-col gap-5 ${activeTab === 'body' ? 'flex' : 'hidden'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card">
                    <div className="card-label">📏 Log Measurements</div>
                    <div className="grid grid-cols-3 gap-3.5">
                        {[
                          { key: 'weight', label: 'Weight kg' },
                          { key: 'waist', label: 'Waist cm' },
                          { key: 'chest', label: 'Chest cm' },
                          { key: 'arms', label: 'Arms cm' },
                          { key: 'thighs', label: 'Thighs cm' },
                          { key: 'hips', label: 'Hips cm' }
                        ].map(({ key, label }) => (
                            <div key={label} className="flex flex-col gap-1.5">
                                <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--text-muted)] font-medium">{label}</div>
                                <input 
                                  className="measure-input" 
                                  type="number" 
                                  step="0.1" 
                                  value={measurements[key]} 
                                  onChange={(e) => setMeasurements({ ...measurements, [key]: e.target.value })}
                                />
                            </div>
                        ))}
                    </div>
                    <button className="save-btn mt-4" onClick={handleSaveMeasurements}>💾 Save Measurements</button>
                </div>
                <div className="card">
                    <div className="card-label">📌 Latest Entries</div>
                    {latestMeasurement ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-[var(--text-muted)]">⚖️ WEIGHT</span>
                          <span className="text-[18px] font-semibold">{latestMeasurement.weight || '—'} kg</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-[var(--text-muted)]">📏 WAIST</span>
                          <span className="text-[18px] font-semibold">{latestMeasurement.waist || '—'} cm</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-[var(--text-muted)]">👤 CHEST</span>
                          <span className="text-[18px] font-semibold">{latestMeasurement.chest || '—'} cm</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-[var(--text-muted)]">💪 ARMS</span>
                          <span className="text-[18px] font-semibold">{latestMeasurement.arms || '—'} cm</span>
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] mt-2 italic px-1">
                          Last updated: {new Date(latestMeasurement.time).toLocaleDateString()}
                        </div>
                      </div>
                    ) : (
                      <div className="empty text-center py-9 px-5 text-[var(--text-muted)] text-[12px]">📏 No measurements saved yet.</div>
                    )}
                </div>
            </div>
        </div>

        {/* PROFILE PANEL */}
        <div className={`flex-col gap-5 ${activeTab === 'profile' ? 'flex' : 'hidden'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card">
                    <div className="card-label">👤 User Profile</div>
                    {session?.user ? (
                      <div className="flex items-center gap-4 py-4 px-2">
                        {session.user.image && (
                          <img src={session.user.image} alt="Profile" className="w-16 h-16 rounded-full border border-[var(--border)]" />
                        )}
                        <div>
                          <div className="text-[14px] font-semibold">{session.user.name}</div>
                          <div className="text-[12px] text-[var(--text-muted)]">{session.user.email}</div>
                          <button onClick={() => signOut()} className="mt-3 text-[10px] uppercase font-bold text-red-500 bg-transparent border border-red-500/30 px-3 py-1 rounded-sm hover:bg-red-500/10 cursor-pointer">
                            Logout
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="empty text-center py-9 px-5">
                        <div className="text-[var(--text-muted)] text-[12px] mb-4">Please sign in to track your profile and goals.</div>
                        <button onClick={() => signIn()} className="save-btn w-full">Sign In</button>
                      </div>
                    )}
                </div>
                <div className="card">
                    <div className="card-label">🎯 Daily Goals</div>
                    <div className="flex flex-col gap-5 mt-2">
                        <div className="flex flex-col gap-1.5">
                            <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--text-muted)] font-medium">Protein Target (g)</div>
                            <input 
                              className="measure-input" 
                              type="number" 
                              value={goals.proteinTarget} 
                              onChange={(e) => setGoals({ ...goals, proteinTarget: Number.parseFloat(e.target.value) })}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--text-muted)] font-medium">Calorie Target (kcal)</div>
                            <input 
                              className="measure-input" 
                              type="number" 
                              value={goals.kcalTarget} 
                              onChange={(e) => setGoals({ ...goals, kcalTarget: Number.parseFloat(e.target.value) })}
                            />
                        </div>
                        <button className="save-btn mt-2" onClick={handleSaveGoals}>💾 Update Goals</button>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </main>
  );
}
