export type Id = string;
export type IsoDatetimeString = string;
export type Nullable<T> = T | null;

export interface TimestampedRecord {
  createdAt?: IsoDatetimeString;
  updatedAt?: IsoDatetimeString;
}
