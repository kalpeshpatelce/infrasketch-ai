import { Router, Request, Response } from "express";
import { getGenerations, getGenerationById, deleteGeneration } from "../db/database";

export const historyRouter = Router();

historyRouter.get("/", (_req: Request, res: Response) => {
  try {
    const generations = getGenerations();
    res.json({ generations });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

historyRouter.get("/:id", (req: Request, res: Response) => {
  try {
    const generation = getGenerationById(req.params.id);
    if (!generation) {
      res.status(404).json({ error: "Generation not found" });
      return;
    }
    res.json(generation);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch generation" });
  }
});

historyRouter.delete("/:id", (req: Request, res: Response) => {
  try {
    deleteGeneration(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to delete generation" });
  }
});
