export const removeIndex = <T>(arr: T[], index: number) => {
  return arr.slice(0, index).concat(arr.slice(index + 1));
};

export const insertAtIndex = <T>(arr: T[], index: number, element: T) => {
  return arr.slice(0, index).concat([element], arr.slice(index));
};
