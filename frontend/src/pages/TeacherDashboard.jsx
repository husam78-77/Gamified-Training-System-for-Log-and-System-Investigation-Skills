import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleLogout = async () => {
    try {
      const res = await fetch("https://localhost:7003/api/user/logout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" }
      });

      if (!res.ok) {
        alert("Logout failed");
        return;
      }
      navigate("/login");
    } catch {
      alert("Logout error");
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("https://localhost:7003/api/user/me", {
          credentials: "include"
        });

        if (!res.ok) {
          navigate("/login");
          return;
        }

        const userData = await res.json();

        // Block students from teacher dashboard
        if (userData.role !== "Teacher") {
          navigate("/dashboard"); // Redirect students to their dashboard
        } else {
          setUser(userData);
        }
      } catch {
        navigate("/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface text-primary font-headline font-bold text-xl">
        Loading Teacher Workspace...
      </div>
    );
  }

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen flex">
      
      {/* ================= SIDEBAR ================= */}
      <aside className="flex flex-col h-screen w-64 fixed left-0 top-0 z-40 p-6 bg-surface-container-low border-r border-outline-variant/20">
        
        {/* Logo */}
        <div className="mb-10 flex flex-col gap-1 cursor-pointer" onClick={() => navigate("/")}>
          <h1 className="text-xl font-bold text-primary font-headline tracking-tight">
            IntelliCode Learn
          </h1>
          <p className="text-[10px] text-secondary uppercase tracking-widest font-semibold">
            Teacher Workspace
          </p>
        </div>

        {/* Profile */}
        <div className="flex items-center gap-3 mb-8 p-3 bg-white rounded-xl border border-outline-variant/10 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary font-headline">
            {user?.firstName?.charAt(0) || "T"}
          </div>
          <div>
            <p className="text-sm font-bold text-primary line-clamp-1">
              {user?.firstName || "Teacher Name"}
            </p>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">
              Instructor
            </p>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex flex-col gap-2 flex-grow">
          {[
            { name: 'Dashboard', icon: 'dashboard', active: true },
            { name: 'Classes', icon: 'class' },
            { name: 'Students', icon: 'groups' },
            { name: 'Exams', icon: 'assignment' },
            { name: 'Marking', icon: 'fact_check' },
            { name: 'Profile', icon: 'person' },
          ].map((item) => (
            <button 
              key={item.name}
              className={`flex items-center gap-3 py-2.5 px-3 rounded-lg transition-colors text-left ${item.active ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-surface-container text-on-surface-variant hover:text-primary'}`}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              <span className="text-sm">{item.name}</span>
            </button>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="pt-6 border-t border-outline-variant/20 flex flex-col gap-2">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 py-2 px-3 text-error hover:bg-error/10 transition-colors rounded-lg text-left"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="text-sm font-semibold">Log Out</span>
          </button>
        </div>
      </aside>

      {/* ================= MAIN AREA ================= */}
      <div className="ml-64 flex flex-col flex-grow min-h-screen">
        
        {/* Header */}
        <header className="px-8 py-8 bg-white border-b border-outline-variant/10 shadow-sm sticky top-0 z-30">
          <h2 className="font-headline font-extrabold text-3xl text-primary">
            Overview Dashboard
          </h2>
          <p className="text-on-surface-variant mt-1 text-sm">Welcome back. Here is what's happening in your classes today.</p>
        </header>

        <main className="p-8 flex-grow space-y-8 bg-surface-container-low/30">
          
          {/* 1. Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-outline-variant/10 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <span className="material-symbols-outlined">groups</span>
              </div>
              <div>
                <p className="text-sm text-on-surface-variant font-medium">Total Students</p>
                <p className="text-2xl font-bold font-headline text-primary">45</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-outline-variant/10 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                <span className="material-symbols-outlined">class</span>
              </div>
              <div>
                <p className="text-sm text-on-surface-variant font-medium">Active Classes</p>
                <p className="text-2xl font-bold font-headline text-primary">3</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-outline-variant/10 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <span className="material-symbols-outlined">analytics</span>
              </div>
              <div>
                <p className="text-sm text-on-surface-variant font-medium">Average Score</p>
                <p className="text-2xl font-bold font-headline text-primary">72%</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column (Wider) */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* 2. Student Progress Summary */}
              <section className="bg-white p-6 rounded-2xl border border-outline-variant/10 shadow-sm">
                <h3 className="font-headline font-bold text-lg text-primary mb-6">Student Progress Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/5">
                    <span className="text-secondary text-xs font-bold uppercase tracking-wider block mb-1">Engagement</span>
                    <p className="text-xl font-bold text-primary">18 <span className="text-sm font-normal text-on-surface-variant">students active today</span></p>
                  </div>
                  <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/5">
                    <span className="text-success text-xs font-bold uppercase tracking-wider block mb-1">Milestones</span>
                    <p className="text-xl font-bold text-primary">10 <span className="text-sm font-normal text-on-surface-variant">completed a level this week</span></p>
                  </div>
                </div>
              </section>

              {/* 4. Class Quick Access */}
              <section className="bg-white p-6 rounded-2xl border border-outline-variant/10 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-headline font-bold text-lg text-primary">Your Classes</h3>
                  <button className="text-secondary text-sm font-bold hover:underline">View All</button>
                </div>
                <div className="space-y-4">
                  {[
                    { name: 'BITI Year 2', students: 25, subject: 'C++ Fundamentals' },
                    { name: 'BACS Year 1', students: 20, subject: 'Intro to Logic' }
                  ].map((cls, i) => (
                    <div key={i} className="flex justify-between items-center p-4 bg-surface-container-low/50 rounded-xl border border-outline-variant/10 hover:border-secondary/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center font-bold">
                          {cls.name.split(' ')[0]}
                        </div>
                        <div>
                          <p className="font-bold text-primary">{cls.name}</p>
                          <p className="text-xs text-on-surface-variant">{cls.subject} • {cls.students} Students</p>
                        </div>
                      </div>
                      <button className="border border-outline-variant text-primary px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-surface-container transition-colors">
                        Open
                      </button>
                    </div>
                  ))}
                </div>
              </section>

            </div>

            {/* Right Column (Narrower) */}
            <div className="space-y-8">
              
              {/* 3. Pending Exams Review */}
              <section className="bg-error/10 border border-error/20 p-6 rounded-2xl shadow-sm">
                <div className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-error text-3xl">notification_important</span>
                  <div>
                    <h3 className="font-headline font-bold text-error mb-1">Action Required</h3>
                    <p className="text-error/80 text-sm mb-4">You have <span className="font-bold">5 pending exam reviews</span> waiting for manual grading.</p>
                    <button className="w-full bg-error text-white py-2.5 rounded-lg font-bold text-sm shadow-sm hover:bg-error/90 transition-colors">
                      Review Now
                    </button>
                  </div>
                </div>
              </section>

              {/* 5. Recent Activity */}
              <section className="bg-white p-6 rounded-2xl border border-outline-variant/10 shadow-sm flex-grow">
                <h3 className="font-headline font-bold text-lg text-primary mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">history</span>
                  Recent Activity
                </h3>
                <div className="space-y-5">
                  <div className="flex gap-3 items-start">
                    <div className="w-2 h-2 rounded-full bg-secondary mt-1.5 flex-shrink-0"></div>
                    <div>
                      <p className="text-sm font-medium text-primary">Ali submitted a quiz</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">Variables Basics • 10 mins ago</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="w-2 h-2 rounded-full bg-success mt-1.5 flex-shrink-0"></div>
                    <div>
                      <p className="text-sm font-medium text-primary">Sara joined the class</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">BITI Year 2 • 1 hour ago</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="w-2 h-2 rounded-full bg-secondary mt-1.5 flex-shrink-0"></div>
                    <div>
                      <p className="text-sm font-medium text-primary">John completed a module</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">If-Else Statements • 2 hours ago</p>
                    </div>
                  </div>
                </div>
              </section>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default TeacherDashboard;