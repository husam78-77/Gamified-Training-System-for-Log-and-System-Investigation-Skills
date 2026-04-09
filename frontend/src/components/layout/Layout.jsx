import Header from "./Header";
import Sidebar from "./Sidebar";

export default function Layout({ children }) {
    return (
        <div className="dashboard-wrapper">
            <Header />
            <Sidebar />

            <main className="md:ml-72 pt-32 px-8 md:px-16 pb-20">
                {children}
            </main>
        </div>
    );
}