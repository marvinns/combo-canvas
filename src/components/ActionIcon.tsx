/* eslint-disable react-refresh/only-export-components */
import type { ComboAction } from '@/lib/comboParser';
import { Skull, Search, RotateCcw, Play, LocateFixed } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, useAnimation, useReducedMotion } from 'motion/react';
import React from 'react';

type IconComponentProps = {
  className?: string;
};

export const PENDULUM_GRADIENT_BG_CLASS = 'bg-gradient-to-r from-red-500/15 to-blue-500/15';
export const PENDULUM_GRADIENT_BORDER_CLASS = 'border-fuchsia-400/40';
export const CHAIN_LINK_TEXT_CLASS = 'text-orange-400';
export const CHAIN_LINK_BG_CLASS = 'bg-orange-400/10';
export const CHAIN_LINK_BORDER_CLASS = 'border-orange-400/30';
export const PHASE_TEXT_CLASS = 'text-cyan-300';
export const PHASE_BG_CLASS = 'bg-cyan-300/10';
export const PHASE_BORDER_CLASS = 'border-cyan-300/30';

type LordIconProps = React.HTMLAttributes<HTMLElement> & {
  src: string;
  trigger?: string;
  delay?: string;
  state?: string;
  colors?: string;
};

type AnimatedIconsProps = React.HTMLAttributes<HTMLElement> & {
  src: string;
  trigger?: string;
  attributes?: string;
  height?: string;
  width?: string;
};

function LordIcon(props: LordIconProps) {
  return React.createElement('lord-icon', props);
}

function AnimatedIcons(props: AnimatedIconsProps) {
  return React.createElement('animated-icons', props);
}

// Custom lordi icon component for link action
const LinkSummonIcon = ({ className }: IconComponentProps) => (
  <div className={className} style={{ display: 'contents' }}>
    <LordIcon
      src="https://cdn.lordicon.com/fhlrrido.json"
      trigger="loop"
      delay="2000"
      colors="primary:#60a5fa"
      style={{ width: '28px', height: '28px' }}
    />
  </div>
);

const ActivateIcon = ({ className }: IconComponentProps) => (
  <div className={className} style={{ display: 'contents' }}>
    <LordIcon
      src="https://cdn.lordicon.com/apgkpdeb.json"
      trigger="loop"
      delay="2000"
      colors="primary:#fde047"
      style={{ width: '28px', height: '28px' }}
    />
  </div>
);

const SynchroIcon = ({ className }: IconComponentProps) => (
  <div className={className} style={{ display: 'contents' }}>
    <LordIcon
      src="https://cdn.lordicon.com/laducuyh.json"
      trigger="loop"
      delay="1500"
      state="in-reveal"
      colors="primary:#ffffff"
      style={{ width: '28px', height: '28px' }}
    />
  </div>
);

const SetIcon = ({ className }: IconComponentProps) => (
  <div className={className} style={{ display: 'contents' }}>
    <LordIcon
      src="https://cdn.lordicon.com/jarmuava.json"
      trigger="loop"
      delay="2000"
      state="hover-slide"
      colors="primary:#7dd3fc"
      style={{ width: '28px', height: '28px', transform: 'rotate(90deg)' }}
    />
  </div>
);

const DrawIcon = ({ className }: IconComponentProps) => (
  <div className={className} style={{ display: 'contents' }}>
    <LordIcon
      src="https://cdn.lordicon.com/wjogzler.json"
      trigger="loop"
      delay="1500"
      state="in-play"
      colors="primary:#4ade80"
      style={{ width: '28px', height: '28px' }}
    />
  </div>
);

