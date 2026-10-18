import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Cover from "../components/Cover.jsx";
import Icon from "../components/Icon.jsx";
import Spinner from "../components/Spinner.jsx";
import { formatDuration } from "../format.js";
import { useApi } from "../hooks.js";
import { useT } from "../i18n.jsx";

// what the user picks -> sort_by + order for the API (labels are translated where shown)
const SORTS = {
  newest: { label: "Навтарин", sort_by: "id", order: "desc" },
  rating: { label: "Беҳтарин", sort_by: "rating", order: "desc" },
  title: { label: "Аз рӯи ном (А–Я)", sort_by: "title", order: "asc" },
  title_desc: { label: "Аз рӯи ном (Я–А)", sort_by: "title", order: "desc" },
  oldest: { label: "Аввал кӯҳнаҳо", sort_by: "id", order: "asc" },
};

const PAGE_SIZE = 24;

export default function Search() {
  const t = useT();
  // filters live in the address (?q=...&category_id=...), so a search can be shared or reloaded
  const [params, setParams] = useSearchParams();
  const [text, setText] = useState(params.get("q") || "");

  const { data: categories } = useApi("/categories");
  const { data: authors } = useApi("/authors");

  const sort = SORTS[params.get("sort")] || SORTS.newest;
  const page = Number(params.get("page")) || 1;

  const query = new URLSearchParams({ sort_by: sort.sort_by, order: sort.order, page, page_size: PAGE_SIZE });
  if (params.get("q")) query.set("search", params.get("q"));
  for (const key of ["category_id", "author_id", "min_rating"]) {
    if (params.get(key)) query.set(key, params.get(key));
  }
  const { data: books, loading } = useApi(`/books?${query}`);

  function setFilter(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page"); // a new filter starts again from page 1
    setParams(next);
  }

  const select = "h-10 px-3 rounded-xl bg-surface-container-high text-label-md outline-none shrink-0";

  return (
    <div className="px-4 md:px-8 pt-3 md:pt-8 pb-8 flex flex-col gap-4 md:gap-6">
      <h1 className="font-serif text-headline-lg-mobile md:text-[36px] md:leading-[44px]">{t("Ҷустуҷӯ")}</h1>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setFilter("q", text.trim());
        }}
        className="flex items-center h-12 md:h-14 max-w-3xl bg-surface-container-high rounded-xl px-3.5 gap-3 focus-within:bg-surface-container-highest"
      >
        <Icon name="search" size={22} className="text-primary" />
        <input value={text} onChange={(e) => setText(e.target.value)} className="w-full bg-transparent outline-none text-body-sm placeholder:text-outline" placeholder={t("Номи асар ё шоир...")} autoFocus />
        {text && (
          <button type="button" onClick={() => { setText(""); setFilter("q", ""); }} aria-label={t("Тоза кардан")}>
            <Icon name="close" size={18} className="text-outline" />
          </button>
        )}
      </form>

      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 md:mx-0 md:px-0 md:flex-wrap">
        <select className={select} value={params.get("category_id") || ""} onChange={(e) => setFilter("category_id", e.target.value)}>
          <option value="">{t("Ҳама жанрҳо")}</option>
          {categories?.map((c) => <option key={c.id} value={c.id}>{t(c.name)}</option>)}
        </select>
        <select className={select} value={params.get("author_id") || ""} onChange={(e) => setFilter("author_id", e.target.value)}>
          <option value="">{t("Ҳама муаллифон")}</option>
          {authors?.map((a) => <option key={a.id} value={a.id}>{t(a.name)}</option>)}
        </select>
        <select className={select} value={params.get("min_rating") || ""} onChange={(e) => setFilter("min_rating", e.target.value)}>
          <option value="">{t("Ҳама баҳоҳо")}</option>
          <option value="4">{t("★ 4 ва болотар")}</option>
          <option value="4.5">{t("★ 4.5 ва болотар")}</option>
        </select>
        <select className={select} value={params.get("sort") || "newest"} onChange={(e) => setFilter("sort", e.target.value)}>
          {Object.entries(SORTS).map(([key, item]) => (
            <option key={key} value={key}>{t(item.label)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : books?.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
          {books.map((book) => (
            <Link key={book.id} to={`/books/${book.id}`} className="flex flex-col gap-2 group">
              <Cover book={book} className="w-full aspect-[3/4] rounded-xl shadow-md group-hover:scale-[1.02] transition-transform" />
              <div className="min-w-0">
                <h4 className="font-serif text-label-lg truncate group-hover:text-primary">{book.title}</h4>
                <p className="text-label-sm text-on-surface-variant truncate">{t(book.author.name)}</p>
                {book.total_duration > 0 && <p className="text-[11px] text-tertiary">{formatDuration(book.total_duration)}</p>}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-on-surface-variant">
          <Icon name="search_off" size={40} />
          <p className="mt-2">{t("Ҳеҷ чиз ёфт нашуд")}</p>
        </div>
      )}

      {/* pages */}
      {(page > 1 || books?.length === PAGE_SIZE) && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button disabled={page === 1} onClick={() => setFilter("page", page - 1)} className="h-10 px-4 rounded-xl bg-surface-container-high disabled:opacity-40">
            {t("← Пеш")}
          </button>
          <span className="text-label-md text-on-surface-variant">{t("Саҳифаи {n}", { n: page })}</span>
          <button disabled={books?.length < PAGE_SIZE} onClick={() => setFilter("page", page + 1)} className="h-10 px-4 rounded-xl bg-surface-container-high disabled:opacity-40">
            {t("Баъд →")}
          </button>
        </div>
      )}
    </div>
  );
}
