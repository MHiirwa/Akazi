const bearer = [{ bearerAuth: [] }];
const id = (name = "id") => ({
  name,
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" }
});
const body = (schema: object) => ({
  required: true,
  content: { "application/json": { schema } }
});
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const ok = (description: string) => ({ description });

const swaggerPaths = {
  "/auth/register": {
    post: {
      tags: ["Auth"],
      summary: "Register a user",
      requestBody: body(ref("RegisterInput")),
      responses: { "201": ok("User registered"), "400": ok("Invalid input"), "409": ok("Email already exists") }
    }
  },
  "/auth/login": {
    post: {
      tags: ["Auth"],
      summary: "Log in",
      requestBody: body(ref("LoginInput")),
      responses: { "200": ok("Authenticated"), "401": ok("Invalid credentials") }
    }
  },
  "/auth/google": {
    post: {
      tags: ["Auth"],
      summary: "Authenticate with Google",
      requestBody: body(ref("GoogleAuthInput")),
      responses: { "200": ok("Authenticated"), "401": ok("Google authentication failed") }
    }
  },
  "/auth/forgot-password": {
    post: {
      tags: ["Auth"],
      summary: "Request a password reset",
      requestBody: body(ref("ForgotPasswordInput")),
      responses: { "200": ok("Reset request accepted") }
    }
  },
  "/auth/reset-password": {
    post: {
      tags: ["Auth"],
      summary: "Reset a password",
      requestBody: body(ref("ResetPasswordInput")),
      responses: { "200": ok("Password reset"), "400": ok("Invalid or expired token") }
    }
  },
  "/auth/me": {
    get: {
      tags: ["Auth"],
      summary: "Get the current user",
      security: bearer,
      responses: { "200": ok("Current user"), "401": ok("Unauthorized") }
    },
    patch: {
      tags: ["Auth"],
      summary: "Update the current user",
      security: bearer,
      requestBody: body(ref("UpdateProfileInput")),
      responses: { "200": ok("User updated"), "400": ok("Invalid input") }
    }
  },
  "/auth/me/completion": {
    get: {
      tags: ["Auth"],
      summary: "Get profile completion",
      security: bearer,
      responses: { "200": ok("Profile completion") }
    }
  },
  "/auth/me/avatar": {
    post: {
      tags: ["Auth"],
      summary: "Upload a profile avatar",
      security: bearer,
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              required: ["avatar"],
              properties: { avatar: { type: "string", format: "binary" } }
            }
          }
        }
      },
      responses: { "200": ok("Avatar uploaded") }
    }
  },
  "/auth/me/resume": {
    post: {
      tags: ["Auth"],
      summary: "Upload a resume",
      security: bearer,
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              required: ["resume"],
              properties: { resume: { type: "string", format: "binary" } }
            }
          }
        }
      },
      responses: { "200": ok("Resume uploaded") }
    }
  },
  "/jobs": {
    get: {
      tags: ["Jobs"],
      summary: "Search published jobs",
      parameters: ["title", "location", "industry", "jobType", "minSalary", "maxSalary", "page", "pageSize"].map(
        (name) => ({
          name,
          in: "query",
          schema: { type: name.includes("Salary") || name.startsWith("page") ? "integer" : "string" }
        })
      ),
      responses: { "200": ok("Matching jobs") }
    },
    post: {
      tags: ["Jobs"],
      summary: "Create a job",
      security: bearer,
      requestBody: body(ref("CreateJobInput")),
      responses: { "201": ok("Job created"), "403": ok("Employer access required") }
    }
  },
  "/jobs/{id}": {
    get: {
      tags: ["Jobs"],
      summary: "Get a published job",
      parameters: [id()],
      responses: { "200": ok("Job details"), "404": ok("Job not found") }
    },
    patch: {
      tags: ["Jobs"],
      summary: "Update an owned job",
      security: bearer,
      parameters: [id()],
      requestBody: body(ref("CreateJobInput")),
      responses: { "200": ok("Job updated"), "403": ok("Forbidden"), "404": ok("Job not found") }
    },
    delete: {
      tags: ["Jobs"],
      summary: "Delete an owned job",
      security: bearer,
      parameters: [id()],
      responses: { "200": ok("Job deleted"), "403": ok("Forbidden"), "404": ok("Job not found") }
    }
  },
  "/jobs/mine/list": {
    get: {
      tags: ["Jobs"],
      summary: "List the employer's jobs",
      security: bearer,
      responses: { "200": ok("Employer jobs") }
    }
  },
  "/jobs/mine/applicant-counts": {
    get: {
      tags: ["Jobs"],
      summary: "Get applicant counts for owned jobs",
      security: bearer,
      responses: { "200": ok("Applicant counts") }
    }
  },
  "/jobs/stats": {
    get: { tags: ["Stats"], summary: "Get job statistics", responses: { "200": ok("Job statistics") } }
  },
  "/applications": {
    post: {
      tags: ["Applications"],
      summary: "Apply to a job",
      security: bearer,
      requestBody: body(ref("ApplyInput")),
      responses: { "201": ok("Application submitted"), "409": ok("Already applied") }
    }
  },
  "/applications/mine": {
    get: {
      tags: ["Applications"],
      summary: "List the current user's applications",
      security: bearer,
      responses: { "200": ok("Applications") }
    }
  },
  "/applications/job/{jobId}": {
    get: {
      tags: ["Applications"],
      summary: "List applications for an owned job",
      security: bearer,
      parameters: [id("jobId")],
      responses: { "200": ok("Job applications"), "403": ok("Forbidden") }
    }
  },
  "/applications/{id}/withdraw": {
    patch: {
      tags: ["Applications"],
      summary: "Withdraw an application",
      security: bearer,
      parameters: [id()],
      responses: { "200": ok("Application withdrawn") }
    }
  },
  "/applications/{id}/status": {
    patch: {
      tags: ["Applications"],
      summary: "Update an application status",
      security: bearer,
      parameters: [id()],
      requestBody: body(ref("UpdateApplicationStatusInput")),
      responses: { "200": ok("Application updated") }
    }
  },
  "/admin/users": {
    get: {
      tags: ["Admin"],
      summary: "List users",
      security: bearer,
      responses: { "200": ok("Users"), "403": ok("Admin access required") }
    }
  },
  "/admin/users/{id}/suspend": {
    patch: {
      tags: ["Admin"],
      summary: "Suspend or restore a user",
      security: bearer,
      parameters: [id()],
      requestBody: body(ref("SuspendInput")),
      responses: { "200": ok("User updated") }
    }
  },
  "/admin/users/{id}/employer-status": {
    patch: {
      tags: ["Admin"],
      summary: "Set employer verification status",
      security: bearer,
      parameters: [id()],
      requestBody: body(ref("EmployerStatusInput")),
      responses: { "200": ok("Employer updated") }
    }
  },
  "/admin/jobs/{id}/remove": {
    patch: {
      tags: ["Admin"],
      summary: "Remove a job listing",
      security: bearer,
      parameters: [id()],
      responses: { "200": ok("Job removed") }
    }
  },
  "/users/stats": {
    get: {
      tags: ["Stats"],
      summary: "Get user statistics",
      security: bearer,
      responses: { "200": ok("User statistics"), "403": ok("Admin access required") }
    }
  },
  "/employers/{id}/reviews": {
    get: {
      tags: ["Reviews"],
      summary: "List employer reviews",
      parameters: [id()],
      responses: { "200": ok("Employer reviews") }
    },
    post: {
      tags: ["Reviews"],
      summary: "Review an employer",
      security: bearer,
      parameters: [id()],
      requestBody: body(ref("CreateReviewInput")),
      responses: { "201": ok("Review created"), "403": ok("Shortlisting required") }
    }
  },
  "/reviews/{id}": {
    delete: {
      tags: ["Reviews"],
      summary: "Delete a review",
      security: bearer,
      parameters: [id()],
      responses: { "200": ok("Review deleted"), "403": ok("Forbidden") }
    }
  },
  "/job-alerts": {
    post: {
      tags: ["Job Alerts"],
      summary: "Subscribe to job alerts",
      requestBody: body({
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string", format: "email" },
          keyword: { type: "string" },
          location: { type: "string" },
          jobType: { type: "string" }
        }
      }),
      responses: { "200": ok("Subscription saved") }
    }
  },
  "/job-alerts/unsubscribe": {
    post: {
      tags: ["Job Alerts"],
      summary: "Unsubscribe from job alerts",
      requestBody: body({
        type: "object",
        required: ["token"],
        properties: { token: { type: "string" } }
      }),
      responses: { "200": ok("Unsubscribed") }
    }
  }
};

export default swaggerPaths;
