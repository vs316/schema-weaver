import type { Table } from "../types";
import { generateId } from "./id";

export const SCHEMA_TEMPLATES: Record<string, Table[]> = {
  ecommerce: [
    {
      id: generateId(),
      name: "users",
      x: 100,
      y: 100,
      columns: [
        { id: generateId(), name: "id", type: "INT", isPk: true, isFk: false },
        {
          id: generateId(),
          name: "email",
          type: "VARCHAR(255)",
          isPk: false,
          isFk: false,
        },
      ],
    },
    {
      id: generateId(),
      name: "orders",
      x: 400,
      y: 100,
      columns: [
        { id: generateId(), name: "id", type: "INT", isPk: true, isFk: false },
        {
          id: generateId(),
          name: "user_id",
          type: "INT",
          isPk: false,
          isFk: true,
        },
      ],
    },
  ],

  blog: [
    {
      id: generateId(),
      name: "posts",
      x: 120,
      y: 120,
      columns: [
        { id: generateId(), name: "id", type: "INT", isPk: true, isFk: false },
        {
          id: generateId(),
          name: "title",
          type: "VARCHAR(255)",
          isPk: false,
          isFk: false,
        },
      ],
    },
    {
      id: generateId(),
      name: "comments",
      x: 420,
      y: 120,
      columns: [
        { id: generateId(), name: "id", type: "INT", isPk: true, isFk: false },
        {
          id: generateId(),
          name: "post_id",
          type: "INT",
          isPk: false,
          isFk: true,
        },
      ],
    },
  ],
};
