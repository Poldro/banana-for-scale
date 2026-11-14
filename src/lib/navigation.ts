/**
 * Turns wheel, touch/pointer drags and keys into a smoothly animated
 * position. Scrolling or swiping *down* dives into smaller scales; *up*
 * zooms out towards the universe. After the user stops, the view settles
 * on the nearest level.
 */
import { gsap } from 'gsap';
import { Observer } from 'gsap/Observer';
import { clampPosition, nearestIndex } from './scale';

gsap.registerPlugin(Observer);

/** Pixels of wheel travel per level. */
const WHEEL_PX_PER_LEVEL = 260;
/** Pixels of finger travel per level. */
const DRAG_PX_PER_LEVEL = 140;
/** Largest jump a single input event may cause, in levels. */
const MAX_STEP = 1.2;
const SETTLE_DELAY_MS = 220;
/** Fraction of a level a gesture must travel to commit to the next stop. */
const COMMIT_THRESHOLD = 0.2;
/** Radians of rotation per pixel of sideways drag. */
const SPIN_PER_PX = 0.01;
const MAX_SPIN_STEP = Math.PI / 2;
/** Radians per press of ← or →. */
const KEY_SPIN = Math.PI / 6;

export interface NavigatorOptions {
	count: number;
	start: number;
	reducedMotion: boolean;
	onChange: (position: number) => void;
	onSettle: (index: number) => void;
	onFirstInput: () => void;
	/** Total rotation (radians) applied to 3D models, eased. */
	onSpin?: (angle: number) => void;
	/** Element on which a mouse drag rotates the model (touch uses the window). */
	spinTarget?: HTMLElement;
}

export interface Navigator {
	goTo(index: number): void;
	step(direction: 1 | -1): void;
	destroy(): void;
}

/** Converts a wheel delta (pixels or lines) into a change of position. */
export function wheelDelta(deltaY: number, deltaMode = 0): number {
	const px = deltaMode === 1 ? deltaY * 32 : deltaMode === 2 ? deltaY * 800 : deltaY;
	return Math.max(-MAX_STEP, Math.min(MAX_STEP, -px / WHEEL_PX_PER_LEVEL));
}

/** Converts a finger drag (pixels, positive = moving down) into a change of position. */
export function dragDelta(deltaY: number): number {
	return Math.max(-MAX_STEP, Math.min(MAX_STEP, deltaY / DRAG_PX_PER_LEVEL));
}

/** Converts a sideways drag (pixels, positive = right) into radians. */
export function spinDelta(px: number): number {
	return Math.max(-MAX_SPIN_STEP, Math.min(MAX_SPIN_STEP, px * SPIN_PER_PX));
}

/** Which axis a gesture mostly moves along; ties and diagonals count as vertical (zoom). */
export function dominantAxis(dx: number, dy: number): 'x' | 'y' {
	return Math.abs(dx) > Math.abs(dy) * 1.5 ? 'x' : 'y';
}

/**
 * Keeps one gesture (a scroll burst, trackpad inertia included, or one swipe)
 * within a single stop of where it began, so a flick can never skip a level.
 */
export function gestureGoal(anchor: number, goal: number, count: number): number {
	return clampPosition(Math.max(anchor - 1, Math.min(anchor + 1, goal)), count);
}

/** Where a gesture lands: the neighbouring stop if it travelled far enough, else back home. */
export function settleTarget(anchor: number, goal: number, count: number): number {
	const travel = goal - anchor;
	const target = Math.abs(travel) >= COMMIT_THRESHOLD ? anchor + Math.sign(travel) : anchor;
	return nearestIndex(target, count);
}

/** A fresh flick must be this much faster than the last event... */
const FLICK_GROWTH = 1.6;
/** ...after the gesture had slowed to under this fraction of its peak. */
const FLICK_DECAY = 0.5;
/** Ignores jitter in slow inertia tails (pixels). */
const FLICK_MIN_JUMP = 6;

/**
 * Tells a new wheel flick apart from the inertia of the last one: inertia
 * only slows down, so speeding up again after it has decayed means the user
 * scrolled again.
 */
export function isNewFlick(peak: number, previous: number, current: number): boolean {
	return (
		previous < peak * FLICK_DECAY && current > previous * FLICK_GROWTH && current - previous > FLICK_MIN_JUMP
	);
}

