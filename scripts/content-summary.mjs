import { concepts, mapNodes } from '../app/data/concepts.ts';
import { journeys } from '../app/data/journeys.ts';
import { scenarios } from '../app/lib/simulation.ts';
console.log(JSON.stringify({concepts:concepts.length,mapNodes:mapNodes.length,journeys:journeys.length,scenarios:scenarios.length},null,2));
