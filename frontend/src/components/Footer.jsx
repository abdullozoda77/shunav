import { Link } from "react-router-dom";
import { useApi } from "../hooks.js";
import BooksBackground from "./BooksBackground.jsx";
import { NAV_LINKS } from "./BottomNav.jsx";
import Icon from "./Icon.jsx";

const SOURCES = [
  { name: "Ганҷур — матнҳои классикӣ", url: "https://ganjoor.net" },
  { name: "The Met — миниатюраҳои муқова", url: "https://www.metmuseum.org/about-the-met/policies-and-documents/open-access" },
  { name: "Shekar — гардонидан ба кириллӣ", url: "https://github.com/amirivojdan/shekar" },
];

// Site footer: about, pages, genres, sources. The bottom space leaves room for the player bar (and the phone menu).
export default function Footer() {
  const { data: stats } = useApi("/stats");

  return (
    <footer className="relative mt-16 border-t border-white/5 bg-surface-container-lowest overflow-hidden">
      <BooksBackground className="opacity-[0.06]" />

      <div className="relative max-w-7xl mx-auto px-4 md:px-8 pt-12 pb-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
        {/* about */}
        <div className="flex flex-col gap-4">
          <Link to="/" className="flex items-center gap-2">
            <Icon name="auto_stories" filled size={30} className="text-primary" />
            <div>
              <p className="font-serif text-headline-sm text-primary leading-none">Шунав</p>
              <p className="text-label-sm text-on-surface-variant">Китобхонаи савтӣ</p>
            </div>
          </Link>
          <p className="text-body-sm text-on-surface-variant max-w-xs">
            Классикони форсу тоҷик — аз Рӯдакӣ то Айнӣ — бо матни пурра ва овоз. Ройгон ва барои ҳама.
          </p>
          {stats && (
            <p className="text-label-md text-tertiary">
              {stats.books} китоб · {stats.authors} муаллиф · {stats.chapters} боб
            </p>
          )}
        </div>

        {/* pages */}
        <div>
          <p className="text-label-sm uppercase tracking-wider text-primary mb-4">Саҳифаҳо</p>
          <ul className="flex flex-col gap-2.5">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="flex items-center gap-2 text-body-sm text-on-surface-variant hover:text-primary">
                  <Icon name={link.icon} size={16} /> {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* genres */}
        <div>
          <p className="text-label-sm uppercase tracking-wider text-primary mb-4">Жанрҳо</p>
          <ul className="flex flex-col gap-2.5">
            {stats?.genres.map((genre) => (
              <li key={genre.id}>
                <Link to={`/search?category_id=${genre.id}`} className="text-body-sm text-on-surface-variant hover:text-primary">
                  {genre.name} <span className="text-outline">({genre.books})</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* sources */}
        <div>
          <p className="text-label-sm uppercase tracking-wider text-primary mb-4">Манбаъҳо</p>
          <ul className="flex flex-col gap-2.5">
            {SOURCES.map((source) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-body-sm text-on-surface-variant hover:text-primary">
                  {source.name} <Icon name="open_in_new" size={14} />
                </a>
              </li>
            ))}
          </ul>
          <p className="text-label-sm text-outline mt-4 leading-relaxed">
            Ҳамаи асарҳо мулки ҷамъиятӣ (public domain) мебошанд. Портретҳои муаллифон тасвири бадеии 3D мебошанд.
          </p>
        </div>
      </div>

      {/* bottom line */}
      <div className="relative border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 pb-36 md:pb-24 flex flex-col md:flex-row gap-2 md:items-center md:justify-between text-label-sm text-outline">
          <span>© {new Date().getFullYear()} Шунав. Бо меҳр барои хонандагони тоҷик.</span>
          <span className="flex items-center gap-1.5">
            <Icon name="policy" size={14} /> Шикоят аз ҳуқуқи муаллиф — дар саҳифаи ҳар китоб
          </span>
        </div>
      </div>
    </footer>
  );
}
