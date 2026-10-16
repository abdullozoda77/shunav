import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import Header from "../components/Header.jsx";
import Icon from "../components/Icon.jsx";
import MiniPlayer from "../components/MiniPlayer.jsx";
import Spinner from "../components/Spinner.jsx";
import { useApi } from "../hooks.js";
import { usePlayer } from "../player.jsx";

const THEMES = {
  dark: "bg-surface text-on-surface",
  sepia: "bg-[#f4ecd8] text-[#3b2f1e]",
  light: "bg-white text-[#1c1f2a]",
};

function readSetting(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function saveSetting(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // not saved, fine
  }
}

export default function Reader() {
  const { chapterId } = useParams();
  const player = usePlayer();
  const { data: chapter, loading } = useApi(`/chapters/${chapterId}`);
  const { data: book } = useApi(chapter ? `/books/${chapter.book_id}` : null);

  const [size, setSize] = useState(Number(readSetting("reader-size", 18)));
  const [theme, setTheme] = useState(readSetting("reader-theme", "dark"));

  function changeSize(step) {
    const value = Math.min(28, Math.max(14, size + step));
    setSize(value);
    saveSetting("reader-size", value);
  }

  function changeTheme(value) {
    setTheme(value);
    saveSetting("reader-theme", value);
  }

  const index = book?.chapters.findIndex((c) => c.id === chapter?.id) ?? -1;
  const previous = book?.chapters[index - 1];
  const next = book?.chapters[index + 1];

  // a poem: lines are short, so center them like bayts
  const lines = chapter?.text?.split("\n") || [];
  const isPoem = lines.length > 1 && lines.every((line) => line.length < 70);

  return (
    <div className={`min-h-screen ${THEMES[theme]}`}>
      <Header title={book?.title || "Хондан"} />
      <main className="pt-20 pb-36 px-5 max-w-2xl mx-auto">
        {loading ? (
          <Spinner />
        ) : (
          <>
            {/* settings */}
            <div className="flex items-center justify-between gap-2 mb-6">
              <div className="flex items-center gap-1 bg-surface-container-high text-on-surface rounded-full p-1">
                <button onClick={() => changeSize(-2)} className="w-9 h-9 rounded-full hover:bg-surface-bright text-label-md" aria-label="Хурдтар">A−</button>
                <button onClick={() => changeSize(2)} className="w-9 h-9 rounded-full hover:bg-surface-bright text-label-lg" aria-label="Калонтар">A+</button>
              </div>
              <div className="flex items-center gap-1 bg-surface-container-high rounded-full p-1">
                {Object.keys(THEMES).map((name) => (
                  <button
                    key={name}
                    onClick={() => changeTheme(name)}
                    aria-label={name}
                    className={`w-8 h-8 rounded-full border-2 ${theme === name ? "border-primary" : "border-transparent"} ${name === "dark" ? "bg-surface" : name === "sepia" ? "bg-[#f4ecd8]" : "bg-white"}`}
                  />
                ))}
              </div>
            </div>

            <p className="text-label-sm uppercase tracking-wider text-primary-container">Боби {chapter.order}</p>
            <h1 className="font-serif text-headline-lg-mobile font-semibold mt-1 mb-6">{chapter.title}</h1>

            {chapter.audio_file && book && (
              <button
                onClick={() => player.playChapter(book, book.chapters.find((c) => c.id === chapter.id), 0)}
                className="mb-6 h-10 px-4 rounded-full bg-primary text-on-primary text-label-md flex items-center gap-2"
              >
                <Icon name="headphones" size={18} /> {player.chapter?.id === chapter.id ? "Дар ҳоли пахш" : "Гӯш кардани ин боб"}
              </button>
            )}

            <article className={`font-serif whitespace-pre-line ${isPoem ? "text-center" : ""}`} style={{ fontSize: size, lineHeight: 1.9 }}>
              {chapter.text || "Матни ин боб ҳоло илова нашудааст."}
            </article>

            <div className="flex justify-between gap-3 mt-12">
              {previous ? (
                <Link to={`/read/${previous.id}`} className="flex-1 p-3 rounded-xl bg-surface-container text-on-surface text-label-md truncate">← {previous.title}</Link>
              ) : <span className="flex-1" />}
              {next && (
                <Link to={`/read/${next.id}`} className="flex-1 p-3 rounded-xl bg-surface-container text-on-surface text-label-md text-right truncate">{next.title} →</Link>
              )}
            </div>
          </>
        )}
      </main>
      <MiniPlayer />
    </div>
  );
}