export function createNavigator(opts: NavigatorOptions): Navigator {
	const state = { position: opts.start };
	const spin = { angle: 0 };
	let spinGoal = 0;
	let goal = opts.start;
	let settleTimer: ReturnType<typeof setTimeout> | undefined;
	/** Stop the current gesture started from; undefined between gestures. */
	let anchor: number | undefined;
	/** Wheel speed (px per event) of the current gesture: its peak and the last event. */
	let wheelPeak = 0;
	let wheelLast = 0;
	let touched = false;

	const duration = (base: number) => (opts.reducedMotion ? 0.25 : base);

	function animateTo(target: number, seconds: number, ease: string) {
		goal = clampPosition(target, opts.count);
		gsap.to(state, {
			position: goal,
			duration: seconds,
			ease,
			overwrite: true,
			onUpdate: () => opts.onChange(state.position)
		});
	}

	function settle() {
		const index = anchor === undefined ? nearestIndex(goal, opts.count) : settleTarget(anchor, goal, opts.count);
		endGesture();
		animateTo(index, duration(0.7), 'power2.inOut');
		opts.onSettle(index);
	}

	function endGesture() {
		anchor = undefined;
		wheelPeak = wheelLast = 0;
	}

	/** Wheel input: a fresh flick during the last one's inertia counts as a new gesture. */
	function wheel(deltaY: number, deltaMode: number) {
		// Line/page modes (mouse wheels) are discrete clicks; only pixel streams have inertia.
		const speed = deltaMode === 0 ? Math.abs(deltaY) : 0;
		if (anchor !== undefined && isNewFlick(wheelPeak, wheelLast, speed)) {
			anchor = settleTarget(anchor, goal, opts.count);
			wheelPeak = 0;
		}
		wheelPeak = Math.max(wheelPeak, speed);
		wheelLast = speed;
		nudge(wheelDelta(deltaY, deltaMode));
	}

	function nudge(delta: number) {
		if (!touched) {
			touched = true;
			opts.onFirstInput();
		}
		anchor ??= nearestIndex(goal, opts.count);
		animateTo(gestureGoal(anchor, goal + delta, opts.count), duration(0.6), 'power3.out');
		clearTimeout(settleTimer);
		settleTimer = setTimeout(settle, SETTLE_DELAY_MS);
	}

	function goTo(index: number) {
		clearTimeout(settleTimer);
		endGesture();
		const target = nearestIndex(index, opts.count);
		const distance = Math.abs(target - state.position);
		animateTo(target, duration(Math.min(0.6 + distance * 0.08, 2.4)), 'power2.inOut');
		opts.onSettle(target);
		if (!touched) {
			touched = true;
			opts.onFirstInput();
		}
	}

	function rotate(delta: number) {
		if (!opts.onSpin || delta === 0) return;
		spinGoal += delta;
		gsap.to(spin, {
			angle: spinGoal,
			duration: opts.reducedMotion ? 0 : 0.6,
			ease: 'power3.out',
			overwrite: true,
			onUpdate: () => opts.onSpin?.(spin.angle)
		});
	}

	function step(direction: 1 | -1) {
		goTo(nearestIndex(goal, opts.count) + direction);
	}

	const observer = Observer.create({
		target: window,
		type: 'wheel,touch',
		preventDefault: true,
		tolerance: 2,
		// A touch gesture sticks to the axis it started on: zoom or rotate.
		lockAxis: true,
		// Lifting the finger ends a swipe, so quick successive swipes each move a stop.
		onRelease: () => {
			if (anchor === undefined) return;
			clearTimeout(settleTimer);
			settle();
		},
		onChange: (self) => {
			const event = self.event as WheelEvent | TouchEvent | PointerEvent;
			if (event.type === 'wheel') {
				const e = event as WheelEvent;
				if (dominantAxis(e.deltaX, e.deltaY) === 'x') rotate(spinDelta(-e.deltaX));
				else wheel(e.deltaY, e.deltaMode);
			} else if (self.axis === 'x') {
				rotate(spinDelta(self.deltaX));
			} else {
				nudge(dragDelta(self.deltaY));
			}
		}
	});

	// Mouse drag on the scene rotates the model; Observer only handles touch.
	let dragX: number | undefined;
	const target = opts.spinTarget;
	const onPointerDown = (e: PointerEvent) => {
		if (e.pointerType !== 'mouse' || e.button !== 0) return;
		dragX = e.clientX;
		target?.setPointerCapture(e.pointerId);
	};
	const onPointerMove = (e: PointerEvent) => {
		if (dragX === undefined) return;
		rotate(spinDelta(e.clientX - dragX));
		dragX = e.clientX;
	};
	const onPointerUp = () => (dragX = undefined);
	target?.addEventListener('pointerdown', onPointerDown);
	target?.addEventListener('pointermove', onPointerMove);
	target?.addEventListener('pointerup', onPointerUp);
	target?.addEventListener('pointercancel', onPointerUp);

	function onKey(e: KeyboardEvent) {
		if (e.target instanceof HTMLElement && e.target.closest('input, textarea')) return;
		const keys: Record<string, () => void> = {
			ArrowDown: () => step(-1),
			PageDown: () => step(-1),
			' ': () => step(-1),
			ArrowUp: () => step(1),
			PageUp: () => step(1),
			Home: () => goTo(opts.count - 1),
			End: () => goTo(0),
			ArrowLeft: () => rotate(-KEY_SPIN),
			ArrowRight: () => rotate(KEY_SPIN)
		};
		const action = keys[e.key];
		if (!action) return;
		e.preventDefault();
		action();
	}
	window.addEventListener('keydown', onKey);

	return {
		goTo,
		step,
		destroy() {
			clearTimeout(settleTimer);
			observer.kill();
			gsap.killTweensOf(state);
			gsap.killTweensOf(spin);
			window.removeEventListener('keydown', onKey);
			target?.removeEventListener('pointerdown', onPointerDown);
			target?.removeEventListener('pointermove', onPointerMove);
			target?.removeEventListener('pointerup', onPointerUp);
			target?.removeEventListener('pointercancel', onPointerUp);
		}
	};
}
