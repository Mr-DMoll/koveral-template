import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@repo/database";



const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});


export interface GeneratedMilestone {
  title:        string;
  description:  string;
  deliverables: string[];
  dueWeeks:     number;   // weeks from project start
  budgetPct:    number;   // percentage of total budget
  tasks: {
    title:       string;
    description: string;
    priority:    "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    estimateDays: number;
  }[];
}



// ─── SCOPE WORKER ─────────────────────────────────────────────────────────────
// Reads the intake form for a project and generates a full scope document.
// Returns the markdown string. Caller is responsible for saving it.

export async function scopeWorker(projectId: string): Promise<string> {
  // Load project with intake form
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      intakeForm: true,
      client: {
        select: { firstName: true, lastName: true, displayName: true, email: true },
      },
      manager: {
        select: { firstName: true, lastName: true, displayName: true, email: true },
      },
    },
  });

  if (!project) throw new Error("Project not found");

  const intake = project.intakeForm;

  // Build context from whatever we have
  const clientName  = intake?.clientName  ?? project.client?.displayName ?? project.client?.email ?? "Client";
  const companyName = intake?.companyName ?? "";
  const projectName = project.name;
  const projectType = intake?.projectType ?? "software project";
  const description = intake?.description ?? project.description ?? "No description provided";
  const budget      = intake?.budgetRange  ?? (project.budget ? `ZAR ${project.budget}` : "To be confirmed");
  const timeline    = intake?.preferredTimeline ?? (project.deadline ? `Deadline: ${new Date(project.deadline).toLocaleDateString()}` : "To be confirmed");
  const references  = intake?.referenceLinks?.length ? intake.referenceLinks.join(", ") : "None provided";

  const prompt = `You are a senior software project manager at Koveral, a South African software agency. 
Generate a professional project scope document for the following project.

PROJECT DETAILS:
- Client: ${clientName}${companyName ? ` (${companyName})` : ""}
- Project Name: ${projectName}
- Project Type: ${projectType}
- Description: ${description}
- Budget: ${budget}
- Timeline: ${timeline}
- Reference Links: ${references}

Generate a comprehensive scope document in Markdown format. The document must include:

1. **Executive Summary** — Brief overview of the project and its objectives
2. **Project Objectives** — 3-5 clear, measurable objectives
3. **Scope of Work** — Detailed breakdown of what is included
4. **Out of Scope** — What is explicitly NOT included (important for managing expectations)
5. **Technical Stack Recommendation** — Recommended technologies based on the project type
6. **Project Milestones** — 4-6 milestones with descriptions and suggested timeframes
7. **Deliverables** — Complete list of all deliverables
8. **Assumptions** — Key assumptions made in scoping this project
9. **Risks & Mitigations** — 3-4 potential risks and how they will be managed
10. **Next Steps** — What happens after the client approves this scope

Write in a professional but clear tone. Use South African Rand (ZAR) for any financial references.
Be specific and realistic. Do not use placeholder text.
Format beautifully with proper Markdown — use headers, bullet points, and tables where appropriate.`;

  const message = await anthropic.messages.create({
    model:      "claude-haiku-4-5-20251001",
    max_tokens: 4000,
    messages:   [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type from Claude");

  return content.text;
}

// ─── CONTRACT WORKER ──────────────────────────────────────────────────────────
// Reads the approved scope document and generates a contract.

export async function contractWorker(projectId: string): Promise<string> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client:  { select: { firstName: true, lastName: true, displayName: true, email: true } },
      manager: { select: { firstName: true, lastName: true, displayName: true, email: true } },
      milestones: {
        select: { title: true, agreedAmount: true, dueDate: true, deliverables: true },
        orderBy: { order: "asc" },
      },
      documents: {
        where:   { type: "SCOPE", isLatest: true },
        select:  { content: true, title: true },
        orderBy: { createdAt: "desc" },
        take:    1,
      },
    },
  });

  if (!project) throw new Error("Project not found");

  const scopeDoc    = project.documents[0];
  const clientName  = project.client?.displayName ?? project.client?.email ?? "Client";
  const totalBudget = project.budget ? `ZAR ${project.budget}` : "As per milestones";

  const milestonesText = project.milestones.map((m, i) =>
    `Milestone ${i + 1}: ${m.title} — ZAR ${m.agreedAmount ?? "TBD"} — Due: ${m.dueDate ? new Date(m.dueDate).toLocaleDateString() : "TBD"}`
  ).join("\n");

  const prompt = `You are a legal document writer at Koveral, a South African software agency.
Generate a professional software development contract in Markdown format.

PROJECT CONTEXT:
- Client: ${clientName}
- Project: ${project.name}
- Total Budget: ${totalBudget}
- Agency: Koveral

APPROVED SCOPE:
${scopeDoc?.content ?? "Scope to be attached"}

MILESTONES & PAYMENT SCHEDULE:
${milestonesText || "To be confirmed"}

Generate a complete contract that includes:

1. **Parties** — Full details of both parties
2. **Project Description** — Summary of the work to be performed
3. **Scope of Work** — Reference to approved scope document
4. **Payment Terms** — Milestone-based payment schedule, due dates, late payment terms
5. **Intellectual Property** — Who owns the code and assets upon full payment
6. **Confidentiality** — NDA terms
7. **Revision Policy** — Number of revisions included, cost of additional revisions
8. **Timeline & Delivery** — Project timeline and delivery conditions
9. **Warranties** — What Koveral warrants about the delivered software
10. **Limitation of Liability** — Standard liability limitations
11. **Termination** — Conditions under which either party can terminate
12. **Dispute Resolution** — South African jurisdiction, mediation first
13. **Signatures** — Signature blocks for both parties

Use professional legal language appropriate for South Africa. Reference the Consumer Protection Act where relevant.
Include today's date: ${new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}.`;

  const message = await anthropic.messages.create({
    model:      "claude-haiku-4-5-20251001",
    max_tokens: 4000,
    messages:   [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type from Claude");

  return content.text;
}



export async function taskGeneratorWorker(projectId: string): Promise<GeneratedMilestone[]> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      documents: {
        where:   { type: "SCOPE", isLatest: true },
        select:  { content: true },
        take:    1,
      },
      members: {
        select: {
          role: true,
          user: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
      },
      milestones: { select: { id: true } },
    },
  });

  if (!project) throw new Error("Project not found");

  const scopeContent = project.documents[0]?.content;
  if (!scopeContent) throw new Error("No scope document found. Generate a scope first.");

  const budget    = project.budget ? `ZAR ${project.budget}` : "Not set";
  const startDate = project.startDate ? new Date(project.startDate).toLocaleDateString() : "TBD";
  const deadline  = project.deadline  ? new Date(project.deadline).toLocaleDateString()  : "TBD";

  const prompt = `You are a senior project manager. Based on the scope document below, generate a detailed project plan with milestones and tasks.

PROJECT INFO:
- Budget: ${budget}
- Start: ${startDate}
- Deadline: ${deadline}

SCOPE DOCUMENT:
${scopeContent}

Generate a JSON response with this exact structure — no markdown, no explanation, just the JSON array:

[
  {
    "title": "Milestone name",
    "description": "What this milestone covers",
    "deliverables": ["deliverable 1", "deliverable 2"],
    "dueWeeks": 2,
    "budgetPct": 20,
    "tasks": [
      {
        "title": "Task name",
        "description": "What needs to be done",
        "priority": "HIGH",
        "estimateDays": 3
      }
    ]
  }
]

Rules:
- Create 4-6 milestones that cover the full project lifecycle
- Each milestone should have 3-4 tasks maximum
- Keep task descriptions concise — one sentence each
- budgetPct values must sum to 100
- dueWeeks should be realistic and sequential
- Priority must be one of: LOW, MEDIUM, HIGH, CRITICAL
- Be specific — no generic tasks like "Development" — use "Implement user authentication with JWT"
- Tasks should be granular enough for a developer to action in 1-5 days`;

  const message = await anthropic.messages.create({
    model:      "claude-haiku-4-5-20251001",
    max_tokens: 8000,
    messages:   [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response from Claude");

   // Extract JSON — handle markdown fences, preamble text, etc.
  let raw = content.text;

  // Strip markdown fences
  raw = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "");

  // Find the JSON array — look for first [ and last ]
  const startIdx = raw.indexOf("[");
  const endIdx   = raw.lastIndexOf("]");

  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`Could not find JSON array in response. Raw: ${raw.slice(0, 200)}`);
  }

  raw = raw.slice(startIdx, endIdx + 1).trim();

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("Expected array");
    return parsed as GeneratedMilestone[];
  } catch (e: any) {
    throw new Error(`JSON parse failed: ${e.message}. Raw snippet: ${raw.slice(0, 200)}`);
  }
 
}

