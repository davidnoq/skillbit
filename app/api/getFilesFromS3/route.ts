import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "../database/prismaConnection";

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
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const files = await generateFilesFromPrompt(model, prompt);

      if (!Array.isArray(files) || files.length === 0) {
        throw new Error("No files were generated from the prompt.");
      }

      console.log("files:", files);

      //Loop through generated files and insert them into S3 Bucket
      for (const f of files) {
        // Determine file type based on extension
        const fileExtension = f.name.split(".").pop()?.toLowerCase();

        // Map common extensions to their language
        const extensionToLanguageMap: Record<string, string> = {
          py: "python",
          js: "javascript",
          ts: "typescript",
          jsx: "javascript",
          tsx: "typescript",
          html: "html",
          css: "css",
          java: "java",
          cpp: "cpp",
          c: "c",
          sql: "sql",
          php: "php",
          rb: "ruby",
          go: "go",
          rs: "rust",
          swift: "swift",
          kt: "kotlin",
          cs: "csharp",
        };

        const fileLanguage = fileExtension
          ? extensionToLanguageMap[fileExtension] || "text"
          : "text";

        // Determine appropriate directory structure based on language
        let fileKey = `${testId}/`;

        if (fileLanguage === "python") {
          // Python files go directly in the test directory
          fileKey += f.name;
        } else if (
          fileLanguage === "javascript" ||
          fileLanguage === "typescript"
        ) {
          // JS/TS files go in project/src
          fileKey += `project/src/${f.name}`;
        } else {
          // Other languages follow their own conventions
          // For now, place them in the root directory
          fileKey += f.name;
        }

        const params = {
          Bucket: "skillbit-inprogress",
          Key: fileKey,
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
    // Extract language information from the prompt for better context
    const languageMatch = prompt.match(
      /Please use (\w+) as the primary programming language/i
    );
    const primaryLanguage = languageMatch ? languageMatch[1] : null;

    // Add specific instructions based on language
    let enhancedPrompt = prompt;
    if (primaryLanguage) {
      enhancedPrompt += `\n\nMake sure all generated files use ${primaryLanguage} as the primary language and follow best practices for ${primaryLanguage} development.`;
    }

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: enhancedPrompt }] }],
    });

    const response = await result.response.text();

    console.log("Raw response:", response);

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

async function getPrompt(id: string) {
  try {
    const testData = await prisma.testID.findUnique({
      where: {
        id: id,
      },
      select: {
        template: {
          select: {
            prompt: true,
            language: true,
            framework: true,
            type: true,
          },
        },
      },
    });

    const userPart = testData?.template?.prompt || "";
    const language = testData?.template?.language || "";
    const framework = testData?.template?.framework || "";
    const questionType = testData?.template?.type || "";

    // Add language and framework preferences to the prompt
    let enhancedPrompt = userPart;

    if (language) {
      enhancedPrompt += `\n\nPlease use ${language} as the primary programming language for this problem.`;

      if (framework) {
        enhancedPrompt += ` Use the ${framework} framework.`;
      }
    }

    if (questionType) {
      enhancedPrompt += `\n\nThis is a ${questionType.toLowerCase()}.`;
    }

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

    return enhancedPrompt + systemPart;
  } catch (error) {
    console.error(error);
    return null;
  }
}
