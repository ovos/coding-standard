// type-aware rule of the correctness category that only fullCorrectness turns on, not the typeChecked tier
class Store {
  name = 'store';

  label(): string {
    return this.name;
  }
}

export const { label } = new Store();