const RevealIcon = ({ className }: IconComponentProps) => {
  const controls = useAnimation();
  const reduced = useReducedMotion();

  React.useEffect(() => {
    controls.start(reduced ? 'normal' : 'animate');
  }, [controls, reduced]);

  const frame = {
    normal: { opacity: 1 },
    animate: {
      opacity: [1, 0.65, 1],
      transition: {
        duration: 0.8,
        ease: 'easeInOut',
        repeat: Infinity,
      },
    },
  };

  const scanLine = {
    normal: { y: 0, opacity: 1 },
    animate: {
      y: [-6, 6, -6],
      opacity: [0.4, 1, 0.4],
      transition: {
        duration: 1,
        ease: 'easeInOut',
        repeat: Infinity,
      },
    },
  };

  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      initial="normal"
      animate={controls}
    >
      <motion.path d="M3 7V5a2 2 0 0 1 2-2h2" variants={frame} />
      <motion.path d="M17 3h2a2 2 0 0 1 2 2v2" variants={frame} />
      <motion.path d="M21 17v2a2 2 0 0 1-2 2h-2" variants={frame} />
      <motion.path d="M7 21H5a2 2 0 0 1-2-2v-2" variants={frame} />
      <motion.path d="M7 12h10" variants={scanLine} />
    </motion.svg>
  );
};

const RitualIcon = ({ className }: IconComponentProps) => (
  <div className={className} style={{ display: 'contents' }}>
    <LordIcon
      src="https://cdn.lordicon.com/wpequvda.json"
      trigger="loop"
      delay="2000"
      colors="primary:#1d4ed8"
      style={{ width: '28px', height: '28px' }}
    />
  </div>
);

const TributeIcon = ({ className }: IconComponentProps) => {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className="inline-flex items-center justify-center"
      animate={
        reduced
          ? { scale: 1, y: 0, rotate: 0 }
          : {
              scale: [1, 1.05, 1.02, 1],
              y: [0, -2, -1, 0],
              rotate: [0, -2, 1, 0],
            }
      }
      transition={
        reduced
          ? undefined
          : {
              duration: 1.3,
              ease: 'easeInOut',
              repeat: Infinity,
              repeatDelay: 0.4,
            }
      }
    >
      <motion.svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn('h-5 w-5', className)}
      >
        <motion.path
          d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"
          animate={
            reduced
              ? { strokeDashoffset: 0 }
              : { strokeDashoffset: [0, -40, 0] }
          }
          transition={
            reduced
              ? undefined
              : {
                  duration: 1.04,
                  ease: 'linear',
                  repeat: Infinity,
                  repeatDelay: 0.66,
                }
          }
          style={{
            strokeDasharray: 120,
            transformOrigin: '12px 18px',
          }}
        />
      </motion.svg>
    </motion.div>
  );
};

const DetachIcon = ({ className }: IconComponentProps) => {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className="inline-flex items-center justify-center"
      animate={
        reduced
          ? { x: 0 }
          : {
              x: [0, -3, 0],
            }
      }
      transition={
        reduced
          ? undefined
          : {
              duration: 0.6,
              ease: 'easeInOut',
              repeat: Infinity,
              repeatDelay: 0.4,
            }
      }
    >
      <motion.svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn('h-5 w-5 -scale-x-100', className)}
      >
        <motion.path
          d="m12 17-5-5 5-5"
          animate={
            reduced
              ? { x: 0 }
              : { x: [0, -3, 0] }
          }
          transition={
            reduced
              ? undefined
              : {
                  duration: 0.6,
                  ease: 'easeInOut',
                  repeat: Infinity,
                  repeatDelay: 0.4,
                }
          }
        />
        <motion.path
          d="m7 17-5-5 5-5"
          animate={
            reduced
              ? { x: 0 }
              : { x: [0, -1.5, 0] }
          }
          transition={
            reduced
              ? undefined
              : {
                  duration: 0.6,
                  ease: 'easeInOut',
                  delay: 0.05,
                  repeat: Infinity,
                  repeatDelay: 0.4,
                }
          }
        />
        <motion.path
          d="M22 18v-2a4 4 0 0 0-4-4H7"
          animate={
            reduced
              ? { opacity: 1 }
              : { opacity: [1, 0.6, 1] }
          }
          transition={
            reduced
              ? undefined
              : {
                  duration: 0.6,
                  ease: 'easeInOut',
                  repeat: Infinity,
                  repeatDelay: 0.4,
                }
          }
        />
      </motion.svg>
    </motion.div>
  );
};

