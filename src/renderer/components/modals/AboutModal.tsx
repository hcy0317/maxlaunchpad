import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';

import { APP_DESCRIPTION, APP_NAME } from '../../../shared/constants';
import { getI18n } from '../../i18n';
import { useAppState, useDispatch } from '../../state/store';
import { Modal } from '../common/Modal';

interface AppInfo {
  name: string;
  version: string;
  gitCommitId: string;
}

export function AboutModal(): ReactElement {
  const state = useAppState();
  const dispatch = useDispatch();
  const i18n = getI18n(state.settings?.language);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    window.electronAPI.getAppInfo().then(setAppInfo);
  }, []);

  return (
    <Modal title={`${i18n.about.title} ${APP_NAME}`} width={350}>
      {appInfo ? (
        <div>
          <div className="modal-row">
            <label>{i18n.about.application}</label>
            <span>{appInfo.name}</span>
          </div>

          <div className="modal-row">
            <label>{i18n.about.version}</label>
            <span>{appInfo.version}</span>
          </div>

          <div className="modal-row">
            <label>{i18n.about.gitCommit}</label>
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '0.9em',
                backgroundColor: 'var(--selected-background-color)',
                padding: '2px 6px',
                borderRadius: '3px',
              }}
            >
              {appInfo.gitCommitId}
            </span>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            fontSize: '1.2em',
            color: 'var(--text-color)',
          }}
        >
          {i18n.common.loading}
        </div>
      )}

      <div
        style={{
          margin: '20px 0',
          padding: '10px',
          backgroundColor: 'var(--selected-background-color)',
          borderRadius: '4px',
          fontSize: '0.9em',
          lineHeight: '1.5',
        }}
      >
        <p style={{ margin: 0 }}>{APP_DESCRIPTION}</p>
      </div>

      <div className="modal-actions">
        <button onClick={() => dispatch({ type: 'CLOSE_MODAL' })}>{i18n.common.close}</button>
      </div>
    </Modal>
  );
}
