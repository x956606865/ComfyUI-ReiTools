import React from 'react';
import './ReiToolsPanel.css';
export interface ReiToolsPanelProps {
    visible?: boolean;
    onClose?: () => void;
}
export declare const ReiToolsPanel: React.FC<ReiToolsPanelProps>;
