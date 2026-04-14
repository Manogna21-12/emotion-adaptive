import React, { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "../components/ui/Card";
import { Users, BookOpen, Brain, Download, Filter, Search, ChevronDown, CheckCircle2, AlertCircle } from "lucide-react";

const STUDENT_REPORTS = [
  { id: 1, name: "Alex Learner", course: "Neural Networks 101", focus: 92, emotion: "Focused", status: "Excelling" },
  { id: 2, name: "Sarah Connor", course: "Emotion AI Architecture", focus: 45, emotion: "Bored", status: "At Risk" },
  { id: 3, name: "John Smith", course: "Quantum Computing Basics", focus: 78, emotion: "Neutral", status: "On Track" },
  { id: 4, name: "Emma Watson", course: "Advanced React Patterns", focus: 88, emotion: "Happy", status: "Excelling" },
  { id: 5, name: "David Chen", course: "Fluid UI Animations", focus: 60, emotion: "Confused", status: "Needs Help" },
  { id: 6, name: "Maria Garcia", course: "Neural Networks 101", focus: 95, emotion: "Focused", status: "Excelling" },
];

export default function AdminDashboard() {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Filter Logic
  const filteredReports = STUDENT_REPORTS.filter(report => {
    const matchesSearch = report.name.toLowerCase().includes(search.toLowerCase()) || report.course.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "All" || report.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8 pb-12 w-full">
        
        {/* HEADER SECTION */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-glass-base p-8 rounded-3xl border border-glass-border/50 shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 right-[15%] w-64 h-64 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none" />
          <div className="relative z-10">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-cyan-500 tracking-tight flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-purple-500" /> Admin Reports
            </h1>
            <p className="text-lg text-text-muted mt-2 font-medium">Global AI insights and student performance tracking.</p>
          </div>
          <button className="relative z-10 flex items-center gap-2 bg-glass-base border border-glass-border hover:bg-glass-hover text-root-fg px-5 py-3 rounded-xl font-bold transition-all hover:border-brand-500/50">
            <Download className="w-5 h-5" /> Export CSV
          </button>
        </motion.div>

        {/* INSIGHT CARDS (12-Col Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardContent className="p-6 flex items-start justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[40px] pointer-events-none" />
                <div className="relative z-10">
                  <p className="text-xs text-text-subtle font-bold uppercase tracking-wider mb-2">Total Active Students</p>
                  <h3 className="text-4xl font-black text-root-fg tracking-tight">1,248</h3>
                  <span className="text-xs font-semibold text-green-500 mt-2 block">+14% this month</span>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500 ring-1 ring-inset ring-purple-500/30 relative z-10">
                  <Users className="w-7 h-7" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardContent className="p-6 flex items-start justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-[40px] pointer-events-none" />
                <div className="relative z-10">
                  <p className="text-xs text-text-subtle font-bold uppercase tracking-wider mb-2">Avg Cohort Focus</p>
                  <h3 className="text-4xl font-black text-root-fg tracking-tight">76%</h3>
                  <span className="text-xs font-semibold text-green-500 mt-2 block">+5% vs last week</span>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-500 ring-1 ring-inset ring-brand-500/30 relative z-10">
                  <Brain className="w-7 h-7" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardContent className="p-6 flex items-start justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-[40px] pointer-events-none" />
                <div className="relative z-10">
                  <p className="text-xs text-text-subtle font-bold uppercase tracking-wider mb-2">Students At Risk</p>
                  <h3 className="text-4xl font-black text-root-fg tracking-tight">34</h3>
                  <span className="text-xs font-semibold text-red-500 mt-2 block">Requires Intervention</span>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 ring-1 ring-inset ring-orange-500/30 relative z-10">
                  <AlertCircle className="w-7 h-7" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* DATA TABLE & FILTERING UI */}
        <motion.div 
          className="col-span-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="shadow-2xl border-glass-border/40">
            <CardContent className="p-0">
              
              {/* Table Toolbar */}
              <div className="p-6 lg:p-8 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-glass-border/40 bg-glass-base/50">
                <h3 className="text-2xl font-extrabold text-root-fg tracking-tight">Student Performance</h3>
                
                <div className="flex items-center gap-4 w-full md:w-auto">
                  {/* Search */}
                  <div className="relative group w-full md:w-64">
                    <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-text-subtle group-focus-within:text-brand-500 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Search students..." 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-glass-hover border border-glass-border/60 rounded-xl pl-12 pr-4 py-2.5 text-sm text-root-fg focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all placeholder:text-text-subtle"
                    />
                  </div>

                  {/* Filter Dropdown */}
                  <div className="relative">
                    <button 
                      onClick={() => setIsFilterOpen(!isFilterOpen)}
                      className="flex items-center gap-2 bg-glass-hover border border-glass-border/60 text-root-fg px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-glass-base"
                    >
                      <Filter className="w-4 h-4 text-brand-500" /> {filter} <ChevronDown className="w-4 h-4 text-text-subtle ml-2" />
                    </button>

                    <AnimatePresence>
                      {isFilterOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute right-0 top-full mt-2 w-48 bg-panel-bg border border-glass-border rounded-xl shadow-2xl overflow-hidden z-50 py-2"
                        >
                          {["All", "Excelling", "On Track", "Needs Help", "At Risk"].map(status => (
                            <button 
                              key={status}
                              onClick={() => { setFilter(status); setIsFilterOpen(false); }}
                              className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${filter === status ? "bg-brand-500/10 text-brand-500" : "text-text-muted hover:bg-glass-hover hover:text-root-fg"}`}
                            >
                              {status}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-glass-base/20 border-b border-glass-border/40 text-xs uppercase tracking-widest text-text-subtle">
                      <th className="px-8 py-5 font-bold">Student Name</th>
                      <th className="px-8 py-5 font-bold">Course Active</th>
                      <th className="px-8 py-5 font-bold">Avg Focus</th>
                      <th className="px-8 py-5 font-bold">Emotion State</th>
                      <th className="px-8 py-5 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {filteredReports.length > 0 ? filteredReports.map((report, idx) => (
                        <motion.tr 
                          key={report.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="border-b border-glass-border/20 last:border-none hover:bg-glass-hover/50 transition-colors group cursor-pointer"
                        >
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                                {report.name.charAt(0)}
                              </div>
                              <span className="font-bold text-root-fg group-hover:text-brand-500 transition-colors">{report.name}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-sm font-medium text-text-muted">{report.course}</td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-root-fg">{report.focus}%</span>
                              <div className="w-20 h-1.5 bg-glass-border/50 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${report.focus > 80 ? 'bg-green-500' : report.focus > 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${report.focus}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                              report.emotion === 'Focused' ? 'bg-brand-500/10 text-brand-500 border-brand-500/20' :
                              report.emotion === 'Confused' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                              report.emotion === 'Bored' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                              'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'
                            }`}>
                              {report.emotion}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            <span className="flex items-center gap-2 text-sm font-bold">
                              {report.status === 'Excelling' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                              {report.status === 'Needs Help' && <AlertCircle className="w-4 h-4 text-orange-500" />}
                              {report.status === 'At Risk' && <AlertCircle className="w-4 h-4 text-red-500" />}
                              <span className={`${
                                report.status === 'Excelling' ? 'text-green-500' :
                                report.status === 'Needs Help' ? 'text-orange-500' :
                                report.status === 'At Risk' ? 'text-red-500' :
                                'text-cyan-500'
                              }`}>{report.status}</span>
                            </span>
                          </td>
                        </motion.tr>
                      )) : (
                        <tr>
                          <td colSpan="5" className="px-8 py-10 text-center text-text-muted font-medium">
                            No student reports found matching your criteria.
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

      </div>
    </DashboardLayout>
  );
}