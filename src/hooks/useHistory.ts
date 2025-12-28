export function useHistory<T>(initial: T) {
  let history: T[] = [initial];
  let index = 0;

  const push = (state: T) => {
    history = history.slice(0, index + 1);
    history.push(state);
    index = history.length - 1;
  };

  const undo = (): T | null => {
    if (index > 0) {
      index--;
      return history[index];
    }
    return null;
  };

  const redo = (): T | null => {
    if (index < history.length - 1) {
      index++;
      return history[index];
    }
    return null;
  };

  return { push, undo, redo };
}
