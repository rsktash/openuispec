import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
} from "react";
import en from "./locales/en.json";
import ru from "./locales/ru.json";
import uz from "./locales/uz.json";
import { useAppStore } from "./state/store";
import type { LocaleCode } from "./lib/tokens";

type Messages = Record<string, string>;

const bundles: Record<LocaleCode, Messages> = {
  en,
  ru,
  uz,
};

type I18nValue = {
  locale: LocaleCode;
  direction: "ltr" | "rtl";
  t: (key: string) => string;
  setLocale: (locale: LocaleCode) => void;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: PropsWithChildren) {
  const locale = useAppStore((state) => state.locale);
  const setLocale = useAppStore((state) => state.setLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = (bundles[locale].$direction as "ltr" | "rtl") ?? "ltr";
  }, [locale]);

  const value = useMemo<I18nValue>(() => {
    const messages = bundles[locale] ?? bundles.en;
    return {
      locale,
      direction: (messages.$direction as "ltr" | "rtl") ?? "ltr",
      t: (key: string) => messages[key] ?? bundles.en[key] ?? key,
      setLocale,
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}
