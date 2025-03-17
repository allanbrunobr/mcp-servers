import { z } from 'zod';

// Schema definitions for SonarQube API requests
export const GetProjectMetricsSchema = z.object({
  projectKey: z.string().describe("Project key in SonarQube"),
  metrics: z.array(z.string()).optional().describe("Specific metrics to fetch, e.g., ['coverage', 'bugs', 'vulnerabilities']"),
});

export const GetQualityGateSchema = z.object({
  projectKey: z.string().describe("Project key in SonarQube"),
});

export const GetIssuesSchema = z.object({
  projectKey: z.string().describe("Project key in SonarQube"),
  types: z.array(z.enum(['BUG', 'VULNERABILITY', 'CODE_SMELL'])).optional(),
  severities: z.array(z.enum(['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'INFO'])).optional(),
  statuses: z.array(z.enum(['OPEN', 'CONFIRMED', 'REOPENED', 'RESOLVED', 'CLOSED'])).optional(),
});

export const CreateProjectSchema = z.object({
  name: z.string().describe("Display name for the project"),
  projectKey: z.string().describe("Unique project key"),
  visibility: z.enum(['private', 'public']).optional(),
});

export interface SonarQubeError {
  message: string;
  response?: {
    data?: {
      errors?: Array<{
        msg: string;
      }>;
    };
  };
}
