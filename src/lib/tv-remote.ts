export type TvRemoteKeyEvent = Pick<KeyboardEvent, "key" | "keyCode" | "which">;

const ARROW_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]);

export function getTvRemoteKey(event: TvRemoteKeyEvent) {
  if (ARROW_KEYS.has(event.key)) {
    return event.key;
  }

  if (["Enter", "NumpadEnter", "Accept", "Select", "OK", "Ok"].includes(event.key)) {
    return "Enter";
  }

  if (["Back", "BrowserBack", "GoBack", "Escape", "Backspace"].includes(event.key)) {
    return "Back";
  }

  const keyCode = event.keyCode || event.which;
  switch (keyCode) {
    case 13:
    case 23:
    case 66:
      return "Enter";
    case 37:
      return "ArrowLeft";
    case 38:
      return "ArrowUp";
    case 39:
      return "ArrowRight";
    case 40:
      return "ArrowDown";
    case 4:
    case 8:
    case 27:
    case 461:
    case 10009:
      return "Back";
    default:
      return event.key;
  }
}

export function focusNearestTvItem(
  event: Pick<KeyboardEvent, "preventDefault" | "key" | "keyCode" | "which">,
  activeElement: HTMLElement,
  selector: string,
) {
  const key = getTvRemoteKey(event);
  const direction = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  }[key];
  if (!direction) {
    return false;
  }

  const active = activeElement.closest<HTMLElement>(selector);
  if (!active) {
    return false;
  }

  const items = Array.from(document.querySelectorAll<HTMLElement>(selector)).filter(
    (item) =>
      item !== active &&
      item.getClientRects().length > 0 &&
      !item.hasAttribute("disabled") &&
      item.getAttribute("aria-disabled") !== "true" &&
      !item.closest('[hidden], [aria-hidden="true"]'),
  );
  const rect = active.getBoundingClientRect();
  const currentX = rect.left + rect.width / 2;
  const currentY = rect.top + rect.height / 2;
  const [dx, dy] = direction;
  const next = items
    .map((item) => {
      const candidate = item.getBoundingClientRect();
      const deltaX = candidate.left + candidate.width / 2 - currentX;
      const deltaY = candidate.top + candidate.height / 2 - currentY;
      const forward = dx ? deltaX * dx : deltaY * dy;
      const cross = dx ? Math.abs(deltaY) : Math.abs(deltaX);
      return { item, score: forward > 0 ? forward + cross * 1.7 : Number.POSITIVE_INFINITY };
    })
    .filter((candidate) => Number.isFinite(candidate.score))
    .sort((first, second) => first.score - second.score)[0]?.item;

  if (!next) {
    return false;
  }

  event.preventDefault();
  next.focus();
  return true;
}
