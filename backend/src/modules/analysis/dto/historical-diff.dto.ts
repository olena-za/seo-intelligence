import { IsArray, IsInt, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SnapshotDiffInput {
  @IsInt()
  wordCount: number;

  @IsArray()
  headings: string[];

  @IsArray()
  entities: string[];
}

export class HistoricalDiffDto {
  @IsObject()
  @ValidateNested()
  @Type(() => SnapshotDiffInput)
  previous: SnapshotDiffInput;

  @IsObject()
  @ValidateNested()
  @Type(() => SnapshotDiffInput)
  current: SnapshotDiffInput;
}
