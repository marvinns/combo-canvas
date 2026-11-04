import { useReducedMotion } from '@/hooks/useReducedMotion';
import { forwardRef, useEffect, useImperativeHandle, type HTMLAttributes } from 'react';
import { motion, useAnimation, type Variants } from 'motion/react';

export interface EquipIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface EquipIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const LEFT_VARIANTS: Variants = {
  normal: { x: 0 },
  animate: { x: [0, -0.7, 0.3, 0], transition: { duration: 0.6, times: [0, 0.4, 0.75, 1], ease: 'easeInOut', repeat: Infinity, repeatDelay: 1 } },
};
const RIGHT_VARIANTS: Variants = {
  normal: { x: 0 },
  animate: { x: [0, 0.7, -0.3, 0], transition: { duration: 0.6, times: [0, 0.4, 0.75, 1], ease: 'easeInOut', repeat: Infinity, repeatDelay: 1 } },
};

export const EquipIcon = forwardRef<EquipIconHandle, EquipIconProps>(
  ({ className, size = 28, ...props }, ref) => {
    const controls = useAnimation();
    const reducedMotion = useReducedMotion();
    useEffect(() => {
      void controls.start(reducedMotion ? 'normal' : 'animate');
      return () => controls.stop();
    }, [controls, reducedMotion]);
    useImperativeHandle(ref, () => {
      return {
        startAnimation: () => { void controls.start(reducedMotion ? 'normal' : 'animate'); },
        stopAnimation: () => { void controls.start('normal'); },
      };
    }, [controls, reducedMotion]);

    return (
      <div className={className} {...props}>
        <svg aria-label="Equip" role="img" fill="none" width={size} height={size} style={{ width: '100%', height: '100%' }} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
          <motion.g initial="normal" animate={controls} variants={LEFT_VARIANTS}>
            <path d="M9 17H7A5 5 0 0 1 7 7h2" />
            <line x1="8" x2="12" y1="12" y2="12" />
          </motion.g>
          <motion.g initial="normal" animate={controls} variants={RIGHT_VARIANTS}>
            <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
            <line x1="16" x2="12" y1="12" y2="12" />
          </motion.g>
        </svg>
      </div>
    );
  },
);
EquipIcon.displayName = 'EquipIcon';
