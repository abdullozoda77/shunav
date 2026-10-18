import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import Cover from "../components/Cover.jsx";
import Header from "../components/Header.jsx";
import Icon from "../components/Icon.jsx";
import MiniPlayer from "../components/MiniPlayer.jsx";
import Spinner from "../components/Spinner.jsx";
import { useApi } from "../hooks.js";
import { usePlayer } from "../player.jsx";
import { useT } from "../i18n.jsx";

// Page colours. "dark" follows the site theme (its name stays for the setting saved in old browsers).
// page = the paper, soft = buttons and boxes on the paper, swatch = the sample in the settings.
const THEMES = {
  dark: {
    name: "Мисли сайт",
    page: "bg-surface md:bg-surface-container-low text-on-surface", // on wide screens the page is a bit lighter than the background
    soft: "bg-surface-container hover:bg-surface-container-high text-on-surface",
    swatch: "bg-surface-container-highest text-on-surface",
  },
  sepia: {
    name: "Сепия",
    page: "bg-[#f4ecd8] text-[#3b2f1e]",
    soft: "bg-[#e9dcc0] hover:bg-[#e0d0ae] text-[#3b2f1e]",
    swatch: "bg-[#f4ecd8] text-[#3b2f1e]",
  },
  light: {
    name: "Сафед",
    page: "bg-white text-[#1c1f2a]",
    soft: "bg-[#f1efea] hover:bg-[#e7e4dd] text-[#1c1f2a]",
    swatch: "bg-white text-[#1c1f2a]",
  },
};

// The page's inner space (the turning copy of the page uses the same, so it lies exactly on top)
const PAGE_PADDING = "px-5 py-6 md:px-12 md:py-12 lg:px-16";

