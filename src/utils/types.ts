export type PropertySetter<NextType, CurrentType> =
  | NextType
  | ((value: CurrentType) => NextType);
