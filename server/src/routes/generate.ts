import { Router, Request, Response } from "express";
import { z } from "zod";
import { generateIaC } from "../services/ai-service";
import { validateTerraform, validateAnsible } from "../validators/iac-validator";
import { saveGeneration } from "../db/database";
import { v4 as uuidv4 } from "uuid";
import { createZipArchive } from "../services/archive-service";

export const generateRouter = Router();

const GenerateRequestSchema = z.object({
  description: z.string().min(10, "Description must be at least 10 characters"),
  outputType: z.enum(["terraform", "ansible", "both"]),
  provider: z.enum(["aws", "azure", "gcp"]),
});

generateRouter.post("/", async (req: Request, res: Response) => {
  try {
    const parsed = GenerateRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid request",
        details: parsed.error.issues,
      });
      return;
    }

    const { description, outputType, provider } = parsed.data;

    console.log(`Generating ${outputType} for ${provider}: "${description.substring(0, 50)}..."`);

    // Generate IaC code using AI
    const generated = await generateIaC(description, outputType, provider);

    // Validate generated code
    const validationResults = [];
    if (outputType === "terraform" || outputType === "both") {
      const tfValidation = validateTerraform(generated.terraform || "");
      validationResults.push({ type: "terraform", ...tfValidation });
    }
    if (outputType === "ansible" || outputType === "both") {
      const ansibleValidation = validateAnsible(generated.ansible || "");
      validationResults.push({ type: "ansible", ...ansibleValidation });
    }

    // Save to history
    const id = uuidv4();
    saveGeneration({
      id,
      description,
      outputType,
      provider,
      terraform: generated.terraform || null,
      ansible: generated.ansible || null,
      architecture: generated.architecture || null,
      createdAt: new Date().toISOString(),
    });

    res.json({
      id,
      files: generated,
      validation: validationResults,
      message: "Code generated successfully",
    });
  } catch (error: any) {
    console.error("Generation error:", error.message);
    const statusCode = error.status || error.response?.status || 500;
    const message =
      error.message || "Failed to generate code";
    res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({
      error: "Failed to generate code",
      message,
    });
  }
});

generateRouter.get("/download/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const archive = await createZipArchive(id);

    if (!archive) {
      res.status(404).json({ error: "Generation not found" });
      return;
    }

    res.set({
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="infrasketch-${id.substring(0, 8)}.zip"`,
    });

    archive.pipe(res);
    await archive.finalize();
  } catch (error: any) {
    console.error("Download error:", error.message);
    res.status(500).json({ error: "Failed to create archive" });
  }
});
