/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  CheckCircle2, 
  Circle, 
  Calendar as CalendarIcon, 
  BarChart2, 
  Settings, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  Trophy,
  Flame,
  Zap,
  LayoutGrid,
  TrendingUp
} from 'lucide-react';
import { format, addDays, subDays, startOfToday, isSameDay, parseISO, startOfISOWeek, endOfISOWeek, eachDayOfInterval, subWeeks } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from './lib/utils';

// --- Types ---
interface Habit {
  id: string;
  title: string;
  description?: string;
  color: string;
  icon: string;
  createdAt: string;
  goalPerWeek: number; // 每週目標次數
  completedDates: string[]; // Array of YYYY-MM-DD
}

type Tab = 'today' | 'habits' | 'stats';
type TimeRange = '14D' | '1M' | '3M' | '6M' | '1Y' | '2Y';

const COLORS = [
  'bg-[#5A5A40]', // Natural Accent (Theme Default)
  'bg-[#4A7C59]', // Sage
  'bg-[#D4A373]', // Sand
  'bg-[#8E7CC3]', // Lavender
  'bg-[#A5A58D]', // Olive
  'bg-[#6B705C]', // Forest
  'bg-[#CB997E]', // Terracotta
  'bg-[#B7B7A4]'  // Linen
];

const INITIAL_HABITS: Habit[] = [
  {
    id: '1',
    title: '早起飲水',
    description: '每天早上起床後喝 300ml 溫水',
    color: 'bg-[#D4A373]',
    icon: 'Zap',
    createdAt: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    goalPerWeek: 7,
    completedDates: [format(subDays(new Date(), 1), 'yyyy-MM-dd'), format(subDays(new Date(), 2), 'yyyy-MM-dd')]
  },
  {
    id: '2',
    title: '冥想 10 分鐘',
    description: '平靜心靈，練習專注',
    color: 'bg-[#4A7C59]',
    icon: 'Zap',
    createdAt: format(subDays(new Date(), 5), 'yyyy-MM-dd'),
    goalPerWeek: 7,
    completedDates: [format(subDays(new Date(), 1), 'yyyy-MM-dd')]
  }
];

