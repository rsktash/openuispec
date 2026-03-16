import { useNavigate } from "react-router";
import { useI18n } from "../i18n";
import { ActionButton, ScreenScaffold, SectionTitle, SelectField, ToggleField } from "../components/ui";
import { useAppStore } from "../state/store";

export function SettingsScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const state = useAppStore();

  return (
    <ScreenScaffold title="Settings" subtitle="Theme select, toggles, and a confirmation dialog for logout.">
      <section className="space-y-4">
        <SectionTitle>{t("settings.appearance")}</SectionTitle>
        <SelectField
          label={t("settings.theme")}
          value={state.preferences.theme}
          options={[
            { value: "system", label: t("settings.theme_system") },
            { value: "light", label: t("settings.theme_light") },
            { value: "dark", label: t("settings.theme_dark") },
          ]}
          onValueChange={(value) => state.updatePreference("theme", value as "system" | "light" | "dark")}
        />
      </section>

      <section className="space-y-4">
        <SectionTitle>{t("settings.notifications")}</SectionTitle>
        <ToggleField
          label={t("settings.push_notifications")}
          checked={state.preferences.pushNotifications}
          onChange={(value) => state.updatePreference("pushNotifications", value)}
        />
        <ToggleField
          label={t("settings.message_previews")}
          checked={state.preferences.messagePreviews}
          onChange={(value) => state.updatePreference("messagePreviews", value)}
        />
      </section>

      <section className="space-y-4">
        <SectionTitle>{t("settings.language")}</SectionTitle>
        <ToggleField
          label={t("settings.auto_translate")}
          checked={state.preferences.autoTranslate}
          onChange={(value) => state.updatePreference("autoTranslate", value)}
        />
      </section>

      <section className="space-y-4">
        <SectionTitle>{t("settings.account")}</SectionTitle>
        <ActionButton variant="secondary" icon="edit" onClick={() => navigate("/profile/edit")}>
          {t("settings.edit_profile")}
        </ActionButton>
        <ActionButton
          variant="destructive"
          onClick={() =>
            state.openDialog({
              title: t("settings.logout"),
              message: t("settings.logout_confirm"),
              actions: [
                { label: t("common.cancel"), variant: "secondary", onPress: () => undefined },
                {
                  label: t("settings.logout"),
                  variant: "destructive",
                  onPress: () => state.logout(),
                },
              ],
            })
          }
        >
          {t("settings.logout")}
        </ActionButton>
      </section>
    </ScreenScaffold>
  );
}
