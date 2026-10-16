import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Cover from "../components/Cover.jsx";
import Icon from "../components/Icon.jsx";
import Spinner from "../components/Spinner.jsx";
import { formatDuration } from "../format.js";
import { useApi } from "../hooks.js";

const LANGUAGES = [
  { code: "", name: "Ҳама забонҳо" },
  { code: "tg", name: "Тоҷикӣ" },
  { code: "ru", name: "Русский" },
  { code: "en", name: "English" },
];

export default function Search() {
  // filters live in the address (?q=...&category_id=...), so a search can be shared or reloaded
  const [params, setParams] = useSearchParams();
  const [text, setText] = useState(params.get("q") || "");

  const { data: categories } = useApi("/categories");
  const { data: authors } = useApi("/authors");

  const query = new URLSearchParams({ limit: "50", sort: params.get("sort") || "newest" });
  if (params.get("q")) query.set("search", params.get("q"));
  for (const key of ["category_id", "author_id", "language"]) {
    if (params.get(key)) query.set(key, params.get(key));
  }
  const { data: books, loading } = useApi(`/books?${query}`);

  function setFilter(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  }

  const select = "h-10 px-3 rounded-xl bg-surface-container-high text-label-md outline-none shrink-0";

  return (
    <div className="px-4 pt-3 pb-8 flex flex-col gap-4">
      <h1 className="font-serif text-headline-lg-mobile">Ҷустуҷӯ</h1>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setFilter("q", text.trim());
        }}
        className="flex items-center h-12 bg-surface-container-high rounded-xl px-3.5 gap-3 focus-within:bg-surface-container-highest"
      >
        <Icon name="search" size={22} className="text-primary" />
        <input value={text} onChange={(e) => setText(e.target.value)} className="w-full bg-transparent outline-none text-body-sm placeholder:text-outline" placeholder="Номи асар ё шоир..." autoFocus />
        {text && (
          <button type="button" onClick={() => { setText(""); setFilter("q", ""); }} aria-label="Тоза кардан">
            <Icon name="close" size={18} className="text-outline" />
          </button>
        )}
      </form>

      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
        <select className={select} value={params.get("category_id") || ""} onChange={(e) => setFilter("category_id", e.target.value)}>
          <option value="">Ҳама жанрҳо</option>
          {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className={select} value={params.get("author_id") || ""} onChange={(e) => setFilter("author_id", e.target.value)}>
          <option value="">Ҳама муаллифон</option>
          {authors?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select className={select} value={params.get("language") || ""} onChange={(e) => setFilter("language", e.target.value)}>
          {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
        </select>
        <select className={select} value={params.get("sort") || "newest"} onChange={(e) => setFilter("sort", e.target.value)}>
          <option value="newest">Навтарин</option>
          <option value="rating">Беҳтарин</option>
          <option value="title">Аз рӯи ном</option>
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : books?.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {books.map((book) => (
            <Link key={book.id} to={`/books/${book.id}`} className="flex flex-col gap-2 group">
              <Cover book={book} className="w-full aspect-[3/4] rounded-xl shadow-md group-hover:scale-[1.02] transition-transform" />
              <div className="min-w-0">
                <h4 className="font-serif text-label-lg truncate group-hover:text-primary">{book.title}</h4>
                <p className="text-label-sm text-on-surface-variant truncate">{book.author.name}</p>
                {book.total_duration > 0 && <p className="text-[11px] text-tertiary">{formatDuration(book.total_duration)}</p>}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-on-surface-variant">
          <Icon name="search_off" size={40} />
          <p className="mt-2">Ҳеҷ чиз ёфт нашуд</p>
        </div>
      )}
    </div>
  );
}
