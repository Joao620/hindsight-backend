export const valuesSchema = {
timer: { type: "number", default: 0 },
};
  
export const tablesSchema = {
    participants: {
        name: { type: "string", default: "Anonymous" },
    },
    columns: {
        createdAt: { type: "number", default: 0 },
        description: { type: "string", default: "" },
    },
    cards: {
        columnId: { type: "string", default: "" },
        authorId: { type: "string", default: "" },
        createdAt: { type: "number", default: 0 },
        description: { type: "string", default: "" },
    },
    votes: {
        cardId: { type: "string", default: "" },
        voterId: { type: "string", default: "" },
    },
};

