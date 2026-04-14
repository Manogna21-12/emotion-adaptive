import React from "react";
import { Clock, TrendingUp, BrainCircuit, Flame, Calendar } from "lucide-react";
import { useStreakTracker } from "../hooks/useStreakTracker";

export function MetricCard({ title, value, subtitle, icon, colorClass = "text-brand-500", bgClass = "bg-brand-50" }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-gray-100 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] flex flex-col justify-between h-full">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2.5 rounded-xl ${bgClass} ${colorClass}`}>
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-gray-500">{title}</h3>
      </div>
      <div>
        <div className="text-3xl font-bold text-gray-900 tracking-tight">{value}</div>
        {subtitle && <p className="text-sm font-medium text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function MinimalStreakWidget() {
  const { currentStreak, dailyTimeSpent, formattedTime, lastActiveDate } = useStreakTracker();

  // 7-day data logic
  const daysAbbr = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayDate = new Date();
  
  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(todayDate);
    d.setDate(todayDate.getDate() - (6 - i));
    const key = `streak_day_${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const isToday = i === 6;
    const storedMins = isToday
      ? Math.floor(dailyTimeSpent / 60)
      : Math.floor((parseInt(localStorage.getItem(key) || "0")) / 60);

    return {
      day: daysAbbr[d.getDay()],
      isActive: storedMins > 0 || (isToday && dailyTimeSpent > 0),
      isToday,
    };
  });

  return (
    <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-gray-100 w-full mt-2">
      <div className="flex justify-between items-center mb-6">
         <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">7-Day Activity</h3>
         {lastActiveDate && (
             <div className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
               <Calendar className="w-3.5 h-3.5" /> Last active: {lastActiveDate === new Date().toLocaleDateString('en-CA') ? 'Today' : lastActiveDate}
             </div>
         )}
      </div>

      <div className="flex justify-between items-end gap-2 md:gap-4 h-12">
        {weeklyData.map((dayData, i) => (
          <div key={i} className="flex flex-col items-center gap-3 flex-1 group">
            {/* Minimal Bar/Dot Indicator */}
            <div 
               className={`w-full h-1.5 rounded-full transition-colors duration-300 ${
                 dayData.isToday 
                   ? "bg-orange-500" 
                   : dayData.isActive 
                     ? "bg-orange-200" 
                     : "bg-gray-100"
               }`} 
            />
            
            <span className={`text-xs md:text-sm font-semibold ${dayData.isToday ? 'text-gray-900' : 'text-gray-400'}`}>
              {dayData.day}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
