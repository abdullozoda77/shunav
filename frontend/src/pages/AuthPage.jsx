import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import Icon from "../components/Icon.jsx";

// Login and register share one page. mode = "login" | "register"
export default function AuthPage({ mode }) {
  const isRegister = mode === "register";
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "", preferred_language: "tg" });
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  function change(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSending(true);
    try {
      if (isRegister) await register(form);
      else await login(form.username, form.password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  const input = "w-full h-12 px-4 rounded-xl bg-surface-container-high text-on-surface placeholder:text-outline outline-none focus:ring-2 focus:ring-primary";

  return (
    <main className="min-h-screen flex flex-col justify-center px-4 py-10 pt-safe bg-[radial-gradient(circle_at_50%_0%,rgba(255,192,65,0.12),transparent_60%)]">
      <form onSubmit={submit} className="w-full max-w-sm mx-auto flex flex-col gap-3">
        <Link to="/welcome" className="self-center flex items-center gap-2 mb-4">
          <Icon name="auto_stories" filled size={30} className="text-primary" />
          <span className="font-serif text-headline-md text-primary">Шунав</span>
        </Link>
        <h1 className="font-serif text-headline-lg-mobile text-center">{isRegister ? "Сабти ном" : "Ворид шудан"}</h1>
        <p className="text-body-sm text-on-surface-variant text-center mb-3">
          {isRegister ? "Ҳисоб созед, то аз ҳамон ҷое давом диҳед, ки қатъ кардед." : "Хуш омадед! Китобҳои шумо интизоранд."}
        </p>

        {isRegister && <input className={input} name="name" placeholder="Ном" value={form.name} onChange={change} required />}
        <input className={input} name="username" placeholder="Номи корбар (username)" value={form.username} onChange={change} required autoComplete="username" />
        {isRegister && <input className={input} name="email" type="email" placeholder="Email" value={form.email} onChange={change} required />}
        <input className={input} name="password" type="password" placeholder="Парол" value={form.password} onChange={change} required minLength={isRegister ? 6 : undefined} autoComplete={isRegister ? "new-password" : "current-password"} />
        {isRegister && (
          <select className={input} name="preferred_language" value={form.preferred_language} onChange={change}>
            <option value="tg">Тоҷикӣ</option>
            <option value="ru">Русский</option>
            <option value="en">English</option>
          </select>
        )}

        {error && <p className="text-error text-body-sm">{error}</p>}

        <button disabled={sending} className="h-12 mt-2 bg-primary text-on-primary text-label-lg rounded-xl shadow-lg hover:bg-primary-container disabled:opacity-60">
          {sending ? "..." : isRegister ? "Сабти ном" : "Ворид шудан"}
        </button>

        <p className="text-center text-body-sm text-on-surface-variant mt-2">
          {isRegister ? "Аллакай ҳисоб доред? " : "Ҳисоб надоред? "}
          <Link to={isRegister ? "/login" : "/register"} className="text-secondary hover:underline">
            {isRegister ? "Ворид шавед" : "Сабти ном кунед"}
          </Link>
        </p>
      </form>
    </main>
  );
}
