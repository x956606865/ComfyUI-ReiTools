import React from 'react';
import './FileSelector.css';
interface FileSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (path: string, type: 'file' | 'directory') => void;
    mode: 'file' | 'directory' | 'both';
    title?: string;
    allowedExtensions?: string[];
}
declare const FileSelector: React.FC<FileSelectorProps>;
export default FileSelector;
