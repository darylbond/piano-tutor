import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSettings } from "@/store/settings";
import { loadCatalog } from "@/library/catalog";
import type { SongMeta } from "@/engine/types";
import "./SettingsScreen.css";

export function SettingsScreen() {
  const volume = useSettings((s) => s.volume);
  const setVolume = useSettings((s) => s.setVolume);
  const showKeyLabels = useSettings((s) => s.showKeyLabels);
  const toggleKeyLabels = useSettings((s) => s.toggleKeyLabels);
  const micSensitivity = useSettings((s) => s.micSensitivity);
  const setMicSensitivity = useSettings((s) => s.setMicSensitivity);

  const [attributions, setAttributions] = useState<SongMeta[]>([]);
  useEffect(() => {
    loadCatalog().then(setAttributions).catch(() => setAttributions([]));
  }, []);

  return (
    <div className="settings">
      <h2 className="settings__heading">Settings ⚙️</h2>

      <section className="settings__group">
        <h3>Sound & Keys</h3>
        <label className="settings__row">
          <span>Volume</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
          />
        </label>
        <label className="settings__row settings__row--switch">
          <span>Show letters on keys</span>
          <input
            type="checkbox"
            checked={showKeyLabels}
            onChange={toggleKeyLabels}
          />
        </label>
      </section>

      <section className="settings__group">
        <h3>Microphone</h3>
        <label className="settings__row">
          <span>Sensitivity</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={micSensitivity}
            onChange={(e) => setMicSensitivity(Number(e.target.value))}
          />
        </label>
        <p className="settings__hint">
          If the app misses quiet notes, slide right. If one press counts twice,
          slide left.
        </p>
      </section>

      <section className="settings__group settings__parent">
        <h3>For grown-ups</h3>
        <p>
          <strong>Privacy:</strong> Piano Tutor has no accounts and no servers.
          Microphone sound is analysed on this device in real time and is{" "}
          <strong>never recorded or uploaded</strong>. All progress stays in this
          browser.
        </p>
        <p>
          Manage or move your child's stars on the{" "}
          <Link to="/progress">Progress page</Link>.
        </p>

        <details className="settings__credits">
          <summary>Music credits & licenses</summary>
          <ul>
            {attributions.map((s) => (
              <li key={s.id}>
                <strong>{s.title}</strong> — {s.attribution}
              </li>
            ))}
          </ul>
        </details>
        <p className="settings__foot">
          Made with ♥ as free software (MIT). Music is public domain or openly
          licensed.
        </p>
      </section>
    </div>
  );
}