const DiscardIcon = ({ className }: IconComponentProps) => {
  const reduced = useReducedMotion();

  return (
    <motion.div className={cn('inline-flex items-center justify-center', className)}>
      <motion.svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
      >
        <motion.g
          animate={
            reduced
              ? { scale: 1 }
              : {
                  scale: [1, 1.02, 1],
                }
          }
          transition={
            reduced
              ? undefined
              : {
                  duration: 0.6,
                  ease: 'easeInOut',
                  repeat: Infinity,
                  repeatDelay: 0.4,
                }
          }
        >
          <motion.path
            d="M12 3v12"
            strokeDasharray="30"
            animate={
              reduced
                ? { strokeDashoffset: 0, opacity: 1 }
                : {
                    strokeDashoffset: [30, 0],
                    opacity: [0.4, 1],
                  }
            }
            transition={
              reduced
                ? undefined
                : {
                    duration: 0.6,
                    ease: 'easeInOut',
                    repeat: Infinity,
                    repeatDelay: 0.4,
                  }
            }
          />
          <motion.path
            d="m17 8-5-5-5 5"
            animate={
              reduced
                ? { y: 0, opacity: 1, scale: 1 }
                : {
                    y: [2, -2, 0],
                    scale: [1, 1.05, 1],
                    opacity: [0.6, 1],
                  }
            }
            transition={
              reduced
                ? undefined
                : {
                    duration: 0.6,
                    ease: 'easeInOut',
                    delay: 0.05,
                    repeat: Infinity,
                    repeatDelay: 0.4,
                  }
            }
          />
          <motion.path
            d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
            strokeDasharray="60"
            animate={
              reduced
                ? { strokeDashoffset: 0, opacity: 1 }
                : {
                    strokeDashoffset: [60, 0],
                    opacity: [0.3, 1],
                  }
            }
            transition={
              reduced
                ? undefined
                : {
                    duration: 0.6,
                    ease: 'easeInOut',
                    delay: 0.1,
                    repeat: Infinity,
                    repeatDelay: 0.4,
                  }
            }
          />
        </motion.g>
      </motion.svg>
    </motion.div>
  );
};

const BanishIcon = ({ className }: IconComponentProps) => {
  const reduced = useReducedMotion();

  return (
    <motion.div className={cn('inline-flex items-center justify-center', className)}>
      <motion.svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        animate={
          reduced
            ? { rotate: 0, scale: 1 }
            : {
                rotate: 360,
                scale: [1, 1.1, 1],
              }
        }
        transition={
          reduced
            ? undefined
            : {
                duration: 2,
                ease: 'linear',
                repeat: Infinity,
              }
        }
      >
        <circle cx="12" cy="12" r="1" />
        <path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z" />
        <path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z" />
      </motion.svg>
    </motion.div>
  );
};

