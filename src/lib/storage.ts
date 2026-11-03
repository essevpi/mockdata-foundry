// localStorage, or undefined where reading it throws (blocked site data, some private windows).
export function getLocalStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
