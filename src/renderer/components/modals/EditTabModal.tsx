import React, { useState } from 'react';

import { getI18n } from '../../i18n';
import { selectTabLabel } from '../../state/selectors';
import { useAppState, useDispatch } from '../../state/store';
import { Modal } from '../common/Modal';

interface EditTabModalProps {
  tabId: string;
}

export function EditTabModal({ tabId }: EditTabModalProps) {
  const state = useAppState();
  const dispatch = useDispatch();
  const i18n = getI18n(state.settings?.language);

  const currentLabel = selectTabLabel(state, tabId) ?? '';
  const [label, setLabel] = useState(currentLabel);

  const handleSave = () => {
    dispatch({ type: 'UPDATE_TAB', tabId, label: label.trim() });
    dispatch({ type: 'CLOSE_MODAL' });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <Modal title={`${i18n.editTab.title}: ${tabId}`} width={400}>
      <div className="modal-row">
        <label>{i18n.editTab.tabLabel}</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={i18n.editTab.tabLabelPlaceholder}
          autoFocus
        />
      </div>

      <div className="modal-actions">
        <button onClick={handleSave}>{i18n.common.save}</button>
        <button onClick={() => dispatch({ type: 'CLOSE_MODAL' })}>{i18n.common.cancel}</button>
      </div>
    </Modal>
  );
}
