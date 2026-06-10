import { GoogleGenAI, Type } from "@google/genai";
import { env } from "../config/env.ts";

// Initialize Google GenAI client under a lazy pattern to avoid crashing during startup if key is missing
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = env.GEMINI_API_KEY;
    if (key) {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
  }
  return aiClient;
}

export interface JudicialGuidanceResult {
  category: "ROADS" | "WATER_SUPPLY" | "ELECTRICITY" | "SANITATION" | "TRANSPORT" | "PUBLIC_HEALTH";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  toWhom: {
    agencyName: string;
    zonalAuthority: string;
  };
  howAndWhere: {
    filingUrgencyText: string;
    siteActionDirective: string;
  };
  onWhatBasis: {
    statuteName: string;
    legalProvision: string;
    rightsExplanation: string;
  };
  aiTechnicalSummary: string;
  
  // Backward compatibility fields for database, tests, and active routes
  department: string;
  sentiment: "Routine" | "Concerned" | "Urgent" | "Emergency";
  aiSummary: string;
  estimatedResolutionHours: number;
}

const SYSTEM_PROMPT = `Act as an advanced GovTech AI System Architect. You are integrated into the "SmartTrack" platform, functioning strictly as a structured Judicial Routing and Citizen Guidance Engine.

CRITICAL CONSTRAINTS:
1. Do not create a generic conversational chatbot.
2. The AI must never say "Hello," "How can I help you today?", or write conversational prose. You must act as a structured utility.
3. Read a citizen's localized municipal, infrastructural, or transport breakdown report from Tamil Nadu and output a highly specific data payload mapping out WHERE, HOW, TO WHOM, and ON WHAT BASIS they should file their grievance.
4. Exclusively output a valid JSON object matching the provided schema. Do not include markdown formatting, backticks, or any conversational preamble/postscript. Just raw JSON.

Output object category MUST be one of: "ROADS", "WATER_SUPPLY", "ELECTRICITY", "SANITATION", "TRANSPORT", "PUBLIC_HEALTH".
Output object priority MUST be one of: "LOW", "MEDIUM", "HIGH", "CRITICAL".`;