const DestroyIcon = ({ className }: IconComponentProps) => {
  const reduced = useReducedMotion();

  return (
    <motion.div className={cn('inline-flex items-center justify-center', className)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <motion.path
          d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
          animate={
            reduced
              ? { strokeDashoffset: 0, scale: 1, rotate: 0 }
              : {
                  strokeDashoffset: [300, 24, 0],
                  scale: [1, 0.98, 1.04, 1],
                  rotate: [0, -2, 1, 0],
                }
          }
          transition={
            reduced
              ? undefined
              : {
                  duration: 1,
                  ease: [0.18, 0.85, 0.25, 1],
                  times: [0, 0.35, 0.75, 1],
                  repeat: Infinity,
                  repeatDelay: 0.4,
                }
          }
          style={{ strokeDasharray: 300, transformOrigin: '12px 12px' }}
        />
        <motion.path
          d="m14.5 9.5-5 5"
          animate={
            reduced
              ? { strokeDashoffset: 0, opacity: 1 }
              : { strokeDashoffset: [40, 0], opacity: [0, 1, 1] }
          }
          transition={
            reduced
              ? undefined
              : {
                  duration: 0.5,
                  ease: [0.22, 0.9, 0.28, 1],
                  delay: 0.28,
                  repeat: Infinity,
                  repeatDelay: 0.9,
                }
          }
          style={{ strokeDasharray: 40, strokeLinecap: 'round' }}
        />
        <motion.path
          d="m9.5 9.5 5 5"
          animate={
            reduced
              ? { strokeDashoffset: 0, opacity: 1 }
              : { strokeDashoffset: [40, 0], opacity: [0, 1, 1] }
          }
          transition={
            reduced
              ? undefined
              : {
                  duration: 0.5,
                  ease: [0.22, 0.9, 0.28, 1],
                  delay: 0.36,
                  repeat: Infinity,
                  repeatDelay: 0.9,
                }
          }
          style={{ strokeDasharray: 40, strokeLinecap: 'round' }}
        />
      </svg>
    </motion.div>
  );
};

const SummonIcon = ({ className }: IconComponentProps) => (
  <div className={cn('inline-flex items-center justify-center', className)}>
    <svg
      fill="none"
      height="22"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      style={{ overflow: 'visible' }}
      viewBox="0 0 24 24"
      width="22"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M5 20a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" />
      <path d="M16.5 18c1-2 2.5-5 2.5-9a7 7 0 0 0-7-7H6.635a1 1 0 0 0-.768 1.64L7 5l-2.32 5.802a2 2 0 0 0 .95 2.526l2.87 1.456" />
      <path d="m15 5 1.425-1.425" />
      <path d="m17 8 1.53-1.53" />
      <path d="M9.713 12.185 7 18" />
    </svg>
  </div>
);

const NegateIcon = ({ className }: IconComponentProps) => (
  <div className={className} style={{ display: 'contents' }}>
    <LordIcon
      src="https://cdn.lordicon.com/ebyacdql.json"
      trigger="loop"
      delay="2000"
      state="hover-cross-2"
      colors="primary:#f87171"
      style={{ width: '28px', height: '28px' }}
    />
  </div>
);

const ContinuousSpellTrapIcon = ({ className }: IconComponentProps) => {
  const reduced = useReducedMotion();

  const pathVariants = {
    normal: {
      pathLength: 1,
      opacity: 1,
      transition: { duration: 0.3 },
    },
    animate: {
      pathLength: [1, 0.3, 1],
      opacity: [1, 0.7, 1],
      transition: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' },
    },
  };

  return (
    <motion.div className={cn('inline-flex items-center justify-center', className)}>
      <motion.svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={
          reduced
            ? { rotate: 0, scale: 1 }
            : {
                rotate: [0, 10, -10, 0],
                scale: [1, 1.05, 1],
              }
        }
        transition={
          reduced
            ? undefined
            : {
                duration: 1,
                repeat: Infinity,
                ease: 'easeInOut',
              }
        }
        initial="normal"
      >
        <motion.path d="m10 20-1.25-2.5L6 18" variants={pathVariants} animate={reduced ? 'normal' : 'animate'} />
        <motion.path d="M10 4 8.75 6.5 6 6" variants={pathVariants} animate={reduced ? 'normal' : 'animate'} />
        <motion.path d="m14 20 1.25-2.5L18 18" variants={pathVariants} animate={reduced ? 'normal' : 'animate'} />
        <motion.path d="m14 4 1.25 2.5L18 6" variants={pathVariants} animate={reduced ? 'normal' : 'animate'} />
        <motion.path d="m17 21-3-6h-4" variants={pathVariants} animate={reduced ? 'normal' : 'animate'} />
        <motion.path d="m17 3-3 6 1.5 3" variants={pathVariants} animate={reduced ? 'normal' : 'animate'} />
        <motion.path d="M2 12h6.5L10 9" variants={pathVariants} animate={reduced ? 'normal' : 'animate'} />
        <motion.path d="m20 10-1.5 2 1.5 2" variants={pathVariants} animate={reduced ? 'normal' : 'animate'} />
        <motion.path d="M22 12h-6.5L14 15" variants={pathVariants} animate={reduced ? 'normal' : 'animate'} />
        <motion.path d="m4 10 1.5 2L4 14" variants={pathVariants} animate={reduced ? 'normal' : 'animate'} />
        <motion.path d="m7 21 3-6-1.5-3" variants={pathVariants} animate={reduced ? 'normal' : 'animate'} />
        <motion.path d="m7 3 3 6h4" variants={pathVariants} animate={reduced ? 'normal' : 'animate'} />
      </motion.svg>
    </motion.div>
  );
};

export const ChainLinkIcon = ({ className }: IconComponentProps) => (
  <div className={className} style={{ display: 'contents' }}>
    <LordIcon
      src="https://cdn.lordicon.com/asyunleq.json"
      trigger="loop"
      delay="1500"
      state="in-cog"
      colors="primary:#fb923c"
      style={{ width: '24px', height: '24px' }}
    />
  </div>
);

export const PhaseIcon = ({ className }: IconComponentProps) => {
  const controls = useAnimation();
  const reduced = useReducedMotion();

  React.useEffect(() => {
    controls.start(reduced ? 'normal' : 'animate');
  }, [controls, reduced]);

  const circleVariants = {
    normal: { scale: 1 },
    animate: {
      scale: [1, 1.05, 0.98, 1],
      transition: { duration: 0.9, ease: 'easeInOut', repeat: Infinity },
    },
  };

  const needleVariants = {
    normal: { rotate: 0, opacity: 1 },
    animate: {
      rotate: [0, 200, 170, 180],
      opacity: [0.9, 1],
      transition: { duration: 1, ease: 'easeInOut', repeat: Infinity },
    },
  };

  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      animate={controls}
      initial="normal"
      variants={circleVariants}
    >
      <motion.path
        d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"
        variants={needleVariants}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />
      <motion.circle cx="12" cy="12" r="10" variants={circleVariants} initial="normal" />
    </motion.svg>
  );
};

