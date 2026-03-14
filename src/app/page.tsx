'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import Chat from '@/components/Chat';
import LogTab from '@/components/Tabs/LogTab';
import HistoryTab from '@/components/Tabs/HistoryTab';
import BodyTab from '@/components/Tabs/BodyTab';
import ProfileTab from '@/components/Tabs/ProfileTab';

export default function Home() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'chat');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Sync state with URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    router.push(`/?tab=${tab}`, { scroll: false });
  };

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
      
      if (logsData.food || logsData.workouts || logsData.sleep) {
        setHistory([
          { day: 'Today', type: dayType, protein, target: goals.proteinTarget, status: protein >= goals.proteinTarget ? 'completed' : 'pending', kcal: calories, workout: '—', sleep: '7.5' }
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
        fetchLogs();
      }
    } catch (err) {
      console.error('Failed to save goals:', err);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [session]);

  const handleLogParsed = () => {
    fetchLogs();
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.dataset.theme = newTheme;
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, []);

  const tabVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 }
  };

  return (
    <main className="min-h-screen flex flex-col items-center bg-[var(--bg)] w-full overflow-x-hidden">
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <div className="flex-1 main-layout page-top-offset pb-32 md:pb-12 transition-all duration-500 w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={tabVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="h-full"
          >
            {activeTab === 'chat' && (
              <div className="flex flex-col lg:flex-row gap-6 h-full">
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
            )}

            {activeTab === 'log' && (
              <LogTab 
                foodLog={foodLog} 
                protein={protein} 
              />
            )}

            {activeTab === 'history' && (
              <HistoryTab history={history} />
            )}

            {activeTab === 'body' && (
              <BodyTab 
                measurements={measurements}
                setMeasurements={setMeasurements}
                handleSaveMeasurements={handleSaveMeasurements}
                latestMeasurement={latestMeasurement}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileTab 
                session={session}
                goals={goals}
                setGoals={setGoals}
                handleSaveGoals={handleSaveGoals}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}
