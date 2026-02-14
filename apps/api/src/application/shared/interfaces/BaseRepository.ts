export interface PersistenceItem {
  tableName: string;
  item: Record<string, unknown>;
}

export interface BaseRepository<T> {
  findById(id: string): Promise<T | null>;
  save(entity: T): Promise<void>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
  /** Convert entity to a persistence-ready item with table name, for use with transactional writes */
  toPersistenceItem(entity: T): PersistenceItem;
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