const XyzIcon = ({ className }: IconComponentProps) => {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className="inline-flex items-center justify-center"
      animate={
        reduced
          ? { scale: 1, rotate: 0 }
          : {
              scale: [1, 1.06, 0.98, 1],
              rotate: [0, -2, 1, 0],
            }
      }
      transition={
        reduced
          ? undefined
          : {
              duration: 0.85,
              ease: [0.22, 1, 0.36, 1],
              repeat: Infinity,
              repeatDelay: 0.5,
            }
      }
    >
      <motion.svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn('h-5 w-5', className)}
      >
        <motion.path
          d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"
          animate={
            reduced
              ? { opacity: 1, scale: 1 }
              : {
                  opacity: [0.6, 1, 1],
                  scale: [0.7, 1.15, 1],
                }
          }
          transition={
            reduced
              ? undefined
              : {
                  duration: 0.7,
                  ease: 'easeOut',
                  delay: 0.05,
                  repeat: Infinity,
                  repeatDelay: 0.65,
                }
          }
          style={{ transformOrigin: 'center' }}
        />
        <motion.path
          d="M20 2v4"
          animate={
            reduced
              ? { opacity: 0.9, scale: 1, rotate: 0 }
              : {
                  opacity: [0, 1, 1],
                  scale: [0.4, 1, 1],
                  rotate: [-45, 0, 0],
                }
          }
          transition={
            reduced
              ? undefined
              : {
                  duration: 0.55,
                  ease: 'easeOut',
                  delay: 0.16,
                  repeat: Infinity,
                  repeatDelay: 0.65,
                }
          }
          style={{ transformOrigin: 'center' }}
        />
        <motion.path
          d="M22 4h-4"
          animate={
            reduced
              ? { opacity: 0.9, scale: 1, rotate: 0 }
              : {
                  opacity: [0, 1, 1],
                  scale: [0.4, 1, 1],
                  rotate: [-45, 0, 0],
                }
          }
          transition={
            reduced
              ? undefined
              : {
                  duration: 0.55,
                  ease: 'easeOut',
                  delay: 0.16,
                  repeat: Infinity,
                  repeatDelay: 0.65,
                }
          }
          style={{ transformOrigin: 'center' }}
        />
        <motion.circle
          cx="4"
          cy="20"
          r="2"
          animate={
            reduced
              ? { opacity: 1, scale: 1, y: 0 }
              : {
                  opacity: [0, 1, 1],
                  scale: [0.4, 1, 1],
                  y: [4, 0, 0],
                }
          }
          transition={
            reduced
              ? undefined
              : {
                  duration: 0.5,
                  ease: 'easeOut',
                  delay: 0.28,
                  repeat: Infinity,
                  repeatDelay: 0.65,
                }
          }
          style={{ transformOrigin: 'center' }}
        />
      </motion.svg>
    </motion.div>
  );
};

