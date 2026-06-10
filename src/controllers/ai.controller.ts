import { Response } from "express";
import { analyzeComplaint } from "../services/gemini.service.ts";
import { successResponse, errorResponse } from "../utils/apiResponse.ts";
import { AuthenticatedRequest } from "../middleware/auth.ts";

/**
 * Validates whether the given string is coherent municipal/civic text and not gibberish.
 */
function checkTextParsability(text: string): { isValid: boolean; reason?: string } {
  const cleaned = text.trim();
  
  if (cleaned.length < 15) {
    return {
      isValid: false,
      reason: "Grievance text is too short. Minimum 15 characters describing the localized breakdown are required for judicial routing.",
    };
  }

  // Check for repeating characters (e.g., "aaaaaaaaaaaaaaa" or "xxxxxxxxx")
  const repeatRegex = /(.)\1{5,}/;
  if (repeatRegex.test(cleaned)) {
    return {
      isValid: false,
      reason: "Unparsable text detected (excessive repeating characters). Please enter standard administrative descriptions.",
    };
  }

  // Check for basic gibberish pattern (e.g. continuous consonants without spaces or vowels like "sdfghjklmnbvcxz")
  const words = cleaned.split(/\s+/);
  const consecutiveConsonantsRegex = /[^aeiouyаеиоуыэюяகஙசஞடணதநபமயரலவழளறன]{10,}/i;
  for (const word of words) {
    if (consecutiveConsonantsRegex.test(word) && word.length > 10) {
      return {
        isValid: false,
        reason: "Unparsable text token detected (consecutive non-vowel streams). Please describe the Tamil Nadu municipal concern in natural language.",
      };
    }
  }

  // Check for repetitious spam words (e.g., "spam spam spam spam spam")
  if (words.length >= 5) {
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    if (uniqueWords.size === 1) {
      return {
        isValid: false,
        reason: "Repetitive phrase spam detected. Please submit an actual municipal or infrastructural grievance.",
      };
    }
  }

  return { isValid: true };
}

export async function categoriseOnDemand(req: AuthenticatedRequest, res: Response) {
  try {
    const { description, imageUrls } = req.body;

    if (!description || typeof description !== "string") {
      return errorResponse(res, "Please provide a valid description string.", 400, "MISSING_DESCRIPTION");
    }

    // Run strict GovTech parsability & gibberish validation checks
    const parsabilityCheck = checkTextParsability(description);
    if (!parsabilityCheck.isValid) {
      return errorResponse(
        res,
        parsabilityCheck.reason || "Unable to parse complaint text into valid system routing structures.",
        400,
        "UNPARSABLE_COMPLAINT_TEXT"
      );
    }

    const imagesArray = Array.isArray(imageUrls) ? imageUrls : [];

    console.log(`🤖 AI On-Demand: Running structured classification routing on text preview...`);

    const result = await analyzeComplaint(description, imagesArray);

    return successResponse(res, {
      analysis: result,
    });
  } catch (err: any) {
    return errorResponse(res, err.message || "Failed to trigger on-demand Gemini classification", 500);
  }
}
