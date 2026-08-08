export const UPPER_PAGE_INDEX = 102;

export const PageAnimationDuration = {
  SLIDING: 200,
  FLIPPING: 400,
  FADING: 300,
};

export const AnimatedProperty = {
  TRANSFORM: 'transform',
  PERSPECTIVE: 'perspective',
  OPACITY: 'opacity',
  Z_INDEX: 'z-index',
  OVERFLOW: 'overflow',
};

export const AnimatedValue = {
  VISIBLE: 'visible',
  EASE_IN: 'ease-in',
  EASE_OUT: 'ease-out',
  VIEW_WIDTH: (arg: number): string => `${arg}vw`,
  ROTATE_Y: (arg: number): string => `rotateY(${arg}deg)`,
  TRANSLATE_X_PCT: (arg: number): string => `translateX(${arg}%)`,
  TRANSLATE_Y_PCT: (arg: number): string => `translateY(${arg}%)`,
  SCALE: (arg: number): string => `scale(${arg})`,
};

export const PAGE_INVISIBLE_CLASS = 'ion-page-invisible';

export enum AnimationType {
  GENERIC = 'generic',
  SLIDE_UP_DOWN = 'slide-up-down',
  FLIP = 'flip',
  FADE_OUT = 'fade-out',
}