const FusionIcon = ({ className }: IconComponentProps) => (
  <div className={className} style={{ display: 'contents' }}>
    <AnimatedIcons
      src="https://animatedicons.co/get-icon?name=Chrome&style=minimalistic&token=eb1115f4-396c-4ad6-923b-25a66465ee00"
      trigger="loop"
      attributes='{"variationThumbColour":"#536DFE","variationName":"Two Tone","variationNumber":2,"numberOfGroups":2,"backgroundIsGroup":false,"strokeWidth":2.5,"defaultColours":{"group-1":"#A000FFED","group-2":"#A600E0FF","background":"#00000000"}}'
      height="28"
      width="28"
    />
  </div>
);

function GradientIconBase({
  className,
  gradientId,
  children,
}: IconComponentProps & { gradientId: string; children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      {children}
    </svg>
  );
}

const PendulumIcon = ({ className }: IconComponentProps) => (
  <div className={className} style={{ display: 'contents' }}>
    <AnimatedIcons
      src="https://animatedicons.co/get-icon?name=Fullscreen&style=minimalistic&token=defd54f5-3357-43dd-ad9e-32e227c0ac60"
      trigger="loop"
      attributes='{"variationThumbColour":"#FFFFFF","variationName":"Normal","variationNumber":1,"numberOfGroups":1,"backgroundIsGroup":false,"strokeWidth":1.5,"defaultColours":{"group-1":"#FFFFFF","background":"#00000000"}}'
      height="28"
      width="28"
      style={{ transform: 'rotate(45deg)' }}
    />
  </div>
);

export const ScaleLeftOverlayIcon = ({ className }: IconComponentProps) => (
  <div className={className} style={{ display: 'contents' }}>
    <LordIcon
      src="https://cdn.lordicon.com/gqfozvrp.json"
      trigger="loop"
      delay="2000"
      state="hover-arrow-down-2"
      colors="primary:#ffffff"
      style={{ width: '48px', height: '48px', transform: 'rotate(90deg)', filter: 'drop-shadow(0 0 3px rgba(239, 68, 68, 0.9))' }}
    />
  </div>
);

export const ScaleRightOverlayIcon = ({ className }: IconComponentProps) => (
  <div className={className} style={{ display: 'contents' }}>
    <LordIcon
      src="https://cdn.lordicon.com/gqfozvrp.json"
      trigger="loop"
      delay="2000"
      state="hover-arrow-down-2"
      colors="primary:#ffffff"
      style={{ width: '48px', height: '48px', transform: 'rotate(270deg)', filter: 'drop-shadow(0 0 3px rgba(59, 130, 246, 0.9))' }}
    />
  </div>
);

