import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import Cover from "../components/Cover.jsx";
import Header from "../components/Header.jsx";
import Icon from "../components/Icon.jsx";
import MiniPlayer from "../components/MiniPlayer.jsx";
import Spinner from "../components/Spinner.jsx";
import { useApi } from "../hooks.js";
import { usePlayer } from "../player.jsx";

const THEMES = {
  dark: "bg-surface md:bg-surface-container-low text-on-surface", // on wide screens the page is a bit lighter than the background
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

  const settings = (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1 bg-surface-container-high text-on-surface rounded-full p-1">
        <button onClick={() => changeSize(-2)} className="w-9 h-9 rounded-full hover:bg-surface-bright text-label-md" aria-label="Хурдтар">A−</button>
        <span className="text-label-sm text-on-surface-variant w-6 text-center">{size}</span>
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
  );

  const contentsLinks = sections.map((section, index) => (
    <a key={index} href={`#part-${index}`} className="block text-body-sm text-on-surface-variant hover:text-primary truncate py-1">
      {section.heading || "Аввал"}
    </a>
  ));

  return (
    <div className="min-h-screen bg-surface">
      <Header title={book?.title || "Хондан"} />

      {/* Wide screens: book + chapters | the page | settings + contents. Phones: only the page. */}
      <main className="pt-16 md:pt-[104px] pb-36 max-w-7xl mx-auto md:px-8 lg:grid lg:grid-cols-[260px_minmax(0,1fr)_230px] lg:gap-8 lg:items-start">
        {/* Left: the book and its chapters */}
        <aside className="hidden lg:flex flex-col gap-4 sticky top-[104px] max-h-[calc(100vh-140px)]">
          {book && (
            <Link to={`/books/${book.id}`} className="flex gap-3 items-center p-3 rounded-2xl bg-surface-container-low hover:bg-surface-container">
              <Cover book={book} showTitle={false} className="w-14 h-20 rounded-lg shrink-0" />
              <div className="min-w-0">
                <p className="font-serif text-label-lg truncate">{book.title}</p>
                <p className="text-label-sm text-on-surface-variant truncate">{book.author.name}</p>
              </div>
            </Link>
          )}
          <div className="rounded-2xl bg-surface-container-low p-2 overflow-y-auto">
            <p className="px-3 py-2 text-label-sm uppercase tracking-wider text-on-surface-variant">Бобҳо</p>
            {book?.chapters.map((item) => (
              <Link
                key={item.id}
                to={`/read/${item.id}`}
                className={`flex gap-2 px-3 py-2 rounded-xl text-body-sm ${item.id === chapter?.id ? "bg-primary/15 text-primary font-semibold" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"}`}
              >
                <span className="w-5 shrink-0 text-right opacity-70">{item.order}</span>
                <span className="truncate">{item.title}</span>
              </Link>
            ))}
          </div>
        </aside>

        {/* Middle: the page */}
        <article className={`${THEMES[theme]} min-h-screen lg:min-h-0 px-5 py-6 md:rounded-3xl md:px-12 md:py-12 lg:px-16 md:shadow-2xl`}>
          {loading ? (
            <Spinner />
          ) : (
            <>
              <div className="lg:hidden mb-6">{settings}</div>

              <div className="text-center mb-8">
                <p className="text-label-sm uppercase tracking-[0.2em] text-primary-container">Боби {chapter.order}</p>
                <h1 className="font-serif text-headline-lg-mobile md:text-[36px] md:leading-[44px] font-semibold mt-2">{chapter.title}</h1>
                {book && <p className="font-serif text-body-sm opacity-60 mt-2">{book.title} — {book.author.name}</p>}
                <div className="mx-auto mt-5 w-24 h-px bg-primary-container/50" />
              </div>

              {chapter.audio_file && book && (
                <div className="flex justify-center mb-8">
                  <button
                    onClick={() => player.playChapter(book, book.chapters.find((c) => c.id === chapter.id), 0)}
                    className="h-10 px-5 rounded-full bg-primary text-on-primary text-label-md flex items-center gap-2"
                  >
                    <Icon name="headphones" size={18} /> {player.chapter?.id === chapter.id ? "Дар ҳоли пахш" : "Гӯш кардани ин боб"}
                  </button>
                </div>
              )}

              {/* contents on phones (wide screens have it on the right) */}
              {sections.length > 3 && (
                <details className="lg:hidden mb-8 rounded-xl bg-surface-container text-on-surface">
                  <summary className="cursor-pointer p-4 text-label-lg flex items-center gap-2">
                    <Icon name="list" size={20} className="text-primary" /> Мундариҷаи боб ({sections.length})
                  </summary>
                  <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 gap-x-3 max-h-72 overflow-y-auto">{contentsLinks}</div>
                </details>
              )}

              {sections.length === 0 && <p className="font-serif opacity-70 text-center">Матни ин боб ҳоло илова нашудааст.</p>}

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
                  <Link to={`/read/${previous.id}`} className="flex-1 p-3 rounded-xl bg-surface-container text-on-surface text-label-md truncate hover:bg-surface-container-high">
                    ← {previous.title}
                  </Link>
                ) : (
                  <span className="flex-1" />
                )}
                {next && (
                  <Link to={`/read/${next.id}`} className="flex-1 p-3 rounded-xl bg-surface-container text-on-surface text-label-md text-right truncate hover:bg-surface-container-high">
                    {next.title} →
                  </Link>
                )}
              </div>
            </>
          )}
        </article>

        {/* Right: settings and the contents of this chapter */}
        <aside className="hidden lg:flex flex-col gap-4 sticky top-[104px] max-h-[calc(100vh-140px)]">
          <div className="rounded-2xl bg-surface-container-low p-3">
            <p className="text-label-sm uppercase tracking-wider text-on-surface-variant mb-3">Ҳарф ва ранг</p>
            {settings}
          </div>
          {sections.length > 1 && (
            <div className="rounded-2xl bg-surface-container-low p-3 overflow-y-auto">
              <p className="text-label-sm uppercase tracking-wider text-on-surface-variant mb-2">Мундариҷаи боб ({sections.length})</p>
              {contentsLinks}
            </div>
          )}
        </aside>
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