export default function App() {
  const [habits, setHabits] = useState<Habit[]>(() => {
    const saved = localStorage.getItem('habitflow_habits');
    return saved ? JSON.parse(saved) : INITIAL_HABITS;
  });

  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedHabitIdForStats, setSelectedHabitIdForStats] = useState<string | 'all'>('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('14D');
  const [newHabit, setNewHabit] = useState({ 
    title: '', 
    description: '', 
    color: COLORS[0],
    goalPerWeek: 7 
  });

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('habitflow_habits', JSON.stringify(habits));
  }, [habits]);

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

  // --- Actions ---
  const toggleHabit = (id: string, dateStr: string) => {
    setHabits(prev => prev.map(habit => {
      if (habit.id === id) {
        const isCompleted = habit.completedDates.includes(dateStr);
        return {
          ...habit,
          completedDates: isCompleted 
            ? habit.completedDates.filter(d => d !== dateStr)
            : [...habit.completedDates, dateStr]
        };
      }
      return habit;
    }));
  };

  const addHabit = () => {
    if (!newHabit.title.trim()) return;
    const habit: Habit = {
      id: crypto.randomUUID(),
      title: newHabit.title,
      description: newHabit.description,
      color: newHabit.color,
      icon: 'Zap',
      createdAt: format(new Date(), 'yyyy-MM-dd'),
      goalPerWeek: newHabit.goalPerWeek,
      completedDates: []
    };
    setHabits(prev => [...prev, habit]);
    setNewHabit({ title: '', description: '', color: COLORS[0], goalPerWeek: 7 });
    setIsAddModalOpen(false);
  };

  const deleteHabit = (id: string) => {
    if (confirm('確定要刪除這個習慣嗎？這將無法復原。')) {
      setHabits(prev => prev.filter(h => h.id !== id));
    }
  };

  // --- Calculations ---
  const stats = useMemo(() => {
    const totalHabits = habits.length;
    const completedToday = habits.filter(h => h.completedDates.includes(selectedDateStr)).length;
    const completionRate = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;
    
    // Simple current streak calculation for all habits combined (for visual demo)
    const streaks = habits.map(h => {
      let streak = 0;
      let d = startOfToday();
      while (h.completedDates.includes(format(d, 'yyyy-MM-dd'))) {
        streak++;
        d = subDays(d, 1);
      }
      return streak;
    });
    const maxStreak = streaks.length > 0 ? Math.max(...streaks) : 0;

    return { totalHabits, completedToday, completionRate, maxStreak };
  }, [habits, selectedDateStr]);

  // --- Sub-components ---
  const DailyWeekView = () => {
    const weekStart = startOfISOWeek(selectedDate);
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="flex justify-between items-center bg-natural-muted p-2 rounded-2xl border border-natural-border mb-8">
        {days.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, startOfToday());
          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDate(day)}
              className={cn(
                "flex flex-col items-center py-3 px-1 rounded-xl transition-all duration-200 min-w-[42px]",
                isSelected 
                  ? "bg-natural-accent text-white shadow-sm scale-105" 
                  : (isToday ? "bg-white text-natural-accent border border-natural-border shadow-sm" : "text-natural-text-muted hover:bg-white/50")
              )}
            >
              <span className={cn("text-[10px] uppercase font-bold tracking-widest mb-1 opacity-70", isSelected && "opacity-100")}>
                {format(day, 'EEE', { locale: zhTW })}
              </span>
              <span className={cn("text-base font-bold", isSelected ? "text-white" : "text-natural-text")}>
                {format(day, 'd')}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  const HabitCard = ({ habit }: { habit: Habit }) => {
    const isCompleted = habit.completedDates.includes(selectedDateStr);
    
    return (
      <motion.div 
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="group relative bg-white p-5 rounded-[24px] border border-natural-border shadow-sm hover:shadow-md transition-all duration-300"
      >
        <div className="flex items-center gap-4">
          <button 
            onClick={() => toggleHabit(habit.id, selectedDateStr)}
            className={cn(
              "w-12 h-12 rounded-full transition-all duration-300 transform active:scale-90 flex items-center justify-center border-2",
              isCompleted 
                ? cn(habit.color, "border-transparent text-white shadow-sm") 
                : "bg-natural-bg text-natural-text-muted border-natural-border"
            )}
          >
            {isCompleted ? <CheckCircle2 size={24} /> : <div className="w-5 h-5 rounded-full border-2 border-natural-border" />}
          </button>
          
          <div className="flex-1">
            <h3 className={cn("font-bold text-natural-text", isCompleted && "text-natural-text-muted line-through opacity-60")}>
              {habit.title}
            </h3>
            {habit.description && (
              <p className="text-xs text-natural-text-muted mt-0.5 line-clamp-1">{habit.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2 text-natural-accent font-bold bg-natural-muted px-2 py-1 rounded-lg">
            <Flame size={12} fill="currentColor" />
            <span className="text-[10px]">
              {habits.find(h => h.id === habit.id)?.completedDates.length || 0}
            </span>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-[100dvh] bg-natural-bg font-sans text-natural-text pb-24">
      {/* Header */}
      <header className="px-6 pt-10 pb-4 max-w-2xl mx-auto w-full">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-4xl font-serif font-bold text-[#1A1A1A] tracking-tight">HabitBloom</h1>
            <p className="text-natural-text-muted mt-2">
              {activeTab === 'today' 
                ? format(selectedDate, 'PPP', { locale: zhTW }) 
                : '建立更好的自己'}
            </p>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="p-4 bg-natural-accent text-white rounded-2xl shadow-sm hover:opacity-90 active:scale-95 transition-all"
          >
            <Plus size={24} />
          </button>
        </div>

        {activeTab === 'today' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <div className="bg-natural-accent rounded-[32px] p-8 text-white relative overflow-hidden shadow-sm">
              <div className="relative z-10">
                <h3 className="text-sm font-bold opacity-80 mb-1 uppercase tracking-wider">今日進度</h3>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-5xl font-serif font-bold">{stats.completionRate}</span>
                  <span className="text-xl opacity-80">%</span>
                </div>
                <p className="text-sm opacity-90 leading-relaxed min-h-[40px]">
                  {stats.completionRate === 100 
                    ? '太棒了！你已經完成了今天的全部目標。' 
                    : stats.totalHabits > 0 
                      ? `加油！再完成 ${stats.totalHabits - stats.completedToday} 個習慣就能達成今日目標。`
                      : '今天還沒有建立習慣呢。'}
                </p>
              </div>
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white opacity-10 rounded-full" />
            </div>
            
            <div className="bg-white rounded-[32px] p-8 border border-natural-border shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <Flame size={32} className="text-[#D4A373]" fill="currentColor" />
                <div className="bg-natural-muted px-3 py-1 rounded-full text-[10px] font-bold text-natural-accent tracking-tighter uppercase">活躍中</div>
              </div>
              <div className="mt-4">
                <span className="text-5xl font-serif font-bold text-natural-text">{stats.maxStreak}</span>
                <p className="text-sm font-bold text-natural-text-muted mt-1">連續達成天數</p>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="px-6 max-w-2xl mx-auto">
        {activeTab === 'today' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <DailyWeekView />
            <div className="space-y-4">
              {habits.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                  <LayoutGrid size={48} className="mx-auto text-gray-200 mb-4" />
                  <p className="text-gray-400 font-medium">還沒有習慣？點擊右上角新增一個吧！</p>
                </div>
              ) : (
                habits.map(habit => <HabitCard key={habit.id} habit={habit} />)
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'habits' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold mb-6">管理所有習慣</h2>
            {habits.map(habit => (
              <div key={habit.id} className="bg-white p-5 rounded-[24px] border border-natural-border shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-white shadow-sm", habit.color)}>
                    <Zap size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-natural-text">{habit.title}</h3>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-natural-text-muted">建立於 {habit.createdAt}</p>
                  </div>
                </div>
                <button 
                  onClick={() => deleteHabit(habit.id)}
                  className="p-3 text-natural-text-muted hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-8 pb-12">
             {/* 趨勢分析控鈕 */}
             <div className="flex flex-col gap-4">
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                    <button 
                      onClick={() => setSelectedHabitIdForStats('all')}
                      className={cn(
                        "px-5 py-2 rounded-full whitespace-nowrap text-xs font-bold transition-all border",
                        selectedHabitIdForStats === 'all' 
                          ? "bg-natural-accent text-white border-transparent shadow-sm" 
                          : "bg-white text-natural-text-muted border-natural-border"
                      )}
                    >
                      全部總計
                    </button>
                    {habits.map(h => (
                      <button 
                        key={h.id}
                        onClick={() => setSelectedHabitIdForStats(h.id)}
                        className={cn(
                          "px-5 py-2 rounded-full whitespace-nowrap text-xs font-bold transition-all border",
                          selectedHabitIdForStats === h.id 
                            ? `${h.color} text-white border-transparent shadow-sm` 
                            : "bg-white text-natural-text-muted border-natural-border"
                        )}
                      >
                        {h.title}
                      </button>
                    ))}
                </div>

                <div className="flex gap-1 bg-natural-muted p-1 rounded-xl w-fit border border-natural-border">
                    {[
                        { label: '14天', value: '14D' as TimeRange },
                        { label: '一月', value: '1M' as TimeRange },
                        { label: '三月', value: '3M' as TimeRange },
                        { label: '半年', value: '6M' as TimeRange },
                        { label: '一年', value: '1Y' as TimeRange },
                        { label: '兩年', value: '2Y' as TimeRange },
                    ].map((range) => (
                        <button
                            key={range.value}
                            onClick={() => setSelectedTimeRange(range.value)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                                selectedTimeRange === range.value
                                    ? "bg-white text-natural-accent shadow-sm"
                                    : "text-natural-text-muted hover:text-natural-text"
                            )}
                        >
                            {range.label}
                        </button>
                    ))}
                </div>
             </div>

             {/* 趨勢折線圖 */}
             <div className="bg-white p-8 rounded-[32px] border border-natural-border shadow-sm">
                <h3 className="text-sm font-bold text-natural-accent mb-8 uppercase tracking-[0.2em] flex items-center gap-2">
                  <TrendingUp size={16} />
                  {selectedHabitIdForStats === 'all' 
                    ? '趨勢分析' 
                    : `「${habits.find(h => h.id === selectedHabitIdForStats)?.title}」紀錄`}
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={(() => {
                        let daysToCount = 14;
                        if (selectedTimeRange === '1M') daysToCount = 30;
                        if (selectedTimeRange === '3M') daysToCount = 90;
                        if (selectedTimeRange === '6M') daysToCount = 180;
                        if (selectedTimeRange === '1Y') daysToCount = 365;
                        if (selectedTimeRange === '2Y') daysToCount = 730;

                        // 若跨距太大，則以週為單位顯示 (聚合資料)
                        const useWeekly = daysToCount > 100;
                        const dataPoints = [];
                        
                        if (useWeekly) {
                            const weeksToCount = Math.ceil(daysToCount / 7);
                            for (let i = 0; i < weeksToCount; i++) {
                                const weekStart = subWeeks(startOfISOWeek(startOfToday()), weeksToCount - 1 - i);
                                const weekEnd = endOfISOWeek(weekStart);
                                const interval = eachDayOfInterval({ start: weekStart, end: weekEnd });
                                
                                let totalCompleted = 0;
                                interval.forEach(day => {
                                    const dateStr = format(day, 'yyyy-MM-dd');
                                    if (selectedHabitIdForStats === 'all') {
                                        totalCompleted += habits.filter(h => h.completedDates.includes(dateStr)).length;
                                    } else {
                                        const h = habits.find(habit => habit.id === selectedHabitIdForStats);
                                        if (h?.completedDates.includes(dateStr)) totalCompleted += 1;
                                    }
                                });

                                dataPoints.push({
                                    name: format(weekStart, 'MM/dd'),
                                    completed: selectedHabitIdForStats === 'all' ? totalCompleted : totalCompleted > 0 ? 1 : 0
                                });
                            }
                        } else {
                            for (let i = 0; i < daysToCount; i++) {
                                const date = subDays(startOfToday(), daysToCount - 1 - i);
                                const dateStr = format(date, 'yyyy-MM-dd');
                                
                                let value = 0;
                                if (selectedHabitIdForStats === 'all') {
                                  value = habits.filter(h => h.completedDates.includes(dateStr)).length;
                                } else {
                                  const habit = habits.find(h => h.id === selectedHabitIdForStats);
                                  value = habit?.completedDates.includes(dateStr) ? 1 : 0;
                                }
        
                                dataPoints.push({
                                  name: format(date, daysToCount > 31 ? 'MM/dd' : 'MM/dd'),
                                  completed: value,
                                });
                            }
                        }
                        return dataPoints;
                      })()}
                      margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5DF" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fill: '#8C8C84', fontWeight: 600 }}
                        dy={10}
                        minTickGap={20}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fill: '#8C8C84', fontWeight: 600 }}
                        allowDecimals={false}
                        domain={selectedHabitIdForStats === 'all' ? ['auto', 'auto'] : [0, 1]}
                        ticks={selectedHabitIdForStats === 'all' ? undefined : [0, 1]}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#FDFCF8', 
                          borderRadius: '12px', 
                          border: '1px solid #E5E5DF',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="completed" 
                        stroke={selectedHabitIdForStats === 'all' 
                          ? "#5A5A40" 
                          : (() => {
                              const c = habits.find(h => h.id === selectedHabitIdForStats)?.color;
                              if (c?.includes('bg-[')) return c.match(/\[(.*?)\]/)?.[1] || "#5A5A40";
                              return "#5A5A40";
                            })()
                        } 
                        strokeWidth={selectedTimeRange === '1Y' ? 2 : 4} 
                        dot={selectedTimeRange === '1Y' ? false : { r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 5, strokeWidth: 0 }}
                        animationDuration={1000}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
             </div>

             {/* 堅持進度卡片 */}
             <div className="bg-white p-8 rounded-[32px] border border-natural-border shadow-sm">
                <h3 className="text-sm font-bold text-natural-accent flex items-center gap-2 mb-8 uppercase tracking-[0.2em]">
                  <Trophy size={16} />
                  堅持紀錄
                </h3>
                <div className="space-y-8">
                  {habits.map(h => {
                    const count = h.completedDates.length;
                    const percentage = Math.round((count / (h.goalPerWeek * 4)) * 100); // 概算近一個月進度
                    return (
                      <div key={h.id}>
                        <div className="flex justify-between items-end mb-3">
                          <div>
                            <span className="font-bold text-natural-text block">{h.title}</span>
                            <span className="text-[10px] text-natural-text-muted">每週目標：{h.goalPerWeek} 次</span>
                          </div>
                          <span className="text-xs font-bold text-natural-accent bg-natural-muted px-2 py-1 rounded-lg">{count} 次完成</span>
                        </div>
                        <div className="h-2.5 bg-natural-muted rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(percentage, 100)}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className={cn("h-full rounded-full", h.color)} 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
             </div>

             {/* 活動熱力圖 (用戶圈選位置) */}
             <div className="bg-white rounded-[32px] p-8 border border-natural-border shadow-sm">
                <h3 className="text-sm font-bold text-natural-accent mb-8 uppercase tracking-[0.2em] flex items-center gap-2">
                  <LayoutGrid size={16} />
                  活動頻率熱力圖
                </h3>
                <div className="grid grid-cols-7 gap-2">
                  {/* 熱力圖格點：展示最近 28 天 */}
                  {Array.from({ length: 28 }).map((_, i) => {
                    const date = subDays(startOfToday(), 27 - i);
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const completedCount = habits.filter(h => h.completedDates.includes(dateStr)).length;
                    const totalCount = habits.length;
                    
                    let opacity = "bg-natural-muted";
                    if (totalCount > 0) {
                      const ratio = completedCount / totalCount;
                      if (ratio > 0.8) opacity = "bg-natural-accent";
                      else if (ratio > 0.5) opacity = "bg-natural-accent/60";
                      else if (ratio > 0) opacity = "bg-natural-accent/30";
                    }

                    return (
                      <div 
                        key={i} 
                        className={cn("aspect-square rounded-lg transition-colors group relative", opacity)}
                      >
                        {/* Hover Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-natural-text text-white text-[10px] rounded pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-xl">
                          {format(date, 'MM/dd')} • 完成 {completedCount} 項
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-6 text-[10px] text-natural-text-muted font-bold tracking-widest">
                  <span>較少</span>
                  <div className="flex gap-1.5 items-center">
                    <div className="w-2.5 h-2.5 bg-natural-muted rounded-sm" />
                    <div className="w-2.5 h-2.5 bg-natural-accent/30 rounded-sm" />
                    <div className="w-2.5 h-2.5 bg-natural-accent/60 rounded-sm" />
                    <div className="w-2.5 h-2.5 bg-natural-accent rounded-sm" />
                  </div>
                  <span>較多</span>
                </div>
             </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center p-6 pointer-events-none">
        <div className="bg-natural-muted/90 backdrop-blur-xl border border-natural-border p-2 rounded-[32px] shadow-2xl flex justify-between w-full max-w-sm pointer-events-auto">
          <button 
            onClick={() => setActiveTab('today')}
            className={cn(
              "flex flex-col items-center justify-center w-1/3 py-3 rounded-[24px] transition-all",
              activeTab === 'today' ? "bg-natural-accent text-white shadow-lg" : "text-natural-text-muted hover:bg-white/50"
            )}
          >
            <CalendarIcon size={20} />
            <span className="text-[10px] font-bold mt-1 uppercase tracking-tighter">今日</span>
          </button>
          <button 
            onClick={() => setActiveTab('habits')}
            className={cn(
              "flex flex-col items-center justify-center w-1/3 py-3 rounded-[24px] transition-all",
              activeTab === 'habits' ? "bg-natural-accent text-white shadow-lg" : "text-natural-text-muted hover:bg-white/50"
            )}
          >
            <LayoutGrid size={20} />
            <span className="text-[10px] font-bold mt-1 uppercase tracking-tighter">習慣</span>
          </button>
          <button 
            onClick={() => setActiveTab('stats')}
            className={cn(
              "flex flex-col items-center justify-center w-1/3 py-3 rounded-[24px] transition-all",
              activeTab === 'stats' ? "bg-natural-accent text-white shadow-lg" : "text-natural-text-muted hover:bg-white/50"
            )}
          >
            <BarChart2 size={20} />
            <span className="text-[10px] font-bold mt-1 uppercase tracking-tighter">洞察</span>
          </button>
        </div>
      </nav>

      {/* Add Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="fixed inset-0 bg-[#2D2D2D]/30 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 100 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 100 }}
              className="fixed bottom-6 left-6 right-6 z-[101] bg-natural-bg rounded-[40px] p-10 border border-natural-border shadow-2xl max-w-lg mx-auto overflow-hidden"
            >
              <h2 className="text-3xl font-serif font-bold mb-8 text-natural-text">新習慣</h2>
              <div className="space-y-8">
                <div>
                  <label className="text-[10px] font-bold text-natural-text-muted uppercase tracking-[0.2em] block mb-3">習慣名稱</label>
                  <input 
                    autoFocus
                    placeholder="例如：Morning Meditation"
                    value={newHabit.title}
                    onChange={e => setNewHabit(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-white border border-natural-border rounded-2xl p-5 focus:ring-2 focus:ring-natural-accent transition-all font-medium text-natural-text placeholder:text-natural-text-muted/50 shadow-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-natural-text-muted uppercase tracking-[0.2em] block mb-3">細節 (選填)</label>
                  <input 
                    placeholder="10 minutes • 08:00 AM"
                    value={newHabit.description}
                    onChange={e => setNewHabit(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-white border border-natural-border rounded-2xl p-5 focus:ring-2 focus:ring-natural-accent transition-all font-medium text-natural-text placeholder:text-natural-text-muted/50 shadow-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-natural-text-muted uppercase tracking-[0.2em] block mb-3">每週運作頻率</label>
                  <div className="flex justify-between bg-white border border-natural-border rounded-2xl p-2 shadow-sm">
                    {[1, 2, 3, 4, 5, 6, 7].map(num => (
                      <button
                        key={num}
                        onClick={() => setNewHabit(prev => ({ ...prev, goalPerWeek: num }))}
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all",
                          newHabit.goalPerWeek === num 
                            ? "bg-natural-accent text-white shadow-sm" 
                            : "text-natural-text-muted hover:bg-natural-muted"
                        )}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-natural-text-muted mt-2 text-center">目標每週完成 {newHabit.goalPerWeek} 次</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-natural-text-muted uppercase tracking-[0.2em] block mb-3">代表顏色</label>
                  <div className="flex flex-wrap gap-4">
                    {COLORS.map(color => (
                        <button 
                          key={color}
                          onClick={() => setNewHabit(prev => ({ ...prev, color }))}
                          className={cn(
                            "w-12 h-12 rounded-full transition-all border-4",
                            color,
                            newHabit.color === color ? "border-white ring-2 ring-natural-accent scale-110 shadow-md" : "border-transparent opacity-60 hover:opacity-100"
                          )}
                        />
                    ))}
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 py-4 text-natural-text-muted font-bold rounded-2xl hover:bg-natural-muted transition-all"
                  >
                    取消
                  </button>
                  <button 
                    onClick={addHabit}
                    className="flex-[2] py-4 bg-natural-accent text-white font-bold rounded-2xl shadow-sm hover:opacity-90 active:scale-95 transition-all"
                  >
                    開始建立
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
