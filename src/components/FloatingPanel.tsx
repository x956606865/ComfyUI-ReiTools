import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FloatingPanelProps } from '@/types';
import './FloatingPanel.css';

export const FloatingPanel: React.FC<FloatingPanelProps> = ({
  title = '工具面板',
  visible = true,
  position = { x: 100, y: 100 },
  size = { width: 400, height: 300 },
  onClose,
  onMove,
  onResize,
  children,
  className = '',
  zIndex = 1000,
}) => {
  const [currentPosition, setCurrentPosition] = useState(position);
  const [currentSize, setCurrentSize] = useState(size);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const panelRef = useRef<HTMLDivElement>(null);

  // 拖拽处理
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (
        e.target === e.currentTarget ||
        (e.target as Element).classList.contains('floating-panel-header')
      ) {
        setIsDragging(true);
        setDragStart({
          x: e.clientX - currentPosition.x,
          y: e.clientY - currentPosition.y,
        });
        e.preventDefault();
      }
    },
    [currentPosition]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        const newPosition = {
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        };
        setCurrentPosition(newPosition);
        onMove?.(newPosition);
      }
    },
    [isDragging, dragStart, onMove]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  // 调整大小处理
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleResizeMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isResizing && panelRef.current) {
        const rect = panelRef.current.getBoundingClientRect();
        const newSize = {
          width: Math.max(200, e.clientX - rect.left),
          height: Math.max(150, e.clientY - rect.top),
        };
        setCurrentSize(newSize);
        onResize?.(newSize);
      }
    },
    [isResizing, onResize]
  );

  // 事件监听器
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousemove', handleResizeMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    isDragging,
    isResizing,
    handleMouseMove,
    handleResizeMouseMove,
    handleMouseUp,
  ]);

  if (!visible) return null;

  return (
    <div
      ref={panelRef}
      className={`floating-panel ${className}`}
      style={{
        position: 'fixed',
        left: currentPosition.x,
        top: currentPosition.y,
        width: currentSize.width,
        height: currentSize.height,
        zIndex,
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="floating-panel-header">
        <span className="floating-panel-title">{title}</span>
        {onClose && (
          <button
            className="floating-panel-close"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        )}
      </div>

      <div className="floating-panel-content">{children}</div>

      <div
        className="floating-panel-resize-handle"
        onMouseDown={handleResizeMouseDown}
      />
    </div>
  );
};
