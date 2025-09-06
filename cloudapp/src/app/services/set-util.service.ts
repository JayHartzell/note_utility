import { Entity } from '@exlibris/exl-cloudapp-angular-lib';

/**
 * utilities for derived set operations. 
 */
export class SetUtilService {
  static hasValidSets(entities: Entity[] | null | undefined): boolean {
    if (!Array.isArray(entities)) return false;
    return entities.some(entity => entity.type === 'SET');
  }

  static availableSets(entities: Entity[] | null | undefined): Entity[] {
    if (!Array.isArray(entities)) return [];
    return entities.filter(entity => entity.type === 'SET');
  }

  static getEntityTypes(entities: Entity[] | null | undefined): string {
    if (!Array.isArray(entities) || entities.length === 0) return 'None';
    return entities.map(e => e.type).join(', ');
  }
}
