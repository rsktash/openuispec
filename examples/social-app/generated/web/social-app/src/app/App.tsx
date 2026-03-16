import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { I18nProvider } from "../i18n";
import { AppShell } from "../components/Shell";
import { ChatDetailScreen } from "../screens/ChatDetailScreen";
import { DiscoverScreen } from "../screens/DiscoverScreen";
import { EditProfileScreen } from "../screens/EditProfileScreen";
import { HomeFeedScreen } from "../screens/HomeFeedScreen";
import { MessagesInboxScreen } from "../screens/MessagesInboxScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { PostDetailScreen } from "../screens/PostDetailScreen";
import { ProfileSelfScreen } from "../screens/ProfileSelfScreen";
import { ProfileUserScreen } from "../screens/ProfileUserScreen";
import { SearchResultsScreen } from "../screens/SearchResultsScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { CreatePostFlow } from "../flows/CreatePostFlow";
import { useAppStore } from "../state/store";

function ThemeBridge() {
  const theme = useAppStore((state) => state.preferences.theme);
  useEffect(() => {
    const resolvedTheme =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme;
    document.documentElement.dataset.theme = resolvedTheme;
  }, [theme]);
  return null;
}

export function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <ThemeBridge />
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<HomeFeedScreen />} />
            <Route path="/discover" element={<DiscoverScreen />} />
            <Route path="/notifications" element={<NotificationsScreen />} />
            <Route path="/messages" element={<MessagesInboxScreen />} />
            <Route path="/profile" element={<ProfileSelfScreen />} />
            <Route path="/profile/edit" element={<EditProfileScreen />} />
            <Route path="/search" element={<SearchResultsScreen />} />
            <Route path="/posts/:postId" element={<PostDetailScreen />} />
            <Route path="/u/:userId" element={<ProfileUserScreen />} />
            <Route path="/chat/:conversationId" element={<ChatDetailScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="/create" element={<CreatePostFlow />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </I18nProvider>
  );
}
