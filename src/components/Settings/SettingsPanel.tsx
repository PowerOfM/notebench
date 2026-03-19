import { useStore } from '../../store';
import styles from './SettingsPanel.module.css';

export function SettingsPanel() {
  const settingsPanelOpen = useStore((s) => s.settingsPanelOpen);
  const projectColumns = useStore((s) => s.projectColumns);
  const dailyColumns = useStore((s) => s.dailyColumns);
  const setProjectColumns = useStore((s) => s.setProjectColumns);
  const setDailyColumns = useStore((s) => s.setDailyColumns);
  const setSettingsPanelOpen = useStore((s) => s.setSettingsPanelOpen);

  if (!settingsPanelOpen) return null;

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) setSettingsPanelOpen(false);
      }}
    >
      <div className={styles.panel} role="dialog" aria-label="Settings">
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>Settings</span>
          <button
            className={styles.closeBtn}
            onClick={() => setSettingsPanelOpen(false)}
            aria-label="Close settings"
          >
            ×
          </button>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Workbench Layout</div>

          <div className={styles.row}>
            <span className={styles.label}>Project columns</span>
            <div className={styles.sliderGroup}>
              <input
                type="range"
                className={styles.slider}
                min={1}
                max={4}
                value={projectColumns}
                onChange={(e) => setProjectColumns(Number(e.target.value))}
              />
              <span className={styles.sliderValue}>{projectColumns}</span>
            </div>
          </div>

          <div className={styles.row}>
            <span className={styles.label}>Daily note columns</span>
            <div className={styles.sliderGroup}>
              <input
                type="range"
                className={styles.slider}
                min={1}
                max={4}
                value={dailyColumns}
                onChange={(e) => setDailyColumns(Number(e.target.value))}
              />
              <span className={styles.sliderValue}>{dailyColumns}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