export const EFFECT_STYLES: Record<ComboAction['type'], {
  Icon: React.ComponentType<IconComponentProps>;
  text: string;
  bg: string;
  border: string;
}> = {
  'summon': { Icon: SummonIcon, text: 'text-pink-400', bg: 'bg-pink-400/10', border: 'border-pink-400/30' },
  'ritual': { Icon: RitualIcon, text: 'text-blue-700', bg: 'bg-blue-700/10', border: 'border-blue-700/30' },
  'send-gy': { Icon: Skull, text: 'text-muted-foreground', bg: 'bg-muted/20', border: 'border-muted-foreground/30' },
  'activate': { Icon: ActivateIcon, text: 'text-yellow-300', bg: 'bg-yellow-300/10', border: 'border-yellow-300/30' },
  'target': { Icon: LocateFixed, text: 'text-rose-300', bg: 'bg-rose-300/10', border: 'border-rose-300/30' },
  'search': { Icon: Search, text: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30' },
  'banish': { Icon: BanishIcon, text: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30' },
  'draw': { Icon: DrawIcon, text: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/30' },
  'set': { Icon: SetIcon, text: 'text-blue-300', bg: 'bg-blue-300/10', border: 'border-blue-300/30' },
  'tribute': { Icon: TributeIcon, text: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/30' },
  'link': { Icon: LinkSummonIcon, text: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30' },
  'xyz': { Icon: XyzIcon, text: 'text-yellow-300', bg: 'bg-yellow-300/10', border: 'border-yellow-300/30' },
  'synchro': { Icon: SynchroIcon, text: 'text-white', bg: 'bg-emerald-300/10', border: 'border-emerald-300/30' },
  'fusion': { Icon: FusionIcon, text: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30' },
  'pendulum': { Icon: PendulumIcon, text: 'text-white', bg: PENDULUM_GRADIENT_BG_CLASS, border: PENDULUM_GRADIENT_BORDER_CLASS },
  'scale': { Icon: PendulumIcon, text: 'text-white', bg: PENDULUM_GRADIENT_BG_CLASS, border: PENDULUM_GRADIENT_BORDER_CLASS },
  'return': { Icon: RotateCcw, text: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/30' },
  'negate': { Icon: NegateIcon, text: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30' },
  'destroy': { Icon: DestroyIcon, text: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  'discard': { Icon: DiscardIcon, text: 'text-muted-foreground', bg: 'bg-muted/20', border: 'border-muted-foreground/30' },
  'detach': { Icon: DetachIcon, text: 'text-yellow-200', bg: 'bg-yellow-200/10', border: 'border-yellow-200/30' },
  'reveal': { Icon: RevealIcon, text: 'text-teal-300', bg: 'bg-teal-300/10', border: 'border-teal-300/30' },
  'continuous': { Icon: ContinuousSpellTrapIcon, text: 'text-cyan-200', bg: 'bg-cyan-300/10', border: 'border-cyan-300/30' },
  'field-spell': { Icon: Play, text: 'text-lime-300', bg: 'bg-lime-300/10', border: 'border-lime-300/30' },
  'generic': { Icon: Play, text: 'text-muted-foreground', bg: 'bg-muted/20', border: 'border-muted-foreground/30' },
};

const EFFECT_HEX: Record<ComboAction['type'], string> = {
  'summon': '#f472b6',
  'ritual': '#1d4ed8',
  'send-gy': '#94a3b8',
  'activate': '#fde047',
  'target': '#fda4af',
  'search': '#60a5fa',
  'banish': '#c084fc',
  'draw': '#4ade80',
  'set': '#7dd3fc',
  'tribute': '#fb923c',
  'link': '#60a5fa',
  'xyz': '#fde047',
  'synchro': '#6ee7b7',
  'fusion': '#c084fc',
  'pendulum': '#a855f7',
  'return': '#22d3ee',
  'negate': '#f87171',
  'destroy': '#ef4444',
  'discard': '#94a3b8',
  'detach': '#fef08a',
  'reveal': '#5eead4',
  'continuous': '#a5f3fc',
  'field-spell': '#bef264',
  'generic': '#94a3b8',
};

function ReturnLordIcon({ className }: { className?: string }) {
  return (
    <LordIcon
      src="https://cdn.lordicon.com/valwmkhs.json"
      trigger="loop"
      delay="2000"
      colors="primary:#22d3ee"
      class={className}
      style={{ width: '28px', height: '28px' }}
    />
  );
}

function SearchLordIcon({ className }: { className?: string }) {
  return (
    <LordIcon
      src="https://cdn.lordicon.com/xaekjsls.json"
      trigger="loop"
      delay="1000"
      state="morph-select"
      colors="primary:#60a5fa"
      class={className}
      style={{ width: '28px', height: '28px' }}
    />
  );
}

export function ActionIcon({ type }: { type: ComboAction['type'] }) {
  if (type === 'summon') return null;

  const { Icon, text } = EFFECT_STYLES[type];
  return (
    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary/80 border border-border">
      {type === 'return' ? <ReturnLordIcon className={text} /> : type === 'search' ? <SearchLordIcon className={text} /> : <Icon className={`w-5 h-5 ${text}`} />}
    </div>
  );
}

export function EffectGlyph({ type, className }: { type: ComboAction['type']; className?: string }) {
  if (type === 'summon') return null;

  const { Icon, text } = EFFECT_STYLES[type];

  if (type === 'return') {
    return <ReturnLordIcon className={className || text} />;
  }

  if (type === 'search') {
    return <SearchLordIcon className={className || text} />;
  }

  return <Icon className={className || `w-5 h-5 ${text}`} />;
}

export function ActionArrow({ type }: { type: ComboAction['type'] }) {
  const color = EFFECT_HEX[type];

  return (
    <div className="flex items-center px-2">
      <LordIcon
        src="https://cdn.lordicon.com/jarmuava.json"
        trigger="loop"
        delay="2000"
        state="hover-slide"
        colors={`primary:${color}`}
        style={{ width: '60px', height: '80px' }}
      />
    </div>
  );
}
