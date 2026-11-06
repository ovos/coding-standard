export type Results = {
  results: Array<
    | {
        id: number;
        name: string;
      }
    | { id: number }
    | null
  >;
};
