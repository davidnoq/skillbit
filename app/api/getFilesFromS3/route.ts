import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "../database/prismaConnection";
import { updateInstructions } from "../database/actions";

// Import necessary modules from AWS SDK
// @ts-nocheck
const { NextResponse } = require("next/server");
const {
  S3Client,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// Initialize an S3 client with provided credentials
const s3Client = new S3Client({
  region: process.env.S3_REGION, // Specify the AWS region from environment variables
  credentials: {
    accessKeyId: process.env.S3_ACCESSKEYID, // Access key ID from environment variables
    secretAccessKey: process.env.S3_SECRETACCESSKEY, // Secret access key from environment variables
  },
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_ACCESSKEY || "");

export async function POST(req: Request) {
  try {
    // Parse request body
    const { testId, recruiter } = await req.json();

    if (!testId) {
      return NextResponse.json(
        { error: "Invalid input. Provide a 'testId'." },
        { status: 400 }
      );
    }

    // List all objects under the folder (testId)
    const listParams = {
      Bucket: "skillbit-inprogress",
      Prefix: `${testId}/`, // Fetch all files under this folder
    };

    const listCommand = new ListObjectsV2Command(listParams);
    const listResponse = await s3Client.send(listCommand);

    if (
      recruiter &&
      (!listResponse.Contents || listResponse.Contents.length === 0)
    ) {
      return NextResponse.json({ message: "No files found in the folder." });
    }
    if (
      !recruiter &&
      (!listResponse.Contents || listResponse.Contents.length === 0)
    ) {
      const prompt = await getPrompt(testId);

      console.log(prompt);

      if (!prompt || prompt.length == 0) {
        return NextResponse.json(
          { error: "Prompt not found for the provided 'testId'." },
          { status: 404 }
        );
      }

      //Generate files for S3 bucket
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const files = await generateFilesFromPrompt(
        model,
        `You are creating files for a technical problem that job applicants will solve. Here is the prompt: ${prompt}`
      );

      if (!Array.isArray(files) || files.length === 0) {
        throw new Error("No files were generated from the prompt.");
      }

      console.log("files:", files);

      //Loop through generated files and insert them into S3 Bucket
      for (const f of files) {
        // Determine if it's a Python file
        const isPythonFile = f.name.toLowerCase().endsWith(".py");

        const params = {
          Bucket: "skillbit-inprogress",
          // For Python files, save directly in the test directory, for JS files use project/src
          Key: `${testId}/${isPythonFile ? "" : "project/src/"}${f.name}`,
          Body: f.content,
          ContentType: "text/plain", // Adjust content type based on your file type
        };

        await s3Client.send(new PutObjectCommand(params));
      }

      const newListResponse = await s3Client.send(listCommand);

      const filesWithContent = newListResponse.Contents
        ? await Promise.all(
            newListResponse.Contents.map(async (file: any) => {
              const getCommand = new GetObjectCommand({
                Bucket: "skillbit-inprogress",
                Key: file.Key,
              });

              const response = await s3Client.send(getCommand);
              const content = await streamToString(response.Body);

              return { fileName: file.Key, content };
            })
          )
        : [];

      console.log("filesWithContent:", filesWithContent);

      const instructionsPrompt = await getPromptInstructions(testId);

      //creating instructions
      const instructions = await generateInstructionsFromPrompt(
        model,
        `AI has generated files for a technical problem that job applicants will solve. Here is the prompt that generated said files: ${instructionsPrompt}. Now, create the instructions that the job applicants will see to solve the problem. For example, it could follow the form \'Your goal is to...\'`
      );

      //adding instructions to the db
      const instructionsUpdated = await updateInstructions(
        testId,
        instructions
      );

      if (instructionsUpdated != "Success") {
        throw new Error("Failed to update instructions in the database.");
      }

      return NextResponse.json({ files: filesWithContent });
    }

    const filesWithContent = listResponse.Contents
      ? await Promise.all(
          listResponse.Contents.map(async (file: any) => {
            const getCommand = new GetObjectCommand({
              Bucket: "skillbit-inprogress",
              Key: file.Key,
            });

            const response = await s3Client.send(getCommand);
            const content = await streamToString(response.Body);

            return { fileName: file.Key, content };
          })
        )
      : [];

    console.log("filesWithContent:", filesWithContent);

    return NextResponse.json({ files: filesWithContent });
  } catch (error: any) {
    console.error("Error retrieving file:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper function to convert stream to string
async function streamToString(stream: any) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

async function generateFilesFromPrompt(
  model: any,
  prompt: string
): Promise<Array<{ name: any; content: string }>> {
  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const response = await result.response.text();

    console.log("Raw files:", response);

    // Clean the response to ensure it's valid JSON
    const cleanedResponse = response.replace(/```json|```/g, "").trim();

    const jsonStart = cleanedResponse.indexOf("{");
    const jsonEnd = cleanedResponse.lastIndexOf("}") + 1;
    const jsonResponse = cleanedResponse.substring(jsonStart, jsonEnd);

    const parsed = JSON.parse(jsonResponse);
    const generatedFiles = parsed.files;

    console.log("generatedFiles:", generatedFiles);

    if (!Array.isArray(generatedFiles)) {
      throw new Error("Generated files are not in an array format.");
    }

    // Process the generated files to replace '\\n' with actual newlines
    const processedFiles = generatedFiles.map(
      (file: { filename: string; content: string }) => ({
        name: file.filename,
        content: file.content.replace(/\\n/g, "\n"),
      })
    );

    return processedFiles;
  } catch (error: any) {
    console.error("Failed to generate files from prompt:", error);
    throw new Error("Failed to generate files from the prompt.");
  }
}

async function generateInstructionsFromPrompt(
  model: any,
  prompt: string
): Promise<string> {
  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const response = await result.response.text();
    console.log("Raw instructions:", response);

    // Clean the response to ensure valid JSON (if applicable)
    const cleanedResponse = response.replace(/```json|```/g, "").trim();

    try {
      const parsed = JSON.parse(cleanedResponse);
      if (parsed.instructions) {
        return parsed.instructions.replace(/\\n/g, "\n"); // Handle escaped newlines
      }
    } catch (jsonError) {
      console.warn("Response was not JSON, returning raw text.");
    }

    // If not JSON, assume the response is the instruction text
    return cleanedResponse;
  } catch (error: any) {
    console.error("Failed to generate instructions:", error);
    throw new Error("Failed to generate instructions from the prompt.");
  }
}

async function getPrompt(id: string) {
  try {
    const prompt = await prisma.testID.findUnique({
      where: {
        id: id,
      },
      select: {
        template: {
          select: {
            prompt: true,
          },
        },
      },
    });
    const userPart = prompt?.template?.prompt;

    const schema = {
      type: "object",
      properties: {
        files: {
          type: "array",
          items: {
            type: "object",
            properties: {
              filename: {
                type: "string",
                description: "The path and name of the file",
              },
              content: {
                type: "string",
                description: "The content of the file",
              },
              language: {
                type: "string",
                description: "The programming language of the file",
              },
            },
            required: ["filename", "content", "language"],
          },
        },
      },
      required: ["files"],
    };

    const systemPart = ` The response should be valid JSON matching this schema:
    ${JSON.stringify(schema, null, 2)}
    
    Make sure to escape newlines with \\n in the content.`;

    return userPart + systemPart;
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function getPromptInstructions(id: string) {
  try {
    const prompt = await prisma.testID.findUnique({
      where: {
        id: id,
      },
      select: {
        template: {
          select: {
            prompt: true,
          },
        },
      },
    });
    const userPart = prompt?.template?.prompt;

    return userPart;
  } catch (error) {
    console.error(error);
    return null;
  }
}
