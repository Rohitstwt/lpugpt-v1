import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLlm } from "@/lib/ai/llm";

export async function GET(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");

  const papers = await prisma.questionPaper.findMany({
    where: courseId ? { courseId } : {},
    include: { course: { select: { code: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ papers });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { courseId, title, difficulty, totalMarks, materialIds, topics } = body;

    if (!courseId || !title) {
      return NextResponse.json({ error: "Course ID and exam title are required" }, { status: 400 });
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    let sourceText = "";
    if (materialIds && Array.isArray(materialIds) && materialIds.length > 0) {
      const materials = await prisma.courseMaterial.findMany({
        where: { id: { in: materialIds } },
      });
      sourceText = materials.map((m) => `${m.title}:\n${m.extractedText || ""}`).join("\n\n");
    }

    const promptContext = sourceText
      ? `Base questions on this study material:\n${sourceText.slice(0, 4000)}`
      : `Topics covered: ${topics || course.name}`;

    const systemPrompt = `You are an expert university exam setter for Lovely Professional University (${course.code}: ${course.name}).
Generate a professional ${totalMarks || 50}-mark examination question paper.
Difficulty level: ${difficulty || "Medium"}.

Return ONLY valid JSON matching this exact structure:
{
  "sections": [
    {
      "name": "Section A: Multiple Choice Questions (1 Mark Each)",
      "questions": [
        { "id": 1, "question": "Question text...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "answer": "B", "marks": 1 }
      ]
    },
    {
      "name": "Section B: Short Answer Questions (5 Marks Each)",
      "questions": [
        { "id": 2, "question": "Question text...", "solution": "Brief marking key...", "marks": 5 }
      ]
    },
    {
      "name": "Section C: Long Essay/Analytical Questions (10 Marks Each)",
      "questions": [
        { "id": 3, "question": "Detailed question text...", "solution": "Detailed solution outline...", "marks": 10 }
      ]
    }
  ]
}`;

    let generatedQuestionsStr = "";

    try {
      const llm = getLlm();
      const completion = await llm.client.chat.completions.create({
        model: llm.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Create exam "${title}" for ${course.code}. ${promptContext}` },
        ],
        temperature: 0.6,
      });

      generatedQuestionsStr = completion.choices[0]?.message?.content || "";
      // Clean JSON codeblocks if any
      generatedQuestionsStr = generatedQuestionsStr.replace(/```json[\s\S]*?```/gi, (m) => m.slice(7, -3)).trim();
    } catch {
      // Offline fallback question generator
      generatedQuestionsStr = JSON.stringify({
        sections: [
          {
            name: "Section A: Multiple Choice Questions (1 Mark Each)",
            questions: [
              { id: 1, question: `Which of the following best describes core principles of ${course.name}?`, options: ["A) Linear time complexity", "B) Modular structural design", "C) Unindexed sequential scan", "D) Static heap allocation"], answer: "B", marks: 1 },
              { id: 2, question: `In ${course.code}, what is the primary objective of state optimization?`, options: ["A) Reduce latency", "B) Increase disk footprint", "C) Bypass validation", "D) Disable cache"], answer: "A", marks: 1 }
            ]
          },
          {
            name: "Section B: Short Answer Questions (5 Marks Each)",
            questions: [
              { id: 3, question: `Explain the architectural workflow of ${course.name} with key diagrams.`, solution: "Full credit for defining input validation, pipeline execution, and result verification.", marks: 5 },
              { id: 4, question: `Compare and contrast static vs dynamic execution in ${course.code}.`, solution: "List 3 key differences: compile-time binding, runtime overhead, and flexibility.", marks: 5 }
            ]
          },
          {
            name: "Section C: Long Analytical Questions (10 Marks Each)",
            questions: [
              { id: 5, question: `Design a scalable system module for ${course.name} under high traffic. Detail edge cases, data flow, and error fallback strategy.`, solution: "Comprehensive design breaking down load balancing, queue processing, and fallback mechanisms.", marks: 10 }
            ]
          }
        ]
      });
    }

    const questionPaper = await prisma.questionPaper.create({
      data: {
        courseId: course.id,
        title,
        totalMarks: totalMarks || 50,
        difficulty: difficulty || "Medium",
        questions: generatedQuestionsStr,
      },
    });

    return NextResponse.json({ success: true, paper: questionPaper });
  } catch (err) {
    console.error("Error generating question paper:", err);
    return NextResponse.json({ error: "Failed to generate question paper" }, { status: 500 });
  }
}
