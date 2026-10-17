import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav.jsx";
import Footer from "./Footer.jsx";
import Header from "./Header.jsx";
import MiniPlayer from "./MiniPlayer.jsx";

// Main tabs: top bar + page + footer + player bar + bottom menu (phones)
export default function Layout() {
  return (
    <>
      <Header />
      <main className="pt-16 md:pt-[72px] min-h-screen max-w-7xl mx-auto">
        <Outlet />
      </main>
      <Footer />
      <MiniPlayer />
      <BottomNav />
    </>
  );
}
