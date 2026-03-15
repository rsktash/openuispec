import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { t, priorityLabel } from "../i18n";
import { useAppStore } from "../store";
import { Avatar, Field, SwitchRow } from "../components/Common";

export function CalendarScreen() {
  return (
    <section className="screen">
      <div className="empty-card">
        <p className="eyebrow">{t("nav.calendar")}</p>
        <h1>{t("calendar.title")}</h1>
        <p>{t("calendar.coming_soon")}</p>
      </div>
    </section>
  );
}

export function SettingsScreen() {
  const user = useAppStore((state) => state.user);
  const preferences = useAppStore((state) => state.preferences);
  const updatePreferences = useAppStore((state) => state.updatePreferences);
  const setTheme = useAppStore((state) => state.setTheme);
  const navigate = useNavigate();

  return (
    <section className="screen">
      <header className="screen-header">
        <div>
          <p className="eyebrow">{t("nav.settings")}</p>
          <h1>{t("settings.preferences")}</h1>
        </div>
      </header>

      <button className="profile-card" onClick={() => navigate("/profile")}>
        <Avatar name={user.name} />
        <div>
          <strong>{user.name}</strong>
          <p>{user.email}</p>
        </div>
      </button>

      <div className="settings-card">
        <p className="section-tag">{t("settings.preferences")}</p>
        <Field label={t("settings.theme")}>
          <select value={preferences.theme} onChange={(event) => setTheme(event.target.value as typeof preferences.theme)}>
            <option value="system">{t("settings.theme_system")}</option>
            <option value="light">{t("settings.theme_light")}</option>
            <option value="dark">{t("settings.theme_dark")}</option>
            <option value="warm">{t("settings.theme_warm")}</option>
          </select>
        </Field>
        <Field label={t("settings.default_priority")}>
          <select
            value={preferences.defaultPriority}
            onChange={(event) => updatePreferences({ defaultPriority: event.target.value as typeof preferences.defaultPriority })}
          >
            <option value="low">{priorityLabel("low")}</option>
            <option value="medium">{priorityLabel("medium")}</option>
            <option value="high">{priorityLabel("high")}</option>
            <option value="urgent">{priorityLabel("urgent")}</option>
          </select>
        </Field>
        <SwitchRow
          label={t("settings.notifications")}
          value={preferences.notificationsEnabled}
          onChange={(value) => updatePreferences({ notificationsEnabled: value })}
        />
        <SwitchRow
          label={t("settings.reminders")}
          helper={t("settings.reminders_helper")}
          value={preferences.remindersEnabled}
          onChange={(value) => updatePreferences({ remindersEnabled: value })}
        />
      </div>

      <div className="settings-card">
        <p className="section-tag">{t("settings.data")}</p>
        <button className="secondary-button wide">{t("settings.export")}</button>
        <button className="danger-button wide" onClick={() => window.alert(t("settings.delete_title"))}>
          {t("settings.delete_account")}
        </button>
      </div>

      <div className="footnote">
        <span>{t("settings.app_version")}</span>
        <span>{t("settings.app_credit")}</span>
      </div>
    </section>
  );
}

export function ProfileScreen() {
  const user = useAppStore((state) => state.user);
  const updateProfile = useAppStore((state) => state.updateProfile);
  const navigate = useNavigate();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);

  return (
    <section className="screen">
      <div className="settings-card">
        <div className="profile-hero">
          <Avatar name={user.name} large />
          <div>
            <h1>{user.name}</h1>
            <p>{user.email}</p>
          </div>
        </div>

        <Field label={t("profile.field_name")}>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label={t("profile.field_email")}>
          <input value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <div className="action-row">
          <button className="secondary-button" onClick={() => navigate("/settings")}>{t("common.cancel")}</button>
          <button
            className="primary-button"
            onClick={() => {
              updateProfile({ name, email });
              navigate("/settings");
            }}
          >
            {t("profile.save")}
          </button>
        </div>
      </div>
    </section>
  );
}
