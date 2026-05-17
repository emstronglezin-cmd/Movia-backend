import { CityEntity } from '../entities/city.entity';

export interface ICityRepository {
  findAll(): Promise<CityEntity[]>;
}

export const CITY_REPOSITORY = Symbol('CITY_REPOSITORY');
