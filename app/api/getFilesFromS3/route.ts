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
      let prompt = await getPrompt(testId);

      console.log("Original prompt:", prompt);

      if (!prompt || prompt.length == 0) {
        return NextResponse.json(
          { error: "Prompt not found for the provided 'testId'." },
          { status: 404 }
        );
      }

      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      // Step 1: First pass to Gemini to verify safety and format the prompt
      const formattedPrompt = await verifyAndFormatPrompt(model, prompt);
      console.log("Formatted prompt:", formattedPrompt);

      // Step 2: Second pass to Gemini to generate files (using the formatted prompt)
      const files = await generateFilesFromPrompt(model, formattedPrompt);

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

async function verifyAndFormatPrompt(
  model: any,
  originalPrompt: string
): Promise<string> {
  try {
    const verificationPrompt = `
I have a coding challenge prompt that needs verification and formatting. 

First, verify that this prompt meets safety standards:
- It should not contain harmful, offensive, or inappropriate content
- It should be appropriate for a professional coding assessment
- It should be clear and have well-defined requirements

Second, format the prompt to be clear and structured with:
- A clear problem statement
- Specific requirements
- Any constraints or specifications
- Expected deliverables

DO NOT include any code examples or implementation in your response, just format the prompt itself.
For python, it should always be one file with no tests files. If you are supposed to input bugs, make sure to not include them in the output at all.
Here's the original prompt:
${originalPrompt}

Please respond with:
1. A brief assessment of whether the prompt meets safety and quality standards
2. The formatted prompt that should be used for code generation

Make sure the formatted prompt does NOT include any test cases, example solutions, or answers. The prompt should only describe the problem to be solved without providing any implementation details or expected outputs. Remove any existing test cases or solutions from the prompt before formatting.

If the original prompt contains test cases or solutions, they must be completely removed. The formatted prompt should only contain:
1. Problem description
2. Requirements
3. Constraints
4. Expected input/output format (without examples)

The new prompt must specify that there should be no test cases, example solutions, or answers.
`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: verificationPrompt }] }],
    });

    const response = await result.response.text();
    console.log("Verification response:", response);

    // Extract the formatted prompt section from the response
    let formattedPrompt = originalPrompt;

    // Try different regex patterns to find the formatted prompt
    const formatPatterns = [
      /formatted prompt that should be used for code generation:?([\s\S]+)/i,
      /2\.\s*((?:(?!^[0-9]+\.).)+)/im, // Numbered list item 2
      /formatted prompt:([\s\S]+)/i,
    ];

    for (const pattern of formatPatterns) {
      const match = response.match(pattern);
      if (match && match[1] && match[1].trim().length > 0) {
        formattedPrompt = match[1].trim();
        console.log("Found formatted prompt using pattern:", pattern);
        console.log("Formatted prompt:", formattedPrompt);
        break;
      }
    }

    if (formattedPrompt === originalPrompt) {
      // If no patterns matched, take the whole response as the formatted prompt
      // as it might still be better than the original
      formattedPrompt = response.trim();
      console.log("Using entire response as formatted prompt");
    }

    // Now call Gemini again with clearer schema instructions
    const schemaFormattingPrompt = `
I need you to convert the following coding challenge prompt into a valid JSON format that matches this schema:
${getSchemaFormatInstructions()}

The prompt is:
${formattedPrompt}

Your response must be ONLY the valid JSON object, nothing else. No explanations, no code samples, just the JSON object.
`;

    const schemaResult = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: schemaFormattingPrompt }] }],
    });

    const schemaResponse = await schemaResult.response.text();
    console.log("Schema formatting response:", schemaResponse);

    // Ensure the response is valid JSON
    try {
      // Validate by parsing
      JSON.parse(schemaResponse.trim());
      // If valid, return the JSON string directly
      return schemaResponse.trim();
    } catch (error) {
      console.error("Invalid JSON from schema formatting:", error);
      // Fall back to the original prompt with schema instructions
      return originalPrompt + getSchemaFormatInstructions();
    }
  } catch (error: any) {
    console.error("Failed to verify and format prompt:", error);
    // Return the original prompt on error as fallback
    return originalPrompt + getSchemaFormatInstructions();
  }
}

function getSchemaFormatInstructions(): string {
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

  return `
The response should be valid JSON matching this schema:
${JSON.stringify(schema, null, 2)}

Example of a valid response:
{
  "files": [
    {
      "filename": "app.js",
      "content": "console.log('Hello world');\\n// More code here",
      "language": "javascript"
    },
    {
      "filename": "styles.css",
      "content": "body {\\n  margin: 0;\\n}",
      "language": "css"
    }
  ]
}

Make sure to escape newlines with \\n in the content.
Provide ONLY the JSON object in your response, no additional text or explanations.`;
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

    // Check if the prompt is already in JSON format
    let files = [];
    try {
      const parsedPrompt = JSON.parse(prompt);
      if (parsedPrompt.files && Array.isArray(parsedPrompt.files)) {
        console.log("Prompt is already in JSON format, using directly");
        return parsedPrompt.files.map((file: any) => ({
          name: file.filename,
          content: file.content.replace(/\\n/g, "\n"),
        }));
      }
    } catch (e) {
      // Not JSON, continue with normal flow
      console.log("Prompt is not in JSON format, generating content");
    }

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

    // Try to parse the response as JSON
    try {
      const parsed = JSON.parse(response.trim());
      if (parsed.files && Array.isArray(parsed.files)) {
        // Process the generated files to replace '\\n' with actual newlines
        return parsed.files.map(
          (file: { filename: string; content: string }) => ({
            name: file.filename,
            content: file.content.replace(/\\n/g, "\n"),
          })
        );
      }
    } catch (e) {
      console.log("Failed direct parsing, attempting to extract JSON:", e);
    }

    // If direct parsing fails, try to extract JSON from the response
    // Clean the response to ensure it's valid JSON
    const cleanedResponse = response.replace(/```json|```/g, "").trim();

    // Find the JSON object in the response
    const jsonStart = cleanedResponse.indexOf("{");
    const jsonEnd = cleanedResponse.lastIndexOf("}") + 1;

    if (jsonStart === -1 || jsonEnd <= jsonStart) {
      throw new Error("Could not find valid JSON in the response");
    }

    const jsonResponse = cleanedResponse.substring(jsonStart, jsonEnd);

    try {
      const parsed = JSON.parse(jsonResponse);
      const generatedFiles = parsed.files;

      console.log("generatedFiles:", generatedFiles);

      if (!Array.isArray(generatedFiles)) {
        throw new Error("Generated files are not in an array format.");
      }

      // Process the generated files to replace '\\n' with actual newlines
      return generatedFiles.map(
        (file: { filename: string; content: string }) => ({
          name: file.filename,
          content: file.content.replace(/\\n/g, "\n"),
        })
      );
    } catch (error) {
      console.error("Failed to parse JSON after cleaning:", error);
      throw new Error("The API response could not be parsed as valid JSON.");
    }
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

    return enhancedPrompt;
  } catch (error) {
    console.error(error);
    return null;
  }
}