export async function analyzeComplaint(
  description: string,
  imageUrls: string[] = []
): Promise<JudicialGuidanceResult> {
  const client = getAiClient();

  if (!client) {
    console.warn("⚠️ GEMINI_API_KEY not configured. Using local fallback rule-based analyzer.");
    return runFallbackGuidance(description);
  }

  try {
    const contents: any[] = [description];

    // Handle base64 / inline image attachments if available
    for (const imgUrl of imageUrls) {
      if (imgUrl.startsWith("data:")) {
        const matches = imgUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          contents.push({
            inlineData: {
              mimeType: matches[1],
              data: matches[2],
            },
          });
        }
      }
    }

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              description: "Must be one of: ROADS, WATER_SUPPLY, ELECTRICITY, SANITATION, TRANSPORT, PUBLIC_HEALTH",
            },
            priority: {
              type: Type.STRING,
              description: "Must be one of: LOW, MEDIUM, HIGH, CRITICAL",
            },
            toWhom: {
              type: Type.OBJECT,
              properties: {
                agencyName: {
                  type: Type.STRING,
                  description: "The formal government department name responsible, e.g., Greater Chennai Corporation (GCC), TANGEDCO, CMWSSB, TWAD Board, Metropolitan Transport Corporation (MTC), or State Highways Department",
                },
                zonalAuthority: {
                  type: Type.STRING,
                  description: "The local structural division, e.g., Local Ward Cell or Zonal Engineering Office",
                }
              },
              required: ["agencyName", "zonalAuthority"]
            },
            howAndWhere: {
              type: Type.OBJECT,
              properties: {
                filingUrgencyText: {
                  type: Type.STRING,
                  description: "Clear explanation of how the priority was derived from environmental or public impact factors",
                },
                siteActionDirective: {
                  type: Type.STRING,
                  description: "A crisp, 1-sentence technical instruction on exactly what physical fix needs to happen at the location",
                }
              },
              required: ["filingUrgencyText", "siteActionDirective"]
            },
            onWhatBasis: {
              type: Type.OBJECT,
              properties: {
                statuteName: {
                  type: Type.STRING,
                  description: "The specific Act or Legal Code name, e.g., 'Tamil Nadu City Municipal Corporation Act, 1919'",
                },
                legalProvision: {
                  type: Type.STRING,
                  description: "The explicit Section or Citizen Charter clause protecting the user's rights regarding this specific failure",
                },
                rightsExplanation: {
                  type: Type.STRING,
                  description: "A powerful, clear explanation explaining exactly on what legal grounds the citizen has the right to demand this fix",
                }
              },
              required: ["statuteName", "legalProvision", "rightsExplanation"]
            },
            aiTechnicalSummary: {
              type: Type.STRING,
              description: "A sharp, one-sentence overview summarizing the complaint text into a formal technical log format",
            }
          },
          required: [
            "category",
            "priority",
            "toWhom",
            "howAndWhere",
            "onWhatBasis",
            "aiTechnicalSummary"
          ]
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No text response received from Gemini");
    }

    const apiResult = JSON.parse(text);

    // Map priority to estimate hours
    let estHours = 48;
    if (apiResult.priority === "CRITICAL") estHours = 24;
    else if (apiResult.priority === "HIGH") estHours = 48;
    else if (apiResult.priority === "MEDIUM") estHours = 72;
    else estHours = 168;

    // Map priority to sentiment
    let sentiment: "Routine" | "Concerned" | "Urgent" | "Emergency" = "Routine";
    if (apiResult.priority === "CRITICAL") sentiment = "Emergency";
    else if (apiResult.priority === "HIGH") sentiment = "Urgent";
    else if (apiResult.priority === "MEDIUM") sentiment = "Concerned";

    // Build the fully compliant object
    const finalResult: JudicialGuidanceResult = {
      category: apiResult.category || "ROADS",
      priority: apiResult.priority || "LOW",
      toWhom: {
        agencyName: apiResult.toWhom?.agencyName || "Greater Chennai Corporation (GCC)",
        zonalAuthority: apiResult.toWhom?.zonalAuthority || "Local Ward Cell",
      },
      howAndWhere: {
        filingUrgencyText: apiResult.howAndWhere?.filingUrgencyText || "Routine filing timeline determined by general public infrastructure priority factors.",
        siteActionDirective: apiResult.howAndWhere?.siteActionDirective || "Inspect the reported site layout to deploy repairs.",
      },
      onWhatBasis: {
        statuteName: apiResult.onWhatBasis?.statuteName || "Tamil Nadu City Municipal Corporation Act, 1919",
        legalProvision: apiResult.onWhatBasis?.legalProvision || "Section 3 (General Municipal Obligations)",
        rightsExplanation: apiResult.onWhatBasis?.rightsExplanation || "Citizens of Tamil Nadu maintain absolute rights to safe public municipal environments of decent standards.",
      },
      aiTechnicalSummary: apiResult.aiTechnicalSummary || description,
      
      // Backward compatibility bindings
      department: apiResult.toWhom?.agencyName || "Greater Chennai Corporation (GCC)",
      sentiment: sentiment,
      aiSummary: JSON.stringify(apiResult), // Save the entire structural JSON as a string inside aiSummary for UI presentation!
      estimatedResolutionHours: estHours,
    };

    return finalResult;
  } catch (error) {
    console.error("❌ Gemini API analysis failed. Using fallback:", error);
    return runFallbackGuidance(description);
  }
}

