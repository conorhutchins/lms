export type Event = {
    id: number;
    name: string;
    is_current: boolean;
    [key: string]: unknown;
  };