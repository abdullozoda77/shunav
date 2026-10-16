import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav.jsx";
import Header from "./Header.jsx";
import MiniPlayer from "./MiniPlayer.jsx";

// Main tabs: top bar + page + player bar + bottom menu (phones)
export default function Layout() {
  return (
    <>
      <Header />
      <main className="pt-16 md:pt-[72px] pb-40 md:pb-32 min-h-screen max-w-7xl mx-auto">
        <Outlet />
      </main>
      <MiniPlayer />
      <BottomNav />
    </>
  );
}
