import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import { useApi } from "../hooks.js";
import Cover from "../components/Cover.jsx";

const SLIDES = [
  {
    badge: "Ганҷинаи Миллӣ",
    badgeIcon: "local_fire_department",
    title: "Классикони форсу тоҷик —",
    accent: "бо овоз",
    color: "text-primary",
    text: "Аз Рӯдакӣ то Айнӣ — ганҷинаи бебаҳои адабиёт дар кисаи шумо. Ҳамеша ва дар ҳама ҷо гӯш кунед ва бихонед.",
  },
  {
    badge: "Мутолиа ва Садо",
    badgeIcon: "menu_book",
    title: "Хондан ва шунидани",
    accent: "ҳамзамон",
    color: "text-secondary",
    text: "Матни осорро ҳангоми садо пайгирӣ кунед ва ба умқи маъно фурӯ равед.",
  },
  {
    badge: "Технологияи Муосир",
    badgeIcon: "mic",
    title: "Навои дилнишини",
    accent: "шеъру наср",
    color: "text-primary",
    text: "Аз қироати ҳунармандон то овози зеҳни сунъии мутобиқшуда бо забони модарӣ.",
  },
];

const FEATURES = [
  { icon: "headphones", color: "text-primary", title: "Гӯш кардан дар ҳама ҷо", text: "Дар роҳ, дар хона, пеш аз хоб" },
  { icon: "cached", color: "text-secondary", title: "Давомдиҳии худкор", text: "Идома аз ҳамон лаҳзаи охирин" },
  { icon: "psychology", color: "text-primary-fixed-dim", title: "Овозҳои зинда ва AI", text: "Талаффузи дурусти вазну қофия" },
];

function markWelcomed() {
  try {
    localStorage.setItem("welcomed", "1");
  } catch {
    // nothing to remember in private mode
  }
}

