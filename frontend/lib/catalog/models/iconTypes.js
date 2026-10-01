import { equipmentModelTypes } from './types.js';
import { sourceIconShapesA } from './sourceIconShapesA.js';
import { sourceIconShapesB } from './sourceIconShapesB.js';

/** Icon-only vocabulary. Adding a 2D silhouette never silently adds a 3D model. */
export const sourceIconShapes = Object.freeze({ ...sourceIconShapesA, ...sourceIconShapesB });
export const equipmentIconTypes = Object.freeze({ ...equipmentModelTypes, ...sourceIconShapes });
export const resolveIconType = type => Object.hasOwn(equipmentIconTypes, type) ? type : 'equipment';
export const equipmentIconName = type => equipmentIconTypes[resolveIconType(type)].name;
