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

  const sections = splitSections(chapter?.text || "");

  return (
    <div className={`min-h-screen ${THEMES[theme]}`}>
      <Header title={book?.title || "Хондан"} />
      <main className="pt-20 md:pt-28 pb-36 px-5 max-w-2xl mx-auto">
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

            {/* contents: jump to a story / ghazal inside a long chapter */}
            {sections.length > 3 && (
              <details className="mb-8 rounded-xl bg-surface-container text-on-surface">
                <summary className="cursor-pointer p-4 text-label-lg flex items-center gap-2">
                  <Icon name="list" size={20} className="text-primary" /> Мундариҷаи боб ({sections.length})
                </summary>
                <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 gap-1 max-h-72 overflow-y-auto">
                  {sections.map((section, index) => (
                    <a key={index} href={`#part-${index}`} className="text-body-sm text-on-surface-variant hover:text-primary truncate py-1">
                      {section.heading || "Аввал"}
                    </a>
                  ))}
                </div>
              </details>
            )}

            {sections.length === 0 && <p className="font-serif opacity-70">Матни ин боб ҳоло илова нашудааст.</p>}

            {sections.map((section, index) => (
              <section key={index} id={`part-${index}`} className="mb-10 scroll-mt-28">
                {section.heading && (
                  <h2 className="font-serif text-primary-container text-center mb-4 flex items-center justify-center gap-3" style={{ fontSize: size * 0.9 }}>
                    <span className="h-px w-8 bg-current opacity-40" />
                    {section.heading}
                    <span className="h-px w-8 bg-current opacity-40" />
                  </h2>
                )}
                {section.paragraphs.map((paragraph, i) => (
                  <p
                    key={i}
                    className={`font-serif whitespace-pre-line mb-5 ${isVerse(paragraph) ? "text-center" : "text-justify"}`}
                    style={{ fontSize: size, lineHeight: 1.9 }}
                  >
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}

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

// Chapter text -> [{heading, paragraphs}]. A line "◆ Ғазали 5" starts a new part; blank lines split paragraphs.
function splitSections(text) {
  const sections = [];
  let current = { heading: "", paragraphs: [] };

  for (const block of text.split(/\n\s*\n/)) {
    const lines = block.split("\n");
    if (lines[0].startsWith("◆ ")) {
      if (current.heading || current.paragraphs.length) sections.push(current);
      current = { heading: lines[0].slice(2).trim(), paragraphs: [] };
      lines.shift();
    }
    const paragraph = lines.join("\n").trim();
    if (paragraph) current.paragraphs.push(paragraph);
  }
  if (current.heading || current.paragraphs.length) sections.push(current);
  return sections;
}

// Verse = every line is short (half-bayts). Prose paragraphs are long.
function isVerse(paragraph) {
  return paragraph.split("\n").every((line) => line.length < 70);
}
