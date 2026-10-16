import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav.jsx";
import Header from "./Header.jsx";
import MiniPlayer from "./MiniPlayer.jsx";

// Main tabs: top bar + page + mini player + bottom menu
export default function Layout() {
  return (
    <>
      <Header />
      <main className="pt-16 pb-40 min-h-screen max-w-3xl mx-auto">
        <Outlet />
      </main>
      <MiniPlayer />
      <BottomNav />
    </>
  );
}
