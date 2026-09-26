import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { translations } from "@/i18n/translations";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
    const [language, setLanguage] = useState(() => window.localStorage.getItem("gem_language") || "en");

    useEffect(() => {
        window.localStorage.setItem("gem_language", language);
        document.documentElement.lang = language;
    }, [language]);

    const value = useMemo(() => {
        const dict = translations[language] || translations.en;
        return {
            language,
            setLanguage,
            toggleLanguage: () => setLanguage(prev => (prev === "en" ? "hi" : "en")),
            t: key => dict[key] ?? translations.en[key] ?? key,
        };
    }, [language]);

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
    return ctx;
}