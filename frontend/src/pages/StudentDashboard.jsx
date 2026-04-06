import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Authentication Check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("https://localhost:7003/api/user/me", {
          method: "GET",
          credentials: "include"
        });

        if (!res.ok) {
          navigate("/login");
          return;
        }

        const userData = await res.json();

        // IMPORTANT: block teacher from student dashboard
        if (userData.role !== "Student") {
          navigate("/teacher-dashboard");
        } else {
          setUser(userData);
        }
      } catch (error) {
        navigate("/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      const res = await fetch("https://localhost:7003/api/user/logout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" }
      });

      if (!res.ok) {
        alert("Logout request failed");
        return;
      }
      navigate("/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface text-primary font-headline font-bold text-xl">
        Loading Workspace...
      </div>
    );
  }

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen flex">
      
      {/* ================= SIDEBAR ================= */}
      <aside className="flex flex-col h-screen w-64 fixed left-0 top-0 z-40 p-6 bg-surface-container-low border-r border-outline-variant/20">
        
        {/* Brand */}
        <div className="mb-10 flex flex-col gap-1 cursor-pointer" onClick={() => navigate('/')}>
          <h1 className="text-xl font-bold text-primary font-headline tracking-tight">IntelliCode Learn</h1>
          <p className="text-[10px] text-secondary uppercase tracking-widest font-semibold">Student Workspace</p>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-2 flex-grow">
          <a className="flex items-center gap-3 py-2.5 px-3 bg-secondary/10 text-primary font-bold rounded-lg transition-colors" href="#">
            <span className="material-symbols-outlined">dashboard</span>
            <span className="text-sm">Dashboard</span>
          </a>
          <a className="flex items-center gap-3 py-2.5 px-3 hover:bg-surface-container transition-colors text-on-surface-variant hover:text-primary rounded-lg" href="#">
            <span className="material-symbols-outlined">map</span>
            <span className="text-sm">Learning Roadmap</span>
          </a>
          <a className="flex items-center gap-3 py-2.5 px-3 hover:bg-surface-container transition-colors text-on-surface-variant hover:text-primary rounded-lg" href="#">
            <span className="material-symbols-outlined">code</span>
            <span className="text-sm">Practice Coding</span>
          </a>
          <a className="flex items-center gap-3 py-2.5 px-3 hover:bg-surface-container transition-colors text-on-surface-variant hover:text-primary rounded-lg" href="#">
            <span className="material-symbols-outlined">assignment</span>
            <span className="text-sm">Quizzes & Exams</span>
          </a>
          {/* NEW: Classes Navigation Link */}
          <a className="flex items-center gap-3 py-2.5 px-3 hover:bg-surface-container transition-colors text-on-surface-variant hover:text-primary rounded-lg" href="#">
            <span className="material-symbols-outlined">school</span>
            <span className="text-sm">Classes</span>
          </a>
          <a className="flex items-center gap-3 py-2.5 px-3 hover:bg-surface-container transition-colors text-on-surface-variant hover:text-primary rounded-lg" href="#">
            <span className="material-symbols-outlined">smart_toy</span>
            <span className="text-sm">AI Assistant</span>
          </a>
          <a className="flex items-center gap-3 py-2.5 px-3 hover:bg-surface-container transition-colors text-on-surface-variant hover:text-primary rounded-lg" href="#">
            <span className="material-symbols-outlined">person</span>
            <span className="text-sm">Profile</span>
          </a>
        </nav>

        {/* Bottom Actions */}
        <div className="pt-6 border-t border-outline-variant/20 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 py-2 px-3 text-error hover:bg-error/10 transition-colors rounded-lg text-left"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="text-sm font-semibold">Log Out</span>
          </button>
        </div>
      </aside>

      {/* ================= MAIN AREA ================= */}
      <div className="ml-64 flex-grow flex flex-col min-h-screen">
        
        {/* 1. Welcome Header */}
        <header className="w-full px-8 py-8 bg-white border-b border-outline-variant/10 shadow-sm sticky top-0 z-30">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-headline text-3xl font-extrabold text-primary">
                Welcome, {user?.firstName || 'Student'}!
              </h2>
              <p className="text-on-surface-variant mt-1 text-sm">Let's keep up the great work today.</p>
            </div>
            <div className="text-right bg-secondary/10 px-4 py-2 rounded-xl border border-secondary/20">
              <p className="text-[10px] text-secondary uppercase tracking-widest font-bold">Current Level</p>
              <p className="text-primary font-bold">Programming Basics</p>
            </div>
          </div>
        </header>

        <main className="p-8 flex-grow space-y-8 bg-surface-container-low/30">
          
          {/* 2. Progress Overview */}
          <section className="bg-white p-6 rounded-2xl border border-outline-variant/10 shadow-sm">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="font-headline font-bold text-primary text-lg">Roadmap Progress</h3>
                <p className="text-sm text-on-surface-variant mt-1">Current Topic: <span className="font-semibold text-primary">Variables</span></p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-secondary">30%</span>
                <p className="text-xs text-on-surface-variant">Completed levels: 2 / 10</p>
              </div>
            </div>
            <div className="h-3 w-full bg-surface-container-high rounded-full overflow-hidden">
              <div className="h-full bg-secondary transition-all duration-1000" style={{ width: "30%" }}></div>
            </div>
          </section>

          {/* Action Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* 3. Continue Learning Card */}
            <section className="bg-primary text-white p-6 rounded-2xl shadow-md flex flex-col justify-between relative overflow-hidden group">
              <div className="relative z-10">
                <span className="text-white/80 text-xs font-bold uppercase tracking-wider mb-2 block">Resume Learning</span>
                <h4 className="font-headline text-xl font-bold mb-4">If Statements</h4>
              </div>
              <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-white/10 text-8xl group-hover:scale-110 transition-transform duration-300">play_circle</span>
              <button className="relative z-10 bg-white text-primary px-4 py-3 rounded-lg font-bold hover:bg-surface transition-colors shadow-sm w-full">
                Continue Learning
              </button>
            </section>

            {/* 4. Current Task Card */}
            <section className="bg-white p-6 rounded-2xl border border-outline-variant/10 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-secondary text-xs font-bold uppercase tracking-wider mb-2 block">Active Challenge</span>
                <h4 className="font-headline text-lg font-bold text-primary mb-2">The Sum Function</h4>
                <p className="text-sm text-on-surface-variant mb-4">Create a function that returns the sum of two numbers.</p>
              </div>
              <button className="border-2 border-primary text-primary px-4 py-2.5 rounded-lg font-bold hover:bg-primary hover:text-white transition-colors w-full flex items-center justify-center gap-2">
                Open Practice <span className="material-symbols-outlined text-sm">code</span>
              </button>
            </section>

            {/* 5. Upcoming Quiz / Exam */}
            <section className="bg-white p-6 rounded-2xl border border-outline-variant/10 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-error text-xs font-bold uppercase tracking-wider block">Evaluation</span>
                  <span className="bg-success/10 text-success text-[10px] px-2 py-1 rounded-md font-bold uppercase">Available</span>
                </div>
                <h4 className="font-headline text-lg font-bold text-primary mb-2">Variables Basics</h4>
                <p className="text-sm text-on-surface-variant mb-4">Test your knowledge on variable declaration and scope.</p>
              </div>
              <button className="bg-error/10 text-error hover:bg-error hover:text-white px-4 py-2.5 rounded-lg font-bold transition-colors w-full flex items-center justify-center gap-2">
                Start Quiz <span className="material-symbols-outlined text-sm">timer</span>
              </button>
            </section>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* 7. Activity Summary */}
            <section className="bg-white p-6 rounded-2xl border border-outline-variant/10 shadow-sm">
              <h4 className="font-headline text-lg font-bold text-primary mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">history</span>
                Recent Activity
              </h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl border border-outline-variant/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center text-success">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-primary">Completed Lesson</p>
                      <p className="text-xs text-on-surface-variant">Variables & Data Types</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl border border-outline-variant/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-sm">military_tech</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-primary">Quiz Score: 80%</p>
                      <p className="text-xs text-on-surface-variant">Intro to C++</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* NEW: Enrolled Classes Widget */}
            <section className="bg-white p-6 rounded-2xl border border-outline-variant/10 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="font-headline text-lg font-bold text-primary mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">school</span>
                  My Classes
                </h4>
                
                <div className="space-y-3">
                  <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/10 transition-colors hover:border-secondary/30">
                    <p className="text-sm font-bold text-primary">C++ Fundamentals</p>
                    <p className="text-xs text-on-surface-variant mb-2">BITI Year 2 • Prof. Smith</p>
                    <button className="text-xs font-bold text-secondary hover:underline flex items-center gap-1">
                      Enter Classroom <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>
              <button className="mt-4 w-full border border-outline-variant text-primary px-4 py-2 rounded-lg text-sm font-bold hover:bg-surface-container transition-colors">
                View All Classes
              </button>
            </section>

            {/* 6. AI Assistant Shortcut */}
            <section className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 rounded-2xl shadow-md flex flex-col justify-center items-center text-center">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 border border-white/30 shadow-inner">
                <span className="material-symbols-outlined text-4xl text-white">smart_toy</span>
              </div>
              <h4 className="font-headline text-xl font-bold mb-2">Need a hint?</h4>
              <p className="text-white/80 text-sm mb-6 px-2">
                Stuck on loops or errors? Ask your AI tutor for real-time logical guidance.
              </p>
              <button className="w-full bg-white text-indigo-600 py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-opacity-90 transition-all shadow-sm">
                Ask AI <span className="material-symbols-outlined text-sm">chat</span>
              </button>
            </section>

          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentDashboard;