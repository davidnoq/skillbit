import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "../database/prismaConnection";

// Import necessary modules from AWS SDK
// @ts-nocheck
const { NextResponse } = require("next/server");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_ACCESSKEY || "");

import { gradingInsightsGenerator } from "./gradingInsights";

export async function POST(req: Request) {
  try {
    // Parse request body
    console.log("grading insights:");
    const { files, instructions, testId } = await req.json();

    const gradingInsightsResponse = await gradingInsightsGenerator(
      files,
      instructions,
      testId
    );

    if (gradingInsightsResponse == "Invalid input. Provide all parameters.") {
      return NextResponse.json(
        { error: "Invalid input. Provide all parameters." },
        { status: 400 }
      );
    }

    return NextResponse.json({ gradingInsightsResponse });
  } catch (error: any) {
    console.error("Error retrieving file:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
