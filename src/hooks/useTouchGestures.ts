import { useEffect, useRef, useCallback } from 'react';

interface TouchGestureOptions {
  onPinchZoom: (scale: number, centerX: number, centerY: number) => void;
  onPan: (deltaX: number, deltaY: number) => void;
  enabled?: boolean;
}

interface TouchState {
  initialDistance: number;
  initialScale: number;
  lastCenterX: number;
  lastCenterY: number;
  isPinching: boolean;
  isPanning: boolean;
  lastTouchX: number;
  lastTouchY: number;
}

function getDistance(touch1: Touch, touch2: Touch): number {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getCenter(touch1: Touch, touch2: Touch): { x: number; y: number } {
  return {
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2,
  };
}

export function useTouchGestures(
  elementRef: React.RefObject<HTMLElement | null>,
  { onPinchZoom, onPan, enabled = true }: TouchGestureOptions
) {
  const touchState = useRef<TouchState>({
    initialDistance: 0,
    initialScale: 1,
    lastCenterX: 0,
    lastCenterY: 0,
    isPinching: false,
    isPanning: false,
    lastTouchX: 0,
    lastTouchY: 0,
  });

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;

    if (e.touches.length === 2) {
      // Two-finger gesture (pinch or pan)
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = getDistance(touch1, touch2);
      const center = getCenter(touch1, touch2);

      touchState.current = {
        ...touchState.current,
        initialDistance: distance,
        initialScale: 1,
        lastCenterX: center.x,
        lastCenterY: center.y,
        isPinching: true,
        isPanning: true,
      };
    } else if (e.touches.length === 1) {
      // Single finger - could be panning on element
      touchState.current = {
        ...touchState.current,
        lastTouchX: e.touches[0].clientX,
        lastTouchY: e.touches[0].clientY,
        isPanning: false,
      };
    }
  }, [enabled]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled) return;

    if (e.touches.length === 2 && touchState.current.isPinching) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = getDistance(touch1, touch2);
      const center = getCenter(touch1, touch2);

      // Calculate pinch scale
      const scale = distance / touchState.current.initialDistance;
      onPinchZoom(scale, center.x, center.y);

      // Calculate pan delta from center movement
      const deltaX = center.x - touchState.current.lastCenterX;
      const deltaY = center.y - touchState.current.lastCenterY;
      
      if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
        onPan(deltaX, deltaY);
      }

      touchState.current.lastCenterX = center.x;
      touchState.current.lastCenterY = center.y;
    }
  }, [enabled, onPinchZoom, onPan]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (e.touches.length < 2) {
      touchState.current.isPinching = false;
    }
    if (e.touches.length === 0) {
      touchState.current.isPanning = false;
    }
  }, []);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !enabled) return;

    // Use passive: false to allow preventDefault
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [elementRef, enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    isPinching: touchState.current.isPinching,
    isPanning: touchState.current.isPanning,
  };
}
