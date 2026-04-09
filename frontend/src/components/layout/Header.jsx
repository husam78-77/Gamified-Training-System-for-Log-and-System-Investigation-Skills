export default function Header() {
    return (
        <header className="fixed top-0 left-0 w-full flex items-center justify-between px-12 bg-zinc-950/80 backdrop-blur-md z-50 h-20 border-b-4 border-[#FF003C] skew-y-[-1deg] shadow-[0_0_30px_rgba(255,0,60,0.3)]">
            <div className="flex items-center gap-8">
                <h1 className="text-3xl font-black text-[#FF003C] italic skew-x-[-12deg] font-headline uppercase tracking-tighter">
                    KINETIC_BREACH_v1.0
                </h1>
                <nav className="hidden md:flex items-center gap-6">
                    <span className="font-headline font-black italic tracking-tighter uppercase text-white underline decoration-[#FF003C] decoration-4 cursor-default">LVL 42</span>
                    <span className="font-headline font-black italic tracking-tighter uppercase text-zinc-500 hover:text-[#FF003C] hover:scale-110 transition-all cursor-pointer">XP: 88%</span>
                    <span className="font-headline font-black italic tracking-tighter uppercase text-zinc-500 hover:text-[#FF003C] hover:scale-110 transition-all cursor-pointer">SYSTEM_STABLE</span>
                    <span className="font-headline font-black italic tracking-tighter uppercase text-zinc-500 hover:text-[#FF003C] hover:scale-110 transition-all cursor-pointer">00:14:59</span>
                </nav>
            </div>
            <div className="flex items-center gap-6">
                <span className="material-symbols-outlined text-[#FF003C] text-2xl cursor-pointer hover:scale-125 transition-transform" data-icon="notifications_active">notifications_active</span>
                <span className="material-symbols-outlined text-[#FF003C] text-2xl cursor-pointer hover:scale-125 transition-transform" data-icon="settings_input_component">settings_input_component</span>
                <div className="w-10 h-10 bg-zinc-800 skew-x-[-10deg] border-2 border-[#FF003C] overflow-hidden">
                    <img
                        alt="User Hacker Avatar"
                        className="w-full h-full object-cover"
                        data-alt="Cyberpunk hacker avatar with neon red mask and high-tech visor, cinematic dark lighting with red rim light"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCU8vT3cRG3qY_1h2kYZFZlP4xohHJQ2ZVPT6AK8Y8B4Yf_bNIfwW__ap--bNSiAK_7uW87TGJDXprPbiPXDlCBQJTCd9olcx7kU3W2Hu5GjWEvvM95EbFVHprEf-Y_U64HV4b1sRKcnsptdFuKLCB5-cawWahZgDBUq8OOaZgUlEw6yYg6PQH0pt8Vt4syPae6CrJZ7u_RYLL6pXasTxEq7fMtYoLA7U3UgRg9_86qwOxHPtqHdMOLBP7xjzeEqrAsl6TD-f2tX1Qq"
                    />
                </div>
            </div>
        </header>
    );
}