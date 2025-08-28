export type PropertySetter<NextType, CurrentType = NextType> =
  | NextType
  | ((value: CurrentType) => NextType);
