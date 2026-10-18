import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "./api.js";
import { useAuth } from "./auth.jsx";
import { LANGUAGES, setCurrentLanguage, translate } from "./translations.js";

// The language of the site (buttons, menus, messages). Books themselves stay in Tajik.
// Remembered in this browser; a logged-in user also has it in the account (preferred_language),
// so after logging in on another device the site opens in the same language.
const LanguageContext = createContext(null);

function startLanguage() {
  try {
    const saved = localStorage.getItem("language");
    if (LANGUAGES.some((item) => item.code === saved)) return saved;
  } catch {
    // storage blocked
  }
  return "tg";
}

function remember(language) {
  try {
    localStorage.setItem("language", language);
  } catch {
    // not remembered, fine
  }
}

export function LanguageProvider({ children }) {
  const { user, setUser } = useAuth();
  const [language, setLanguageState] = useState(startLanguage);
  setCurrentLanguage(language); // before the pages draw, so formatDuration() etc. already use it

  // logging in: take the language saved in the account (once per login, not on every user update)
  const loggedInAs = useRef(null);
  useEffect(() => {
    if (!user) {
      loggedInAs.current = null;
      return;
    }
    if (loggedInAs.current === user.id) return;
    loggedInAs.current = user.id;
    if (user.preferred_language && user.preferred_language !== language) {
      setLanguageState(user.preferred_language);
      remember(user.preferred_language);
    }
  }, [user, language]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  function setLanguage(code) {
    setLanguageState(code);
    remember(code);
    if (user && user.preferred_language !== code) {
      api.patch("/me", { preferred_language: code }).then(setUser).catch(() => {});
    }
  }

  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

// const t = useT();  t("Гӯш кардан")  t("{n} китоб", { n: 3 })
export function useT() {
  const { language } = useContext(LanguageContext);
  return useCallback((text, values) => translate(text, values, language), [language]);
}