// About this many letters on one page; a poem or story is never cut in the middle
const PAGE_LETTERS = 2500;

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
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const player = usePlayer();
  const t = useT();
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

  // ---------- pages ----------
  const sections = splitSections(chapter?.text || "");
  const pages = makePages(sections);
  const pageParam = params.get("page");
  const pageNumber = pageParam === "last" ? pages.length : Math.min(Math.max(Number(pageParam) || 1, 1), pages.length);
  const pageSections = pages[pageNumber - 1] || [];

  const index = book?.chapters.findIndex((c) => c.id === chapter?.id) ?? -1;
  const previousChapter = book?.chapters[index - 1];
  const nextChapter = book?.chapters[index + 1];

  // ---------- turning the page ----------
  // A copy of what is on the screen now lies over the page and turns away; the new page is under it.
  const pageRef = useRef(null);
  const [turn, setTurn] = useState(null); // { direction: "next" | "back", html, box, offset, key }
  const scrollToPart = useRef(null);

  function startTurn(direction) {
    const page = pageRef.current;
    if (!page) return;
    const rect = page.getBoundingClientRect();
    const headerHeight = window.innerWidth >= 768 ? 72 : 64;
    const top = Math.max(rect.top, headerHeight);
    const bottom = Math.min(rect.bottom, window.innerHeight);
    if (bottom > top) {
      setTurn({
        direction,
        html: page.innerHTML,
        box: { left: rect.left, top, width: rect.width, height: bottom - top },
        offset: rect.top - top, // how far the page is scrolled under the visible part
        key: Date.now(),
      });
    }
    window.scrollTo({ top: 0, behavior: "instant" }); // the new page starts at its top (the copy stays where it is)
  }

  function goToPage(number, part = null) {
    if (number === pageNumber) {
      if (part !== null) document.getElementById(`part-${part}`)?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    startTurn(number > pageNumber ? "next" : "back");
    scrollToPart.current = part;
    setParams({ page: String(number) });
  }

  function goToChapter(target, page = null) {
    if (!target || target.id === chapter?.id) return;
    startTurn(target.order > chapter.order ? "next" : "back");
    navigate(`/read/${target.id}${page ? `?page=${page}` : ""}`);
  }

  function nextPage() {
    if (pageNumber < pages.length) goToPage(pageNumber + 1);
    else goToChapter(nextChapter);
  }

  function previousPage() {
    if (pageNumber > 1) goToPage(pageNumber - 1);
    else goToChapter(previousChapter, "last");
  }

  // after "jump to a poem" on another page: scroll to it once the page is there
  useEffect(() => {
    if (scrollToPart.current === null) return;
    document.getElementById(`part-${scrollToPart.current}`)?.scrollIntoView();
    scrollToPart.current = null;
  }, [pageNumber]);

  // the ← → keys turn pages
  useEffect(() => {
    function onKey(event) {
      if (event.target.closest?.("input, textarea")) return; // typing in a box: not a page turn
      if (event.key === "ArrowRight") nextPage();
      if (event.key === "ArrowLeft") previousPage();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // safety: take the copy away even if the "animation ended" event never comes (e.g. a hidden tab)
  useEffect(() => {
    if (!turn || loading) return;
    const timer = setTimeout(() => setTurn(null), 1500);
    return () => clearTimeout(timer);
  }, [turn, loading]);

  // ---------- parts of the screen ----------
  // text size (small A, the size, big A) and the page colour as three "Аа" samples
  const settings = (
    <div className="flex flex-col gap-5 text-on-surface">
      <div className="flex flex-col gap-2">
        <span className="text-label-sm text-on-surface-variant">{t("Андозаи ҳарф")}</span>
        <div className="flex items-center gap-1 bg-surface-container-high rounded-2xl p-1.5">
          <button onClick={() => changeSize(-2)} disabled={size <= 14} className="w-10 h-10 rounded-xl hover:bg-surface-bright font-serif text-[14px] disabled:opacity-30" aria-label={t("Хурдтар")}>
            A
          </button>
          <div className="flex-1 flex items-baseline justify-center gap-1.5">
            <span className="font-serif text-primary leading-none" style={{ fontSize: Math.min(size, 24) }}>Аа</span>
            <span className="text-label-sm text-on-surface-variant">{size}</span>
          </div>
          <button onClick={() => changeSize(2)} disabled={size >= 28} className="w-10 h-10 rounded-xl hover:bg-surface-bright font-serif text-[22px] disabled:opacity-30" aria-label={t("Калонтар")}>
            A
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-label-sm text-on-surface-variant">{t("Ранги саҳифа")}</span>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(THEMES).map(([name, item]) => (
            <button
              key={name}
              onClick={() => changeTheme(name)}
              aria-pressed={theme === name}
              className={`relative flex flex-col items-center gap-1.5 p-1.5 rounded-2xl border-2 ${theme === name ? "border-primary" : "border-line/10 hover:border-line/25"}`}
            >
              <span className={`w-full h-11 rounded-xl flex items-center justify-center font-serif text-[18px] shadow-inner ${item.swatch}`}>Аа</span>
              <span className={`text-label-sm leading-tight text-center ${theme === name ? "text-primary" : "text-on-surface-variant"}`}>{t(item.name)}</span>
              {theme === name && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center">
                  <Icon name="check" size={14} />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // every poem/story of the chapter, with the page it is on
  const contentsLinks = pages.flatMap((page, pageIndex) =>
    page.map(({ section, index: part }) => (
      <button
        key={part}
        onClick={() => goToPage(pageIndex + 1, part)}
        className={`flex justify-between gap-2 w-full text-left text-body-sm truncate py-1 hover:text-primary ${pageIndex + 1 === pageNumber ? "text-on-surface" : "text-on-surface-variant"}`}
      >
        <span className="truncate">{section.heading || t("Аввал")}</span>
        <span className="text-outline shrink-0">{pageIndex + 1}</span>
      </button>
    ))
  );

  const pageButtons = (
    <div className="flex items-center justify-between gap-3 mt-12">
      <button
        onClick={previousPage}
        disabled={pageNumber === 1 && !previousChapter}
        className={`flex-1 min-w-0 p-3 rounded-xl text-label-md text-left truncate disabled:opacity-30 ${THEMES[theme].soft}`}
      >
        ← {pageNumber > 1 ? t("Саҳифаи пеш") : previousChapter?.title || ""}
      </button>
      <span className="shrink-0 px-2 text-label-md opacity-70">
        {pageNumber} / {pages.length}
      </span>
      <button
        onClick={nextPage}
        disabled={pageNumber === pages.length && !nextChapter}
        className={`flex-1 min-w-0 p-3 rounded-xl text-label-md text-right truncate disabled:opacity-30 ${THEMES[theme].soft}`}
      >
        {pageNumber < pages.length ? t("Саҳифаи баъд") : nextChapter?.title || ""} →
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface">
      <Header title={book?.title || t("Хондан")} />

      {/* Wide screens: book + chapters | the page | settings + contents. Phones: only the page. */}
      <main className="pt-16 md:pt-[104px] pb-36 max-w-7xl mx-auto md:px-8 lg:grid lg:grid-cols-[260px_minmax(0,1fr)_230px] lg:gap-8 lg:items-start">
        {/* Left: the book and its chapters */}
        <aside className="hidden lg:flex flex-col gap-4 sticky top-[104px] max-h-[calc(100vh-140px)]">
          {book && (
            <Link to={`/books/${book.id}`} className="flex gap-3 items-center p-3 rounded-2xl bg-surface-container-low hover:bg-surface-container">
              <Cover book={book} showTitle={false} className="w-14 h-20 rounded-lg shrink-0" />
              <div className="min-w-0">
                <p className="font-serif text-label-lg truncate">{book.title}</p>
                <p className="text-label-sm text-on-surface-variant truncate">{t(book.author.name)}</p>
              </div>
            </Link>
          )}
          <div className="rounded-2xl bg-surface-container-low p-2 overflow-y-auto">
            <p className="px-3 py-2 text-label-sm uppercase tracking-wider text-on-surface-variant">{t("Бобҳо")}</p>
            {book?.chapters.map((item) => (
              <button
                key={item.id}
                onClick={() => goToChapter(item)}
                className={`flex gap-2 w-full text-left px-3 py-2 rounded-xl text-body-sm ${item.id === chapter?.id ? "bg-primary/15 text-primary font-semibold" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"}`}
              >
                <span className="w-5 shrink-0 text-right opacity-70">{item.order}</span>
                <span className="truncate">{item.title}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Middle: the page */}
        <article ref={pageRef} className={`${THEMES[theme].page} relative min-h-screen lg:min-h-0 md:rounded-3xl md:shadow-2xl ${PAGE_PADDING}`}>
          {!chapter ? (
            <Spinner />
          ) : (
            <>
              <details className="lg:hidden mb-6 rounded-2xl bg-surface-container-low text-on-surface">
                <summary className="cursor-pointer p-4 text-label-lg flex items-center gap-2">
                  <Icon name="text_fields" size={20} className="text-primary" /> {t("Ҳарф ва ранг")}
                </summary>
                <div className="px-4 pb-4">{settings}</div>
              </details>

              {pageNumber === 1 ? (
                <div className="text-center mb-8">
                  <p className="text-label-sm uppercase tracking-[0.2em] text-primary-container">{t("Боби {n}", { n: chapter.order })}</p>
                  <h1 className="font-serif text-headline-lg-mobile md:text-[36px] md:leading-[44px] font-semibold mt-2">{chapter.title}</h1>
                  {book && <p className="font-serif text-body-sm opacity-60 mt-2">{book.title} — {t(book.author.name)}</p>}
                  <div className="mx-auto mt-5 w-24 h-px bg-primary-container/50" />
                </div>
              ) : (
                // later pages: just a small line on top
                <p className="text-center text-label-sm uppercase tracking-[0.2em] text-primary-container mb-8">
                  {t("Боби {n}", { n: chapter.order })} · {chapter.title} · {t("саҳифаи {n}", { n: pageNumber })}
                </p>
              )}

              {pageNumber === 1 && chapter.audio_file && book && (
                <div className="flex justify-center mb-8">
                  <button
                    onClick={() => player.playChapter(book, book.chapters.find((c) => c.id === chapter.id), 0)}
                    className="h-10 px-5 rounded-full bg-primary text-on-primary text-label-md flex items-center gap-2"
                  >
                    <Icon name="headphones" size={18} /> {t(player.chapter?.id === chapter.id ? "Дар ҳоли пахш" : "Гӯш кардани ин боб")}
                  </button>
                </div>
              )}

              {/* contents on phones (wide screens have it on the right) */}
              {pageNumber === 1 && sections.length > 3 && (
                <details className={`lg:hidden mb-8 rounded-xl ${THEMES[theme].soft}`}>
                  <summary className="cursor-pointer p-4 text-label-lg flex items-center gap-2">
                    <Icon name="list" size={20} className="text-primary" /> {t("Мундариҷаи боб ({n})", { n: sections.length })}
                  </summary>
                  <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 gap-x-4 max-h-72 overflow-y-auto">{contentsLinks}</div>
                </details>
              )}

              {sections.length === 0 && <p className="font-serif opacity-70 text-center">{t("Матни ин боб ҳоло илова нашудааст.")}</p>}

              {pageSections.map(({ section, index: part }) => (
                <section key={part} id={`part-${part}`} className="mb-10 scroll-mt-28">
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

              {pageButtons}
            </>
          )}
        </article>

        {/* Right: settings and the contents of this chapter */}
        <aside className="hidden lg:flex flex-col gap-4 sticky top-[104px] max-h-[calc(100vh-140px)]">
          <div className="rounded-2xl bg-surface-container-low p-4">
            <p className="flex items-center gap-2 text-label-sm uppercase tracking-wider text-on-surface-variant mb-4"><Icon name="text_fields" size={18} className="text-primary" /> {t("Ҳарф ва ранг")}</p>
            {settings}
          </div>
          {sections.length > 1 && (
            <div className="rounded-2xl bg-surface-container-low p-3 overflow-y-auto">
              <p className="text-label-sm uppercase tracking-wider text-on-surface-variant mb-2">
                {t("Мундариҷаи боб ({n})", { n: sections.length })} · {t("{n} саҳифа", { n: pages.length })}
              </p>
              {contentsLinks}
            </div>
          )}
        </aside>
      </main>

      {/* the turning copy of the old page (index.css .page-flip); for a new chapter it waits until the chapter has loaded */}
      {turn && (
        <div className="fixed z-40 pointer-events-none" style={{ ...turn.box, perspective: 2000 }}>
          <div
            key={turn.key}
            className={`page-flip page-flip-${turn.direction} ${THEMES[theme].page} md:rounded-3xl`}
            style={{ animationPlayState: loading ? "paused" : "running" }}
            onAnimationEnd={() => setTurn(null)}
          >
            <div className={`absolute left-0 w-full ${PAGE_PADDING}`} style={{ top: turn.offset }} dangerouslySetInnerHTML={{ __html: turn.html }} />
          </div>
        </div>
      )}

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

// Sections -> pages of about PAGE_LETTERS letters: [[{section, index}, ...], ...]. Always at least one page.
function makePages(sections) {
  const pages = [];
  let page = [];
  let letters = 0;

  sections.forEach((section, index) => {
    const size = section.paragraphs.join("").length;
    if (page.length && letters + size > PAGE_LETTERS) {
      pages.push(page);
      page = [];
      letters = 0;
    }
    page.push({ section, index });
    letters += size;
  });
  if (page.length || !pages.length) pages.push(page);
  return pages;
}

// Verse = every line is short (half-bayts). Prose paragraphs are long.
function isVerse(paragraph) {
  return paragraph.split("\n").every((line) => line.length < 70);
}