function runFallbackGuidance(description: string): JudicialGuidanceResult {
  const descLower = description.toLowerCase();
  
  let category: JudicialGuidanceResult["category"] = "ROADS";
  let priority: JudicialGuidanceResult["priority"] = "LOW";
  let agencyName = "Greater Chennai Corporation (GCC)";
  let zonalAuthority = "Zonal Engineering Office";
  let filingUrgencyText = "Routine maintenance ticket; scheduling based on local municipal operations pipeline.";
  let siteActionDirective = "Dispatch general engineering workforce crews to resurface roads.";
  
  let statuteName = "Tamil Nadu City Municipal Corporation Act, 1919";
  let legalProvision = "Section 218 (Mending and Repairing of Public Streets)";
  let rightsExplanation = "Under state municipal codes, public bodies hold an absolute duty to safeguard the physical soundness of arterial streets.";

  if (descLower.includes("water") || descLower.includes("leak") || descLower.includes("pipe") || descLower.includes("drain")) {
    category = "WATER_SUPPLY";
    priority = "HIGH";
    agencyName = "CMWSSB (Chennai Metropolitan Water Supply and Sewerage Board)";
    zonalAuthority = "Area Distribution Office";
    filingUrgencyText = "High priority water line breach reported; threatens residential supply sanitisation structures.";
    siteActionDirective = "Isolate and shut down local valving structures to replace cracked main PVC connections.";
    statuteName = "Chennai Metropolitan Water Supply and Sewerage Board Act, 1978";
    legalProvision = "Section 32 (Supply of Wholesome Water & Sanitary Standards)";
    rightsExplanation = "The statute holds local distribution agencies directly responsible for safeguarding access to potable water pipelines and sanitation channels.";
  } else if (descLower.includes("electricity") || descLower.includes("power") || descLower.includes("tneb") || descLower.includes("wire") || descLower.includes("transformer")) {
    category = "ELECTRICITY";
    priority = "CRITICAL";
    agencyName = "TANGEDCO (Tamil Nadu Generation and Distribution Corporation)";
    zonalAuthority = "Zonal Substation Cell";
    filingUrgencyText = "Critical live hazard threatening biological security. Requires rapid power shutdown protocol.";
    siteActionDirective = "De-energize target sector feeder segments and dispatch high-voltage lineworkers to restructure broken spans.";
    statuteName = "The Electricity Act, 2003";
    legalProvision = "Section 53 (Provisions relating to safety and electric supply)";
    rightsExplanation = "Operators of public electricity infrastructure are subject to rigorous safety margins under federal law, granting customers rights to secure distribution systems.";
  } else if (descLower.includes("garbage") || descLower.includes("waste") || descLower.includes("sewage") || descLower.includes("trash")) {
    category = "SANITATION";
    priority = "MEDIUM";
    agencyName = "Greater Chennai Corporation (GCC) - Sanitation Dept";
    zonalAuthority = "Zonal Sanitary Inspector Cell";
    filingUrgencyText = "Medium priority litter or bio-accumulation; potential vector-breeding public danger.";
    siteActionDirective = "Dispatch municipal compactors and waste collection teams to clear trash structures.";
    statuteName = "Tamil Nadu Public Health Act, 1939";
    legalProvision = "Section 41 (Duty of Local Authority in respect of scavenging)";
    rightsExplanation = "Local bodies have an absolute liability to continuously scavenge and process trash from central roads to prevent health vector risks.";
  } else if (descLower.includes("bus") || descLower.includes("train") || descLower.includes("transport") || descLower.includes("route") || descLower.includes("traffic")) {
    category = "TRANSPORT";
    priority = "LOW";
    agencyName = "Metropolitan Transport Corporation (MTC), Chennai";
    zonalAuthority = "Operation Depot Control";
    filingUrgencyText = "Routine localized transit gap or routing discrepancy reported.";
    siteActionDirective = "Review bus tracking telemetry records and execute driver dispatch re-alignment sequences.";
    statuteName = "The Motor Vehicles Act, 1988";
    legalProvision = "Section 93 & Section 138 (Passenger convenience guidelines)";
    rightsExplanation = "State municipal providers must operates planned schedules reliably to secure affordable access to critical transit hubs.";
  } else if (descLower.includes("hospital") || descLower.includes("health") || descLower.includes("dengue") || descLower.includes("fever") || descLower.includes("clinic")) {
    category = "PUBLIC_HEALTH";
    priority = "CRITICAL";
    agencyName = "Directorate of Public Health and Preventive Medicine, Tamil Nadu";
    zonalAuthority = "District Preventive Health Cell";
    filingUrgencyText = "Critical infectious vectors or disease clusters reported; threatens health boundaries.";
    siteActionDirective = "Sanitize standing water reservoirs and establish regional fogging containment operations.";
    statuteName = "Tamil Nadu Public Health Act, 1939";
    legalProvision = "Section 83 (Prevention and Control of Vector Breeding & Epidemics)";
    rightsExplanation = "State code asserts that citizens are legally shielded from preventable vector outbreaks and are entitled to proactive health protection.";
  }

  let estHours = 48;
  if (priority === "CRITICAL") estHours = 24;
  else if (priority === "HIGH") estHours = 48;
  else if (priority === "MEDIUM") estHours = 72;
  else estHours = 168;

  let sentiment: "Routine" | "Concerned" | "Urgent" | "Emergency" = "Routine";
  if (priority === "CRITICAL") sentiment = "Emergency";
  else if (priority === "HIGH") sentiment = "Urgent";
  else if (priority === "MEDIUM") sentiment = "Concerned";

  const fallbackObj = {
    category,
    priority,
    toWhom: {
      agencyName,
      zonalAuthority,
    },
    howAndWhere: {
      filingUrgencyText,
      siteActionDirective,
    },
    onWhatBasis: {
      statuteName,
      legalProvision,
      rightsExplanation,
    },
    aiTechnicalSummary: `Local citizen logged automated request matching '${category}' profile in Tamil Nadu context: "${description.substring(0, 60)}..."`,
  };

  return {
    ...fallbackObj,
    department: agencyName,
    sentiment,
    aiSummary: JSON.stringify(fallbackObj),
    estimatedResolutionHours: estHours,
  };
}
