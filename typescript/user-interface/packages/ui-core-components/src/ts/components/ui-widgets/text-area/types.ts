export interface TextAreaProps {
  defaultValue: string;
  title: string;
  maxChar?: number;

  /** data field for testing */
  'data-cy'?: string;

  onMaybeValue(value: any);
}
