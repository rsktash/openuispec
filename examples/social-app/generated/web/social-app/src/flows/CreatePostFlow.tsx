import { useState } from "react";
import { useNavigate } from "react-router";
import { useI18n } from "../i18n";
import { ActionButton, SelectField, TextField } from "../components/ui";
import { Icon } from "../lib/icons";
import { useSizeClass } from "../lib/utils";
import { useAppStore } from "../state/store";

export function CreatePostFlow() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const sizeClass = useSizeClass();
  const state = useAppStore();
  const [body, setBody] = useState("");
  const [media, setMedia] = useState("");
  const [audience, setAudience] = useState("public");

  return (
    <div className="fixed inset-0 z-40 bg-[rgba(28,27,26,0.32)] px-3 pb-3 pt-20 md:px-6">
      <div
        className={`mx-auto max-w-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] shadow-lg ${
          sizeClass === "compact" ? "fixed inset-x-0 bottom-0 rounded-t-[24px] p-5" : "rounded-surface p-6"
        }`}
      >
        {sizeClass === "compact" ? <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-[var(--color-border-strong)]" /> : null}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-tertiary)]">{t("nav.create")}</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">Compose</h2>
          </div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="interactive-press rounded-cap-primary border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-2"
            aria-label="Close"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <TextField
            label={t("create_post.body_placeholder")}
            value={body}
            multiline
            onValueChange={setBody}
            placeholder={t("create_post.body_placeholder")}
            maxLength={4000}
          />
          <SelectField
            label={t("create_post.audience")}
            value={audience}
            options={[
              { value: "public", label: t("create_post.audience_public") },
              { value: "followers", label: t("create_post.audience_followers") },
            ]}
            onValueChange={setAudience}
          />
          <TextField
            label={t("create_post.add_image")}
            value={media}
            onValueChange={setMedia}
            placeholder="Paste an image URL"
          />
          <ActionButton variant="secondary" icon="image" onClick={() => setMedia("https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80")}>
            {t("create_post.add_image")}
          </ActionButton>
          <ActionButton
            variant="primary"
            fullWidth
            onClick={() => {
              if (!body.trim()) {
                return;
              }
              state.createPost({ body: body.trim(), media: media.trim(), audience });
              state.showToast(t("create_post.success"));
              navigate("/home");
            }}
          >
            {t("create_post.publish")}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