export default function Welcome() {
  const [slide, setSlide] = useState(0);
  const touchStart = useRef(0);
  const { data: books } = useApi("/books?limit=3");
  const current = SLIDES[slide];

  function onTouchEnd(event) {
    const moved = event.changedTouches[0].screenX - touchStart.current;
    if (moved < -50) setSlide((slide + 1) % SLIDES.length);
    if (moved > 50) setSlide((slide - 1 + SLIDES.length) % SLIDES.length);
  }

  return (
    <main
      className="relative min-h-screen overflow-hidden pt-safe pb-safe flex flex-col"
      onTouchStart={(event) => (touchStart.current = event.changedTouches[0].screenX)}
      onTouchEnd={onTouchEnd}
    >
      {/* soft glow + star pattern */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_35%,rgba(255,192,65,0.18),rgba(79,219,200,0.05)_45%,transparent_70%)]" />

      <div className="relative z-20 px-4 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-full">
          <Icon name="auto_stories" filled size={18} className="text-primary" />
          <span className="font-serif text-primary text-[16px] leading-none">Шунав</span>
        </div>
        <Link to="/" onClick={markWelcomed} className="text-label-md text-on-surface-variant hover:text-on-surface px-3 py-1.5">
          Гузаштан
        </Link>
      </div>

      {/* picture part of the slide */}
      <div className="relative z-10 mt-4 h-72 flex items-center justify-center">
        <div className="absolute w-64 h-64 rounded-full bg-gradient-to-tr from-primary/10 via-secondary/15 to-transparent blur-2xl animate-pulse" />
        <div className="absolute w-72 h-72 rounded-full border-2 border-dashed border-primary/30 animate-spin opacity-40" style={{ animationDuration: "36s" }} />

        {slide === 0 && (
          <div className="relative w-full h-full flex items-center justify-center">
            {books?.[1] && <Cover book={books[1]} className="absolute w-28 h-40 rounded-xl -translate-x-16 -rotate-12 scale-90 opacity-80 shadow-2xl" />}
            {books?.[2] && <Cover book={books[2]} className="absolute w-28 h-40 rounded-xl translate-x-16 rotate-12 scale-90 opacity-80 shadow-2xl" />}
            {books?.[0] && <Cover book={books[0]} className="relative z-20 w-36 h-52 rounded-xl scale-105 shadow-2xl" />}
          </div>
        )}

        {slide === 1 && (
          <div className="relative z-20 w-64 p-4 rounded-xl bg-surface-container-high shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-serif text-[13px] text-primary">Хондан бо садо</span>
              <Icon name="sync" size={18} className="text-secondary" />
            </div>
            <p className="p-2.5 rounded-lg bg-surface-container-low font-serif text-[13px] leading-relaxed italic">
              «Бӯи Ҷӯи Мӯлиён ояд ҳаме,
              <br />
              Ёди ёри меҳрубон ояд ҳаме...»
            </p>
            <div className="flex items-center gap-2">
              <Icon name="volume_up" size={18} className="text-primary" />
              <div className="flex-1 h-1.5 bg-surface-bright rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-secondary w-3/4" />
              </div>
              <span className="text-[10px] text-tertiary">02:45</span>
            </div>
          </div>
        )}

        {slide === 2 && (
          <div className="relative z-20 w-64 p-4 rounded-xl bg-surface-container-high shadow-2xl flex flex-col gap-3 items-center text-center">
            <div className="w-14 h-14 rounded-full bg-surface-container-highest flex items-center justify-center text-primary">
              <Icon name="graphic_eq" size={32} />
            </div>
            <div>
              <p className="font-serif text-[15px]">Ровиёни Барҷаста ва AI</p>
              <p className="text-[12px] text-tertiary mt-1">Овози зиндаи устодони сухан ва садои ҳушманди сунъӣ</p>
            </div>
            <div className="flex gap-1.5 items-end h-8">
              {[0, 0.15, 0.3, 0.2, 0.4, 0.1].map((delay, i) => (
                <span key={i} className={`w-1 rounded-full animate-eq ${i % 2 ? "bg-primary" : "bg-secondary"}`} style={{ animationDelay: `${delay}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* dots */}
      <div className="relative z-20 flex items-center justify-center gap-2 my-2">
        {SLIDES.map((_, index) => (
          <button
            key={index}
            onClick={() => setSlide(index)}
            aria-label={`Слайд ${index + 1}`}
            className={`h-2 rounded-full transition-all duration-300 ${index === slide ? "w-8 bg-primary" : "w-2 bg-surface-variant hover:bg-outline"}`}
          />
        ))}
      </div>

      {/* text part of the slide */}
      <div className="relative z-20 px-4 flex flex-col items-center text-center mt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high mb-2">
          <Icon name={current.badgeIcon} size={14} className={current.color} />
          <span className={`text-label-sm uppercase tracking-wider ${current.color}`}>{current.badge}</span>
        </div>
        <h1 className="font-serif text-headline-lg-mobile font-bold tracking-tight px-2">
          {current.title} <span className={`italic ${current.color}`}>{current.accent}</span>
        </h1>
        <p className="font-serif text-tertiary mt-2.5 max-w-xs leading-relaxed text-[15px]">{current.text}</p>

        <div className="flex flex-col gap-2 w-full max-w-xs mt-6 text-left">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-container-low">
              <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0">
                <Icon name={feature.icon} size={18} className={feature.color} />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold">{feature.title}</p>
                <p className="text-[11px] text-tertiary truncate">{feature.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-20 px-4 w-full max-w-sm mx-auto mt-8 mb-8 flex flex-col gap-3">
        <Link to="/register" onClick={markWelcomed} className="h-12 bg-primary text-on-primary text-label-lg rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-primary-container active:scale-[0.99]">
          Оғоз кардан <Icon name="arrow_forward" size={20} />
        </Link>
        <Link to="/login" onClick={markWelcomed} className="h-12 bg-surface-container-high text-secondary-fixed text-label-lg rounded-xl hover:bg-surface-bright flex items-center justify-center">
          Ворид шудан
        </Link>
      </div>
    </main>
  );
}
