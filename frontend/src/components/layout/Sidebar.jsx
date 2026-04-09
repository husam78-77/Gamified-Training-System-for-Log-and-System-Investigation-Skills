
export default function Sidebar() {
    return (
        <aside className="fixed left-10 top-0 h-full w-72 bg-zinc-950 border-r-[12px] border-[#FF003C] shadow-[20px_0_60px_rgba(0,0,0,0.8)] origin-top-left -skew-x-2 z-40 hidden md:flex flex-col pt-32 gap-6">
            <div className="px-8 mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-zinc-800 rotate-45 border-2 border-[#00FFFF] overflow-hidden">
                        <img
                            alt="Agent Profile"
                            className="-rotate-45 scale-150"
                            data-alt="Portrait of a futuristic special ops agent with cybernetic eye, dramatic shadows and neon blue lighting"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDkYa08sVOlAGzQ6Gzby1PxLwT7GY1Rf-ExkJcSYkhrZ4WqOx6WGzGq1EzBvC-YC46xBvF08zebkEpv6g82gDSA4DNkAO0r6gaWeLQ4_BsLGc8A27f-5obhZrjrRCgGGTJCOdI8YqTOnc6YxAH5bOzx1sv6dW0GQ1XdeKuZKxJ9RfDOczDNgUB_eU2hXJUiZFrvj7A3MfMDnlykCQBzO8Fdy0BNEuJdsw36Eks_H1oRao4V8V2k05pdDXZcUtIThKyNgjl-VAtrf7Q3"
                        />
                    </div>
                    <div>
                        <p className="font-headline font-bold text-xl tracking-widest italic text-white uppercase leading-none">OPERATIVE_01</p>
                        <p className="font-label text-xs text-[#00FFFF] tracking-widest">RANK: PHANTOM</p>
                    </div>
                </div>
            </div>
            <nav className="flex flex-col gap-2">
                <a className="font-headline font-bold text-xl tracking-widest italic bg-[#FF003C] text-black -translate-x-4 skew-x-[-10deg] px-8 py-4 shadow-[10px_10px_0px_#00FFFF] flex items-center gap-4 transition-all" href="#!">
                    <span className="material-symbols-outlined" data-icon="grid_view">grid_view</span>
                    DASHBOARD
                </a>
                <a className="font-headline font-bold text-xl tracking-widest italic text-white hover:text-[#00FFFF] px-8 py-4 transition-transform hover:translate-x-2 flex items-center gap-4 hover:skew-x-[-12deg] hover:bg-zinc-800" href="#!">
                    <span className="material-symbols-outlined" data-icon="ads_click">ads_click</span>
                    MISSIONS
                </a>
                <a className="font-headline font-bold text-xl tracking-widest italic text-white hover:text-[#00FFFF] px-8 py-4 transition-transform hover:translate-x-2 flex items-center gap-4 hover:skew-x-[-12deg] hover:bg-zinc-800" href="#!">
                    <span className="material-symbols-outlined" data-icon="query_stats">query_stats</span>
                    PROGRESS
                </a>
                <a className="font-headline font-bold text-xl tracking-widest italic text-white hover:text-[#00FFFF] px-8 py-4 transition-transform hover:translate-x-2 flex items-center gap-4 hover:skew-x-[-12deg] hover:bg-zinc-800" href="#!">
                    <span className="material-symbols-outlined" data-icon="account_circle">account_circle</span>
                    PROFILE
                </a>
            </nav>
            <div className="mt-auto px-8 mb-12 flex flex-col gap-4">
                <button className="bg-[#00FFFF] text-black font-headline font-black italic py-3 skew-x-[-15deg] hover:bg-white transition-colors">
                    INITIATE BREACH
                </button>
                <div className="flex flex-col gap-2 opacity-60">
                    <a className="flex items-center gap-2 font-label text-sm hover:text-[#FF003C]" href="#!">
                        <span className="material-symbols-outlined text-sm" data-icon="settings">settings</span> SETTINGS
                    </a>
                    <a className="flex items-center gap-2 font-label text-sm hover:text-[#FF003C]" href="#!">
                        <span className="material-symbols-outlined text-sm" data-icon="power_settings_new">power_settings_new</span> LOGOUT
                    </a>
                </div>
            </div>
        </aside>

    );
}