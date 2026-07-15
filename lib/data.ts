import publishersJson from "../data/publishers.json";
import personasJson from "../data/shopper_personas.json";
import type { Persona, Publisher } from "./types";

export const publishers = publishersJson as Publisher[];
export const personas = personasJson as Persona[];

export const publisherById = new Map(publishers.map((p) => [p.id, p]));
export const personaById = new Map(personas.map((p) => [p.id, p]));
