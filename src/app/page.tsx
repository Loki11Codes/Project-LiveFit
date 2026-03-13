'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import Chat from '@/components/Chat';

export default function Home() {
  const [activeTab, setActiveTab] = useState('chat');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const [protein, setProtein] = useState(0);
  const [calories, setCalories] = useState(0);
  const [dayType, setDayType] = useState<'Rest' | 'Training' | 'Lite'>('Rest');
  const [foodLog, setFoodLog] = useState<any[]>([]);
  const [history] = useState<any[]>([]);
  const [measurements] = useState<any[]>([]);

  const targets = {
    Rest: { protein: 80, calories: 2150 },
    Training: { protein: 100, calories: 2450 },
    Lite: { protein: 57, calories: 1800 },
  };

  const handleLogParsed = (category: string, data: any) => {
    if (category === 'food') {
      if (data.totals) {
        setProtein((prev) => prev + (data.totals.protein || 0));
        setCalories((prev) => prev + (data.totals.kcal || 0));
      }
      if (data.items) {
        setFoodLog((prev) => [
          ...prev,
          ...data.items.map((item: any) => ({
            ...item,
            id: crypto.randomUUID(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          })),
        ]);
      }
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
              proteinTarget={targets[dayType].protein}
              calories={calories}
              calorieTarget={targets[dayType].calories}
              weight={measurements.at(-1)?.weight || '—'}
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
                          🕐 {f.time} &nbsp;·&nbsp; 🔥{f.kcal ?? '?'}kcal &nbsp;·&nbsp; 🍞{f.carbs ?? '?'}g &nbsp;·&nbsp; 🧈{f.fats ?? '?'}g &nbsp;·&nbsp; 🌾{f.fiber ?? '?'}g
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
            {/* Workout & Sleep placeholders */}
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
                        {['Weight kg', 'Waist cm', 'Chest cm', 'Arms cm', 'Thighs cm', 'Hips cm'].map(label => (
                            <div key={label} className="flex flex-col gap-1.5">
                                <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--text-muted)] font-medium">{label}</div>
                                <input className="measure-input" type="number" step="0.1" />
                            </div>
                        ))}
                    </div>
                    <button className="save-btn mt-4">💾 Save</button>
                </div>
                <div className="card">
                    <div className="card-label">📌 Latest</div>
                    <div className="empty text-center py-9 px-5 text-[var(--text-muted)] text-[12px]">📏 No measurements saved yet.</div>
                </div>
            </div>
        </div>
      </div>
    </main>
  );
}
