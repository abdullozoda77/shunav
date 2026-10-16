import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import Book from "./pages/Book.jsx";
import Home from "./pages/Home.jsx";
import Library from "./pages/Library.jsx";
import Player from "./pages/Player.jsx";
import Profile from "./pages/Profile.jsx";
import Reader from "./pages/Reader.jsx";
import Search from "./pages/Search.jsx";
import Welcome from "./pages/Welcome.jsx";
import { getToken } from "./api.js";

// First visit without an account: show the onboarding slides once
function FirstVisit({ children }) {
  const location = useLocation();
  let welcomed = true;
  try {
    welcomed = Boolean(localStorage.getItem("welcomed"));
  } catch {
    // storage blocked: just show the app
  }
  if (!welcomed && !getToken() && location.pathname === "/") return <Navigate to="/welcome" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/player" element={<Player />} />
      <Route path="/books/:id" element={<Book />} />
      <Route path="/read/:chapterId" element={<Reader />} />
      <Route element={<FirstVisit><Layout /></FirstVisit>}>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/library" element={<Library />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
