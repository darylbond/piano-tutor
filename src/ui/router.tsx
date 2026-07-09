import { createHashRouter } from "react-router-dom";
import { AppShell } from "@/ui/AppShell";
import { HomeScreen } from "@/ui/routes/HomeScreen";
import { LibraryScreen } from "@/ui/routes/LibraryScreen";
import { PlayScreen } from "@/ui/routes/PlayScreen";
import { LearnScreen } from "@/ui/routes/LearnScreen";
import { PracticeScreen } from "@/ui/routes/PracticeScreen";
import { ProgressScreen } from "@/ui/routes/ProgressScreen";
import { SettingsScreen } from "@/ui/routes/SettingsScreen";
import { CalibrateScreen } from "@/ui/routes/CalibrateScreen";
import { NotFoundScreen } from "@/ui/routes/NotFoundScreen";

// HashRouter is deliberate: GitHub Pages has no server-side rewrite, so a
// BrowserRouter would 404 on deep links / refreshes. Hash routing is bulletproof
// for a static host.
export const router = createHashRouter([
  {
    path: "/",
    element: <AppShell />,
    errorElement: <AppShell />,
    children: [
      { index: true, element: <HomeScreen /> },
      { path: "library", element: <LibraryScreen /> },
      { path: "play/:songId", element: <PlayScreen /> },
      { path: "learn", element: <LearnScreen /> },
      { path: "practice", element: <PracticeScreen /> },
      { path: "progress", element: <ProgressScreen /> },
      { path: "settings", element: <SettingsScreen /> },
      { path: "calibrate", element: <CalibrateScreen /> },
      { path: "*", element: <NotFoundScreen /> },
    ],
  },
]);
