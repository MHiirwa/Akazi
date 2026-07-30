import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import swaggerPaths from "../../docs/swagger.ts";
const enumStr = (values, example) => ({
  type: "string",
  enum: values,
  example: example ?? values[0],
});
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Akazi API",
      version: "1.0.0",
      description:
        "REST API for Akazi — a job platform connecting job seekers, freelancers, and employers. Auth uses JWT bearer tokens; obtain one from POST /auth/login or /auth/register, then click Authorize.",
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3e3}/api`,
        description: "Local development server",
      },
    ],
    tags: [
      {
        name: "Auth",
        description: "Registration, login, profile, password reset, avatar",
      },
      {
        name: "Jobs",
        description: "Browse, view, post, and manage job listings",
      },
      {
        name: "Applications",
        description: "Apply to jobs and manage applications",
      },
      {
        name: "Admin",
        description: "User management and job moderation (admin only)",
      },
      {
        name: "Reviews",
        description: "Employer reviews by shortlisted seekers",
      },
      {
        name: "Stats",
        description: "Aggregate stats for jobs and users (cached)",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: { type: "string", example: "Something went wrong" },
          },
        },
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            email: {
              type: "string",
              format: "email",
              example: "seeker@akazi.test",
            },
            fullName: { type: "string", example: "Eric Mugisha" },
            role: enumStr(
              ["JOB_SEEKER", "EMPLOYER", "ADMIN"],
              "JOB_SEEKER",
            ),
            phone: { type: "string", nullable: true, example: "+250788123456" },
            skills: {
              type: "array",
              items: { type: "string" },
              example: ["React", "Node.js"],
            },
            avatarUrl: {
              type: "string",
              nullable: true,
              example: "https://res.cloudinary.com/…/avatar.jpg",
            },
            employerStatus: enumStr(
              ["PENDING", "VERIFIED", "REJECTED"],
              "PENDING",
            ),
            isSuspended: { type: "boolean", example: false },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            token: { type: "string", example: "eyJhbGciOiJIUzI1NiJ9…" },
            user: { $ref: "#/components/schemas/User" },
          },
        },
        Job: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            title: { type: "string", example: "Backend Engineer" },
            description: { type: "string" },
            location: { type: "string", example: "Kigali" },
            industry: { type: "string", example: "Technology" },
            jobType: enumStr(
              ["FULL_TIME", "PART_TIME", "CONTRACT", "FREELANCE", "INTERNSHIP"],
              "FULL_TIME",
            ),
            salaryMin: { type: "integer", nullable: true, example: 8e5 },
            salaryMax: { type: "integer", nullable: true, example: 15e5 },
            status: enumStr(["DRAFT", "PUBLISHED", "REMOVED"], "PUBLISHED"),
            employerId: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Application: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            status: enumStr(
              ["SUBMITTED", "WITHDRAWN", "REVIEWED", "REJECTED", "ACCEPTED"],
              "SUBMITTED",
            ),
            jobId: { type: "string", format: "uuid" },
            applicantId: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Review: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            rating: { type: "integer", minimum: 1, maximum: 5, example: 5 },
            comment: { type: "string", example: "Great, responsive employer." },
            employerId: { type: "string", format: "uuid" },
            authorId: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        CreateReviewInput: {
          type: "object",
          required: ["rating", "comment"],
          properties: {
            rating: { type: "integer", minimum: 1, maximum: 5, example: 5 },
            comment: {
              type: "string",
              example: "Clear process and quick decisions.",
            },
          },
        },
        RegisterInput: {
          type: "object",
          required: ["fullName", "email", "password", "role"],
          properties: {
            fullName: { type: "string", example: "Eric Mugisha" },
            email: {
              type: "string",
              format: "email",
              example: "eric@example.com",
            },
            password: { type: "string", minLength: 8, example: "Password123" },
            phone: { type: "string", example: "+250788123456" },
            role: enumStr(
              ["JOB_SEEKER", "EMPLOYER"],
              "JOB_SEEKER",
            ),
          },
        },
        LoginInput: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "seeker@akazi.test",
            },
            password: { type: "string", example: "Password123" },
          },
        },
        GoogleAuthInput: {
          type: "object",
          required: ["accessToken"],
          properties: {
            accessToken: { type: "string" },
            role: enumStr(["JOB_SEEKER", "EMPLOYER"], "JOB_SEEKER"),
          },
        },
        ForgotPasswordInput: {
          type: "object",
          required: ["email"],
          properties: { email: { type: "string", format: "email" } },
        },
        ResetPasswordInput: {
          type: "object",
          required: ["token", "password"],
          properties: {
            token: { type: "string" },
            password: { type: "string", minLength: 8 },
          },
        },
        UpdateProfileInput: {
          type: "object",
          description: "At least one field is required.",
          properties: {
            fullName: { type: "string" },
            phone: { type: "string" },
            skills: { type: "array", items: { type: "string" } },
          },
        },
        CreateJobInput: {
          type: "object",
          required: ["title", "description", "location", "industry", "jobType"],
          properties: {
            title: {
              type: "string",
              minLength: 3,
              example: "Backend Engineer",
            },
            description: { type: "string", minLength: 20 },
            location: { type: "string", example: "Kigali" },
            industry: { type: "string", example: "Technology" },
            jobType: enumStr(
              ["FULL_TIME", "PART_TIME", "CONTRACT", "FREELANCE", "INTERNSHIP"],
              "FULL_TIME",
            ),
            salaryMin: { type: "integer", example: 8e5 },
            salaryMax: { type: "integer", example: 15e5 },
          },
        },
        ApplyInput: {
          type: "object",
          required: ["jobId"],
          properties: { jobId: { type: "string", format: "uuid" } },
        },
        UpdateApplicationStatusInput: {
          type: "object",
          required: ["status"],
          properties: {
            status: enumStr(["REVIEWED", "REJECTED", "ACCEPTED"], "ACCEPTED"),
          },
        },
        SuspendInput: {
          type: "object",
          required: ["suspended"],
          properties: { suspended: { type: "boolean", example: true } },
        },
        EmployerStatusInput: {
          type: "object",
          required: ["status"],
          properties: {
            status: enumStr(["PENDING", "VERIFIED", "REJECTED"], "VERIFIED"),
          },
        },
      },
    },
    paths: swaggerPaths,
  },
  apis: [],
};
const swaggerSpec = swaggerJsdoc(options);
function setupSwagger(app) {
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, { customSiteTitle: "Akazi API Docs" }),
  );
  app.get("/api-docs.json", (req, res) => res.json(swaggerSpec));
}
export { setupSwagger, swaggerSpec };
