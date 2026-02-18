export interface PersistenceItem {
  tableName: string;
  item: Record<string, unknown>;
}

export interface BaseRepository<T> {
  findById(id: string): Promise<T | null>;
  save(entity: T): Promise<void>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
  /** Convert entity to persistence-ready items with table name, for use with transactional writes.
   *  Returns an array to support adjacency list patterns (e.g., customer + merchant index items). */
  toPersistenceItem(entity: T): PersistenceItem[];
}

export interface QueryOptions {
  limit?: number;
  nextToken?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface QueryResult<T> {
  items: T[];
  nextToken?: string | undefined;
  count: number;
}
