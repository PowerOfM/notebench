import { useRef, useState } from 'react';
import { useStore } from '../../store';
import { exportDatabase, importDatabase } from '../../lib/exportImport';
import styles from './SettingsPanel.module.css';

export function SettingsPanel() {
  const settingsPanelOpen = useStore((s) => s.settingsPanelOpen);
  const projectColumns = useStore((s) => s.projectColumns);
  const dailyColumns = useStore((s) => s.dailyColumns);
  const setProjectColumns = useStore((s) => s.setProjectColumns);
  const setDailyColumns = useStore((s) => s.setDailyColumns);
  const setSettingsPanelOpen = useStore((s) => s.setSettingsPanelOpen);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!settingsPanelOpen) return null;

  const handleExport = async () => {
    try {
      await exportDatabase();
    } catch (e) {
      setError('Export failed. Please try again.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingFile(file);
      setError(null);
    }
    // Reset input so selecting the same file again triggers onChange
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (!pendingFile) return;
    setImporting(true);
    setError(null);
    try {
      await importDatabase(pendingFile);
      // importDatabase reloads the page — code below won't run on success
    } catch (e) {
      setError('Import failed. Make sure the file is a valid Notebench export.');
      setImporting(false);
      setPendingFile(null);
    }
  };

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setSettingsPanelOpen(false);
          setPendingFile(null);
          setError(null);
        }
      }}
    >
      <div className={styles.panel} role="dialog" aria-label="Settings">
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>Settings</span>
          <button
            className={styles.closeBtn}
            onClick={() => {
              setSettingsPanelOpen(false);
              setPendingFile(null);
              setError(null);
            }}
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

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Data</div>

          <div className={styles.dataRow}>
            <button className={styles.dataBtn} onClick={handleExport}>
              ↓ Export
            </button>
            <button
              className={styles.dataBtn}
              onClick={() => fileInputRef.current?.click()}
            >
              ↑ Import
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className={styles.hiddenInput}
              onChange={handleFileChange}
            />
          </div>

          {error && <p className={styles.errorMsg}>{error}</p>}
        </div>

        {/* Import confirmation dialog */}
        {pendingFile && (
          <div className={styles.confirmBox}>
            <p className={styles.confirmText}>
              Import <strong>{pendingFile.name}</strong>? This will overwrite all
              existing data and reload the app.
            </p>
            <div className={styles.confirmActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setPendingFile(null)}
                disabled={importing}
              >
                Cancel
              </button>
              <button
                className={styles.confirmBtn}
                onClick={handleConfirmImport}
                disabled={importing}
              >
                {importing ? 'Importing…' : 'Yes, import'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
