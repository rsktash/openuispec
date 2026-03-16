import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useI18n } from "../i18n";
import { Avatar } from "../components/ui";
import { ActionButton, ScreenScaffold, Surface, TextField } from "../components/ui";
import { selectCurrentUser, useAppStore } from "../state/store";

export function EditProfileScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const state = useAppStore();
  const user = selectCurrentUser(state);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [handle, setHandle] = useState(user.handle);
  const [bio, setBio] = useState(user.bio ?? "");
  const [website, setWebsite] = useState(user.website ?? "");

  useEffect(() => {
    setDisplayName(user.displayName);
    setHandle(user.handle);
    setBio(user.bio ?? "");
    setWebsite(user.website ?? "");
  }, [user]);

  return (
    <ScreenScaffold title="Edit Profile" subtitle="Profile photo card, text fields, and save toast.">
      <Surface className="p-6">
        <div className="flex items-center gap-4">
          <Avatar src={user.avatarUrl} name={user.displayName} size="lg" />
          <div>
            <p className="text-sm text-[var(--color-text-secondary)]">{t("edit_profile.avatar")}</p>
            <p className="mt-1 font-semibold text-[var(--color-text-primary)]">{user.displayName}</p>
          </div>
        </div>
      </Surface>

      <div className="space-y-4">
        <TextField label={t("edit_profile.display_name")} value={displayName} onValueChange={setDisplayName} />
        <TextField label={t("edit_profile.handle")} value={handle} onValueChange={setHandle} />
        <TextField label={t("edit_profile.bio")} value={bio} multiline onValueChange={setBio} maxLength={160} />
        <TextField label={t("edit_profile.website")} value={website} onValueChange={setWebsite} type="url" />
      </div>

      <ActionButton
        variant="primary"
        fullWidth
        onClick={() => {
          state.updateProfile({ displayName, handle, bio, website });
          state.showToast(t("edit_profile.saved"));
          navigate("/profile");
        }}
      >
        {t("edit_profile.save")}
      </ActionButton>
    </ScreenScaffold>
  );
}
