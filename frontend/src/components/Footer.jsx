import { Link } from "react-router-dom";
import { useApi } from "../hooks.js";
import BooksBackground from "./BooksBackground.jsx";
import { NAV_LINKS } from "./BottomNav.jsx";
import Icon from "./Icon.jsx";
import { useT } from "../i18n.jsx";

const SOURCES = [
  { name: "Ганҷур — матнҳои классикӣ", url: "https://ganjoor.net" },
  { name: "The Met — миниатюраҳои муқова", url: "https://www.metmuseum.org/about-the-met/policies-and-documents/open-access" },
  { name: "Shekar — гардонидан ба кириллӣ", url: "https://github.com/amirivojdan/shekar" },
];

// Site footer: about, pages, genres, sources. The bottom space leaves room for the player bar (and the phone menu).
export default function Footer() {
  const t = useT();
  const { data: stats } = useApi("/stats");

  return (
    <footer className="relative mt-16 border-t border-line/5 bg-surface-container-lowest overflow-hidden">
      <BooksBackground className="opacity-[0.06]" />

      <div className="relative max-w-7xl mx-auto px-4 md:px-8 pt-12 pb-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
        {/* about */}
        <div className="flex flex-col gap-4">
          <Link to="/" className="flex items-center gap-2">
            <Icon name="auto_stories" filled size={30} className="text-primary" />
            <div>
              <p className="font-serif text-headline-sm text-primary leading-none">{t("Шунав")}</p>
              <p className="text-label-sm text-on-surface-variant">{t("Китобхонаи савтӣ")}</p>
            </div>
          </Link>
          <p className="text-body-sm text-on-surface-variant max-w-xs">
            {t("Классикони форсу тоҷик — аз Рӯдакӣ то Айнӣ — бо матни пурра ва овоз. Ройгон ва барои ҳама.")}
          </p>
          {stats && (
            <p className="text-label-md text-tertiary">
              {t("{n} китоб", { n: stats.books })} · {t("{n} муаллиф", { n: stats.authors })} · {t("{n} боб", { n: stats.chapters })}
            </p>
          )}
        </div>

        {/* pages */}
        <div>
          <p className="text-label-sm uppercase tracking-wider text-primary mb-4">{t("Саҳифаҳо")}</p>
          <ul className="flex flex-col gap-2.5">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="flex items-center gap-2 text-body-sm text-on-surface-variant hover:text-primary">
                  <Icon name={link.icon} size={16} /> {t(link.label)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* genres */}
        <div>
          <p className="text-label-sm uppercase tracking-wider text-primary mb-4">{t("Жанрҳо")}</p>
          <ul className="flex flex-col gap-2.5">
            {stats?.genres.map((genre) => (
              <li key={genre.id}>
                <Link to={`/search?category_id=${genre.id}`} className="text-body-sm text-on-surface-variant hover:text-primary">
                  {t(genre.name)} <span className="text-outline">({genre.books})</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* sources */}
        <div>
          <p className="text-label-sm uppercase tracking-wider text-primary mb-4">{t("Манбаъҳо")}</p>
          <ul className="flex flex-col gap-2.5">
            {SOURCES.map((source) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-body-sm text-on-surface-variant hover:text-primary">
                  {t(source.name)} <Icon name="open_in_new" size={14} />
                </a>
              </li>
            ))}
          </ul>
          <p className="text-label-sm text-outline mt-4 leading-relaxed">
            {t("Ҳамаи асарҳо мулки ҷамъиятӣ (public domain) мебошанд. Портретҳои муаллифон тасвири бадеии 3D мебошанд.")}
          </p>
        </div>
      </div>

      {/* bottom line */}
      <div className="relative border-t border-line/5">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 pb-36 md:pb-24 flex flex-col md:flex-row gap-2 md:items-center md:justify-between text-label-sm text-outline">
          <span>{t("© {year} Шунав. Бо меҳр барои хонандагони тоҷик.", { year: new Date().getFullYear() })}</span>
          <span className="flex items-center gap-1.5">
            <Icon name="policy" size={14} /> {t("Шикоят аз ҳуқуқи муаллиф — дар саҳифаи ҳар китоб")}
          </span>
        </div>
      </div>
    </footer>
  );
}
