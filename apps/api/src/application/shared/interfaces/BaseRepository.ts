export interface BaseRepository<T> {
  findById(id: string): Promise<T | null>;
  save(entity: T): Promise<void>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}

export interface QueryOptions {
  limit?: number;
  nextToken?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface QueryResult<T> {
  items: T[];
  nextToken?: string;
  count: number;
}