// ─── HANDOVER WORKER ─────────────────────────────────────────────────────────
// Generates a handover document when a project is complete.

export async function handoverWorker(projectId: string): Promise<string> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client:  { select: { firstName: true, lastName: true, displayName: true, email: true } },
      manager: { select: { firstName: true, lastName: true, displayName: true, email: true } },
      milestones: {
        select: { title: true, status: true, deliverables: true, completedAt: true },
        orderBy: { order: "asc" },
      },
      documents: {
        where:   { isLatest: true },
        select:  { type: true, title: true, content: true },
      },
    },
  });

  if (!project) throw new Error("Project not found");

  const clientName  = project.client?.displayName  ?? project.client?.email  ?? "Client";
  const managerName = project.manager?.displayName ?? project.manager?.email ?? "Manager";

  const milestonesSummary = project.milestones
    .map((m) => `- ${m.title}: ${m.status}${m.completedAt ? ` (completed ${new Date(m.completedAt).toLocaleDateString()})` : ""}`)
    .join("\n");

  const scopeDoc = project.documents.find((d) => d.type === "SCOPE");

  const prompt = `You are a senior project manager at Koveral completing a software project handover.
Generate a comprehensive handover document in Markdown format.

PROJECT DETAILS:
- Project: ${project.name}
- Client: ${clientName}
- Manager: ${managerName}
- Repository: ${project.repositoryUrl ?? "To be provided"}
- Live Site: ${project.liveSiteUrl ?? "To be provided"}
- Figma: ${project.figmaUrl ?? "N/A"}
- Completed: ${new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}

MILESTONES COMPLETED:
${milestonesSummary}

ORIGINAL SCOPE SUMMARY:
${scopeDoc?.content?.slice(0, 1000) ?? "See scope document"}

Generate a handover document that includes:

1. **Project Summary** — What was built and its purpose
2. **What Was Delivered** — Complete list of all deliverables
3. **Technical Overview** — Architecture, tech stack, key decisions
4. **Access & Credentials** — Placeholder table for all credentials (repo, hosting, database, APIs)
5. **Deployment Guide** — How to deploy updates
6. **Maintenance Guide** — How to handle common tasks (backups, updates, monitoring)
7. **Known Issues & Limitations** — Any technical debt or known issues
8. **Support & Warranty** — Koveral's support terms post-launch
9. **Next Steps** — Recommended future enhancements

Write professionally. Include a note that credentials in section 4 must be filled in by the project manager before sending to the client.`;

  const message = await anthropic.messages.create({
    model:      "claude-haiku-4-5-20251001",
    max_tokens: 3000,
    messages:   [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response from Claude");
  return content.text;
}


export async function changeRequestWorker(
  projectId:       string,
  changeRequestId: string,
): Promise<string> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client:  { select: { firstName: true, lastName: true, displayName: true, email: true } },
      manager: { select: { firstName: true, lastName: true, displayName: true, email: true } },
      documents: {
        where:   { type: "SCOPE", isLatest: true },
        select:  { content: true },
        take:    1,
      },
    },
  });

  if (!project) throw new Error("Project not found");

  const changeRequest = await prisma.changeRequest.findUnique({
    where: { id: changeRequestId },
  });

  if (!changeRequest) throw new Error("Change request not found");

  const clientName  = project.client?.displayName  ?? project.client?.email  ?? "Client";
  const managerName = project.manager?.displayName ?? project.manager?.email ?? "Manager";
  const scopeSummary = project.documents[0]?.content?.slice(0, 800) ?? "See original scope document";

  const prompt = `You are a senior project manager at Koveral generating a formal change request document.

PROJECT: ${project.name}
CLIENT: ${clientName}
MANAGER: ${managerName}
DATE: ${new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}

CHANGE REQUEST DETAILS:
- Type: ${changeRequest.type}
- Description: ${changeRequest.description}
- Requested Price: ${changeRequest.price ? `ZAR ${changeRequest.price}` : "To be confirmed"}

ORIGINAL SCOPE SUMMARY:
${scopeSummary}

Generate a professional Change Request document in Markdown that includes:

1. **Change Request Reference** — A reference number and date
2. **Background** — Why this change is being requested
3. **Description of Change** — Exactly what is being added or modified
4. **Impact on Original Scope** — What this changes from the original agreement
5. **Impact on Timeline** — How many additional days/weeks this adds
6. **Additional Cost** — The cost breakdown for this change
7. **Payment Terms** — When this additional amount is due
8. **Acceptance** — Signature blocks for both parties

Be specific and professional. This document protects both the agency and the client.
Keep it concise — one page maximum.`;

  const message = await anthropic.messages.create({
    model:      "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    messages:   [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response from Claude");
  return content.text;
}