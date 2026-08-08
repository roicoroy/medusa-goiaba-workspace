import { createAnimation, Animation } from '@ionic/core';
import {
  AnimatedProperty,
  AnimatedValue,
  PageAnimationDuration,
  PAGE_INVISIBLE_CLASS,
  UPPER_PAGE_INDEX,
} from './animation.const';
import { TransitionOptions } from './animation.model';

export const slideAnimation = (
  baseEl: HTMLElement,
  opts?: TransitionOptions | any,
): Animation =>
  opts?.direction === 'back'
    ? horizontalBackAnimation(baseEl, opts)
    : horizontalForwardAnimation(baseEl, opts);

export function horizontalForwardAnimation(
  baseEl: HTMLElement,
  opts?: TransitionOptions | any,
): Animation {
  opts?.enteringEl?.classList.remove(PAGE_INVISIBLE_CLASS);

  const enteringAnimation = createAnimation()
    .addElement(opts.enteringEl)
    .duration(PageAnimationDuration.SLIDING)
    .easing(AnimatedValue.EASE_OUT)
    .beforeStyles({
      [AnimatedProperty.OPACITY]: 1,
      [AnimatedProperty.Z_INDEX]: UPPER_PAGE_INDEX,
    })
    .fromTo(
      AnimatedProperty.TRANSFORM,
      AnimatedValue.TRANSLATE_X_PCT(100),
      AnimatedValue.TRANSLATE_X_PCT(0),
    );

  const leavingAnimation = opts?.leavingEl
    ? createAnimation()
        .addElement(opts.leavingEl)
        .duration(PageAnimationDuration.SLIDING)
        .easing(AnimatedValue.EASE_OUT)
        .fromTo(
          AnimatedProperty.TRANSFORM,
          AnimatedValue.TRANSLATE_X_PCT(0),
          AnimatedValue.TRANSLATE_X_PCT(-30),
        )
        .fromTo(AnimatedProperty.OPACITY, 1, 0.95)
    : undefined;

  return createAnimation()
    .addAnimation(leavingAnimation ?? createAnimation())
    .addAnimation(enteringAnimation);
}

export function horizontalBackAnimation(
  baseEl: HTMLElement,
  opts?: TransitionOptions | any,
): Animation {
  opts?.enteringEl?.classList.remove(PAGE_INVISIBLE_CLASS);

  const enteringAnimation = createAnimation()
    .addElement(opts.enteringEl)
    .duration(PageAnimationDuration.SLIDING)
    .easing(AnimatedValue.EASE_OUT)
    .beforeStyles({
      [AnimatedProperty.OPACITY]: 1,
    })
    .fromTo(
      AnimatedProperty.TRANSFORM,
      AnimatedValue.TRANSLATE_X_PCT(-30),
      AnimatedValue.TRANSLATE_X_PCT(0),
    )
    .fromTo(AnimatedProperty.OPACITY, 0.95, 1);

  const leavingAnimation = opts?.leavingEl
    ? createAnimation()
        .addElement(opts.leavingEl)
        .duration(PageAnimationDuration.SLIDING)
        .easing(AnimatedValue.EASE_OUT)
        .beforeStyles({
          [AnimatedProperty.Z_INDEX]: UPPER_PAGE_INDEX,
        })
        .fromTo(
          AnimatedProperty.TRANSFORM,
          AnimatedValue.TRANSLATE_X_PCT(0),
          AnimatedValue.TRANSLATE_X_PCT(100),
        )
    : undefined;

  return createAnimation()
    .addAnimation(enteringAnimation)
    .addAnimation(leavingAnimation ?? createAnimation());
}
